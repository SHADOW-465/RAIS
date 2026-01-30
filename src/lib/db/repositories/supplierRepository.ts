import { supabaseAdmin } from '../supabaseClient';
import { Supplier } from '../types';

export class SupplierRepository {
  async getAll(): Promise<Supplier[]> {
    const { data, error } = await supabaseAdmin
      .from('suppliers')
      .select('*')
      .order('name');
    
    if (error) throw error;
    return (data || []).map(row => this.mapRowToSupplier(row));
  }

  async getById(id: number): Promise<Supplier | null> {
    const { data, error } = await supabaseAdmin
      .from('suppliers')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }
    return data ? this.mapRowToSupplier(data) : null;
  }

  async findByName(name: string): Promise<Supplier | null> {
    const normalized = name.toLowerCase().trim();
    
    const { data: exactMatch, error: exactError } = await supabaseAdmin
      .from('suppliers')
      .select('*')
      .ilike('name', normalized)
      .single();
    
    if (exactMatch) {
      return this.mapRowToSupplier(exactMatch);
    }
    
    const { data: containsMatch, error: containsError } = await supabaseAdmin
      .from('suppliers')
      .select('*')
      .ilike('name', `%${normalized}%`)
      .limit(1)
      .single();
    
    if (containsError && containsError.code !== 'PGRST116') throw containsError;
    return containsMatch ? this.mapRowToSupplier(containsMatch) : null;
  }

  async create(supplier: Partial<Supplier>): Promise<Supplier> {
    const { data, error } = await supabaseAdmin
      .from('suppliers')
      .insert({
        name: supplier.name,
        contact_email: supplier.contactEmail,
        quality_rating: supplier.qualityRating,
      })
      .select()
      .single();
    
    if (error) throw error;
    return this.mapRowToSupplier(data);
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
    // Using Supabase RPC for complex aggregation query
    const { data, error } = await supabaseAdmin.rpc('get_supplier_stats', {
      from_date: from.toISOString(),
      to_date: to.toISOString(),
    });
    
    if (error) {
      // Fallback: fetch and calculate in application layer if RPC not available
      return this.getStatsFallback(from, to);
    }
    
    return (data || []).map((row: any) => ({
      supplierId: row.supplier_id,
      supplierName: row.supplier_name,
      totalUnits: 0, // Would need production data
      totalRejections: parseInt(row.total_rejections, 10),
      rejectionRate: 0, // Would need production data
      contribution: parseFloat(row.contribution),
    }));
  }

  private async getStatsFallback(from: Date, to: Date): Promise<{
    supplierId: number;
    supplierName: string;
    totalUnits: number;
    totalRejections: number;
    rejectionRate: number;
    contribution: number;
  }[]> {
    // Fetch all suppliers and rejection records in date range
    const [{ data: suppliers }, { data: rejections }] = await Promise.all([
      supabaseAdmin.from('suppliers').select('*'),
      supabaseAdmin
        .from('rejection_records')
        .select('supplier_id, quantity')
        .gte('timestamp', from.toISOString())
        .lte('timestamp', to.toISOString()),
    ]);

    // Calculate stats in application layer
    const supplierMap = new Map(suppliers?.map(s => [s.id, s]) || []);
    const statsMap = new Map<number, { totalRejections: number }>();

    rejections?.forEach(r => {
      if (r.supplier_id) {
        const current = statsMap.get(r.supplier_id) || { totalRejections: 0 };
        current.totalRejections += r.quantity || 0;
        statsMap.set(r.supplier_id, current);
      }
    });

    const totalRejections = Array.from(statsMap.values()).reduce(
      (sum, s) => sum + s.totalRejections, 0
    );

    return Array.from(statsMap.entries())
      .filter(([_, stats]) => stats.totalRejections > 0)
      .map(([supplierId, stats]) => {
        const supplier = supplierMap.get(supplierId);
        return {
          supplierId,
          supplierName: supplier?.name || 'Unknown',
          totalUnits: 0,
          totalRejections: stats.totalRejections,
          rejectionRate: 0,
          contribution: totalRejections > 0 
            ? parseFloat(((stats.totalRejections / totalRejections) * 100).toFixed(2))
            : 0,
        };
      })
      .sort((a, b) => b.totalRejections - a.totalRejections);
  }

  private mapRowToSupplier(row: any): Supplier {
    return {
      id: row.id,
      name: row.name,
      contactEmail: row.contact_email,
      qualityRating: row.quality_rating,
      createdAt: new Date(row.created_at),
    };
  }
}

export const supplierRepository = new SupplierRepository();
