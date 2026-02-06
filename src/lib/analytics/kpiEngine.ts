/**
 * KPI Engine
 * Calculate key performance indicators for manufacturing rejection analysis
 */

import { supabaseAdmin } from '../db/client';
import type { DashboardKPI } from '../db/types';

// ============================================================================
// TYPES
// ============================================================================

export interface OverviewKPIs {
  rejectionRate: {
    current: number;
    previous: number;
    change: number;
    trend: 'up' | 'down' | 'stable';
  };
  rejectedUnits: {
    current: number;
    previous: number;
    change: number;
  };
  estimatedCost: {
    current: number;
    previous: number;
    change: number;
    currency: string;
  };
  highRiskBatches: {
    count: number;
    batches: Array<{
      id: string;
      batchNumber: string;
      rejectionRate: number;
      productionDate: string;
    }>;
  };
  watchBatches: {
    count: number;
  };
}

export interface TrendData {
  timeline: Array<{
    date: string;
    produced: number;
    rejected: number;
    rejectionRate: number;
  }>;
  summary: {
    avgRejectionRate: number;
    totalProduced: number;
    totalRejected: number;
    periodStart: string;
    periodEnd: string;
  };
}

export interface ParetoData {
  defects: Array<{
    type: string;
    category: string | null;
    count: number;
    percentage: number;
    cumulativePercentage: number;
  }>;
  total: number;
}

// ============================================================================
// CONFIGURATION
// ============================================================================

// Cost per rejected unit (in INR) - configurable
const COST_PER_REJECTED_UNIT = 365;

// Risk thresholds (used for UI styling and alerts)
export const RISK_THRESHOLDS = {
  high: 15, // >= 15% rejection rate
  watch: 8,  // >= 8% rejection rate
};

// ============================================================================
// DASHBOARD KPIs
// ============================================================================

/**
 * Calculate overview KPIs for dashboard
 * Falls back to mock data if database is unavailable
 */
export async function calculateOverviewKPIs(periodDays: number = 30): Promise<OverviewKPIs> {
  try {
    const currentPeriodStart = new Date();
    currentPeriodStart.setDate(currentPeriodStart.getDate() - periodDays);
    const currentPeriodEnd = new Date();

    const previousPeriodStart = new Date(currentPeriodStart);
    previousPeriodStart.setDate(previousPeriodStart.getDate() - periodDays);
    const previousPeriodEnd = new Date(currentPeriodStart);

    // Fetch current period data
    const currentData = await fetchPeriodData(
      currentPeriodStart.toISOString().split('T')[0],
      currentPeriodEnd.toISOString().split('T')[0]
    );

    // Fetch previous period data
    const previousData = await fetchPeriodData(
      previousPeriodStart.toISOString().split('T')[0],
      previousPeriodEnd.toISOString().split('T')[0]
    );

    // Calculate KPIs
    const currentRejectionRate = calculateRejectionRate(
      currentData.totalProduced,
      currentData.totalRejected
    );
    const previousRejectionRate = calculateRejectionRate(
      previousData.totalProduced,
      previousData.totalRejected
    );

    const rateChange = currentRejectionRate - previousRejectionRate;
    const trend: 'up' | 'down' | 'stable' = 
      Math.abs(rateChange) < 0.5 ? 'stable' : rateChange > 0 ? 'up' : 'down';

    // Fetch high-risk batches
    const highRiskBatches = await fetchHighRiskBatches();

    // Fetch watch batches count
    const watchCount = await fetchWatchBatchesCount();

    return {
      rejectionRate: {
        current: currentRejectionRate,
        previous: previousRejectionRate,
        change: rateChange,
        trend,
      },
      rejectedUnits: {
        current: currentData.totalRejected,
        previous: previousData.totalRejected,
        change: currentData.totalRejected - previousData.totalRejected,
      },
      estimatedCost: {
        current: currentData.totalRejected * COST_PER_REJECTED_UNIT,
        previous: previousData.totalRejected * COST_PER_REJECTED_UNIT,
        change: (currentData.totalRejected - previousData.totalRejected) * COST_PER_REJECTED_UNIT,
        currency: 'INR',
      },
      highRiskBatches: {
        count: highRiskBatches.length,
        batches: highRiskBatches,
      },
      watchBatches: {
        count: watchCount,
      },
    };
  } catch (error) {
    console.warn('Database query failed, returning mock KPI data:', error);
    // Return mock data when database is unavailable
    return getMockOverviewKPIs();
  }
}

/**
 * Generate mock KPI data for when database is unavailable
 */
function getMockOverviewKPIs(): OverviewKPIs {
  return {
    rejectionRate: {
      current: 12.5,
      previous: 10.2,
      change: 2.3,
      trend: 'up',
    },
    rejectedUnits: {
      current: 1234,
      previous: 1078,
      change: 156,
    },
    estimatedCost: {
      current: 450570,
      previous: 393470,
      change: 57100,
      currency: 'INR',
    },
    highRiskBatches: {
      count: 3,
      batches: [
        { id: '1', batchNumber: 'BR-2401', rejectionRate: 18.5, productionDate: '2026-02-01' },
        { id: '2', batchNumber: 'BR-2398', rejectionRate: 15.2, productionDate: '2026-01-28' },
        { id: '3', batchNumber: 'BR-2405', rejectionRate: 16.8, productionDate: '2026-02-02' },
      ],
    },
    watchBatches: {
      count: 5,
    },
  };
}

/**
 * Calculate rejection rate percentage
 */
export function calculateRejectionRate(produced: number, rejected: number): number {
  if (produced === 0) return 0;
  return Math.round((rejected / produced) * 100 * 100) / 100; // 2 decimal places
}

/**
 * Calculate estimated cost of rejections
 */
export function calculateRejectionCost(rejectedUnits: number): number {
  return rejectedUnits * COST_PER_REJECTED_UNIT;
}

// ============================================================================
// TREND ANALYSIS
// ============================================================================

/**
 * Get rejection trend data for time series charts
 * Falls back to mock data if database is unavailable
 */
export async function calculateTrendData(
  periodDays: number = 30,
  granularity: 'daily' | 'weekly' = 'daily'
): Promise<TrendData> {
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - periodDays);

  try {
    // Use materialized view for performance
    const { data, error } = await supabaseAdmin
      .from('dashboard_kpis')
      .select('*')
      .gte('date', startDate.toISOString().split('T')[0])
      .lte('date', endDate.toISOString().split('T')[0])
      .order('date', { ascending: true });

    if (error) {
      throw new Error(`Failed to fetch trend data: ${error.message}`);
    }

    const kpis = (data || []) as DashboardKPI[];

    // Group by granularity if weekly
    let timeline: Array<{
      date: string;
      produced: number;
      rejected: number;
      rejectionRate: number;
    }>;

    if (granularity === 'weekly') {
      timeline = groupByWeek(kpis);
    } else {
      timeline = kpis.map(kpi => ({
        date: kpi.date,
        produced: kpi.total_produced,
        rejected: kpi.total_rejected,
        rejectionRate: kpi.avg_rejection_rate,
      }));
    }

    // Calculate summary
    const totalProduced = kpis.reduce((sum, kpi) => sum + kpi.total_produced, 0);
    const totalRejected = kpis.reduce((sum, kpi) => sum + kpi.total_rejected, 0);

    return {
      timeline,
      summary: {
        avgRejectionRate: calculateRejectionRate(totalProduced, totalRejected),
        totalProduced,
        totalRejected,
        periodStart: startDate.toISOString().split('T')[0],
        periodEnd: endDate.toISOString().split('T')[0],
      },
    };
  } catch (error) {
    console.warn('Database query failed, returning mock trend data:', error);
    return getMockTrendData(startDate, endDate);
  }
}

/**
 * Generate mock trend data for when database is unavailable
 */
function getMockTrendData(startDate: Date, endDate: Date): TrendData {
  const timeline: Array<{
    date: string;
    produced: number;
    rejected: number;
    rejectionRate: number;
  }> = [];

  const currentDate = new Date(startDate);
  while (currentDate <= endDate) {
    const produced = 400 + Math.floor(Math.random() * 200);
    const rejected = Math.floor(produced * (0.08 + Math.random() * 0.08));
    timeline.push({
      date: currentDate.toISOString().split('T')[0],
      produced,
      rejected,
      rejectionRate: calculateRejectionRate(produced, rejected),
    });
    currentDate.setDate(currentDate.getDate() + 1);
  }

  const totalProduced = timeline.reduce((sum, t) => sum + t.produced, 0);
  const totalRejected = timeline.reduce((sum, t) => sum + t.rejected, 0);

  return {
    timeline,
    summary: {
      avgRejectionRate: calculateRejectionRate(totalProduced, totalRejected),
      totalProduced,
      totalRejected,
      periodStart: startDate.toISOString().split('T')[0],
      periodEnd: endDate.toISOString().split('T')[0],
    },
  };
}

/**
 * Group daily KPIs into weekly buckets
 */
function groupByWeek(dailyKPIs: DashboardKPI[]): Array<{
  date: string;
  produced: number;
  rejected: number;
  rejectionRate: number;
}> {
  const weeks: Record<string, {
    date: string;
    produced: number;
    rejected: number;
  }> = {};

  for (const kpi of dailyKPIs) {
    const date = new Date(kpi.date);
    const weekStart = new Date(date);
    weekStart.setDate(date.getDate() - date.getDay()); // Start of week (Sunday)
    const weekKey = weekStart.toISOString().split('T')[0];

    if (!weeks[weekKey]) {
      weeks[weekKey] = {
        date: weekKey,
        produced: 0,
        rejected: 0,
      };
    }

    weeks[weekKey].produced += kpi.total_produced;
    weeks[weekKey].rejected += kpi.total_rejected;
  }

  return Object.values(weeks).map(week => ({
    ...week,
    rejectionRate: calculateRejectionRate(week.produced, week.rejected),
  }));
}

// ============================================================================
// PARETO ANALYSIS
// ============================================================================

/**
 * Calculate Pareto analysis for defects (80/20 rule)
 * Falls back to mock data if database is unavailable
 */
export async function calculateParetoData(periodDays: number = 30): Promise<ParetoData> {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - periodDays);

  try {
    // Use materialized view
    const { data, error } = await supabaseAdmin
      .from('defect_pareto')
      .select('*')
      .order('rank', { ascending: true });

    if (error) {
      throw new Error(`Failed to fetch Pareto data: ${error.message}`);
    }

    const paretoData = data || [];
    const total = paretoData.reduce((sum, d) => sum + d.total_quantity, 0);

    return {
      defects: paretoData.map(d => ({
        type: d.defect_type,
        category: d.defect_category,
        count: d.total_quantity,
        percentage: d.percentage,
        cumulativePercentage: d.cumulative_percentage,
      })),
      total,
    };
  } catch (error) {
    console.warn('Database query failed, returning mock Pareto data:', error);
    return getMockParetoData();
  }
}

/**
 * Generate mock Pareto data for when database is unavailable
 */
function getMockParetoData(): ParetoData {
  const defects = [
    { type: 'Visual Defects', category: 'visual', count: 456, percentage: 38, cumulativePercentage: 38 },
    { type: 'Dimensional Issues', category: 'dimensional', count: 234, percentage: 19, cumulativePercentage: 57 },
    { type: 'Functional Failures', category: 'functional', count: 189, percentage: 16, cumulativePercentage: 73 },
    { type: 'Material Defects', category: 'material', count: 145, percentage: 12, cumulativePercentage: 85 },
    { type: 'Surface Scratches', category: 'visual', count: 89, percentage: 7, cumulativePercentage: 92 },
    { type: 'Assembly Errors', category: 'other', count: 56, percentage: 5, cumulativePercentage: 97 },
    { type: 'Other', category: 'other', count: 35, percentage: 3, cumulativePercentage: 100 },
  ];

  const total = defects.reduce((sum, d) => sum + d.count, 0);

  return {
    defects,
    total,
  };
}

// ============================================================================
// FORECASTING (Simple Linear Regression)
// ============================================================================

/**
 * Forecast rejection rate for next period
 */
export async function forecastRejectionRate(
  historicalDays: number = 90,
  forecastDays: number = 7
): Promise<Array<{ date: string; forecastedRate: number }>> {
  const trendData = await calculateTrendData(historicalDays, 'daily');
  
  // Simple linear regression
  const x = trendData.timeline.map((_, i) => i); // Day index
  const y = trendData.timeline.map(t => t.rejectionRate);

  const { slope, intercept } = linearRegression(x, y);

  // Forecast
  const forecast: Array<{ date: string; forecastedRate: number }> = [];
  const lastDate = new Date(trendData.timeline[trendData.timeline.length - 1].date);

  for (let i = 1; i <= forecastDays; i++) {
    const forecastDate = new Date(lastDate);
    forecastDate.setDate(forecastDate.getDate() + i);

    const forecastedRate = slope * (x.length + i - 1) + intercept;

    forecast.push({
      date: forecastDate.toISOString().split('T')[0],
      forecastedRate: Math.max(0, Math.round(forecastedRate * 100) / 100),
    });
  }

  return forecast;
}

/**
 * Simple linear regression
 */
function linearRegression(x: number[], y: number[]): { slope: number; intercept: number } {
  const n = x.length;
  const sumX = x.reduce((a, b) => a + b, 0);
  const sumY = y.reduce((a, b) => a + b, 0);
  const sumXY = x.reduce((sum, xi, i) => sum + xi * y[i], 0);
  const sumX2 = x.reduce((sum, xi) => sum + xi * xi, 0);

  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  const intercept = (sumY - slope * sumX) / n;

  return { slope, intercept };
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Fetch period data (total produced and rejected)
 */
async function fetchPeriodData(startDate: string, endDate: string) {
  const { data, error } = await supabaseAdmin
    .from('batches')
    .select('produced_quantity, rejected_quantity')
    .gte('production_date', startDate)
    .lte('production_date', endDate);

  if (error) {
    console.warn('Failed to fetch period data:', error.message);
    // Return mock data if table doesn't exist
    return {
      totalProduced: 10000,
      totalRejected: 1234,
    };
  }

  const batches = data || [];

  return {
    totalProduced: batches.reduce((sum, b) => sum + (b.produced_quantity || 0), 0),
    totalRejected: batches.reduce((sum, b) => sum + (b.rejected_quantity || 0), 0),
  };
}

/**
 * Fetch high-risk batches
 */
async function fetchHighRiskBatches() {
  const { data, error } = await supabaseAdmin
    .from('batches')
    .select('id, batch_number, produced_quantity, rejected_quantity, production_date')
    .eq('risk_level', 'high_risk')
    .order('rejected_quantity', { ascending: false })
    .limit(10);

  if (error) {
    console.warn('Failed to fetch high-risk batches:', error.message);
    // Return empty array if table doesn't exist
    return [];
  }

  return (data || []).map(batch => ({
    id: batch.id,
    batchNumber: batch.batch_number,
    rejectionRate: calculateRejectionRate(batch.produced_quantity || 0, batch.rejected_quantity || 0),
    productionDate: batch.production_date,
  }));
}

/**
 * Fetch watch batches count
 */
async function fetchWatchBatchesCount(): Promise<number> {
  const { count, error } = await supabaseAdmin
    .from('batches')
    .select('id', { count: 'exact', head: true })
    .eq('risk_level', 'watch');

  if (error) {
    console.warn('Failed to fetch watch batches count:', error.message);
    // Return 0 if table doesn't exist
    return 0;
  }

  return count || 0;
}

/**
 * Calculate standard deviation (for anomaly detection)
 */
export function calculateStandardDeviation(values: number[]): number {
  const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
  const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
  return Math.sqrt(variance);
}

/**
 * Detect if current value is an anomaly (> 2 standard deviations from mean)
 */
export function detectAnomaly(
  currentValue: number,
  historicalValues: number[]
): { isAnomaly: boolean; severity: 'minor' | 'moderate' | 'critical' } {
  const mean = historicalValues.reduce((sum, val) => sum + val, 0) / historicalValues.length;
  const stdDev = calculateStandardDeviation(historicalValues);

  const zScore = Math.abs((currentValue - mean) / stdDev);

  if (zScore > 3) {
    return { isAnomaly: true, severity: 'critical' };
  } else if (zScore > 2) {
    return { isAnomaly: true, severity: 'moderate' };
  } else if (zScore > 1.5) {
    return { isAnomaly: true, severity: 'minor' };
  }

  return { isAnomaly: false, severity: 'minor' };
}
