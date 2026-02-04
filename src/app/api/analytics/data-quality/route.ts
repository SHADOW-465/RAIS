/**
 * RAIS v2.0 - Data Quality API Route
 * GET /api/analytics/data-quality
 * 
 * STRICT RULES:
 * - Uses kpiQueries.ts for all data (pure SQL)
 * - NO mock data, NO fallbacks
 * - Returns explicit data availability status
 */

import { NextRequest, NextResponse } from 'next/server';
import { checkDataAvailability } from '@/lib/analytics/kpiQueries';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Check data availability and quality
 * Used by frontend to determine if dashboard has data to display
 */
export async function GET(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    // Get data availability status
    const status = await checkDataAvailability();

    return NextResponse.json({
      success: true,
      data: {
        hasData: status.hasData,
        counts: {
          productionDays: status.productionDays,
          stageDays: status.stageDays,
          defectRecords: status.defectRecords,
        },
        lastUpload: status.lastUpload,
        status: status.hasData ? 'ready' : 'empty',
        message: status.hasData 
          ? `Dashboard has ${status.productionDays} days of production data and ${status.defectRecords} defect records.`
          : 'No data available. Upload Excel files to populate the dashboard.',
      },
      meta: {
        timestamp: new Date().toISOString(),
        processingTime: Date.now() - startTime,
      },
    });
  } catch (error) {
    console.error('Data quality check error:', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'DATA_QUALITY_ERROR',
          message: error instanceof Error ? error.message : 'Failed to check data quality',
        },
      },
      { status: 500 }
    );
  }
}
