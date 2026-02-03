/**
 * Pareto Analysis API Route
 * GET /api/analytics/pareto
 */

import { NextRequest, NextResponse } from 'next/server';
import { calculateParetoData } from '@/lib/analytics/kpiEngine';
import { generateRootCauseAnalysis } from '@/lib/ai/gemini';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Get Pareto analysis for defects (80/20 rule)
 * Query params:
 *   - period: '30d' | '60d' | '90d' (default: 30d)
 *   - defect_type: string (optional - for AI root cause analysis)
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const period = searchParams.get('period') || '30d';
    const defectType = searchParams.get('defect_type');

    // Parse period to days
    const periodDays = parsePeriodToDays(period);

    // Calculate Pareto data
    const paretoData = await calculateParetoData(periodDays);

    // Generate AI root cause analysis if defect type specified
    let rootCause = null;
    if (defectType && paretoData.defects.length > 0) {
      try {
        const defect = paretoData.defects.find(d => d.type === defectType);
        if (defect) {
          rootCause = await generateRootCauseAnalysis({
            defectType: defect.type,
            trend: [], // TODO: Get actual trend data
            affectedBatches: [], // TODO: Get actual affected batches
            suppliers: [], // TODO: Get supplier correlation
            stages: [], // TODO: Get stage breakdown
          });
        }
      } catch (error) {
        console.error('Failed to generate root cause analysis:', error);
        // Continue without AI analysis
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        ...paretoData,
        rootCause: rootCause ? {
          text: rootCause.insight_text,
          confidence: rootCause.confidence_score,
          actionItems: rootCause.action_items,
        } : null,
      },
      meta: {
        timestamp: new Date().toISOString(),
        period,
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

/**
 * Parse period string to number of days
 */
function parsePeriodToDays(period: string): number {
  const periodMap: Record<string, number> = {
    '30d': 30,
    '60d': 60,
    '90d': 90,
  };

  return periodMap[period] || 30;
}
