/**
 * Schema Detector
 * Auto-detect inspection type from Excel column headers
 */

import type { FileType } from '../db/types';

// ============================================================================
// TYPES
// ============================================================================

export interface SchemaPattern {
  type: FileType;
  requiredColumns: string[];
  optionalColumns: string[];
  description: string;
}

export interface DetectionResult {
  detectedType: FileType;
  confidence: number; // 0-1
  matchedColumns: string[];
  missingRequired: string[];
  suggestions: string[];
}

// ============================================================================
// SCHEMA PATTERNS
// ============================================================================

/**
 * Define column patterns for each file type
 * Column names are normalized (lowercase, underscores)
 */
export const SCHEMA_PATTERNS: SchemaPattern[] = [
  {
    type: 'visual',
    requiredColumns: ['batch_number', 'defect_type', 'defect_count'],
    optionalColumns: ['inspector', 'date', 'severity', 'remarks', 'inspection_date', 'batch_id'],
    description: 'Visual Inspection Report',
  },
  {
    type: 'assembly',
    requiredColumns: ['batch_number', 'stage', 'pass_count', 'fail_count'],
    optionalColumns: ['date', 'inspector', 'line', 'shift', 'assembly_stage', 'passed', 'failed'],
    description: 'Assembly QC Report',
  },
  {
    type: 'integrity',
    requiredColumns: ['batch_number', 'test_type', 'result'],
    optionalColumns: ['date', 'tester', 'equipment', 'value', 'tolerance', 'pass_fail'],
    description: 'Integrity Test Report',
  },
  {
    type: 'cumulative',
    requiredColumns: ['batch_number', 'produced_quantity', 'rejected_quantity'],
    optionalColumns: [
      'date',
      'product_code',
      'product_name',
      'status',
      'total_produced',
      'total_rejected',
    ],
    description: 'Cumulative Production Report',
  },
  {
    type: 'shopfloor',
    requiredColumns: ['supplier', 'material', 'quantity'],
    optionalColumns: [
      'accepted',
      'rejected',
      'date',
      'supplier_name',
      'supplier_code',
      'material_code',
      'po_number',
    ],
    description: 'Shopfloor/Material Incoming Report',
  },
];

// ============================================================================
// DETECTION FUNCTIONS
// ============================================================================

/**
 * Normalize a column header for comparison
 */
function normalizeHeader(header: string): string {
  return header
    .toLowerCase()
    .trim()
    .replace(/[\s\-\.]+/g, '_')
    .replace(/[^a-z0-9_]/g, '');
}

/**
 * Check if a column matches any of the expected columns (fuzzy match)
 */
function columnsMatch(actual: string, expected: string): boolean {
  const normalizedActual = normalizeHeader(actual);
  const normalizedExpected = normalizeHeader(expected);

  // Exact match
  if (normalizedActual === normalizedExpected) return true;

  // Contains match (e.g., "batch_number" matches "batch_no" or "batch")
  if (normalizedActual.includes(normalizedExpected) || normalizedExpected.includes(normalizedActual))
    return true;

  // Common variations
  const variations: Record<string, string[]> = {
    batch_number: ['batch_no', 'batch_id', 'batch', 'lot_number', 'lot_no', 'lot'],
    defect_type: ['defect', 'defect_name', 'defect_code', 'type'],
    defect_count: ['count', 'qty', 'quantity', 'defects'],
    pass_count: ['passed', 'pass', 'ok_count', 'ok'],
    fail_count: ['failed', 'fail', 'ng_count', 'ng', 'reject'],
    inspector: ['inspector_name', 'inspector_id', 'inspected_by', 'operator'],
    date: ['inspection_date', 'production_date', 'created_date', 'created_at'],
    supplier: ['supplier_name', 'supplier_code', 'vendor', 'vendor_name'],
    material: ['material_code', 'material_name', 'part', 'part_number', 'component'],
    quantity: ['qty', 'amount', 'total_qty'],
    stage: ['inspection_stage', 'assembly_stage', 'process_stage', 'step'],
  };

  const expectedVariations = variations[normalizedExpected] || [];
  return expectedVariations.some(
    (v) => normalizedActual.includes(v) || v.includes(normalizedActual)
  );
}

/**
 * Detect the schema type from column headers
 * @param headers - Array of column headers from the Excel file
 * @returns DetectionResult with detected type and confidence
 */
export function detectSchema(headers: string[]): DetectionResult {
  const normalizedHeaders = headers.map(normalizeHeader);
  let bestMatch: DetectionResult = {
    detectedType: 'unknown',
    confidence: 0,
    matchedColumns: [],
    missingRequired: [],
    suggestions: ['Unable to detect file type. Please ensure required columns are present.'],
  };

  for (const pattern of SCHEMA_PATTERNS) {
    const matchedRequired: string[] = [];
    const missingRequired: string[] = [];
    const matchedOptional: string[] = [];

    // Check required columns
    for (const required of pattern.requiredColumns) {
      const matched = normalizedHeaders.some((h) => columnsMatch(h, required));
      if (matched) {
        matchedRequired.push(required);
      } else {
        missingRequired.push(required);
      }
    }

    // Check optional columns
    for (const optional of pattern.optionalColumns) {
      if (normalizedHeaders.some((h) => columnsMatch(h, optional))) {
        matchedOptional.push(optional);
      }
    }

    // Calculate confidence score
    const requiredScore = matchedRequired.length / pattern.requiredColumns.length;
    const optionalScore =
      pattern.optionalColumns.length > 0
        ? matchedOptional.length / pattern.optionalColumns.length
        : 0;
    const confidence = requiredScore * 0.8 + optionalScore * 0.2; // Weight required columns more

    if (confidence > bestMatch.confidence) {
      bestMatch = {
        detectedType: confidence >= 0.6 ? pattern.type : 'unknown',
        confidence,
        matchedColumns: [...matchedRequired, ...matchedOptional],
        missingRequired,
        suggestions:
          missingRequired.length > 0
            ? [`Missing columns for ${pattern.description}: ${missingRequired.join(', ')}`]
            : [],
      };
    }
  }

  // Add suggestions for unknown type
  if (bestMatch.detectedType === 'unknown') {
    bestMatch.suggestions = [
      'Could not detect file type. Supported types:',
      ...SCHEMA_PATTERNS.map(
        (p) => `- ${p.description}: requires ${p.requiredColumns.join(', ')}`
      ),
    ];
  }

  return bestMatch;
}

/**
 * Get schema pattern for a specific file type
 */
export function getSchemaPattern(type: FileType): SchemaPattern | undefined {
  return SCHEMA_PATTERNS.find((p) => p.type === type);
}

/**
 * Get all supported schema types
 */
export function getSupportedTypes(): { type: FileType; description: string }[] {
  return SCHEMA_PATTERNS.map((p) => ({ type: p.type, description: p.description }));
}
