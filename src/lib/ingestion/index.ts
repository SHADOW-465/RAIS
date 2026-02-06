/**
 * RAIS v2.0 - Ingestion Module
 * 
 * Complete pipeline for Excel ingestion:
 * 1. Parse Excel files
 * 2. Validate against schema
 * 3. Transform to normalized format
 * 4. Insert with audit trail
 * 
 * AI is used ONLY for interpretation (in separate module)
 * All calculations are deterministic
 */

// Excel parsing
export {
  parseExcelBuffer,
  calculateFileHash,
  previewSheet,
  type ParseResult as ExcelParseResult,
} from './excelReader';

// Schema validation
export {
  validateSchema,
  getFileTypeDescription,
  type SchemaValidationResult,
  type ColumnMappings,
} from './schemaValidator';

// Data transformation
export {
  transformToNormalized,
  getStageCodeForFileType,
  type TransformResult,
  type TransformContext,
} from './dataTransformer';

// Database insertion
export {
  checkFileExists,
  createUploadLog,
  updateUploadStatus,
  getStageId,
  getDefectIdMap,
  insertTransformedData,
  refreshKPIViews,
  runIngestionPipeline,
  type InsertResult,
  type UploadRecord,
} from './dbInserter';
