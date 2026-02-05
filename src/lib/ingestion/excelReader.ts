/**
 * RAIS v2.0 - Schema-Driven Excel Reader
 * 
 * RESPONSIBILITIES:
 * 1. Read Excel files to raw arrays
 * 2. Delegate to DataNormalizer for schema detection and parsing
 * 3. Return standardized data
 */

import crypto from 'crypto';
import * as XLSX from 'xlsx';
import { DataNormalizer, NormalizedRow } from './normalizer';

export interface ParseResult {
  success: boolean;
  sheets: {
    name: string;
    dataRows: Record<string, any>[]; // Keep as Record<string, any>[] for dbInserter
    normalizedRows: NormalizedRow[]; // New system
    headers: string[];
    totalRows: number;
  }[];
  metadata: {
    fileType: string;
    totalRows: number;
    fileSize: number;
  };
  fileHash: string;
  error?: string;
  errors?: string[];
}

/**
 * Calculate MD5 hash of a buffer
 */
export function calculateFileHash(buffer: Buffer): string {
  return crypto.createHash('md5').update(buffer).digest('hex');
}

export const parseExcelBuffer = (buffer: Buffer, fileName: string): ParseResult => {
  const fileHash = calculateFileHash(buffer);

  try {
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const sheets = [];
    let totalRows = 0;

    for (const sheetName of workbook.SheetNames) {
      const worksheet = workbook.Sheets[sheetName];

      // Get data as Record objects for the old pipeline
      const dataRows = XLSX.utils.sheet_to_json(worksheet, { defval: null, blankrows: false }) as Record<string, any>[];

      // Get raw data as array of arrays for the normalizer
      const rawArrays = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: null, blankrows: false }) as any[][];

      // Get headers from first row
      const headers = (rawArrays[0] as string[]) || [];

      // Normalize
      const normalizedRows = DataNormalizer.normalizeSheet(rawArrays);

      if (dataRows.length > 0) {
        sheets.push({
          name: sheetName,
          dataRows,
          normalizedRows,
          headers,
          totalRows: dataRows.length
        });
        totalRows += dataRows.length;
      }
    }

    return {
      success: true,
      sheets,
      fileHash,
      metadata: {
        fileType: fileName.split('.').pop() || 'unknown',
        totalRows,
        fileSize: buffer.length
      }
    };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error parsing Excel:', error);
    return {
      success: false,
      sheets: [],
      fileHash,
      metadata: { fileType: 'unknown', totalRows: 0, fileSize: buffer.length },
      error: errorMsg,
      errors: [errorMsg]
    };
  }
};

/**
 * Preview first N rows of first sheet
 */
export function previewSheet(
  buffer: Buffer,
  maxRows: number = 10
): { headers: string[]; rows: any[]; headerRow: number } | null {
  const result = parseExcelBuffer(buffer, 'preview.xlsx');
  if (!result.success || result.sheets.length === 0) return null;

  const sheet = result.sheets[0];
  return {
    headers: sheet.headers,
    rows: sheet.dataRows.slice(0, maxRows),
    headerRow: 0
  };
}
