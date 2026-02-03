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
import {
  AlertTriangle,
  Eye,
  RefreshCw,
  Search,
  ChevronRight,
  Package,
  Calendar,
  TrendingUp,
} from 'lucide-react';
import { formatDate, formatPercentage } from '@/lib/utils';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

// Mock batch data
const mockBatches = [
  { id: '1', batchNumber: 'BR-2401', productCode: 'PROD-A1', productName: 'Medical Device A1', producedQuantity: 5000, rejectedQuantity: 760, rejectionRate: 15.2, riskLevel: 'high_risk', productionDate: '2026-02-01', status: 'completed' },
  { id: '2', batchNumber: 'BR-2398', productCode: 'PROD-B2', productName: 'Medical Device B2', producedQuantity: 3000, rejectedQuantity: 384, rejectionRate: 12.8, riskLevel: 'high_risk', productionDate: '2026-01-30', status: 'completed' },
  { id: '3', batchNumber: 'BR-2405', productCode: 'PROD-A1', productName: 'Medical Device A1', producedQuantity: 4500, rejectedQuantity: 518, rejectionRate: 11.5, riskLevel: 'high_risk', productionDate: '2026-02-02', status: 'in_progress' },
  { id: '4', batchNumber: 'BR-2399', productCode: 'PROD-C3', productName: 'Medical Device C3', producedQuantity: 6000, rejectedQuantity: 552, rejectionRate: 9.2, riskLevel: 'watch', productionDate: '2026-01-31', status: 'completed' },
  { id: '5', batchNumber: 'BR-2403', productCode: 'PROD-B2', productName: 'Medical Device B2', producedQuantity: 3500, rejectedQuantity: 298, rejectionRate: 8.5, riskLevel: 'watch', productionDate: '2026-02-01', status: 'in_progress' },
  { id: '6', batchNumber: 'BR-2400', productCode: 'PROD-A1', productName: 'Medical Device A1', producedQuantity: 4800, rejectedQuantity: 384, rejectionRate: 8.0, riskLevel: 'watch', productionDate: '2026-01-31', status: 'completed' },
  { id: '7', batchNumber: 'BR-2402', productCode: 'PROD-C3', productName: 'Medical Device C3', producedQuantity: 5500, rejectedQuantity: 330, rejectionRate: 6.0, riskLevel: 'normal', productionDate: '2026-02-01', status: 'completed' },
  { id: '8', batchNumber: 'BR-2404', productCode: 'PROD-B2', productName: 'Medical Device B2', producedQuantity: 3200, rejectedQuantity: 160, rejectionRate: 5.0, riskLevel: 'normal', productionDate: '2026-02-02', status: 'in_progress' },
];

type RiskLevel = 'high_risk' | 'watch' | 'normal';

const riskConfig: Record<RiskLevel, { label: string; color: string; bgColor: string; icon: React.ReactNode }> = {
  high_risk: {
    label: 'High Risk',
    color: 'text-danger',
    bgColor: 'bg-danger',
    icon: <AlertTriangle className="w-4 h-4" />,
  },
  watch: {
    label: 'Watch',
    color: 'text-warning',
    bgColor: 'bg-warning',
    icon: <Eye className="w-4 h-4" />,
  },
  normal: {
    label: 'Normal',
    color: 'text-success',
    bgColor: 'bg-success',
    icon: <Package className="w-4 h-4" />,
  },
};

export default function BatchRiskPage() {
  const [riskFilter, setRiskFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBatch, setSelectedBatch] = useState<string | null>(null);

  const { data, isLoading, mutate } = useSWR(
    `/api/batches?risk_level=${riskFilter !== 'all' ? riskFilter : ''}`,
    fetcher,
    {
      fallbackData: {
        success: true,
        data: {
          data: mockBatches,
          total: mockBatches.length,
        },
      },
    }
  );

  const batches = data?.data?.data || mockBatches;

  // Filter batches
  const filteredBatches = batches.filter((batch: { riskLevel: string; batchNumber: string; productName: string }) => {
    const matchesRisk = riskFilter === 'all' || batch.riskLevel === riskFilter;
    const matchesSearch =
      !searchTerm ||
      batch.batchNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      batch.productName.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesRisk && matchesSearch;
  });

  // Count by risk level
  const riskCounts = {
    high_risk: batches.filter((b: { riskLevel: string }) => b.riskLevel === 'high_risk').length,
    watch: batches.filter((b: { riskLevel: string }) => b.riskLevel === 'watch').length,
    normal: batches.filter((b: { riskLevel: string }) => b.riskLevel === 'normal').length,
  };

  return (
    <>
      <DashboardHeader
        title="Batch Risk Monitor"
        description="Track and manage high-risk batches"
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
        {/* Risk Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card
            className={`cursor-pointer transition-all border-2 ${riskFilter === 'high_risk' ? 'border-danger' : 'border-transparent hover:border-danger/50'}`}
            onClick={() => setRiskFilter(riskFilter === 'high_risk' ? 'all' : 'high_risk')}
          >
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-base font-medium text-text-secondary mb-2">High Risk</p>
                  <p className="text-5xl font-bold text-danger">{riskCounts.high_risk}</p>
                  <p className="text-base text-text-secondary mt-2">batches need attention</p>
                </div>
                <div className="w-16 h-16 bg-danger/10 rounded-full flex items-center justify-center">
                  <AlertTriangle className="w-8 h-8 text-danger" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card
            className={`cursor-pointer transition-all border-2 ${riskFilter === 'watch' ? 'border-warning' : 'border-transparent hover:border-warning/50'}`}
            onClick={() => setRiskFilter(riskFilter === 'watch' ? 'all' : 'watch')}
          >
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-base font-medium text-text-secondary mb-2">Watch</p>
                  <p className="text-5xl font-bold text-warning">{riskCounts.watch}</p>
                  <p className="text-base text-text-secondary mt-2">batches to monitor</p>
                </div>
                <div className="w-16 h-16 bg-warning/10 rounded-full flex items-center justify-center">
                  <Eye className="w-8 h-8 text-warning" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card
            className={`cursor-pointer transition-all border-2 ${riskFilter === 'normal' ? 'border-success' : 'border-transparent hover:border-success/50'}`}
            onClick={() => setRiskFilter(riskFilter === 'normal' ? 'all' : 'normal')}
          >
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-base font-medium text-text-secondary mb-2">Normal</p>
                  <p className="text-5xl font-bold text-success">{riskCounts.normal}</p>
                  <p className="text-base text-text-secondary mt-2">batches on track</p>
                </div>
                <div className="w-16 h-16 bg-success/10 rounded-full flex items-center justify-center">
                  <Package className="w-8 h-8 text-success" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex flex-wrap gap-4 items-center">
              <div className="flex items-center gap-2 flex-1 min-w-[200px]">
                <Search className="w-5 h-5 text-text-tertiary" />
                <input
                  type="text"
                  placeholder="Search batch number or product..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="flex-1 h-12 px-4 text-lg border-2 border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                />
              </div>
              <Select value={riskFilter} onValueChange={setRiskFilter}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Filter by risk" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Batches</SelectItem>
                  <SelectItem value="high_risk">High Risk Only</SelectItem>
                  <SelectItem value="watch">Watch Only</SelectItem>
                  <SelectItem value="normal">Normal Only</SelectItem>
                </SelectContent>
              </Select>
              {riskFilter !== 'all' && (
                <Button variant="ghost" onClick={() => setRiskFilter('all')}>
                  Clear Filter
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Batch Table */}
        <Card>
          <CardHeader>
            <CardTitle>
              Batch List
              <span className="text-base font-normal text-text-secondary ml-2">
                ({filteredBatches.length} batches)
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Batch</TableHead>
                  <TableHead>Product</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Produced</TableHead>
                  <TableHead className="text-right">Rejected</TableHead>
                  <TableHead className="text-right">Rate</TableHead>
                  <TableHead>Risk</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredBatches.map((batch: {
                  id: string;
                  batchNumber: string;
                  productCode: string;
                  productName: string;
                  producedQuantity: number;
                  rejectedQuantity: number;
                  rejectionRate: number;
                  riskLevel: RiskLevel;
                  productionDate: string;
                  status: string;
                }) => {
                  const risk = riskConfig[batch.riskLevel];
                  return (
                    <TableRow
                      key={batch.id}
                      className={`cursor-pointer ${selectedBatch === batch.id ? 'bg-primary/5' : ''}`}
                      onClick={() => setSelectedBatch(selectedBatch === batch.id ? null : batch.id)}
                    >
                      <TableCell>
                        <span className="font-semibold text-lg">{batch.batchNumber}</span>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{batch.productCode}</p>
                          <p className="text-sm text-text-secondary">{batch.productName}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2 text-text-secondary">
                          <Calendar className="w-4 h-4" />
                          {formatDate(batch.productionDate)}
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {batch.producedQuantity.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right font-medium text-danger">
                        {batch.rejectedQuantity.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <span className={`text-lg font-bold ${risk.color}`}>
                          {formatPercentage(batch.rejectionRate)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge variant={batch.riskLevel as 'high_risk' | 'watch' | 'normal'} className="gap-1">
                          {risk.icon}
                          {risk.label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={batch.status === 'completed' ? 'success' : 'secondary'}>
                          {batch.status === 'completed' ? 'Completed' : 'In Progress'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <ChevronRight className="w-5 h-5 text-text-tertiary" />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>

            {filteredBatches.length === 0 && (
              <div className="text-center py-12 text-text-secondary">
                <Package className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p className="text-lg">No batches found matching your criteria</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Risk Thresholds Info */}
        <Card className="mt-6">
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold mb-4">Risk Classification Thresholds</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex items-center gap-3 p-4 bg-danger/10 rounded-lg border border-danger/30">
                <AlertTriangle className="w-6 h-6 text-danger" />
                <div>
                  <p className="font-semibold text-danger">High Risk</p>
                  <p className="text-sm text-text-secondary">Rejection rate ≥ 15%</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-4 bg-warning/10 rounded-lg border border-warning/30">
                <Eye className="w-6 h-6 text-warning" />
                <div>
                  <p className="font-semibold text-warning">Watch</p>
                  <p className="text-sm text-text-secondary">Rejection rate 8% - 15%</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-4 bg-success/10 rounded-lg border border-success/30">
                <Package className="w-6 h-6 text-success" />
                <div>
                  <p className="font-semibold text-success">Normal</p>
                  <p className="text-sm text-text-secondary">Rejection rate &lt; 8%</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
