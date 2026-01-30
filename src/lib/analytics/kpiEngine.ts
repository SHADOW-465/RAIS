import { rejectionRepository } from '@/lib/db/repositories/rejectionRepository';
import { calculateMovingAverage, calculateStdDev, calculateConfidenceInterval } from './statistics';
import { subDays, differenceInDays } from 'date-fns';

export interface RejectionRateResult {
  current: number;
  previous: number;
  delta: number;
  isGood: boolean;
}

export interface CostImpactResult {
  current: number;
  projection: number;
  delta: number;
  averageDaily: number;
}

export interface TopRiskResult {
  name: string;
  contribution: number;
  line: string;
  count: number;
  trend: 'up' | 'down' | 'stable';
}

export interface ForecastResult {
  nextMonth: number;
  confidenceInterval: [number, number];
  confidence: number;
}

export class KpiEngine {
  async calculateRejectionRate(
    from: Date,
    to: Date,
    totalProduced: number,
    filters?: { lineIds?: number[] }
  ): Promise<RejectionRateResult> {
    // Get current period data
    const currentRejected = await rejectionRepository.getTotalRejected(from, to, filters);
    const currentRate = totalProduced > 0 ? (currentRejected / totalProduced) * 100 : 0;
    
    // Get previous period data (same duration)
    const periodDuration = differenceInDays(to, from);
    const previousFrom = subDays(from, periodDuration);
    const previousTo = subDays(to, periodDuration);
    const previousRejected = await rejectionRepository.getTotalRejected(previousFrom, previousTo, filters);
    const previousRate = totalProduced > 0 ? (previousRejected / totalProduced) * 100 : 0;
    
    const delta = currentRate - previousRate;
    
    return {
      current: parseFloat(currentRate.toFixed(2)),
      previous: parseFloat(previousRate.toFixed(2)),
      delta: parseFloat(delta.toFixed(2)),
      isGood: delta < 0, // Lower rejection rate is better
    };
  }

  async calculateCostImpact(from: Date, to: Date): Promise<CostImpactResult> {
    const data = await rejectionRepository.getAggregatedStats('day', from, to);
    const totalCost = data.reduce((sum, d) => sum + (d.totalCost || 0), 0);
    const avgDailyCost = data.length > 0 ? totalCost / data.length : 0;
    const projection = avgDailyCost * 30; // 30 days
    
    // Calculate delta vs previous period
    const periodDuration = differenceInDays(to, from);
    const previousFrom = subDays(from, periodDuration);
    const previousTo = subDays(to, periodDuration);
    const previousData = await rejectionRepository.getAggregatedStats('day', previousFrom, previousTo);
    const previousCost = previousData.reduce((sum, d) => sum + (d.totalCost || 0), 0);
    const delta = previousCost > 0 ? ((totalCost - previousCost) / previousCost) * 100 : 0;
    
    return {
      current: Math.round(totalCost),
      projection: Math.round(projection),
      delta: parseFloat(delta.toFixed(2)),
      averageDaily: Math.round(avgDailyCost),
    };
  }

  async identifyTopRisk(from: Date, to: Date): Promise<TopRiskResult> {
    const topDefects = await rejectionRepository.getTopDefects(from, to, 1);
    
    if (topDefects.length === 0) {
      return { name: 'None', contribution: 0, line: 'N/A', count: 0, trend: 'stable' };
    }
    
    const top = topDefects[0];
    
    // Get previous period for trend
    const periodDuration = differenceInDays(to, from);
    const previousFrom = subDays(from, periodDuration);
    const previousTo = subDays(to, periodDuration);
    const previousTop = await rejectionRepository.getTopDefects(previousFrom, previousTo, 1);
    
    let trend: 'up' | 'down' | 'stable' = 'stable';
    if (previousTop.length > 0 && previousTop[0].count > 0) {
      const change = ((top.count - previousTop[0].count) / previousTop[0].count) * 100;
      if (change > 10) trend = 'up';
      else if (change < -10) trend = 'down';
    }
    
    return {
      name: top.defectName,
      contribution: parseFloat(top.percentage.toFixed(1)),
      line: top.lineName || 'Unknown',
      count: top.count,
      trend,
    };
  }

  async generateForecast(historicalDays: number = 30): Promise<ForecastResult> {
    const to = new Date();
    const from = subDays(to, historicalDays);
    
    const data = await rejectionRepository.getAggregatedStats('day', from, to);
    const rates = data.map(d => d.totalRejected);
    
    if (rates.length === 0) {
      return { nextMonth: 0, confidenceInterval: [0, 0], confidence: 0 };
    }
    
    // Calculate moving average for trend
    const ma = calculateMovingAverage(rates, 7);
    const lastMA = ma[ma.length - 1] || rates[rates.length - 1];
    
    // Calculate confidence interval
    const [lower, upper] = calculateConfidenceInterval(rates, 0.95);
    
    // Calculate confidence based on variance
    const avg = rates.reduce((a, b) => a + b, 0) / rates.length;
    const variance = rates.reduce((acc, val) => acc + Math.pow(val - avg, 2), 0) / rates.length;
    const stdDev = Math.sqrt(variance);
    const confidence = avg > 0 ? Math.max(0, 100 - (stdDev / avg) * 100) : 0;
    
    return {
      nextMonth: Math.round(lastMA),
      confidenceInterval: [Math.round(lower), Math.round(upper)],
      confidence: Math.round(confidence),
    };
  }
}

export const kpiEngine = new KpiEngine();
