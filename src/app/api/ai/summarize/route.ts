/**
 * AI Summarize API Route
 * POST /api/ai/summarize
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { generateHealthSummary } from '@/lib/ai/gemini';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Request body schema
const SummarizeRequestSchema = z.object({
  rejectionRate: z.number().min(0).max(100),
  trend: z.enum(['up', 'down', 'stable']),
  rejectedCount: z.number().min(0),
  highRiskBatches: z.array(
    z.object({
      batchNumber: z.string(),
      rejectionRate: z.number(),
    })
  ),
  topDefect: z.object({
    type: z.string(),
    percentage: z.number(),
  }),
});

type SummarizeRequest = z.infer<typeof SummarizeRequestSchema>;

/**
 * Generate AI health summary from KPI data
 */
export async function POST(request: NextRequest) {
  try {
    // Parse and validate request body
    const body = await request.json();
    const parseResult = SummarizeRequestSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid request body',
            details: parseResult.error.flatten().fieldErrors,
          },
        },
        { status: 400 }
      );
    }

    const data: SummarizeRequest = parseResult.data;

    // Generate AI summary
    const insight = await generateHealthSummary({
      rejectionRate: data.rejectionRate,
      trend: data.trend,
      rejectedCount: data.rejectedCount,
      highRiskBatches: data.highRiskBatches,
      topDefect: data.topDefect,
    });

    return NextResponse.json({
      success: true,
      data: {
        text: insight.insight_text,
        sentiment: insight.sentiment,
        confidence: insight.confidence_score,
        actionItems: insight.action_items,
        generatedAt: insight.generated_at,
        expiresAt: insight.expires_at,
      },
      meta: {
        timestamp: new Date().toISOString(),
        cached: !!insight.last_accessed_at,
      },
    });
  } catch (error) {
    console.error('AI Summarize error:', error);

    // Check if it's a Gemini API error
    const errorMessage = error instanceof Error ? error.message : 'Failed to generate AI summary';
    const isApiKeyError =
      errorMessage.includes('API key') || errorMessage.includes('GEMINI_API_KEY');

    return NextResponse.json(
      {
        success: false,
        error: {
          code: isApiKeyError ? 'API_KEY_ERROR' : 'AI_ERROR',
          message: errorMessage,
        },
      },
      { status: isApiKeyError ? 503 : 500 }
    );
  }
}

/**
 * GET endpoint returns usage info
 */
export async function GET() {
  return NextResponse.json({
    success: true,
    data: {
      endpoint: '/api/ai/summarize',
      method: 'POST',
      description: 'Generate AI health summary from KPI data',
      requiredFields: {
        rejectionRate: 'number (0-100)',
        trend: 'string (up|down|stable)',
        rejectedCount: 'number',
        highRiskBatches: 'array of { batchNumber, rejectionRate }',
        topDefect: '{ type, percentage }',
      },
    },
  });
}
