'use client';

import React, { useState, useCallback } from 'react';
import { DashboardHeader, Sidebar } from '@/components/layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
    Upload,
    FileSpreadsheet,
    CheckCircle2,
    XCircle,
    Loader2,
    AlertTriangle,
    ArrowRight
} from 'lucide-react';
import Link from 'next/link';
import { backendApi, ProcessingStatusResponse } from '@/lib/api/backend';

// Expected file patterns
const EXPECTED_FILES = [
    { pattern: 'YEARLY PRODUCTION COMMULATIVE', description: 'Yearly production data' },
    { pattern: 'COMMULATIVE', description: 'Monthly cumulative data' },
    { pattern: 'ASSEMBLY REJECTION REPORT', description: 'Assembly inspection reports' },
    { pattern: 'VISUAL INSPECTION REPORT', description: 'Visual inspection data' },
    { pattern: 'BALLOON & VALVE INTEGRITY', description: 'Integrity test results' },
    { pattern: 'SHOPFLOOR REJECTION REPORT', description: 'Shopfloor rejection data' },
];

type UploadState = 'idle' | 'selected' | 'uploading' | 'processing' | 'completed' | 'error';

export default function UploadPage() {
    const [files, setFiles] = useState<File[]>([]);
    const [uploadState, setUploadState] = useState<UploadState>('idle');
    const [progress, setProgress] = useState(0);
    const [statusMessage, setStatusMessage] = useState('');
    const [errors, setErrors] = useState<string[]>([]);
    const [processingStatus, setProcessingStatus] = useState<ProcessingStatusResponse | null>(null);

    const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            const selectedFiles = Array.from(e.target.files);
            setFiles(selectedFiles);
            setUploadState('selected');
            setErrors([]);
        }
    }, []);

    const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        const droppedFiles = Array.from(e.dataTransfer.files).filter(
            f => f.name.endsWith('.xlsx') || f.name.endsWith('.xls')
        );
        if (droppedFiles.length > 0) {
            setFiles(droppedFiles);
            setUploadState('selected');
            setErrors([]);
        }
    }, []);

    const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
    }, []);

    const handleUpload = async () => {
        if (files.length === 0) return;

        setUploadState('uploading');
        setProgress(5);
        setStatusMessage('Uploading files...');
        setErrors([]);

        try {
            // Upload files
            const uploadResponse = await backendApi.uploadFiles(files);
            setProgress(10);
            setStatusMessage('Files uploaded. Processing...');
            setUploadState('processing');

            // Poll for processing status
            const finalStatus = await backendApi.waitForProcessing(
                uploadResponse.upload_id,
                (status) => {
                    setProcessingStatus(status);
                    setProgress(status.progress_percent);
                    setStatusMessage(status.current_stage);
                }
            );

            if (finalStatus.status === 'completed') {
                setUploadState('completed');
                setStatusMessage('Processing complete! View your dashboard.');
            } else {
                setUploadState('error');
                setErrors(finalStatus.errors);
                setStatusMessage('Processing failed');
            }
        } catch (error) {
            setUploadState('error');
            setErrors([error instanceof Error ? error.message : 'Unknown error']);
            setStatusMessage('Upload failed');
        }
    };

    const getFileStatus = (filename: string) => {
        const matchedPattern = EXPECTED_FILES.find(ef =>
            filename.toUpperCase().includes(ef.pattern)
        );
        return matchedPattern ? 'matched' : 'unknown';
    };

    const resetUpload = () => {
        setFiles([]);
        setUploadState('idle');
        setProgress(0);
        setStatusMessage('');
        setErrors([]);
        setProcessingStatus(null);
    };

    const handleReset = async () => {
        if (!confirm('Are you sure you want to clear the entire database? This action cannot be undone.')) {
            return;
        }

        try {
            await backendApi.resetDatabase();
            resetUpload();
            alert('Database cleared successfully');
        } catch (error) {
            alert('Failed to reset database');
        }
    };

    return (
        <div className="flex h-screen bg-slate-50">
            <Sidebar />
            <main className="flex-1 flex flex-col overflow-hidden">
                <DashboardHeader title="Data Management" />

                <div className="flex-1 overflow-auto p-8">
                    <div className="max-w-4xl mx-auto">
                        <div className="flex justify-between items-start mb-8">
                            <div>
                                <h1 className="text-3xl font-bold text-slate-900 mb-2">Upload Data Files</h1>
                                <p className="text-slate-600">
                                    Upload your Excel files to process rejection and production data.
                                </p>
                            </div>
                            <Button
                                variant="outline"
                                className="text-red-600 border-red-200 hover:bg-red-50"
                                onClick={handleReset}
                            >
                                Reset Database
                            </Button>
                        </div>

                        {/* Upload Area */}
                        <Card className="mb-6">
                            <CardContent className="p-8">
                                {uploadState === 'idle' || uploadState === 'selected' ? (
                                    <div
                                        onDrop={handleDrop}
                                        onDragOver={handleDragOver}
                                        className={`
                                            border-2 border-dashed rounded-xl p-12 text-center transition-colors
                                            ${uploadState === 'selected'
                                                ? 'border-teal-400 bg-teal-50/50'
                                                : 'border-slate-300 hover:border-teal-400 hover:bg-slate-50'
                                            }
                                        `}
                                    >
                                        <Upload className="w-12 h-12 mx-auto mb-4 text-slate-400" />
                                        <p className="text-lg font-medium text-slate-700 mb-2">
                                            Drag & drop Excel files here
                                        </p>
                                        <p className="text-sm text-slate-500 mb-4">or</p>
                                        <label className="inline-block">
                                            <input
                                                type="file"
                                                multiple
                                                accept=".xlsx,.xls"
                                                onChange={handleFileChange}
                                                className="hidden"
                                            />
                                            <span className="px-6 py-2 bg-teal-600 text-white rounded-lg cursor-pointer hover:bg-teal-700 transition-colors">
                                                Browse Files
                                            </span>
                                        </label>
                                    </div>
                                ) : (
                                    <div className="text-center py-8">
                                        {uploadState === 'uploading' || uploadState === 'processing' ? (
                                            <>
                                                <Loader2 className="w-12 h-12 mx-auto mb-4 text-teal-600 animate-spin" />
                                                <p className="text-lg font-medium text-slate-700 mb-2">{statusMessage}</p>
                                                <Progress value={progress} className="max-w-md mx-auto mb-4" />
                                                <p className="text-sm text-slate-500">{progress}% complete</p>
                                            </>
                                        ) : uploadState === 'completed' ? (
                                            <>
                                                <CheckCircle2 className="w-12 h-12 mx-auto mb-4 text-green-600" />
                                                <p className="text-lg font-medium text-slate-700 mb-4">{statusMessage}</p>
                                                <div className="flex gap-4 justify-center">
                                                    <Button onClick={resetUpload} variant="outline">
                                                        Upload More
                                                    </Button>
                                                    <Button asChild>
                                                        <Link href="/">
                                                            View Dashboard <ArrowRight className="ml-2 w-4 h-4" />
                                                        </Link>
                                                    </Button>
                                                </div>
                                            </>
                                        ) : (
                                            <>
                                                <XCircle className="w-12 h-12 mx-auto mb-4 text-red-600" />
                                                <p className="text-lg font-medium text-slate-700 mb-2">{statusMessage}</p>
                                                <Button onClick={resetUpload} variant="outline" className="mt-4">
                                                    Try Again
                                                </Button>
                                            </>
                                        )}
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        {/* Selected Files */}
                        {files.length > 0 && (uploadState === 'selected' || uploadState === 'idle') && (
                            <Card className="mb-6">
                                <CardHeader>
                                    <CardTitle className="text-lg">Selected Files ({files.length})</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-2">
                                        {files.map((file, idx) => {
                                            const status = getFileStatus(file.name);
                                            return (
                                                <div
                                                    key={idx}
                                                    className={`
                                                        flex items-center gap-3 p-3 rounded-lg
                                                        ${status === 'matched' ? 'bg-green-50' : 'bg-amber-50'}
                                                    `}
                                                >
                                                    <FileSpreadsheet className={`w-5 h-5 ${status === 'matched' ? 'text-green-600' : 'text-amber-600'}`} />
                                                    <span className="flex-1 font-medium text-slate-700 text-sm truncate">{file.name}</span>
                                                    <span className="text-xs text-slate-500">
                                                        {(file.size / 1024).toFixed(1)} KB
                                                    </span>
                                                    {status === 'matched' ? (
                                                        <CheckCircle2 className="w-5 h-5 text-green-600" />
                                                    ) : (
                                                        <AlertTriangle className="w-5 h-5 text-amber-600" />
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                    <Button
                                        onClick={handleUpload}
                                        className="w-full mt-6 bg-teal-600 hover:bg-teal-700"
                                        size="lg"
                                    >
                                        <Upload className="w-4 h-4 mr-2" />
                                        Process Files
                                    </Button>
                                </CardContent>
                            </Card>
                        )}

                        {/* Errors */}
                        {errors.length > 0 && (
                            <Card className="mb-6 border-red-200 bg-red-50">
                                <CardHeader>
                                    <CardTitle className="text-lg text-red-800">Processing Errors</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <ul className="space-y-2">
                                        {errors.map((error, idx) => (
                                            <li key={idx} className="text-red-700 text-sm flex items-start gap-2">
                                                <XCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                                                {error}
                                            </li>
                                        ))}
                                    </ul>
                                </CardContent>
                            </Card>
                        )}

                        {/* Expected Files Reference */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-lg">Expected File Types</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="grid gap-3 sm:grid-cols-2">
                                    {EXPECTED_FILES.map((ef, idx) => (
                                        <div key={idx} className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                                            <FileSpreadsheet className="w-5 h-5 text-slate-400" />
                                            <div>
                                                <p className="font-medium text-slate-700 text-sm">{ef.pattern}</p>
                                                <p className="text-xs text-slate-500">{ef.description}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </main>
        </div>
    );
}
