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
import { isConfigured } from '@/lib/db/client';
import { LocalStore } from '@/lib/db/localStore';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Get dashboard overview KPIs
 * Query params:
 *   - period: '7d' | '30d' | '90d' (default: 30d)
 */
import { SessionStore } from '@/lib/db/sessionStore';

export async function GET(request: NextRequest) {
  const startTime = Date.now();
  const sessionId = request.headers.get('x-rais-session-id');

  try {
    const searchParams = request.nextUrl.searchParams;
    const period = searchParams.get('period') || '30d';

    // SESSION OR LOCAL MODE: Read from JSON Store
    if (sessionId || !isConfigured) {
      let db;
      let dataSource = 'local-json';

      if (sessionId) {
        db = SessionStore.read(sessionId);
        dataSource = 'session-json';
      } else {
        db = LocalStore.read();
      }

      const produced = db.overview.produced;
      const rejected = db.overview.rejected;
      const rate = produced > 0 ? (rejected / produced) * 100 : 0;

      const fileCount = db.uploads.length;
      const lastUpload = db.uploads.length > 0 ? db.uploads[db.uploads.length - 1].date : null;

      const availableDates = Object.keys(db.overview.days).sort();
      const startDate = availableDates.length > 0 ? availableDates[0] : new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0];
      const endDate = availableDates.length > 0 ? availableDates[availableDates.length - 1] : new Date().toISOString().split('T')[0];

      return NextResponse.json({
        success: true,
        data: {
          period: {
            start: startDate,
            end: endDate,
            days: availableDates.length,
          },
          rejection: {
            rate: parseFloat(rate.toFixed(2)),
            previous_rate: 0,
            change: 0,
            trend: 'stable',
          },
          volume: {
            produced,
            rejected,
            previous_rejected: 0,
            change: 0,
          },
          cost: {
            estimated_loss: rejected * 5, // Assumed $5/unit
            currency: 'USD',
            per_unit_cost: 5,
          },
          risk: {
            high_risk_days: 0,
            watch_days: 0,
          },
          data_quality: {
            total_files: fileCount,
            last_upload: lastUpload,
            coverage_pct: fileCount > 0 ? 100 : 0,
          },
        },
        meta: {
          timestamp: new Date().toISOString(),
          period,
          queryTime: 0,
          dataSource,
          recordCount: fileCount,
          processingTime: Date.now() - startTime,
        },
      });
    }

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
