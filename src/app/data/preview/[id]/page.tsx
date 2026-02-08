'use client';

import React, { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import useSWR from 'swr';
import { backendApi, ProcessedDataResponse } from '@/lib/api/backend';
import { DashboardHeader } from '@/components/layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, ArrowLeft, FileSpreadsheet, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';

export default function DataPreviewPage() {
    const params = useParams();
    const router = useRouter();
    const uploadId = params?.id as string;
    const [activeTab, setActiveTab] = useState('validated');

    const { data, error, isLoading } = useSWR<ProcessedDataResponse>(
        uploadId ? `upload-data-${uploadId}` : null,
        () => backendApi.getUploadData(uploadId)
    );

    const { data: uploadHistory } = useSWR(
        'upload-history',
        () => backendApi.getUploadHistory()
    );

    const currentUpload = uploadHistory?.find(u => u.upload_id === uploadId);

    if (isLoading) {
        return (
            <div className="flex h-screen items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    if (error || !data) {
        return (
            <div className="flex bg-gray-50 flex-col h-screen overflow-hidden">
                <DashboardHeader title="Data Preview" description="Inspect extracted data" />
                <div className="flex-1 p-8 flex items-center justify-center">
                    <div className="text-center">
                        <AlertTriangle className="w-12 h-12 text-warning mx-auto mb-4" />
                        <h3 className="text-lg font-semibold text-text-primary">Data Not Found</h3>
                        <p className="text-text-secondary mb-6">Could not retrieve data for this upload.</p>
                        <Button onClick={() => router.push('/settings/upload')}>
                            Back to Uploads
                        </Button>
                    </div>
                </div>
            </div>
        );
    }

    // Helper to render object as table rows
    const renderTable = (items: any[]) => {
        if (!items || items.length === 0) {
            return <div className="p-8 text-center text-text-secondary">No records found.</div>;
        }

        // Get headers from first item
        const headers = Object.keys(items[0]);

        return (
            <div className="rounded-md border overflow-x-auto">
                <Table>
                    <TableHeader>
                        <TableRow>
                            {headers.map(header => (
                                <TableHead key={header} className="whitespace-nowrap capitalize">
                                    {header.replace(/_/g, ' ')}
                                </TableHead>
                            ))}
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {items.slice(0, 100).map((item, i) => (
                            <TableRow key={i}>
                                {headers.map(header => (
                                    <TableCell key={`${i}-${header}`} className="whitespace-nowrap">
                                        {typeof item[header] === 'object'
                                            ? JSON.stringify(item[header])
                                            : String(item[header])}
                                    </TableCell>
                                ))}
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
                {items.length > 100 && (
                    <div className="p-4 text-center text-sm text-text-secondary bg-gray-50 border-t">
                        Showing first 100 records of {items.length}
                    </div>
                )}
            </div>
        );
    };

    const validatedRows = data.validated_data?.valid_rows_data || [];
    const invalidRows = data.validated_data?.invalid_rows_data || [];

    // For raw data, it might be nested under sheet names or report types
    // We'll try to flatten it or show the first available array
    let rawRows: any[] = [];
    if (data.raw_data) {
        const keys = Object.keys(data.raw_data);
        if (keys.length > 0) {
            // Try to find an array
            for (const key of keys) {
                if (Array.isArray(data.raw_data[key])) {
                    rawRows = data.raw_data[key];
                    break;
                }
            }
        }
    }

    return (
        <div className="flex bg-gray-50 flex-col h-screen overflow-hidden">
            <DashboardHeader title="Data Preview" description={`Inspecting ${currentUpload?.file_name || 'Upload'}`} />

            <div className="flex-1 p-8 overflow-auto">
                <div className="mb-6 flex items-center justify-between">
                    <Button variant="outline" onClick={() => router.push('/settings/upload')} className="gap-2">
                        <ArrowLeft className="w-4 h-4" />
                        Back to History
                    </Button>

                    <div className="flex gap-4">
                        <Card className="px-4 py-2 flex items-center gap-3">
                            <CheckCircle className="w-5 h-5 text-success" />
                            <div>
                                <p className="text-sm text-text-secondary font-medium">Valid</p>
                                <p className="text-lg font-bold text-text-primary">{validatedRows.length}</p>
                            </div>
                        </Card>
                        <Card className="px-4 py-2 flex items-center gap-3">
                            <XCircle className="w-5 h-5 text-danger" />
                            <div>
                                <p className="text-sm text-text-secondary font-medium">Invalid</p>
                                <p className="text-lg font-bold text-text-primary">{invalidRows.length}</p>
                            </div>
                        </Card>
                    </div>
                </div>

                <Card className="h-full">
                    <CardHeader>
                        <CardTitle>Extracted Data Breakdown</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                            <TabsList className="mb-4">
                                <TabsTrigger value="validated" className="gap-2">
                                    <CheckCircle className="w-4 h-4" />
                                    Validated Data
                                </TabsTrigger>
                                <TabsTrigger value="invalid" className="gap-2">
                                    <XCircle className="w-4 h-4" />
                                    Invalid Data
                                </TabsTrigger>
                                <TabsTrigger value="raw" className="gap-2">
                                    <FileSpreadsheet className="w-4 h-4" />
                                    Raw Extraction
                                </TabsTrigger>
                            </TabsList>

                            <TabsContent value="validated" className="mt-0">
                                {renderTable(validatedRows)}
                            </TabsContent>

                            <TabsContent value="invalid" className="mt-0">
                                {renderTable(invalidRows)}
                            </TabsContent>

                            <TabsContent value="raw" className="mt-0">
                                <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-md text-sm text-yellow-800 flex items-start gap-2">
                                    <AlertTriangle className="w-4 h-4 mt-0.5" />
                                    <div>
                                        <p className="font-medium">Raw Data View</p>
                                        <p>This is the data exactly as extracted from the Excel file headers before standardization.</p>
                                    </div>
                                </div>
                                {renderTable(rawRows)}
                            </TabsContent>
                        </Tabs>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
