/**
 * Batches API Route
 * GET /api/batches - List batches with filtering
 * POST /api/batches - Create new batch
 */

import { NextRequest, NextResponse } from 'next/server';
import { getBatches, createBatch } from '@/lib/db/repositories/batchRepository';
import type { BatchFilters, PaginationParams, BatchInsert } from '@/lib/db/types';
import { z } from 'zod';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

const BatchFiltersSchema = z.object({
  status: z.enum(['in_progress', 'completed', 'scrapped']).optional(),
  risk_level: z.enum(['normal', 'watch', 'high_risk']).optional(),
  product_code: z.string().optional(),
  date_from: z.string().optional(),
  date_to: z.string().optional(),
  search: z.string().optional(),
});

const PaginationSchema = z.object({
  limit: z.coerce.number().min(1).max(100).default(50),
  offset: z.coerce.number().min(0).default(0),
  sort_by: z.string().default('production_date'),
  sort_order: z.enum(['asc', 'desc']).default('desc'),
});

const BatchCreateSchema = z.object({
  batch_number: z.string().min(1).max(50),
  product_code: z.string().max(50).optional(),
  product_name: z.string().max(200).optional(),
  planned_quantity: z.number().positive(),
  produced_quantity: z.number().nonnegative().default(0),
  rejected_quantity: z.number().nonnegative().default(0),
  production_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  status: z.enum(['in_progress', 'completed', 'scrapped']).default('in_progress'),
  notes: z.string().optional(),
});

// ============================================================================
// GET - List Batches
// ============================================================================

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    
    // Parse and validate filters
    const filterParams = Object.fromEntries(searchParams.entries());
    const filtersResult = BatchFiltersSchema.safeParse(filterParams);
    
    if (!filtersResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'INVALID_FILTERS',
            message: 'Invalid filter parameters',
            details: filtersResult.error.format(),
          },
        },
        { status: 400 }
      );
    }

    // Parse and validate pagination
    const paginationResult = PaginationSchema.safeParse(filterParams);
    
    if (!paginationResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'INVALID_PAGINATION',
            message: 'Invalid pagination parameters',
            details: paginationResult.error.format(),
          },
        },
        { status: 400 }
      );
    }

    // Fetch batches
    const result = await getBatches(
      filtersResult.data as BatchFilters,
      paginationResult.data as PaginationParams
    );

    return NextResponse.json({
      success: true,
      data: result,
      meta: {
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('Batches API error:', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'BATCHES_ERROR',
          message: error instanceof Error ? error.message : 'Failed to fetch batches',
        },
      },
      { status: 500 }
    );
  }
}

// ============================================================================
// POST - Create Batch
// ============================================================================

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate request body
    const validationResult = BatchCreateSchema.safeParse(body);
    
    if (!validationResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid batch data',
            details: validationResult.error.format(),
          },
        },
        { status: 400 }
      );
    }

    // Create batch
    const batch = await createBatch(validationResult.data as BatchInsert);

    return NextResponse.json(
      {
        success: true,
        data: batch,
        meta: {
          timestamp: new Date().toISOString(),
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Batch creation error:', error);
    
    // Handle unique constraint violation
    if (error instanceof Error && error.message.includes('unique')) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'DUPLICATE_BATCH_NUMBER',
            message: 'Batch number already exists',
          },
        },
        { status: 409 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'CREATE_ERROR',
          message: error instanceof Error ? error.message : 'Failed to create batch',
        },
      },
      { status: 500 }
    );
  }
}
