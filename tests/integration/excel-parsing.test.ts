
import { describe, it, expect } from 'vitest';
import * as XLSX from 'xlsx';
import { parseExcelBuffer } from '@/lib/upload/excelParser';

describe('Excel Parsing Integration', () => {
  it('should detect header row correctly in Shopfloor Report structure', async () => {
    // 1. Create a workbook that mimics SHOPFLOOR REJECTION REPORT.xlsx
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
    
    // Write to buffer
    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    // 2. Parse it
    const result = await parseExcelBuffer(buffer);

    // 3. Verify
    expect(result.success).toBe(true);
    expect(result.sheets).toHaveLength(1);
    
    const sheet = result.sheets[0];
    
    // Header should be detected at index 2 (0-based) -> Row 3
    expect(sheet.headerRowIndex).toBe(2);
    
    // Headers should match
    expect(sheet.headers).toContain('date');
    expect(sheet.headers).toContain('coag');
    expect(sheet.headers).toContain('raised_wire');
    
    // Data should contain 2 rows
    expect(sheet.rows).toHaveLength(2);
    
    // Date should be parsed (approx check)
    // 45748 is roughly 2025-04-01
    const firstRow = sheet.rows[0];
    // Note: parseExcelBuffer uses cellDates:true, so xlsx might convert it if format is set,
    // but here we just wrote raw numbers. transformer.ts would handle the number->date conversion.
    // parseExcelBuffer itself might pass the number through if not formatted as date.
    
    expect(firstRow['coag']).toBe(5);
  });

  it('should detect header row correctly in Assembly Report structure', async () => {
    const rows = [
      ['', ''], 
      ['DISPOSAFE HEALTH AND LIFE CARE LIMITED'],
      ['', ''],
      ['DATE', 'VISUAL QTY', 'REJ %'], // Row 4: Header
      ['2025-01-01', 1000, 5],
    ];

    const worksheet = XLSX.utils.aoa_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Sheet1');
    
    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
    const result = await parseExcelBuffer(buffer);

    expect(result.success).toBe(true);
    const sheet = result.sheets[0];
    
    // Header at index 3
    expect(sheet.headerRowIndex).toBe(3);
    expect(sheet.headers).toContain('visual_qty');
    expect(sheet.rows).toHaveLength(1);
  });
});
