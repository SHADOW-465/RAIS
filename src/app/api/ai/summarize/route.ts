import { NextRequest, NextResponse } from 'next/server';
import { geminiService } from '@/lib/ai';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type, data } = body;

    if (!type || !data) {
      return NextResponse.json(
        { error: 'Missing type or data' },
        { status: 400 }
      );
    }

    if (type === 'health') {
      const result = await geminiService.generateHealthSummary(data);
      return NextResponse.json({
        summary: result.summary,
        confidence: result.confidence,
        generatedAt: new Date().toISOString(),
      });
    }

    return NextResponse.json(
      { error: 'Unknown summary type' },
      { status: 400 }
    );
  } catch (error) {
    console.error('AI summarization error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate summary' },
      { status: 500 }
    );
  }
}
