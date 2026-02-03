'use client';

import React from 'react';
import useSWR from 'swr';
import { DashboardHeader } from '@/components/layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Settings } from 'lucide-react';
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
import { formatCurrency, formatPercentage, formatDate } from '@/lib/utils';

// Fetcher for SWR
const fetcher = (url: string) => fetch(url).then((res) => res.json());

// Mock data for demo
const mockTrendData = [
  { date: 'Jan', value: 10000 },
  { date: 'Typer', value: 15000 },
  { date: 'Marg', value: 25000 },
];

const mockCategoryData = [
  { category: 'Defect', value: 1000, value2: 2500 },
  { category: 'Defect', value: 500, value2: 2000 },
  { category: 'Malgory', value: 1500, value2: 4000 },
  { category: 'Sponigh', value: 2500, value2: 3500 },
  { category: 'Aujel', value: 1200, value2: 2800 },
  { category: 'Defect', value: 2800, value2: 4500 },
  { category: 'Nairy', value: 2000, value2: 3200 },
];

const mockSummaryData = [
  { summary: 'Defect Type A', defectType: '4.50%', dectums: '07.0%' },
  { summary: 'Defect Type B', defectType: '295%', dectums: '07.9%' },
  { summary: 'Defect Type C', defectType: '295%', dectums: '07.0%' },
];

export default function DashboardPage() {
  const { data, error, isLoading, mutate } = useSWR('/api/analytics/overview?period=30d', fetcher, {
    refreshInterval: 60000,
    fallbackData: {
      success: true,
      data: {
        rejectionRate: { current: 12.5, previous: 10.2, change: 2.3, trend: 'up' },
        rejectedUnits: { current: 1234, previous: 1078, change: 156 },
        estimatedCost: { current: 450570, previous: 393470, change: 57100, currency: 'INR' },
        highRiskBatches: { count: 3, batches: [] },
        watchBatches: { count: 5 },
        aiSummary: {
          text: 'Rejection rate increased by 2.3% this week. Main driver: visual defects in Batch BR-2401.',
          sentiment: 'concerning',
          actionItems: [],
        },
      },
    },
  });

  const kpis = data?.data || {};

  return (
    <>
      <DashboardHeader title="Dashboard" description="Key Performance (KPI)" />

      <div className="flex-1 p-8 overflow-auto bg-gray-50">
        {/* Page Title */}
        <div className="mb-6">
          <h2 className="text-4xl font-bold text-black">Key Performance (KPI)</h2>
        </div>

        {/* KPI Cards - Horizontal Pills */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <KPICard
            title="Overall Rejection Rate"
            value="12.5%"
            change={2.3}
            changeDirection="up"
            progressValue={12.5}
          />
          <KPICard
            title="Top Rejection Category"
            subtitle="Defect Type A"
            value="45.2%"
            progressValue={45.2}
          />
          <KPICard
            title="Monthly Trend"
            value="5.1%"
            change={-51}
            changeDirection="down"
            progressValue={5.1}
          />
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Trend Chart */}
          <Card className="shadow-sm">
            <CardHeader className="flex-row items-center justify-between pb-2">
              <div className="flex-1">
                <CardTitle className="text-xl font-bold">Rejection Trend Over Time</CardTitle>
                <select className="mt-2 px-3 py-1 text-sm border border-gray-300 rounded-md bg-white">
                  <option>ANI</option>
                </select>
              </div>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={mockTrendData} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
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
                      formatter={(value: any) => [`${value}`, '12.5%']}
                    />
                    <Area
                      type="monotone"
                      dataKey="value"
                      stroke="#00CEC9"
                      strokeWidth={3}
                      fillOpacity={1}
                      fill="url(#colorTeal)"
                      activeDot={{ r: 6, strokeWidth: 2, fill: 'white' }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Category Bar Chart */}
          <Card className="shadow-sm">
            <CardHeader className="flex-row items-center justify-between pb-2">
              <div className="flex-1">
                <CardTitle className="text-xl font-bold">Rejection by Category</CardTitle>
                <select className="mt-2 px-3 py-1 text-sm border border-gray-300 rounded-md bg-white">
                  <option>ANI</option>
                </select>
              </div>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={mockCategoryData} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E8E8E8" vertical={false} />
                    <XAxis
                      dataKey="category"
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
                    <Bar dataKey="value" fill="#9CA3AF" radius={[8, 8, 0, 0]} barSize={30} />
                    <Bar dataKey="value2" fill="#00CEC9" radius={[8, 8, 0, 0]} barSize={30} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Summary Table */}
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="text-xl font-bold">Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-4 px-4 font-bold text-base">Summary</th>
                    <th className="text-left py-4 px-4 font-bold text-base">Defect Type</th>
                    <th className="text-left py-4 px-4 font-bold text-base">Dectums</th>
                    <th className="text-left py-4 px-4 font-bold text-base">Catact</th>
                  </tr>
                </thead>
                <tbody>
                  {mockSummaryData.map((row, idx) => (
                    <tr key={idx} className={idx % 2 === 0 ? 'bg-primary/5' : 'bg-white'}>
                      <td className="py-4 px-4 font-medium">{row.summary}</td>
                      <td className="py-4 px-4">{row.defectType}</td>
                      <td className="py-4 px-4">{row.dectums}</td>
                      <td className="py-4 px-4">
                        <svg width="120" height="40" className="inline-block">
                          <path
                            d="M 0 20 Q 20 10 40 15 T 80 20 T 120 25"
                            stroke="#00CEC9"
                            strokeWidth="2"
                            fill="none"
                          />
                        </svg>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
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
              {changeDirection === 'up' ? '↑' : '↓'} {Math.abs(change)}%
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
