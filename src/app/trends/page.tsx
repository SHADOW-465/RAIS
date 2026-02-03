'use client';

import React, { useState } from 'react';
import useSWR from 'swr';
import { DashboardHeader } from '@/components/layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  RefreshCw,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Loader2,
  BarChart3,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Legend,
} from 'recharts';
import { formatDate, formatPercentage } from '@/lib/utils';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

interface TrendDataPoint {
  date: string;
  produced: number;
  rejected: number;
  rejectionRate: number;
}

interface TrendSummary {
  avgRejectionRate: number;
  totalProduced: number;
  totalRejected: number;
  periodStart: string;
  periodEnd: string;
}

export default function TrendsPage() {
  const [period, setPeriod] = useState('30d');
  
  const { data, isLoading, error, mutate } = useSWR(
    `/api/analytics/trends?period=${period}`,
    fetcher,
    {
      refreshInterval: 60000,
    }
  );

  const timeline: TrendDataPoint[] = data?.data?.timeline || [];
  const summary: TrendSummary | null = data?.data?.summary || null;
  
  // Calculate trend direction from data
  const calculateTrend = () => {
    if (timeline.length < 2) return { trend: 'stable' as const, change: 0 };
    const firstHalf = timeline.slice(0, Math.floor(timeline.length / 2));
    const secondHalf = timeline.slice(Math.floor(timeline.length / 2));
    
    const firstAvg = firstHalf.reduce((sum, t) => sum + t.rejectionRate, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((sum, t) => sum + t.rejectionRate, 0) / secondHalf.length;
    
    const change = secondAvg - firstAvg;
    if (Math.abs(change) < 0.5) return { trend: 'stable' as const, change: 0 };
    return { trend: change > 0 ? 'up' as const : 'down' as const, change: Math.abs(change) };
  };
  
  const trendInfo = calculateTrend();
  const currentRate = timeline.length > 0 ? timeline[timeline.length - 1].rejectionRate : 0;

  return (
    <>
      <DashboardHeader
        title="Rejection Trends"
        description="Analyze quality performance over time"
        actions={
          <div className="flex items-center gap-4">
            <Select value={period} onValueChange={setPeriod}>
              <SelectTrigger className="w-[180px] h-12 text-lg">
                <SelectValue placeholder="Select period" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7d" className="text-lg">Last 7 Days</SelectItem>
                <SelectItem value="30d" className="text-lg">Last 30 Days</SelectItem>
                <SelectItem value="90d" className="text-lg">Last 90 Days</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              onClick={() => mutate()}
              disabled={isLoading}
              className="gap-2 h-12 text-lg px-6"
            >
              <RefreshCw className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        }
      />

      <div className="flex-1 p-8 overflow-auto">
        {/* Loading State */}
        {isLoading && (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-12 h-12 animate-spin text-primary" />
            <span className="ml-4 text-xl text-text-secondary">Loading trend data...</span>
          </div>
        )}

        {/* Error State */}
        {error && !isLoading && (
          <Card className="mb-8 border-danger/30 bg-danger/5">
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <AlertTriangle className="w-8 h-8 text-danger" />
                <div>
                  <p className="text-lg font-semibold text-danger">Failed to load trend data</p>
                  <p className="text-text-secondary">Please try refreshing the page</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Empty State */}
        {!isLoading && !error && timeline.length === 0 && (
          <Card className="mb-8">
            <CardContent className="p-12 text-center">
              <BarChart3 className="w-16 h-16 text-text-tertiary mx-auto mb-4" />
              <p className="text-xl font-semibold text-text-primary mb-2">No Trend Data Available</p>
              <p className="text-text-secondary">Upload inspection data to see rejection trends</p>
            </CardContent>
          </Card>
        )}

        {/* Trend Summary Cards */}
        {!isLoading && !error && timeline.length > 0 && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <Card>
                <CardContent className="p-6">
                  <p className="text-lg font-bold text-text-secondary mb-2">Current Rejection Rate</p>
                  <div className="flex items-baseline gap-2">
                    <p className="text-5xl font-extrabold text-text-primary">
                      {formatPercentage(currentRate)}
                    </p>
                    <div className={`flex items-center gap-1 text-lg font-bold ${trendInfo.trend === 'up' ? 'text-danger' : 'text-success'}`}>
                      {trendInfo.trend === 'up' ? <TrendingUp className="w-5 h-5" /> : <TrendingDown className="w-5 h-5" />}
                      <span>{trendInfo.change.toFixed(1)}%</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-6">
                  <p className="text-lg font-bold text-text-secondary mb-2">Average Rate</p>
                  <p className="text-5xl font-extrabold text-text-tertiary">
                    {formatPercentage(summary?.avgRejectionRate || 0)}
                  </p>
                </CardContent>
              </Card>

              <Card className={trendInfo.trend === 'up' ? 'bg-danger/5 border-danger/20' : trendInfo.trend === 'down' ? 'bg-success/5 border-success/20' : 'bg-primary/5 border-primary/20'}>
                <CardContent className="p-6 flex items-center gap-4">
                  <div className={`p-4 rounded-full ${trendInfo.trend === 'up' ? 'bg-danger/10 text-danger' : trendInfo.trend === 'down' ? 'bg-success/10 text-success' : 'bg-primary/10 text-primary'}`}>
                    {trendInfo.trend === 'up' ? <AlertTriangle className="w-8 h-8" /> : trendInfo.trend === 'down' ? <TrendingDown className="w-8 h-8" /> : <TrendingUp className="w-8 h-8" />}
                  </div>
                  <div>
                    <p className="text-xl font-bold text-text-primary">
                      {trendInfo.trend === 'up' ? 'Quality Deteriorating' : trendInfo.trend === 'down' ? 'Quality Improving' : 'Quality Stable'}
                    </p>
                    <p className="text-lg text-text-secondary mt-1">
                      {trendInfo.trend === 'up' ? 'Immediate attention needed' : trendInfo.trend === 'down' ? 'Trend is positive' : 'No significant change'}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Main Trend Chart */}
            <Card className="mb-8">
              <CardHeader>
                <CardTitle className="text-2xl">Rejection Rate Analysis</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[500px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={timeline} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorRate" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#0066CC" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#0066CC" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E8E8E8" vertical={false} />
                  <XAxis
                    dataKey="date"
                    tickFormatter={(date) => formatDate(date).split(' ').slice(0, 2).join(' ')}
                    tick={{ fontSize: 16, fill: '#333', fontWeight: 500 }}
                    stroke="#666666"
                    dy={10}
                  />
                  <YAxis
                    tickFormatter={(value) => `${value}%`}
                    tick={{ fontSize: 16, fill: '#333', fontWeight: 500 }}
                    stroke="#666666"
                    domain={[0, 'auto']}
                    dx={-10}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'white',
                      border: '2px solid #E8E8E8',
                      borderRadius: '12px',
                      fontSize: '18px',
                      padding: '16px',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                    }}
                    formatter={(value, name) => {
                      if (name === 'rejectionRate') return [`${value}%`, 'Rejection Rate'];
                      return [Number(value).toLocaleString(), name === 'produced' ? 'Produced' : 'Rejected'];
                    }}
                    labelFormatter={(date) => formatDate(date)}
                  />
                  <Legend 
                    wrapperStyle={{ paddingTop: '20px', fontSize: '18px' }}
                    iconSize={20}
                  />
                  <Area
                    yAxisId="left"
                    type="monotone"
                    dataKey="rejectionRate"
                    stroke="#0066CC"
                    strokeWidth={4}
                    fillOpacity={1}
                    fill="url(#colorRate)"
                    name="Rejection Rate"
                    activeDot={{ r: 8, strokeWidth: 2, fill: 'white' }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Production vs Rejection Volume */}
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">Volume Analysis (Produced vs Rejected)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[400px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={timeline} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E8E8E8" vertical={false} />
                  <XAxis
                    dataKey="date"
                    tickFormatter={(date) => formatDate(date).split(' ').slice(0, 2).join(' ')}
                    tick={{ fontSize: 16, fill: '#333', fontWeight: 500 }}
                    stroke="#666666"
                    dy={10}
                  />
                  <YAxis
                    tickFormatter={(value) => value.toLocaleString()}
                    tick={{ fontSize: 16, fill: '#333', fontWeight: 500 }}
                    stroke="#666666"
                    dx={-10}
                  />
                  <Tooltip
                    cursor={{ fill: '#f5f5f5' }}
                    contentStyle={{
                      backgroundColor: 'white',
                      border: '2px solid #E8E8E8',
                      borderRadius: '12px',
                      fontSize: '18px',
                      padding: '16px',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                    }}
                    formatter={(value, name) => [
                      Number(value).toLocaleString(),
                      name === 'produced' ? 'Produced' : 'Rejected',
                    ]}
                    labelFormatter={(date) => formatDate(date)}
                  />
                  <Legend 
                    wrapperStyle={{ paddingTop: '20px', fontSize: '18px' }}
                    iconSize={20}
                  />
                  <Bar dataKey="produced" fill="#006600" name="Produced" radius={[4, 4, 0, 0]} barSize={40} />
                  <Bar dataKey="rejected" fill="#CC0000" name="Rejected" radius={[4, 4, 0, 0]} barSize={40} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
          </>
        )}
      </div>
    </>
  );
}
