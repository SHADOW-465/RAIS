'use client';

import React, { useState } from 'react';
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
import { RefreshCw, Sparkles, AlertCircle, CheckCircle } from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Line,
  ComposedChart,
  Cell,
} from 'recharts';
import { formatPercentage } from '@/lib/utils';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

// Mock Pareto data
const mockParetoData = [
  { type: 'Visual Defects', category: 'visual', count: 456, percentage: 38, cumulativePercentage: 38 },
  { type: 'Dimensional Issues', category: 'dimensional', count: 234, percentage: 19, cumulativePercentage: 57 },
  { type: 'Functional Failures', category: 'functional', count: 189, percentage: 16, cumulativePercentage: 73 },
  { type: 'Material Defects', category: 'material', count: 145, percentage: 12, cumulativePercentage: 85 },
  { type: 'Surface Scratches', category: 'visual', count: 89, percentage: 7, cumulativePercentage: 92 },
  { type: 'Assembly Errors', category: 'other', count: 56, percentage: 5, cumulativePercentage: 97 },
  { type: 'Other', category: 'other', count: 35, percentage: 3, cumulativePercentage: 100 },
];

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

  const { data, isLoading, mutate } = useSWR(
    `/api/analytics/pareto?period=${period}`,
    fetcher,
    {
      fallbackData: {
        success: true,
        data: {
          defects: mockParetoData,
          total: mockParetoData.reduce((sum, d) => sum + d.count, 0),
          rootCause: {
            text: 'Visual defects show a 23% increase over the past week. Primary contributor appears to be Batch BR-2401 from supplier S-401. The defect pattern correlates with a new material batch received on Jan 28.',
            confidence: 0.78,
            actionItems: [
              'Inspect remaining inventory from supplier S-401',
              'Review material specifications with supplier',
              'Increase visual inspection frequency for assembly stage',
            ],
          },
        },
      },
    }
  );

  const paretoData = data?.data?.defects || mockParetoData;
  const total = data?.data?.total || 1204;
  const rootCause = data?.data?.rootCause;

  // Find 80% threshold for Pareto
  const threshold80 = paretoData.findIndex(
    (d: { cumulativePercentage: number }) => d.cumulativePercentage >= 80
  );

  return (
    <>
      <DashboardHeader
        title="Defect Analysis"
        description="Pareto analysis and root cause insights"
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
                <SelectItem value="30d">Last 30 Days</SelectItem>
                <SelectItem value="60d">Last 60 Days</SelectItem>
                <SelectItem value="90d">Last 90 Days</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <p className="text-base font-medium text-text-secondary mb-2">Total Defects</p>
              <p className="text-4xl font-bold text-danger">{total.toLocaleString()}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <p className="text-base font-medium text-text-secondary mb-2">Top Contributor</p>
              <p className="text-2xl font-bold text-text-primary">{paretoData[0]?.type}</p>
              <p className="text-lg text-danger mt-1">{paretoData[0]?.percentage}% of total</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <p className="text-base font-medium text-text-secondary mb-2">80% Caused By</p>
              <p className="text-4xl font-bold text-warning">{threshold80 + 1}</p>
              <p className="text-base text-text-secondary mt-1">defect types</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <p className="text-base font-medium text-text-secondary mb-2">Categories</p>
              <div className="flex flex-wrap gap-2 mt-2">
                {Object.entries(categoryColors).slice(0, 4).map(([cat, color]) => (
                  <Badge key={cat} style={{ backgroundColor: color }} className="text-white">
                    {cat}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Pareto Chart */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Defect Pareto Chart (80/20 Rule)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-96">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={paretoData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E8E8E8" />
                  <XAxis
                    dataKey="type"
                    tick={{ fontSize: 12 }}
                    stroke="#666666"
                    interval={0}
                    angle={-20}
                    textAnchor="end"
                    height={80}
                  />
                  <YAxis
                    yAxisId="left"
                    tick={{ fontSize: 14 }}
                    stroke="#666666"
                  />
                  <YAxis
                    yAxisId="right"
                    orientation="right"
                    tickFormatter={(value) => `${value}%`}
                    tick={{ fontSize: 14 }}
                    stroke="#666666"
                    domain={[0, 100]}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'white',
                      border: '2px solid #E8E8E8',
                      borderRadius: '8px',
                      fontSize: '16px',
                    }}
                    formatter={(value, name) => {
                      if (name === 'count') return [Number(value).toLocaleString(), 'Count'];
                      return [`${value}%`, 'Cumulative %'];
                    }}
                  />
                  <Bar
                    yAxisId="left"
                    dataKey="count"
                    name="Count"
                    radius={[4, 4, 0, 0]}
                  >
                    {paretoData.map((entry: { category: string }, index: number) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={categoryColors[entry.category] || '#666666'}
                        opacity={index <= threshold80 ? 1 : 0.5}
                      />
                    ))}
                  </Bar>
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="cumulativePercentage"
                    stroke="#0066CC"
                    strokeWidth={3}
                    dot={{ fill: '#0066CC', r: 5 }}
                    name="Cumulative %"
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-4 p-4 bg-info/10 rounded-lg border border-info/30">
              <p className="text-base text-info font-medium">
                💡 The first {threshold80 + 1} defect types account for {paretoData[threshold80]?.cumulativePercentage}% of all defects.
                Focus improvement efforts on these categories for maximum impact.
              </p>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Defect Breakdown Table */}
          <Card>
            <CardHeader>
              <CardTitle>Defect Breakdown</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Defect Type</TableHead>
                    <TableHead className="text-right">Count</TableHead>
                    <TableHead className="text-right">% of Total</TableHead>
                    <TableHead className="text-right">Cumulative</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paretoData.map((defect: { type: string; category: string; count: number; percentage: number; cumulativePercentage: number }, index: number) => (
                    <TableRow
                      key={defect.type}
                      className={`cursor-pointer ${selectedDefect === defect.type ? 'bg-primary/10' : ''}`}
                      onClick={() => setSelectedDefect(defect.type === selectedDefect ? null : defect.type)}
                    >
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: categoryColors[defect.category] }}
                          />
                          <span className={index <= threshold80 ? 'font-semibold' : ''}>
                            {defect.type}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {defect.count.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatPercentage(defect.percentage)}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatPercentage(defect.cumulativePercentage)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* AI Root Cause Analysis */}
          <Card className="border-l-4 border-l-primary">
            <CardHeader>
              <div className="flex items-center gap-3">
                <Sparkles className="w-6 h-6 text-primary" />
                <CardTitle>AI Root Cause Analysis</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              {rootCause ? (
                <>
                  <p className="text-lg text-text-primary leading-relaxed mb-6">
                    {rootCause.text}
                  </p>

                  <div className="mb-6">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-base font-medium text-text-secondary">
                        Confidence Level
                      </span>
                      <span className="text-base font-bold">
                        {Math.round(rootCause.confidence * 100)}%
                      </span>
                    </div>
                    <div className="h-3 bg-bg-tertiary rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary transition-all"
                        style={{ width: `${rootCause.confidence * 100}%` }}
                      />
                    </div>
                  </div>

                  <div className="bg-bg-secondary rounded-lg p-4">
                    <h4 className="text-base font-semibold text-text-secondary mb-3">
                      Recommended Actions
                    </h4>
                    <ul className="space-y-3">
                      {rootCause.actionItems.map((item: string, idx: number) => (
                        <li key={idx} className="flex items-start gap-3 text-base">
                          <CheckCircle className="w-5 h-5 text-success mt-0.5 flex-shrink-0" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </>
              ) : (
                <div className="flex items-center justify-center py-12 text-text-secondary">
                  <AlertCircle className="w-6 h-6 mr-2" />
                  <span>Select a defect type to see AI analysis</span>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
