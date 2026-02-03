/**
 * Dashboard Analytics API Route
 * GET /api/analytics/overview
 */

import { NextRequest, NextResponse } from 'next/server';
import { calculateOverviewKPIs } from '@/lib/analytics/kpiEngine';
import { generateHealthSummary } from '@/lib/ai/gemini';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Get dashboard overview KPIs
 * Query params:
 *   - period: '7d' | '30d' | '90d' (default: 30d)
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const period = searchParams.get('period') || '30d';

    // Parse period to days
    const periodDays = parsePeriodToDays(period);

    // Calculate KPIs
    const kpis = await calculateOverviewKPIs(periodDays);

    // Generate AI health summary
    let aiSummary = null;
    try {
      aiSummary = await generateHealthSummary({
        rejectionRate: kpis.rejectionRate.current,
        trend: kpis.rejectionRate.trend,
        rejectedCount: kpis.rejectedUnits.current,
        highRiskBatches: kpis.highRiskBatches.batches,
        topDefect: { type: 'Visual Defects', percentage: 38 }, // TODO: Get from defect pareto
      });
    } catch (error) {
      console.error('Failed to generate AI summary:', error);
      // Continue without AI summary
    }

    return NextResponse.json({
      success: true,
      data: {
        ...kpis,
        aiSummary: aiSummary ? {
          text: aiSummary.insight_text,
          sentiment: aiSummary.sentiment,
          actionItems: aiSummary.action_items,
        } : null,
      },
      meta: {
        timestamp: new Date().toISOString(),
        period: period,
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
