/**
 * Excel Upload Processing Pipeline
 * Main entry point for Excel file processing
 */

import { parseExcelBuffer, type ParseResult, type ParsedSheet } from './excelParser';
import { detectSchema, type DetectionResult } from './schemaDetector';
import { validateData, type ValidationResult } from './validator';
import { transformData, type TransformResult } from './transformer';
import type { FileType } from '../db/types';

// ============================================================================
// TYPES
// ============================================================================

export interface ProcessResult {
  success: boolean;
  fileType: FileType;
  detection: DetectionResult;
  validation: ValidationResult;
  transform: TransformResult;
  errors: string[];
  metadata: {
    fileName?: string;
    sheetCount: number;
    totalRows: number;
    processedRows: number;
    processingTime: number;
  };
}

export interface ProcessOptions {
  sheetIndex?: number;
  maxRows?: number;
  skipValidation?: boolean;
  forceFileType?: FileType;
}

// ============================================================================
// MAIN PROCESSING FUNCTION
// ============================================================================

/**
 * Process an Excel file buffer through the full pipeline:
 * 1. Parse Excel file
 * 2. Detect schema/file type
 * 3. Validate data
 * 4. Transform to database records
 *
 * @param buffer - File buffer from upload
 * @param options - Processing options
 * @returns ProcessResult with all stages' results
 */
export async function processExcelFile(
  buffer: Buffer,
  options: ProcessOptions = {}
): Promise<ProcessResult> {
  const startTime = Date.now();
  const errors: string[] = [];

  // Step 1: Parse Excel file
  const parseResult = await parseExcelBuffer(buffer, {
    sheetIndex: options.sheetIndex,
    maxRows: options.maxRows,
  });

  if (!parseResult.success || parseResult.sheets.length === 0) {
    return {
      success: false,
      fileType: 'unknown',
      detection: {
        detectedType: 'unknown',
        confidence: 0,
        matchedColumns: [],
        missingRequired: [],
        suggestions: parseResult.errors,
        detectionSource: 'unknown',
      },
      validation: {
        valid: false,
        errors: [],
        warnings: [],
        summary: { totalRows: 0, validRows: 0, errorRows: 0, warningRows: 0 },
      },
      transform: {
        success: false,
        batches: [],
        inspections: [],
        defects: [],
        errors: parseResult.errors,
        warnings: [],
        aiMapping: null,
        stats: { batchesCreated: 0, inspectionsCreated: 0, defectsCreated: 0, rowsProcessed: 0, rowsFailed: 0 },
      },
      errors: parseResult.errors,
      metadata: {
        fileName: parseResult.metadata.fileName,
        sheetCount: 0,
        totalRows: 0,
        processedRows: 0,
        processingTime: Date.now() - startTime,
      },
    };
  }

  // Use first sheet by default
  const sheet = parseResult.sheets[0];

  // Step 2: Detect schema (pass filename if available from metadata)
  const detection = options.forceFileType
    ? {
        detectedType: options.forceFileType,
        confidence: 1,
        matchedColumns: sheet.headers,
        missingRequired: [],
        suggestions: [],
        detectionSource: 'filename' as const,
      }
    : detectSchema(sheet.headers, parseResult.metadata.fileName);

  if (detection.detectedType === 'unknown') {
    errors.push(...detection.suggestions);
  }

  // Step 3: Validate data
  let validation: ValidationResult;
  if (options.skipValidation) {
    validation = {
      valid: true,
      errors: [],
      warnings: [],
      summary: {
        totalRows: sheet.rowCount,
        validRows: sheet.rowCount,
        errorRows: 0,
        warningRows: 0,
      },
    };
  } else {
    validation = await validateData(sheet.rows, detection.detectedType);
    if (!validation.valid) {
      errors.push(`Validation failed: ${validation.summary.errorRows} rows with errors`);
    }
  }

  // Step 4: Transform data using Universal AI Data Adapter
  const transform = await transformData(
    sheet.rows,
    sheet.headers,
    detection.detectedType,
    parseResult.metadata.fileName || 'unknown',
    { skipValidation: options.skipValidation }
  );
  if (!transform.success) {
    errors.push(...transform.errors);
  }

  return {
    success: detection.detectedType !== 'unknown' && validation.valid && transform.success,
    fileType: detection.detectedType,
    detection,
    validation,
    transform,
    errors,
    metadata: {
      fileName: parseResult.metadata.fileName,
      sheetCount: parseResult.sheets.length,
      totalRows: sheet.rowCount,
      processedRows: transform.stats.batchesCreated + transform.stats.inspectionsCreated,
      processingTime: Date.now() - startTime,
    },
  };
}

/**
 * Quick schema detection without full processing
 * Useful for preview before upload
 */
export async function detectFileSchema(
  buffer: Buffer
): Promise<{ headers: string[]; detection: DetectionResult; preview: Record<string, unknown>[] }> {
  const parseResult = await parseExcelBuffer(buffer, { maxRows: 5 });

  if (!parseResult.success || parseResult.sheets.length === 0) {
    return {
      headers: [],
      detection: {
        detectedType: 'unknown',
        confidence: 0,
        matchedColumns: [],
        missingRequired: [],
        suggestions: parseResult.errors,
        detectionSource: 'unknown',
      },
      preview: [],
    };
  }

  const sheet = parseResult.sheets[0];
  const detection = detectSchema(sheet.headers);

  return {
    headers: sheet.headers,
    detection,
    preview: sheet.rows.slice(0, 5),
  };
}

// ============================================================================
// RE-EXPORTS
// ============================================================================

export { parseExcelBuffer, parseExcelFile, getSheetNames } from './excelParser';
export { detectSchema, getSupportedTypes, SCHEMA_PATTERNS } from './schemaDetector';
export { validateData, getValidationRules } from './validator';
export { transformData } from './transformer';

export type {
  ParseResult,
  ParsedSheet,
  DetectionResult,
  ValidationResult,
  TransformResult,
};

export type { ValidationError } from './validator';
