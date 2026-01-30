import { pool } from '../connection';
import { RejectionRecord, AggregatedStats, TopDefectResult, DateRangeFilter, RejectionFilter } from '../types';

export class RejectionRepository {
  async getByDateRange(
    from: Date,
    to: Date,
    filters?: RejectionFilter
  ): Promise<RejectionRecord[]> {
    const query = `
      SELECT 
        rr.id,
        rr.timestamp,
        rr.line_id,
        pl.name as line_name,
        rr.shift_id,
        s.name as shift_name,
        rr.defect_type_id,
        dt.name as defect_name,
        rr.supplier_id,
        sup.name as supplier_name,
        rr.product_id,
        p.name as product_name,
        rr.quantity,
        rr.cost_per_unit,
        rr.total_cost,
        rr.reason,
        rr.operator_id,
        rr.uploaded_file_id,
        rr.created_at
      FROM rejection_records rr
      LEFT JOIN production_lines pl ON rr.line_id = pl.id
      LEFT JOIN shifts s ON rr.shift_id = s.id
      LEFT JOIN defect_types dt ON rr.defect_type_id = dt.id
      LEFT JOIN suppliers sup ON rr.supplier_id = sup.id
      LEFT JOIN products p ON rr.product_id = p.id
      WHERE rr.timestamp >= $1 AND rr.timestamp <= $2
      AND ($3::int[] IS NULL OR rr.line_id = ANY($3))
      AND ($4::int[] IS NULL OR rr.defect_type_id = ANY($4))
      AND ($5::int[] IS NULL OR rr.supplier_id = ANY($5))
      AND ($6::int[] IS NULL OR rr.shift_id = ANY($6))
      ORDER BY rr.timestamp DESC
    `;
    
    const result = await pool.query(query, [
      from, to, 
      filters?.lineIds || null,
      filters?.defectTypeIds || null,
      filters?.supplierIds || null,
      filters?.shiftIds || null
    ]);
    
    return result.rows.map(row => this.mapRowToRecord(row));
  }

  async getAggregatedStats(
    period: 'day' | 'week' | 'month',
    from: Date,
    to: Date,
    groupBy?: ('line' | 'defect' | 'supplier')[]
  ): Promise<AggregatedStats[]> {
    const bucketSize = period === 'day' ? '1 day' : period === 'week' ? '1 week' : '1 month';
    
    const selectFields: string[] = [`time_bucket($1, timestamp) as period`];
    const groupFields: string[] = ['period'];
    
    if (groupBy?.includes('line')) {
      selectFields.push('line_id');
      groupFields.push('line_id');
    }
    if (groupBy?.includes('defect')) {
      selectFields.push('defect_type_id');
      groupFields.push('defect_type_id');
    }
    if (groupBy?.includes('supplier')) {
      selectFields.push('supplier_id');
      groupFields.push('supplier_id');
    }
    
    const query = `
      SELECT 
        ${selectFields.join(', ')},
        COUNT(*) as record_count,
        SUM(quantity) as total_rejected,
        AVG(quantity) as avg_quantity,
        SUM(total_cost) as total_cost,
        MAX(quantity) as max_single_rejection
      FROM rejection_records
      WHERE timestamp >= $2 AND timestamp <= $3
      GROUP BY ${groupFields.join(', ')}
      ORDER BY period
    `;
    
    const result = await pool.query(query, [bucketSize, from, to]);
    return result.rows.map(row => this.mapRowToAggregatedStats(row));
  }

  async getTopDefects(
    from: Date,
    to: Date,
    limit: number = 10,
    filters?: RejectionFilter
  ): Promise<TopDefectResult[]> {
    const query = `
      SELECT 
        dt.id as defect_id,
        dt.name as defect_name,
        dt.code as defect_code,
        SUM(rr.quantity) as count,
        ROUND(100.0 * SUM(rr.quantity) / SUM(SUM(rr.quantity)) OVER (), 2) as percentage,
        pl.name as line_name
      FROM rejection_records rr
      JOIN defect_types dt ON rr.defect_type_id = dt.id
      LEFT JOIN production_lines pl ON rr.line_id = pl.id
      WHERE rr.timestamp >= $1 AND rr.timestamp <= $2
      AND ($3::int[] IS NULL OR rr.line_id = ANY($3))
      AND ($4::int[] IS NULL OR rr.supplier_id = ANY($4))
      GROUP BY dt.id, dt.name, dt.code, pl.name
      ORDER BY count DESC
      LIMIT $5
    `;
    
    const result = await pool.query(query, [
      from, to,
      filters?.lineIds || null,
      filters?.supplierIds || null,
      limit
    ]);
    
    return result.rows;
  }

  async getTotalRejected(
    from: Date,
    to: Date,
    filters?: RejectionFilter
  ): Promise<number> {
    const query = `
      SELECT SUM(quantity) as total
      FROM rejection_records
      WHERE timestamp >= $1 AND timestamp <= $2
      AND ($3::int[] IS NULL OR line_id = ANY($3))
      AND ($4::int[] IS NULL OR defect_type_id = ANY($4))
      AND ($5::int[] IS NULL OR supplier_id = ANY($5))
    `;
    
    const result = await pool.query(query, [
      from, to,
      filters?.lineIds || null,
      filters?.defectTypeIds || null,
      filters?.supplierIds || null
    ]);
    
    return parseInt(result.rows[0]?.total || '0', 10);
  }

  async bulkInsert(records: RejectionRecord[]): Promise<number> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      
      const query = `
        INSERT INTO rejection_records 
        (timestamp, line_id, shift_id, defect_type_id, supplier_id, product_id, quantity, cost_per_unit, reason, uploaded_file_id)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING id
      `;
      
      let inserted = 0;
      for (const record of records) {
        await client.query(query, [
          record.timestamp,
          record.lineId,
          record.shiftId,
          record.defectTypeId,
          record.supplierId,
          record.productId,
          record.quantity,
          record.costPerUnit,
          record.reason,
          record.uploadedFileId,
        ]);
        inserted++;
      }
      
      await client.query('COMMIT');
      return inserted;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  private mapRowToRecord(row: any): RejectionRecord {
    return {
      id: row.id,
      timestamp: row.timestamp,
      lineId: row.line_id,
      lineName: row.line_name,
      shiftId: row.shift_id,
      shiftName: row.shift_name,
      defectTypeId: row.defect_type_id,
      defectName: row.defect_name,
      supplierId: row.supplier_id,
      supplierName: row.supplier_name,
      productId: row.product_id,
      productName: row.product_name,
      quantity: parseInt(row.quantity, 10),
      costPerUnit: row.cost_per_unit ? parseFloat(row.cost_per_unit) : undefined,
      totalCost: row.total_cost ? parseFloat(row.total_cost) : undefined,
      reason: row.reason,
      operatorId: row.operator_id,
      uploadedFileId: row.uploaded_file_id,
      createdAt: row.created_at,
    };
  }

  private mapRowToAggregatedStats(row: any): AggregatedStats {
    return {
      period: row.period,
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
