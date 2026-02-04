'use client';

import React, { useState, useCallback } from 'react';
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
  AlertTriangle,
} from 'lucide-react';
import { formatDate, formatDateTime } from '@/lib/utils';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

// Report types configuration
const reportTypes = [
  {
    id: 'monthly_summary',
    name: 'Monthly Summary',
    description: 'Overall rejection statistics and trends',
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
];

interface ReportHistoryItem {
  id: string;
  type: string;
  name: string;
  generatedAt: string;
  status: string;
  format: string;
  downloadUrl?: string;
}

export default function ReportsPage() {
  const [selectedReportType, setSelectedReportType] = useState('monthly_summary');
  const [selectedPeriod, setSelectedPeriod] = useState('30d');
  const [selectedFormat, setSelectedFormat] = useState('Excel');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationComplete, setGenerationComplete] = useState(false);
  const [generatedReport, setGeneratedReport] = useState<ReportHistoryItem | null>(null);
  const [error, setError] = useState<string | null>(null);

  const selectedReport = reportTypes.find((r) => r.id === selectedReportType);

  const handleGenerateReport = async () => {
    setIsGenerating(true);
    setGenerationComplete(false);
    setError(null);

    try {
      const response = await fetch('/api/reports/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          reportType: selectedReportType,
          period: selectedPeriod,
          format: selectedFormat,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'Failed to generate report');
      }

      // Handle Excel download directly
      if (selectedFormat === 'Excel') {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${selectedReportType}_${new Date().toISOString().split('T')[0]}.xlsx`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        
        setGenerationComplete(true);
        setGeneratedReport({
          id: Date.now().toString(),
          type: selectedReportType,
          name: `${selectedReport?.name} - ${new Date().toLocaleDateString()}`,
          generatedAt: new Date().toISOString(),
          status: 'completed',
          format: selectedFormat,
        });
      } else {
        // PDF - for now return JSON data
        const data = await response.json();
        console.log('PDF Report Data:', data);
        
        setGenerationComplete(true);
        setGeneratedReport({
          id: Date.now().toString(),
          type: selectedReportType,
          name: `${data.data.title} - ${new Date().toLocaleDateString()}`,
          generatedAt: data.data.generatedAt,
          status: 'completed',
          format: selectedFormat,
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate report');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownload = useCallback((report: ReportHistoryItem) => {
    // Re-generate the report for download
    handleGenerateReport();
  }, [selectedReportType, selectedPeriod, selectedFormat]);

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
                    <SelectItem value="7d">Last 7 Days</SelectItem>
                    <SelectItem value="30d">Last 30 Days</SelectItem>
                    <SelectItem value="60d">Last 60 Days</SelectItem>
                    <SelectItem value="90d">Last 90 Days</SelectItem>
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
                    <SelectItem value="Excel">Excel Spreadsheet</SelectItem>
                    <SelectItem value="PDF">PDF Document</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-end">
                <Button
                  onClick={handleGenerateReport}
                  disabled={isGenerating}
                  className="w-full h-12 gap-2"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Generating...
                    </>
                  ) : generationComplete ? (
                    <>
                      <CheckCircle className="w-5 h-5" />
                      Generated!
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

            {/* Error Display */}
            {error && (
              <div className="bg-danger/10 border border-danger/30 rounded-lg p-6 mb-6">
                <div className="flex items-center gap-4">
                  <AlertTriangle className="w-8 h-8 text-danger" />
                  <div>
                    <p className="text-lg font-semibold text-danger">Error Generating Report</p>
                    <p className="text-base text-text-secondary">{error}</p>
                  </div>
                </div>
              </div>
            )}

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

            {generationComplete && generatedReport && (
              <div className="bg-success/10 border border-success/30 rounded-lg p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <CheckCircle className="w-8 h-8 text-success" />
                    <div>
                      <p className="text-lg font-semibold text-text-primary">
                        Report Generated Successfully!
                      </p>
                      <p className="text-base text-text-secondary">
                        {generatedReport.name} ({generatedReport.format}) is ready.
                      </p>
                    </div>
                  </div>
                  {selectedFormat === 'Excel' ? (
                    <p className="text-success font-medium">Downloaded automatically</p>
                  ) : (
                    <Button variant="outline" className="gap-2">
                      <Download className="w-5 h-5" />
                      Download PDF
                    </Button>
                  )}
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
            {generatedReport ? (
              <div className="border rounded-lg p-4 mb-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center text-primary">
                      {reportTypes.find(r => r.id === generatedReport.type)?.icon || <FileText className="w-5 h-5" />}
                    </div>
                    <div>
                      <span className="font-semibold text-lg">{generatedReport.name}</span>
                      <p className="text-sm text-text-secondary">
                        Generated: {formatDateTime(generatedReport.generatedAt)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant={generatedReport.format === 'PDF' ? 'outline' : 'default'}>
                      {generatedReport.format}
                    </Badge>
                    <Badge variant="success" className="gap-1">
                      <CheckCircle className="w-4 h-4" />
                      {generatedReport.status}
                    </Badge>
                  </div>
                </div>
              </div>
            ) : (
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
