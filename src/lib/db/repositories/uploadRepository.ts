import { pool } from '../connection';
import { UploadedFile } from '../types';

export class UploadRepository {
  async create(file: Partial<UploadedFile>): Promise<number> {
    const query = `
      INSERT INTO uploaded_files (original_filename, file_hash, file_size_bytes, status)
      VALUES ($1, $2, $3, $4)
      RETURNING id
    `;
    
    const result = await pool.query(query, [
      file.originalFilename,
      file.fileHash,
      file.fileSizeBytes,
      file.status || 'PENDING',
    ]);
    
    return result.rows[0].id;
  }

  async update(id: number, updates: Partial<UploadedFile>): Promise<void> {
    const fields: string[] = [];
    const values: (string | number | Date | undefined)[] = [];
    let paramIndex = 1;

    if (updates.storedPath !== undefined) {
      fields.push(`stored_path = $${paramIndex++}`);
      values.push(updates.storedPath);
    }
    if (updates.status !== undefined) {
      fields.push(`status = $${paramIndex++}`);
      values.push(updates.status);
    }
    if (updates.processedAt !== undefined) {
      fields.push(`processed_at = $${paramIndex++}`);
      values.push(updates.processedAt);
    }
    if (updates.recordsProcessed !== undefined) {
      fields.push(`records_processed = $${paramIndex++}`);
      values.push(updates.recordsProcessed);
    }
    if (updates.recordsFailed !== undefined) {
      fields.push(`records_failed = $${paramIndex++}`);
      values.push(updates.recordsFailed);
    }
    if (updates.errorMessage !== undefined) {
      fields.push(`error_message = $${paramIndex++}`);
      values.push(updates.errorMessage);
    }

    if (fields.length === 0) return;

    values.push(id);
    const query = `UPDATE uploaded_files SET ${fields.join(', ')} WHERE id = $${paramIndex}`;
    
    await pool.query(query, values);
  }

  async findById(id: number): Promise<UploadedFile | null> {
    const query = 'SELECT * FROM uploaded_files WHERE id = $1';
    const result = await pool.query(query, [id]);
    return result.rows[0] ? this.mapRowToFile(result.rows[0]) : null;
  }

  async findByHash(fileHash: string): Promise<UploadedFile | null> {
    const query = 'SELECT * FROM uploaded_files WHERE file_hash = $1';
    const result = await pool.query(query, [fileHash]);
    return result.rows[0] ? this.mapRowToFile(result.rows[0]) : null;
  }

  async getRecent(limit: number = 10): Promise<UploadedFile[]> {
    const query = `
      SELECT * FROM uploaded_files 
      ORDER BY uploaded_at DESC 
      LIMIT $1
    `;
    const result = await pool.query(query, [limit]);
    return result.rows.map(row => this.mapRowToFile(row));
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
      uploadedAt: row.uploaded_at,
      processedAt: row.processed_at,
      status: row.status,
      errorMessage: row.error_message,
      recordsProcessed: row.records_processed,
      recordsFailed: row.records_failed,
    };
  }
}

export const uploadRepository = new UploadRepository();
