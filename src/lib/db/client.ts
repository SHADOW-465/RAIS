/**
 * Supabase Client Configuration
 * Factory functions for creating Supabase clients
 */

import { createClient } from '@supabase/supabase-js';
import type { SupabaseClient } from '@supabase/supabase-js';

// ============================================================================
// ENVIRONMENT VARIABLES
// ============================================================================

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-anon-key';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder-service-key';

const isConfigured = !!process.env.NEXT_PUBLIC_SUPABASE_URL;

// ============================================================================
// CLIENT FACTORIES
// ============================================================================

/**
 * Create a Supabase client for use in client-side components
 * Uses anon key with RLS policies
 */
export function createSupabaseClient(): SupabaseClient {
  if (!isConfigured) {
    console.warn('Supabase client credentials not configured');
  }
  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
    },
  });
}

/**
 * Create a Supabase client for use in server-side code (API routes, Server Components)
 * Uses service role key to bypass RLS policies
 * 
 * ⚠️ WARNING: Only use in server-side code! Never expose service role key to client.
 */
export function createSupabaseAdminClient(): SupabaseClient {
  if (!isConfigured) {
    console.warn('Supabase admin credentials not configured');
  }
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

/**
 * Singleton instance for server-side operations
 * Use this in API routes and Server Components
 */
export const supabaseAdmin = createSupabaseAdminClient();

/**
 * Singleton instance for client-side operations
 * Use this in Client Components
 */
export const supabase = createSupabaseClient();

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Test database connection
 */
export async function testConnection(): Promise<boolean> {
  try {
    if (!SUPABASE_URL) return false;
    const { error } = await supabaseAdmin.from('batches').select('id').limit(1);
    return !error;
  } catch {
    return false;
  }
}

/**
 * Refresh all materialized views
 * Call this after bulk data imports or periodically via cron
 */
export async function refreshMaterializedViews(): Promise<void> {
  const { error } = await supabaseAdmin.rpc('refresh_all_materialized_views');
  
  if (error) {
    console.error('Failed to refresh materialized views:', error);
    throw error;
  }
}

/**
 * Clean expired AI insights
 * Call this periodically (e.g., hourly) to free up storage
 */
export async function cleanExpiredInsights(): Promise<number> {
  const { data, error } = await supabaseAdmin.rpc('clean_expired_insights');
  
  if (error) {
    console.error('Failed to clean expired insights:', error);
    throw error;
  }
  
  return data || 0;
}

// ============================================================================
// STORAGE HELPERS
// ============================================================================

/**
 * Get Supabase Storage client for uploads bucket
 */
export function getStorageBucket(bucketName: string = 'uploads') {
  return supabaseAdmin.storage.from(bucketName);
}

/**
 * Upload file to Supabase Storage
 */
export async function uploadFile(
  file: File | Buffer,
  path: string,
  bucketName: string = 'uploads'
): Promise<{ path: string; url: string }> {
  const bucket = getStorageBucket(bucketName);
  
  const { data, error } = await bucket.upload(path, file, {
    cacheControl: '3600',
    upsert: false,
  });
  
  if (error) {
    throw new Error(`File upload failed: ${error.message}`);
  }
  
  const { data: urlData } = bucket.getPublicUrl(data.path);
  
  return {
    path: data.path,
    url: urlData.publicUrl,
  };
}

/**
 * Delete file from Supabase Storage
 */
export async function deleteFile(
  path: string,
  bucketName: string = 'uploads'
): Promise<void> {
  const bucket = getStorageBucket(bucketName);
  
  const { error } = await bucket.remove([path]);
  
  if (error) {
    throw new Error(`File deletion failed: ${error.message}`);
  }
}

/**
 * Get signed URL for private file access
 */
export async function getSignedUrl(
  path: string,
  expiresIn: number = 3600,
  bucketName: string = 'uploads'
): Promise<string> {
  const bucket = getStorageBucket(bucketName);
  
  const { data, error } = await bucket.createSignedUrl(path, expiresIn);
  
  if (error) {
    throw new Error(`Failed to create signed URL: ${error.message}`);
  }
  
  return data.signedUrl;
}

// ============================================================================
// TRANSACTION HELPERS
// ============================================================================

/**
 * Execute multiple operations in a transaction-like manner
 * Note: Supabase doesn't have native transactions, so this is a best-effort approach
 */
export async function executeInTransaction(
  operations: (() => Promise<void>)[]
): Promise<void> {
  const results: unknown[] = [];
  
  try {
    for (const operation of operations) {
      const result = await operation();
      results.push(result);
    }
  } catch (error) {
    console.error('Transaction failed, rolling back...', error);
    // In a real transaction, we'd rollback here
    // For Supabase, we'd need to implement compensation logic
    throw error;
  }
}

// ============================================================================
// ERROR HANDLING
// ============================================================================

export class DatabaseError extends Error {
  code: string;
  details?: unknown;

  constructor(message: string, code: string = 'DB_ERROR', details?: unknown) {
    super(message);
    this.name = 'DatabaseError';
    this.code = code;
    this.details = details;
  }
}

/**
 * Transform Supabase error into DatabaseError
 */
export function handleDatabaseError(error: unknown): never {
  if (error && typeof error === 'object' && 'message' in error) {
    const pgError = error as { message: string; code?: string; details?: unknown };
    throw new DatabaseError(
      pgError.message,
      pgError.code || 'UNKNOWN_ERROR',
      pgError.details
    );
  }
  
  throw new DatabaseError('Unknown database error', 'UNKNOWN_ERROR', error);
}
