/**
 * Trends Analytics API Route
 * GET /api/analytics/trends
 */

import { NextRequest, NextResponse } from 'next/server';
import { calculateTrendData, forecastRejectionRate } from '@/lib/analytics/kpiEngine';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Get rejection trend data for charts
 * Query params:
 *   - period: '7d' | '14d' | '30d' | '90d' (default: 30d)
 *   - granularity: 'daily' | 'weekly' (default: daily)
 *   - forecast: 'true' | 'false' (default: false)
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const period = searchParams.get('period') || '30d';
    const granularity = searchParams.get('granularity') as 'daily' | 'weekly' || 'daily';
    const includeForecast = searchParams.get('forecast') === 'true';

    // Parse period to days
    const periodDays = parsePeriodToDays(period);

    // Calculate trend data
    const trendData = await calculateTrendData(periodDays, granularity);

    // Calculate forecast if requested
    let forecast = null;
    if (includeForecast) {
      forecast = await forecastRejectionRate(periodDays, 7);
    }

    return NextResponse.json({
      success: true,
      data: {
        ...trendData,
        forecast: forecast || undefined,
      },
      meta: {
        timestamp: new Date().toISOString(),
        period,
        granularity,
      },
    });
  } catch (error) {
    console.error('Trends analytics error:', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'TRENDS_ERROR',
          message: error instanceof Error ? error.message : 'Failed to fetch trend data',
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
