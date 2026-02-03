'use client';

import React, { useState, useCallback } from 'react';
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

// Mock upload history
const mockUploadHistory = [
  { id: '1', filename: 'visual_inspection_feb.xlsx', originalFilename: 'visual_inspection_feb.xlsx', fileType: 'visual', fileSize: 2457600, uploadStatus: 'completed', recordsImported: 1250, recordsFailed: 12, uploadedAt: '2026-02-03T10:30:00Z' },
  { id: '2', filename: 'assembly_report.xlsx', originalFilename: 'assembly_report.xlsx', fileType: 'assembly', fileSize: 1843200, uploadStatus: 'completed', recordsImported: 890, recordsFailed: 0, uploadedAt: '2026-02-02T14:15:00Z' },
  { id: '3', filename: 'integrity_test_jan.xlsx', originalFilename: 'integrity_test_jan.xlsx', fileType: 'integrity', fileSize: 3145728, uploadStatus: 'failed', recordsImported: 0, recordsFailed: 0, errorMessage: 'Invalid column headers', uploadedAt: '2026-02-01T09:00:00Z' },
  { id: '4', filename: 'cumulative_q4.xlsx', originalFilename: 'cumulative_q4.xlsx', fileType: 'cumulative', fileSize: 5242880, uploadStatus: 'completed', recordsImported: 3420, recordsFailed: 45, uploadedAt: '2026-01-31T16:45:00Z' },
];

const fileTypeLabels: Record<string, { label: string; color: string }> = {
  visual: { label: 'Visual Inspection', color: 'bg-primary' },
  assembly: { label: 'Assembly', color: 'bg-success' },
  integrity: { label: 'Integrity Test', color: 'bg-warning' },
  cumulative: { label: 'Cumulative', color: 'bg-info' },
  shopfloor: { label: 'Shop Floor', color: 'bg-secondary' },
  unknown: { label: 'Unknown', color: 'bg-text-tertiary' },
};

export default function UploadPage() {
  const [isDragActive, setIsDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadComplete, setUploadComplete] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

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
  }, []);

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

  const isValidFile = (file: File) => {
    const validTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
    ];
    return validTypes.includes(file.type) || file.name.endsWith('.xlsx') || file.name.endsWith('.xls');
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

    // Simulate upload progress
    for (let i = 0; i <= 100; i += 10) {
      await new Promise((resolve) => setTimeout(resolve, 200));
      setUploadProgress(i);
    }

    // Simulate processing
    await new Promise((resolve) => setTimeout(resolve, 1000));

    setIsUploading(false);
    setUploadComplete(true);

    // Reset after showing success
    setTimeout(() => {
      setUploadComplete(false);
      setSelectedFile(null);
      setUploadProgress(0);
    }, 3000);
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
    setUploadError(null);
    setUploadProgress(0);
    setUploadComplete(false);
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
                    Supported formats: .xlsx, .xls (Max 50MB)
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
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-6 h-6" />
              Upload History
            </CardTitle>
          </CardHeader>
          <CardContent>
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
                {mockUploadHistory.map((upload) => {
                  const fileType = fileTypeLabels[upload.fileType] || fileTypeLabels.unknown;
                  return (
                    <TableRow key={upload.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <FileSpreadsheet className="w-8 h-8 text-success" />
                          <span className="font-medium">{upload.filename}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={`${fileType.color} text-white`}>
                          {fileType.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-text-secondary">
                        {formatFileSize(upload.fileSize)}
                      </TableCell>
                      <TableCell className="text-text-secondary">
                        {formatDateTime(upload.uploadedAt)}
                      </TableCell>
                      <TableCell className="text-right">
                        {upload.uploadStatus === 'completed' ? (
                          <div>
                            <span className="font-medium text-success">
                              {formatNumber(upload.recordsImported)}
                            </span>
                            {upload.recordsFailed > 0 && (
                              <span className="text-danger ml-2">
                                ({upload.recordsFailed} failed)
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-text-tertiary">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {upload.uploadStatus === 'completed' ? (
                          <Badge variant="success" className="gap-1">
                            <CheckCircle className="w-4 h-4" />
                            Completed
                          </Badge>
                        ) : upload.uploadStatus === 'processing' ? (
                          <Badge variant="warning" className="gap-1">
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Processing
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
                          {upload.uploadStatus === 'failed' && (
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
