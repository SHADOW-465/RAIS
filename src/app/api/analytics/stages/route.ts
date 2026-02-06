/**
 * RAIS v2.0 - Stage Analysis API Route
 * GET /api/analytics/stages
 * 
 * STRICT RULES:
 * - Uses kpiQueries.ts for all data (pure SQL)
 * - NO mock data, NO fallbacks
 * - Returns explicit errors or empty responses
 */

import { NextRequest, NextResponse } from 'next/server';
import { getStageAnalysis } from '@/lib/analytics/kpiQueries';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Get stage-wise rejection contribution analysis
 * Returns breakdown by inspection stage (SHOPFLOOR, ASSEMBLY, VISUAL, etc.)
 */
export async function GET(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    // Get stage analysis from new engine (pure SQL, no fallbacks)
    const result = await getStageAnalysis();

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'QUERY_ERROR',
            message: result.error || 'Failed to query stage data',
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
    console.error('Stage analytics error:', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'STAGE_ERROR',
          message: error instanceof Error ? error.message : 'Failed to fetch stage data',
        },
      },
      { status: 500 }
    );
  }
}
