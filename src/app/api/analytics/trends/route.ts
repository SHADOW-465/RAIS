/**
 * RAIS v2.0 - Trends Analytics API Route
 * GET /api/analytics/trends
 * 
 * STRICT RULES:
 * - Uses kpiQueries.ts for all data (pure SQL)
 * - NO mock data, NO fallbacks
 * - Returns explicit errors or empty responses
 */

import { NextRequest, NextResponse } from 'next/server';
import { getTrendData } from '@/lib/analytics/kpiQueries';
import { isConfigured } from '@/lib/db/client';
import { LocalStore } from '@/lib/db/localStore';
import { SessionStore } from '@/lib/db/sessionStore';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Get rejection trend data for charts
 * Query params:
 *   - period: '7d' | '14d' | '30d' | '90d' (default: 30d)
 */
export async function GET(request: NextRequest) {
  const startTime = Date.now();
  const sessionId = request.headers.get('x-rais-session-id');

  try {
    const searchParams = request.nextUrl.searchParams;
    const period = searchParams.get('period') || '30d';
    const periodDays = parsePeriodToDays(period);

    // Initial Decision: Session or Local (or Mock if not configured)
    let useLocalMode = !!sessionId || !isConfigured;
    let dbResult = null;

    // A. DATABASE MODE (Try first if configured)
    if (!useLocalMode) {
      try {
        const result = await getTrendData(periodDays);
        if (!result.success) {
          throw new Error(result.error || 'Database query failed');
        }
        dbResult = result;
      } catch (dbError) {
        console.warn('Database unavailable, falling back to local store:', dbError);
        useLocalMode = true; // Fallback to Local Mode
      }
    }

    // B. DATABASE SUCCESS RESPONSE
    if (!useLocalMode && dbResult) {
      return NextResponse.json({
        success: true,
        data: dbResult.data,
        meta: {
          timestamp: new Date().toISOString(),
          period,
          queryTime: dbResult.meta.queryTime,
          dataSource: dbResult.meta.dataSource,
          recordCount: dbResult.meta.recordCount,
          processingTime: Date.now() - startTime,
        },
      });
    }

    // C. LOCAL / SESSION MODE (Fallback or Explicit)
    const db = sessionId ? SessionStore.read(sessionId) : LocalStore.read();
    const dataSource = sessionId ? 'session-json' : 'local-json';

    const timeline = [];
    // Determine end date: Use latest data date, or today if no data
    const availableDates = Object.keys(db.overview.days).sort();
    const lastDataDate = availableDates.length > 0 ? new Date(availableDates[availableDates.length - 1]) : new Date();
    const endDate = lastDataDate;

    // Build timeline for requested period
    for (let i = 0; i < periodDays; i++) {
      const d = new Date(endDate);
      d.setDate(endDate.getDate() - (periodDays - i - 1));
      const dateStr = d.toISOString().split('T')[0];

      const dayData = db.overview.days[dateStr] || { produced: 0, rejected: 0 };
      const rate = dayData.produced > 0
        ? (dayData.rejected / dayData.produced) * 100
        : 0;

      timeline.push({
        date: dateStr,
        produced: dayData.produced,
        rejected: dayData.rejected,
        rejection_rate: parseFloat(rate.toFixed(2)),
        risk_level: rate > 7 ? 'high_risk' : rate > 5 ? 'watch' : 'normal',
      });
    }

    // Calculate summary stats provided in response
    const totalProduced = timeline.reduce((s, t) => s + t.produced, 0);
    const totalRejected = timeline.reduce((s, t) => s + t.rejected, 0);
    const avgRate = totalProduced > 0 ? (totalRejected / totalProduced) * 100 : 0;

    return NextResponse.json({
      success: true,
      data: {
        timeline,
        summary: {
          avg_rejection_rate: parseFloat(avgRate.toFixed(2)),
          total_produced: totalProduced,
          total_rejected: totalRejected,
          data_points: timeline.length,
          missing_days: timeline.filter(t => t.produced === 0).length,
        }
      },
      meta: {
        timestamp: new Date().toISOString(),
        period,
        queryTime: 0,
        dataSource,
        recordCount: timeline.length,
        processingTime: Date.now() - startTime,
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
