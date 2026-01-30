import { pool } from '../connection';
import { Supplier } from '../types';

export class SupplierRepository {
  async getAll(): Promise<Supplier[]> {
    const query = 'SELECT * FROM suppliers ORDER BY name';
    const result = await pool.query(query);
    return result.rows.map(row => this.mapRowToSupplier(row));
  }

  async getById(id: number): Promise<Supplier | null> {
    const query = 'SELECT * FROM suppliers WHERE id = $1';
    const result = await pool.query(query, [id]);
    return result.rows[0] ? this.mapRowToSupplier(result.rows[0]) : null;
  }

  async findByName(name: string): Promise<Supplier | null> {
    const normalized = name.toLowerCase().trim();
    
    let query = 'SELECT * FROM suppliers WHERE LOWER(name) = $1';
    let result = await pool.query(query, [normalized]);
    
    if (result.rows[0]) {
      return this.mapRowToSupplier(result.rows[0]);
    }
    
    query = 'SELECT * FROM suppliers WHERE LOWER(name) LIKE $1 LIMIT 1';
    result = await pool.query(query, [`%${normalized}%`]);
    
    return result.rows[0] ? this.mapRowToSupplier(result.rows[0]) : null;
  }

  async create(supplier: Partial<Supplier>): Promise<Supplier> {
    const query = `
      INSERT INTO suppliers (name, contact_email, quality_rating)
      VALUES ($1, $2, $3)
      RETURNING *
    `;
    
    const result = await pool.query(query, [
      supplier.name,
      supplier.contactEmail,
      supplier.qualityRating,
    ]);
    
    return this.mapRowToSupplier(result.rows[0]);
  }

  async getOrCreate(name: string): Promise<Supplier> {
    const existing = await this.findByName(name);
    if (existing) {
      return existing;
    }
    
    return this.create({ name });
  }

  async getStats(from: Date, to: Date): Promise<{
    supplierId: number;
    supplierName: string;
    totalUnits: number;
    totalRejections: number;
    rejectionRate: number;
    contribution: number;
  }[]> {
    const query = `
      SELECT 
        s.id as supplier_id,
        s.name as supplier_name,
        COALESCE(SUM(rr.quantity), 0) as total_rejections,
        ROUND(100.0 * COALESCE(SUM(rr.quantity), 0) / NULLIF(SUM(SUM(rr.quantity)) OVER (), 0), 2) as contribution,
        0 as total_units  -- Placeholder, should come from production data
      FROM suppliers s
      LEFT JOIN rejection_records rr ON s.id = rr.supplier_id 
        AND rr.timestamp >= $1 AND rr.timestamp <= $2
      GROUP BY s.id, s.name
      HAVING COALESCE(SUM(rr.quantity), 0) > 0
      ORDER BY total_rejections DESC
    `;
    
    const result = await pool.query(query, [from, to]);
    
    // Calculate rejection rate (need production data for accurate calculation)
    return result.rows.map(row => ({
      supplierId: row.supplier_id,
      supplierName: row.supplier_name,
      totalUnits: 0, // Would need production data
      totalRejections: parseInt(row.total_rejections, 10),
      rejectionRate: 0, // Would need production data
      contribution: parseFloat(row.contribution),
    }));
  }

  private mapRowToSupplier(row: any): Supplier {
    return {
      id: row.id,
      name: row.name,
      contactEmail: row.contact_email,
      qualityRating: row.quality_rating,
      createdAt: row.created_at,
    };
  }
}

export const supplierRepository = new SupplierRepository();
