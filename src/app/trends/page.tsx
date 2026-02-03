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

// Mock data
const mockDailyData = [
  { date: '2026-01-28', produced: 5200, rejected: 390, rejectionRate: 7.5 },
  { date: '2026-01-29', produced: 4800, rejected: 410, rejectionRate: 8.5 },
  { date: '2026-01-30', produced: 5100, rejected: 380, rejectionRate: 7.5 },
  { date: '2026-01-31', produced: 4900, rejected: 450, rejectionRate: 9.2 },
  { date: '2026-02-01', produced: 5000, rejected: 420, rejectionRate: 8.4 },
  { date: '2026-02-02', produced: 5300, rejected: 395, rejectionRate: 7.5 },
  { date: '2026-02-03', produced: 4700, rejected: 385, rejectionRate: 8.2 },
];

export default function TrendsPage() {
  const [period, setPeriod] = useState('30d');
  
  const { data, isLoading, mutate } = useSWR(
    `/api/analytics/trends?period=${period}`,
    fetcher,
    {
      fallbackData: {
        success: true,
        data: {
          trends: mockDailyData,
          summary: {
            currentRate: 8.2,
            previousRate: 7.0,
            trend: 'up',
            change: 1.2,
          },
        },
      },
    }
  );

  const trends = data?.data?.trends || mockDailyData;
  const summary = data?.data?.summary;

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
        {/* Trend Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <p className="text-lg font-bold text-text-secondary mb-2">Current Rejection Rate</p>
              <div className="flex items-baseline gap-2">
                <p className="text-5xl font-extrabold text-text-primary">
                  {formatPercentage(summary?.currentRate || 0)}
                </p>
                {summary && (
                  <div className={`flex items-center gap-1 text-lg font-bold ${summary.trend === 'up' ? 'text-danger' : 'text-success'}`}>
                    {summary.trend === 'up' ? <TrendingUp className="w-5 h-5" /> : <TrendingDown className="w-5 h-5" />}
                    <span>{Math.abs(summary.change)}%</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <p className="text-lg font-bold text-text-secondary mb-2">Average (Prev Period)</p>
              <p className="text-5xl font-extrabold text-text-tertiary">
                {formatPercentage(summary?.previousRate || 0)}
              </p>
            </CardContent>
          </Card>

          <Card className={summary?.trend === 'up' ? 'bg-danger/5 border-danger/20' : 'bg-success/5 border-success/20'}>
            <CardContent className="p-6 flex items-center gap-4">
              <div className={`p-4 rounded-full ${summary?.trend === 'up' ? 'bg-danger/10 text-danger' : 'bg-success/10 text-success'}`}>
                {summary?.trend === 'up' ? <AlertTriangle className="w-8 h-8" /> : <TrendingDown className="w-8 h-8" />}
              </div>
              <div>
                <p className="text-xl font-bold text-text-primary">
                  {summary?.trend === 'up' ? 'Quality Deteriorating' : 'Quality Improving'}
                </p>
                <p className="text-lg text-text-secondary mt-1">
                  {summary?.trend === 'up' ? 'Immediate attention needed' : 'Trend is positive'}
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
                <AreaChart data={trends} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
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
                <BarChart data={trends} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
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
      </div>
    </>
  );
}
