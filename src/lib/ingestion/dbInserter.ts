/**
 * RAIS v2.0 - Database Inserter
 * 
 * RESPONSIBILITIES:
 * 1. Insert transformed records into normalized tables
 * 2. Maintain full audit trail
 * 3. Handle upserts for date-based aggregation
 * 4. Refresh materialized views after insert
 * 
 * STRICT RULES:
 * - All inserts include source_file_id
 * - Duplicate files are rejected (based on hash)
 * - Views are refreshed after successful insert
 */

import { supabaseAdmin } from '../db/client';
import type {
  FileUploadLog,
  ProductionSummaryInsert,
  StageInspectionSummaryInsert,
  DefectOccurrenceInsert,
  UploadStatus,
  FileType,
} from '../db/schema.types';
import type { TransformResult } from './dataTransformer';

// ============================================================================
// TYPES
// ============================================================================

export interface InsertResult {
  success: boolean;
  uploadId: string;
  stats: {
    productionInserted: number;
    stageInserted: number;
    defectsInserted: number;
    viewsRefreshed: boolean;
  };
  errors: string[];
}

export interface UploadRecord {
  filename: string;
  originalFilename: string;
  fileHash: string;
  fileSize: number;
  fileType: FileType;
  recordsTotal: number;
  recordsValid: number;
  recordsInvalid: number;
  validationErrors: unknown[];
  mappingConfig: unknown;
}

// ============================================================================
// FILE UPLOAD LOG OPERATIONS
// ============================================================================

/**
 * Check if file already exists (by hash)
 */
export async function checkFileExists(fileHash: string): Promise<{ exists: boolean; uploadId?: string }> {
  const { data, error } = await supabaseAdmin
    .from('file_upload_log')
    .select('id')
    .eq('file_hash', fileHash)
    .single();

  if (error && error.code !== 'PGRST116') {
    console.error('Error checking file existence:', error);
  }

  return {
    exists: !!data,
    uploadId: data?.id,
  };
}

/**
 * Create upload log entry
 */
export async function createUploadLog(record: UploadRecord): Promise<string | null> {
  const { data, error } = await supabaseAdmin
    .from('file_upload_log')
    .insert({
      filename: record.filename,
      original_filename: record.originalFilename,
      file_hash: record.fileHash,
      file_size_bytes: record.fileSize,
      detected_file_type: record.fileType,
      upload_status: 'pending' as UploadStatus,
      records_total: record.recordsTotal,
      records_valid: record.recordsValid,
      records_invalid: record.recordsInvalid,
      validation_errors: record.validationErrors,
      mapping_config: record.mappingConfig,
    })
    .select('id')
    .single();

  if (error) {
    console.error('Error creating upload log:', error);
    return null;
  }

  return data.id;
}

/**
 * Update upload log status
 */
export async function updateUploadStatus(
  uploadId: string,
  status: UploadStatus,
  additionalFields?: Partial<FileUploadLog>
): Promise<boolean> {
  const updateData: Record<string, unknown> = {
    upload_status: status,
    ...additionalFields,
  };

  if (status === 'processing') {
    updateData.processing_started_at = new Date().toISOString();
  } else if (status === 'completed' || status === 'failed') {
    updateData.processing_completed_at = new Date().toISOString();
  }

  const { error } = await supabaseAdmin
    .from('file_upload_log')
    .update(updateData)
    .eq('id', uploadId);

  if (error) {
    console.error('Error updating upload status:', error);
    return false;
  }

  return true;
}

// ============================================================================
// MASTER DATA LOOKUPS
// ============================================================================

/**
 * Get stage ID by code
 */
export async function getStageId(stageCode: string): Promise<string | null> {
  const { data, error } = await supabaseAdmin
    .from('inspection_stage')
    .select('id')
    .eq('code', stageCode)
    .single();

  if (error) {
    console.error('Error getting stage ID:', error);
    return null;
  }

  return data.id;
}

/**
 * Get all defect code to ID mappings
 */
export async function getDefectIdMap(): Promise<Map<string, string>> {
  const { data, error } = await supabaseAdmin
    .from('defect_master')
    .select('id, code')
    .eq('is_active', true);

  if (error) {
    console.error('Error getting defect map:', error);
    return new Map();
  }

  const map = new Map<string, string>();
  for (const row of data || []) {
    map.set(row.code, row.id);
  }
  return map;
}

// ============================================================================
// DATA INSERTION
// ============================================================================

/**
 * Insert all transformed records
 */
export async function insertTransformedData(
  uploadId: string,
  transformResult: TransformResult
): Promise<InsertResult> {
  const errors: string[] = [];
  let productionInserted = 0;
  let stageInserted = 0;
  let defectsInserted = 0;

  try {
    // Update status to processing
    await updateUploadStatus(uploadId, 'processing');

    // Insert production summaries (upsert on date + product_code)
    if (transformResult.productionRecords.length > 0) {
      const { data, error } = await supabaseAdmin
        .from('production_summary')
        .upsert(
          transformResult.productionRecords.map(r => ({
            ...r,
            source_file_id: uploadId,
          })),
          { onConflict: 'date,COALESCE(product_code,\'__ALL__\')' }
        )
        .select('id');

      if (error) {
        errors.push(`Production insert error: ${error.message}`);
      } else {
        productionInserted = data?.length || 0;
      }
    }

    // Insert stage summaries (upsert on date + stage_id)
    if (transformResult.stageRecords.length > 0) {
      const { data, error } = await supabaseAdmin
        .from('stage_inspection_summary')
        .upsert(
          transformResult.stageRecords.map(r => ({
            ...r,
            source_file_id: uploadId,
          })),
          { onConflict: 'date,stage_id' }
        )
        .select('id');

      if (error) {
        errors.push(`Stage insert error: ${error.message}`);
      } else {
        stageInserted = data?.length || 0;
      }
    }

    // Insert defect occurrences (no upsert - each is unique)
    if (transformResult.defectRecords.length > 0) {
      // Insert in batches of 500
      const batchSize = 500;
      for (let i = 0; i < transformResult.defectRecords.length; i += batchSize) {
        const batch = transformResult.defectRecords.slice(i, i + batchSize);
        const { data, error } = await supabaseAdmin
          .from('defect_occurrence')
          .insert(
            batch.map(r => ({
              ...r,
              source_file_id: uploadId,
            }))
          )
          .select('id');

        if (error) {
          errors.push(`Defect insert error (batch ${i / batchSize}): ${error.message}`);
        } else {
          defectsInserted += data?.length || 0;
        }
      }
    }

    // Refresh materialized views
    let viewsRefreshed = false;
    if (errors.length === 0) {
      viewsRefreshed = await refreshKPIViews();
    }

    // Update final status
    const finalStatus: UploadStatus = errors.length === 0 ? 'completed' : 'partial';
    await updateUploadStatus(uploadId, finalStatus, {
      records_valid: productionInserted + stageInserted + defectsInserted,
      error_message: errors.length > 0 ? errors.join('; ') : null,
    } as Partial<FileUploadLog>);

    return {
      success: errors.length === 0,
      uploadId,
      stats: {
        productionInserted,
        stageInserted,
        defectsInserted,
        viewsRefreshed,
      },
      errors,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    await updateUploadStatus(uploadId, 'failed', {
      error_message: errorMessage,
    } as Partial<FileUploadLog>);

    return {
      success: false,
      uploadId,
      stats: {
        productionInserted,
        stageInserted,
        defectsInserted,
        viewsRefreshed: false,
      },
      errors: [errorMessage],
    };
  }
}

// ============================================================================
// VIEW REFRESH
// ============================================================================

/**
 * Refresh all KPI materialized views
 */
export async function refreshKPIViews(): Promise<boolean> {
  try {
    const { error } = await supabaseAdmin.rpc('refresh_all_kpi_views');
    
    if (error) {
      console.error('Error refreshing views:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error refreshing views:', error);
    return false;
  }
}

// ============================================================================
// COMPLETE INGESTION PIPELINE
// ============================================================================

/**
 * Run the complete ingestion pipeline
 * Excel Buffer -> Parse -> Validate -> Transform -> Insert -> Refresh
 */
export async function runIngestionPipeline(
  buffer: Buffer,
  fileName: string
): Promise<{
  success: boolean;
  uploadId: string | null;
  message: string;
  stats: InsertResult['stats'] | null;
}> {
  // Import dynamically to avoid circular dependencies
  const { parseExcelBuffer, calculateFileHash } = await import('./excelReader');
  const { validateSchema } = await import('./schemaValidator');
  const { transformToNormalized, getStageCodeForFileType } = await import('./dataTransformer');

  // Step 1: Calculate hash and check for duplicates
  const fileHash = calculateFileHash(buffer);
  const existsCheck = await checkFileExists(fileHash);
  
  if (existsCheck.exists) {
    return {
      success: false,
      uploadId: existsCheck.uploadId || null,
      message: 'File already uploaded (duplicate detected)',
      stats: null,
    };
  }

  // Step 2: Parse Excel
  const parseResult = parseExcelBuffer(buffer, fileName);
  
  if (!parseResult.success || parseResult.sheets.length === 0) {
    return {
      success: false,
      uploadId: null,
      message: `Parse failed: ${parseResult.errors.join(', ')}`,
      stats: null,
    };
  }

  const sheet = parseResult.sheets[0];

  // Step 3: Validate schema
  const validationResult = validateSchema(sheet.headers, sheet.dataRows, fileName);
  
  if (!validationResult.isValid) {
    const errorCount = validationResult.errors.filter(e => e.severity === 'error').length;
    return {
      success: false,
      uploadId: null,
      message: `Validation failed with ${errorCount} errors`,
      stats: null,
    };
  }

  // Step 4: Create upload log entry
  const uploadId = await createUploadLog({
    filename: fileName,
    originalFilename: fileName,
    fileHash: parseResult.fileHash,
    fileSize: parseResult.metadata.fileSize,
    fileType: validationResult.fileType,
    recordsTotal: sheet.totalRows,
    recordsValid: 0,
    recordsInvalid: validationResult.errors.length,
    validationErrors: validationResult.errors,
    mappingConfig: validationResult.mappings,
  });

  if (!uploadId) {
    return {
      success: false,
      uploadId: null,
      message: 'Failed to create upload log entry',
      stats: null,
    };
  }

  // Step 5: Get stage ID and defect mappings
  const stageCode = getStageCodeForFileType(validationResult.fileType);
  const stageId = await getStageId(stageCode);
  
  if (!stageId) {
    await updateUploadStatus(uploadId, 'failed', {
      error_message: `Unknown stage: ${stageCode}`,
    } as Partial<FileUploadLog>);
    return {
      success: false,
      uploadId,
      message: `Unknown inspection stage: ${stageCode}`,
      stats: null,
    };
  }

  const defectIdMap = await getDefectIdMap();

  // Step 6: Transform data
  const transformResult = transformToNormalized(sheet.dataRows, {
    sourceFileId: uploadId,
    fileType: validationResult.fileType,
    stageId,
    mappings: validationResult.mappings,
    defectIdMap,
  });

  if (!transformResult.success) {
    await updateUploadStatus(uploadId, 'failed', {
      error_message: transformResult.errors.map(e => e.message).join('; '),
    } as Partial<FileUploadLog>);
    return {
      success: false,
      uploadId,
      message: `Transform failed: ${transformResult.errors.length} errors`,
      stats: null,
    };
  }

  // Step 7: Insert data
  const insertResult = await insertTransformedData(uploadId, transformResult);

  return {
    success: insertResult.success,
    uploadId,
    message: insertResult.success 
      ? `Successfully imported ${insertResult.stats.productionInserted + insertResult.stats.stageInserted + insertResult.stats.defectsInserted} records`
      : `Import completed with errors: ${insertResult.errors.join(', ')}`,
    stats: insertResult.stats,
  };
}
