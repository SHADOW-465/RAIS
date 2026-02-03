/**
 * Schema Detector
 * Auto-detect inspection type from Excel column headers AND filename
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
  detectionSource: 'filename' | 'columns' | 'unknown';
}

// ============================================================================
// FILENAME PATTERNS
// ============================================================================

/**
 * Filename keywords mapped to file types
 * Each keyword can have multiple variations
 */
const FILENAME_PATTERNS: { type: FileType; keywords: string[] }[] = [
  {
    type: 'visual',
    keywords: ['visual', 'visu', 'visual_inspection', 'visualinspection', 'vi'],
  },
  {
    type: 'assembly',
    keywords: ['assembly', 'assy', 'asm', 'assembly_rejection', 'assembly_qc'],
  },
  {
    type: 'integrity',
    keywords: ['integrity', 'int', 'test', 'balloon', 'valve', 'integrity_test', 'leak_test'],
  },
  {
    type: 'cumulative',
    keywords: ['cumulative', 'cum', 'commulative', 'comm', 'yearly', 'monthly', 'production_summary', 'prod_summary'],
  },
  {
    type: 'shopfloor',
    keywords: ['shopfloor', 'shop', 'sf', 'material', 'incoming', 'incoming_qc', 'receiving'],
  },
  {
    type: 'rejection',
    keywords: ['rejection', 'reject', 'defect', 'defective', 'failed', 'failure', 'ng', 'scrap'],
  },
];

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
    optionalColumns: [
      'inspector',
      'date',
      'severity',
      'remarks',
      'inspection_date',
      'batch_id',
      'product_code',
      'product_name',
      'rejection_qty',
      'rejected',
      'line',
      'shift',
      'created_by',
    ],
    description: 'Visual Inspection Report',
  },
  {
    type: 'assembly',
    requiredColumns: ['batch_number', 'stage', 'pass_count', 'fail_count'],
    optionalColumns: [
      'date',
      'inspector',
      'line',
      'shift',
      'assembly_stage',
      'passed',
      'failed',
      'batch_id',
      'product_code',
      'ok',
      'ng',
      'accepted',
      'rejected',
      'rejection_qty',
      'created_by',
    ],
    description: 'Assembly QC Report',
  },
  {
    type: 'integrity',
    requiredColumns: ['batch_number', 'test_type', 'result'],
    optionalColumns: [
      'date',
      'tester',
      'equipment',
      'value',
      'tolerance',
      'pass_fail',
      'inspection_date',
      'batch_id',
      'test_result',
      'status',
      'remarks',
      'created_by',
    ],
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
      'accepted',
      'rejected',
      'production_date',
      'completion_date',
      'planned_qty',
      'batch_id',
      'year',
      'month',
      'created_by',
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
      'part_number',
      'component',
      'received_date',
      'received_qty',
      'accepted_qty',
      'rejected_qty',
      'created_by',
    ],
    description: 'Shopfloor/Material Incoming Report',
  },
  {
    type: 'rejection',
    requiredColumns: ['batch_number', 'rejected_quantity'],
    optionalColumns: [
      'date',
      'defect_type',
      'inspector',
      'reason',
      'product_code',
      'product_name',
      'rejection_reason',
      'defect',
      'defect_name',
      'severity',
      'line',
      'shift',
      'rejection_qty',
      'rejected',
      'qty',
      'quantity',
      'inspection_stage',
      'created_by',
      'remarks',
    ],
    description: 'Rejection/Defect Report',
  },
];

// ============================================================================
// FILENAME DETECTION
// ============================================================================

/**
 * Detect file type from filename
 * @param filename - Original filename
 * @returns FileType or 'unknown'
 */
export function detectTypeFromFilename(filename: string): FileType {
  // Remove extension and normalize
  const normalized = filename
    .toLowerCase()
    .replace(/\.xlsx?$/, '')
    .replace(/\.csv$/, '')
    .replace(/[\s\-_]+/g, '_');

  // Check each pattern
  for (const pattern of FILENAME_PATTERNS) {
    for (const keyword of pattern.keywords) {
      if (normalized.includes(keyword.toLowerCase())) {
        return pattern.type;
      }
    }
  }

  return 'unknown';
}

/**
 * Get detection result from filename
 */
function detectFromFilename(filename: string): DetectionResult | null {
  const detectedType = detectTypeFromFilename(filename);

  if (detectedType !== 'unknown') {
    const pattern = SCHEMA_PATTERNS.find((p) => p.type === detectedType);
    return {
      detectedType,
      confidence: 0.9, // High confidence for filename detection
      matchedColumns: pattern?.requiredColumns || [],
      missingRequired: [],
      suggestions: [`Detected as ${pattern?.description || detectedType} from filename`],
      detectionSource: 'filename',
    };
  }

  return null;
}

// ============================================================================
// COLUMN DETECTION
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
  if (
    normalizedActual.includes(normalizedExpected) ||
    normalizedExpected.includes(normalizedActual)
  )
    return true;

  // Common variations database
  const variations: Record<string, string[]> = {
    // Batch variations
    batch_number: [
      'batch_no',
      'batch_id',
      'batch',
      'lot_number',
      'lot_no',
      'lot',
      'batch_num',
      'batchnumber',
      'lotnumber',
      'batchno',
      'lotno',
      'id',
      'batch_ref',
    ],
    // Defect/Rejection variations
    defect_type: [
      'defect',
      'defect_name',
      'defect_code',
      'type',
      'defecttype',
      'rejection_type',
      'rejectiontype',
      'rejection_reason',
      'reason',
      'defect_description',
      'fault',
      'issue',
      'problem',
    ],
    // Quantity variations
    defect_count: [
      'count',
      'qty',
      'quantity',
      'defects',
      'defect_qty',
      'rejection_qty',
      'rejected_qty',
      'reject_qty',
      'failed_qty',
      'ng_qty',
      'number',
      'total',
      'amount',
    ],
    // Pass/Fail variations
    pass_count: [
      'passed',
      'pass',
      'ok_count',
      'ok',
      'accepted',
      'accept',
      'good',
      'approved',
      'pass_qty',
      'accepted_qty',
    ],
    fail_count: [
      'failed',
      'fail',
      'ng_count',
      'ng',
      'reject',
      'rejected',
      'rejection',
      'defective',
      'bad',
      'not_ok',
      'scrap',
      'fail_qty',
      'rejected_qty',
    ],
    // Inspector variations
    inspector: [
      'inspector_name',
      'inspector_id',
      'inspected_by',
      'operator',
      'qc_name',
      'checker',
      'examiner',
      'verified_by',
      'checked_by',
      'qc',
      'quality_checker',
      'inspection_by',
    ],
    // Date variations
    date: [
      'inspection_date',
      'production_date',
      'created_date',
      'created_at',
      'date_of_inspection',
      'inspection_dt',
      'prod_date',
      'manufacturing_date',
      'mfg_date',
      'date_time',
      'timestamp',
    ],
    // Supplier variations
    supplier: [
      'supplier_name',
      'supplier_code',
      'vendor',
      'vendor_name',
      'vendor_code',
      'supplier',
      'supp',
      'vend',
    ],
    // Material variations
    material: [
      'material_code',
      'material_name',
      'part',
      'part_number',
      'component',
      'item',
      'item_code',
      'product',
      'material',
      'part_no',
      'component_code',
    ],
    // Quantity variations
    quantity: [
      'qty',
      'amount',
      'total_qty',
      'total',
      'count',
      'number',
      'volume',
      'qty_produced',
      'qty_rejected',
    ],
    // Stage variations
    stage: [
      'inspection_stage',
      'assembly_stage',
      'process_stage',
      'step',
      'process',
      'phase',
      'operation',
      'work_stage',
      'checkpoint',
    ],
    // Test variations
    test_type: [
      'test',
      'test_name',
      'inspection_type',
      'check_type',
      'test_method',
      'examination',
      'verification',
      'validation',
    ],
    // Result variations
    result: [
      'pass_fail',
      'status',
      'test_result',
      'outcome',
      'verdict',
      'conclusion',
      'decision',
      'pf',
      'ok_ng',
    ],
    // Product variations
    product_code: [
      'product',
      'product_name',
      'item_code',
      'part_code',
      'sku',
      'model',
      'model_no',
      'product_no',
      'item_no',
      'code',
    ],
    // Rejected quantity variations
    rejected_quantity: [
      'rejected',
      'reject',
      'rejection',
      'rejection_qty',
      'rejected_qty',
      'reject_qty',
      'failed',
      'fail',
      'ng',
      'scrap_qty',
      'defective_qty',
      'qty_rejected',
    ],
    // Produced quantity variations
    produced_quantity: [
      'produced',
      'production',
      'output',
      'manufactured',
      'completed',
      'done',
      'finished',
      'qty_produced',
      'produced_qty',
      'total_produced',
    ],
  };

  const expectedVariations = variations[normalizedExpected] || [];
  return expectedVariations.some(
    (v) => normalizedActual.includes(v) || v.includes(normalizedActual)
  );
}

/**
 * Detect schema from column headers only
 */
function detectFromColumns(headers: string[]): DetectionResult {
  const normalizedHeaders = headers.map(normalizeHeader);
  let bestMatch: DetectionResult = {
    detectedType: 'unknown',
    confidence: 0,
    matchedColumns: [],
    missingRequired: [],
    suggestions: ['Unable to detect file type from column headers'],
    detectionSource: 'unknown',
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
        detectedType: confidence >= 0.4 ? pattern.type : 'unknown', // Lowered threshold from 0.6 to 0.4
        confidence,
        matchedColumns: [...matchedRequired, ...matchedOptional],
        missingRequired,
        suggestions:
          missingRequired.length > 0
            ? [`Missing columns for ${pattern.description}: ${missingRequired.join(', ')}`]
            : [],
        detectionSource: 'columns',
      };
    }
  }

  // Add suggestions for unknown type
  if (bestMatch.detectedType === 'unknown') {
    bestMatch.suggestions = [
      'Could not detect file type from columns. Detected columns:',
      headers.slice(0, 10).join(', ') + (headers.length > 10 ? '...' : ''),
      '',
      'Supported types and required columns:',
      ...SCHEMA_PATTERNS.map(
        (p) => `- ${p.description}: ${p.requiredColumns.join(', ')}`
      ),
    ];
  }

  return bestMatch;
}

// ============================================================================
// MAIN DETECTION FUNCTION
// ============================================================================

/**
 * Detect the schema type from column headers and optional filename
 * @param headers - Array of column headers from the Excel file
 * @param filename - Optional original filename for additional detection
 * @returns DetectionResult with detected type and confidence
 */
export function detectSchema(headers: string[], filename?: string): DetectionResult {
  // Try filename detection first (if provided)
  if (filename) {
    const filenameResult = detectFromFilename(filename);
    if (filenameResult) {
      // If filename detection succeeded, validate against columns
      const columnResult = detectFromColumns(headers);
      
      // If columns also match reasonably well, combine confidence
      if (columnResult.detectedType === filenameResult.detectedType && columnResult.confidence >= 0.3) {
        return {
          ...filenameResult,
          confidence: Math.min(0.95, filenameResult.confidence + 0.05),
          matchedColumns: columnResult.matchedColumns,
          detectionSource: 'filename',
        };
      }
      
      // Return filename result even if columns don't match perfectly
      return filenameResult;
    }
  }

  // Fall back to column detection
  return detectFromColumns(headers);
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
