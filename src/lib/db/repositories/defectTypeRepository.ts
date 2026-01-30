import { pool } from '../connection';
import { DefectType } from '../types';

export class DefectTypeRepository {
  async getAll(): Promise<DefectType[]> {
    const query = 'SELECT * FROM defect_types ORDER BY name';
    const result = await pool.query(query);
    return result.rows.map(row => this.mapRowToDefectType(row));
  }

  async getById(id: number): Promise<DefectType | null> {
    const query = 'SELECT * FROM defect_types WHERE id = $1';
    const result = await pool.query(query, [id]);
    return result.rows[0] ? this.mapRowToDefectType(result.rows[0]) : null;
  }

  async getByCode(code: string): Promise<DefectType | null> {
    const query = 'SELECT * FROM defect_types WHERE code = $1';
    const result = await pool.query(query, [code.toUpperCase()]);
    return result.rows[0] ? this.mapRowToDefectType(result.rows[0]) : null;
  }

  async findByName(name: string): Promise<DefectType | null> {
    // Fuzzy matching - normalize the input
    const normalized = name.toLowerCase().trim();
    
    // Try exact match first
    let query = 'SELECT * FROM defect_types WHERE LOWER(name) = $1';
    let result = await pool.query(query, [normalized]);
    
    if (result.rows[0]) {
      return this.mapRowToDefectType(result.rows[0]);
    }
    
    // Try contains match
    query = 'SELECT * FROM defect_types WHERE LOWER(name) LIKE $1 LIMIT 1';
    result = await pool.query(query, [`%${normalized}%`]);
    
    if (result.rows[0]) {
      return this.mapRowToDefectType(result.rows[0]);
    }
    
    return null;
  }

  async create(defectType: Partial<DefectType>): Promise<DefectType> {
    const query = `
      INSERT INTO defect_types (code, name, category, severity, description)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `;
    
    const result = await pool.query(query, [
      defectType.code?.toUpperCase(),
      defectType.name,
      defectType.category,
      defectType.severity,
      defectType.description,
    ]);
    
    return this.mapRowToDefectType(result.rows[0]);
  }

  async getOrCreate(code: string, name: string): Promise<DefectType> {
    const existing = await this.getByCode(code);
    if (existing) {
      return existing;
    }
    
    return this.create({ code, name });
  }

  private mapRowToDefectType(row: any): DefectType {
    return {
      id: row.id,
      code: row.code,
      name: row.name,
      category: row.category,
      severity: row.severity,
      description: row.description,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}

export const defectTypeRepository = new DefectTypeRepository();
