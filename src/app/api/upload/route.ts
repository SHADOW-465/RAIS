/**
 * Upload API Route - Universal AI Data Adapter
 * POST /api/upload - Handle ANY Excel format using AI-powered mapping
 * GET /api/upload - Get upload history
 */

import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { supabaseAdmin, uploadFile } from '@/lib/db/client';
import { transformData } from '@/lib/upload/transformer';
import { analyzeUploadData } from '@/lib/ai/gemini';
import { parseExcelBuffer, previewExcelFile } from '@/lib/upload/excelParser';
import { detectSchema } from '@/lib/upload/schemaDetector';
import type { FileType } from '@/lib/db/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Max file size: 10MB
const MAX_FILE_SIZE = 10 * 1024 * 1024;

// ============================================================================
// POST - Upload and process Excel file with Universal AI Data Adapter
// ============================================================================

export async function POST(request: NextRequest) {
  const uploadId = uuidv4();
  const startTime = Date.now();

  try {
    // Parse form data
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const forceType = formData.get('fileType') as FileType | null;

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

    // ===== STEP 1: PARSE EXCEL FILE =====
    console.log(`[Upload] Parsing Excel file: ${file.name}`);
    
    const parseResult = await parseExcelBuffer(buffer);
    
    if (!parseResult.success || parseResult.sheets.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'PARSE_ERROR',
            message: parseResult.errors[0] || 'Failed to parse Excel file',
          },
        },
        { status: 400 }
      );
    }

    const sheet = parseResult.sheets[0];
    const headers = sheet.headers;
    const rows = sheet.rows;

    console.log(`[Upload] Parsed ${rows.length} rows with ${headers.length} columns`);
    console.log(`[Upload] Headers: ${headers.join(', ')}`);

    // ===== STEP 2: AI FILE ANALYSIS =====
    console.log('[Upload] Running AI file analysis...');
    
    let aiAnalysis = null;
    let detectedFileType: FileType = 'unknown';

    try {
      aiAnalysis = await analyzeUploadData(rows.slice(0, 5), headers, file.name);
      detectedFileType = (forceType || aiAnalysis.fileType || 'unknown') as FileType;
      console.log(`[Upload] AI detected type: ${detectedFileType} (confidence: ${aiAnalysis.confidence})`);
    } catch (aiError) {
      console.warn('[Upload] AI analysis failed:', aiError);
      // Continue without AI analysis
    }

    // ===== STEP 3: VALIDATION (NON-BLOCKING) =====
    // Run validation to identify issues, but proceed regardless for AI recovery
    let validationWarnings: string[] = [];
    try {
      const { validateData } = await import('@/lib/upload/validator');
      const validationResult = await validateData(rows, detectedFileType);
      
      if (validationResult.warnings.length > 0) {
        validationWarnings = validationResult.warnings.map(w => 
          `Row ${w.row}: ${w.column} - ${w.message}`
        );
        console.warn(`[Upload] Validation warnings found (${validationResult.warnings.length}), proceeding to AI transformation...`);
      }
      
      // Log recoverable errors (now demoted to warnings in validator.ts)
      const recoverableErrors = validationResult.errors.filter(e => e.severity === 'warning');
      if (recoverableErrors.length > 0) {
        console.warn(`[Upload] ${recoverableErrors.length} recoverable issues will be handled by AI`);
      }
    } catch (validationError) {
      // Validation failure shouldn't block - proceed to AI transformation
      console.warn('[Upload] Validation step failed, continuing with AI transformation:', validationError);
    }

    // ===== STEP 4: UNIVERSAL AI DATA TRANSFORMATION =====
    console.log('[Upload] Starting Universal AI Data Transformation...');
    
    const transformResult = await transformData(
      rows,
      headers,
      detectedFileType,
      file.name,
      { skipValidation: true } // NEVER reject files - always attempt to process
    );

    console.log(`[Upload] Transform complete: ${transformResult.stats.batchesCreated} batches, ${transformResult.stats.inspectionsCreated} inspections, ${transformResult.stats.defectsCreated} defects`);
    
    if (transformResult.warnings.length > 0) {
      console.log(`[Upload] Warnings (${transformResult.warnings.length}):`, transformResult.warnings.slice(0, 5));
    }
    
    if (transformResult.errors.length > 0) {
      console.log(`[Upload] Errors (${transformResult.errors.length}):`, transformResult.errors.slice(0, 5));
    }

    // ===== STEP 5: CREATE UPLOAD HISTORY RECORD =====
    const storagePath = `uploads/${uploadId}/${file.name}`;

    try {
      await supabaseAdmin.from('upload_history').insert({
        id: uploadId,
        filename: `${uploadId}_${file.name}`,
        original_filename: file.name,
        file_type: detectedFileType,
        file_size: file.size,
        storage_path: storagePath,
        bucket_name: 'uploads',
        upload_status: 'processing',
        records_imported: 0,
        records_failed: 0,
        uploaded_at: new Date().toISOString(),
        processing_started_at: new Date().toISOString(),
        metadata: {
          aiAnalysis: aiAnalysis
            ? {
                summary: aiAnalysis.summary,
                fileType: aiAnalysis.fileType,
                confidence: aiAnalysis.confidence,
                detectedMetrics: aiAnalysis.detectedMetrics,
              }
            : null,
          aiMapping: transformResult.aiMapping
            ? {
                confidence: transformResult.aiMapping.confidence,
                explanation: transformResult.aiMapping.explanation,
                mappedColumns: Object.keys(transformResult.aiMapping.config.mapping).length,
                batchGeneration: transformResult.aiMapping.config.batchGeneration,
              }
            : null,
          headers: headers,
          totalRows: rows.length,
        },
      });
    } catch (dbError) {
      console.warn('[Upload] Could not create upload history record:', dbError);
      // Continue - we'll update later or just proceed
    }

    // ===== STEP 6: UPLOAD TO STORAGE =====
    try {
      await uploadFile(buffer, storagePath, 'uploads');
    } catch (storageError) {
      console.warn('[Upload] Could not upload to storage:', storageError);
      // Continue - storage is optional
    }

    // ===== STEP 7: INSERT DATA TO DATABASE =====
    console.log('[Upload] Inserting data to database...');
    
    let recordsImported = 0;
    let recordsFailed = 0;
    const dbErrors: string[] = [];

    // Insert batches
    if (transformResult.batches.length > 0) {
      try {
        const { data: batchData, error: batchError } = await supabaseAdmin
          .from('batches')
          .upsert(
            transformResult.batches.map((b) => ({
              ...b,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            })),
            { onConflict: 'batch_number' }
          )
          .select('id');

        if (batchError) {
          console.error('[Upload] Batch insert error:', batchError);
          dbErrors.push(`Batch insert failed: ${batchError.message}`);
          recordsFailed += transformResult.batches.length;
        } else {
          recordsImported += batchData?.length || 0;
          console.log(`[Upload] Inserted ${batchData?.length || 0} batches`);
        }
      } catch (error) {
        console.error('[Upload] Batch insert exception:', error);
        dbErrors.push(`Batch insert exception: ${error instanceof Error ? error.message : 'Unknown'}`);
        recordsFailed += transformResult.batches.length;
      }
    }

    // Insert inspection records
    if (transformResult.inspections.length > 0) {
      try {
        const { data: inspData, error: inspError } = await supabaseAdmin
          .from('inspection_records')
          .insert(
            transformResult.inspections.map((i) => ({
              ...i,
              created_at: new Date().toISOString(),
            }))
          )
          .select('id');

        if (inspError) {
          console.error('[Upload] Inspection insert error:', inspError);
          dbErrors.push(`Inspection insert failed: ${inspError.message}`);
          recordsFailed += transformResult.inspections.length;
        } else {
          recordsImported += inspData?.length || 0;
          console.log(`[Upload] Inserted ${inspData?.length || 0} inspections`);
        }
      } catch (error) {
        console.error('[Upload] Inspection insert exception:', error);
        dbErrors.push(`Inspection insert exception: ${error instanceof Error ? error.message : 'Unknown'}`);
        recordsFailed += transformResult.inspections.length;
      }
    }

    // Insert defects
    if (transformResult.defects.length > 0) {
      try {
        const { data: defectData, error: defectError } = await supabaseAdmin
          .from('defects')
          .insert(
            transformResult.defects.map((d) => ({
              ...d,
              created_at: new Date().toISOString(),
            }))
          )
          .select('id');

        if (defectError) {
          console.error('[Upload] Defect insert error:', defectError);
          dbErrors.push(`Defect insert failed: ${defectError.message}`);
          recordsFailed += transformResult.defects.length;
        } else {
          recordsImported += defectData?.length || 0;
          console.log(`[Upload] Inserted ${defectData?.length || 0} defects`);
        }
      } catch (error) {
        console.error('[Upload] Defect insert exception:', error);
        dbErrors.push(`Defect insert exception: ${error instanceof Error ? error.message : 'Unknown'}`);
        recordsFailed += transformResult.defects.length;
      }
    }

    // ===== STEP 8: UPDATE UPLOAD HISTORY =====
    const allWarnings = [...transformResult.warnings, ...dbErrors];
    const allErrors = transformResult.errors;
    
    try {
      await supabaseAdmin
        .from('upload_history')
        .update({
          upload_status: recordsFailed === 0 ? 'completed' : 'completed_with_warnings',
          records_imported: recordsImported,
          records_failed: recordsFailed,
          validation_errors: allWarnings.slice(0, 10),
          error_message: allErrors.length > 0 ? allErrors.join('; ') : null,
          processing_completed_at: new Date().toISOString(),
          metadata: {
            processingTime: Date.now() - startTime,
            sheetCount: parseResult.sheets.length,
            totalRows: rows.length,
            headers: headers,
            aiAnalysis: aiAnalysis
              ? {
                  summary: aiAnalysis.summary,
                  fileType: aiAnalysis.fileType,
                  confidence: aiAnalysis.confidence,
                  detectedMetrics: aiAnalysis.detectedMetrics,
                }
              : null,
            aiMapping: transformResult.aiMapping
              ? {
                  confidence: transformResult.aiMapping.confidence,
                  explanation: transformResult.aiMapping.explanation,
                  mapping: transformResult.aiMapping.config.mapping,
                  batchGeneration: transformResult.aiMapping.config.batchGeneration,
                }
              : null,
            warnings: allWarnings.slice(0, 20),
            errors: allErrors.slice(0, 10),
          },
        })
        .eq('id', uploadId);
    } catch (updateError) {
      console.warn('[Upload] Could not update upload history:', updateError);
    }

    // ===== STEP 8: RETURN RESPONSE =====
    return NextResponse.json({
      success: true, // Always return success - we never reject files
      data: {
        uploadId,
        fileType: detectedFileType,
        aiAnalysis: aiAnalysis
          ? {
              summary: aiAnalysis.summary,
              fileType: aiAnalysis.fileType,
              confidence: aiAnalysis.confidence,
              detectedMetrics: aiAnalysis.detectedMetrics,
            }
          : null,
        aiMapping: transformResult.aiMapping
          ? {
              confidence: transformResult.aiMapping.confidence,
              explanation: transformResult.aiMapping.explanation,
              mappedColumns: Object.keys(transformResult.aiMapping.config.mapping).length,
              batchGeneration: transformResult.aiMapping.config.batchGeneration,
            }
          : null,
        smartParsing: {
          headerRowIndex: sheet.headerRowIndex || 0,
          headers: headers,
          totalRows: rows.length,
        },
        import: {
          batchesCreated: transformResult.stats.batchesCreated,
          inspectionsCreated: transformResult.stats.inspectionsCreated,
          defectsCreated: transformResult.stats.defectsCreated,
          recordsImported,
          recordsFailed,
        },
        quality: {
          warnings: allWarnings.slice(0, 10),
          errors: allErrors.slice(0, 10),
          rowsProcessed: transformResult.stats.rowsProcessed,
          rowsFailed: transformResult.stats.rowsFailed,
        },
      },
      meta: {
        timestamp: new Date().toISOString(),
        processingTime: Date.now() - startTime,
        fileName: file.name,
        fileSize: file.size,
        universalAdapter: true,
      },
    });

  } catch (error) {
    console.error('[Upload] Critical error:', error);

    // Update upload history with error
    try {
      await supabaseAdmin
        .from('upload_history')
        .update({
          upload_status: 'failed',
          error_message: error instanceof Error ? error.message : 'Unknown error',
          processing_completed_at: new Date().toISOString(),
        })
        .eq('id', uploadId);
    } catch {
      // Ignore
    }

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
// GET - Get upload history
// ============================================================================

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');

    const { data, error } = await supabaseAdmin
      .from('upload_history')
      .select('*')
      .order('uploaded_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      // Return empty array if table doesn't exist or other error
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
        total: data?.length || 0,
      },
      meta: {
        timestamp: new Date().toISOString(),
        limit,
        offset,
      },
    });
  } catch (error) {
    console.error('Get uploads error:', error);
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
