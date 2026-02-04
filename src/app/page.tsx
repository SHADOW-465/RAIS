'use client';

import React, { useState, useEffect } from 'react';
import useSWR from 'swr';
import { DashboardHeader } from '@/components/layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Settings, Loader2 } from 'lucide-react';
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart,
  BarChart,
  Bar,
} from 'recharts';

// Fetcher for SWR
const fetcher = (url: string) => fetch(url).then((res) => res.json());

// API Response Types
interface OverviewData {
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
  aiSummary: {
    text: string;
    sentiment: string;
    actionItems: string[];
  } | null;
}

interface TrendDataPoint {
  date: string;
  produced: number;
  rejected: number;
  rejectionRate: number;
}

interface ParetoDefect {
  type: string;
  category: string | null;
  count: number;
  percentage: number;
  cumulativePercentage: number;
}

export default function DashboardPage() {
  const [period, setPeriod] = useState('30d');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Fetch overview data for KPIs
  const { data: overviewData, isLoading: isOverviewLoading, error: overviewError } = useSWR<
    { success: boolean; data: OverviewData }
  >(`/api/analytics/overview?period=${period}`, fetcher, {
    refreshInterval: 60000,
  });

  // Fetch trend data for AreaChart
  const { data: trendsData, isLoading: isTrendsLoading, error: trendsError } = useSWR<
    { success: boolean; data: { timeline: TrendDataPoint[] } }
  >(`/api/analytics/trends?period=${period}`, fetcher, {
    refreshInterval: 60000,
  });

  // Fetch pareto data for BarChart
  const { data: paretoData, isLoading: isParetoLoading, error: paretoError } = useSWR<
    { success: boolean; data: { defects: ParetoDefect[] } }
  >(`/api/analytics/pareto?period=${period}`, fetcher, {
    refreshInterval: 60000,
  });

  const kpis = overviewData?.data;
  const trendTimeline = trendsData?.data?.timeline || [];
  const paretoDefects = paretoData?.data?.defects || [];

  // Calculate top rejection category from pareto data
  const topCategory = paretoDefects.length > 0 
    ? paretoDefects.reduce((max, defect) => defect.percentage > max.percentage ? defect : max, paretoDefects[0])
    : null;

  // Calculate monthly trend from trend data
  const monthlyTrend = trendTimeline.length >= 2
    ? {
        current: trendTimeline[trendTimeline.length - 1]?.rejectionRate || 0,
        previous: trendTimeline[0]?.rejectionRate || 0,
      }
    : null;

  const hasError = overviewError || trendsError || paretoError;

  return (
    <>
      <DashboardHeader title="Dashboard" description="Key Performance (KPI)" />

      <div className="flex-1 p-8 overflow-auto bg-gray-50">
        {/* Page Title */}
        <div className="mb-6">
          <h2 className="text-4xl font-bold text-black">Key Performance (KPI)</h2>
        </div>

        {/* Error Display */}
        {hasError && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-700">
              Error loading dashboard data. Please try refreshing the page.
            </p>
          </div>
        )}

        {/* KPI Cards - Horizontal Pills */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {isOverviewLoading ? (
            <>
              <KPICardSkeleton />
              <KPICardSkeleton />
              <KPICardSkeleton />
            </>
          ) : (
            <>
              <KPICard
                title="Overall Rejection Rate"
                value={kpis ? `${kpis.rejectionRate.current.toFixed(1)}%` : '--'}
                change={kpis?.rejectionRate.change}
                changeDirection={kpis?.rejectionRate.trend === 'down' ? 'down' : 'up'}
                progressValue={kpis?.rejectionRate.current}
              />
              <KPICard
                title="Top Rejection Category"
                subtitle={topCategory?.type || 'Loading...'}
                value={topCategory ? `${topCategory.percentage.toFixed(1)}%` : '--'}
                progressValue={topCategory?.percentage}
              />
              <KPICard
                title="Monthly Trend"
                value={monthlyTrend ? `${monthlyTrend.current.toFixed(1)}%` : '--'}
                change={monthlyTrend ? monthlyTrend.current - monthlyTrend.previous : undefined}
                changeDirection={monthlyTrend && monthlyTrend.current < monthlyTrend.previous ? 'down' : 'up'}
                progressValue={monthlyTrend?.current}
              />
            </>
          )}
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Trend Chart */}
          <Card className="shadow-sm">
            <CardHeader className="flex-row items-center justify-between pb-2">
              <div className="flex-1">
                <CardTitle className="text-xl font-bold">Rejection Trend Over Time</CardTitle>
                <select 
                  className="mt-2 px-3 py-1 text-sm border border-gray-300 rounded-md bg-white"
                  value={period}
                  onChange={(e) => setPeriod(e.target.value)}
                >
                  <option value="7d">Last 7 Days</option>
                  <option value="30d">Last 30 Days</option>
                  <option value="90d">Last 90 Days</option>
                </select>
              </div>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                {!mounted ? (
                  <div className="h-full flex items-center justify-center text-gray-500">
                    Loading Chart...
                  </div>
                ) : isTrendsLoading ? (
                  <div className="h-full flex items-center justify-center">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                  </div>
                ) : trendTimeline.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-gray-500">
                    No trend data available
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={trendTimeline} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorTeal" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#00CEC9" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#00CEC9" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#E8E8E8" vertical={false} />
                      <XAxis
                        dataKey="date"
                        tick={{ fontSize: 14, fill: '#666' }}
                        stroke="#666666"
                        dy={10}
                      />
                      <YAxis
                        tickFormatter={(value) => `${value / 1000}k`}
                        tick={{ fontSize: 14, fill: '#666' }}
                        stroke="#666666"
                        domain={[0, 'auto']}
                        dx={-10}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'white',
                          border: '2px solid #E8E8E8',
                          borderRadius: '12px',
                          fontSize: '14px',
                          padding: '12px',
                          boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                        }}
                        formatter={(value: number | undefined) =>
                          value !== undefined ? [`${value.toLocaleString()}`, 'Rejected'] : ['', '']
                        }
                      />
                      <Area
                        type="monotone"
                        dataKey="rejected"
                        stroke="#00CEC9"
                        strokeWidth={3}
                        fillOpacity={1}
                        fill="url(#colorTeal)"
                        activeDot={{ r: 6, strokeWidth: 2, fill: 'white' }}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Category Bar Chart */}
          <Card className="shadow-sm">
            <CardHeader className="flex-row items-center justify-between pb-2">
              <div className="flex-1">
                <CardTitle className="text-xl font-bold">Rejection by Category</CardTitle>
                <select 
                  className="mt-2 px-3 py-1 text-sm border border-gray-300 rounded-md bg-white"
                  value={period}
                  onChange={(e) => setPeriod(e.target.value)}
                >
                  <option value="7d">Last 7 Days</option>
                  <option value="30d">Last 30 Days</option>
                  <option value="90d">Last 90 Days</option>
                </select>
              </div>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                {!mounted ? (
                  <div className="h-full flex items-center justify-center text-gray-500">
                    Loading Chart...
                  </div>
                ) : isParetoLoading ? (
                  <div className="h-full flex items-center justify-center">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                  </div>
                ) : paretoDefects.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-gray-500">
                    No defect data available
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={paretoDefects.slice(0, 7)} margin={{ top: 20, right: 30, left: 0, bottom: 60 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#E8E8E8" vertical={false} />
                      <XAxis
                        dataKey="type"
                        tick={{ fontSize: 12, fill: '#666' }}
                        stroke="#666666"
                        dy={10}
                        angle={-45}
                        textAnchor="end"
                        height={80}
                      />
                      <YAxis
                        tickFormatter={(value) => `${value}`}
                        tick={{ fontSize: 14, fill: '#666' }}
                        stroke="#666666"
                        domain={[0, 'auto']}
                        dx={-10}
                      />
                      <Tooltip
                        cursor={{ fill: '#f5f5f5' }}
                        contentStyle={{
                          backgroundColor: 'white',
                          border: '2px solid #E8E8E8',
                          borderRadius: '12px',
                          fontSize: '14px',
                          padding: '12px',
                          boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                        }}
                      />
                      <Bar dataKey="count" fill="#00CEC9" radius={[8, 8, 0, 0]} barSize={30} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* AI Summary Card */}
        {kpis?.aiSummary && (
          <Card className="shadow-sm mb-8">
            <CardHeader>
              <CardTitle className="text-xl font-bold flex items-center gap-2">
                <span>🤖</span> AI Insights
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className={`p-4 rounded-lg border-l-4 ${
                kpis.aiSummary.sentiment === 'concerning' ? 'bg-orange-50 border-orange-400' :
                kpis.aiSummary.sentiment === 'critical' ? 'bg-red-50 border-red-400' :
                kpis.aiSummary.sentiment === 'positive' ? 'bg-green-50 border-green-400' :
                'bg-blue-50 border-blue-400'
              }`}>
                <p className="text-lg text-gray-800">{kpis.aiSummary.text}</p>
                {kpis.aiSummary.actionItems && kpis.aiSummary.actionItems.length > 0 && (
                  <div className="mt-4">
                    <h4 className="font-semibold text-gray-700 mb-2">Recommended Actions:</h4>
                    <ul className="list-disc list-inside space-y-1">
                      {kpis.aiSummary.actionItems.map((item, idx) => (
                        <li key={idx} className="text-gray-600">{item}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Summary Table */}
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="text-xl font-bold">Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              {isOverviewLoading ? (
                <div className="py-8 flex items-center justify-center">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
              ) : kpis?.highRiskBatches?.batches?.length === 0 ? (
                <div className="py-8 text-center text-gray-500">
                  No high-risk batches at this time
                </div>
              ) : (
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-4 px-4 font-bold text-base">Batch Number</th>
                      <th className="text-left py-4 px-4 font-bold text-base">Rejection Rate</th>
                      <th className="text-left py-4 px-4 font-bold text-base">Production Date</th>
                      <th className="text-left py-4 px-4 font-bold text-base">Risk Level</th>
                    </tr>
                  </thead>
                  <tbody>
                    {kpis?.highRiskBatches?.batches?.map((batch, idx) => (
                      <tr key={batch.id} className={idx % 2 === 0 ? 'bg-primary/5' : 'bg-white'}>
                        <td className="py-4 px-4 font-medium">{batch.batchNumber}</td>
                        <td className="py-4 px-4">{batch.rejectionRate.toFixed(1)}%</td>
                        <td className="py-4 px-4">{new Date(batch.productionDate).toLocaleDateString()}</td>
                        <td className="py-4 px-4">
                          <span className="px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-700">
                            High Risk
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}

// KPI Card Component - Pill Style
interface KPICardProps {
  title: string;
  value: string | number;
  change?: number;
  changeDirection?: 'up' | 'down';
  subtitle?: string;
  progressValue?: number;
}

function KPICard({ title, value, change, changeDirection, subtitle, progressValue }: KPICardProps) {
  return (
    <Card className="shadow-sm hover:shadow-md transition-shadow bg-white">
      <CardContent className="p-6">
        <div className="flex items-start justify-between mb-3">
          <p className="text-base font-bold text-gray-700">{title}</p>
          <Settings className="w-5 h-5 text-gray-400" />
        </div>

        <div className="flex items-baseline gap-2 mb-3">
          <p className="text-4xl font-bold text-black tracking-tight">{value}</p>
          {change !== undefined && (
            <span
              className={`text-lg font-bold ${
                changeDirection === 'down' ? 'text-green-600' : 'text-red-600'
              }`}
            >
              {changeDirection === 'up' ? '↑' : '↓'} {Math.abs(change).toFixed(1)}%
            </span>
          )}
        </div>

        {subtitle && <p className="text-base font-medium text-gray-700 mb-3">{subtitle}</p>}

        {/* Pill Progress Bar */}
        {progressValue !== undefined && (
          <div className="w-full bg-gray-200 rounded-full h-2.5 overflow-hidden">
            <div
              className="bg-primary h-full rounded-full transition-all"
              style={{ width: `${Math.min(progressValue, 100)}%` }}
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// KPI Card Skeleton for loading state
function KPICardSkeleton() {
  return (
    <Card className="shadow-sm bg-white">
      <CardContent className="p-6">
        <div className="flex items-start justify-between mb-3">
          <div className="h-4 bg-gray-200 rounded w-1/2 animate-pulse" />
          <div className="w-5 h-5 bg-gray-200 rounded animate-pulse" />
        </div>
        <div className="h-10 bg-gray-200 rounded w-1/3 mb-3 animate-pulse" />
        <div className="w-full bg-gray-200 rounded-full h-2.5 animate-pulse" />
      </CardContent>
    </Card>
  );
}
