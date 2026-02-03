'use client';

import React, { useState } from 'react';
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
  FileText,
  Download,
  Calendar,
  Clock,
  CheckCircle,
  AlertCircle,
  Loader2,
  FileSpreadsheet,
  BarChart3,
  PieChart,
  TrendingUp,
} from 'lucide-react';
import { formatDate, formatDateTime } from '@/lib/utils';

// Report types
const reportTypes = [
  {
    id: 'monthly_summary',
    name: 'Monthly Summary',
    description: 'Overall rejection statistics and trends for the month',
    icon: <BarChart3 className="w-6 h-6" />,
    format: ['PDF', 'Excel'],
  },
  {
    id: 'defect_pareto',
    name: 'Defect Pareto Report',
    description: 'Top defect contributors and 80/20 analysis',
    icon: <PieChart className="w-6 h-6" />,
    format: ['PDF', 'Excel'],
  },
  {
    id: 'batch_risk',
    name: 'Batch Risk Report',
    description: 'High-risk and watch-level batch details',
    icon: <AlertCircle className="w-6 h-6" />,
    format: ['PDF', 'Excel'],
  },
  {
    id: 'supplier_performance',
    name: 'Supplier Performance',
    description: 'Supplier quality rankings and trends',
    icon: <TrendingUp className="w-6 h-6" />,
    format: ['PDF', 'Excel'],
  },
];

// Mock report history
const mockReportHistory = [
  { id: '1', type: 'monthly_summary', name: 'Monthly Summary - January 2026', generatedAt: '2026-02-01T10:30:00Z', status: 'completed', format: 'PDF', size: '2.4 MB' },
  { id: '2', type: 'defect_pareto', name: 'Defect Pareto - Q4 2025', generatedAt: '2026-01-05T14:15:00Z', status: 'completed', format: 'Excel', size: '1.8 MB' },
  { id: '3', type: 'batch_risk', name: 'Batch Risk Report - Jan 2026', generatedAt: '2026-01-31T09:00:00Z', status: 'completed', format: 'PDF', size: '3.1 MB' },
  { id: '4', type: 'supplier_performance', name: 'Supplier Performance - H2 2025', generatedAt: '2026-01-02T16:45:00Z', status: 'completed', format: 'PDF', size: '1.2 MB' },
];

export default function ReportsPage() {
  const [selectedReportType, setSelectedReportType] = useState('monthly_summary');
  const [selectedPeriod, setSelectedPeriod] = useState('last_month');
  const [selectedFormat, setSelectedFormat] = useState('PDF');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationComplete, setGenerationComplete] = useState(false);

  const selectedReport = reportTypes.find((r) => r.id === selectedReportType);

  const handleGenerateReport = async () => {
    setIsGenerating(true);
    setGenerationComplete(false);

    // Simulate report generation
    await new Promise((resolve) => setTimeout(resolve, 3000));

    setIsGenerating(false);
    setGenerationComplete(true);

    // Reset after showing success
    setTimeout(() => setGenerationComplete(false), 5000);
  };

  const handleDownload = (reportId: string) => {
    // Simulate download
    console.log('Downloading report:', reportId);
    alert('Report download would start here. This is a demo.');
  };

  return (
    <>
      <DashboardHeader
        title="Reports"
        description="Generate and download quality reports"
      />

      <div className="flex-1 p-8 overflow-auto">
        {/* Report Generator */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-6 h-6" />
              Generate New Report
            </CardTitle>
          </CardHeader>
          <CardContent>
            {/* Report Type Selection */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              {reportTypes.map((report) => (
                <button
                  key={report.id}
                  onClick={() => setSelectedReportType(report.id)}
                  className={`p-4 rounded-xl border-2 text-left transition-all ${
                    selectedReportType === report.id
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-primary/50'
                  }`}
                >
                  <div className={`mb-3 ${selectedReportType === report.id ? 'text-primary' : 'text-text-secondary'}`}>
                    {report.icon}
                  </div>
                  <p className="font-semibold text-lg text-text-primary">{report.name}</p>
                  <p className="text-sm text-text-secondary mt-1">{report.description}</p>
                </button>
              ))}
            </div>

            {/* Report Options */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <div>
                <label className="block text-base font-medium text-text-secondary mb-2">
                  <Calendar className="w-5 h-5 inline mr-2" />
                  Time Period
                </label>
                <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="last_week">Last Week</SelectItem>
                    <SelectItem value="last_month">Last Month</SelectItem>
                    <SelectItem value="last_quarter">Last Quarter</SelectItem>
                    <SelectItem value="last_year">Last Year</SelectItem>
                    <SelectItem value="ytd">Year to Date</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="block text-base font-medium text-text-secondary mb-2">
                  <FileSpreadsheet className="w-5 h-5 inline mr-2" />
                  Format
                </label>
                <Select value={selectedFormat} onValueChange={setSelectedFormat}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PDF">PDF Document</SelectItem>
                    <SelectItem value="Excel">Excel Spreadsheet</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-end">
                <Button
                  onClick={handleGenerateReport}
                  disabled={isGenerating}
                  className="w-full h-12 gap-2"
                  variant={generationComplete ? 'success' : 'default'}
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Generating...
                    </>
                  ) : generationComplete ? (
                    <>
                      <CheckCircle className="w-5 h-5" />
                      Report Ready!
                    </>
                  ) : (
                    <>
                      <FileText className="w-5 h-5" />
                      Generate Report
                    </>
                  )}
                </Button>
              </div>
            </div>

            {/* Generation Progress/Result */}
            {isGenerating && (
              <div className="bg-primary/5 border border-primary/30 rounded-lg p-6">
                <div className="flex items-center gap-4">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                  <div>
                    <p className="text-lg font-semibold text-text-primary">
                      Generating {selectedReport?.name}...
                    </p>
                    <p className="text-base text-text-secondary">
                      This may take a few moments. Please wait.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {generationComplete && (
              <div className="bg-success/10 border border-success/30 rounded-lg p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <CheckCircle className="w-8 h-8 text-success" />
                    <div>
                      <p className="text-lg font-semibold text-text-primary">
                        Report Generated Successfully!
                      </p>
                      <p className="text-base text-text-secondary">
                        {selectedReport?.name} ({selectedFormat}) is ready for download.
                      </p>
                    </div>
                  </div>
                  <Button variant="success" className="gap-2">
                    <Download className="w-5 h-5" />
                    Download Now
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Report History */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-6 h-6" />
              Recent Reports
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Report</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Generated</TableHead>
                  <TableHead>Format</TableHead>
                  <TableHead>Size</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {mockReportHistory.map((report) => {
                  const reportType = reportTypes.find((r) => r.id === report.type);
                  return (
                    <TableRow key={report.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center text-primary">
                            {reportType?.icon || <FileText className="w-5 h-5" />}
                          </div>
                          <span className="font-semibold text-lg">{report.name}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-text-secondary">{reportType?.name}</span>
                      </TableCell>
                      <TableCell>
                        <div className="text-text-secondary">
                          <p>{formatDate(report.generatedAt)}</p>
                          <p className="text-sm">{formatDateTime(report.generatedAt).split(',')[1]}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={report.format === 'PDF' ? 'destructive' : 'success'}>
                          {report.format}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className="text-text-secondary">{report.size}</span>
                      </TableCell>
                      <TableCell>
                        <Badge variant="success" className="gap-1">
                          <CheckCircle className="w-4 h-4" />
                          {report.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDownload(report.id)}
                          className="gap-2"
                        >
                          <Download className="w-5 h-5" />
                          Download
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>

            {mockReportHistory.length === 0 && (
              <div className="text-center py-12 text-text-secondary">
                <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p className="text-lg">No reports generated yet</p>
                <p className="text-base mt-1">Generate your first report using the form above</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
