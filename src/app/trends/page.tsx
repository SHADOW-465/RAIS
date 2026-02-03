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
  TrendingUp,
  TrendingDown,
  Minus,
  RefreshCw,
} from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Legend,
  ComposedChart,
  Area,
} from 'recharts';
import { formatDate, formatPercentage } from '@/lib/utils';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

// Mock data
const generateMockData = (days: number) => {
  const data = [];
  const today = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const produced = 4500 + Math.floor(Math.random() * 1000);
    const rejectionRate = 6 + Math.random() * 6;
    const rejected = Math.floor(produced * rejectionRate / 100);
    data.push({
      date: date.toISOString().split('T')[0],
      produced,
      rejected,
      rejectionRate: Math.round(rejectionRate * 10) / 10,
    });
  }
  return data;
};

export default function TrendsPage() {
  const [period, setPeriod] = useState('30d');
  const [granularity, setGranularity] = useState('daily');

  const periodDays = period === '7d' ? 7 : period === '14d' ? 14 : period === '30d' ? 30 : 90;
  const mockData = generateMockData(periodDays);

  const { data, isLoading, mutate } = useSWR(
    `/api/analytics/trends?period=${period}&granularity=${granularity}`,
    fetcher,
    {
      fallbackData: {
        success: true,
        data: {
          timeline: mockData,
          summary: {
            avgRejectionRate: 8.2,
            totalProduced: mockData.reduce((sum, d) => sum + d.produced, 0),
            totalRejected: mockData.reduce((sum, d) => sum + d.rejected, 0),
          },
        },
      },
    }
  );

  const trendData = data?.data?.timeline || mockData;
  const summary = data?.data?.summary || {};

  // Calculate period comparison
  const currentPeriodRate = trendData.slice(-Math.floor(trendData.length / 2))
    .reduce((sum: number, d: { rejectionRate: number }) => sum + d.rejectionRate, 0) / Math.floor(trendData.length / 2);
  const previousPeriodRate = trendData.slice(0, Math.floor(trendData.length / 2))
    .reduce((sum: number, d: { rejectionRate: number }) => sum + d.rejectionRate, 0) / Math.floor(trendData.length / 2);
  const rateChange = currentPeriodRate - previousPeriodRate;

  return (
    <>
      <DashboardHeader
        title="Rejection Trends"
        description="Track rejection rates and production volumes over time"
        actions={
          <Button
            variant="outline"
            onClick={() => mutate()}
            disabled={isLoading}
            className="gap-2"
          >
            <RefreshCw className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        }
      />

      <div className="flex-1 p-8 overflow-auto">
        {/* Filters */}
        <div className="flex flex-wrap gap-4 mb-8">
          <div className="flex items-center gap-2">
            <span className="text-base font-medium text-text-secondary">Period:</span>
            <Select value={period} onValueChange={setPeriod}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7d">Last 7 Days</SelectItem>
                <SelectItem value="14d">Last 14 Days</SelectItem>
                <SelectItem value="30d">Last 30 Days</SelectItem>
                <SelectItem value="90d">Last 90 Days</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-base font-medium text-text-secondary">View:</span>
            <Select value={granularity} onValueChange={setGranularity}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="daily">Daily</SelectItem>
                <SelectItem value="weekly">Weekly</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <p className="text-base font-medium text-text-secondary mb-2">Average Rejection Rate</p>
              <p className="text-4xl font-bold text-text-primary">
                {formatPercentage(summary.avgRejectionRate || 8.2)}
              </p>
              <div className="flex items-center gap-2 mt-3">
                {rateChange > 0.5 ? (
                  <>
                    <TrendingUp className="w-5 h-5 text-danger" />
                    <span className="text-base text-danger font-medium">
                      +{rateChange.toFixed(1)}% vs previous period
                    </span>
                  </>
                ) : rateChange < -0.5 ? (
                  <>
                    <TrendingDown className="w-5 h-5 text-success" />
                    <span className="text-base text-success font-medium">
                      {rateChange.toFixed(1)}% vs previous period
                    </span>
                  </>
                ) : (
                  <>
                    <Minus className="w-5 h-5 text-text-tertiary" />
                    <span className="text-base text-text-secondary font-medium">
                      Stable vs previous period
                    </span>
                  </>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <p className="text-base font-medium text-text-secondary mb-2">Total Produced</p>
              <p className="text-4xl font-bold text-text-primary">
                {(summary.totalProduced || 0).toLocaleString()}
              </p>
              <p className="text-base text-text-secondary mt-3">units in {periodDays} days</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <p className="text-base font-medium text-text-secondary mb-2">Total Rejected</p>
              <p className="text-4xl font-bold text-danger">
                {(summary.totalRejected || 0).toLocaleString()}
              </p>
              <p className="text-base text-text-secondary mt-3">
                {formatPercentage(((summary.totalRejected || 0) / (summary.totalProduced || 1)) * 100)} of production
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Main Trend Chart */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Daily Rejection Rate Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-96">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={trendData}>
                  <defs>
                    <linearGradient id="colorRate" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#0066CC" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#0066CC" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E8E8E8" />
                  <XAxis
                    dataKey="date"
                    tickFormatter={(date) => {
                      const d = new Date(date);
                      return `${d.getDate()}/${d.getMonth() + 1}`;
                    }}
                    tick={{ fontSize: 14 }}
                    stroke="#666666"
                  />
                  <YAxis
                    yAxisId="left"
                    tickFormatter={(value) => `${value}%`}
                    tick={{ fontSize: 14 }}
                    stroke="#666666"
                    domain={[0, 'auto']}
                  />
                  <YAxis
                    yAxisId="right"
                    orientation="right"
                    tickFormatter={(value) => value.toLocaleString()}
                    tick={{ fontSize: 14 }}
                    stroke="#999999"
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'white',
                      border: '2px solid #E8E8E8',
                      borderRadius: '8px',
                      fontSize: '16px',
                    }}
                    formatter={(value, name) => {
                      if (name === 'rejectionRate') return [`${value}%`, 'Rejection Rate'];
                      return [Number(value).toLocaleString(), name === 'produced' ? 'Produced' : 'Rejected'];
                    }}
                    labelFormatter={(date) => formatDate(date)}
                  />
                  <Legend />
                  <Area
                    yAxisId="left"
                    type="monotone"
                    dataKey="rejectionRate"
                    stroke="#0066CC"
                    strokeWidth={3}
                    fillOpacity={1}
                    fill="url(#colorRate)"
                    name="Rejection Rate"
                  />
                  <Line
                    yAxisId="left"
                    type="monotone"
                    dataKey="rejectionRate"
                    stroke="#0066CC"
                    strokeWidth={3}
                    dot={{ fill: '#0066CC', r: 4 }}
                    activeDot={{ r: 6 }}
                    name="Rejection Rate"
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Production vs Rejection Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Production vs Rejection Volume</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E8E8E8" />
                  <XAxis
                    dataKey="date"
                    tickFormatter={(date) => {
                      const d = new Date(date);
                      return `${d.getDate()}/${d.getMonth() + 1}`;
                    }}
                    tick={{ fontSize: 14 }}
                    stroke="#666666"
                  />
                  <YAxis
                    tickFormatter={(value) => value.toLocaleString()}
                    tick={{ fontSize: 14 }}
                    stroke="#666666"
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'white',
                      border: '2px solid #E8E8E8',
                      borderRadius: '8px',
                      fontSize: '16px',
                    }}
                    formatter={(value, name) => [
                      Number(value).toLocaleString(),
                      name === 'produced' ? 'Produced' : 'Rejected',
                    ]}
                    labelFormatter={(date) => formatDate(date)}
                  />
                  <Legend />
                  <Bar dataKey="produced" fill="#006600" name="Produced" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="rejected" fill="#CC0000" name="Rejected" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
