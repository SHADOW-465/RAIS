'use client';

import React, { useState } from 'react';
import useSWR from 'swr';
import { DashboardHeader } from '@/components/layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Settings, Loader2, Upload, AlertCircle } from 'lucide-react';
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
import Link from 'next/link';
import { StatsResponse, backendApi } from '@/lib/api/backend';

// Backend URL
const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';

// Fetcher for SWR - uses POST for stats endpoint
const statsFetcher = async (): Promise<StatsResponse> => {
  const response = await fetch(`${BACKEND_URL}/api/stats`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({}),
  });
  if (!response.ok) throw new Error('Failed to fetch stats');
  return response.json();
};

// Overview fetcher
const overviewFetcher = async (): Promise<{ has_data: boolean;[key: string]: unknown }> => {
  try {
    const response = await fetch(`${BACKEND_URL}/api/stats/overview`);
    if (!response.ok) return { has_data: false };
    return response.json();
  } catch {
    return { has_data: false };
  }
};

export default function DashboardPage() {
  const [period, setPeriod] = useState('30d');

  // Fetch overview to check if data exists
  const { data: overview, isLoading: isOverviewLoading } = useSWR(
    'overview',
    overviewFetcher,
    { refreshInterval: 30000, revalidateOnFocus: false }
  );

  // Fetch full stats from Python backend
  const { data: statsData, isLoading: isStatsLoading, error: statsError } = useSWR<StatsResponse>(
    overview?.has_data ? 'stats' : null,
    statsFetcher,
    { refreshInterval: 60000, revalidateOnFocus: false }
  );

  const hasData = overview?.has_data ?? false;
  const isLoading = isOverviewLoading || (hasData && isStatsLoading);

  // Extract data from stats response
  const kpis = statsData?.kpis;
  const stageKpis = statsData?.stage_kpis || [];
  const rejectionTrend = statsData?.rejection_trend;
  const defectPareto = statsData?.defect_pareto;
  const aiSummary = statsData?.ai_summary;

  // Transform trend data for Recharts
  const trendChartData = rejectionTrend?.series?.[0]?.data?.map(point => ({
    date: point.label || point.date,
    rejectionRate: point.value,
  })) || [];

  // Transform pareto data for Recharts
  const paretoChartData = defectPareto?.defects?.map(defect => ({
    type: defect.defect_name,
    count: defect.count,
    percentage: defect.percentage,
    cumulative: defect.cumulative_percentage,
  })) || [];

  // Get top defect from pareto
  const topDefect = paretoChartData.length > 0 ? paretoChartData[0] : null;

  return (
    <>
      <DashboardHeader title="Dashboard" description="Key Performance (KPI)" />

      <div className="flex-1 p-8 overflow-auto bg-gray-50">
        {/* Page Title */}
        <div className="mb-6">
          <h2 className="text-4xl font-bold text-black">Key Performance (KPI)</h2>
        </div>

        {/* No Data State */}
        {!isLoading && !hasData && (
          <Card className="mb-8 border-amber-200 bg-amber-50">
            <CardContent className="p-8 text-center">
              <AlertCircle className="w-12 h-12 mx-auto mb-4 text-amber-600" />
              <h3 className="text-xl font-bold text-slate-800 mb-2">No Data Available</h3>
              <p className="text-slate-600 mb-4">
                Upload your Excel files to start analyzing rejection data.
              </p>
              <Link href="/upload">
                <Button className="bg-teal-600 hover:bg-teal-700">
                  <Upload className="w-4 h-4 mr-2" />
                  Upload Data Files
                </Button>
              </Link>
            </CardContent>
          </Card>
        )}

        {/* Error Display */}
        {statsError && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-700">
              Error loading dashboard data. Make sure the Python backend is running on port 8000.
            </p>
          </div>
        )}

        {/* KPI Cards - Horizontal Pills */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {isLoading ? (
            <>
              <KPICardSkeleton />
              <KPICardSkeleton />
              <KPICardSkeleton />
            </>
          ) : hasData ? (
            <>
              <KPICard
                title="Overall Rejection Rate"
                value={kpis ? `${kpis.rejection_rate.toFixed(1)}%` : '--'}
                change={kpis?.rejection_rate_change}
                changeDirection={kpis?.rejection_trend === 'down' ? 'down' : 'up'}
                progressValue={kpis?.rejection_rate}
              />
              <KPICard
                title="Top Defect Type"
                subtitle={topDefect?.type || 'N/A'}
                value={topDefect ? `${topDefect.percentage.toFixed(1)}%` : '--'}
                progressValue={topDefect?.percentage}
              />
              <KPICard
                title="Total Rejected Units"
                value={kpis?.total_rejected?.toLocaleString() || '--'}
                subtitle={`of ${kpis?.total_produced?.toLocaleString() || '0'} produced`}
              />
            </>
          ) : (
            <>
              <KPICard title="Overall Rejection Rate" value="--" />
              <KPICard title="Top Defect Type" value="--" />
              <KPICard title="Total Rejected Units" value="--" />
            </>
          )}
        </div>

        {/* Charts Row - Only show if data exists */}
        {hasData && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            {/* Trend Chart */}
            <Card className="shadow-sm">
              <CardHeader className="flex-row items-center justify-between pb-2">
                <div className="flex-1">
                  <CardTitle className="text-xl font-bold">
                    {rejectionTrend?.title || 'Rejection Trend Over Time'}
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  {isStatsLoading ? (
                    <div className="h-full flex items-center justify-center">
                      <Loader2 className="w-8 h-8 animate-spin text-primary" />
                    </div>
                  ) : trendChartData.length === 0 ? (
                    <div className="h-full flex items-center justify-center text-gray-500">
                      No trend data available
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={trendChartData} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
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
                          tickFormatter={(value) => `${value}%`}
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
                            value !== undefined ? [`${value.toFixed(2)}%`, 'Rejection Rate'] : ['', '']
                          }
                        />
                        <Area
                          type="monotone"
                          dataKey="rejectionRate"
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

            {/* Pareto Bar Chart */}
            <Card className="shadow-sm">
              <CardHeader className="flex-row items-center justify-between pb-2">
                <div className="flex-1">
                  <CardTitle className="text-xl font-bold">
                    {defectPareto?.title || 'Defect Pareto Analysis'}
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  {isStatsLoading ? (
                    <div className="h-full flex items-center justify-center">
                      <Loader2 className="w-8 h-8 animate-spin text-primary" />
                    </div>
                  ) : paretoChartData.length === 0 ? (
                    <div className="h-full flex items-center justify-center text-gray-500">
                      No defect data available
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={paretoChartData.slice(0, 7)} margin={{ top: 20, right: 30, left: 0, bottom: 60 }}>
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
        )}

        {/* AI Summary Card */}
        {aiSummary && (
          <Card className="shadow-sm mb-8">
            <CardHeader>
              <CardTitle className="text-xl font-bold flex items-center gap-2">
                <span>🤖</span> AI Insights
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className={`p-4 rounded-lg border-l-4 ${aiSummary.includes('⚠️') ? 'bg-orange-50 border-orange-400' :
                  aiSummary.includes('✓') ? 'bg-green-50 border-green-400' :
                    'bg-blue-50 border-blue-400'
                }`}>
                <p className="text-lg text-gray-800">{aiSummary}</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Stage KPIs Table */}
        {hasData && stageKpis.length > 0 && (
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="text-xl font-bold">Stage Performance</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-4 px-4 font-bold text-base">Stage</th>
                      <th className="text-right py-4 px-4 font-bold text-base">Inspected</th>
                      <th className="text-right py-4 px-4 font-bold text-base">Rejected</th>
                      <th className="text-right py-4 px-4 font-bold text-base">Rejection Rate</th>
                      <th className="text-right py-4 px-4 font-bold text-base">Contribution</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stageKpis.map((stage, idx) => (
                      <tr key={stage.stage_code} className={idx % 2 === 0 ? 'bg-primary/5' : 'bg-white'}>
                        <td className="py-4 px-4 font-medium">{stage.stage_name}</td>
                        <td className="py-4 px-4 text-right">{stage.inspected.toLocaleString()}</td>
                        <td className="py-4 px-4 text-right">{stage.rejected.toLocaleString()}</td>
                        <td className="py-4 px-4 text-right">
                          <span className={`px-2 py-1 rounded-full text-sm font-medium ${stage.rejection_rate > 10 ? 'bg-red-100 text-red-700' :
                              stage.rejection_rate > 5 ? 'bg-amber-100 text-amber-700' :
                                'bg-green-100 text-green-700'
                            }`}>
                            {stage.rejection_rate.toFixed(1)}%
                          </span>
                        </td>
                        <td className="py-4 px-4 text-right">{stage.contribution_percent.toFixed(1)}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
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
