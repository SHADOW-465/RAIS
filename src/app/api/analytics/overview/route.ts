/**
 * RAIS v2.0 - Dashboard Analytics API Route
 * GET /api/analytics/overview
 * 
 * STRICT RULES:
 * - Uses kpiQueries.ts for all data (pure SQL)
 * - NO mock data, NO fallbacks
 * - Returns explicit errors or empty responses
 */

import { NextRequest, NextResponse } from 'next/server';
import { getOverviewKPIs } from '@/lib/analytics/kpiQueries';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Get dashboard overview KPIs
 * Query params:
 *   - period: '7d' | '30d' | '90d' (default: 30d)
 */
export async function GET(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    const searchParams = request.nextUrl.searchParams;
    const period = searchParams.get('period') || '30d';

    // Parse period to days
    const periodDays = parsePeriodToDays(period);

    // Get KPIs from new engine (pure SQL, no fallbacks)
    const result = await getOverviewKPIs(periodDays);

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'QUERY_ERROR',
            message: result.error || 'Failed to query KPIs',
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
        period,
        queryTime: result.meta.queryTime,
        dataSource: result.meta.dataSource,
        recordCount: result.meta.recordCount,
        processingTime: Date.now() - startTime,
      },
    });
  } catch (error) {
    console.error('Analytics overview error:', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'ANALYTICS_ERROR',
          message: error instanceof Error ? error.message : 'Failed to fetch analytics data',
        },
      },
      { status: 500 }
    );
  }
}

/**
 * Parse period string to number of days
 */
function parsePeriodToDays(period: string): number {
  const periodMap: Record<string, number> = {
    '7d': 7,
    '14d': 14,
    '30d': 30,
    '60d': 60,
    '90d': 90,
  };

  return periodMap[period] || 30;
}
