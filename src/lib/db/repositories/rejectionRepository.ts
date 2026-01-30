import { supabaseAdmin } from '../supabaseClient';
import { RejectionRecord, AggregatedStats, TopDefectResult, RejectionFilter } from '../types';

export class RejectionRepository {
  async getByDateRange(
    from: Date,
    to: Date,
    filters?: RejectionFilter
  ): Promise<RejectionRecord[]> {
    // Build the query with joins
    let query = supabaseAdmin
      .from('rejection_records')
      .select(`
        id,
        timestamp,
        line_id,
        line:production_lines(name),
        shift_id,
        shift:shifts(name),
        defect_type_id,
        defect:defect_types(name),
        supplier_id,
        supplier:suppliers(name),
        product_id,
        product:products(name),
        quantity,
        cost_per_unit,
        total_cost,
        reason,
        operator_id,
        uploaded_file_id,
        created_at
      `)
      .gte('timestamp', from.toISOString())
      .lte('timestamp', to.toISOString())
      .order('timestamp', { ascending: false });

    // Apply filters
    if (filters?.lineIds && filters.lineIds.length > 0) {
      query = query.in('line_id', filters.lineIds);
    }
    if (filters?.defectTypeIds && filters.defectTypeIds.length > 0) {
      query = query.in('defect_type_id', filters.defectTypeIds);
    }
    if (filters?.supplierIds && filters.supplierIds.length > 0) {
      query = query.in('supplier_id', filters.supplierIds);
    }
    if (filters?.shiftIds && filters.shiftIds.length > 0) {
      query = query.in('shift_id', filters.shiftIds);
    }

    const { data, error } = await query;
    
    if (error) throw error;
    return (data || []).map((row: any) => this.mapRowToRecord(row));
  }

  async getAggregatedStats(
    period: 'day' | 'week' | 'month',
    from: Date,
    to: Date,
    groupBy?: ('line' | 'defect' | 'supplier')[]
  ): Promise<AggregatedStats[]> {
    // Try using RPC for time_bucket aggregation
    const bucketSize = period === 'day' ? '1 day' : period === 'week' ? '1 week' : '1 month';
    
    const { data, error } = await supabaseAdmin.rpc('get_aggregated_stats', {
      bucket_size: bucketSize,
      from_date: from.toISOString(),
      to_date: to.toISOString(),
      group_by_line: groupBy?.includes('line') ?? false,
      group_by_defect: groupBy?.includes('defect') ?? false,
      group_by_supplier: groupBy?.includes('supplier') ?? false,
    });

    if (error) {
      // Fallback: fetch records and aggregate in application layer
      return this.getAggregatedStatsFallback(period, from, to, groupBy);
    }

    return (data || []).map((row: any) => this.mapRowToAggregatedStats(row));
  }

  private async getAggregatedStatsFallback(
    period: 'day' | 'week' | 'month',
    from: Date,
    to: Date,
    groupBy?: ('line' | 'defect' | 'supplier')[]
  ): Promise<AggregatedStats[]> {
    // Fetch all records in range
    const { data: records, error } = await supabaseAdmin
      .from('rejection_records')
      .select('*')
      .gte('timestamp', from.toISOString())
      .lte('timestamp', to.toISOString());

    if (error) throw error;

    // Group records by time bucket and optional dimensions
    const bucketMap = new Map<string, any>();
    
    for (const record of (records || [])) {
      const timestamp = new Date(record.timestamp);
      let bucketKey: string;
      
      // Create time bucket key
      if (period === 'day') {
        bucketKey = timestamp.toISOString().split('T')[0]; // YYYY-MM-DD
      } else if (period === 'week') {
        const weekStart = new Date(timestamp);
        weekStart.setDate(timestamp.getDate() - timestamp.getDay());
        bucketKey = weekStart.toISOString().split('T')[0];
      } else {
        bucketKey = `${timestamp.getFullYear()}-${String(timestamp.getMonth() + 1).padStart(2, '0')}`;
      }

      // Add group by dimensions
      if (groupBy?.includes('line')) {
        bucketKey += `|line:${record.line_id}`;
      }
      if (groupBy?.includes('defect')) {
        bucketKey += `|defect:${record.defect_type_id}`;
      }
      if (groupBy?.includes('supplier')) {
        bucketKey += `|supplier:${record.supplier_id}`;
      }

      if (!bucketMap.has(bucketKey)) {
        bucketMap.set(bucketKey, {
          period: bucketKey.split('|')[0],
          line_id: groupBy?.includes('line') ? record.line_id : undefined,
          defect_type_id: groupBy?.includes('defect') ? record.defect_type_id : undefined,
          supplier_id: groupBy?.includes('supplier') ? record.supplier_id : undefined,
          record_count: 0,
          total_rejected: 0,
          quantities: [],
          total_cost: 0,
          max_single_rejection: 0,
        });
      }

      const bucket = bucketMap.get(bucketKey);
      bucket.record_count++;
      bucket.total_rejected += record.quantity || 0;
      bucket.quantities.push(record.quantity || 0);
      bucket.total_cost += record.total_cost || 0;
      bucket.max_single_rejection = Math.max(bucket.max_single_rejection, record.quantity || 0);
    }

    // Calculate averages and return
    return Array.from(bucketMap.values()).map(bucket => ({
      period: new Date(bucket.period),
      lineId: bucket.line_id,
      defectTypeId: bucket.defect_type_id,
      supplierId: bucket.supplier_id,
      recordCount: bucket.record_count,
      totalRejected: bucket.total_rejected,
      avgQuantity: bucket.quantities.length > 0 
        ? bucket.quantities.reduce((a: number, b: number) => a + b, 0) / bucket.quantities.length 
        : 0,
      totalCost: bucket.total_cost,
      maxSingleRejection: bucket.max_single_rejection,
    }));
  }

  async getTopDefects(
    from: Date,
    to: Date,
    limit: number = 10,
    filters?: RejectionFilter
  ): Promise<TopDefectResult[]> {
    // Use RPC for complex aggregation with window functions
    const { data, error } = await supabaseAdmin.rpc('get_top_defects', {
      from_date: from.toISOString(),
      to_date: to.toISOString(),
      limit_count: limit,
      line_ids: filters?.lineIds || null,
      supplier_ids: filters?.supplierIds || null,
    });

    if (error) {
      // Fallback: fetch and calculate in application layer
      return this.getTopDefectsFallback(from, to, limit, filters);
    }

    return (data || []);
  }

  private async getTopDefectsFallback(
    from: Date,
    to: Date,
    limit: number = 10,
    filters?: RejectionFilter
  ): Promise<TopDefectResult[]> {
    // Fetch rejection records with defect info
    let query = supabaseAdmin
      .from('rejection_records')
      .select(`
        quantity,
        defect_type_id,
        defect:defect_types(id, name, code),
        line:production_lines(name)
      `)
      .gte('timestamp', from.toISOString())
      .lte('timestamp', to.toISOString());

    if (filters?.lineIds && filters.lineIds.length > 0) {
      query = query.in('line_id', filters.lineIds);
    }
    if (filters?.supplierIds && filters.supplierIds.length > 0) {
      query = query.in('supplier_id', filters.supplierIds);
    }

    const { data: records, error } = await query;
    if (error) throw error;

    // Aggregate by defect
    const defectMap = new Map<number, any>();
    let totalQuantity = 0;

    for (const record of (records || [])) {
      const defectId = record.defect_type_id;
      if (!defectId) continue;

      totalQuantity += record.quantity || 0;

      if (!defectMap.has(defectId)) {
        // Supabase returns foreign relations as arrays, get first element
        const defectData = Array.isArray(record.defect) ? record.defect[0] : record.defect;
        const lineData = Array.isArray(record.line) ? record.line[0] : record.line;
        
        defectMap.set(defectId, {
          defect_id: defectId,
          defect_name: defectData?.name || 'Unknown',
          defect_code: defectData?.code || '',
          count: 0,
          line_name: lineData?.name,
        });
      }

      const defect = defectMap.get(defectId);
      defect.count += record.quantity || 0;
    }

    // Calculate percentages and sort
    const results = Array.from(defectMap.values()).map(defect => ({
      ...defect,
      percentage: totalQuantity > 0 
        ? parseFloat(((defect.count / totalQuantity) * 100).toFixed(2))
        : 0,
    }));

    return results
      .sort((a, b) => b.count - a.count)
      .slice(0, limit);
  }

  async getTotalRejected(
    from: Date,
    to: Date,
    filters?: RejectionFilter
  ): Promise<number> {
    let query = supabaseAdmin
      .from('rejection_records')
      .select('quantity')
      .gte('timestamp', from.toISOString())
      .lte('timestamp', to.toISOString());

    if (filters?.lineIds && filters.lineIds.length > 0) {
      query = query.in('line_id', filters.lineIds);
    }
    if (filters?.defectTypeIds && filters.defectTypeIds.length > 0) {
      query = query.in('defect_type_id', filters.defectTypeIds);
    }
    if (filters?.supplierIds && filters.supplierIds.length > 0) {
      query = query.in('supplier_id', filters.supplierIds);
    }

    const { data, error } = await query;
    if (error) throw error;

    return (data || []).reduce((sum, record) => sum + (record.quantity || 0), 0);
  }

  async bulkInsert(records: RejectionRecord[]): Promise<number> {
    const recordsToInsert = records.map(record => ({
      timestamp: record.timestamp.toISOString(),
      line_id: record.lineId,
      shift_id: record.shiftId,
      defect_type_id: record.defectTypeId,
      supplier_id: record.supplierId,
      product_id: record.productId,
      quantity: record.quantity,
      cost_per_unit: record.costPerUnit,
      reason: record.reason,
      uploaded_file_id: record.uploadedFileId,
    }));

    // Insert in batches of 100
    const batchSize = 100;
    let inserted = 0;

    for (let i = 0; i < recordsToInsert.length; i += batchSize) {
      const batch = recordsToInsert.slice(i, i + batchSize);
      const { error } = await supabaseAdmin
        .from('rejection_records')
        .insert(batch);

      if (error) throw error;
      inserted += batch.length;
    }

    return inserted;
  }

  private mapRowToRecord(row: any): RejectionRecord {
    // Supabase returns foreign relations as arrays, get first element
    const line = Array.isArray(row.line) ? row.line[0] : row.line;
    const shift = Array.isArray(row.shift) ? row.shift[0] : row.shift;
    const defect = Array.isArray(row.defect) ? row.defect[0] : row.defect;
    const supplier = Array.isArray(row.supplier) ? row.supplier[0] : row.supplier;
    const product = Array.isArray(row.product) ? row.product[0] : row.product;
    
    return {
      id: row.id,
      timestamp: new Date(row.timestamp),
      lineId: row.line_id,
      lineName: line?.name,
      shiftId: row.shift_id,
      shiftName: shift?.name,
      defectTypeId: row.defect_type_id,
      defectName: defect?.name,
      supplierId: row.supplier_id,
      supplierName: supplier?.name,
      productId: row.product_id,
      productName: product?.name,
      quantity: parseInt(row.quantity, 10),
      costPerUnit: row.cost_per_unit ? parseFloat(row.cost_per_unit) : undefined,
      totalCost: row.total_cost ? parseFloat(row.total_cost) : undefined,
      reason: row.reason,
      operatorId: row.operator_id,
      uploadedFileId: row.uploaded_file_id,
      createdAt: new Date(row.created_at),
    };
  }

  private mapRowToAggregatedStats(row: any): AggregatedStats {
    return {
      period: new Date(row.period),
      lineId: row.line_id,
      defectTypeId: row.defect_type_id,
      supplierId: row.supplier_id,
      recordCount: parseInt(row.record_count, 10),
      totalRejected: parseInt(row.total_rejected, 10),
      avgQuantity: parseFloat(row.avg_quantity),
      totalCost: parseFloat(row.total_cost),
      maxSingleRejection: parseInt(row.max_single_rejection, 10),
    };
  }
}

export const rejectionRepository = new RejectionRepository();
