'use client';

import React from 'react';
import useSWR from 'swr';
import { DashboardHeader } from '@/components/layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Package,
  DollarSign,
  Activity,
  ArrowRight,
  RefreshCw,
  Sparkles,
} from 'lucide-react';
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
import { formatCurrency, formatPercentage, formatDate } from '@/lib/utils';

// Fetcher for SWR
const fetcher = (url: string) => fetch(url).then((res) => res.json());

// Mock data for demo
const mockTrendData = [
  { date: '2026-01-28', produced: 5200, rejected: 390, rejectionRate: 7.5 },
  { date: '2026-01-29', produced: 4800, rejected: 410, rejectionRate: 8.5 },
  { date: '2026-01-30', produced: 5100, rejected: 380, rejectionRate: 7.5 },
  { date: '2026-01-31', produced: 4900, rejected: 450, rejectionRate: 9.2 },
  { date: '2026-02-01', produced: 5000, rejected: 420, rejectionRate: 8.4 },
  { date: '2026-02-02', produced: 5300, rejected: 395, rejectionRate: 7.5 },
  { date: '2026-02-03', produced: 4700, rejected: 385, rejectionRate: 8.2 },
];

const mockStageData = [
  { stage: 'Visual', rejectionRate: 12.5 },
  { stage: 'Assembly', rejectionRate: 8.2 },
  { stage: 'Integrity', rejectionRate: 5.4 },
  { stage: 'Packaging', rejectionRate: 2.1 },
];

const mockHighRiskBatches = [
  { id: '1', batchNumber: 'BR-2401', rejectionRate: 15.2, productionDate: '2026-02-01' },
  { id: '2', batchNumber: 'BR-2398', rejectionRate: 12.8, productionDate: '2026-01-30' },
  { id: '3', batchNumber: 'BR-2405', rejectionRate: 11.5, productionDate: '2026-02-02' },
];

export default function DashboardPage() {
  const { data, error, isLoading, mutate } = useSWR('/api/analytics/overview?period=30d', fetcher, {
    refreshInterval: 60000,
    fallbackData: {
      success: true,
      data: {
        rejectionRate: { current: 8.2, previous: 7.0, change: 1.2, trend: 'up' },
        rejectedUnits: { current: 1234, previous: 1078, change: 156 },
        estimatedCost: { current: 450570, previous: 393470, change: 57100, currency: 'INR' },
        highRiskBatches: { count: 3, batches: mockHighRiskBatches },
        watchBatches: { count: 5 },
        aiSummary: {
          text: 'Rejection rate increased by 1.2% this week. Main driver: visual defects in Batch BR-2401. 3 batches at high risk of scrapping require immediate review.',
          sentiment: 'concerning',
          actionItems: [
            'Review Batch BR-2401 immediately',
            'Inspect incoming material from supplier S-401',
            'Schedule quality meeting with production team',
          ],
        },
      },
    },
  });

  const kpis = data?.data || {};

  return (
    <>
      <DashboardHeader
        title="Dashboard"
        description="Executive Overview"
        actions={
          <Button
            variant="outline"
            onClick={() => mutate()}
            disabled={isLoading}
            className="gap-2 text-lg px-4 py-6"
          >
            <RefreshCw className={`w-6 h-6 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh Data
          </Button>
        }
      />

      <div className="flex-1 p-8 overflow-auto">
        {/* KPI Cards - Large Executive View */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <KPICard
            title="Overall Rejection Rate"
            value={formatPercentage(kpis.rejectionRate?.current || 0)}
            change={{
              value: kpis.rejectionRate?.change || 0,
              direction: kpis.rejectionRate?.trend as 'up' | 'down',
              label: 'vs last period',
            }}
            icon={<Activity className="w-10 h-10" />}
            variant={kpis.rejectionRate?.trend === 'up' ? 'danger' : 'success'}
          />
          <KPICard
            title="Rejected Units"
            value={(kpis.rejectedUnits?.current || 0).toLocaleString()}
            change={{
              value: Math.abs(kpis.rejectedUnits?.change || 0),
              direction: (kpis.rejectedUnits?.change || 0) > 0 ? 'up' : 'down',
              label: 'units',
            }}
            icon={<Package className="w-10 h-10" />}
            variant="warning"
          />
          <KPICard
            title="Estimated Cost Impact"
            value={formatCurrency(kpis.estimatedCost?.current || 0, 'INR')}
            change={{
              value: Math.abs(kpis.estimatedCost?.change || 0),
              direction: (kpis.estimatedCost?.change || 0) > 0 ? 'up' : 'down',
              label: formatCurrency(Math.abs(kpis.estimatedCost?.change || 0), 'INR'),
            }}
            icon={<DollarSign className="w-10 h-10" />}
            variant="danger"
          />
          <KPICard
            title="High-Risk Batches"
            value={kpis.highRiskBatches?.count || 0}
            subtitle={`${kpis.watchBatches?.count || 0} on watch`}
            icon={<AlertTriangle className="w-10 h-10" />}
            variant={(kpis.highRiskBatches?.count || 0) > 0 ? 'danger' : 'success'}
          />
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* AI Summary */}
          <Card className="lg:col-span-2 border-l-8 border-l-warning shadow-md">
            <CardHeader className="flex-row items-center justify-between pb-2">
              <div className="flex items-center gap-3">
                <Sparkles className="w-8 h-8 text-primary" />
                <CardTitle className="text-2xl">AI Health Summary</CardTitle>
              </div>
              <SentimentBadge sentiment={kpis.aiSummary?.sentiment} />
            </CardHeader>
            <CardContent>
              <p className="text-xl text-text-primary leading-relaxed mb-6 font-medium">
                {kpis.aiSummary?.text || 'Loading AI insights...'}
              </p>
              
              {kpis.aiSummary?.actionItems && (
                <div className="bg-bg-secondary rounded-lg p-6">
                  <h4 className="text-lg font-bold text-text-secondary mb-4 uppercase tracking-wide">
                    Recommended Actions
                  </h4>
                  <ul className="space-y-4">
                    {kpis.aiSummary.actionItems.map((item: string, idx: number) => (
                      <li key={idx} className="flex items-start gap-3 text-lg">
                        <span className="text-primary mt-1 font-bold">▶</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>

          {/* High-Risk Batches List */}
          <Card className="shadow-md">
            <CardHeader className="flex-row items-center justify-between pb-2">
              <CardTitle className="flex items-center gap-2 text-2xl">
                <AlertTriangle className="w-6 h-6 text-danger" />
                Critical Batches
              </CardTitle>
              <Link href="/batch-risk">
                <Button variant="ghost" size="lg" className="gap-1 text-lg">
                  View All <ArrowRight className="w-5 h-5" />
                </Button>
              </Link>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {(kpis.highRiskBatches?.batches || mockHighRiskBatches).map(
                  (batch: { id: string; batchNumber: string; rejectionRate: number; productionDate: string }) => (
                    <div
                      key={batch.id}
                      className="flex items-center justify-between p-5 bg-danger/5 rounded-lg border border-danger/20 hover:bg-danger/10 transition-colors cursor-pointer"
                    >
                      <div>
                        <p className="text-xl font-bold text-text-primary">
                          {batch.batchNumber}
                        </p>
                        <p className="text-base text-text-secondary mt-1">
                          {formatDate(batch.productionDate)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold text-danger">
                          {formatPercentage(batch.rejectionRate)}
                        </p>
                        <p className="text-base text-text-secondary font-medium">REJECTION</p>
                      </div>
                    </div>
                  )
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
          {/* Trend Chart */}
          <Card className="shadow-md">
            <CardHeader className="flex-row items-center justify-between pb-2">
              <CardTitle className="text-2xl">Rejection Trend (7 Days)</CardTitle>
              <Link href="/trends">
                <Button variant="outline" size="lg" className="gap-1 text-lg">
                  Analysis <ArrowRight className="w-5 h-5" />
                </Button>
              </Link>
            </CardHeader>
            <CardContent>
              <div className="h-96">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={mockTrendData} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorRejection" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#CC0000" stopOpacity={0.2} />
                        <stop offset="95%" stopColor="#CC0000" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E8E8E8" vertical={false} />
                    <XAxis
                      dataKey="date"
                      tickFormatter={(date) => formatDate(date).split(' ').slice(0, 2).join(' ')}
                      tick={{ fontSize: 16, fill: '#333' }}
                      stroke="#666666"
                      dy={10}
                    />
                    <YAxis
                      tickFormatter={(value) => `${value}%`}
                      tick={{ fontSize: 16, fill: '#333' }}
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
                        padding: '12px',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                      }}
                      formatter={(value) => [`${value}%`, 'Rejection Rate']}
                      labelFormatter={(date) => formatDate(date)}
                    />
                    <Area
                      type="monotone"
                      dataKey="rejectionRate"
                      stroke="#CC0000"
                      strokeWidth={4}
                      fillOpacity={1}
                      fill="url(#colorRejection)"
                      activeDot={{ r: 8, strokeWidth: 2, fill: 'white' }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Stage Analysis Chart (New) */}
          <Card className="shadow-md">
            <CardHeader className="flex-row items-center justify-between pb-2">
              <CardTitle className="text-2xl">Rejection by Stage</CardTitle>
              <Link href="/stage-analysis">
                <Button variant="outline" size="lg" className="gap-1 text-lg">
                  Details <ArrowRight className="w-5 h-5" />
                </Button>
              </Link>
            </CardHeader>
            <CardContent>
              <div className="h-96">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={mockStageData} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E8E8E8" vertical={false} />
                    <XAxis
                      dataKey="stage"
                      tick={{ fontSize: 16, fill: '#333', fontWeight: 600 }}
                      stroke="#666666"
                      dy={10}
                    />
                    <YAxis
                      tickFormatter={(value) => `${value}%`}
                      tick={{ fontSize: 16, fill: '#333' }}
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
                        fontSize: '18px',
                        padding: '12px',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                      }}
                      formatter={(value) => [`${value}%`, 'Rejection Rate']}
                    />
                    <Bar
                      dataKey="rejectionRate"
                      fill="#004080"
                      radius={[8, 8, 0, 0]}
                      barSize={60}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}

// KPI Card Component - Executive Version
interface KPICardProps {
  title: string;
  value: string | number;
  change?: {
    value: number;
    direction: 'up' | 'down';
    label: string;
  };
  subtitle?: string;
  icon?: React.ReactNode;
  variant?: 'default' | 'success' | 'warning' | 'danger';
}

function KPICard({ title, value, change, subtitle, icon, variant = 'default' }: KPICardProps) {
  const colorMap = {
    default: 'text-text-primary',
    success: 'text-success',
    warning: 'text-warning',
    danger: 'text-danger',
  };

  const changeColorMap = {
    up: 'text-danger',
    down: 'text-success',
  };

  return (
    <Card className="shadow-sm hover:shadow-md transition-shadow">
      <CardContent className="p-6">
        <div className="flex items-start justify-between mb-4">
          <p className="text-lg font-bold text-text-secondary">{title}</p>
          {icon && (
            <div className={`${colorMap[variant]} opacity-80 bg-gray-50 p-2 rounded-lg`}>{icon}</div>
          )}
        </div>
        
        <div className="flex items-baseline gap-2">
          <p className={`text-5xl font-extrabold ${colorMap[variant]} tracking-tight`}>{value}</p>
        </div>

        <div className="mt-3 flex items-center justify-between">
          {change && (
            <div className="flex items-center gap-2 bg-gray-50 px-2 py-1 rounded">
              {change.direction === 'up' ? (
                <TrendingUp className="w-5 h-5 text-danger" />
              ) : (
                <TrendingDown className="w-5 h-5 text-success" />
              )}
              <span className={`text-lg font-bold ${changeColorMap[change.direction]}`}>
                {typeof change.value === 'number' && change.value > 0 ? '+' : ''}
                {change.label}
              </span>
            </div>
          )}
          {subtitle && (
            <p className="text-lg font-medium text-text-secondary">{subtitle}</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// Sentiment Badge Component
function SentimentBadge({ sentiment }: { sentiment?: string }) {
  const config: Record<string, { label: string; variant: 'success' | 'warning' | 'destructive' | 'default' }> = {
    positive: { label: '✅ Positive Status', variant: 'success' },
    neutral: { label: 'ℹ️ Stable Status', variant: 'default' },
    concerning: { label: '⚠️ Attention Needed', variant: 'warning' },
    critical: { label: '🚨 Critical Risk', variant: 'destructive' },
  };

  const { label, variant } = config[sentiment || 'neutral'] || config.neutral;

  return <Badge variant={variant} className="text-lg px-3 py-1 font-bold uppercase">{label}</Badge>;
}
