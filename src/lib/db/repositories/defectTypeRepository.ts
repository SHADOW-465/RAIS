import { supabaseAdmin } from '../supabaseClient';
import { DefectType } from '../types';

export class DefectTypeRepository {
  async getAll(): Promise<DefectType[]> {
    const { data, error } = await supabaseAdmin
      .from('defect_types')
      .select('*')
      .order('name');
    
    if (error) throw error;
    return (data || []).map(row => this.mapRowToDefectType(row));
  }

  async getById(id: number): Promise<DefectType | null> {
    const { data, error } = await supabaseAdmin
      .from('defect_types')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) {
      if (error.code === 'PGRST116') return null; // Not found
      throw error;
    }
    return data ? this.mapRowToDefectType(data) : null;
  }

  async getByCode(code: string): Promise<DefectType | null> {
    const { data, error } = await supabaseAdmin
      .from('defect_types')
      .select('*')
      .eq('code', code.toUpperCase())
      .single();
    
    if (error) {
      if (error.code === 'PGRST116') return null; // Not found
      throw error;
    }
    return data ? this.mapRowToDefectType(data) : null;
  }

  async findByName(name: string): Promise<DefectType | null> {
    const normalized = name.toLowerCase().trim();
    
    // Try exact match first
    const { data: exactMatch, error: exactError } = await supabaseAdmin
      .from('defect_types')
      .select('*')
      .ilike('name', normalized)
      .single();
    
    if (exactMatch) {
      return this.mapRowToDefectType(exactMatch);
    }
    
    // Try contains match
    const { data: containsMatch, error: containsError } = await supabaseAdmin
      .from('defect_types')
      .select('*')
      .ilike('name', `%${normalized}%`)
      .limit(1)
      .single();
    
    if (containsError && containsError.code !== 'PGRST116') throw containsError;
    return containsMatch ? this.mapRowToDefectType(containsMatch) : null;
  }

  async create(defectType: Partial<DefectType>): Promise<DefectType> {
    const { data, error } = await supabaseAdmin
      .from('defect_types')
      .insert({
        code: defectType.code?.toUpperCase(),
        name: defectType.name,
        category: defectType.category,
        severity: defectType.severity,
        description: defectType.description,
      })
      .select()
      .single();
    
    if (error) throw error;
    return this.mapRowToDefectType(data);
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
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    };
  }
}

export const defectTypeRepository = new DefectTypeRepository();
