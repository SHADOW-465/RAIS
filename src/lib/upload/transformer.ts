/**
 * Data Transformer
 * Transform Excel rows to database records
 */

import { v4 as uuidv4 } from 'uuid';
import type {
  Batch,
  InspectionRecord,
  Defect,
  FileType,
  InspectionStage,
  DefectSeverity,
  DefectCategory,
} from '../db/types';

// ============================================================================
// TYPES
// ============================================================================

export interface TransformResult {
  success: boolean;
  batches: Partial<Batch>[];
  inspections: Partial<InspectionRecord>[];
  defects: Partial<Defect>[];
  errors: string[];
  stats: {
    batchesCreated: number;
    inspectionsCreated: number;
    defectsCreated: number;
  };
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get column value with fuzzy matching
 */
function getValue(row: Record<string, unknown>, ...possibleColumns: string[]): unknown {
  for (const col of possibleColumns) {
    // Try exact match
    if (col in row) return row[col];

    // Try case-insensitive match
    const normalizedCol = col.toLowerCase().replace(/[_\-\s]/g, '');
    for (const [key, value] of Object.entries(row)) {
      const normalizedKey = key.toLowerCase().replace(/[_\-\s]/g, '');
      if (normalizedKey === normalizedCol) return value;
    }
  }
  return undefined;
}

/**
 * Safe string conversion
 */
function toStr(value: unknown): string | null {
  if (value === undefined || value === null || value === '') return null;
  return String(value).trim();
}

/**
 * Safe number conversion
 */
function toNum(value: unknown): number {
  if (value === undefined || value === null || value === '') return 0;
  const num = typeof value === 'number' ? value : Number(value);
  return isNaN(num) ? 0 : num;
}

/**
 * Parse date to ISO string
 */
function toDateStr(value: unknown): string {
  if (value instanceof Date) {
    return value.toISOString().split('T')[0];
  }
  if (typeof value === 'string') {
    const date = new Date(value);
    if (!isNaN(date.getTime())) {
      return date.toISOString().split('T')[0];
    }
  }
  // Default to today
  return new Date().toISOString().split('T')[0];
}

/**
 * Map string to inspection stage
 */
function toInspectionStage(value: unknown): InspectionStage {
  const str = String(value || '').toLowerCase();
  if (str.includes('visual')) return 'visual';
  if (str.includes('assembly')) return 'assembly';
  if (str.includes('integrity') || str.includes('test')) return 'integrity';
  if (str.includes('final')) return 'final';
  if (str.includes('pack')) return 'packaging';
  return 'visual'; // Default
}

/**
 * Map string to defect severity
 */
function toDefectSeverity(value: unknown): DefectSeverity {
  const str = String(value || '').toLowerCase();
  if (str.includes('critical') || str.includes('major')) return 'critical';
  if (str.includes('moderate') || str.includes('medium')) return 'major';
  return 'minor';
}

/**
 * Map string to defect category
 */
function toDefectCategory(value: unknown): DefectCategory {
  const str = String(value || '').toLowerCase();
  if (str.includes('visual') || str.includes('cosmetic') || str.includes('scratch')) return 'visual';
  if (str.includes('dimension') || str.includes('size') || str.includes('measurement'))
    return 'dimensional';
  if (str.includes('function') || str.includes('operation') || str.includes('performance'))
    return 'functional';
  if (str.includes('material') || str.includes('raw')) return 'material';
  return 'other';
}

// ============================================================================
// TRANSFORMERS BY FILE TYPE
// ============================================================================

/**
 * Transform Visual Inspection data
 */
function transformVisual(rows: Record<string, unknown>[]): TransformResult {
  const batchMap = new Map<string, Partial<Batch>>();
  const inspections: Partial<InspectionRecord>[] = [];
  const defects: Partial<Defect>[] = [];
  const errors: string[] = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const batchNumber = toStr(getValue(row, 'batch_number', 'batch_no', 'batch', 'lot_number'));

    if (!batchNumber) {
      errors.push(`Row ${i + 2}: Missing batch number`);
      continue;
    }

    // Create or update batch
    if (!batchMap.has(batchNumber)) {
      batchMap.set(batchNumber, {
        id: uuidv4(),
        batch_number: batchNumber,
        production_date: toDateStr(getValue(row, 'date', 'inspection_date', 'production_date')),
        status: 'in_progress',
        risk_level: 'normal',
        planned_quantity: 0,
        produced_quantity: 0,
        rejected_quantity: 0,
      });
    }

    const batch = batchMap.get(batchNumber)!;
    const inspectionId = uuidv4();

    // Create inspection record
    const defectCount = toNum(getValue(row, 'defect_count', 'count', 'qty', 'quantity', 'defects'));
    inspections.push({
      id: inspectionId,
      batch_id: batch.id,
      inspection_stage: 'visual',
      inspector_name: toStr(getValue(row, 'inspector', 'inspector_name', 'inspected_by')),
      inspected_quantity: defectCount,
      passed_quantity: 0,
      failed_quantity: defectCount,
      inspection_date: toDateStr(getValue(row, 'date', 'inspection_date')),
    });

    // Create defect record
    const defectType = toStr(getValue(row, 'defect_type', 'defect', 'type')) || 'Unknown';
    defects.push({
      id: uuidv4(),
      inspection_id: inspectionId,
      batch_id: batch.id,
      defect_type: defectType,
      defect_category: toDefectCategory(defectType),
      quantity: defectCount,
      severity: toDefectSeverity(getValue(row, 'severity')),
      detected_at: toDateStr(getValue(row, 'date', 'inspection_date')),
    });

    // Update batch rejected quantity
    batch.rejected_quantity = (batch.rejected_quantity || 0) + defectCount;
  }

  return {
    success: errors.length === 0,
    batches: Array.from(batchMap.values()),
    inspections,
    defects,
    errors,
    stats: {
      batchesCreated: batchMap.size,
      inspectionsCreated: inspections.length,
      defectsCreated: defects.length,
    },
  };
}

/**
 * Transform Assembly QC data
 */
function transformAssembly(rows: Record<string, unknown>[]): TransformResult {
  const batchMap = new Map<string, Partial<Batch>>();
  const inspections: Partial<InspectionRecord>[] = [];
  const errors: string[] = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const batchNumber = toStr(getValue(row, 'batch_number', 'batch_no', 'batch', 'lot_number'));

    if (!batchNumber) {
      errors.push(`Row ${i + 2}: Missing batch number`);
      continue;
    }

    // Create or update batch
    if (!batchMap.has(batchNumber)) {
      batchMap.set(batchNumber, {
        id: uuidv4(),
        batch_number: batchNumber,
        production_date: toDateStr(getValue(row, 'date', 'production_date')),
        status: 'in_progress',
        risk_level: 'normal',
        planned_quantity: 0,
        produced_quantity: 0,
        rejected_quantity: 0,
      });
    }

    const batch = batchMap.get(batchNumber)!;
    const passCount = toNum(getValue(row, 'pass_count', 'passed', 'pass', 'ok_count', 'ok'));
    const failCount = toNum(getValue(row, 'fail_count', 'failed', 'fail', 'ng_count', 'ng', 'reject'));
    const stage = toStr(getValue(row, 'stage', 'inspection_stage', 'assembly_stage')) || 'assembly';

    // Create inspection record
    inspections.push({
      id: uuidv4(),
      batch_id: batch.id,
      inspection_stage: toInspectionStage(stage),
      inspector_name: toStr(getValue(row, 'inspector', 'operator')),
      inspected_quantity: passCount + failCount,
      passed_quantity: passCount,
      failed_quantity: failCount,
      inspection_date: toDateStr(getValue(row, 'date', 'inspection_date')),
    });

    // Update batch quantities
    batch.produced_quantity = (batch.produced_quantity || 0) + passCount + failCount;
    batch.rejected_quantity = (batch.rejected_quantity || 0) + failCount;
  }

  return {
    success: errors.length === 0,
    batches: Array.from(batchMap.values()),
    inspections,
    defects: [],
    errors,
    stats: {
      batchesCreated: batchMap.size,
      inspectionsCreated: inspections.length,
      defectsCreated: 0,
    },
  };
}

/**
 * Transform Cumulative Production data
 */
function transformCumulative(rows: Record<string, unknown>[]): TransformResult {
  const batches: Partial<Batch>[] = [];
  const errors: string[] = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const batchNumber = toStr(getValue(row, 'batch_number', 'batch_no', 'batch', 'lot_number'));

    if (!batchNumber) {
      errors.push(`Row ${i + 2}: Missing batch number`);
      continue;
    }

    const producedQty = toNum(
      getValue(row, 'produced_quantity', 'total_produced', 'produced', 'qty_produced')
    );
    const rejectedQty = toNum(
      getValue(row, 'rejected_quantity', 'total_rejected', 'rejected', 'qty_rejected')
    );

    // Calculate risk level based on rejection rate
    const rejectionRate = producedQty > 0 ? (rejectedQty / producedQty) * 100 : 0;
    let riskLevel: 'normal' | 'watch' | 'high_risk' = 'normal';
    if (rejectionRate >= 15) riskLevel = 'high_risk';
    else if (rejectionRate >= 8) riskLevel = 'watch';

    batches.push({
      id: uuidv4(),
      batch_number: batchNumber,
      product_code: toStr(getValue(row, 'product_code', 'product', 'code')),
      product_name: toStr(getValue(row, 'product_name', 'name', 'description')),
      planned_quantity: producedQty, // Assume planned = produced if not specified
      produced_quantity: producedQty,
      rejected_quantity: rejectedQty,
      production_date: toDateStr(getValue(row, 'date', 'production_date')),
      status: 'completed',
      risk_level: riskLevel,
    });
  }

  return {
    success: errors.length === 0,
    batches,
    inspections: [],
    defects: [],
    errors,
    stats: {
      batchesCreated: batches.length,
      inspectionsCreated: 0,
      defectsCreated: 0,
    },
  };
}

/**
 * Transform Shopfloor/Material Incoming data
 * Note: This creates supplier-related data, handled separately
 */
function transformShopfloor(rows: Record<string, unknown>[]): TransformResult {
  // For now, return a simple result - full supplier integration would need more work
  const batches: Partial<Batch>[] = [];
  const errors: string[] = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const supplier = toStr(getValue(row, 'supplier', 'supplier_name', 'vendor'));
    const material = toStr(getValue(row, 'material', 'material_code', 'part_number'));

    if (!supplier || !material) {
      errors.push(`Row ${i + 2}: Missing supplier or material`);
      continue;
    }

    const quantity = toNum(getValue(row, 'quantity', 'qty', 'amount'));
    const accepted = toNum(getValue(row, 'accepted', 'accepted_qty'));
    const rejected = toNum(getValue(row, 'rejected', 'rejected_qty'));

    // Create a batch-like entry for tracking
    batches.push({
      id: uuidv4(),
      batch_number: `${supplier}-${material}-${Date.now()}`,
      product_code: material,
      product_name: `${supplier} - ${material}`,
      planned_quantity: quantity,
      produced_quantity: accepted + rejected || quantity,
      rejected_quantity: rejected,
      production_date: toDateStr(getValue(row, 'date', 'received_date')),
      status: 'completed',
      risk_level: 'normal',
    });
  }

  return {
    success: errors.length === 0,
    batches,
    inspections: [],
    defects: [],
    errors,
    stats: {
      batchesCreated: batches.length,
      inspectionsCreated: 0,
      defectsCreated: 0,
    },
  };
}

// ============================================================================
// MAIN TRANSFORM FUNCTION
// ============================================================================

/**
 * Transform Excel rows to database records based on file type
 * @param rows - Parsed Excel rows
 * @param fileType - Detected or specified file type
 * @returns TransformResult with database-ready records
 */
export async function transformData(
  rows: Record<string, unknown>[],
  fileType: FileType
): Promise<TransformResult> {
  if (rows.length === 0) {
    return {
      success: false,
      batches: [],
      inspections: [],
      defects: [],
      errors: ['No data rows to transform'],
      stats: { batchesCreated: 0, inspectionsCreated: 0, defectsCreated: 0 },
    };
  }

  switch (fileType) {
    case 'visual':
      return transformVisual(rows);
    case 'assembly':
      return transformAssembly(rows);
    case 'cumulative':
      return transformCumulative(rows);
    case 'shopfloor':
      return transformShopfloor(rows);
    case 'integrity':
      // Similar to assembly for now
      return transformAssembly(rows);
    default:
      return {
        success: false,
        batches: [],
        inspections: [],
        defects: [],
        errors: [`Unsupported file type: ${fileType}`],
        stats: { batchesCreated: 0, inspectionsCreated: 0, defectsCreated: 0 },
      };
  }
}
