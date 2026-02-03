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
 */
export async function calculateOverviewKPIs(periodDays: number = 30): Promise<OverviewKPIs> {
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
 */
export async function calculateTrendData(
  periodDays: number = 30,
  granularity: 'daily' | 'weekly' = 'daily'
): Promise<TrendData> {
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - periodDays);

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
 */
export async function calculateParetoData(periodDays: number = 30): Promise<ParetoData> {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - periodDays);

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
    throw new Error(`Failed to fetch period data: ${error.message}`);
  }

  const batches = data || [];

  return {
    totalProduced: batches.reduce((sum, b) => sum + b.produced_quantity, 0),
    totalRejected: batches.reduce((sum, b) => sum + b.rejected_quantity, 0),
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
    throw new Error(`Failed to fetch high-risk batches: ${error.message}`);
  }

  return (data || []).map(batch => ({
    id: batch.id,
    batchNumber: batch.batch_number,
    rejectionRate: calculateRejectionRate(batch.produced_quantity, batch.rejected_quantity),
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
    throw new Error(`Failed to fetch watch batches count: ${error.message}`);
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
