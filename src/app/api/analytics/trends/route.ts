import { NextRequest, NextResponse } from 'next/server';
import { rejectionRepository } from '@/lib/db/repositories/rejectionRepository';
import { calculateConfidenceInterval } from '@/lib/analytics/statistics';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const from = searchParams.get('from');
    const to = searchParams.get('to');
    const granularity = (searchParams.get('granularity') || 'day') as 'day' | 'week' | 'month';
    const lineIds = searchParams.get('lineIds')?.split(',').map(Number).filter(Boolean);
    
    if (!from || !to) {
      return NextResponse.json(
        { error: 'Missing required parameters: from, to' },
        { status: 400 }
      );
    }
    
    const fromDate = new Date(from);
    const toDate = new Date(to);
    
    // Fetch aggregated stats
    const stats = await rejectionRepository.getAggregatedStats(
      granularity,
      fromDate,
      toDate
    );
    
    // Calculate rejection rates (assuming production data available)
    const series = stats.map(stat => ({
      date: stat.period.toISOString(),
      rejectionCount: stat.totalRejected,
      incidentCount: stat.recordCount,
      totalCost: stat.totalCost,
      // Calculate a mock rejection rate based on average production
      // In real implementation, this would use actual production numbers
      rejectionRate: Math.round((stat.totalRejected / 1000) * 100) / 100,
    }));
    
    // Calculate confidence interval for forecast
    const values = series.map(s => s.rejectionCount);
    const [lower, upper] = calculateConfidenceInterval(values, 0.95);
    
    // Add forecast for next period
    const lastValue = values[values.length - 1] || 0;
    const forecast = series.map((s, i) => ({
      ...s,
      forecast: i === series.length - 1 ? lastValue : undefined,
      confidenceLower: i === series.length - 1 ? Math.round(lower) : undefined,
      confidenceUpper: i === series.length - 1 ? Math.round(upper) : undefined,
    }));
    
    // Calculate comparison
    const midPoint = Math.floor(series.length / 2);
    const currentPeriod = series.slice(midPoint);
    const previousPeriod = series.slice(0, midPoint);
    
    const currentTotal = currentPeriod.reduce((sum, s) => sum + s.rejectionCount, 0);
    const previousTotal = previousPeriod.reduce((sum, s) => sum + s.rejectionCount, 0);
    
    return NextResponse.json({
      series: forecast,
      comparison: {
        currentPeriod: {
          total: currentTotal,
          avgPerDay: currentPeriod.length > 0 ? Math.round(currentTotal / currentPeriod.length) : 0,
        },
        previousPeriod: {
          total: previousTotal,
          avgPerDay: previousPeriod.length > 0 ? Math.round(previousTotal / previousPeriod.length) : 0,
        },
        change: {
          absolute: currentTotal - previousTotal,
          percentage: previousTotal > 0 
            ? Math.round(((currentTotal - previousTotal) / previousTotal) * 100 * 100) / 100
            : 0,
        },
      },
    });
    
  } catch (error) {
    console.error('Trends API error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch trends' },
      { status: 500 }
    );
  }
}
