import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';
import { excelProcessor } from '@/lib/upload';
import { uploadRepository } from '@/lib/db/repositories/uploadRepository';
import { supabaseAdmin } from '@/lib/db/supabaseClient';
import { config } from '@/lib/config';

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const mappingsJson = formData.get('mappings') as string;
    const optionsJson = formData.get('options') as string;
    
    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }
    
    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: 'File too large', maxSize: MAX_FILE_SIZE },
        { status: 413 }
      );
    }
    
    // Validate file type
    if (!file.name.match(/\.(xlsx|xls)$/i)) {
      return NextResponse.json(
        { error: 'Invalid file format. Only .xlsx and .xls files are supported' },
        { status: 400 }
      );
    }
    
    // Parse mappings
    let mappings;
    try {
      mappings = JSON.parse(mappingsJson || '[]');
    } catch {
      return NextResponse.json(
        { error: 'Invalid mappings JSON' },
        { status: 400 }
      );
    }
    
    // Parse options
    let options;
    try {
      options = JSON.parse(optionsJson || '{}');
    } catch {
      options = {};
    }
    
    // Read file buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    
    // Calculate file hash for duplicate detection
    const fileHash = crypto.createHash('sha256').update(buffer).digest('hex');
    
    // Check for duplicates
    const existing = await uploadRepository.findByHash(fileHash);
    if (existing && options.onDuplicate !== 'PROCESS') {
      return NextResponse.json(
        { 
          error: 'File already uploaded', 
          uploadedAt: existing.uploadedAt,
          fileId: existing.id,
        },
        { status: 409 }
      );
    }
    
    // Create upload record
    const uploadId = await uploadRepository.create({
      originalFilename: file.name,
      fileHash,
      fileSizeBytes: file.size,
      status: 'PROCESSING',
    });
    
    // Upload to Supabase Storage
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const fileName = `${uuidv4()}_${file.name}`;
    const storagePath = `${year}/${month}/${fileName}`;
    
    const { error: storageError } = await supabaseAdmin.storage
      .from(config.SUPABASE_STORAGE_BUCKET)
      .upload(storagePath, buffer, {
        contentType: file.type || 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        upsert: false,
      });
    
    if (storageError) {
      console.error('Supabase Storage error:', storageError);
      // Update record as failed
      await uploadRepository.update(uploadId, {
        status: 'FAILED',
        errorMessage: `Storage upload failed: ${storageError.message}`,
      });
      
      return NextResponse.json(
        { error: 'Failed to upload file to storage' },
        { status: 500 }
      );
    }
    
    // Update upload record with storage path
    await uploadRepository.update(uploadId, {
      storedPath: storagePath,
    });
    
    // Process Excel
    const result = await excelProcessor.process(buffer, mappings, {
      ...options,
      uploadedFileId: uploadId,
    });
    
    // Update upload record with results
    await uploadRepository.update(uploadId, {
      status: result.success ? 'COMPLETED' : 'FAILED',
      recordsProcessed: result.recordsProcessed,
      recordsFailed: result.recordsFailed,
      errorMessage: result.errors.length > 0 ? JSON.stringify(result.errors.slice(0, 10)) : undefined,
    });
    
    return NextResponse.json({
      success: result.success,
      fileId: uploadId,
      recordsProcessed: result.recordsProcessed,
      recordsFailed: result.recordsFailed,
      errors: result.errors,
    });
    
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
