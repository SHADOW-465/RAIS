/**
 * AI Summarize API Route
 * GET /api/ai/summarize
 * 
 * Generates an AI health summary based on current system data.
 * Fetches data internally from KPI engine - no client payload needed.
 */

import { NextRequest, NextResponse } from 'next/server';
import { generateHealthSummary } from '@/lib/ai/gemini';
import { getOverviewKPIs, getTrendData, getParetoData } from '@/lib/analytics/kpiQueries';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Generate AI health summary
 * Query params:
 *   - period: '7d' | '30d' | '90d' (default: 30d)
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const period = searchParams.get('period') || '30d';
    const periodDays = parsePeriodToDays(period);

    // 1. Fetch all required data in parallel
    const [overviewResult, trendResult, paretoResult] = await Promise.all([
      getOverviewKPIs(periodDays),
      getTrendData(periodDays),
      getParetoData()
    ]);

    // Check for data fetch errors
    if (!overviewResult.success || !trendResult.success || !paretoResult.success) {
      throw new Error('Failed to fetch underlying KPI data for analysis');
    }

    const overview = overviewResult.data;
    const trend = trendResult.data;
    const pareto = paretoResult.data;

    // 2. Prepare data for AI
    if (!overview || !trend || !pareto) {
      return NextResponse.json({
        success: true,
        data: null, // No data to analyze
        message: 'Insufficient data for analysis'
      });
    }

    // Filter high risk days (rate > 15%)
    // Use trend timeline which has daily resolution
    const highRiskDays = trend.timeline
      .filter(d => d.risk_level === 'high_risk')
      .map(d => ({
        date: d.date,
        rejectionRate: d.rejection_rate,
        produced: d.produced
      }))
      .sort((a, b) => b.rejectionRate - a.rejectionRate) // Sort by severity
      .slice(0, 5); // Top 5

    // Get top defect
    const topDefectObj = pareto.defects[0];
    const topDefect = topDefectObj ? {
      type: topDefectObj.display_name || topDefectObj.defect_code,
      percentage: topDefectObj.percentage
    } : { type: 'None', percentage: 0 };

    // 3. Generate Insight
    const insight = await generateHealthSummary({
      rejectionRate: overview.rejection.rate,
      trend: overview.rejection.trend,
      rejectedCount: overview.volume.rejected,
      highRiskDays: highRiskDays,
      topDefect: topDefect,
    });

    return NextResponse.json({
      success: true,
      data: {
        text: insight.insight_text,
        sentiment: insight.sentiment,
        confidence: insight.confidence_score,
        actionItems: insight.action_items,
        generatedAt: insight.generated_at,
        expiresAt: insight.expires_at,
      },
      meta: {
        timestamp: new Date().toISOString(),
        cached: !!insight.last_accessed_at,
        period
      },
    });

  } catch (error) {
    console.error('AI Summarize error:', error);

    const errorMessage = error instanceof Error ? error.message : 'Failed to generate AI summary';
    const isApiKeyError = errorMessage.includes('API key');

    return NextResponse.json(
      {
        success: false,
        error: {
          code: isApiKeyError ? 'API_KEY_ERROR' : 'AI_ERROR',
          message: errorMessage,
        },
      },
      { status: isApiKeyError ? 503 : 500 }
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
