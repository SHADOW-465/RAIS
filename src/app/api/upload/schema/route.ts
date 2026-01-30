import { NextRequest, NextResponse } from 'next/server';
import { excelProcessor } from '@/lib/upload';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const sheetIndex = parseInt(formData.get('sheetIndex') as string || '0', 10);
    
    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }
    
    // Validate file type
    if (!file.name.match(/\.(xlsx|xls)$/i)) {
      return NextResponse.json(
        { error: 'Invalid file format. Only .xlsx and .xls files are supported' },
        { status: 400 }
      );
    }
    
    // Read file buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    
    // Detect schema
    const result = excelProcessor.detectSchema(buffer, sheetIndex);
    
    return NextResponse.json({
      success: true,
      ...result,
      filename: file.name,
      size: file.size,
    });
    
  } catch (error) {
    console.error('Schema detection error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to detect schema' },
      { status: 500 }
    );
  }
}
