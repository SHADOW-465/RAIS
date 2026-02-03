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
  Search,
  Package,
  CheckCircle,
  XCircle,
  ShieldAlert,
} from 'lucide-react';
import { formatPercentage } from '@/lib/utils';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

// Mock batch data - Simplified for Executive View
const mockBatches = [
  { id: '1', batchNumber: 'BR-2401', defectSummary: 'Visual Defects (15.2%)', riskLevel: 'high_risk' },
  { id: '2', batchNumber: 'BR-2398', defectSummary: 'Dimensional Issues (12.8%)', riskLevel: 'high_risk' },
  { id: '3', batchNumber: 'BR-2405', defectSummary: 'Material Failure (11.5%)', riskLevel: 'high_risk' },
  { id: '4', batchNumber: 'BR-2399', defectSummary: 'Assembly Errors (9.2%)', riskLevel: 'watch' },
  { id: '5', batchNumber: 'BR-2403', defectSummary: 'Visual Defects (8.5%)', riskLevel: 'watch' },
  { id: '6', batchNumber: 'BR-2400', defectSummary: 'Packaging (8.0%)', riskLevel: 'watch' },
  { id: '7', batchNumber: 'BR-2402', defectSummary: 'Minor Scratches (6.0%)', riskLevel: 'normal' },
  { id: '8', batchNumber: 'BR-2404', defectSummary: 'Clean (5.0%)', riskLevel: 'normal' },
];

type RiskLevel = 'high_risk' | 'watch' | 'normal';

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
  const [selectedBatch, setSelectedBatch] = useState<typeof mockBatches[0] | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

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
  const filteredBatches = batches.filter((batch: { riskLevel: string }) => {
    return riskFilter === 'all' || batch.riskLevel === riskFilter;
  });

  // Count by risk level
  const riskCounts = {
    high_risk: batches.filter((b: { riskLevel: string }) => b.riskLevel === 'high_risk').length,
    watch: batches.filter((b: { riskLevel: string }) => b.riskLevel === 'watch').length,
    normal: batches.filter((b: { riskLevel: string }) => b.riskLevel === 'normal').length,
  };

  const handleReview = (batch: typeof mockBatches[0]) => {
    setSelectedBatch(batch);
    setIsModalOpen(true);
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

        {/* Simplified Executive Table */}
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
                {filteredBatches.map((batch: typeof mockBatches[0]) => (
                  <TableRow key={batch.id} className="hover:bg-bg-secondary/50 transition-colors h-20">
                    <TableCell className="text-xl font-bold text-text-primary pl-8">
                      {batch.batchNumber}
                    </TableCell>
                    <TableCell>
                      <Badge 
                        className={`text-lg px-4 py-2 font-bold uppercase tracking-wide ${riskConfig[batch.riskLevel as RiskLevel].bgColor} ${riskConfig[batch.riskLevel as RiskLevel].color} border-none`}
                      >
                        <div className="flex items-center gap-2">
                          {riskConfig[batch.riskLevel as RiskLevel].icon}
                          {riskConfig[batch.riskLevel as RiskLevel].label}
                        </div>
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xl text-text-secondary font-medium">
                      {batch.defectSummary}
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
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* Action Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-2xl p-0 overflow-hidden border-2 border-primary/20">
          <DialogHeader className="p-8 bg-bg-secondary border-b border-bg-tertiary">
            <div className="flex items-center gap-4 mb-2">
              <ShieldAlert className="w-10 h-10 text-danger" />
              <DialogTitle className="text-3xl font-bold text-text-primary">
                Action Required: {selectedBatch?.batchNumber}
              </DialogTitle>
            </div>
            <DialogDescription className="text-xl text-text-secondary ml-14">
              AI Analysis detected critical anomalies in this batch.
            </DialogDescription>
          </DialogHeader>
          
          <div className="p-8 space-y-6">
            <div className="bg-danger/10 border-l-8 border-danger p-6 rounded-r-lg">
              <h4 className="text-xl font-bold text-danger mb-2">RECOMMENDED ACTION</h4>
              <p className="text-2xl font-bold text-text-primary">
                Quarantine Batch Immediately
              </p>
              <p className="text-lg text-text-secondary mt-2">
                3 critical visual defects found. High probability of customer rejection.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4 text-lg">
              <div className="p-4 bg-bg-secondary rounded-lg">
                <span className="font-bold text-text-secondary block mb-1">Defect Type</span>
                <span className="font-bold text-text-primary">Visual Deformity</span>
              </div>
              <div className="p-4 bg-bg-secondary rounded-lg">
                <span className="font-bold text-text-secondary block mb-1">Estimated Loss</span>
                <span className="font-bold text-text-primary">$12,450</span>
              </div>
            </div>
          </div>

          <DialogFooter className="p-8 bg-bg-secondary border-t border-bg-tertiary gap-4 sm:justify-between">
            <Button 
              variant="ghost" 
              onClick={() => setIsModalOpen(false)}
              className="text-lg h-14 px-8 text-text-secondary hover:text-text-primary"
            >
              Ignore (Log Risk)
            </Button>
            <div className="flex gap-4">
              <Button 
                variant="outline" 
                className="text-lg h-14 px-8 border-2 border-text-tertiary hover:bg-text-tertiary hover:text-white"
                onClick={() => setIsModalOpen(false)}
              >
                Release with Note
              </Button>
              <Button 
                variant="destructive" 
                className="text-lg h-14 px-8 bg-danger hover:bg-danger-dark"
                onClick={() => setIsModalOpen(false)}
              >
                Quarantine Batch
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
