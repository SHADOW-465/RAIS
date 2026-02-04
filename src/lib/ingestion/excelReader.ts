/**
 * RAIS v2.0 - Pure Excel Reader
 * 
 * RESPONSIBILITIES:
 * 1. Read Excel files to raw arrays
 * 2. Detect header row
 * 3. Return structured data
 * 
 * NO AI, NO INFERENCE, NO MODIFICATION
 * Just parse and return what's in the file
 */

import * as XLSX from 'xlsx';
import { createHash } from 'crypto';

// ============================================================================
// TYPES
// ============================================================================

export interface RawSheet {
  name: string;
  rawData: unknown[][]; // Raw 2D array as read from Excel
  headerRowIndex: number;
  headers: string[];
  dataRows: Record<string, unknown>[];
  totalRows: number;
}

export interface ExcelParseResult {
  success: boolean;
  fileHash: string;
  sheets: RawSheet[];
  metadata: {
    fileName: string;
    fileSize: number;
    sheetCount: number;
    totalDataRows: number;
  };
  errors: string[];
}

// ============================================================================
// HEADER DETECTION KEYWORDS
// Domain-specific terms for manufacturing/quality reports
// ============================================================================

const HEADER_KEYWORDS = [
  // Identification
  'batch', 'lot', 'id', 'number', 'no', 'code', 'ref', 's.no',
  // Dates
  'date', 'time', 'day', 'month', 'year',
  // Quantities
  'qty', 'quantity', 'count', 'total', 'amount', 'trolleys',
  // Quality terms
  'reject', 'defect', 'fail', 'pass', 'ok', 'ng', 'scrap',
  'visual', 'assembly', 'integrity', 'inspection', 'check',
  'rejection', 'accepted', 'hold', 'checked', 'acpt', 'chkd',
  // Production
  'produced', 'production', 'dispatch', 'output',
  // Defect types (common in files)
  'coag', 'raised', 'wire', 'surface', 'black', 'mark',
  'webbing', 'missing', 'formers', 'bubble', 'leakage',
  // People
  'inspector', 'operator', 'verified', 'by',
  // Status
  'status', 'result', 'remarks',
];

// ============================================================================
// MAIN FUNCTIONS
// ============================================================================

/**
 * Parse Excel buffer and return raw data
 * This is a PURE function - no side effects, no AI calls
 */
export function parseExcelBuffer(
  buffer: Buffer,
  fileName: string
): ExcelParseResult {
  const errors: string[] = [];
  const sheets: RawSheet[] = [];

  try {
    // Calculate file hash for deduplication
    const fileHash = createHash('sha256').update(buffer).digest('hex');

    // Read workbook
    const workbook = XLSX.read(buffer, {
      type: 'buffer',
      cellDates: true,
      cellNF: true,
      cellText: true,
      raw: false, // Apply number formatting
    });

    if (workbook.SheetNames.length === 0) {
      return {
        success: false,
        fileHash,
        sheets: [],
        metadata: {
          fileName,
          fileSize: buffer.length,
          sheetCount: 0,
          totalDataRows: 0,
        },
        errors: ['No sheets found in Excel file'],
      };
    }

    let totalDataRows = 0;

    // Process each sheet
    for (const sheetName of workbook.SheetNames) {
      const worksheet = workbook.Sheets[sheetName];
      if (!worksheet) continue;

      // Get raw 2D array
      const rawData = XLSX.utils.sheet_to_json<unknown[]>(worksheet, {
        header: 1,
        defval: null,
        blankrows: false,
      });

      if (rawData.length === 0) {
        errors.push(`Sheet "${sheetName}" is empty`);
        continue;
      }

      // Detect header row
      const headerRowIndex = detectHeaderRow(rawData);
      const headerRow = rawData[headerRowIndex] as (string | number | null)[];

      // Normalize headers
      const headers = normalizeHeaders(headerRow);

      // Convert data rows to objects (skip header row)
      const dataRows: Record<string, unknown>[] = [];
      for (let i = headerRowIndex + 1; i < rawData.length; i++) {
        const row = rawData[i] as unknown[];
        if (isEmptyRow(row)) continue;

        const rowObj: Record<string, unknown> = {};
        headers.forEach((header, index) => {
          const value = row[index];
          rowObj[header] = normalizeValue(value);
        });
        dataRows.push(rowObj);
      }

      totalDataRows += dataRows.length;

      sheets.push({
        name: sheetName,
        rawData,
        headerRowIndex,
        headers,
        dataRows,
        totalRows: dataRows.length,
      });
    }

    return {
      success: errors.length === 0 && sheets.length > 0,
      fileHash,
      sheets,
      metadata: {
        fileName,
        fileSize: buffer.length,
        sheetCount: sheets.length,
        totalDataRows,
      },
      errors,
    };
  } catch (error) {
    return {
      success: false,
      fileHash: '',
      sheets: [],
      metadata: {
        fileName,
        fileSize: buffer.length,
        sheetCount: 0,
        totalDataRows: 0,
      },
      errors: [`Parse error: ${error instanceof Error ? error.message : 'Unknown error'}`],
    };
  }
}

/**
 * Detect header row in raw data
 * Scans first 20 rows for the most likely header
 */
export function detectHeaderRow(rawData: unknown[][]): number {
  if (rawData.length === 0) return 0;

  const maxScan = Math.min(20, rawData.length);
  let bestScore = 0;
  let bestIndex = 0;

  for (let i = 0; i < maxScan; i++) {
    const row = rawData[i];
    if (!Array.isArray(row)) continue;

    const score = scoreAsHeader(row);
    const nonEmptyCells = row.filter(cell => cell !== null && cell !== undefined && cell !== '').length;

    // Require at least 3 non-empty cells
    if (nonEmptyCells >= 3 && score > bestScore) {
      bestScore = score;
      bestIndex = i;
    }
  }

  return bestIndex;
}

/**
 * Score a row to determine if it's likely a header
 */
function scoreAsHeader(row: unknown[]): number {
  let score = 0;
  let matchedCells = 0;

  for (const cell of row) {
    if (cell === null || cell === undefined || cell === '') continue;

    const cellStr = String(cell).toLowerCase().trim();
    if (cellStr === '') continue;

    // Check for header keywords
    for (const keyword of HEADER_KEYWORDS) {
      if (cellStr.includes(keyword)) {
        score += 10;
        matchedCells++;
        break;
      }
    }

    // Bonus for text-like cells (headers are usually text)
    if (typeof cell === 'string') {
      const letterRatio = (cellStr.match(/[a-z]/gi) || []).length / cellStr.length;
      if (letterRatio > 0.7) {
        score += 3;
      }
    }

    // Penalty for numeric cells (data, not headers)
    if (typeof cell === 'number') {
      score -= 5;
    }
  }

  // Bonus for multiple keyword matches
  if (matchedCells >= 3) score += 15;
  if (matchedCells >= 5) score += 20;

  return Math.max(0, score);
}

/**
 * Normalize header names to consistent format
 */
function normalizeHeaders(headerRow: (string | number | null)[]): string[] {
  const seen = new Set<string>();
  
  return headerRow.map((cell, index) => {
    if (cell === null || cell === undefined || cell === '') {
      return `column_${index}`;
    }

    // Normalize: lowercase, replace separators with underscore
    let normalized = String(cell)
      .toLowerCase()
      .trim()
      .replace(/[\s\-\.\/\n\r]+/g, '_')
      .replace(/[^a-z0-9_]/g, '')
      .replace(/_+/g, '_')
      .replace(/^_|_$/g, '');

    if (normalized === '') {
      normalized = `column_${index}`;
    }

    // Handle duplicates
    let uniqueName = normalized;
    let counter = 1;
    while (seen.has(uniqueName)) {
      uniqueName = `${normalized}_${counter}`;
      counter++;
    }
    seen.add(uniqueName);

    return uniqueName;
  });
}

/**
 * Normalize cell values
 */
function normalizeValue(value: unknown): unknown {
  if (value === null || value === undefined) return null;

  // Handle dates
  if (value instanceof Date) {
    return value.toISOString().split('T')[0];
  }

  // Handle strings
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (trimmed === '') return null;
    
    // Try to parse as number if it looks like one
    const asNumber = Number(trimmed.replace(/,/g, ''));
    if (!isNaN(asNumber) && trimmed.match(/^[\d,.-]+$/)) {
      return asNumber;
    }
    
    return trimmed;
  }

  // Handle numbers (check for Excel serial dates)
  if (typeof value === 'number') {
    // Excel serial date range (1900-2100)
    if (value > 1 && value < 100000 && Number.isInteger(value) === false) {
      // Likely a date with time component - return as-is for now
      return value;
    }
    return value;
  }

  return value;
}

/**
 * Check if a row is empty
 */
function isEmptyRow(row: unknown[]): boolean {
  if (!Array.isArray(row)) return true;
  return row.every(cell => cell === null || cell === undefined || cell === '');
}

/**
 * Calculate SHA256 hash of buffer
 */
export function calculateFileHash(buffer: Buffer): string {
  return createHash('sha256').update(buffer).digest('hex');
}

/**
 * Get sheet names without full parse (quick preview)
 */
export function getSheetNames(buffer: Buffer): string[] {
  try {
    const workbook = XLSX.read(buffer, { type: 'buffer', bookSheets: true });
    return workbook.SheetNames;
  } catch {
    return [];
  }
}

/**
 * Preview first N rows of first sheet
 */
export function previewSheet(
  buffer: Buffer,
  maxRows: number = 10
): { headers: string[]; rows: Record<string, unknown>[]; headerRow: number } | null {
  const result = parseExcelBuffer(buffer, 'preview');
  
  if (!result.success || result.sheets.length === 0) {
    return null;
  }

  const sheet = result.sheets[0];
  return {
    headers: sheet.headers,
    rows: sheet.dataRows.slice(0, maxRows),
    headerRow: sheet.headerRowIndex,
  };
}
