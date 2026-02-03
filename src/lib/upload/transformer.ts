/**
 * Data Transformer
 * Transform Excel rows to database records using AI-powered column mapping
 * Universal Data Adapter - works with ANY Excel format
 */

import { v4 as uuidv4 } from 'uuid';
import type {
  Batch,
  InspectionRecord,
  Defect,
  FileType,
} from '../db/types';
import {
  generateColumnMapping,
  applyMapping,
  BATCH_SCHEMA,
  type DataTransformationConfig,
  type MappingResult,
} from '../ai/dataMapper';

// ============================================================================
// TYPES
// ============================================================================

export interface TransformResult {
  success: boolean;
  batches: Partial<Batch>[];
  inspections: Partial<InspectionRecord>[];
  defects: Partial<Defect>[];
  errors: string[];
  warnings: string[];
  aiMapping: MappingResult | null;
  stats: {
    batchesCreated: number;
    inspectionsCreated: number;
    defectsCreated: number;
    rowsProcessed: number;
    rowsFailed: number;
  };
}

export interface TransformOptions {
  skipValidation?: boolean;
  cacheKey?: string;
}

// ============================================================================
// UNIVERSAL TRANSFORMER
// ============================================================================

/**
 * Transform Excel rows to database records using AI-powered mapping
 * This is the UNIVERSAL transformer that works with ANY Excel format
 * 
 * @param rows - Parsed Excel rows
 * @param headers - Excel column headers
 * @param fileType - Detected file type
 * @param fileName - Original filename (for context)
 * @param options - Transform options
 * @returns TransformResult with database-ready records
 */
export async function transformData(
  rows: Record<string, unknown>[],
  headers: string[],
  fileType: FileType,
  fileName: string,
  options: TransformOptions = {}
): Promise<TransformResult> {
  if (rows.length === 0) {
    return {
      success: false,
      batches: [],
      inspections: [],
      defects: [],
      errors: ['No data rows to transform'],
      warnings: [],
      aiMapping: null,
      stats: {
        batchesCreated: 0,
        inspectionsCreated: 0,
        defectsCreated: 0,
        rowsProcessed: 0,
        rowsFailed: 0,
      },
    };
  }

  console.log(`[Universal Transformer] Processing ${rows.length} rows from ${fileName}`);
  console.log(`[Universal Transformer] Headers: ${headers.join(', ')}`);
  console.log(`[Universal Transformer] File type: ${fileType}`);

  try {
    // STEP 1: Generate AI-powered column mapping
    console.log('[Universal Transformer] Generating AI column mapping...');
    
    const mappingResult = await generateColumnMapping(
      rows.slice(0, 5), // Preview first 5 rows for AI analysis
      headers,
      BATCH_SCHEMA,
      fileType,
      fileName
    );

    if (!mappingResult.success) {
      return {
        success: false,
        batches: [],
        inspections: [],
        defects: [],
        errors: mappingResult.errors.length > 0 
          ? mappingResult.errors 
          : ['Failed to generate column mapping'],
        warnings: mappingResult.warnings,
        aiMapping: mappingResult,
        stats: {
          batchesCreated: 0,
          inspectionsCreated: 0,
          defectsCreated: 0,
          rowsProcessed: 0,
          rowsFailed: rows.length,
        },
      };
    }

    console.log('[Universal Transformer] AI Mapping generated:', {
      confidence: mappingResult.confidence,
      explanation: mappingResult.explanation,
      mappedColumns: Object.keys(mappingResult.config.mapping).length,
    });

    // STEP 2: Apply the AI mapping to transform all rows
    console.log('[Universal Transformer] Applying mapping to transform data...');
    
    const { batches, inspections, defects, warnings, errors } = applyMapping(
      rows,
      mappingResult.config,
      fileType
    );

    // STEP 3: Combine with AI warnings/errors
    const allWarnings = [...mappingResult.warnings, ...warnings];
    const allErrors = [...mappingResult.errors, ...errors];

    console.log('[Universal Transformer] Transform complete:', {
      batches: batches.length,
      inspections: inspections.length,
      defects: defects.length,
      warnings: allWarnings.length,
      errors: allErrors.length,
    });

    return {
      success: allErrors.length === 0 || options.skipValidation === true,
      batches: batches as Partial<Batch>[],
      inspections: inspections as Partial<InspectionRecord>[],
      defects: defects as Partial<Defect>[],
      errors: allErrors,
      warnings: allWarnings,
      aiMapping: mappingResult,
      stats: {
        batchesCreated: batches.length,
        inspectionsCreated: inspections.length,
        defectsCreated: defects.length,
        rowsProcessed: rows.length - allErrors.length,
        rowsFailed: allErrors.length,
      },
    };

  } catch (error) {
    console.error('[Universal Transformer] Transform failed:', error);
    
    return {
      success: false,
      batches: [],
      inspections: [],
      defects: [],
      errors: [error instanceof Error ? error.message : 'Unknown transform error'],
      warnings: [],
      aiMapping: null,
      stats: {
        batchesCreated: 0,
        inspectionsCreated: 0,
        defectsCreated: 0,
        rowsProcessed: 0,
        rowsFailed: rows.length,
      },
    };
  }
}

// ============================================================================
// LEGACY SUPPORT - Old hardcoded transformers (kept for reference/fallback)
// ============================================================================

/**
 * Legacy transform functions - kept for backward compatibility
 * These use hardcoded column lookups
 */

export { transformData as transformDataUniversal };

// Re-export old functions for backward compatibility
export async function transformDataLegacy(
  rows: Record<string, unknown>[],
  fileType: FileType
): Promise<TransformResult> {
  // This is a fallback that uses the old hardcoded logic
  // Kept for cases where AI mapping might fail
  
  if (rows.length === 0) {
    return {
      success: false,
      batches: [],
      inspections: [],
      defects: [],
      errors: ['No data rows to transform'],
      warnings: [],
      aiMapping: null,
      stats: {
        batchesCreated: 0,
        inspectionsCreated: 0,
        defectsCreated: 0,
        rowsProcessed: 0,
        rowsFailed: 0,
      },
    };
  }

  // Simple fallback mapping for legacy support
  const mappingConfig: DataTransformationConfig = {
    mapping: {},
    batchGeneration: { type: 'uuid' },
    typeConversions: {},
    defaultValues: {
      status: 'completed',
      risk_level: 'normal',
    },
  };

  // Try to infer mappings from first row
  const firstRow = rows[0];
  const headers = Object.keys(firstRow);

  // Basic keyword matching fallback
  for (const header of headers) {
    const lowerHeader = header.toLowerCase();
    
    if (lowerHeader.includes('batch') || lowerHeader.includes('lot')) {
      mappingConfig.mapping[header] = 'batch_number';
    } else if (lowerHeader.includes('date') || lowerHeader.includes('dt')) {
      mappingConfig.mapping[header] = 'production_date';
    } else if (lowerHeader.includes('rej') || lowerHeader.includes('fail') || lowerHeader.includes('ng')) {
      mappingConfig.mapping[header] = 'rejected_quantity';
    } else if (lowerHeader.includes('prod') || lowerHeader.includes('qty') || lowerHeader.includes('qty')) {
      mappingConfig.mapping[header] = 'produced_quantity';
    } else if (lowerHeader.includes('defect') || lowerHeader.includes('type')) {
      mappingConfig.mapping[header] = 'defect_type';
    }
  }

  // Use applyMapping with this basic config
  const result = applyMapping(rows, mappingConfig, fileType);

  return {
    success: result.errors.length === 0,
    batches: result.batches as Partial<Batch>[],
    inspections: result.inspections as Partial<InspectionRecord>[],
    defects: result.defects as Partial<Defect>[],
    errors: result.errors,
    warnings: result.warnings,
    aiMapping: null,
    stats: {
      batchesCreated: result.batches.length,
      inspectionsCreated: result.inspections.length,
      defectsCreated: result.defects.length,
      rowsProcessed: rows.length - result.errors.length,
      rowsFailed: result.errors.length,
    },
  };
}
