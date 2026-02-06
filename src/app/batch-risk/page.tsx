'use client';

import React, { useState, useEffect } from 'react';
import useSWR from 'swr';
import { DashboardHeader } from '@/components/layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertTriangle,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  ShieldAlert,
  CheckCircle,
  Clock,
  Package,
  Loader2,
  Upload,
  BarChart3,
} from 'lucide-react';
import Link from 'next/link';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { formatPercentage, formatDate } from '@/lib/utils';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

interface BatchRiskData {
  batchId: string;
  batchNumber: string;
  product: string;
  productionDate: string;
  inspectionStage: string;
  totalQuantity: number;
  rejectedQuantity: number;
  rejectionRate: number;
  riskLevel: 'critical' | 'high' | 'medium' | 'low';
  riskScore: number;
  topDefects: string[];
  supplier: string;
  trend: 'worsening' | 'stable' | 'improving';
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

const riskConfig: Record<string, { color: string; bgColor: string; textColor: string; label: string }> = {
  critical: { color: '#CC0000', bgColor: 'bg-red-100', textColor: 'text-red-700', label: 'Critical' },
  high: { color: '#CC6600', bgColor: 'bg-orange-100', textColor: 'text-orange-700', label: 'High' },
  medium: { color: '#CCCC00', bgColor: 'bg-yellow-100', textColor: 'text-yellow-700', label: 'Medium' },
  low: { color: '#006600', bgColor: 'bg-green-100', textColor: 'text-green-700', label: 'Low' },
};

export default function BatchRiskPage() {
  const [period, setPeriod] = useState('30d');
  const [riskFilter, setRiskFilter] = useState('all');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Check data availability first
  const { data: qualityData, isLoading: isQualityLoading } = useSWR<
    { success: boolean; data: DataQualityResponse }
  >('/api/analytics/data-quality', fetcher);

  const hasData = qualityData?.data?.hasData || false;

  // Fetch batch risk data from overview API (which includes batch info)
  const { data, isLoading, error, mutate } = useSWR<{ success: boolean; data: any }>(
    hasData ? `/api/analytics/overview?period=${period}` : null,
    fetcher,
    {
      refreshInterval: 60000,
    }
  );

  // Transform overview data into batch risk format
  // In a real implementation, you'd have a dedicated batch-risk API
  const batches: BatchRiskData[] = React.useMemo(() => {
    if (!data?.data) return [];
    
    // Generate synthetic batch data from overview stats for demonstration
    // In production, this would come from a dedicated API endpoint
    const overview = data.data;
    const sampleBatches: BatchRiskData[] = [];
    
    // If we have real production data, we'd map it here
    // For now, return empty to show the "no data" state properly
    return sampleBatches;
  }, [data]);

  // Filter batches by risk level
  const filteredBatches = batches.filter((batch) => 
    riskFilter === 'all' || batch.riskLevel === riskFilter
  );

  // Sort by risk score (highest first)
  const sortedBatches = [...filteredBatches].sort((a, b) => b.riskScore - a.riskScore);

  // Calculate summary stats
  const criticalCount = batches.filter((b) => b.riskLevel === 'critical').length;
  const highCount = batches.filter((b) => b.riskLevel === 'high').length;
  const avgRiskScore = batches.length > 0 
    ? batches.reduce((sum, b) => sum + b.riskScore, 0) / batches.length 
    : 0;

  // Risk distribution for chart
  const riskDistribution = [
    { name: 'Critical', count: criticalCount, color: riskConfig.critical.color },
    { name: 'High', count: highCount, color: riskConfig.high.color },
    { name: 'Medium', count: batches.filter((b) => b.riskLevel === 'medium').length, color: riskConfig.medium.color },
    { name: 'Low', count: batches.filter((b) => b.riskLevel === 'low').length, color: riskConfig.low.color },
  ];

  // Show empty state if no data
  if (!isQualityLoading && !hasData) {
    return (
      <>
        <DashboardHeader
          title="Batch Risk Analysis"
          description="Identify and monitor high-risk production batches"
        />
        <div className="flex-1 p-8 overflow-auto bg-gray-50">
          <div className="max-w-2xl mx-auto mt-16">
            <Card className="shadow-lg">
              <CardContent className="p-12 text-center">
                <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gray-100 flex items-center justify-center">
                  <Upload className="w-10 h-10 text-gray-400" />
                </div>
                <h2 className="text-2xl font-bold text-gray-800 mb-3">No Batch Data Available</h2>
                <p className="text-gray-600 mb-6">
                  Upload production data to see batch risk analysis and identify high-risk batches.
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
      <DashboardHeader
        title="Batch Risk Analysis"
        description="Identify and monitor high-risk production batches"
        actions={
          <div className="flex items-center gap-4">
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
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-red-500" />
            <p className="text-red-700">
              Error loading batch data. Please try refreshing.
            </p>
          </div>
        )}

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card className="border-l-4 border-l-red-500">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-base font-medium text-text-secondary mb-2">Critical Risk</p>
                  <p className="text-4xl font-bold text-red-600">{criticalCount}</p>
                  <p className="text-base text-text-secondary mt-2">batches</p>
                </div>
                <ShieldAlert className="w-10 h-10 text-red-500 opacity-50" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-orange-500">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-base font-medium text-text-secondary mb-2">High Risk</p>
                  <p className="text-4xl font-bold text-orange-600">{highCount}</p>
                  <p className="text-base text-text-secondary mt-2">batches</p>
                </div>
                <AlertTriangle className="w-10 h-10 text-orange-500 opacity-50" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <p className="text-base font-medium text-text-secondary mb-2">Total Batches</p>
              <p className="text-4xl font-bold text-text-primary">{batches.length}</p>
              <p className="text-base text-text-secondary mt-2">monitored</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <p className="text-base font-medium text-text-secondary mb-2">Avg. Risk Score</p>
              <p className="text-4xl font-bold text-primary">{avgRiskScore.toFixed(1)}</p>
              <p className="text-base text-text-secondary mt-2">out of 100</p>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-4 mb-6">
          <div className="flex items-center gap-2">
            <span className="text-base font-medium text-text-secondary">Period:</span>
            <Select value={period} onValueChange={setPeriod}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7d">Last 7 Days</SelectItem>
                <SelectItem value="30d">Last 30 Days</SelectItem>
                <SelectItem value="90d">Last 90 Days</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-base font-medium text-text-secondary">Risk Level:</span>
            <Select value={riskFilter} onValueChange={setRiskFilter}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Levels</SelectItem>
                <SelectItem value="critical">Critical Only</SelectItem>
                <SelectItem value="high">High Only</SelectItem>
                <SelectItem value="medium">Medium Only</SelectItem>
                <SelectItem value="low">Low Only</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Risk Distribution Chart */}
          <Card className="shadow-md">
            <CardHeader>
              <CardTitle className="text-xl">Risk Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                {!mounted ? (
                  <div className="h-full flex items-center justify-center text-gray-500">
                    <Loader2 className="w-8 h-8 animate-spin" />
                  </div>
                ) : batches.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-gray-500">
                    <BarChart3 className="w-12 h-12 mb-3 text-gray-300" />
                    <p>No batch data available</p>
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={riskDistribution} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="#E8E8E8" />
                      <XAxis type="number" />
                      <YAxis 
                        type="category" 
                        dataKey="name" 
                        width={80}
                        tick={{ fontSize: 14, fill: '#333' }}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'white',
                          border: '2px solid #E8E8E8',
                          borderRadius: '8px',
                          fontSize: '14px',
                        }}
                      />
                      <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                        {riskDistribution.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Batch Risk Table */}
          <Card className="lg:col-span-2 shadow-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xl">
                <Package className="w-6 h-6" />
                High-Risk Batches
                {isLoading && <Loader2 className="w-5 h-5 animate-spin text-gray-400" />}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {sortedBatches.length === 0 ? (
                <div className="p-12 text-center">
                  <CheckCircle className="w-16 h-16 mx-auto mb-4 text-green-400" />
                  <h3 className="text-xl font-semibold text-gray-700 mb-2">No High-Risk Batches</h3>
                  <p className="text-gray-500">
                    {batches.length === 0 
                      ? 'Upload production data to see batch risk analysis.'
                      : 'All batches are within acceptable risk thresholds.'}
                  </p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="bg-bg-secondary hover:bg-bg-secondary">
                      <TableHead className="text-base font-bold h-12">Batch</TableHead>
                      <TableHead className="text-base font-bold h-12">Product</TableHead>
                      <TableHead className="text-base font-bold h-12 text-right">Rejection</TableHead>
                      <TableHead className="text-base font-bold h-12">Risk</TableHead>
                      <TableHead className="text-base font-bold h-12">Trend</TableHead>
                      <TableHead className="text-base font-bold h-12">Top Defects</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sortedBatches.slice(0, 10).map((batch) => {
                      const risk = riskConfig[batch.riskLevel];
                      return (
                        <TableRow key={batch.batchId} className="hover:bg-gray-50">
                          <TableCell className="py-4">
                            <div>
                              <p className="font-semibold text-base">{batch.batchNumber}</p>
                              <p className="text-sm text-text-secondary">{formatDate(batch.productionDate)}</p>
                            </div>
                          </TableCell>
                          <TableCell className="text-base">{batch.product}</TableCell>
                          <TableCell className="text-right">
                            <span className={`text-lg font-bold ${risk.textColor}`}>
                              {formatPercentage(batch.rejectionRate)}
                            </span>
                          </TableCell>
                          <TableCell>
                            <Badge className={`${risk.bgColor} ${risk.textColor} border-0`}>
                              {risk.label}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {batch.trend === 'worsening' ? (
                              <div className="flex items-center gap-1 text-red-600">
                                <TrendingUp className="w-4 h-4" />
                                <span className="text-sm font-medium">Worsening</span>
                              </div>
                            ) : batch.trend === 'improving' ? (
                              <div className="flex items-center gap-1 text-green-600">
                                <TrendingDown className="w-4 h-4" />
                                <span className="text-sm font-medium">Improving</span>
                              </div>
                            ) : (
                              <span className="text-sm text-text-secondary">Stable</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-1">
                              {batch.topDefects.slice(0, 2).map((defect, idx) => (
                                <Badge key={idx} variant="outline" className="text-xs">
                                  {defect}
                                </Badge>
                              ))}
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Risk Score Legend */}
        <Card className="mt-8">
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold mb-4">Risk Level Criteria</h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="flex items-center gap-3 p-3 bg-red-50 rounded-lg">
                <ShieldAlert className="w-6 h-6 text-red-600" />
                <div>
                  <p className="font-semibold text-red-700">Critical</p>
                  <p className="text-sm text-gray-600">Rejection &gt; 20%</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-orange-50 rounded-lg">
                <AlertTriangle className="w-6 h-6 text-orange-600" />
                <div>
                  <p className="font-semibold text-orange-700">High</p>
                  <p className="text-sm text-gray-600">Rejection 15-20%</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-yellow-50 rounded-lg">
                <Clock className="w-6 h-6 text-yellow-600" />
                <div>
                  <p className="font-semibold text-yellow-700">Medium</p>
                  <p className="text-sm text-gray-600">Rejection 8-15%</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg">
                <CheckCircle className="w-6 h-6 text-green-600" />
                <div>
                  <p className="font-semibold text-green-700">Low</p>
                  <p className="text-sm text-gray-600">Rejection &lt; 8%</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
