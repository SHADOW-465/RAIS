'use client';

import React, { useState } from 'react';
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
  Building2,
  Star,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  Phone,
  Mail,
  Loader2,
  BarChart3,
} from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { formatPercentage, formatDate } from '@/lib/utils';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

interface SupplierData {
  id: string;
  supplierCode: string;
  supplierName: string;
  batchCount: number;
  avgRejectionRate: number;
  rating: number;
  trend: 'worsening' | 'stable' | 'improving';
  performanceGrade: 'excellent' | 'good' | 'fair' | 'poor';
  contactEmail: string;
  contactPhone: string;
}

const gradeConfig: Record<string, { color: string; bgColor: string; label: string }> = {
  excellent: { color: 'text-success', bgColor: 'bg-success', label: 'Excellent' },
  good: { color: 'text-primary', bgColor: 'bg-primary', label: 'Good' },
  fair: { color: 'text-warning', bgColor: 'bg-warning', label: 'Fair' },
  poor: { color: 'text-danger', bgColor: 'bg-danger', label: 'Poor' },
};

// Generate consistent colors for suppliers dynamically
const generateSupplierColor = (index: number) => {
  const colors = ['#CC0000', '#CC6600', '#0066CC', '#006600', '#666666', '#9900CC', '#CC0066', '#00CCCC'];
  return colors[index % colors.length];
};

export default function SupplierPage() {
  const [period, setPeriod] = useState('90d');
  const [selectedSupplier, setSelectedSupplier] = useState<string | null>(null);

  const { data, isLoading, error, mutate } = useSWR(
    `/api/analytics/suppliers?period=${period}`,
    fetcher,
    {
      refreshInterval: 60000,
    }
  );

  const suppliers: SupplierData[] = data?.data?.suppliers || [];

  // Sort by rejection rate (worst first)
  const sortedSuppliers = [...suppliers].sort(
    (a: { avgRejectionRate: number }, b: { avgRejectionRate: number }) => b.avgRejectionRate - a.avgRejectionRate
  );

  // Calculate summary stats
  const avgRejectionRate = suppliers.reduce((sum: number, s: { avgRejectionRate: number }) => sum + s.avgRejectionRate, 0) / suppliers.length;
  const poorSuppliers = suppliers.filter((s: { performanceGrade: string }) => s.performanceGrade === 'poor').length;
  const excellentSuppliers = suppliers.filter((s: { performanceGrade: string }) => s.performanceGrade === 'excellent').length;

  // Render star rating
  const renderStars = (rating: number) => {
    const stars = [];
    const fullStars = Math.floor(rating);
    const hasHalf = rating % 1 >= 0.5;

    for (let i = 0; i < 5; i++) {
      if (i < fullStars) {
        stars.push(<Star key={i} className="w-5 h-5 fill-warning text-warning" />);
      } else if (i === fullStars && hasHalf) {
        stars.push(<Star key={i} className="w-5 h-5 fill-warning/50 text-warning" />);
      } else {
        stars.push(<Star key={i} className="w-5 h-5 text-gray-300" />);
      }
    }
    return stars;
  };

  return (
    <>
      <DashboardHeader
        title="Supplier Quality"
        description="Track and compare supplier performance"
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
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <p className="text-base font-medium text-text-secondary mb-2">Total Suppliers</p>
              <p className="text-4xl font-bold text-text-primary">{suppliers.length}</p>
              <p className="text-base text-text-secondary mt-2">active suppliers</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <p className="text-base font-medium text-text-secondary mb-2">Avg. Rejection Rate</p>
              <p className="text-4xl font-bold text-warning">{formatPercentage(avgRejectionRate || 0)}</p>
              <p className="text-base text-text-secondary mt-2">across all suppliers</p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-danger">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-base font-medium text-text-secondary mb-2">Poor Performers</p>
                  <p className="text-4xl font-bold text-danger">{poorSuppliers}</p>
                  <p className="text-base text-text-secondary mt-2">need attention</p>
                </div>
                <AlertTriangle className="w-10 h-10 text-danger opacity-50" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-success">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-base font-medium text-text-secondary mb-2">Top Performers</p>
                  <p className="text-4xl font-bold text-success">{excellentSuppliers}</p>
                  <p className="text-base text-text-secondary mt-2">excellent rating</p>
                </div>
                <CheckCircle className="w-10 h-10 text-success opacity-50" />
              </div>
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
                <SelectItem value="30d">Last 30 Days</SelectItem>
                <SelectItem value="60d">Last 60 Days</SelectItem>
                <SelectItem value="90d">Last 90 Days</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Performance Trend Chart - Placeholder */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Supplier Performance Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-80 flex items-center justify-center bg-bg-secondary/50 rounded-lg">
              <div className="text-center">
                <BarChart3 className="w-12 h-12 text-text-tertiary mx-auto mb-3" />
                <p className="text-lg font-medium text-text-secondary">
                  Historical trend data coming soon
                </p>
                <p className="text-sm text-text-tertiary mt-1">
                  Track supplier performance over time
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Supplier Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="w-6 h-6" />
              Supplier Rankings
              <span className="text-base font-normal text-text-secondary ml-2">
                (sorted by rejection rate)
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Rank</TableHead>
                  <TableHead>Supplier</TableHead>
                  <TableHead className="text-right">Batches</TableHead>
                  <TableHead className="text-right">Rejection Rate</TableHead>
                  <TableHead>Trend</TableHead>
                  <TableHead>Rating</TableHead>
                  <TableHead>Grade</TableHead>
                  <TableHead>Contact</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedSuppliers.map((supplier: {
                  id: string;
                  supplierCode: string;
                  supplierName: string;
                  batchCount: number;
                  avgRejectionRate: number;
                  rating: number;
                  trend: string;
                  performanceGrade: string;
                  contactEmail: string;
                  contactPhone: string;
                }, index: number) => {
                  const grade = gradeConfig[supplier.performanceGrade] || gradeConfig.fair;
                  return (
                    <TableRow
                      key={supplier.id}
                      className={`cursor-pointer ${selectedSupplier === supplier.id ? 'bg-primary/5' : ''}`}
                      onClick={() => setSelectedSupplier(selectedSupplier === supplier.id ? null : supplier.id)}
                    >
                      <TableCell>
                        <span className={`text-xl font-bold ${index < 3 ? 'text-danger' : 'text-text-secondary'}`}>
                          #{index + 1}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-semibold text-lg">{supplier.supplierCode}</p>
                          <p className="text-sm text-text-secondary">{supplier.supplierName}</p>
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-medium text-lg">
                        {supplier.batchCount}
                      </TableCell>
                      <TableCell className="text-right">
                        <span className={`text-xl font-bold ${grade.color}`}>
                          {formatPercentage(supplier.avgRejectionRate)}
                        </span>
                      </TableCell>
                      <TableCell>
                        {supplier.trend === 'improving' ? (
                          <div className="flex items-center gap-1 text-success">
                            <TrendingDown className="w-5 h-5" />
                            <span className="font-medium">Improving</span>
                          </div>
                        ) : supplier.trend === 'worsening' ? (
                          <div className="flex items-center gap-1 text-danger">
                            <TrendingUp className="w-5 h-5" />
                            <span className="font-medium">Worsening</span>
                          </div>
                        ) : (
                          <span className="text-text-secondary font-medium">Stable</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          {renderStars(supplier.rating)}
                          <span className="ml-2 font-medium">{supplier.rating.toFixed(1)}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={`${grade.bgColor} text-white`}>
                          {grade.label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <a
                            href={`mailto:${supplier.contactEmail}`}
                            className="text-primary hover:text-primary-dark"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Mail className="w-5 h-5" />
                          </a>
                          <a
                            href={`tel:${supplier.contactPhone}`}
                            className="text-primary hover:text-primary-dark"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Phone className="w-5 h-5" />
                          </a>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Grade Legend */}
        <Card className="mt-6">
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold mb-4">Performance Grade Criteria</h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="flex items-center gap-3 p-3 bg-success/10 rounded-lg">
                <CheckCircle className="w-6 h-6 text-success" />
                <div>
                  <p className="font-semibold text-success">Excellent</p>
                  <p className="text-sm text-text-secondary">Rejection &lt; 5%</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-primary/10 rounded-lg">
                <Star className="w-6 h-6 text-primary" />
                <div>
                  <p className="font-semibold text-primary">Good</p>
                  <p className="text-sm text-text-secondary">Rejection 5-8%</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-warning/10 rounded-lg">
                <AlertTriangle className="w-6 h-6 text-warning" />
                <div>
                  <p className="font-semibold text-warning">Fair</p>
                  <p className="text-sm text-text-secondary">Rejection 8-15%</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-danger/10 rounded-lg">
                <AlertTriangle className="w-6 h-6 text-danger" />
                <div>
                  <p className="font-semibold text-danger">Poor</p>
                  <p className="text-sm text-text-secondary">Rejection ≥ 15%</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
