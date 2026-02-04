
import { describe, it, expect } from 'vitest';
import * as XLSX from 'xlsx';
import { parseExcelBuffer, validateSchema, transformToNormalized } from '@/lib/ingestion';

describe('Ingestion Pipeline Integration', () => {
  it('should parse, validate and transform a valid Shopfloor file', async () => {
    // 1. Create a mock Excel file
    const rows = [
      ['MONTHLY SHOP FLOOR REJECTION REPORT'], // Row 1: Metadata
      ['MONTH: APRIL 25'],                   // Row 2: Metadata
      ['DATE', 'No of TROLLEYS', 'COAG', 'Raised Wire', 'Total'], // Row 3: Header
      [45748, 26, 5, 11, 26],                // Row 4: Data (Date as serial)
      [45749, 71, 17, 9, 71],                // Row 5: Data
    ];

    const worksheet = XLSX.utils.aoa_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Sheet1');
    
    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    // 2. Parse
    const parseResult = parseExcelBuffer(buffer, 'test.xlsx');
    expect(parseResult.success).toBe(true);
    expect(parseResult.sheets).toHaveLength(1);
    
    const sheet = parseResult.sheets[0];
    expect(sheet.headerRowIndex).toBe(2); // 0-based index of Row 3
    expect(sheet.headers).toContain('date');
    expect(sheet.headers).toContain('coag');

    // 3. Validate
    const validationResult = validateSchema(sheet.headers, sheet.dataRows, 'test.xlsx');
    expect(validationResult.isValid).toBe(true);
    expect(validationResult.fileType).toBe('shopfloor');
    expect(validationResult.mappings.dateColumn).toBe('date');
    
    // 4. Transform
    // Mock defectIdMap
    const defectIdMap = new Map<string, string>();
    defectIdMap.set('COAG', 'defect-uuid-1');
    defectIdMap.set('RAISED_WIRE', 'defect-uuid-2');

    const transformResult = transformToNormalized(sheet.dataRows, {
      sourceFileId: 'test-file-id',
      fileType: 'shopfloor',
      stageId: 'stage-uuid-shopfloor',
      mappings: validationResult.mappings,
      defectIdMap
    });

    expect(transformResult.success).toBe(true);
    expect(transformResult.productionRecords).toHaveLength(2); // 2 rows
    expect(transformResult.defectRecords.length).toBeGreaterThan(0);
    
    const firstProd = transformResult.productionRecords[0];
    expect(firstProd.produced_quantity).toBe(26);
    
    const firstDefect = transformResult.defectRecords[0];
    expect(firstDefect.quantity).toBe(5); // COAG count
  });
});
