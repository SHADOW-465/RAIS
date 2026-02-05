/**
 * RAIS v2.0 - Schema-Driven Excel Reader
 * 
 * RESPONSIBILITIES:
 * 1. Read Excel files to raw arrays
 * 2. Delegate to DataNormalizer for schema detection and parsing
 * 3. Return standardized data
 */

import * as XLSX from 'xlsx';
import { DataNormalizer, NormalizedRow } from './normalizer';

export interface ParseResult {
  success: boolean;
  sheets: {
    name: string;
    dataRows: NormalizedRow[];
  }[];
  metadata: {
    fileType: string;
    totalRows: number;
  };
  error?: string;
}

export const parseExcelBuffer = (buffer: Buffer, fileName: string): ParseResult => {
  try {
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const sheets = [];
    let totalRows = 0;

    for (const sheetName of workbook.SheetNames) {
      const worksheet = workbook.Sheets[sheetName];
      // Use header:1 to get raw array of arrays
      const rawData = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: null, blankrows: false });

      // Normalize
      const normalizedData = DataNormalizer.normalizeSheet(rawData as any[][]);

      if (normalizedData.length > 0) {
        sheets.push({
          name: sheetName,
          dataRows: normalizedData
        });
        totalRows += normalizedData.length;
      }
    }

    return {
      success: true,
      sheets,
      metadata: {
        fileType: fileName.split('.').pop() || 'unknown',
        totalRows
      }
    };
  } catch (error) {
    console.error('Error parsing Excel:', error);
    return {
      success: false,
      sheets: [],
      metadata: { fileType: 'unknown', totalRows: 0 },
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
};

/**
 * Preview first N rows of first sheet (Updated for raw preview)
 */
export function previewSheet(
  buffer: Buffer,
  maxRows: number = 10
): { headers: string[]; rows: any[]; headerRow: number } | null {
  const result = parseExcelBuffer(buffer, 'preview.xlsx');
  if (!result.success || result.sheets.length === 0) return null;

  // Normalized Data doesn't have "Headers" per se, it has properties
  return {
    headers: ['Date', 'Produced', 'Rejected', 'Defects'],
    rows: result.sheets[0].dataRows.slice(0, maxRows),
    headerRow: 0
  };
}
