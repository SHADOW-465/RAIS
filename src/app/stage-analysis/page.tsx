'use client';

import React, { useState } from 'react';
import { DashboardHeader } from '@/components/layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
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
import { ArrowUpRight, ArrowDownRight, Minus } from 'lucide-react';
import { formatPercentage } from '@/lib/utils';

// Mock Data
const mockStageData = [
  { stage: 'Material Incoming', count: 145, percentage: 12.0, trend: 'up' },
  { stage: 'Assembly', count: 450, percentage: 37.4, trend: 'stable' },
  { stage: 'Visual Inspection', count: 380, percentage: 31.6, trend: 'up' },
  { stage: 'Integrity Test', count: 180, percentage: 14.9, trend: 'down' },
  { stage: 'Packaging', count: 49, percentage: 4.1, trend: 'down' },
];

export default function StageAnalysisPage() {
  const [viewMode, setViewMode] = useState<'percentage' | 'count'>('percentage');

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up': return <ArrowUpRight className="w-6 h-6 text-danger" />;
      case 'down': return <ArrowDownRight className="w-6 h-6 text-success" />;
      default: return <Minus className="w-6 h-6 text-text-tertiary" />;
    }
  };

  return (
    <>
      <DashboardHeader
        title="Stage / Process Analysis"
        description="Identify where defects originate in the production line"
      />

      <div className="flex-1 p-8 overflow-auto">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Chart */}
          <Card className="lg:col-span-2 shadow-md">
            <CardHeader className="flex-row items-center justify-between pb-2">
              <CardTitle className="text-2xl">Rejection Distribution by Stage</CardTitle>
              <Tabs value={viewMode} onValueChange={(v: string) => setViewMode(v as 'percentage' | 'count')}>
                <TabsList className="h-12">
                  <TabsTrigger value="percentage" className="text-lg px-6 h-10">By %</TabsTrigger>
                  <TabsTrigger value="count" className="text-lg px-6 h-10">By Count</TabsTrigger>
                </TabsList>
              </Tabs>
            </CardHeader>
            <CardContent>
              <div className="h-[600px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart 
                    data={mockStageData} 
                    layout="vertical" 
                    margin={{ top: 20, right: 30, left: 100, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#E8E8E8" horizontal={true} vertical={false} />
                    <XAxis
                      type="number"
                      tick={{ fontSize: 16, fill: '#333' }}
                      stroke="#666666"
                      tickFormatter={(val) => viewMode === 'percentage' ? `${val}%` : val.toLocaleString()}
                    />
                    <YAxis
                      dataKey="stage"
                      type="category"
                      tick={{ fontSize: 18, fill: '#333', fontWeight: 600 }}
                      stroke="#666666"
                      width={180}
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
                      formatter={(value) => [
                        viewMode === 'percentage' ? `${value}%` : Number(value).toLocaleString(),
                        viewMode === 'percentage' ? 'Rejection Rate' : 'Defect Count'
                      ]}
                    />
                    <Bar
                      dataKey={viewMode}
                      fill="#0066CC"
                      radius={[0, 8, 8, 0]}
                      barSize={60}
                    >
                      {mockStageData.map((entry, index) => (
                        <Cell 
                          key={`cell-${index}`} 
                          fill={index === 1 ? '#CC0000' : '#0066CC'} // Highlight highest
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Summary Table */}
          <Card className="shadow-md h-full">
            <CardHeader>
              <CardTitle className="text-2xl">Stage Performance</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="bg-bg-secondary hover:bg-bg-secondary">
                    <TableHead className="text-lg font-bold h-16 pl-6">Stage</TableHead>
                    <TableHead className="text-lg font-bold h-16 text-right">Defects</TableHead>
                    <TableHead className="text-lg font-bold h-16 text-center">Trend</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {mockStageData.map((stage) => (
                    <TableRow key={stage.stage} className="h-20 hover:bg-bg-secondary/50">
                      <TableCell className="text-lg font-bold text-text-primary pl-6">
                        {stage.stage}
                        <div className="text-base font-normal text-text-secondary mt-1">
                          {formatPercentage(stage.percentage)} of total
                        </div>
                      </TableCell>
                      <TableCell className="text-xl font-bold text-text-primary text-right">
                        {stage.count.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex justify-center items-center">
                          {getTrendIcon(stage.trend)}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
