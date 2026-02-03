/**
 * Upload API Route
 * POST /api/upload - Handle Excel file uploads
 * GET /api/upload - Get upload history
 */

import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { supabaseAdmin, uploadFile } from '@/lib/db/client';
import { processExcelFile, detectFileSchema } from '@/lib/upload';
import type { FileType } from '@/lib/db/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Max file size: 10MB
const MAX_FILE_SIZE = 10 * 1024 * 1024;

// ============================================================================
// POST - Upload and process Excel file
// ============================================================================

export async function POST(request: NextRequest) {
  const uploadId = uuidv4();
  const startTime = Date.now();

  try {
    // Parse form data
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const forceType = formData.get('fileType') as FileType | null;
    const skipValidation = formData.get('skipValidation') === 'true';

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

    // Create upload history record
    const storagePath = `uploads/${uploadId}/${file.name}`;

    try {
      await supabaseAdmin.from('upload_history').insert({
        id: uploadId,
        filename: `${uploadId}_${file.name}`,
        original_filename: file.name,
        file_size: file.size,
        storage_path: storagePath,
        bucket_name: 'uploads',
        upload_status: 'processing',
        records_imported: 0,
        records_failed: 0,
        uploaded_at: new Date().toISOString(),
        processing_started_at: new Date().toISOString(),
      });
    } catch (dbError) {
      console.log('Could not create upload history record:', dbError);
      // Continue processing even if history record fails
    }

    // Upload file to Supabase Storage
    try {
      await uploadFile(buffer, storagePath, 'uploads');
    } catch (storageError) {
      console.log('Could not upload to storage:', storageError);
      // Continue processing even if storage fails
    }

    // Process the Excel file
    const result = await processExcelFile(buffer, {
      forceFileType: forceType || undefined,
      skipValidation,
    });

    // Insert transformed data into database
    let recordsImported = 0;
    let recordsFailed = 0;

    if (result.success && result.transform.batches.length > 0) {
      try {
        // Insert batches
        const { data: batchData, error: batchError } = await supabaseAdmin
          .from('batches')
          .upsert(
            result.transform.batches.map((b) => ({
              ...b,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            })),
            { onConflict: 'batch_number' }
          )
          .select('id');

        if (batchError) {
          console.error('Batch insert error:', batchError);
          recordsFailed += result.transform.batches.length;
        } else {
          recordsImported += batchData?.length || 0;
        }

        // Insert inspection records
        if (result.transform.inspections.length > 0) {
          const { data: inspData, error: inspError } = await supabaseAdmin
            .from('inspection_records')
            .insert(
              result.transform.inspections.map((i) => ({
                ...i,
                created_at: new Date().toISOString(),
              }))
            )
            .select('id');

          if (inspError) {
            console.error('Inspection insert error:', inspError);
            recordsFailed += result.transform.inspections.length;
          } else {
            recordsImported += inspData?.length || 0;
          }
        }

        // Insert defects
        if (result.transform.defects.length > 0) {
          const { data: defectData, error: defectError } = await supabaseAdmin
            .from('defects')
            .insert(
              result.transform.defects.map((d) => ({
                ...d,
                created_at: new Date().toISOString(),
              }))
            )
            .select('id');

          if (defectError) {
            console.error('Defect insert error:', defectError);
            recordsFailed += result.transform.defects.length;
          } else {
            recordsImported += defectData?.length || 0;
          }
        }
      } catch (insertError) {
        console.error('Database insert error:', insertError);
        recordsFailed = result.transform.stats.batchesCreated;
      }
    }

    // Update upload history
    try {
      await supabaseAdmin
        .from('upload_history')
        .update({
          file_type: result.fileType,
          upload_status: result.success ? 'completed' : 'failed',
          records_imported: recordsImported,
          records_failed: recordsFailed,
          validation_errors: result.validation.errors.slice(0, 10),
          error_message: result.errors.join('; ') || null,
          processing_completed_at: new Date().toISOString(),
          metadata: {
            processingTime: result.metadata.processingTime,
            sheetCount: result.metadata.sheetCount,
            totalRows: result.metadata.totalRows,
          },
        })
        .eq('id', uploadId);
    } catch (updateError) {
      console.log('Could not update upload history:', updateError);
    }

    return NextResponse.json({
      success: result.success,
      data: {
        uploadId,
        fileType: result.fileType,
        detection: {
          type: result.detection.detectedType,
          confidence: result.detection.confidence,
          matchedColumns: result.detection.matchedColumns,
        },
        validation: {
          valid: result.validation.valid,
          summary: result.validation.summary,
          errors: result.validation.errors.slice(0, 10), // Limit errors returned
        },
        import: {
          batchesCreated: result.transform.stats.batchesCreated,
          inspectionsCreated: result.transform.stats.inspectionsCreated,
          defectsCreated: result.transform.stats.defectsCreated,
          recordsImported,
          recordsFailed,
        },
      },
      errors: result.errors,
      meta: {
        timestamp: new Date().toISOString(),
        processingTime: Date.now() - startTime,
        fileName: file.name,
        fileSize: file.size,
      },
    });
  } catch (error) {
    console.error('Upload error:', error);

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
      // Ignore update errors
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
