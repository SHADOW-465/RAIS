/**
 * Excel Parser
 * Parse Excel files using xlsx library
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
// MAIN PARSER
// ============================================================================

/**
 * Parse an Excel file from a Buffer
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

      // Convert sheet to JSON with headers
      const jsonData = XLSX.utils.sheet_to_json(worksheet, {
        header: 1, // Use array format first to get headers
        defval: null,
        blankrows: false,
      }) as unknown[][];

      if (jsonData.length === 0) {
        errors.push(`Sheet "${sheetName}" has no data`);
        continue;
      }

      // First row is headers
      const headerRow = jsonData[0] as (string | number | null)[];
      const headers = headerRow
        .map((h, i) => (h ? String(h).trim().toLowerCase().replace(/\s+/g, '_') : `column_${i}`))
        .filter((h) => h !== '');

      // Convert remaining rows to objects
      const dataRows = jsonData.slice(1);
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
