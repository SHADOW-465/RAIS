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
        description="Manufacturing rejection overview & insights"
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
        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <KPICard
            title="Overall Rejection Rate"
            value={formatPercentage(kpis.rejectionRate?.current || 0)}
            change={{
              value: kpis.rejectionRate?.change || 0,
              direction: kpis.rejectionRate?.trend as 'up' | 'down',
              label: 'vs last period',
            }}
            icon={<Activity className="w-8 h-8" />}
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
            icon={<Package className="w-8 h-8" />}
            variant="warning"
          />
          <KPICard
            title="Estimated Cost"
            value={formatCurrency(kpis.estimatedCost?.current || 0, 'INR')}
            change={{
              value: Math.abs(kpis.estimatedCost?.change || 0),
              direction: (kpis.estimatedCost?.change || 0) > 0 ? 'up' : 'down',
              label: formatCurrency(Math.abs(kpis.estimatedCost?.change || 0), 'INR'),
            }}
            icon={<DollarSign className="w-8 h-8" />}
            variant="danger"
          />
          <KPICard
            title="High-Risk Batches"
            value={kpis.highRiskBatches?.count || 0}
            subtitle={`${kpis.watchBatches?.count || 0} on watch`}
            icon={<AlertTriangle className="w-8 h-8" />}
            variant={(kpis.highRiskBatches?.count || 0) > 0 ? 'danger' : 'success'}
          />
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* AI Summary */}
          <Card className="lg:col-span-2 border-l-4 border-l-warning">
            <CardHeader className="flex-row items-center justify-between">
              <div className="flex items-center gap-3">
                <Sparkles className="w-6 h-6 text-primary" />
                <CardTitle>AI Health Summary</CardTitle>
              </div>
              <SentimentBadge sentiment={kpis.aiSummary?.sentiment} />
            </CardHeader>
            <CardContent>
              <p className="text-lg text-text-primary leading-relaxed mb-6">
                {kpis.aiSummary?.text || 'Loading AI insights...'}
              </p>
              
              {kpis.aiSummary?.actionItems && (
                <div className="bg-bg-secondary rounded-lg p-4">
                  <h4 className="text-base font-semibold text-text-secondary mb-3">
                    Recommended Actions
                  </h4>
                  <ul className="space-y-2">
                    {kpis.aiSummary.actionItems.map((item: string, idx: number) => (
                      <li key={idx} className="flex items-start gap-2 text-base">
                        <span className="text-primary mt-1">▶</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>

          {/* High-Risk Batches */}
          <Card>
            <CardHeader className="flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-danger" />
                High-Risk Batches
              </CardTitle>
              <Link href="/batch-risk">
                <Button variant="ghost" size="sm" className="gap-1">
                  View All <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {(kpis.highRiskBatches?.batches || mockHighRiskBatches).map(
                  (batch: { id: string; batchNumber: string; rejectionRate: number; productionDate: string }) => (
                    <div
                      key={batch.id}
                      className="flex items-center justify-between p-4 bg-danger/5 rounded-lg border border-danger/20"
                    >
                      <div>
                        <p className="text-lg font-semibold text-text-primary">
                          {batch.batchNumber}
                        </p>
                        <p className="text-sm text-text-secondary">
                          {formatDate(batch.productionDate)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-xl font-bold text-danger">
                          {formatPercentage(batch.rejectionRate)}
                        </p>
                        <p className="text-sm text-text-secondary">rejection</p>
                      </div>
                    </div>
                  )
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Trend Chart */}
        <Card className="mt-6">
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>Rejection Trend (Last 7 Days)</CardTitle>
            <Link href="/trends">
              <Button variant="outline" size="sm" className="gap-1">
                View Details <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={mockTrendData}>
                  <defs>
                    <linearGradient id="colorRejection" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#CC0000" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#CC0000" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E8E8E8" />
                  <XAxis
                    dataKey="date"
                    tickFormatter={(date) => formatDate(date).split(' ').slice(0, 2).join(' ')}
                    tick={{ fontSize: 14 }}
                    stroke="#666666"
                  />
                  <YAxis
                    tickFormatter={(value) => `${value}%`}
                    tick={{ fontSize: 14 }}
                    stroke="#666666"
                    domain={[0, 'auto']}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'white',
                      border: '2px solid #E8E8E8',
                      borderRadius: '8px',
                      fontSize: '16px',
                    }}
                    formatter={(value) => [`${value}%`, 'Rejection Rate']}
                    labelFormatter={(date) => formatDate(date)}
                  />
                  <Area
                    type="monotone"
                    dataKey="rejectionRate"
                    stroke="#CC0000"
                    strokeWidth={3}
                    fillOpacity={1}
                    fill="url(#colorRejection)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link href="/analysis">
            <Card className="hover:border-primary cursor-pointer transition-all border-2 border-transparent">
              <CardContent className="p-6 flex items-center gap-4">
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                  <Activity className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <p className="text-lg font-semibold">Analyze Defects</p>
                  <p className="text-base text-text-secondary">View Pareto analysis</p>
                </div>
              </CardContent>
            </Card>
          </Link>
          <Link href="/settings/upload">
            <Card className="hover:border-primary cursor-pointer transition-all border-2 border-transparent">
              <CardContent className="p-6 flex items-center gap-4">
                <div className="w-12 h-12 bg-success/10 rounded-lg flex items-center justify-center">
                  <Package className="w-6 h-6 text-success" />
                </div>
                <div>
                  <p className="text-lg font-semibold">Upload Data</p>
                  <p className="text-base text-text-secondary">Import Excel files</p>
                </div>
              </CardContent>
            </Card>
          </Link>
          <Link href="/reports">
            <Card className="hover:border-primary cursor-pointer transition-all border-2 border-transparent">
              <CardContent className="p-6 flex items-center gap-4">
                <div className="w-12 h-12 bg-warning/10 rounded-lg flex items-center justify-center">
                  <DollarSign className="w-6 h-6 text-warning" />
                </div>
                <div>
                  <p className="text-lg font-semibold">Generate Report</p>
                  <p className="text-base text-text-secondary">Download summaries</p>
                </div>
              </CardContent>
            </Card>
          </Link>
        </div>
      </div>
    </>
  );
}

// KPI Card Component
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
    <Card>
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <p className="text-base font-medium text-text-secondary mb-2">{title}</p>
            <p className={`text-4xl font-bold ${colorMap[variant]}`}>{value}</p>
            {change && (
              <div className="flex items-center gap-2 mt-2">
                {change.direction === 'up' ? (
                  <TrendingUp className="w-5 h-5 text-danger" />
                ) : (
                  <TrendingDown className="w-5 h-5 text-success" />
                )}
                <span className={`text-base font-medium ${changeColorMap[change.direction]}`}>
                  {typeof change.value === 'number' && change.value > 0 ? '+' : ''}
                  {change.label}
                </span>
              </div>
            )}
            {subtitle && (
              <p className="text-base text-text-secondary mt-2">{subtitle}</p>
            )}
          </div>
          {icon && (
            <div className={`${colorMap[variant]} opacity-50`}>{icon}</div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// Sentiment Badge Component
function SentimentBadge({ sentiment }: { sentiment?: string }) {
  const config: Record<string, { label: string; variant: 'success' | 'warning' | 'destructive' | 'default' }> = {
    positive: { label: '✅ Positive', variant: 'success' },
    neutral: { label: 'ℹ️ Neutral', variant: 'default' },
    concerning: { label: '⚠️ Concerning', variant: 'warning' },
    critical: { label: '🚨 Critical', variant: 'destructive' },
  };

  const { label, variant } = config[sentiment || 'neutral'] || config.neutral;

  return <Badge variant={variant}>{label}</Badge>;
}
