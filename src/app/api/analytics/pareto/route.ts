import { NextRequest, NextResponse } from 'next/server';
import { rejectionRepository } from '@/lib/db/repositories/rejectionRepository';
import { calculatePareto } from '@/lib/analytics/statistics';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const from = searchParams.get('from');
    const to = searchParams.get('to');
    
    if (!from || !to) {
      return NextResponse.json(
        { error: 'Missing required parameters: from, to' },
        { status: 400 }
      );
    }
    
    const fromDate = new Date(from);
    const toDate = new Date(to);
    
    // Fetch top defects
    const topDefects = await rejectionRepository.getTopDefects(fromDate, toDate, 20);
    
    // Calculate Pareto
    const paretoItems = calculatePareto(
      topDefects.map(d => ({ name: d.defectName, value: d.count }))
    );
    
    const totalDefects = topDefects.length;
    const totalQuantity = topDefects.reduce((sum, d) => sum + d.count, 0);
    
    return NextResponse.json({
      items: paretoItems,
      totalDefects,
      totalQuantity,
    });
    
  } catch (error) {
    console.error('Pareto API error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch pareto data' },
      { status: 500 }
    );
  }
}
