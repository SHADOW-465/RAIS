/**
 * Individual Batch API Route
 * GET /api/batches/[id] - Get batch details
 */

import { NextRequest, NextResponse } from 'next/server';
import { getBatchById } from '@/lib/db/repositories/batchRepository';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * Get single batch by ID with full details (inspections, defects, suppliers)
 */
export async function GET(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { id } = await context.params;

    // Validate UUID format
    if (!isValidUUID(id)) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'INVALID_ID',
            message: 'Invalid batch ID format',
          },
        },
        { status: 400 }
      );
    }

    // Fetch batch details
    const batch = await getBatchById(id);

    if (!batch) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'BATCH_NOT_FOUND',
            message: 'Batch not found',
          },
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: batch,
      meta: {
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('Batch detail API error:', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'BATCH_ERROR',
          message: error instanceof Error ? error.message : 'Failed to fetch batch',
        },
      },
      { status: 500 }
    );
  }
}

/**
 * Validate UUID format
 */
function isValidUUID(id: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(id);
}
