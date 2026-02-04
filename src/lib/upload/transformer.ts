/**
 * Data Transformer
 * Transform Excel rows to database records using Smart Local Mapping
 * Universal Data Adapter - works with ANY Excel format without external AI
 */

import { v4 as uuidv4 } from 'uuid';
import type {
  Batch,
  InspectionRecord,
  Defect,
  FileType,
} from '../db/types';
import {
  generateSmartMapping,
  type DataTransformationConfig,
  type MappingResult,
  type BatchGenerationStrategy,
} from './smartMapper';

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
 * Transform Excel rows to database records using Smart Local Mapping
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
  
  try {
    // STEP 1: Generate Smart Mapping (Local Heuristics)
    console.log('[Universal Transformer] Generating smart column mapping...');
    
    // Note: We ignore the passed fileType argument and let the smart mapper detect it
    // based on column headers, which is more reliable.
    const mappingResult = generateSmartMapping(headers, fileName);

    console.log('[Universal Transformer] Smart Mapping generated:', {
      fileType: mappingResult.config.fileType,
      confidence: mappingResult.confidence,
      explanation: mappingResult.explanation,
      pivotActive: mappingResult.config.pivot.active,
      defectColumns: mappingResult.config.pivot.defectColumns.length
    });

    // STEP 2: Apply the mapping to transform all rows
    console.log('[Universal Transformer] Applying mapping to transform data...');
    
    const { batches, inspections, defects, warnings, errors } = applyMapping(
      rows,
      mappingResult.config
    );

    // STEP 3: Combine warnings/errors
    const allWarnings = [...warnings]; // Mapper doesn't produce warnings yet
    const allErrors = [...errors];

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
// DATA TRANSFORMATION LOGIC
// ============================================================================

function applyMapping(
  rows: Record<string, unknown>[],
  config: DataTransformationConfig
): {
  batches: Array<Record<string, unknown>>;
  inspections: Array<Record<string, unknown>>;
  defects: Array<Record<string, unknown>>;
  warnings: string[];
  errors: string[];
} {
  const batches: Array<Record<string, unknown>> = [];
  const inspections: Array<Record<string, unknown>> = [];
  const defects: Array<Record<string, unknown>> = [];
  const warnings: string[] = [];
  const errors: string[] = [];

  const batchMap = new Map<string, Record<string, unknown> & { produced_quantity: number; rejected_quantity: number }>();

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowNum = i + 2; 

    try {
      const transformed: Record<string, unknown> = {};

      // 1. Apply Standard Column Mappings
      for (const [excelCol, dbField] of Object.entries(config.mapping)) {
        const value = row[excelCol];
        transformed[dbField] = transformValue(value, config.typeConversions[dbField]);
      }

      // 2. Apply Default Values
      for (const [field, defaultVal] of Object.entries(config.defaultValues)) {
        if (transformed[field] === undefined || transformed[field] === null || transformed[field] === '') {
          transformed[field] = defaultVal;
        }
      }

      // 3. Generate Batch Number
      let batchNumber = transformed.batch_number as string;
      if (!batchNumber) {
        batchNumber = generateBatchNumber(transformed, config.batchGeneration, i);
        transformed.batch_number = batchNumber;
      }

      // 4. Create/Get Batch
      if (!batchMap.has(batchNumber)) {
        const batch = createBatchRecord(transformed, batchNumber);
        batchMap.set(batchNumber, batch as any);
        batches.push(batch);
      }
      const batch = batchMap.get(batchNumber)!;
      const batchId = batch.id as string;

      // 5. Create Inspection Record
      // Determine stage based on file type
      const stage = config.fileType === 'assembly' ? 'assembly' :
                    config.fileType === 'visual' ? 'visual' :
                    config.fileType === 'integrity' ? 'integrity' : 'final'; // default

      const inspection = createInspectionRecord(transformed, batchId, stage);
      inspections.push(inspection);

      // 6. Handle Defects (Pivot Strategy vs Standard)
      if (config.pivot.active) {
        // PIVOT STRATEGY: Create defect records for each column in defectColumns
        for (const col of config.pivot.defectColumns) {
          const rawVal = row[col];
          const qty = Number(transformValue(rawVal, 'number'));
          
          if (qty > 0) {
            // Create defect record
            const defect = createDefectRecord(
              {
                defect_type: col, // Column name becomes defect type (e.g. "COAG")
                rejected_quantity: qty,
                inspection_date: transformed.production_date
              },
              inspection.id,
              batchId
            );
            defects.push(defect);
            
            // Add to batch totals
            batch.rejected_quantity = (batch.rejected_quantity || 0) + qty;
            
            // Update inspection totals if not explicitly provided
            if (!transformed.failed_quantity) {
               inspection.failed_quantity = (inspection.failed_quantity as number) + qty;
            }
          }
        }
      } else {
        // STANDARD STRATEGY: Single defect type column
        if (transformed.rejected_quantity && Number(transformed.rejected_quantity) > 0) {
           const defect = createDefectRecord(transformed, inspection.id, batchId);
           defects.push(defect);
           
           batch.rejected_quantity = (batch.rejected_quantity || 0) + (defect.quantity as number);
        }
      }

      // Update batch production qty if available
      if (transformed.produced_quantity) {
         // For cumulative, we take the max seen. For daily reports, we sum.
         // Assuming daily reports here for safety:
         batch.produced_quantity = Math.max(
            batch.produced_quantity || 0, 
            (transformed.produced_quantity as number) || 0
         ); 
         // If it's assembly/visual, we might want to sum inspected_quantity
         if (config.fileType === 'assembly') {
            // In assembly, visual_qty is often the production input for that day
            batch.produced_quantity = (batch.produced_quantity || 0) + (inspection.inspected_quantity as number || 0);
         }
      }

      // Recalculate risk level
      updateBatchRisk(batch);

    } catch (error) {
      errors.push(`Row ${rowNum}: ${error instanceof Error ? error.message : 'Error'}`);
    }
  }

  return { batches, inspections, defects, warnings, errors };
}

// Helper functions (reused/adapted)

function transformValue(value: unknown, targetType?: string): unknown {
  if (value === undefined || value === null || value === '') return undefined;
  
  if (targetType === 'number') {
    if (typeof value === 'number') return value;
    const str = String(value).replace(/,/g, '');
    const num = parseFloat(str);
    return isNaN(num) ? 0 : num;
  }
  
  if (targetType === 'date') {
    // Handle Excel serial dates
    if (typeof value === 'number' && value > 20000) {
      const date = new Date(Math.round((value - 25569) * 86400 * 1000));
      return date.toISOString().split('T')[0];
    }
    // Handle strings
    const date = new Date(String(value));
    if (!isNaN(date.getTime())) return date.toISOString().split('T')[0];
    return new Date().toISOString().split('T')[0]; // Fallback
  }
  
  return String(value).trim();
}

function generateBatchNumber(
  transformed: Record<string, unknown>,
  strategy: BatchGenerationStrategy,
  rowIndex: number
): string {
  if (strategy.type === 'date_based') {
    const date = transformed.production_date || new Date().toISOString().split('T')[0];
    const dateStr = String(date).replace(/-/g, '');
    return `BATCH-${dateStr}`; // Simple daily batch ID
  }
  return `AUTO-${uuidv4().slice(0, 8)}`;
}

function createBatchRecord(transformed: Record<string, unknown>, batchNumber: string) {
  return {
    id: uuidv4(),
    batch_number: batchNumber,
    production_date: transformed.production_date || new Date().toISOString().split('T')[0],
    product_code: transformed.product_code || null,
    planned_quantity: transformed.planned_quantity || 0,
    produced_quantity: transformed.produced_quantity || 0,
    rejected_quantity: 0, 
    status: 'in_progress',
    risk_level: 'normal'
  };
}

function createInspectionRecord(transformed: Record<string, unknown>, batchId: string, stage: string) {
  const inspected = (transformed.inspected_quantity as number) || (transformed.produced_quantity as number) || 0;
  const rejected = (transformed.rejected_quantity as number) || 0;
  
  return {
    id: uuidv4(),
    batch_id: batchId,
    inspection_stage: stage,
    inspector_name: transformed.inspector_name || null,
    inspected_quantity: inspected,
    passed_quantity: Math.max(0, inspected - rejected),
    failed_quantity: rejected,
    inspection_date: transformed.production_date || new Date().toISOString().split('T')[0]
  };
}

function createDefectRecord(transformed: Record<string, unknown>, inspectionId: string, batchId: string) {
  const type = String(transformed.defect_type || 'Unknown');
  return {
    id: uuidv4(),
    inspection_id: inspectionId,
    batch_id: batchId,
    defect_type: type,
    defect_category: categorizeDefect(type),
    quantity: transformed.rejected_quantity || 1,
    severity: 'minor',
    detected_at: transformed.inspection_date || new Date().toISOString().split('T')[0]
  };
}

function categorizeDefect(type: string): string {
  const t = type.toLowerCase();
  if (t.includes('visual') || t.includes('mark') || t.includes('stain') || t.includes('scratch') || t.includes('dirty')) return 'visual';
  if (t.includes('dimension') || t.includes('size') || t.includes('length')) return 'dimensional';
  if (t.includes('leak') || t.includes('burst') || t.includes('hole')) return 'functional';
  if (t.includes('material') || t.includes('particle') || t.includes('insect')) return 'material';
  return 'other';
}

function updateBatchRisk(batch: any) {
  const rate = batch.produced_quantity > 0 
    ? (batch.rejected_quantity / batch.produced_quantity) * 100 
    : 0;
    
  if (rate >= 15) batch.risk_level = 'high_risk';
  else if (rate >= 8) batch.risk_level = 'watch';
  else batch.risk_level = 'normal';
}
