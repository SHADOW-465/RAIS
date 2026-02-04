/**
 * Smart Local Mapper
 * Replaces external AI with advanced local heuristics for schema mapping.
 * Handles:
 * 1. File Type Detection (Signature Matching)
 * 2. Column Mapping (Fuzzy Regex)
 * 3. Defect Pivoting (Turning columns like "COAG" into defect records)
 */

import { v4 as uuidv4 } from 'uuid';

// ============================================================================
// TYPES
// ============================================================================

export interface ColumnMapping {
  [excelColumn: string]: string; // excel_col -> db_field
}

export interface BatchGenerationStrategy {
  type: 'date_based' | 'uuid' | 'row_index' | 'composite';
  format?: string;
  sourceColumns?: string[];
}

export interface DefectPivotStrategy {
  active: boolean;
  defectColumns: string[]; // List of columns to treat as defect counts
}

export interface DataTransformationConfig {
  mapping: ColumnMapping;
  batchGeneration: BatchGenerationStrategy;
  pivot: DefectPivotStrategy;
  typeConversions: {
    [dbField: string]: 'string' | 'number' | 'date' | 'boolean';
  };
  defaultValues: {
    [dbField: string]: unknown;
  };
  fileType: string;
}

export interface MappingResult {
  success: boolean;
  config: DataTransformationConfig;
  confidence: number;
  explanation: string;
}

// ============================================================================
// CONFIGURATION: KNOWN PATTERNS
// ============================================================================

// Signatures to identify file types based on column headers
const FILE_SIGNATURES = {
  shopfloor: ['coag', 'raised_wire', 'surface_defect', 'black_mark', 'trolleys'],
  assembly: ['visual_qty', 'balloon_chkd_qty', 'valve_int_chkd_qty', 'final_rej_%'],
  visual: ['visual_inspection', 'scratch', 'dent', 'foreign_particle'], // Example
  cumulative: ['production_qty', 'dispatch_qty', 'month'],
};

// Known defect columns for pivoting (if found, these are treated as defect counts)
const KNOWN_DEFECT_COLUMNS = [
  'coag', 'raised_wire', 'surface_defect', 'overlaping', 'black_mark', 
  'webbing', 'missing_formers', 'others', 'leakage', 'bubble', 'thin_spod', 
  'dirty', 'sticky', 'weak', 'wrong_color'
];

// Mapping rules (Regex -> DB Field)
const COLUMN_PATTERNS: { [key: string]: RegExp[] } = {
  production_date: [/date/i, /dt/i, /day/i, /month/i],
  batch_number: [/batch/i, /lot/i, /no/i, /s\.no/i],
  
  // Quantities
  produced_quantity: [/production_qty/i, /visual_qty/i, /checked_qty/i, /inspected_qty/i, /production/i, /trolleys/i],
  rejected_quantity: [/rej_qty/i, /total_rej/i, /fail_qty/i, /rejected/i, /rejection/i],
  
  // Specifics
  inspector_name: [/inspector/i, /checked_by/i, /operator/i],
};

// ============================================================================
// MAIN LOGIC
// ============================================================================

export function generateSmartMapping(headers: string[], fileName: string): MappingResult {
  const normalizedHeaders = headers.map(h => h.toLowerCase().trim().replace(/[\s\-\.]+/g, '_'));
  const headerMap = new Map<string, string>(); // normalized -> original
  normalizedHeaders.forEach((h, i) => headerMap.set(h, headers[i]));

  // 1. Detect File Type
  const fileType = detectFileType(normalizedHeaders);
  
  // 2. Identify Defect Columns (for Pivoting)
  const defectColumns: string[] = [];
  if (fileType === 'shopfloor' || fileType === 'visual' || fileType === 'integrity') {
    normalizedHeaders.forEach(h => {
      // If it matches a known defect type AND isn't mapped to a core field
      if (KNOWN_DEFECT_COLUMNS.some(d => h.includes(d))) {
        defectColumns.push(headerMap.get(h)!);
      }
    });
  }

  // 3. Build Column Mapping
  const mapping: ColumnMapping = {};
  const typeConversions: any = {};
  
  // Map core fields
  for (const [dbField, patterns] of Object.entries(COLUMN_PATTERNS)) {
    // Try to find a matching header
    for (const h of normalizedHeaders) {
      // specific override for Assembly: 'visual_qty' is 'inspected_quantity' there
      if (fileType === 'assembly' && h === 'visual_qty' && dbField === 'produced_quantity') {
         mapping[headerMap.get(h)!] = 'inspected_quantity';
         typeConversions['inspected_quantity'] = 'number';
         continue;
      }

      if (patterns.some(p => p.test(h))) {
        // Don't map if it's already identified as a defect column
        if (!defectColumns.includes(headerMap.get(h)!)) {
          mapping[headerMap.get(h)!] = dbField;
          
          if (dbField.includes('quantity')) typeConversions[dbField] = 'number';
          if (dbField.includes('date')) typeConversions[dbField] = 'date';
          break; // Found a match for this dbField
        }
      }
    }
  }

  // 4. Batch Generation Strategy
  // If we have a date but no batch number, use date-based generation
  let batchStrategy: BatchGenerationStrategy = { type: 'uuid' };
  const hasDate = Object.values(mapping).includes('production_date');
  const hasBatch = Object.values(mapping).includes('batch_number');

  if (!hasBatch && hasDate) {
    batchStrategy = {
      type: 'date_based',
      format: 'BATCH-YYYY-MM-DD',
      sourceColumns: ['production_date']
    };
  } else if (fileType === 'cumulative' && normalizedHeaders.includes('month')) {
     // Cumulative files often use serial dates as "Month"
     batchStrategy = { type: 'date_based', format: 'BATCH-YYYY-MM', sourceColumns: ['production_date'] };
  }

  return {
    success: true,
    config: {
      mapping,
      batchGeneration: batchStrategy,
      pivot: {
        active: defectColumns.length > 0,
        defectColumns
      },
      typeConversions,
      defaultValues: {
        status: 'completed',
        risk_level: 'normal'
      },
      fileType
    },
    confidence: 0.9,
    explanation: `Identified as ${fileType}. Found ${defectColumns.length} defect columns to pivot.`
  };
}

function detectFileType(headers: string[]): string {
  let bestMatch = 'unknown';
  let maxMatches = 0;

  for (const [type, signature] of Object.entries(FILE_SIGNATURES)) {
    const matches = signature.filter(keyword => 
      headers.some(h => h.includes(keyword))
    ).length;

    if (matches > maxMatches) {
      maxMatches = matches;
      bestMatch = type;
    }
  }

  return bestMatch;
}
