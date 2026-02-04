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
import { RefreshCw, Sparkles, CheckCircle, Loader2, AlertTriangle, BarChart3, Upload } from 'lucide-react';
import Link from 'next/link';
import {
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Line,
  ComposedChart,
  Cell,
  Legend,
} from 'recharts';
import { formatPercentage } from '@/lib/utils';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

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

interface RootCauseResponse {
  text: string;
  confidence: number;
  actionItems: string[];
  generatedAt: string;
}

const categoryColors: Record<string, string> = {
  visual: '#CC0000',
  dimensional: '#CC6600',
  functional: '#0066CC',
  material: '#006600',
  other: '#666666',
};

const severityColors: Record<string, string> = {
  critical: '#CC0000',
  major: '#CC6600',
  minor: '#0066CC',
};

export default function AnalysisPage() {
  const [period, setPeriod] = useState('30d');
  const [selectedDefect, setSelectedDefect] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Check data availability first
  const { data: qualityData, isLoading: isQualityLoading } = useSWR<
    { success: boolean; data: DataQualityResponse }
  >('/api/analytics/data-quality', fetcher);

  const hasData = qualityData?.data?.hasData || false;

  const { data, isLoading, error, mutate } = useSWR<{ success: boolean; data: ParetoResponse }>(
    hasData ? `/api/analytics/pareto` : null,
    fetcher,
    {
      refreshInterval: 60000,
    }
  );

  // Use API data only - no fallbacks
  const paretoData = data?.data?.defects || [];
  const totalDefects = data?.data?.total_defects || 0;
  const top80Count = data?.data?.top_80_pct_count || 0;

  // Auto-select first defect if none selected
  useEffect(() => {
    if (paretoData.length > 0 && !selectedDefect) {
      setSelectedDefect(paretoData[0].defect_code);
    }
  }, [paretoData, selectedDefect]);

  // Fetch Root Cause Analysis
  const { data: rootCauseData, isLoading: isRootCauseLoading } = useSWR<
    { success: boolean; data: RootCauseResponse }
  >(
    hasData && selectedDefect ? `/api/ai/root-cause?defect=${selectedDefect}&period=${period}` : null,
    fetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 600000, // 10 minutes cache
    }
  );

  const rootCause = rootCauseData?.data;

  // Show empty state if no data
  if (!isQualityLoading && !hasData) {
    return (
      <>
        <DashboardHeader
          title="Defect Analysis"
          description="Pareto analysis and root cause insights"
        />
        <div className="flex-1 p-8 overflow-auto bg-gray-50">
          <div className="max-w-2xl mx-auto mt-16">
            <Card className="shadow-lg">
              <CardContent className="p-12 text-center">
                <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gray-100 flex items-center justify-center">
                  <Upload className="w-10 h-10 text-gray-400" />
                </div>
                <h2 className="text-2xl font-bold text-gray-800 mb-3">No Defect Data Available</h2>
                <p className="text-gray-600 mb-6">
                  Upload Excel files to see defect analysis and Pareto charts.
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
        title="Defect Analysis"
        description="Pareto analysis and root cause insights"
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
              Error loading analysis data. Please try refreshing.
            </p>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Pareto Chart */}
          <Card className="lg:col-span-2 shadow-md">
            <CardHeader>
              <CardTitle className="text-2xl">Defect Pareto Analysis (80/20 Rule)</CardTitle>
              {top80Count > 0 && (
                <p className="text-sm text-text-secondary mt-1">
                  Top {top80Count} defect types account for ~80% of all defects
                </p>
              )}
              {isLoading && (
                <div className="flex items-center gap-2 text-text-secondary">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Loading data...</span>
                </div>
              )}
            </CardHeader>
            <CardContent>
              <div className="h-[600px]">
                {!mounted ? (
                  <div className="h-full flex items-center justify-center text-gray-500">
                    Loading Chart...
                  </div>
                ) : paretoData.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-gray-500">
                    <BarChart3 className="w-16 h-16 mb-4 text-gray-300" />
                    <p>No defect data available</p>
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={paretoData} margin={{ top: 20, right: 30, left: 20, bottom: 100 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#E8E8E8" vertical={false} />
                      <XAxis
                        dataKey="display_name"
                        tick={{ fontSize: 14, fill: '#333', fontWeight: 600 }}
                        angle={-45}
                        textAnchor="end"
                        height={100}
                        stroke="#666666"
                      />
                      <YAxis
                        yAxisId="left"
                        tick={{ fontSize: 16, fill: '#333' }}
                        stroke="#666666"
                        label={{ value: 'Defect Count', angle: -90, position: 'insideLeft', fontSize: 16, fill: '#666' }}
                      />
                      <YAxis
                        yAxisId="right"
                        orientation="right"
                        tick={{ fontSize: 16, fill: '#333' }}
                        stroke="#666666"
                        domain={[0, 100]}
                        tickFormatter={(value) => `${value}%`}
                        label={{ value: 'Cumulative %', angle: 90, position: 'insideRight', fontSize: 16, fill: '#666' }}
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
                          if (name === 'total_quantity') return [Number(value).toLocaleString(), 'Count'];
                          return [`${Number(value).toFixed(1)}%`, 'Cumulative %'];
                        }}
                      />
                      <Legend 
                        wrapperStyle={{ paddingTop: '20px', fontSize: '18px' }}
                        iconSize={20}
                      />
                      <Bar
                        yAxisId="left"
                        dataKey="total_quantity"
                        name="Count"
                        barSize={50}
                        onClick={(data) => {
                          if (data && data.payload && data.payload.defect_code) {
                            setSelectedDefect(data.payload.defect_code);
                          }
                        }}
                        cursor="pointer"
                      >
                        {paretoData.map((entry, index: number) => (
                          <Cell 
                            key={`cell-${index}`} 
                            fill={categoryColors[entry.category || 'other'] || severityColors[entry.severity] || '#00CEC9'} 
                            strokeWidth={selectedDefect === entry.defect_code ? 2 : 0}
                            stroke="#000"
                          />
                        ))}
                      </Bar>
                      <Line
                        yAxisId="right"
                        type="monotone"
                        dataKey="cumulative_pct"
                        name="Cumulative %"
                        stroke="#333333"
                        strokeWidth={3}
                        dot={{ r: 6, fill: '#333' }}
                      />
                    </ComposedChart>
                  </ResponsiveContainer>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Right Column: AI Insights & Details */}
          <div className="space-y-8">
            {/* AI Root Cause */}
            {selectedDefect && (
              <Card className="border-l-8 border-l-primary shadow-md">
                <CardHeader className="flex-row items-center gap-3 pb-2">
                  <Sparkles className="w-8 h-8 text-primary" />
                  <div>
                    <CardTitle className="text-2xl">AI Root Cause</CardTitle>
                    <p className="text-sm text-text-secondary">Analyzing: {selectedDefect}</p>
                  </div>
                </CardHeader>
                <CardContent>
                  {isRootCauseLoading && !rootCause ? (
                    <div className="flex flex-col items-center justify-center py-8 text-gray-400">
                      <Sparkles className="w-8 h-8 mb-2 animate-pulse text-primary/50" />
                      <p>Analyzing patterns...</p>
                    </div>
                  ) : rootCause ? (
                    <>
                      <div className="bg-primary/5 p-6 rounded-lg mb-6">
                        <p className="text-xl text-text-primary leading-relaxed font-medium">
                          {rootCause.text}
                        </p>
                        {rootCause.confidence > 0 && (
                          <div className="mt-4 flex items-center gap-2">
                            <Badge variant="outline" className="text-lg px-3 py-1">
                              Confidence: {formatPercentage(rootCause.confidence * 100)}
                            </Badge>
                          </div>
                        )}
                      </div>

                      {rootCause.actionItems && rootCause.actionItems.length > 0 && (
                        <div className="space-y-4">
                          <h4 className="text-lg font-bold text-text-secondary uppercase tracking-wide">
                            Suggested Actions
                          </h4>
                          {rootCause.actionItems.map((item: string, idx: number) => (
                            <div key={idx} className="flex gap-4 p-4 bg-white border border-bg-tertiary rounded-lg shadow-sm">
                              <div className="mt-1">
                                <CheckCircle className="w-6 h-6 text-success" />
                              </div>
                              <p className="text-lg text-text-primary">{item}</p>
                            </div>
                          ))}
                        </div>
                      )}
                    </>
                  ) : (
                    <p className="text-gray-500">Select a defect bar to see AI insights.</p>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Defect Breakdown Table */}
            <Card className="shadow-md">
              <CardHeader>
                <CardTitle className="text-2xl">Defect Breakdown</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {paretoData.length === 0 ? (
                  <div className="p-8 text-center text-gray-500">
                    No defect data available
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-bg-secondary hover:bg-bg-secondary">
                        <TableHead className="text-lg font-bold h-14">Defect Type</TableHead>
                        <TableHead className="text-lg font-bold h-14 text-right">Count</TableHead>
                        <TableHead className="text-lg font-bold h-14 text-right">%</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paretoData.slice(0, 10).map((defect: DefectPareto) => (
                        <TableRow 
                          key={defect.defect_code}
                          className={selectedDefect === defect.defect_code ? 'bg-primary/5' : ''}
                          onClick={() => setSelectedDefect(defect.defect_code)}
                          style={{ cursor: 'pointer' }}
                        >
                          <TableCell className="text-lg font-medium py-4">
                            <div className="flex items-center gap-2">
                              <div 
                                className="w-3 h-3 rounded-full" 
                                style={{ backgroundColor: categoryColors[defect.category || 'other'] || '#666666' }}
                              />
                              {defect.display_name}
                            </div>
                          </TableCell>
                          <TableCell className="text-lg py-4 text-right">{defect.total_quantity.toLocaleString()}</TableCell>
                          <TableCell className="text-lg py-4 text-right font-bold">{defect.percentage.toFixed(1)}%</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </>
  );
}
