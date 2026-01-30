import { supabaseAdmin } from '../supabaseClient';
import { ProductionLine } from '../types';

export class LineRepository {
  async getAll(): Promise<ProductionLine[]> {
    const { data, error } = await supabaseAdmin
      .from('production_lines')
      .select('*')
      .eq('active', true)
      .order('name');
    
    if (error) throw error;
    return (data || []).map(row => this.mapRowToLine(row));
  }

  async getById(id: number): Promise<ProductionLine | null> {
    const { data, error } = await supabaseAdmin
      .from('production_lines')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }
    return data ? this.mapRowToLine(data) : null;
  }

  async findByName(name: string): Promise<ProductionLine | null> {
    const normalized = name.toLowerCase().trim();
    
    // Try exact match
    const { data: exactMatch, error: exactError } = await supabaseAdmin
      .from('production_lines')
      .select('*')
      .ilike('name', normalized)
      .single();
    
    if (exactMatch) {
      return this.mapRowToLine(exactMatch);
    }
    
    // Try contains
    const { data: containsMatch, error: containsError } = await supabaseAdmin
      .from('production_lines')
      .select('*')
      .ilike('name', `%${normalized}%`)
      .limit(1)
      .single();
    
    if (containsError && containsError.code !== 'PGRST116') throw containsError;
    return containsMatch ? this.mapRowToLine(containsMatch) : null;
  }

  async create(line: Partial<ProductionLine>): Promise<ProductionLine> {
    const { data, error } = await supabaseAdmin
      .from('production_lines')
      .insert({
        name: line.name,
        department: line.department,
        factory_id: line.factoryId || 1,
        active: line.active ?? true,
      })
      .select()
      .single();
    
    if (error) throw error;
    return this.mapRowToLine(data);
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
      createdAt: new Date(row.created_at),
    };
  }
}

export const lineRepository = new LineRepository();
