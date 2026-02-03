/**
 * Reports Generation API Route
 * POST /api/reports/generate - Generate PDF or Excel reports
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/db/client';
import * as XLSX from 'xlsx';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Report types configuration
const reportConfigs = {
  monthly_summary: {
    name: 'Monthly Summary',
    description: 'Overall rejection statistics and trends',
  },
  defect_pareto: {
    name: 'Defect Pareto Report',
    description: 'Top defect contributors and 80/20 analysis',
  },
  batch_risk: {
    name: 'Batch Risk Report',
    description: 'High-risk and watch-level batch details',
  },
  supplier_performance: {
    name: 'Supplier Performance',
    description: 'Supplier quality rankings and trends',
  },
};

interface ReportRequest {
  reportType: keyof typeof reportConfigs;
  period: string;
  format: 'PDF' | 'Excel';
}

/**
 * POST - Generate a report
 */
export async function POST(request: NextRequest) {
  try {
    const body: ReportRequest = await request.json();
    const { reportType, period, format } = body;

    // Validate report type
    if (!reportConfigs[reportType]) {
      return NextResponse.json(
        { success: false, error: { code: 'INVALID_TYPE', message: 'Invalid report type' } },
        { status: 400 }
      );
    }

    // Validate format
    if (format !== 'PDF' && format !== 'Excel') {
      return NextResponse.json(
        { success: false, error: { code: 'INVALID_FORMAT', message: 'Format must be PDF or Excel' } },
        { status: 400 }
      );
    }

    // Generate report data based on type
    const reportData = await generateReportData(reportType, period);

    if (format === 'Excel') {
      const excelBuffer = await generateExcel(reportConfigs[reportType].name, reportData);
      return new NextResponse(excelBuffer as unknown as ReadableStream, {
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'Content-Disposition': `attachment; filename="${reportType}_${new Date().toISOString().split('T')[0]}.xlsx"`,
        },
      });
    } else {
      // For PDF, we'll return JSON with data and let frontend handle PDF generation
      // Or generate server-side PDF using a library
      return NextResponse.json({
        success: true,
        data: {
          reportType,
          period,
          format,
          title: reportConfigs[reportType].name,
          generatedAt: new Date().toISOString(),
          data: reportData,
        },
      });
    }
  } catch (error) {
    console.error('Report generation error:', error);
    return NextResponse.json(
      { success: false, error: { code: 'GENERATION_ERROR', message: 'Failed to generate report' } },
      { status: 500 }
    );
  }
}

/**
 * Generate report data based on type
 */
async function generateReportData(reportType: string, period: string) {
  const endDate = new Date();
  const startDate = new Date();
  
  // Parse period
  const days = parseInt(period.replace('d', '')) || 30;
  startDate.setDate(endDate.getDate() - days);

  switch (reportType) {
    case 'monthly_summary':
      return await generateMonthlySummary(startDate, endDate);
    case 'defect_pareto':
      return await generateDefectPareto(startDate, endDate);
    case 'batch_risk':
      return await generateBatchRisk(startDate, endDate);
    case 'supplier_performance':
      return await generateSupplierPerformance(startDate, endDate);
    default:
      return [];
  }
}

/**
 * Generate monthly summary data
 */
async function generateMonthlySummary(startDate: Date, endDate: Date) {
  try {
    // Get batch statistics
    const { data: batches, error } = await supabaseAdmin
      .from('batches')
      .select('*')
      .gte('production_date', startDate.toISOString().split('T')[0])
      .lte('production_date', endDate.toISOString().split('T')[0]);

    if (error || !batches) {
      return [];
    }

    const totalProduced = batches.reduce((sum, b) => sum + (b.produced_quantity || 0), 0);
    const totalRejected = batches.reduce((sum, b) => sum + (b.rejected_quantity || 0), 0);
    const rejectionRate = totalProduced > 0 ? ((totalRejected / totalProduced) * 100).toFixed(2) : '0.00';

    const highRiskBatches = batches.filter(b => b.risk_level === 'high_risk').length;
    const watchBatches = batches.filter(b => b.risk_level === 'watch').length;

    return [
      ['Metric', 'Value'],
      ['Total Batches', batches.length.toString()],
      ['Total Produced', totalProduced.toString()],
      ['Total Rejected', totalRejected.toString()],
      ['Rejection Rate', `${rejectionRate}%`],
      ['High Risk Batches', highRiskBatches.toString()],
      ['Watch Batches', watchBatches.toString()],
      ['Completed Batches', batches.filter(b => b.status === 'completed').length.toString()],
      ['Period Start', startDate.toISOString().split('T')[0]],
      ['Period End', endDate.toISOString().split('T')[0]],
    ];
  } catch (error) {
    console.error('Error generating monthly summary:', error);
    return [];
  }
}

/**
 * Generate defect pareto data
 */
async function generateDefectPareto(startDate: Date, endDate: Date) {
  try {
    const { data: defects, error } = await supabaseAdmin
      .from('defects')
      .select('defect_type, defect_category, quantity')
      .gte('detected_at', startDate.toISOString())
      .lte('detected_at', endDate.toISOString());

    if (error || !defects) {
      return [];
    }

    // Aggregate by defect type
    const aggregated = defects.reduce((acc, d) => {
      const key = d.defect_type || 'Unknown';
      if (!acc[key]) {
        acc[key] = { type: key, category: d.defect_category || 'other', count: 0 };
      }
      acc[key].count += d.quantity || 0;
      return acc;
    }, {} as Record<string, { type: string; category: string; count: number }>);

    const sorted = Object.values(aggregated)
      .sort((a, b) => b.count - a.count);

    const total = sorted.reduce((sum, d) => sum + d.count, 0);
    
    let cumulative = 0;
    const withPercentages = sorted.map(d => {
      cumulative += d.count;
      return [
        d.type,
        d.category,
        d.count.toString(),
        ((d.count / total) * 100).toFixed(2) + '%',
        ((cumulative / total) * 100).toFixed(2) + '%',
      ];
    });

    return [
      ['Defect Type', 'Category', 'Count', 'Percentage', 'Cumulative %'],
      ...withPercentages,
    ];
  } catch (error) {
    console.error('Error generating defect pareto:', error);
    return [];
  }
}

/**
 * Generate batch risk data
 */
async function generateBatchRisk(startDate: Date, endDate: Date) {
  try {
    const { data: batches, error } = await supabaseAdmin
      .from('batches')
      .select('*')
      .in('risk_level', ['high_risk', 'watch'])
      .gte('production_date', startDate.toISOString().split('T')[0])
      .lte('production_date', endDate.toISOString().split('T')[0])
      .order('rejected_quantity', { ascending: false });

    if (error || !batches) {
      return [];
    }

    const data = batches.map(b => {
      const rejectionRate = b.produced_quantity > 0 
        ? ((b.rejected_quantity / b.produced_quantity) * 100).toFixed(2)
        : '0.00';

      return [
        b.batch_number,
        b.product_code || 'N/A',
        b.produced_quantity?.toString() || '0',
        b.rejected_quantity?.toString() || '0',
        `${rejectionRate}%`,
        b.risk_level,
        b.production_date,
      ];
    });

    return [
      ['Batch Number', 'Product Code', 'Produced', 'Rejected', 'Rejection Rate', 'Risk Level', 'Production Date'],
      ...data,
    ];
  } catch (error) {
    console.error('Error generating batch risk report:', error);
    return [];
  }
}

/**
 * Generate supplier performance data
 */
async function generateSupplierPerformance(startDate: Date, endDate: Date) {
  try {
    // Get suppliers with their batch data
    const { data: suppliers, error } = await supabaseAdmin
      .from('suppliers')
      .select('*, batch_suppliers:batch_suppliers(batch:batches(produced_quantity, rejected_quantity, production_date))')
      .eq('is_active', true);

    if (error || !suppliers) {
      return [];
    }

    const data = suppliers.map(s => {
      const batches = s.batch_suppliers?.map((bs: { batch?: { produced_quantity?: number; rejected_quantity?: number } }) => bs.batch).filter(Boolean) || [];
      const totalProduced = batches.reduce((sum: number, b: { produced_quantity?: number }) => sum + (b.produced_quantity || 0), 0);
      const totalRejected = batches.reduce((sum: number, b: { rejected_quantity?: number }) => sum + (b.rejected_quantity || 0), 0);
      const rejectionRate = totalProduced > 0 ? ((totalRejected / totalProduced) * 100).toFixed(2) : '0.00';

      // Determine grade
      let grade = 'good';
      const rate = parseFloat(rejectionRate);
      if (rate >= 15) grade = 'poor';
      else if (rate >= 8) grade = 'fair';
      else if (rate < 5) grade = 'excellent';

      return [
        s.supplier_code,
        s.supplier_name,
        batches.length.toString(),
        totalProduced.toString(),
        totalRejected.toString(),
        `${rejectionRate}%`,
        grade,
        s.rating?.toString() || '0',
      ];
    });

    // Sort by rejection rate (worst first)
    const sorted = data.sort((a, b) => parseFloat(b[5]) - parseFloat(a[5]));

    return [
      ['Supplier Code', 'Supplier Name', 'Batches', 'Produced', 'Rejected', 'Rejection Rate', 'Grade', 'Rating'],
      ...sorted,
    ];
  } catch (error) {
    console.error('Error generating supplier performance:', error);
    return [];
  }
}

/**
 * Generate Excel file from report data
 */
async function generateExcel(title: string, data: string[][]): Promise<Buffer> {
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet(data);
  
  // Set column widths
  const colWidths = data[0].map(() => ({ wch: 20 }));
  ws['!cols'] = colWidths;
  
  XLSX.utils.book_append_sheet(wb, ws, title);
  
  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
}

/**
 * GET - List available report types
 */
export async function GET() {
  return NextResponse.json({
    success: true,
    data: {
      reportTypes: Object.entries(reportConfigs).map(([id, config]) => ({
        id,
        ...config,
      })),
      formats: ['PDF', 'Excel'],
      periods: ['7d', '30d', '60d', '90d'],
    },
  });
}
