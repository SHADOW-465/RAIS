/**
 * Batch Repository
 * Data access layer for batch operations
 */

import { supabaseAdmin } from '../client';
import type {
  Batch,
  BatchInsert,
  BatchUpdate,
  BatchFilters,
  BatchWithCalculations,
  BatchWithInspections,
  PaginationParams,
  PaginatedResponse,
  RiskLevel,
} from '../types';

// ============================================================================
// QUERY FUNCTIONS
// ============================================================================

/**
 * Get all batches with optional filtering and pagination
 */
export async function getBatches(
  filters?: BatchFilters,
  pagination?: PaginationParams
): Promise<PaginatedResponse<BatchWithCalculations>> {
  let query = supabaseAdmin
    .from('batches')
    .select('*', { count: 'exact' });

  // Apply filters
  if (filters?.status) {
    if (Array.isArray(filters.status)) {
      query = query.in('status', filters.status);
    } else {
      query = query.eq('status', filters.status);
    }
  }

  if (filters?.risk_level) {
    if (Array.isArray(filters.risk_level)) {
      query = query.in('risk_level', filters.risk_level);
    } else {
      query = query.eq('risk_level', filters.risk_level);
    }
  }

  if (filters?.product_code) {
    query = query.eq('product_code', filters.product_code);
  }

  if (filters?.date_from) {
    query = query.gte('production_date', filters.date_from);
  }

  if (filters?.date_to) {
    query = query.lte('production_date', filters.date_to);
  }

  if (filters?.search) {
    query = query.or(
      `batch_number.ilike.%${filters.search}%,product_name.ilike.%${filters.search}%`
    );
  }

  // Apply pagination
  const limit = pagination?.limit || 50;
  const offset = pagination?.offset || 0;
  const sortBy = pagination?.sort_by || 'production_date';
  const sortOrder = pagination?.sort_order || 'desc';

  query = query
    .order(sortBy, { ascending: sortOrder === 'asc' })
    .range(offset, offset + limit - 1);

  const { data, error, count } = await query;

  if (error) {
    throw new Error(`Failed to fetch batches: ${error.message}`);
  }

  // Calculate rejection rates
  const batchesWithCalculations: BatchWithCalculations[] = (data || []).map(batch => ({
    ...batch,
    rejection_rate: calculateRejectionRate(batch.produced_quantity, batch.rejected_quantity),
    days_in_production: calculateDaysInProduction(batch.production_date),
  }));

  return {
    data: batchesWithCalculations,
    total: count || 0,
    limit,
    offset,
    has_more: (count || 0) > offset + limit,
  };
}

/**
 * Get single batch by ID with full details
 */
export async function getBatchById(id: string): Promise<BatchWithInspections | null> {
  const { data: batch, error: batchError } = await supabaseAdmin
    .from('batches')
    .select('*')
    .eq('id', id)
    .single();

  if (batchError || !batch) {
    return null;
  }

  // Fetch related data
  const [inspections, defects, suppliers] = await Promise.all([
    getInspectionsByBatchId(id),
    getDefectsByBatchId(id),
    getSuppliersByBatchId(id),
  ]);

  return {
    ...batch,
    inspections: inspections || [],
    defects: defects || [],
    suppliers: suppliers || [],
  };
}

/**
 * Get batch by batch number
 */
export async function getBatchByNumber(batchNumber: string): Promise<Batch | null> {
  const { data, error } = await supabaseAdmin
    .from('batches')
    .select('*')
    .eq('batch_number', batchNumber)
    .single();

  if (error) {
    return null;
  }

  return data;
}

/**
 * Get high-risk batches
 */
export async function getHighRiskBatches(limit: number = 10): Promise<BatchWithCalculations[]> {
  const { data, error } = await supabaseAdmin
    .from('batches')
    .select('*')
    .in('risk_level', ['high_risk', 'watch'])
    .order('rejected_quantity', { ascending: false })
    .limit(limit);

  if (error) {
    throw new Error(`Failed to fetch high-risk batches: ${error.message}`);
  }

  return (data || []).map(batch => ({
    ...batch,
    rejection_rate: calculateRejectionRate(batch.produced_quantity, batch.rejected_quantity),
    days_in_production: calculateDaysInProduction(batch.production_date),
  }));
}

/**
 * Get batches by risk level
 */
export async function getBatchesByRiskLevel(
  riskLevel: RiskLevel,
  limit?: number
): Promise<Batch[]> {
  let query = supabaseAdmin
    .from('batches')
    .select('*')
    .eq('risk_level', riskLevel)
    .order('production_date', { ascending: false });

  if (limit) {
    query = query.limit(limit);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`Failed to fetch batches by risk level: ${error.message}`);
  }

  return data || [];
}

// ============================================================================
// CREATE/UPDATE/DELETE FUNCTIONS
// ============================================================================

/**
 * Create a new batch
 */
export async function createBatch(batch: BatchInsert): Promise<Batch> {
  const { data, error } = await supabaseAdmin
    .from('batches')
    .insert(batch)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create batch: ${error.message}`);
  }

  return data;
}

/**
 * Update batch
 */
export async function updateBatch(id: string, updates: BatchUpdate): Promise<Batch> {
  const { data, error } = await supabaseAdmin
    .from('batches')
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to update batch: ${error.message}`);
  }

  return data;
}

/**
 * Update batch quantities (will trigger risk level recalculation)
 */
export async function updateBatchQuantities(
  id: string,
  produced: number,
  rejected: number
): Promise<Batch> {
  return updateBatch(id, {
    produced_quantity: produced,
    rejected_quantity: rejected,
  });
}

/**
 * Mark batch as completed
 */
export async function completeBatch(id: string): Promise<Batch> {
  return updateBatch(id, {
    status: 'completed',
    completion_date: new Date().toISOString().split('T')[0],
  });
}

/**
 * Mark batch as scrapped
 */
export async function scrapBatch(id: string, reason?: string): Promise<Batch> {
  return updateBatch(id, {
    status: 'scrapped',
    notes: reason || 'Batch scrapped due to high rejection rate',
  });
}

/**
 * Delete batch (cascade deletes inspections and defects)
 */
export async function deleteBatch(id: string): Promise<void> {
  const { error } = await supabaseAdmin
    .from('batches')
    .delete()
    .eq('id', id);

  if (error) {
    throw new Error(`Failed to delete batch: ${error.message}`);
  }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get inspections for a batch
 */
async function getInspectionsByBatchId(batchId: string) {
  const { data, error } = await supabaseAdmin
    .from('inspection_records')
    .select('*')
    .eq('batch_id', batchId)
    .order('inspection_date', { ascending: true });

  if (error) {
    console.error('Failed to fetch inspections:', error);
    return [];
  }

  return data;
}

/**
 * Get defects for a batch
 */
async function getDefectsByBatchId(batchId: string) {
  const { data, error } = await supabaseAdmin
    .from('defects')
    .select('*')
    .eq('batch_id', batchId)
    .order('quantity', { ascending: false });

  if (error) {
    console.error('Failed to fetch defects:', error);
    return [];
  }

  return data;
}

/**
 * Get suppliers for a batch
 */
async function getSuppliersByBatchId(batchId: string) {
  const { data, error } = await supabaseAdmin
    .from('batch_suppliers')
    .select('*, supplier:suppliers(*)')
    .eq('batch_id', batchId);

  if (error) {
    console.error('Failed to fetch suppliers:', error);
    return [];
  }

  return data;
}

/**
 * Calculate rejection rate percentage
 */
function calculateRejectionRate(produced: number, rejected: number): number {
  if (produced === 0) return 0;
  return Math.round((rejected / produced) * 100 * 100) / 100; // Round to 2 decimals
}

/**
 * Calculate days since production started
 */
function calculateDaysInProduction(productionDate: string): number {
  const today = new Date();
  const prodDate = new Date(productionDate);
  const diffTime = Math.abs(today.getTime() - prodDate.getTime());
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

// ============================================================================
// STATISTICS FUNCTIONS
// ============================================================================

/**
 * Get batch statistics for a date range
 */
export async function getBatchStatistics(dateFrom: string, dateTo: string) {
  const { data, error } = await supabaseAdmin
    .from('batches')
    .select('produced_quantity, rejected_quantity, status, risk_level')
    .gte('production_date', dateFrom)
    .lte('production_date', dateTo);

  if (error) {
    throw new Error(`Failed to fetch batch statistics: ${error.message}`);
  }

  const batches = data || [];

  return {
    total_batches: batches.length,
    total_produced: batches.reduce((sum, b) => sum + b.produced_quantity, 0),
    total_rejected: batches.reduce((sum, b) => sum + b.rejected_quantity, 0),
    avg_rejection_rate: calculateRejectionRate(
      batches.reduce((sum, b) => sum + b.produced_quantity, 0),
      batches.reduce((sum, b) => sum + b.rejected_quantity, 0)
    ),
    high_risk_count: batches.filter(b => b.risk_level === 'high_risk').length,
    watch_count: batches.filter(b => b.risk_level === 'watch').length,
    scrapped_count: batches.filter(b => b.status === 'scrapped').length,
  };
}

/**
 * Get batches grouped by product
 */
export async function getBatchesByProduct() {
  const { data, error } = await supabaseAdmin
    .from('batches')
    .select('product_code, product_name, produced_quantity, rejected_quantity')
    .order('product_code');

  if (error) {
    throw new Error(`Failed to fetch batches by product: ${error.message}`);
  }

  const grouped = (data || []).reduce((acc, batch) => {
    const key = batch.product_code || 'unknown';
    if (!acc[key]) {
      acc[key] = {
        product_code: batch.product_code,
        product_name: batch.product_name,
        batch_count: 0,
        total_produced: 0,
        total_rejected: 0,
      };
    }
    acc[key].batch_count++;
    acc[key].total_produced += batch.produced_quantity;
    acc[key].total_rejected += batch.rejected_quantity;
    return acc;
  }, {} as Record<string, {
    product_code: string | null;
    product_name: string | null;
    batch_count: number;
    total_produced: number;
    total_rejected: number;
  }>);

  return Object.values(grouped).map(product => ({
    ...product,
    rejection_rate: calculateRejectionRate(product.total_produced, product.total_rejected),
  }));
}
