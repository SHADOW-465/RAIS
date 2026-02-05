'use client';

import React, { useState, useEffect } from 'react';
import useSWR from 'swr';
import { DashboardHeader } from '@/components/layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Settings, Loader2, Upload, AlertTriangle, Sparkles } from 'lucide-react';
import Link from 'next/link';
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
const fetcher = (url: string) => {
  const headers: Record<string, string> = {};
  if (typeof window !== 'undefined') {
    const sid = sessionStorage.getItem('rais_session_id');
    if (sid) headers['x-rais-session-id'] = sid;
  }
  return fetch(url, { headers }).then((res) => res.json());
};

// API Response Types (matching new v2 API)
interface OverviewKPIResponse {
  period: {
    start: string;
    end: string;
    days: number;
  };
  rejection: {
    rate: number;
    previous_rate: number;
    change: number;
    trend: 'improving' | 'worsening' | 'stable';
  };
  volume: {
    produced: number;
    rejected: number;
    previous_rejected: number;
    change: number;
  };
  cost: {
    estimated_loss: number;
    currency: string;
    per_unit_cost: number;
  };
  risk: {
    high_risk_days: number;
    watch_days: number;
  };
  data_quality: {
    total_files: number;
    last_upload: string | null;
    coverage_pct: number;
  };
}

interface TrendDataPoint {
  date: string;
  produced: number;
  rejected: number;
  rejection_rate: number;
  risk_level: 'normal' | 'watch' | 'high_risk';
}

interface TrendResponse {
  timeline: TrendDataPoint[];
  summary: {
    avg_rejection_rate: number;
    total_produced: number;
    total_rejected: number;
    data_points: number;
    missing_days: number;
  };
}

interface DefectPareto {
  defect_id: string;
  defect_code: string;
  display_name: string;
  category: string | null;
  severity: string;
  total_quantity: number;
  days_occurred: number;
  percentage: number;
  cumulative_pct: number;
  rank: number;
}

interface ParetoResponse {
  defects: DefectPareto[];
  total_defects: number;
  top_80_pct_count: number;
}

interface DataQualityResponse {
  hasData: boolean;
  counts: {
    productionDays: number;
    stageDays: number;
    defectRecords: number;
  };
  lastUpload: string | null;
  status: 'ready' | 'empty';
  message: string;
}

interface AISummaryResponse {
  text: string;
  sentiment: 'positive' | 'neutral' | 'concerning' | 'critical';
  confidence: number;
  actionItems: string[];
  generatedAt: string;
}

export default function DashboardPage() {
  const [period, setPeriod] = useState('30d');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // First check data availability
  const { data: qualityData, isLoading: isQualityLoading } = useSWR<
    { success: boolean; data: DataQualityResponse }
  >('/api/analytics/data-quality', fetcher);

  const hasData = qualityData?.data?.hasData || false;

  // Fetch overview data for KPIs
  const { data: overviewData, isLoading: isOverviewLoading, error: overviewError } = useSWR<
    { success: boolean; data: OverviewKPIResponse }
  >(hasData ? `/api/analytics/overview?period=${period}` : null, fetcher, {
    refreshInterval: 60000,
  });

  // Fetch trend data for AreaChart
  const { data: trendsData, isLoading: isTrendsLoading, error: trendsError } = useSWR<
    { success: boolean; data: TrendResponse }
  >(hasData ? `/api/analytics/trends?period=${period}` : null, fetcher, {
    refreshInterval: 60000,
  });

  // Fetch pareto data for BarChart
  const { data: paretoData, isLoading: isParetoLoading, error: paretoError } = useSWR<
    { success: boolean; data: ParetoResponse }
  >(hasData ? `/api/analytics/pareto` : null, fetcher, {
    refreshInterval: 60000,
  });

  // Fetch AI Summary (Independent fetch)
  const { data: aiData, isLoading: isAILoading } = useSWR<
    { success: boolean; data: AISummaryResponse }
  >(hasData ? `/api/ai/summarize?period=${period}` : null, fetcher, {
    revalidateOnFocus: false, // Don't revalidate on focus to save AI calls
    dedupingInterval: 600000, // Cache for 10 minutes
  });

  const kpis = overviewData?.data;
  const trendTimeline = trendsData?.data?.timeline || [];
  const paretoDefects = paretoData?.data?.defects || [];
  const aiSummary = aiData?.data;

  // Calculate top rejection category from pareto data
  const topCategory = paretoDefects.length > 0 ? paretoDefects[0] : null;

  // Calculate trend from timeline
  const monthlyTrend = trendTimeline.length >= 2
    ? {
      current: trendTimeline[trendTimeline.length - 1]?.rejection_rate || 0,
      previous: trendTimeline[0]?.rejection_rate || 0,
    }
    : null;

  const hasError = overviewError || trendsError || paretoError;

  // Show empty state if no data
  if (!isQualityLoading && !hasData) {
    return (
      <>
        <DashboardHeader title="Dashboard" description="Key Performance (KPI)" />
        <div className="flex-1 p-8 overflow-auto bg-gray-50">
          <div className="max-w-2xl mx-auto mt-16">
            <Card className="shadow-lg">
              <CardContent className="p-12 text-center">
                <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gray-100 flex items-center justify-center">
                  <Upload className="w-10 h-10 text-gray-400" />
                </div>
                <h2 className="text-2xl font-bold text-gray-800 mb-3">No Data Available</h2>
                <p className="text-gray-600 mb-6">
                  {qualityData?.data?.message || 'Upload Excel files to populate the dashboard with rejection statistics.'}
                </p>
                <Link
                  href="/settings/upload"
                  className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-lg font-medium hover:bg-primary/90 transition-colors"
                >
                  <Upload className="w-5 h-5" />
                  Upload Files
                </Link>
              </CardContent>
            </Card>
          </div>
        </div>
      </>
    );
  }

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
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-red-500" />
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
                value={kpis ? `${kpis.rejection.rate.toFixed(1)}%` : '--'}
                change={kpis?.rejection.change}
                changeDirection={kpis?.rejection.trend === 'improving' ? 'down' : 'up'}
                progressValue={kpis?.rejection.rate}
              />
              <KPICard
                title="Top Defect Type"
                subtitle={topCategory?.display_name || 'No data'}
                value={topCategory ? `${topCategory.percentage.toFixed(1)}%` : '--'}
                progressValue={topCategory?.percentage}
              />
              <KPICard
                title="Rejected Units"
                value={kpis ? kpis.volume.rejected.toLocaleString() : '--'}
                change={kpis?.volume.change}
                changeDirection={kpis && kpis.volume.change < 0 ? 'down' : 'up'}
                progressValue={kpis ? Math.min((kpis.volume.rejected / Math.max(kpis.volume.produced, 1)) * 100, 100) : undefined}
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
                <CardTitle className="text-xl font-bold">Rejection by Defect Type</CardTitle>
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
                        dataKey="display_name"
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
                      <Bar dataKey="total_quantity" fill="#00CEC9" radius={[8, 8, 0, 0]} barSize={30} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* AI Summary Card - Placed after charts for better flow */}
        {aiSummary && (
          <Card className="shadow-sm mb-8 border-l-4 border-l-primary/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-xl font-bold flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-primary" />
                AI Executive Summary
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className={`p-4 rounded-lg ${aiSummary.sentiment === 'concerning' ? 'bg-orange-50' :
                  aiSummary.sentiment === 'critical' ? 'bg-red-50' :
                    aiSummary.sentiment === 'positive' ? 'bg-green-50' :
                      'bg-blue-50'
                }`}>
                <p className="text-lg text-gray-800 whitespace-pre-line">{aiSummary.text}</p>
                {aiSummary.actionItems && aiSummary.actionItems.length > 0 && (
                  <div className="mt-4">
                    <h4 className="font-semibold text-gray-700 mb-2">Recommended Actions:</h4>
                    <ul className="list-disc list-inside space-y-1">
                      {aiSummary.actionItems.map((item, idx) => (
                        <li key={idx} className="text-gray-600">{item}</li>
                      ))}
                    </ul>
                  </div>
                )}
                <div className="mt-2 text-xs text-gray-400 text-right">
                  Generated: {new Date(aiSummary.generatedAt).toLocaleString()}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Loading state for AI */}
        {isAILoading && !aiSummary && (
          <Card className="shadow-sm mb-8 border-dashed border-2 border-gray-200">
            <CardContent className="p-8 flex flex-col items-center justify-center text-gray-400">
              <Sparkles className="w-8 h-8 mb-2 animate-pulse text-primary/50" />
              <p>Generating AI insights...</p>
            </CardContent>
          </Card>
        )}

        {/* Summary Stats Card */}
        <Card className="shadow-sm mb-8">
          <CardHeader>
            <CardTitle className="text-xl font-bold">Data Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <p className="text-3xl font-bold text-primary">{kpis?.data_quality.total_files || 0}</p>
                <p className="text-sm text-gray-600">Files Uploaded</p>
              </div>
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <p className="text-3xl font-bold text-primary">{kpis?.volume.produced.toLocaleString() || 0}</p>
                <p className="text-sm text-gray-600">Units Produced</p>
              </div>
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <p className="text-3xl font-bold text-primary">{kpis?.data_quality.coverage_pct || 0}%</p>
                <p className="text-sm text-gray-600">Data Coverage</p>
              </div>
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <p className="text-3xl font-bold text-primary">
                  {kpis?.cost.currency || '$'}{kpis?.cost.estimated_loss.toLocaleString() || 0}
                </p>
                <p className="text-sm text-gray-600">Estimated Loss</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Risk Days Card */}
        {kpis && (kpis.risk.high_risk_days > 0 || kpis.risk.watch_days > 0) && (
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="text-xl font-bold">Risk Analysis</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-8">
                {kpis.risk.high_risk_days > 0 && (
                  <div className="flex items-center gap-3">
                    <div className="w-4 h-4 rounded-full bg-red-500"></div>
                    <span className="text-lg font-medium">
                      {kpis.risk.high_risk_days} High Risk Days
                    </span>
                  </div>
                )}
                {kpis.risk.watch_days > 0 && (
                  <div className="flex items-center gap-3">
                    <div className="w-4 h-4 rounded-full bg-yellow-500"></div>
                    <span className="text-lg font-medium">
                      {kpis.risk.watch_days} Watch Days
                    </span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}
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
              className={`text-lg font-bold ${changeDirection === 'down' ? 'text-green-600' : 'text-red-600'
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
