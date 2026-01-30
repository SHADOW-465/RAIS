import { NextRequest, NextResponse } from 'next/server';
import { supplierRepository } from '@/lib/db/repositories/supplierRepository';

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
    
    const suppliers = await supplierRepository.getStats(fromDate, toDate);
    
    return NextResponse.json({ suppliers });
    
  } catch (error) {
    console.error('Suppliers API error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch suppliers' },
      { status: 500 }
    );
  }
}
