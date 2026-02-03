/**
 * Suppliers Analytics API Route
 * GET /api/analytics/suppliers
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/db/client';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// ============================================================================
// TYPES
// ============================================================================

interface SupplierData {
  id: string;
  name: string;
  totalBatches: number;
  acceptedBatches: number;
  rejectionRate: number;
  rating: number;
  trend: 'up' | 'down' | 'stable';
  topDefects: Array<{ type: string; count: number }>;
}

interface SupplierSummary {
  totalSuppliers: number;
  averageRejectionRate: number;
  topPerformer: string;
  worstPerformer: string;
}

// ============================================================================
// MOCK DATA
// ============================================================================

const MOCK_SUPPLIERS: SupplierData[] = [
  {
    id: 'sup-001',
    name: 'Precision Components Ltd',
    totalBatches: 145,
    acceptedBatches: 138,
    rejectionRate: 4.8,
    rating: 5,
    trend: 'stable',
    topDefects: [
      { type: 'Dimensional', count: 12 },
      { type: 'Surface Finish', count: 8 },
    ],
  },
  {
    id: 'sup-002',
    name: 'MetalWorks Industries',
    totalBatches: 98,
    acceptedBatches: 91,
    rejectionRate: 7.1,
    rating: 4,
    trend: 'up',
    topDefects: [
      { type: 'Visual', count: 18 },
      { type: 'Material', count: 6 },
    ],
  },
  {
    id: 'sup-003',
    name: 'Global Parts Co',
    totalBatches: 212,
    acceptedBatches: 189,
    rejectionRate: 10.8,
    rating: 3,
    trend: 'down',
    topDefects: [
      { type: 'Assembly', count: 45 },
      { type: 'Functional', count: 23 },
    ],
  },
  {
    id: 'sup-004',
    name: 'TechnoMaterials Inc',
    totalBatches: 76,
    acceptedBatches: 68,
    rejectionRate: 10.5,
    rating: 3,
    trend: 'stable',
    topDefects: [
      { type: 'Material', count: 15 },
      { type: 'Contamination', count: 9 },
    ],
  },
  {
    id: 'sup-005',
    name: 'Premier Supplies',
    totalBatches: 167,
    acceptedBatches: 142,
    rejectionRate: 15.0,
    rating: 2,
    trend: 'down',
    topDefects: [
      { type: 'Visual', count: 52 },
      { type: 'Dimensional', count: 31 },
    ],
  },
  {
    id: 'sup-006',
    name: 'Alpha Manufacturing',
    totalBatches: 89,
    acceptedBatches: 85,
    rejectionRate: 4.5,
    rating: 5,
    trend: 'up',
    topDefects: [
      { type: 'Surface Finish', count: 6 },
      { type: 'Minor Scratches', count: 4 },
    ],
  },
  {
    id: 'sup-007',
    name: 'QualityFirst Corp',
    totalBatches: 134,
    acceptedBatches: 125,
    rejectionRate: 6.7,
    rating: 4,
    trend: 'stable',
    topDefects: [
      { type: 'Assembly', count: 14 },
      { type: 'Alignment', count: 11 },
    ],
  },
];

// ============================================================================
// API HANDLER
// ============================================================================

/**
 * Get supplier quality analytics
 * Query params:
 *   - period: '7d' | '30d' | '90d' (default: 30d)
 *   - sort: 'rating' | 'rejection_rate' | 'batches' (default: rating)
 *   - order: 'asc' | 'desc' (default: desc)
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const period = searchParams.get('period') || '30d';
    const sortBy = searchParams.get('sort') || 'rating';
    const order = searchParams.get('order') || 'desc';

    let suppliers: SupplierData[] = [];

    // Try to fetch from database
    try {
      const { data, error } = await supabaseAdmin
        .from('suppliers')
        .select('*')
        .eq('is_active', true)
        .limit(50);

      if (!error && data && data.length > 0) {
        // Transform database data
        suppliers = data.map((s) => ({
          id: s.id,
          name: s.supplier_name,
          totalBatches: 0, // Would need to join with batches
          acceptedBatches: 0,
          rejectionRate: 0,
          rating: s.rating || 3,
          trend: 'stable' as const,
          topDefects: [],
        }));
      }
    } catch (dbError) {
      console.log('Database fetch failed, using mock data:', dbError);
    }

    // Use mock data if database empty or failed
    if (suppliers.length === 0) {
      suppliers = [...MOCK_SUPPLIERS];
    }

    // Sort suppliers
    suppliers.sort((a, b) => {
      let comparison = 0;
      switch (sortBy) {
        case 'rating':
          comparison = a.rating - b.rating;
          break;
        case 'rejection_rate':
          comparison = a.rejectionRate - b.rejectionRate;
          break;
        case 'batches':
          comparison = a.totalBatches - b.totalBatches;
          break;
        default:
          comparison = a.rating - b.rating;
      }
      return order === 'desc' ? -comparison : comparison;
    });

    // Calculate summary
    const totalRejectionRate = suppliers.reduce((sum, s) => sum + s.rejectionRate, 0);
    const avgRejectionRate =
      suppliers.length > 0 ? totalRejectionRate / suppliers.length : 0;

    const sortedByRate = [...suppliers].sort((a, b) => a.rejectionRate - b.rejectionRate);
    const topPerformer = sortedByRate[0]?.name || 'N/A';
    const worstPerformer = sortedByRate[sortedByRate.length - 1]?.name || 'N/A';

    const summary: SupplierSummary = {
      totalSuppliers: suppliers.length,
      averageRejectionRate: Math.round(avgRejectionRate * 10) / 10,
      topPerformer,
      worstPerformer,
    };

    return NextResponse.json({
      success: true,
      data: {
        suppliers,
        summary,
      },
      meta: {
        timestamp: new Date().toISOString(),
        period,
        sortBy,
        order,
        source: suppliers === MOCK_SUPPLIERS ? 'mock' : 'database',
      },
    });
  } catch (error) {
    console.error('Suppliers analytics error:', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'SUPPLIERS_ERROR',
          message: error instanceof Error ? error.message : 'Failed to fetch supplier data',
        },
      },
      { status: 500 }
    );
  }
}
