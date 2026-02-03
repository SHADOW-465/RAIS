'use client';

import React, { useState } from 'react';
import useSWR from 'swr';
import { DashboardHeader } from '@/components/layout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
  Package,
  CheckCircle,
  ShieldAlert,
  Loader2,
} from 'lucide-react';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

type RiskLevel = 'high_risk' | 'watch' | 'normal';

interface BatchData {
  id: string;
  batchNumber: string;
  batch_number: string;
  defectSummary?: string;
  riskLevel: RiskLevel;
  risk_level: RiskLevel;
  rejectionRate?: number;
  rejection_rate?: number;
  productionDate?: string;
  production_date?: string;
  topDefect?: string;
}

const riskConfig: Record<RiskLevel, { label: string; color: string; bgColor: string; icon: React.ReactNode }> = {
  high_risk: {
    label: 'HIGH RISK',
    color: 'text-white',
    bgColor: 'bg-danger',
    icon: <AlertTriangle className="w-5 h-5" />,
  },
  watch: {
    label: 'WATCH',
    color: 'text-white',
    bgColor: 'bg-warning',
    icon: <Eye className="w-5 h-5" />,
  },
  normal: {
    label: 'NORMAL',
    color: 'text-white',
    bgColor: 'bg-success',
    icon: <Package className="w-5 h-5" />,
  },
};

export default function BatchRiskPage() {
  const [riskFilter, setRiskFilter] = useState<string>('all');
  const [selectedBatch, setSelectedBatch] = useState<BatchData | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const { data, isLoading, error, mutate } = useSWR(
    `/api/batches?risk_level=${riskFilter !== 'all' ? riskFilter : ''}&limit=100`,
    fetcher,
    {
      refreshInterval: 60000,
    }
  );

  const batches: BatchData[] = data?.data?.data || [];

  // Filter batches
  const filteredBatches = batches.filter((batch: BatchData) => {
    const batchRiskLevel = batch.risk_level || batch.riskLevel;
    return riskFilter === 'all' || batchRiskLevel === riskFilter;
  });

  // Count by risk level
  const riskCounts = {
    high_risk: batches.filter((b: BatchData) => (b.risk_level || b.riskLevel) === 'high_risk').length,
    watch: batches.filter((b: BatchData) => (b.risk_level || b.riskLevel) === 'watch').length,
    normal: batches.filter((b: BatchData) => (b.risk_level || b.riskLevel) === 'normal').length,
  };

  const handleReview = (batch: BatchData) => {
    setSelectedBatch(batch);
    setIsModalOpen(true);
  };

  // Format date for display
  const formatDate = (dateStr: string | undefined) => {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleDateString();
  };

  // Generate defect summary for a batch
  const getDefectSummary = (batch: BatchData) => {
    if (batch.topDefect) {
      return `${batch.topDefect} (${(batch.rejection_rate || batch.rejectionRate || 0).toFixed(1)}%)`;
    }
    return `Rejection Rate: ${(batch.rejection_rate || batch.rejectionRate || 0).toFixed(1)}%`;
  };

  return (
    <>
      <DashboardHeader
        title="Batch Risk Monitor"
        description="Executive Overview of At-Risk Production"
        actions={
          <Button
            variant="outline"
            onClick={() => mutate()}
            disabled={isLoading}
            className="gap-2 h-12 text-lg px-6"
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
            className={`cursor-pointer transition-all border-2 ${riskFilter === 'high_risk' ? 'border-danger shadow-lg transform scale-105' : 'border-transparent hover:border-danger/50'}`}
            onClick={() => setRiskFilter(riskFilter === 'high_risk' ? 'all' : 'high_risk')}
          >
            <CardContent className="p-8">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xl font-bold text-text-secondary mb-2 uppercase tracking-wide">High Risk Batches</p>
                  <p className="text-7xl font-extrabold text-danger">{riskCounts.high_risk}</p>
                  <p className="text-lg text-text-secondary mt-2 font-medium">Require Immediate Action</p>
                </div>
                <div className="w-20 h-20 bg-danger/10 rounded-full flex items-center justify-center">
                  <AlertTriangle className="w-10 h-10 text-danger" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card
            className={`cursor-pointer transition-all border-2 ${riskFilter === 'watch' ? 'border-warning shadow-lg transform scale-105' : 'border-transparent hover:border-warning/50'}`}
            onClick={() => setRiskFilter(riskFilter === 'watch' ? 'all' : 'watch')}
          >
            <CardContent className="p-8">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xl font-bold text-text-secondary mb-2 uppercase tracking-wide">Watch List</p>
                  <p className="text-7xl font-extrabold text-warning">{riskCounts.watch}</p>
                  <p className="text-lg text-text-secondary mt-2 font-medium">Monitor Closely</p>
                </div>
                <div className="w-20 h-20 bg-warning/10 rounded-full flex items-center justify-center">
                  <Eye className="w-10 h-10 text-warning" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card
            className={`cursor-pointer transition-all border-2 ${riskFilter === 'normal' ? 'border-success shadow-lg transform scale-105' : 'border-transparent hover:border-success/50'}`}
            onClick={() => setRiskFilter(riskFilter === 'normal' ? 'all' : 'normal')}
          >
            <CardContent className="p-8">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xl font-bold text-text-secondary mb-2 uppercase tracking-wide">Cleared Batches</p>
                  <p className="text-7xl font-extrabold text-success">{riskCounts.normal}</p>
                  <p className="text-lg text-text-secondary mt-2 font-medium">Production Normal</p>
                </div>
                <div className="w-20 h-20 bg-success/10 rounded-full flex items-center justify-center">
                  <CheckCircle className="w-10 h-10 text-success" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-12 h-12 animate-spin text-primary" />
            <span className="ml-4 text-xl text-text-secondary">Loading batch data...</span>
          </div>
        )}

        {/* Error State */}
        {error && !isLoading && (
          <Card className="mb-8 border-danger/30 bg-danger/5">
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <AlertTriangle className="w-8 h-8 text-danger" />
                <div>
                  <p className="text-lg font-semibold text-danger">Failed to load batch data</p>
                  <p className="text-text-secondary">Please try refreshing the page</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Empty State */}
        {!isLoading && !error && batches.length === 0 && (
          <Card className="mb-8">
            <CardContent className="p-12 text-center">
              <Package className="w-16 h-16 text-text-tertiary mx-auto mb-4" />
              <p className="text-xl font-semibold text-text-primary mb-2">No Batches Found</p>
              <p className="text-text-secondary">Upload inspection data to see batch risk analysis</p>
            </CardContent>
          </Card>
        )}

        {/* Simplified Executive Table */}
        {!isLoading && !error && batches.length > 0 && (
          <Card className="shadow-md">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="bg-bg-secondary hover:bg-bg-secondary">
                    <TableHead className="text-xl font-bold h-16 pl-8">Batch ID</TableHead>
                    <TableHead className="text-xl font-bold h-16">Risk Status</TableHead>
                    <TableHead className="text-xl font-bold h-16">Defect Summary</TableHead>
                    <TableHead className="text-xl font-bold h-16 text-right pr-8">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredBatches.map((batch: BatchData) => {
                    const batchRiskLevel = (batch.risk_level || batch.riskLevel) as RiskLevel;
                    const batchNumber = batch.batch_number || batch.batchNumber;
                    return (
                      <TableRow key={batch.id} className="hover:bg-bg-secondary/50 transition-colors h-20">
                        <TableCell className="text-xl font-bold text-text-primary pl-8">
                          {batchNumber}
                        </TableCell>
                        <TableCell>
                          <Badge 
                            className={`text-lg px-4 py-2 font-bold uppercase tracking-wide ${riskConfig[batchRiskLevel].bgColor} ${riskConfig[batchRiskLevel].color} border-none`}
                          >
                            <div className="flex items-center gap-2">
                              {riskConfig[batchRiskLevel].icon}
                              {riskConfig[batchRiskLevel].label}
                            </div>
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xl text-text-secondary font-medium">
                          {getDefectSummary(batch)}
                        </TableCell>
                        <TableCell className="text-right pr-8">
                          <Button 
                            variant="default" 
                            size="lg"
                            className="text-lg px-8 bg-primary hover:bg-primary-dark"
                            onClick={() => handleReview(batch)}
                          >
                            Review
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Action Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-2xl p-0 overflow-hidden border-2 border-primary/20">
          <DialogHeader className="p-8 bg-bg-secondary border-b border-bg-tertiary">
            <div className="flex items-center gap-4 mb-2">
              <ShieldAlert className="w-10 h-10 text-danger" />
              <DialogTitle className="text-3xl font-bold text-text-primary">
                Batch Review: {selectedBatch?.batch_number || selectedBatch?.batchNumber}
              </DialogTitle>
            </div>
            <DialogDescription className="text-xl text-text-secondary ml-14">
              Review batch details and take appropriate action.
            </DialogDescription>
          </DialogHeader>
          
          <div className="p-8 space-y-6">
            <div className={`border-l-8 p-6 rounded-r-lg ${
              (selectedBatch?.risk_level || selectedBatch?.riskLevel) === 'high_risk' 
                ? 'bg-danger/10 border-danger' 
                : (selectedBatch?.risk_level || selectedBatch?.riskLevel) === 'watch'
                ? 'bg-warning/10 border-warning'
                : 'bg-success/10 border-success'
            }`}>
              <h4 className={`text-xl font-bold mb-2 ${
                (selectedBatch?.risk_level || selectedBatch?.riskLevel) === 'high_risk' 
                  ? 'text-danger' 
                  : (selectedBatch?.risk_level || selectedBatch?.riskLevel) === 'watch'
                  ? 'text-warning'
                  : 'text-success'
              }`}>
                {(selectedBatch?.risk_level || selectedBatch?.riskLevel) === 'high_risk' 
                  ? 'HIGH RISK - IMMEDIATE ACTION REQUIRED' 
                  : (selectedBatch?.risk_level || selectedBatch?.riskLevel) === 'watch'
                  ? 'WATCH - MONITOR CLOSELY'
                  : 'NORMAL - WITHIN ACCEPTABLE LIMITS'}
              </h4>
              <p className="text-2xl font-bold text-text-primary">
                Rejection Rate: {((selectedBatch?.rejection_rate || selectedBatch?.rejectionRate || 0)).toFixed(1)}%
              </p>
              <p className="text-lg text-text-secondary mt-2">
                {selectedBatch ? getDefectSummary(selectedBatch) : 'No batch selected'}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4 text-lg">
              <div className="p-4 bg-bg-secondary rounded-lg">
                <span className="font-bold text-text-secondary block mb-1">Batch Number</span>
                <span className="font-bold text-text-primary">{selectedBatch?.batch_number || selectedBatch?.batchNumber}</span>
              </div>
              <div className="p-4 bg-bg-secondary rounded-lg">
                <span className="font-bold text-text-secondary block mb-1">Production Date</span>
                <span className="font-bold text-text-primary">{formatDate(selectedBatch?.production_date || selectedBatch?.productionDate)}</span>
              </div>
            </div>
          </div>

          <DialogFooter className="p-8 bg-bg-secondary border-t border-bg-tertiary gap-4 sm:justify-between">
            <Button 
              variant="ghost" 
              onClick={() => setIsModalOpen(false)}
              className="text-lg h-14 px-8 text-text-secondary hover:text-text-primary"
            >
              Close
            </Button>
            <div className="flex gap-4">
              <Button 
                variant="outline" 
                className="text-lg h-14 px-8 border-2 border-text-tertiary hover:bg-text-tertiary hover:text-white"
                onClick={() => setIsModalOpen(false)}
              >
                Mark as Reviewed
              </Button>
              {(selectedBatch?.risk_level || selectedBatch?.riskLevel) === 'high_risk' && (
                <Button 
                  variant="destructive" 
                  className="text-lg h-14 px-8 bg-danger hover:bg-danger-dark"
                  onClick={() => setIsModalOpen(false)}
                >
                  Escalate Issue
                </Button>
              )}
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
