import { NextRequest, NextResponse } from 'next/server';
import { rejectionRepository } from '@/lib/db/repositories/rejectionRepository';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type, dateRange, format } = body;

    if (!type || !dateRange || !format) {
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      );
    }

    const from = new Date(dateRange.from);
    const to = new Date(dateRange.to);

    // Fetch data based on report type
    let data: unknown;
    
    switch (type) {
      case 'summary':
        const stats = await rejectionRepository.getAggregatedStats('day', from, to);
        data = {
          summary: 'Manufacturing Quality Summary',
          period: { from, to },
          totalRejections: stats.reduce((sum, s) => sum + s.totalRejected, 0),
          totalIncidents: stats.reduce((sum, s) => sum + s.recordCount, 0),
          averagePerDay: stats.length > 0 
            ? Math.round(stats.reduce((sum, s) => sum + s.totalRejected, 0) / stats.length)
            : 0,
          totalCost: stats.reduce((sum, s) => sum + (s.totalCost || 0), 0),
        };
        break;
        
      case 'detailed':
        const records = await rejectionRepository.getByDateRange(from, to);
        data = records;
        break;
        
      case 'trends':
        const trends = await rejectionRepository.getAggregatedStats('day', from, to);
        data = trends;
        break;
        
      default:
        data = { message: 'Report type not implemented' };
    }

    // Generate response based on format
    if (format === 'csv') {
      const csv = convertToCSV(data);
      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="report.csv"`,
        },
      });
    } else {
      return NextResponse.json(data);
    }
    
  } catch (error) {
    console.error('Report generation error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate report' },
      { status: 500 }
    );
  }
}

function convertToCSV(data: unknown): string {
  if (!Array.isArray(data)) {
    // Handle object
    const obj = data as Record<string, unknown>;
    const headers = Object.keys(obj);
    const values = Object.values(obj).map(v => 
      typeof v === 'object' ? JSON.stringify(v) : String(v)
    );
    return [headers.join(','), values.join(',')].join('\n');
  }
  
  if (data.length === 0) return '';
  
  const headers = Object.keys(data[0] as object);
  const rows = data.map(row => {
    return headers.map(header => {
      const value = (row as Record<string, unknown>)[header];
      if (value === null || value === undefined) return '';
      if (typeof value === 'string') return `"${value.replace(/"/g, '""')}"`;
      if (value instanceof Date) return value.toISOString();
      return String(value);
    }).join(',');
  });
  
  return [headers.join(','), ...rows].join('\n');
}
