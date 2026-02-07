'use client';

import React, { useState, useCallback } from 'react';
import useSWR from 'swr';
import { DashboardHeader } from '@/components/layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Upload,
  FileSpreadsheet,
  CheckCircle,
  XCircle,
  Clock,
  Loader2,
  AlertTriangle,
  RefreshCw,
  Trash2,
  Eye,
  Sparkles,
} from 'lucide-react';
import { formatDateTime, formatNumber } from '@/lib/utils';
import type { FileUploadLog, FileType } from '@/lib/db/schema.types';

// Fetcher for SWR
const fetcher = (url: string) => {
  const headers: Record<string, string> = {};
  if (typeof window !== 'undefined') {
    const sid = sessionStorage.getItem('rais_session_id');
    if (sid) headers['x-rais-session-id'] = sid;
  }
  return fetch(url, { headers }).then((res) => res.json());
};

const fileTypeLabels: Record<FileType, { label: string; color: string }> = {
  visual: { label: 'Visual Inspection', color: 'bg-primary' },
  assembly: { label: 'Assembly', color: 'bg-success' },
  integrity: { label: 'Integrity Test', color: 'bg-warning' },
  cumulative: { label: 'Cumulative', color: 'bg-info' },
  shopfloor: { label: 'Shop Floor', color: 'bg-secondary' },
  production: { label: 'Production Report', color: 'bg-danger' },
  unknown: { label: 'Unknown', color: 'bg-text-tertiary' },
};



interface AIAnalysis {
  summary: string;
  fileType: FileType;
  confidence: number;
  detectedMetrics: {
    totalRejectedColumn?: string;
    defectCountColumn?: string;
    batchNumberColumn?: string;
    dateColumn?: string;
  };
  hasAnomaly?: boolean;
}

interface SmartParsing {
  headerRowIndex: number;
}

interface UploadResponse {
  success: boolean;
  data?: {
    uploadId: string;
    fileType: FileType;
    aiAnalysis: AIAnalysis | null;
    smartParsing: SmartParsing | null;
    import: {
      recordsImported: number;
      recordsFailed: number;
    };
  };
  errors?: string[];
}

import { backendApi, ProcessingStatusResponse } from '@/lib/api/backend';

export default function UploadPage() {
  const [isDragActive, setIsDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadComplete, setUploadComplete] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [aiAnalysis, setAiAnalysis] = useState<AIAnalysis | null>(null);
  const [smartParsing, setSmartParsing] = useState<SmartParsing | null>(null);
  const [uploadResult, setUploadResult] = useState<UploadResponse | null>(null);

  // Fetch upload history from Python Backend
  const {
    data: historyData,
    isLoading: isHistoryLoading,
    error: historyError,
    mutate
  } = useSWR<ProcessingStatusResponse[]>( // Changed type to match backend response
    'upload_history',
    () => backendApi.getUploadHistory(),
    {
      refreshInterval: 30000,
    }
  );

  const uploadHistory = historyData || []; // Direct array response

  // Define isValidFile BEFORE any callbacks that use it
  const isValidFile = useCallback((file: File) => {
    const validTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
    ];
    return validTypes.includes(file.type) || file.name.endsWith('.xlsx') || file.name.endsWith('.xls');
  }, []);

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      const file = files[0];
      if (isValidFile(file)) {
        setSelectedFile(file);
        setUploadError(null);
      } else {
        setUploadError('Please upload an Excel file (.xlsx or .xls)');
      }
    }
  }, [isValidFile]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const file = files[0];
      if (isValidFile(file)) {
        setSelectedFile(file);
        setUploadError(null);
      } else {
        setUploadError('Please upload an Excel file (.xlsx or .xls)');
      }
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    setIsUploading(true);
    setUploadProgress(0);
    setUploadError(null);

    try {
      // Upload with progress simulation
      const progressInterval = setInterval(() => {
        setUploadProgress((prev) => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 300);

      // Perform actual upload via Backend API
      const result = await backendApi.uploadFiles([selectedFile]);

      clearInterval(progressInterval);
      setUploadProgress(100);

      // Capture results
      // Note: The backend response might need mapping if it differs from local type
      // For now assuming we just show success

      setIsUploading(false);
      setUploadComplete(true);

      // Refresh upload history
      await mutate();

      // Reset after showing success 
      setTimeout(() => {
        setUploadComplete(false);
        setSelectedFile(null);
        setUploadProgress(0);
        setAiAnalysis(null);
        setSmartParsing(null);
        setUploadResult(null);
      }, 5000);
    } catch (error) {
      setIsUploading(false);
      setUploadComplete(false);
      setUploadError(error instanceof Error ? error.message : 'Upload failed');
      setUploadProgress(0);
    }
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
    setUploadError(null);
    setUploadProgress(0);
    setUploadComplete(false);
    setAiAnalysis(null);
    setSmartParsing(null);
    setUploadResult(null);
  };

  const handleRefreshHistory = async () => {
    await mutate();
  };

  return (
    <>
      <DashboardHeader
        title="Upload Data"
        description="Import inspection and rejection data from Excel files"
      />

      <div className="flex-1 p-8 overflow-auto">
        {/* Upload Zone */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="w-6 h-6" />
              Upload Inspection Data
            </CardTitle>
          </CardHeader>
          <CardContent>
            {/* Drag & Drop Zone */}
            <div
              onDragEnter={handleDragEnter}
              onDragLeave={handleDragLeave}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              className={`relative border-3 border-dashed rounded-xl p-12 text-center transition-all ${isDragActive
                ? 'border-primary bg-primary/5'
                : 'border-border hover:border-primary/50'
                }`}
            >
              {!selectedFile ? (
                <>
                  <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
                    <FileSpreadsheet className="w-10 h-10 text-primary" />
                  </div>
                  <p className="text-2xl font-semibold text-text-primary mb-2">
                    Drag & Drop Excel File
                  </p>
                  <p className="text-lg text-text-secondary mb-6">
                    or click to browse
                  </p>
                  <input
                    type="file"
                    accept=".xlsx,.xls"
                    onChange={handleFileSelect}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  <p className="text-base text-text-tertiary">
                    Supported formats: .xlsx, .xls (Max 10MB)
                  </p>
                </>
              ) : (
                <div className="space-y-6">
                  <div className="flex items-center justify-center gap-4">
                    <div className="w-16 h-16 bg-success/10 rounded-xl flex items-center justify-center">
                      <FileSpreadsheet className="w-8 h-8 text-success" />
                    </div>
                    <div className="text-left">
                      <p className="text-xl font-semibold text-text-primary">
                        {selectedFile.name}
                      </p>
                      <p className="text-base text-text-secondary">
                        {formatFileSize(selectedFile.size)}
                      </p>
                    </div>
                    {!isUploading && !uploadComplete && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={handleRemoveFile}
                        className="text-danger hover:text-danger"
                      >
                        <Trash2 className="w-5 h-5" />
                      </Button>
                    )}
                  </div>

                  {isUploading && (
                    <div className="max-w-md mx-auto">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-base font-medium">Uploading...</span>
                        <span className="text-base font-medium">{uploadProgress}%</span>
                      </div>
                      <Progress value={uploadProgress} />
                    </div>
                  )}

                  {uploadComplete && (
                    <div className="space-y-4">
                      <div className="flex items-center justify-center gap-3 text-success">
                        <CheckCircle className="w-8 h-8" />
                        <span className="text-xl font-semibold">Upload Successful!</span>
                      </div>

                      {/* AI Analysis Results */}
                      {aiAnalysis && (
                        <div className="bg-gradient-to-r from-primary/10 to-secondary/10 rounded-lg p-4 border border-primary/20">
                          <div className="flex items-center gap-2 mb-2">
                            <Sparkles className="w-5 h-5 text-primary" />
                            <span className="font-semibold text-text-primary">AI Analysis</span>
                            {aiAnalysis.hasAnomaly && (
                              <Badge variant="destructive" className="gap-1">
                                <AlertTriangle className="w-3 h-3" />
                                Anomaly Detected
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-text-secondary mb-2">{aiAnalysis.summary}</p>
                          <div className="flex items-center gap-4 text-xs text-text-tertiary">
                            <span>Confidence: {Math.round(aiAnalysis.confidence * 100)}%</span>
                            <span>Type: {fileTypeLabels[aiAnalysis.fileType]?.label || aiAnalysis.fileType}</span>
                          </div>
                          {smartParsing && smartParsing.headerRowIndex > 0 && (
                            <div className="mt-2 text-xs text-text-tertiary">
                              Smart parsing detected header at row {smartParsing.headerRowIndex + 1} (skipped {smartParsing.headerRowIndex} metadata rows)
                            </div>
                          )}
                        </div>
                      )}

                      {/* Upload Stats */}
                      {uploadResult?.data?.import && (
                        <div className="flex items-center justify-center gap-6 text-sm">
                          <div className="text-center">
                            <span className="block text-2xl font-bold text-success">
                              {uploadResult.data.import.recordsImported}
                            </span>
                            <span className="text-text-secondary">Records Imported</span>
                          </div>
                          {uploadResult.data.import.recordsFailed > 0 && (
                            <div className="text-center">
                              <span className="block text-2xl font-bold text-danger">
                                {uploadResult.data.import.recordsFailed}
                              </span>
                              <span className="text-text-secondary">Failed</span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {!isUploading && !uploadComplete && (
                    <Button onClick={handleUpload} size="lg" className="gap-2">
                      <Upload className="w-5 h-5" />
                      Upload & Process
                    </Button>
                  )}
                </div>
              )}
            </div>

            {/* Error Message */}
            {uploadError && (
              <div className="mt-4 p-4 bg-danger/10 border border-danger/30 rounded-lg flex items-center gap-3">
                <AlertTriangle className="w-6 h-6 text-danger" />
                <span className="text-base text-danger">{uploadError}</span>
              </div>
            )}

            {/* File Type Info */}
            <div className="mt-6 grid grid-cols-2 md:grid-cols-5 gap-3">
              {Object.entries(fileTypeLabels).slice(0, 5).map(([key, value]) => (
                <div
                  key={key}
                  className="p-3 bg-bg-secondary rounded-lg text-center"
                >
                  <Badge className={`${value.color} text-white mb-2`}>
                    {value.label}
                  </Badge>
                  <p className="text-xs text-text-tertiary">Auto-detected</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Upload History */}
        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-6 h-6" />
              Upload History
            </CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefreshHistory}
              disabled={isHistoryLoading}
              className="gap-2"
            >
              <RefreshCw className={`w-4 h-4 ${isHistoryLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </CardHeader>
          <CardContent>
            {historyError && (
              <div className="mb-4 p-4 bg-danger/10 border border-danger/30 rounded-lg flex items-center gap-3">
                <AlertTriangle className="w-6 h-6 text-danger" />
                <span className="text-base text-danger">Failed to load upload history</span>
              </div>
            )}

            {isHistoryLoading ? (
              <div className="py-8 flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            ) : uploadHistory.length === 0 ? (
              <div className="py-8 text-center text-text-secondary">
                No upload history available
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>File</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Size</TableHead>
                    <TableHead>Uploaded</TableHead>
                    <TableHead className="text-right">Records</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {uploadHistory.map((upload) => {
                    const fileType = upload.detected_file_type
                      // @ts-ignore
                      ? fileTypeLabels[upload.detected_file_type] || fileTypeLabels.unknown
                      : fileTypeLabels.unknown;
                    return (
                      <TableRow key={upload.upload_id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <FileSpreadsheet className="w-8 h-8 text-success" />
                            <span className="font-medium">{upload.file_name || 'Unknown File'}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={`${fileType.color} text-white`}>
                            {fileType.label}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-text-secondary">
                          {upload.file_size_bytes ? formatFileSize(upload.file_size_bytes) : '-'}
                        </TableCell>
                        <TableCell className="text-text-secondary">
                          {formatDateTime(upload.started_at)}
                        </TableCell>
                        <TableCell className="text-right">
                          {upload.status === 'completed' ? (
                            <div>
                              <span className="font-medium text-success">
                                {formatNumber(upload.records_valid || 0)}
                              </span>
                              {(upload.records_invalid || 0) > 0 && (
                                <span className="text-danger ml-2">
                                  ({upload.records_invalid} failed)
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-text-tertiary">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {upload.status === 'completed' ? (
                            <Badge variant="success" className="gap-1">
                              <CheckCircle className="w-4 h-4" />
                              Completed
                            </Badge>
                          ) : upload.status === 'parsing' || upload.status === 'validating' || upload.status === 'computing' || upload.status === 'uploading' ? (
                            <Badge variant="warning" className="gap-1">
                              <Loader2 className="w-4 h-4 animate-spin" />
                              {upload.status}
                            </Badge>
                          ) : upload.status === 'failed' ? (
                            <Badge variant="destructive" className="gap-1">
                              <XCircle className="w-4 h-4" />
                              Failed
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="gap-1">
                              <Clock className="w-4 h-4" />
                              {upload.status}
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Button variant="ghost" size="sm">
                              <Eye className="w-4 h-4" />
                            </Button>
                            {upload.status === 'failed' && (
                              <Button variant="ghost" size="sm">
                                <RefreshCw className="w-4 h-4" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Instructions */}
        <Card className="mt-6">
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold mb-4">Upload Instructions</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-medium text-text-primary mb-2">Supported File Types:</h4>
                <ul className="space-y-2 text-text-secondary">
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-success" />
                    Assembly inspection reports
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-success" />
                    Visual inspection reports
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-success" />
                    Integrity test results
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-success" />
                    Cumulative production data
                  </li>
                </ul>
              </div>
              <div>
                <h4 className="font-medium text-text-primary mb-2">Required Columns:</h4>
                <ul className="space-y-2 text-text-secondary">
                  <li className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-warning" />
                    Batch Number (required)
                  </li>
                  <li className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-warning" />
                    Inspection Date (required)
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-success" />
                    Quantity Inspected
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-success" />
                    Quantity Passed/Failed
                  </li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
