/**
 * Excel Parser
 * Parse Excel files using xlsx library with smart header detection
 */

import * as XLSX from 'xlsx';

// ============================================================================
// TYPES
// ============================================================================

export interface ParsedSheet {
  name: string;
  headers: string[];
  rows: Record<string, unknown>[];
  rowCount: number;
  headerRowIndex: number; // Added: Track which row was detected as header
}

export interface ParseResult {
  success: boolean;
  sheets: ParsedSheet[];
  errors: string[];
  metadata: {
    fileName?: string;
    sheetCount: number;
    totalRows: number;
  };
}

// ============================================================================
// SMART HEADER DETECTION
// ============================================================================

/**
 * Keywords that indicate a row is likely a header row
 * These are domain-specific terms commonly found in manufacturing/quality reports
 */
const HEADER_KEYWORDS = [
  // Batch/Identification
  'batch', 'lot', 'id', 'number', 'no', 'code', 'ref',
  // Dates
  'date', 'time', 'day', 'month', 'year', 'created', 'updated',
  // Quantities
  'qty', 'quantity', 'count', 'total', 'amount', 'volume',
  // Quality/Inspection
  'reject', 'defect', 'fail', 'pass', 'ok', 'ng', 'scrap',
  'visual', 'assembly', 'integrity', 'inspection', 'check',
  'rejection', 'accepted', 'hold', 'checked', 'acpt', 'chkd',
  // Production
  'produced', 'manufactured', 'output', 'completed', 'done',
  'dispatch', 'production', 'trolleys',
  // Defects
  'scratch', 'dent', 'crack', 'leak', 'damage', 'error',
  'coag', 'raised', 'wire', 'surface', 'overlaping', 'black', 'mark',
  'webbing', 'missing', 'formers', 'bubble', 'thin', 'spod',
  // People
  'inspector', 'operator', 'qc', 'checker', 'verified', 'by',
  // Status
  'status', 'result', 'outcome', 'verdict', 'grade',
  's.no', 'remarks', 's.no.', 'month',
  // Product
  'product', 'item', 'part', 'component', 'material', 'sku',
  // Supplier
  'supplier', 'vendor', 'source', 'origin',
];

/**
 * Score a row to determine if it's a header row
 * Returns a score from 0-100 based on keyword matches
 */
function scoreRowAsHeader(row: unknown[]): number {
  if (!row || row.length === 0) return 0;

  let score = 0;
  let matchedCells = 0;
  const totalCells = row.length;

  for (const cell of row) {
    if (cell === null || cell === undefined || cell === '') continue;

    const cellStr = String(cell).toLowerCase().trim();
    if (cellStr === '') continue;

    // Check if cell contains any header keywords
    for (const keyword of HEADER_KEYWORDS) {
      if (cellStr.includes(keyword)) {
        score += 10;
        matchedCells++;
        break;
      }
    }

    // Bonus: Cell looks like a column name (short, no numbers, no special chars)
    if (cellStr.length > 2 && cellStr.length < 50) {
      // Check if it's mostly letters (typical for headers)
      const letterRatio = (cellStr.match(/[a-z]/g) || []).length / cellStr.length;
      if (letterRatio > 0.7) {
        score += 2;
      }
    }

    // Penalty: Contains mostly numbers (likely data, not header)
    const numRatio = (cellStr.match(/\d/g) || []).length / cellStr.length;
    if (numRatio > 0.5) {
      score -= 5;
    }
  }

  // Bonus for having multiple cells match
  if (matchedCells >= 3) {
    score += 15;
  }
  if (matchedCells >= 5) {
    score += 20;
  }

  // Normalize to 0-100 based on row length
  return Math.min(100, Math.max(0, score));
}

/**
 * Detect the header row in a dataset
 * Scans the first 20 rows and returns the index of the best header candidate
 */
export function detectHeaderRow(sheetData: unknown[][]): number {
  if (!sheetData || sheetData.length === 0) return 0;

  const maxScanRows = Math.min(20, sheetData.length);
  let bestScore = 0;
  let bestIndex = 0;

  for (let i = 0; i < maxScanRows; i++) {
    const row = sheetData[i];
    const score = scoreRowAsHeader(row);

    // Must have at least 2 cells to be considered
    const nonEmptyCells = row.filter(cell => cell !== null && cell !== undefined && cell !== '').length;
    if (nonEmptyCells < 2) continue;

    if (score > bestScore) {
      bestScore = score;
      bestIndex = i;
    }
  }

  // If best score is too low, default to row 0 (but log warning)
  if (bestScore < 20) {
    console.warn(`Low confidence header detection (score: ${bestScore}). Using row ${bestIndex}.`);
  }

  return bestIndex;
}

// ============================================================================
// MAIN PARSER
// ============================================================================

/**
 * Parse an Excel file from a Buffer with smart header detection
 * @param buffer - File buffer from upload
 * @param options - Parser options
 * @returns ParseResult with sheets data or errors
 */
export async function parseExcelBuffer(
  buffer: Buffer,
  options: { sheetIndex?: number; maxRows?: number } = {}
): Promise<ParseResult> {
  const errors: string[] = [];
  const sheets: ParsedSheet[] = [];

  try {
    // Read workbook from buffer
    const workbook = XLSX.read(buffer, {
      type: 'buffer',
      cellDates: true,
      cellNF: true,
      cellText: true,
    });

    if (!workbook.SheetNames.length) {
      return {
        success: false,
        sheets: [],
        errors: ['No sheets found in the Excel file'],
        metadata: { sheetCount: 0, totalRows: 0 },
      };
    }

    const sheetsToProcess =
      options.sheetIndex !== undefined
        ? [workbook.SheetNames[options.sheetIndex]]
        : workbook.SheetNames;

    let totalRows = 0;

    for (const sheetName of sheetsToProcess) {
      if (!sheetName) continue;

      const worksheet = workbook.Sheets[sheetName];
      if (!worksheet) {
        errors.push(`Sheet "${sheetName}" is empty or invalid`);
        continue;
      }

      // Convert sheet to JSON with headers (array format to preserve raw data)
      const jsonData = XLSX.utils.sheet_to_json(worksheet, {
        header: 1, // Use array format first
        defval: null,
        blankrows: false,
      }) as unknown[][];

      if (jsonData.length === 0) {
        errors.push(`Sheet "${sheetName}" has no data`);
        continue;
      }

      // SMART HEADER DETECTION
      const headerRowIndex = detectHeaderRow(jsonData);
      const headerRow = jsonData[headerRowIndex] as (string | number | null)[];

      // Normalize headers
      const headers = headerRow
        .map((h, i) => {
          if (!h) return `column_${i}`;
          return String(h).trim().toLowerCase().replace(/[\s\-\.]+/g, '_');
        })
        .filter((h) => h !== '' && h !== `column_`);

      // Convert remaining rows to objects (data starts after header)
      const dataRows = jsonData.slice(headerRowIndex + 1);
      const rows: Record<string, unknown>[] = [];

      const maxRows = options.maxRows || 10000;
      const rowsToProcess = dataRows.slice(0, maxRows);

      for (const row of rowsToProcess) {
        const rowArray = row as unknown[];
        if (!rowArray || rowArray.every((cell) => cell === null || cell === '')) {
          continue; // Skip empty rows
        }

        const rowObj: Record<string, unknown> = {};
        headers.forEach((header, index) => {
          const value = rowArray[index];
          // Clean and normalize values
          if (value instanceof Date) {
            rowObj[header] = value.toISOString().split('T')[0];
          } else if (typeof value === 'string') {
            rowObj[header] = value.trim();
          } else {
            rowObj[header] = value ?? null;
          }
        });

        rows.push(rowObj);
      }

      totalRows += rows.length;

      sheets.push({
        name: sheetName,
        headers,
        rows,
        rowCount: rows.length,
        headerRowIndex, // Track which row was the header
      });
    }

    return {
      success: errors.length === 0 && sheets.length > 0,
      sheets,
      errors,
      metadata: {
        sheetCount: sheets.length,
        totalRows,
      },
    };
  } catch (error) {
    return {
      success: false,
      sheets: [],
      errors: [
        `Failed to parse Excel file: ${error instanceof Error ? error.message : 'Unknown error'}`,
      ],
      metadata: { sheetCount: 0, totalRows: 0 },
    };
  }
}

/**
 * Parse Excel file from File object (for client-side use)
 * @param file - File object from input
 * @returns ParseResult
 */
export async function parseExcelFile(file: File): Promise<ParseResult> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const result = await parseExcelBuffer(buffer);
    result.metadata.fileName = file.name;
    return result;
  } catch (error) {
    return {
      success: false,
      sheets: [],
      errors: [
        `Failed to read file: ${error instanceof Error ? error.message : 'Unknown error'}`,
      ],
      metadata: { sheetCount: 0, totalRows: 0 },
    };
  }
}

/**
 * Get sheet names from an Excel buffer without fully parsing
 * @param buffer - File buffer
 * @returns Array of sheet names
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
 * Preview first N rows with smart header detection
 * Useful for UI preview before full upload
 */
export async function previewExcelFile(
  buffer: Buffer,
  maxRows: number = 10
): Promise<{ headers: string[]; preview: Record<string, unknown>[]; headerRowIndex: number } | null> {
  const result = await parseExcelBuffer(buffer, { maxRows });
  
  if (!result.success || result.sheets.length === 0) {
    return null;
  }

  const sheet = result.sheets[0];
  return {
    headers: sheet.headers,
    preview: sheet.rows.slice(0, maxRows),
    headerRowIndex: sheet.headerRowIndex,
  };
}
