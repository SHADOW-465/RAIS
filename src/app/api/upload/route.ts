/**
 * RAIS v2.0 - Upload API Route
 * POST /api/upload - Process Excel files using new ingestion pipeline
 * GET /api/upload - Get upload history
 * 
 * STRICT RULES:
 * - Uses new ingestion pipeline (excelReader -> schemaValidator -> dataTransformer -> dbInserter)
 * - NO AI in transformation - AI only for interpretation
 * - Full audit trail with file hash for deduplication
 * - Every record traceable to source file + row
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin, isConfigured } from '@/lib/db/client';
import {
  runIngestionPipeline,
} from '@/lib/ingestion';
import { LocalStore } from '@/lib/db/localStore';
import { parseExcelBuffer } from '@/lib/ingestion/excelReader';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Max file size: 10MB
const MAX_FILE_SIZE = 10 * 1024 * 1024;

// ============================================================================
// POST - Upload and process Excel file with new ingestion pipeline
// ============================================================================

import { SessionStore } from '@/lib/db/sessionStore';

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  const sessionId = request.headers.get('x-rais-session-id');

  try {
    // SESSION MODE: Save to Session Store if header present
    if (sessionId) {
      console.log(`[Upload v2] Processing in Session Mode: ${sessionId}`);
      const formData = await request.formData();
      const file = formData.get('file') as File | null;
      if (!file) throw new Error('No file provided');

      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const fileName = file.name;

      const parseResult = parseExcelBuffer(buffer, fileName);
      if (parseResult.success && parseResult.sheets.length > 0) {
        // Aggregate data from ALL sheets using normalized rows
        const normalizedRows = parseResult.sheets.flatMap(sheet => sheet.normalizedRows);
        SessionStore.saveUpload(sessionId, fileName, normalizedRows);

        return NextResponse.json({
          success: true,
          data: {
            uploadId: `session-${Date.now()}`,
            message: 'File staged in current session',
            fileType: 'visual',
            import: { recordsImported: normalizedRows.length, recordsFailed: 0 }
          }
        });
      } else {
        return NextResponse.json({
          success: false,
          error: {
            code: 'PARSE_ERROR',
            message: parseResult.error || 'Failed to parse Excel file in session mode'
          }
        }, { status: 400 });
      }
    }

    // MOCK MODE: Parse file and save to Local JSON
    if (!isConfigured) {
      console.warn('[Upload v2] Processing with Local JSON Store (Missing Credentials)');

      const formData = await request.formData();
      const file = formData.get('file') as File | null;

      if (!file) throw new Error('No file provided');

      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const fileName = file.name;

      // Parse using existing logic
      const parseResult = parseExcelBuffer(buffer, fileName);

      if (parseResult.success && parseResult.sheets.length > 0) {
        // Aggregate data from ALL sheets for consistency
        const normalizedRows = parseResult.sheets.flatMap(sheet => sheet.normalizedRows);

        // Save to local DB
        LocalStore.saveUpload(fileName, normalizedRows);

        return NextResponse.json({
          success: true,
          data: {
            uploadId: `local-${Date.now()}`,
            message: 'File processed and saved to Local Database',
            fileType: 'visual',
            aiAnalysis: {
              summary: 'Analysis complete. Data has been aggregated locally.',
              fileType: 'visual',
              confidence: 1.0,
              hasAnomaly: false,
              detectedMetrics: {
                totalRejectedColumn: 'Qty Rejected',
                defectCountColumn: 'Defect Qty',
                batchNumberColumn: 'Batch No',
                dateColumn: 'Date'
              }
            },
            smartParsing: { headerRowIndex: 0 },
            import: {
              recordsImported: normalizedRows.length,
              recordsFailed: 0,
              viewsRefreshed: true
            }
          },
          meta: {
            timestamp: new Date().toISOString(),
            version: '2.0-local',
          },
        });
      } else {
        return NextResponse.json({
          success: false,
          error: {
            code: 'PARSE_ERROR',
            message: parseResult.error || 'Failed to parse Excel file in local mode'
          }
        }, { status: 400 });
      }
    }

    // Parse form data
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json(
        {
          success: false,
          error: { code: 'NO_FILE', message: 'No file provided' },
        },
        { status: 400 }
      );
    }

    // Validate file type
    const validExtensions = ['.xlsx', '.xls', '.csv'];
    const fileExt = file.name.toLowerCase().slice(file.name.lastIndexOf('.'));
    if (!validExtensions.includes(fileExt)) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'INVALID_TYPE',
            message: `Invalid file type. Allowed: ${validExtensions.join(', ')}`,
          },
        },
        { status: 400 }
      );
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'FILE_TOO_LARGE',
            message: `File size exceeds ${MAX_FILE_SIZE / 1024 / 1024}MB limit`,
          },
        },
        { status: 400 }
      );
    }

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // ===== RUN COMPLETE INGESTION PIPELINE =====
    console.log(`[Upload v2] Processing: ${file.name}`);

    const pipelineResult = await runIngestionPipeline(buffer, file.name);

    if (!pipelineResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'INGESTION_ERROR',
            message: pipelineResult.message,
            uploadId: pipelineResult.uploadId,
          },
        },
        { status: 400 }
      );
    }

    // ===== RETURN SUCCESS RESPONSE =====
    const processingTime = Date.now() - startTime;
    console.log(`[Upload v2] Complete in ${processingTime}ms`);
    console.log(`[Upload v2] ${pipelineResult.message}`);

    return NextResponse.json({
      success: true,
      data: {
        uploadId: pipelineResult.uploadId,
        message: pipelineResult.message,
        stats: pipelineResult.stats,
      },
      meta: {
        timestamp: new Date().toISOString(),
        processingTime,
        fileName: file.name,
        fileSize: file.size,
        version: '2.0',
      },
    });

  } catch (error) {
    console.error('[Upload v2] Critical error:', error);

    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'UPLOAD_ERROR',
          message: error instanceof Error ? error.message : 'Failed to process upload',
        },
      },
      { status: 500 }
    );
  }
}

// ============================================================================
// GET - Get upload history from file_upload_log
// ============================================================================

export async function GET(request: NextRequest) {
  try {
    if (!isConfigured) {
      // Return mock history
      return NextResponse.json({
        success: true,
        data: {
          uploads: [
            {
              id: 'mock-1',
              original_filename: 'MOCK_DATA_2025.xlsx',
              detected_file_type: 'visual',
              upload_status: 'completed',
              records_valid: 250,
              records_invalid: 0,
              uploaded_at: new Date().toISOString(),
              file_size_bytes: 123456
            }
          ],
          total: 1,
        },
        meta: { timestamp: new Date().toISOString() }
      });
    }

    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');

    const { data, error, count } = await supabaseAdmin
      .from('file_upload_log')
      .select('*', { count: 'exact' })
      .order('uploaded_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      // Return empty array if table doesn't exist or other error
      console.warn('[Upload v2] Could not fetch upload history:', error.message);
      return NextResponse.json({
        success: true,
        data: {
          uploads: [],
          total: 0,
        },
        meta: {
          timestamp: new Date().toISOString(),
          limit,
          offset,
        },
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        uploads: data || [],
        total: count || 0,
      },
      meta: {
        timestamp: new Date().toISOString(),
        limit,
        offset,
      },
    });
  } catch (error) {
    console.error('[Upload v2] Get uploads error:', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'FETCH_ERROR',
          message: 'Failed to fetch upload history',
        },
      },
      { status: 500 }
    );
  }
}
