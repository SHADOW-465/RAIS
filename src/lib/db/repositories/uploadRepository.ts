import { supabaseAdmin } from '../supabaseClient';
import { UploadedFile } from '../types';

export class UploadRepository {
  async create(file: Partial<UploadedFile>): Promise<number> {
    const { data, error } = await supabaseAdmin
      .from('uploaded_files')
      .insert({
        original_filename: file.originalFilename,
        file_hash: file.fileHash,
        file_size_bytes: file.fileSizeBytes,
        status: file.status || 'PENDING',
        stored_path: file.storedPath || '',
      })
      .select('id')
      .single();
    
    if (error) throw error;
    return data.id;
  }

  async update(id: number, updates: Partial<UploadedFile>): Promise<void> {
    const updateData: any = {};

    if (updates.storedPath !== undefined) {
      updateData.stored_path = updates.storedPath;
    }
    if (updates.status !== undefined) {
      updateData.status = updates.status;
    }
    if (updates.processedAt !== undefined) {
      updateData.processed_at = updates.processedAt?.toISOString();
    }
    if (updates.recordsProcessed !== undefined) {
      updateData.records_processed = updates.recordsProcessed;
    }
    if (updates.recordsFailed !== undefined) {
      updateData.records_failed = updates.recordsFailed;
    }
    if (updates.errorMessage !== undefined) {
      updateData.error_message = updates.errorMessage;
    }

    if (Object.keys(updateData).length === 0) return;

    const { error } = await supabaseAdmin
      .from('uploaded_files')
      .update(updateData)
      .eq('id', id);
    
    if (error) throw error;
  }

  async findById(id: number): Promise<UploadedFile | null> {
    const { data, error } = await supabaseAdmin
      .from('uploaded_files')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }
    return data ? this.mapRowToFile(data) : null;
  }

  async findByHash(fileHash: string): Promise<UploadedFile | null> {
    const { data, error } = await supabaseAdmin
      .from('uploaded_files')
      .select('*')
      .eq('file_hash', fileHash)
      .single();
    
    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }
    return data ? this.mapRowToFile(data) : null;
  }

  async getRecent(limit: number = 10): Promise<UploadedFile[]> {
    const { data, error } = await supabaseAdmin
      .from('uploaded_files')
      .select('*')
      .order('uploaded_at', { ascending: false })
      .limit(limit);
    
    if (error) throw error;
    return (data || []).map(row => this.mapRowToFile(row));
  }

  private mapRowToFile(row: any): UploadedFile {
    return {
      id: row.id,
      uuid: row.uuid,
      originalFilename: row.original_filename,
      storedPath: row.stored_path,
      fileSizeBytes: row.file_size_bytes,
      fileHash: row.file_hash,
      uploadedBy: row.uploaded_by,
      uploadedAt: new Date(row.uploaded_at),
      processedAt: row.processed_at ? new Date(row.processed_at) : undefined,
      status: row.status,
      errorMessage: row.error_message,
      recordsProcessed: row.records_processed,
      recordsFailed: row.records_failed,
    };
  }
}

export const uploadRepository = new UploadRepository();
