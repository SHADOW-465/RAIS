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
} from 'lucide-react';
import { formatDateTime, formatNumber } from '@/lib/utils';
import type { UploadHistory, FileType } from '@/lib/db/types';

// Fetcher for SWR
const fetcher = (url: string) => fetch(url).then((res) => res.json());

const fileTypeLabels: Record<FileType, { label: string; color: string }> = {
  visual: { label: 'Visual Inspection', color: 'bg-primary' },
  assembly: { label: 'Assembly', color: 'bg-success' },
  integrity: { label: 'Integrity Test', color: 'bg-warning' },
  cumulative: { label: 'Cumulative', color: 'bg-info' },
  shopfloor: { label: 'Shop Floor', color: 'bg-secondary' },
  unknown: { label: 'Unknown', color: 'bg-text-tertiary' },
};

interface UploadResponse {
  success: boolean;
  data?: {
    uploadId: string;
    fileType: FileType;
    import: {
      recordsImported: number;
      recordsFailed: number;
    };
  };
  errors?: string[];
}

export default function UploadPage() {
  const [isDragActive, setIsDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadComplete, setUploadComplete] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Fetch upload history from API
  const { 
    data: historyData, 
    isLoading: isHistoryLoading, 
    error: historyError,
    mutate 
  } = useSWR<{ success: boolean; data: { uploads: UploadHistory[] } }>(
    '/api/upload',
    fetcher,
    {
      refreshInterval: 30000, // Refresh every 30 seconds
    }
  );

  const uploadHistory = historyData?.data?.uploads || [];

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
      // Create FormData
      const formData = new FormData();
      formData.append('file', selectedFile);

      // Upload with progress simulation (since fetch doesn't give true progress)
      const progressInterval = setInterval(() => {
        setUploadProgress((prev) => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 300);

      // Perform actual upload
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      clearInterval(progressInterval);
      setUploadProgress(100);

      const result: UploadResponse = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.errors?.[0] || 'Upload failed');
      }

      setIsUploading(false);
      setUploadComplete(true);

      // Refresh upload history
      await mutate();

      // Reset after showing success
      setTimeout(() => {
        setUploadComplete(false);
        setSelectedFile(null);
        setUploadProgress(0);
      }, 3000);
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
              className={`relative border-3 border-dashed rounded-xl p-12 text-center transition-all ${
                isDragActive
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
                    <div className="flex items-center justify-center gap-3 text-success">
                      <CheckCircle className="w-8 h-8" />
                      <span className="text-xl font-semibold">Upload Successful!</span>
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
                    const fileType = upload.file_type 
                      ? fileTypeLabels[upload.file_type] 
                      : fileTypeLabels.unknown;
                    return (
                      <TableRow key={upload.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <FileSpreadsheet className="w-8 h-8 text-success" />
                            <span className="font-medium">{upload.original_filename}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={`${fileType.color} text-white`}>
                            {fileType.label}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-text-secondary">
                          {upload.file_size ? formatFileSize(upload.file_size) : '-'}
                        </TableCell>
                        <TableCell className="text-text-secondary">
                          {formatDateTime(upload.uploaded_at)}
                        </TableCell>
                        <TableCell className="text-right">
                          {upload.upload_status === 'completed' ? (
                            <div>
                              <span className="font-medium text-success">
                                {formatNumber(upload.records_imported)}
                              </span>
                              {upload.records_failed > 0 && (
                                <span className="text-danger ml-2">
                                  ({upload.records_failed} failed)
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-text-tertiary">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {upload.upload_status === 'completed' ? (
                            <Badge variant="success" className="gap-1">
                              <CheckCircle className="w-4 h-4" />
                              Completed
                            </Badge>
                          ) : upload.upload_status === 'processing' ? (
                            <Badge variant="warning" className="gap-1">
                              <Loader2 className="w-4 h-4 animate-spin" />
                              Processing
                            </Badge>
                          ) : upload.upload_status === 'pending' ? (
                            <Badge variant="outline" className="gap-1">
                              <Clock className="w-4 h-4" />
                              Pending
                            </Badge>
                          ) : (
                            <Badge variant="destructive" className="gap-1">
                              <XCircle className="w-4 h-4" />
                              Failed
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Button variant="ghost" size="sm">
                              <Eye className="w-4 h-4" />
                            </Button>
                            {upload.upload_status === 'failed' && (
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
