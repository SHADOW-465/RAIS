import { pool } from '../connection';
import { ProductionLine } from '../types';

export class LineRepository {
  async getAll(): Promise<ProductionLine[]> {
    const query = 'SELECT * FROM production_lines WHERE active = true ORDER BY name';
    const result = await pool.query(query);
    return result.rows.map(row => this.mapRowToLine(row));
  }

  async getById(id: number): Promise<ProductionLine | null> {
    const query = 'SELECT * FROM production_lines WHERE id = $1';
    const result = await pool.query(query, [id]);
    return result.rows[0] ? this.mapRowToLine(result.rows[0]) : null;
  }

  async findByName(name: string): Promise<ProductionLine | null> {
    const normalized = name.toLowerCase().trim();
    
    // Try exact match
    let query = 'SELECT * FROM production_lines WHERE LOWER(name) = $1';
    let result = await pool.query(query, [normalized]);
    
    if (result.rows[0]) {
      return this.mapRowToLine(result.rows[0]);
    }
    
    // Try contains
    query = 'SELECT * FROM production_lines WHERE LOWER(name) LIKE $1 LIMIT 1';
    result = await pool.query(query, [`%${normalized}%`]);
    
    return result.rows[0] ? this.mapRowToLine(result.rows[0]) : null;
  }

  async create(line: Partial<ProductionLine>): Promise<ProductionLine> {
    const query = `
      INSERT INTO production_lines (name, department, factory_id, active)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `;
    
    const result = await pool.query(query, [
      line.name,
      line.department,
      line.factoryId || 1,
      line.active ?? true,
    ]);
    
    return this.mapRowToLine(result.rows[0]);
  }

  async getOrCreate(name: string, department?: string): Promise<ProductionLine> {
    const existing = await this.findByName(name);
    if (existing) {
      return existing;
    }
    
    return this.create({ name, department });
  }

  private mapRowToLine(row: any): ProductionLine {
    return {
      id: row.id,
      name: row.name,
      department: row.department,
      factoryId: row.factory_id,
      active: row.active,
      createdAt: row.created_at,
    };
  }
}

export const lineRepository = new LineRepository();
