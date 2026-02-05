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
import { isConfigured } from '@/lib/db/client';
import { SessionStore } from '@/lib/db/sessionStore';
import { LocalStore } from '@/lib/db/localStore';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const sessionId = request.headers.get('x-rais-session-id');

  try {
    const searchParams = request.nextUrl.searchParams;
    const period = searchParams.get('period') || '30d';
    const periodDays = parsePeriodToDays(period);

    let overviewData;
    let trendData;
    let paretoData;

    // A. SESSION OR LOCAL MODE: Read from JSON Store
    if (sessionId || !isConfigured) {
      console.log(`[AI Summarize] Using JSON Store (Session: ${sessionId || 'none'}, Configured: ${isConfigured})`);
      let db;
      if (sessionId) {
        db = SessionStore.read(sessionId);
      } else {
        db = LocalStore.read();
      }

      // Calculate overview from JSON DB
      const produced = db.overview.produced;
      const rejected = db.overview.rejected;
      const rate = produced > 0 ? (rejected / produced) * 100 : 0;

      overviewData = {
        rejection: { rate, trend: 'stable' as const },
        volume: { rejected }
      };

      // Calculate trend from JSON DB (simplified)
      const timeline = Object.entries(db.overview.days).map(([date, day]) => ({
        date,
        rejection_rate: day.produced > 0 ? (day.rejected / day.produced) * 100 : 0,
        risk_level: (day.produced > 0 && (day.rejected / day.produced) > 0.15) ? 'high_risk' : 'normal',
        produced: day.produced
      })).sort((a, b) => a.date.localeCompare(b.date));

      trendData = { timeline };

      // Calculate pareto from JSON DB
      const sortedDefects = Object.entries(db.defects)
        .map(([code, data]) => ({
          defect_code: code,
          display_name: code,
          total_quantity: data.count,
          percentage: (data.count / (rejected || 1)) * 100
        }))
        .sort((a, b) => b.total_quantity - a.total_quantity);

      paretoData = { defects: sortedDefects };
    }
    // B. DATABASE MODE: Query from Supabase
    else {
      // Fetch all required data in parallel
      const [overviewResult, trendResult, paretoResult] = await Promise.all([
        getOverviewKPIs(periodDays),
        getTrendData(periodDays),
        getParetoData()
      ]);

      // Check for data fetch errors
      if (!overviewResult.success || !trendResult.success || !paretoResult.success) {
        throw new Error('Failed to fetch underlying KPI data for analysis');
      }

      overviewData = overviewResult.data;
      trendData = trendResult.data;
      paretoData = paretoResult.data;
    }

    // 2. Prepare data for AI
    if (!overviewData || !trendData || !paretoData) {
      return NextResponse.json({
        success: true,
        data: null, // No data to analyze
        message: 'Insufficient data for analysis'
      });
    }

    // Filter high risk days (rate > 15%)
    const highRiskDays = trendData.timeline
      .filter((d: any) => d.risk_level === 'high_risk')
      .map((d: any) => ({
        date: d.date,
        rejectionRate: d.rejection_rate,
        produced: d.produced
      }))
      .sort((a: any, b: any) => b.rejectionRate - a.rejectionRate)
      .slice(0, 5);

    // Get top defect
    const topDefectObj = paretoData.defects[0];
    const topDefect = topDefectObj ? {
      type: (topDefectObj as any).display_name || (topDefectObj as any).defect_code,
      percentage: (topDefectObj as any).percentage
    } : { type: 'None', percentage: 0 };

    // 3. Generate Insight
    const insight = await generateHealthSummary({
      rejectionRate: (overviewData as any).rejection.rate,
      trend: (overviewData as any).rejection.trend,
      rejectedCount: (overviewData as any).volume.rejected,
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
    // ... rest of error handling

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
