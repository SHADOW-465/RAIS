'use client';

import React, { useState, useEffect } from 'react';
import useSWR from 'swr';
import { DashboardHeader } from '@/components/layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { RefreshCw, Sparkles, CheckCircle, Loader2, AlertTriangle, BarChart3 } from 'lucide-react';
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

// API Response Types
interface ParetoDefect {
  type: string;
  category: string | null;
  count: number;
  percentage: number;
  cumulativePercentage: number;
}

interface RootCauseData {
  text: string;
  confidence: number;
  actionItems: string[];
}

interface ParetoResponse {
  success: boolean;
  data: {
    defects: ParetoDefect[];
    total: number;
    rootCause: RootCauseData | null;
  };
}

const categoryColors: Record<string, string> = {
  visual: '#CC0000',
  dimensional: '#CC6600',
  functional: '#0066CC',
  material: '#006600',
  other: '#666666',
};

export default function AnalysisPage() {
  const [period, setPeriod] = useState('30d');
  const [selectedDefect, setSelectedDefect] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const { data, isLoading, error, mutate } = useSWR<ParetoResponse>(
    `/api/analytics/pareto?period=${period}`,
    fetcher,
    {
      refreshInterval: 60000,
    }
  );

  // Use API data only - no fallbacks
  const paretoData = data?.data?.defects || [];
  const rootCause = data?.data?.rootCause || null;
  const total = data?.data?.total || paretoData.reduce((sum, d) => sum + d.count, 0);

  return (
    <>
      <DashboardHeader
        title="Defect Analysis"
        description="Pareto analysis and root cause insights"
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
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-700">
              Error loading analysis data. Displaying cached data.
            </p>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Pareto Chart */}
          <Card className="lg:col-span-2 shadow-md">
            <CardHeader>
              <CardTitle className="text-2xl">Defect Pareto Analysis (80/20 Rule)</CardTitle>
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
                  <div className="h-full flex items-center justify-center text-gray-500">
                    No defect data available
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={paretoData} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#E8E8E8" vertical={false} />
                      <XAxis
                        dataKey="type"
                        tick={{ fontSize: 16, fill: '#333', fontWeight: 600 }}
                        angle={-45}
                        textAnchor="end"
                        height={80}
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
                          if (name === 'count') return [Number(value).toLocaleString(), 'Count'];
                          return [`${value}%`, 'Cumulative %'];
                        }}
                      />
                      <Legend 
                        wrapperStyle={{ paddingTop: '20px', fontSize: '18px' }}
                        iconSize={20}
                      />
                      <Bar
                        yAxisId="left"
                        dataKey="count"
                        name="Count"
                        barSize={60}
                        onClick={(data) => {
                          if (data && data.payload && data.payload.type) {
                            setSelectedDefect(data.payload.type);
                          }
                        }}
                        cursor="pointer"
                      >
                        {paretoData.map((entry, index: number) => (
                          <Cell 
                            key={`cell-${index}`} 
                            fill={categoryColors[entry.category || 'other'] || '#666666'} 
                            strokeWidth={selectedDefect === entry.type ? 2 : 0}
                            stroke="#000"
                          />
                        ))}
                      </Bar>
                      <Line
                        yAxisId="right"
                        type="monotone"
                        dataKey="cumulativePercentage"
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
            <Card className="border-l-8 border-l-primary shadow-md">
              <CardHeader className="flex-row items-center gap-3 pb-2">
                <Sparkles className="w-8 h-8 text-primary" />
                <CardTitle className="text-2xl">AI Root Cause Analysis</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="bg-primary/5 p-6 rounded-lg mb-6">
                  <p className="text-xl text-text-primary leading-relaxed font-medium">
                    {rootCause?.text || 'Analyzing defect patterns...'}
                  </p>
                  {rootCause?.confidence !== undefined && rootCause.confidence > 0 && (
                    <div className="mt-4 flex items-center gap-2">
                      <Badge variant="outline" className="text-lg px-3 py-1">
                        Confidence: {formatPercentage(rootCause.confidence * 100)}
                      </Badge>
                    </div>
                  )}
                </div>

                {rootCause?.actionItems && rootCause.actionItems.length > 0 && (
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
              </CardContent>
            </Card>

            {/* Defect Breakdown Table */}
            <Card className="shadow-md">
              <CardHeader>
                <CardTitle className="text-2xl">Defect Breakdown</CardTitle>
                <p className="text-sm text-text-secondary mt-1">
                  Total defects: {total.toLocaleString()}
                </p>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-bg-secondary hover:bg-bg-secondary">
                      <TableHead className="text-lg font-bold h-14">Defect Type</TableHead>
                      <TableHead className="text-lg font-bold h-14 text-right">Count</TableHead>
                      <TableHead className="text-lg font-bold h-14 text-right">%</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paretoData.map((defect: ParetoDefect) => (
                      <TableRow 
                        key={defect.type}
                        className={selectedDefect === defect.type ? 'bg-primary/5' : ''}
                        onClick={() => setSelectedDefect(defect.type)}
                        style={{ cursor: 'pointer' }}
                      >
                        <TableCell className="text-lg font-medium py-4">
                          <div className="flex items-center gap-2">
                            <div 
                              className="w-3 h-3 rounded-full" 
                              style={{ backgroundColor: categoryColors[defect.category || 'other'] || '#666666' }}
                            />
                            {defect.type}
                          </div>
                        </TableCell>
                        <TableCell className="text-lg py-4 text-right">{defect.count.toLocaleString()}</TableCell>
                        <TableCell className="text-lg py-4 text-right font-bold">{defect.percentage}%</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </>
  );
}
