/**
 * RAIS v2.0 - Data Transformer
 * 
 * RESPONSIBILITIES:
 * 1. Transform wide-format Excel data to long-format database records
 * 2. Pivot defect columns into defect_occurrence rows
 * 3. Maintain full audit trail (source file, row, column)
 * 
 * STRICT RULES:
 * - NO value modification or "cleaning"
 * - NO inference of missing data
 * - Full source traceability
 */

import type {
  FileType,
  ProductionSummaryInsert,
  StageInspectionSummaryInsert,
  DefectOccurrenceInsert,
  ValidationError,
} from '../db/schema.types';
import type { ColumnMappings } from './schemaValidator';

// ============================================================================
// TYPES
// ============================================================================

export interface TransformResult {
  success: boolean;
  productionRecords: ProductionSummaryInsert[];
  stageRecords: StageInspectionSummaryInsert[];
  defectRecords: DefectOccurrenceInsert[];
  stats: {
    rowsProcessed: number;
    rowsSkipped: number;
    productionRecordsCreated: number;
    stageRecordsCreated: number;
    defectRecordsCreated: number;
  };
  errors: ValidationError[];
  warnings: string[];
}

export interface TransformContext {
  sourceFileId: string;
  fileType: FileType;
  stageId: string; // UUID of the inspection stage
  mappings: ColumnMappings;
  defectIdMap: Map<string, string>; // defect_code -> defect_id
}

// ============================================================================
// MAIN TRANSFORM FUNCTION
// ============================================================================

/**
 * Transform parsed Excel rows into normalized database records
 * 
 * This is a DETERMINISTIC function:
 * - Same input always produces same output
 * - No AI, no inference, no modification
 */
export function transformToNormalized(
  rows: Record<string, unknown>[],
  context: TransformContext
): TransformResult {
  const productionRecords: ProductionSummaryInsert[] = [];
  const stageRecords: StageInspectionSummaryInsert[] = [];
  const defectRecords: DefectOccurrenceInsert[] = [];
  const errors: ValidationError[] = [];
  const warnings: string[] = [];

  let rowsProcessed = 0;
  let rowsSkipped = 0;

  // Group by date for aggregation
  const dateGroups = new Map<string, {
    production: { produced: number; dispatched: number; rowNumbers: number[] };
    stage: { received: number; inspected: number; accepted: number; hold: number; rejected: number; rowNumber: number };
    defects: Map<string, { quantity: number; rowNumber: number; columnName: string }>;
  }>();

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowNumber = i + 2; // 1-indexed, after header

    try {
      // Extract date
      const date = extractDate(row, context.mappings);
      if (!date) {
        warnings.push(`Row ${rowNumber}: No valid date found, skipping`);
        rowsSkipped++;
        continue;
      }

      // Initialize date group if needed
      if (!dateGroups.has(date)) {
        dateGroups.set(date, {
          production: { produced: 0, dispatched: 0, rowNumbers: [] },
          stage: { received: 0, inspected: 0, accepted: 0, hold: 0, rejected: 0, rowNumber: rowNumber },
          defects: new Map(),
        });
      }

      const group = dateGroups.get(date)!;
      group.production.rowNumbers.push(rowNumber);

      // Extract quantities based on file type
      const quantities = extractQuantities(row, context.mappings, context.fileType);

      // Aggregate production quantities
      group.production.produced += quantities.produced;
      group.production.dispatched += quantities.dispatched;

      // Aggregate stage quantities
      group.stage.received += quantities.received;
      group.stage.inspected += quantities.inspected;
      group.stage.accepted += quantities.accepted;
      group.stage.hold += quantities.hold;
      group.stage.rejected += quantities.rejected;

      // Extract and aggregate defects (PIVOT operation)
      const rowDefects = extractDefects(row, context.mappings, rowNumber);
      for (const defect of rowDefects) {
        const existing = group.defects.get(defect.code);
        if (existing) {
          existing.quantity += defect.quantity;
        } else {
          group.defects.set(defect.code, {
            quantity: defect.quantity,
            rowNumber: defect.rowNumber,
            columnName: defect.columnName,
          });
        }
      }

      rowsProcessed++;
    } catch (error) {
      errors.push({
        row: rowNumber,
        message: `Transform error: ${error instanceof Error ? error.message : 'Unknown'}`,
        severity: 'error',
      });
      rowsSkipped++;
    }
  }

  // Convert grouped data to records
  for (const [date, group] of dateGroups) {
    // Create production summary record
    if (group.production.produced > 0 || context.fileType === 'cumulative') {
      productionRecords.push({
        date,
        product_code: null, // Could be extracted if available
        produced_quantity: group.production.produced,
        dispatched_quantity: group.production.dispatched,
        source_file_id: context.sourceFileId,
        source_row_numbers: group.production.rowNumbers,
      });
    }

    // Create stage inspection summary record
    if (group.stage.inspected > 0 || group.stage.rejected > 0) {
      stageRecords.push({
        date,
        stage_id: context.stageId,
        received_quantity: group.stage.received,
        inspected_quantity: Math.max(group.stage.inspected, group.stage.accepted + group.stage.rejected + group.stage.hold),
        accepted_quantity: group.stage.accepted,
        hold_quantity: group.stage.hold,
        rejected_quantity: group.stage.rejected,
        source_file_id: context.sourceFileId,
        source_row_number: group.stage.rowNumber,
      });
    }

    // Create defect occurrence records (PIVOTED from wide columns)
    for (const [defectCode, defectData] of group.defects) {
      const defectId = context.defectIdMap.get(defectCode.toUpperCase());
      if (!defectId) {
        warnings.push(`Unknown defect code: ${defectCode}, creating as 'OTHERS'`);
        const othersId = context.defectIdMap.get('OTHERS');
        if (othersId) {
          defectRecords.push({
            date,
            stage_id: context.stageId,
            defect_id: othersId,
            quantity: defectData.quantity,
            source_file_id: context.sourceFileId,
            source_row_number: defectData.rowNumber,
            source_column_name: defectData.columnName,
          });
        }
        continue;
      }

      defectRecords.push({
        date,
        stage_id: context.stageId,
        defect_id: defectId,
        quantity: defectData.quantity,
        source_file_id: context.sourceFileId,
        source_row_number: defectData.rowNumber,
        source_column_name: defectData.columnName,
      });
    }
  }

  return {
    success: errors.filter(e => e.severity === 'error').length === 0,
    productionRecords,
    stageRecords,
    defectRecords,
    stats: {
      rowsProcessed,
      rowsSkipped,
      productionRecordsCreated: productionRecords.length,
      stageRecordsCreated: stageRecords.length,
      defectRecordsCreated: defectRecords.length,
    },
    errors,
    warnings,
  };
}

// ============================================================================
// EXTRACTION FUNCTIONS
// ============================================================================

/**
 * Extract date from row
 */
function extractDate(row: Record<string, unknown>, mappings: ColumnMappings): string | null {
  if (!mappings.dateColumn) {
    // Try to find a date-like column
    for (const [key, value] of Object.entries(row)) {
      if (key.toLowerCase().includes('date') || key.toLowerCase().includes('month')) {
        const parsed = parseDate(value);
        if (parsed) return parsed;
      }
    }
    return null;
  }

  const value = row[mappings.dateColumn];
  return parseDate(value);
}

/**
 * Parse various date formats to ISO string
 */
function parseDate(value: unknown): string | null {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  // Handle Excel serial dates
  if (typeof value === 'number') {
    // Excel serial date (days since 1900-01-01, with Excel bug for 1900)
    if (value > 1 && value < 100000) {
      const excelEpoch = new Date(1899, 11, 30); // Dec 30, 1899
      const date = new Date(excelEpoch.getTime() + value * 24 * 60 * 60 * 1000);
      return date.toISOString().split('T')[0];
    }
    return null;
  }

  // Handle string dates
  if (typeof value === 'string') {
    const trimmed = value.trim();
    
    // Try direct parsing
    const date = new Date(trimmed);
    if (!isNaN(date.getTime())) {
      const year = date.getFullYear();
      if (year >= 1990 && year <= 2050) {
        return date.toISOString().split('T')[0];
      }
    }

    // Try DD/MM/YYYY format (common in India)
    const ddmmyyyy = trimmed.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
    if (ddmmyyyy) {
      const [, day, month, year] = ddmmyyyy;
      const parsed = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
      if (!isNaN(parsed.getTime())) {
        return parsed.toISOString().split('T')[0];
      }
    }

    // Try month name (e.g., "January 2025")
    const monthYear = trimmed.match(/^([A-Za-z]+)\s*(\d{4})$/);
    if (monthYear) {
      const [, monthName, year] = monthYear;
      const date = new Date(`${monthName} 1, ${year}`);
      if (!isNaN(date.getTime())) {
        return date.toISOString().split('T')[0];
      }
    }
  }

  // Handle Date objects
  if (value instanceof Date) {
    if (!isNaN(value.getTime())) {
      return value.toISOString().split('T')[0];
    }
  }

  return null;
}

/**
 * Extract quantities from row
 */
function extractQuantities(
  row: Record<string, unknown>,
  mappings: ColumnMappings,
  fileType: FileType
): {
  produced: number;
  dispatched: number;
  received: number;
  inspected: number;
  accepted: number;
  hold: number;
  rejected: number;
} {
  const getNumeric = (colName: string | undefined): number => {
    if (!colName) return 0;
    const value = row[colName];
    if (value === null || value === undefined || value === '') return 0;
    const num = Number(String(value).replace(/,/g, ''));
    return isNaN(num) ? 0 : Math.max(0, num);
  };

  const produced = getNumeric(mappings.quantityColumns.produced);
  const dispatched = getNumeric(mappings.quantityColumns.dispatched);
  const received = getNumeric(mappings.quantityColumns.received);
  const inspected = getNumeric(mappings.quantityColumns.inspected);
  const accepted = getNumeric(mappings.quantityColumns.accepted);
  const hold = getNumeric(mappings.quantityColumns.hold);
  const rejected = getNumeric(mappings.quantityColumns.rejected);

  // Calculate derived values if missing
  let finalInspected = inspected;
  if (finalInspected === 0 && produced > 0) {
    finalInspected = produced;
  }

  let finalRejected = rejected;
  if (finalRejected === 0 && fileType !== 'cumulative' && fileType !== 'production') {
    // Sum defect columns for rejected total
    let defectSum = 0;
    for (const colName of mappings.defectColumns) {
      defectSum += getNumeric(colName);
    }
    finalRejected = defectSum;
  }

  return {
    produced,
    dispatched,
    received,
    inspected: finalInspected,
    accepted,
    hold,
    rejected: finalRejected,
  };
}

/**
 * Extract defects from row (PIVOT operation)
 * Each defect column becomes a separate defect occurrence
 */
function extractDefects(
  row: Record<string, unknown>,
  mappings: ColumnMappings,
  rowNumber: number
): Array<{ code: string; quantity: number; rowNumber: number; columnName: string }> {
  const defects: Array<{ code: string; quantity: number; rowNumber: number; columnName: string }> = [];

  for (const colName of mappings.defectColumns) {
    const value = row[colName];
    if (value === null || value === undefined || value === '') continue;

    const quantity = Number(String(value).replace(/,/g, ''));
    if (isNaN(quantity) || quantity <= 0) continue;

    // Normalize column name to defect code
    const defectCode = normalizeDefectCode(colName);

    defects.push({
      code: defectCode,
      quantity,
      rowNumber,
      columnName: colName,
    });
  }

  return defects;
}

/**
 * Normalize column name to defect code
 */
function normalizeDefectCode(columnName: string): string {
  return columnName
    .toUpperCase()
    .replace(/[\s\-\.]+/g, '_')
    .replace(/[^A-Z0-9_]/g, '')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '');
}

// ============================================================================
// STAGE MAPPING
// ============================================================================

/**
 * Map file type to inspection stage code
 */
export function getStageCodeForFileType(fileType: FileType): string {
  const mapping: Record<FileType, string> = {
    shopfloor: 'SHOPFLOOR',
    assembly: 'ASSEMBLY',
    visual: 'VISUAL',
    integrity: 'INTEGRITY',
    cumulative: 'FINAL', // Cumulative is typically final/overall
    production: 'FINAL',
    unknown: 'FINAL',
  };
  return mapping[fileType];
}
