/**
 * RAIS v2.0 - Pareto Analysis API Route
 * GET /api/analytics/pareto
 * 
 * STRICT RULES:
 * - Uses kpiQueries.ts for all data (pure SQL)
 * - NO mock data, NO fallbacks
 * - Returns explicit errors or empty responses
 */

import { NextRequest, NextResponse } from 'next/server';
import { getParetoData } from '@/lib/analytics/kpiQueries';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Get Pareto analysis for defects (80/20 rule)
 * No query params needed - returns all defects ranked
 */
export async function GET(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    // Get Pareto data from new engine (pure SQL, no fallbacks)
    const result = await getParetoData();

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'QUERY_ERROR',
            message: result.error || 'Failed to query Pareto data',
          },
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: result.data,
      meta: {
        timestamp: new Date().toISOString(),
        queryTime: result.meta.queryTime,
        dataSource: result.meta.dataSource,
        recordCount: result.meta.recordCount,
        processingTime: Date.now() - startTime,
      },
    });
  } catch (error) {
    console.error('Pareto analytics error:', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'PARETO_ERROR',
          message: error instanceof Error ? error.message : 'Failed to fetch Pareto data',
        },
      },
      { status: 500 }
    );
  }
}
