/**
 * RAIS v2.0 - Schema Validator
 * 
 * RESPONSIBILITIES:
 * 1. Validate parsed Excel data against expected schemas
 * 2. Classify file type based on columns present
 * 3. Return clear error messages
 * 
 * STRICT RULES:
 * - Invalid data is REJECTED, not "cleaned"
 * - All validation errors are collected and reported
 * - No silent failures
 */

import type { FileType, ValidationError } from '../db/schema.types';

// ============================================================================
// TYPES
// ============================================================================

export interface SchemaValidationResult {
  isValid: boolean;
  fileType: FileType;
  confidence: number;
  errors: ValidationError[];
  warnings: string[];
  mappings: ColumnMappings;
}

export interface ColumnMappings {
  dateColumn: string | null;
  quantityColumns: {
    produced?: string;
    inspected?: string;
    accepted?: string;
    rejected?: string;
    hold?: string;
    received?: string;
    dispatched?: string;
  };
  defectColumns: string[];
  identifierColumns: string[];
}

// ============================================================================
// SCHEMA DEFINITIONS
// Expected columns for each file type
// ============================================================================

interface SchemaDefinition {
  type: FileType;
  requiredColumns: string[]; // At least one must match
  optionalColumns: string[];
  defectPatterns: RegExp[];
  quantityPatterns: {
    produced: RegExp[];
    inspected: RegExp[];
    accepted: RegExp[];
    rejected: RegExp[];
    hold: RegExp[];
  };
  datePatterns: RegExp[];
}

const SCHEMA_DEFINITIONS: SchemaDefinition[] = [
  {
    type: 'shopfloor',
    requiredColumns: ['trolleys', 'coag', 'raised_wire', 'surface_defect'],
    optionalColumns: ['date', 'month', 's_no'],
    defectPatterns: [
      /^coag$/i, /^raised_wire$/i, /^surface_defect$/i, /^overlaping$/i,
      /^black_mark$/i, /^webbing$/i, /^missing_formers$/i, /^others$/i,
    ],
    quantityPatterns: {
      produced: [/trolleys/i, /production_qty/i],
      inspected: [/trolleys/i],
      accepted: [],
      rejected: [/total_rej/i],
      hold: [],
    },
    datePatterns: [/date/i, /month/i, /day/i],
  },
  {
    type: 'assembly',
    requiredColumns: ['visual_qty', 'balloon_chkd_qty', 'valve_int_chkd_qty'],
    optionalColumns: ['date', 's_no', 'final_rej'],
    defectPatterns: [
      /leakage/i, /bubble/i, /thin_spod/i, /dirty/i, /sticky/i, /weak/i,
    ],
    quantityPatterns: {
      produced: [/visual_qty/i, /production/i],
      inspected: [/visual_qty/i, /chkd_qty/i],
      accepted: [/acpt/i, /accepted/i, /ok_qty/i],
      rejected: [/rej/i, /rejected/i],
      hold: [/hold/i],
    },
    datePatterns: [/date/i, /day/i],
  },
  {
    type: 'visual',
    requiredColumns: ['visual', 'inspection'],
    optionalColumns: ['scratch', 'dent', 'foreign_particle'],
    defectPatterns: [
      /scratch/i, /dent/i, /particle/i, /mark/i, /stain/i,
    ],
    quantityPatterns: {
      produced: [],
      inspected: [/inspected/i, /checked/i],
      accepted: [/passed/i, /ok/i],
      rejected: [/rejected/i, /failed/i],
      hold: [],
    },
    datePatterns: [/date/i],
  },
  {
    type: 'integrity',
    requiredColumns: ['balloon', 'valve', 'integrity'],
    optionalColumns: ['leak', 'burst', 'pressure'],
    defectPatterns: [
      /leak/i, /burst/i, /pressure/i, /valve/i,
    ],
    quantityPatterns: {
      produced: [],
      inspected: [/tested/i, /checked/i],
      accepted: [/passed/i],
      rejected: [/failed/i],
      hold: [],
    },
    datePatterns: [/date/i],
  },
  {
    type: 'cumulative',
    requiredColumns: ['production', 'dispatch', 'month'],
    optionalColumns: ['year', 'rejection'],
    defectPatterns: [],
    quantityPatterns: {
      produced: [/production_qty/i, /produced/i],
      inspected: [],
      accepted: [],
      rejected: [/rejection/i, /rej_qty/i],
      hold: [],
    },
    datePatterns: [/month/i, /date/i, /year/i],
  },
  {
    type: 'production',
    requiredColumns: ['production', 'qty'],
    optionalColumns: ['date', 'batch'],
    defectPatterns: [],
    quantityPatterns: {
      produced: [/production/i, /qty/i, /quantity/i],
      inspected: [],
      accepted: [],
      rejected: [],
      hold: [],
    },
    datePatterns: [/date/i],
  },
];

// ============================================================================
// MAIN VALIDATION FUNCTION
// ============================================================================

/**
 * Validate parsed Excel data and determine file type
 */
export function validateSchema(
  headers: string[],
  rows: Record<string, unknown>[],
  fileName: string
): SchemaValidationResult {
  const normalizedHeaders = headers.map(h => h.toLowerCase().trim());
  const errors: ValidationError[] = [];
  const warnings: string[] = [];

  // Step 1: Detect file type
  const { fileType, confidence, matchedSchema } = detectFileType(normalizedHeaders, fileName);

  if (fileType === 'unknown') {
    errors.push({
      row: 0,
      column: undefined,
      message: 'Unable to determine file type. Expected columns not found.',
      severity: 'error',
    });
  }

  // Step 2: Build column mappings
  // Use original headers for mappings so keys match data rows
  const mappings = buildColumnMappings(headers, matchedSchema);

  // Step 3: Validate data rows
  if (rows.length === 0) {
    errors.push({
      row: 0,
      message: 'No data rows found in file',
      severity: 'error',
    });
  } else {
    // Validate each row
    const rowErrors = validateRows(rows, mappings, fileType);
    errors.push(...rowErrors);
  }

  // Step 4: Check for required mappings
  if (fileType !== 'unknown' && fileType !== 'cumulative') {
    // Non-cumulative files should have at least one quantity column
    const hasQuantity = Object.values(mappings.quantityColumns).some(v => v !== undefined);
    if (!hasQuantity) {
      warnings.push('No quantity columns detected - data may be incomplete');
    }
  }

  // Check for date column
  if (!mappings.dateColumn) {
    warnings.push('No date column detected - dates will need to be inferred');
  }

  return {
    isValid: errors.filter(e => e.severity === 'error').length === 0,
    fileType,
    confidence,
    errors,
    warnings,
    mappings,
  };
}

/**
 * Detect file type based on column patterns
 */
function detectFileType(
  headers: string[],
  fileName: string
): { fileType: FileType; confidence: number; matchedSchema: SchemaDefinition | null } {
  let bestMatch: { type: FileType; score: number; schema: SchemaDefinition | null } = {
    type: 'unknown',
    score: 0,
    schema: null,
  };

  for (const schema of SCHEMA_DEFINITIONS) {
    let score = 0;

    // Check required columns
    for (const required of schema.requiredColumns) {
      const found = headers.some(h => h.includes(required));
      if (found) score += 10;
    }

    // Check optional columns
    for (const optional of schema.optionalColumns) {
      const found = headers.some(h => h.includes(optional));
      if (found) score += 3;
    }

    // Check defect patterns
    for (const pattern of schema.defectPatterns) {
      const found = headers.some(h => pattern.test(h));
      if (found) score += 5;
    }

    // Bonus for filename hints
    const fileNameLower = fileName.toLowerCase();
    if (fileNameLower.includes(schema.type)) {
      score += 20;
    }

    if (score > bestMatch.score) {
      bestMatch = { type: schema.type, score, schema };
    }
  }

  // Calculate confidence (0-1)
  const maxPossibleScore = 100;
  const confidence = Math.min(1, bestMatch.score / maxPossibleScore);

  // Require minimum confidence
  if (confidence < 0.2) {
    return { fileType: 'unknown', confidence: 0, matchedSchema: null };
  }

  return {
    fileType: bestMatch.type,
    confidence,
    matchedSchema: bestMatch.schema,
  };
}

/**
 * Build column mappings based on schema
 */
function buildColumnMappings(
  headers: string[],
  schema: SchemaDefinition | null
): ColumnMappings {
  const mappings: ColumnMappings = {
    dateColumn: null,
    quantityColumns: {},
    defectColumns: [],
    identifierColumns: [],
  };

  if (!schema) {
    // Fallback: try common patterns
    for (const header of headers) {
      if (/date|month|day/i.test(header)) {
        mappings.dateColumn = header;
        break;
      }
    }
    return mappings;
  }

  // Find date column
  for (const pattern of schema.datePatterns) {
    const match = headers.find(h => pattern.test(h));
    if (match) {
      mappings.dateColumn = match;
      break;
    }
  }

  // Find quantity columns
  for (const [key, patterns] of Object.entries(schema.quantityPatterns)) {
    for (const pattern of patterns) {
      const match = headers.find(h => pattern.test(h));
      if (match) {
        mappings.quantityColumns[key as keyof typeof mappings.quantityColumns] = match;
        break;
      }
    }
  }

  // Find defect columns
  for (const pattern of schema.defectPatterns) {
    const matches = headers.filter(h => pattern.test(h));
    mappings.defectColumns.push(...matches);
  }

  // Also include any numeric columns that look like defects
  // (columns with defect-like names that we haven't matched)
  const defectKeywords = ['coag', 'wire', 'defect', 'mark', 'leak', 'bubble', 'dirty', 'weak', 'others'];
  for (const header of headers) {
    if (defectKeywords.some(k => header.includes(k)) && !mappings.defectColumns.includes(header)) {
      mappings.defectColumns.push(header);
    }
  }

  // Find identifier columns
  const idPatterns = [/batch/i, /lot/i, /s_no/i, /serial/i];
  for (const pattern of idPatterns) {
    const match = headers.find(h => pattern.test(h));
    if (match && !mappings.identifierColumns.includes(match)) {
      mappings.identifierColumns.push(match);
    }
  }

  return mappings;
}

/**
 * Validate individual rows
 */
function validateRows(
  rows: Record<string, unknown>[],
  mappings: ColumnMappings,
  fileType: FileType
): ValidationError[] {
  const errors: ValidationError[] = [];
  const MAX_ERRORS = 100; // Limit error collection

  for (let i = 0; i < rows.length && errors.length < MAX_ERRORS; i++) {
    const row = rows[i];
    const rowNum = i + 2; // Account for header row (1-indexed)

    // Validate date if present
    if (mappings.dateColumn) {
      const dateValue = row[mappings.dateColumn];
      if (dateValue !== null && dateValue !== undefined) {
        const isValidDate = validateDate(dateValue);
        if (!isValidDate) {
          errors.push({
            row: rowNum,
            column: mappings.dateColumn,
            message: `Invalid date value: ${dateValue}`,
            severity: 'warning',
          });
        }
      }
    }

    // Validate quantity columns
    for (const [key, colName] of Object.entries(mappings.quantityColumns)) {
      if (!colName) continue;
      const value = row[colName];
      if (value !== null && value !== undefined) {
        const numValue = Number(value);
        if (isNaN(numValue)) {
          errors.push({
            row: rowNum,
            column: colName,
            message: `Non-numeric value in ${key} column: ${value}`,
            severity: 'warning',
          });
        } else if (numValue < 0) {
          errors.push({
            row: rowNum,
            column: colName,
            message: `Negative value in ${key} column: ${numValue}`,
            severity: 'error',
          });
        }
      }
    }

    // Validate defect columns
    for (const colName of mappings.defectColumns) {
      const value = row[colName];
      if (value !== null && value !== undefined && value !== '') {
        const numValue = Number(value);
        if (isNaN(numValue)) {
          errors.push({
            row: rowNum,
            column: colName,
            message: `Non-numeric defect count: ${value}`,
            severity: 'warning',
          });
        } else if (numValue < 0) {
          errors.push({
            row: rowNum,
            column: colName,
            message: `Negative defect count: ${numValue}`,
            severity: 'error',
          });
        }
      }
    }
  }

  if (errors.length >= MAX_ERRORS) {
    errors.push({
      row: 0,
      message: `Validation stopped after ${MAX_ERRORS} errors. File may have systematic issues.`,
      severity: 'error',
    });
  }

  return errors;
}

/**
 * Validate date value
 */
function validateDate(value: unknown): boolean {
  if (value === null || value === undefined) return false;

  // Handle Excel serial dates
  if (typeof value === 'number') {
    // Excel date range (1900-2100)
    return value > 1 && value < 100000;
  }

  // Handle string dates
  if (typeof value === 'string') {
    const date = new Date(value);
    if (!isNaN(date.getTime())) {
      // Check reasonable range (1990-2050)
      const year = date.getFullYear();
      return year >= 1990 && year <= 2050;
    }
  }

  // Handle Date objects
  if (value instanceof Date) {
    return !isNaN(value.getTime());
  }

  return false;
}

/**
 * Get human-readable file type description
 */
export function getFileTypeDescription(fileType: FileType): string {
  const descriptions: Record<FileType, string> = {
    shopfloor: 'Shopfloor Rejection Report',
    assembly: 'Assembly Inspection Report',
    visual: 'Visual Inspection Report',
    integrity: 'Balloon & Valve Integrity Report',
    cumulative: 'Cumulative Production Report',
    production: 'Production Summary Report',
    unknown: 'Unknown File Type',
  };
  return descriptions[fileType];
}
