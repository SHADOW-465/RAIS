/**
 * AI Root Cause Analysis API Route
 * GET /api/ai/root-cause
 * 
 * Generates an AI root cause analysis for a specific defect.
 */

import { NextRequest, NextResponse } from 'next/server';
import { generateRootCauseAnalysis } from '@/lib/ai/gemini';
import { getParetoData, getStageAnalysis, getDefectTrend } from '@/lib/analytics/kpiQueries';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Generate AI root cause analysis
 * Query params:
 *   - defect: string (defect code, optional - defaults to top defect)
 *   - period: '30d' (default)
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const period = searchParams.get('period') || '30d';
    let defectCode = searchParams.get('defect');
    const periodDays = parsePeriodToDays(period);

    // 1. Fetch Pareto data to identify defect if not provided
    const paretoResult = await getParetoData();
    if (!paretoResult.success) throw new Error('Failed to fetch pareto data');

    if (!defectCode && paretoResult.data && paretoResult.data.defects.length > 0) {
      defectCode = paretoResult.data.defects[0].defect_code;
    }

    if (!defectCode) {
      return NextResponse.json({
        success: true,
        data: null,
        message: 'No defects found to analyze'
      });
    }

    // 2. Fetch specific data for this defect
    const [trendResult, stageResult] = await Promise.all([
      getDefectTrend(defectCode, periodDays),
      getStageAnalysis()
    ]);

    if (!trendResult.success || !stageResult.success) {
      throw new Error('Failed to fetch defect details');
    }

    const trend = trendResult.data || [];
    const stageResponse = stageResult.data;
    const stages = stageResponse ? stageResponse.stages : [];

    // 3. Prepare data for AI
    // Identify peak days
    const recentHighDefectDays = [...trend]
      .sort((a, b) => b.count - a.count)
      .slice(0, 5)
      .map(d => ({ date: d.date, quantity: d.count }));

    // Format stages
    const formattedStages = stages.map(s => ({
      stage: s.stage_name,
      defectCount: s.total_rejected // This is TOTAL rejected, not just this defect.
    }));

    // 4. Generate Insight
    const insight = await generateRootCauseAnalysis({
      defectType: defectCode,
      trend: trend,
      recentHighDefectDays: recentHighDefectDays,
      stages: formattedStages,
    });

    return NextResponse.json({
      success: true,
      data: {
        text: insight.insight_text,
        confidence: insight.confidence_score,
        actionItems: insight.action_items,
        generatedAt: insight.generated_at,
      },
      meta: {
        timestamp: new Date().toISOString(),
        cached: !!insight.last_accessed_at,
        defect: defectCode
      },
    });

  } catch (error) {
    console.error('AI Root Cause error:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Failed to generate analysis';
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

function parsePeriodToDays(period: string): number {
  const periodMap: Record<string, number> = {
    '7d': 7,
    '30d': 30,
    '90d': 90,
  };
  return periodMap[period] || 30;
}
