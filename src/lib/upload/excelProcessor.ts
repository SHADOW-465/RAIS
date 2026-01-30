import * as XLSX from 'xlsx';
import { SchemaDetector } from './schemaDetector';
import { DataValidator } from './validator';
import { 
  SchemaMapping, 
  ProcessingOptions, 
  ProcessingResult, 
  ValidationError,
  FIELD_PATTERNS 
} from './types';
import { RejectionRecord } from '@/lib/db/types';
import { rejectionRepository } from '@/lib/db/repositories/rejectionRepository';
import { lineRepository } from '@/lib/db/repositories/lineRepository';
import { defectTypeRepository } from '@/lib/db/repositories/defectTypeRepository';
import { supplierRepository } from '@/lib/db/repositories/supplierRepository';
import { uploadRepository } from '@/lib/db/repositories/uploadRepository';

export class ExcelProcessor {
  private schemaDetector = new SchemaDetector();
  private validator = new DataValidator();
  
  async detectSchema(buffer: Buffer, sheetIndex: number = 0) {
    return this.schemaDetector.detect(buffer, sheetIndex);
  }
  
  async process(
    buffer: Buffer,
    mappings: SchemaMapping[],
    options: ProcessingOptions & { uploadedFileId: number }
  ): Promise<ProcessingResult> {
    const workbook = XLSX.read(buffer, { type: 'buffer', cellDates: true });
    const worksheet = workbook.Sheets[workbook.SheetNames[options.sheetIndex || 0]];
    
    // Convert to JSON
    const jsonData = XLSX.utils.sheet_to_json(worksheet, { 
      header: 1,
      raw: false,
      dateNF: 'yyyy-mm-dd',
    }) as unknown[][];
    
    const startRow = (options.skipHeaderRows ?? 0) + 1;
    const dataRows = jsonData.slice(startRow);
    
    const records: RejectionRecord[] = [];
    const errors: ValidationError[] = [];
    
    for (let i = 0; i < dataRows.length; i++) {
      const row = dataRows[i];
      const rowNumber = startRow + i + 1;
      
      try {
        const record = await this.transformRow(row, mappings, options.uploadedFileId);
        const validation = this.validator.validate(record, rowNumber);
        
        if (validation.isValid) {
          records.push(record as RejectionRecord);
        } else {
          errors.push(...validation.errors);
        }
        
        // Include warnings but don't fail
        errors.push(...validation.warnings);
      } catch (error) {
        errors.push({
          rowNumber,
          column: 'unknown',
          value: row,
          error: error instanceof Error ? error.message : 'Unknown error during transformation',
          severity: 'ERROR',
        });
      }
    }
    
    // Bulk insert valid records
    let inserted = 0;
    if (records.length > 0) {
      try {
        inserted = await rejectionRepository.bulkInsert(records);
      } catch (error) {
        console.error('Bulk insert error:', error);
        errors.push({
          rowNumber: 0,
          column: 'database',
          value: records.length,
          error: error instanceof Error ? error.message : 'Database insert failed',
          severity: 'ERROR',
        });
      }
    }
    
    // Update upload record with results
    const errorRate = dataRows.length > 0 ? errors.filter(e => e.severity === 'ERROR').length / dataRows.length : 0;
    
    return {
      success: errorRate < 0.2, // Success if less than 20% errors
      recordsProcessed: inserted,
      recordsFailed: dataRows.length - inserted,
      errors: errors.slice(0, 50), // Limit to first 50 errors
      fileId: options.uploadedFileId,
    };
  }
  
  private async transformRow(
    row: unknown[],
    mappings: SchemaMapping[],
    uploadedFileId: number
  ): Promise<Partial<RejectionRecord>> {
    const getValue = (field: string): unknown => {
      const mapping = mappings.find(m => m.suggestedField === field);
      return mapping ? row[mapping.columnIndex] : undefined;
    };
    
    // Parse date
    const dateValue = getValue('date');
    const timestamp = this.parseDate(dateValue);
    
    // Resolve line
    const lineValue = getValue('line');
    const lineId = await this.resolveLineId(lineValue);
    
    // Resolve defect type
    const defectValue = getValue('defectType');
    const defectTypeId = await this.resolveDefectTypeId(defectValue);
    
    // Parse quantity
    const qtyValue = getValue('quantity');
    const quantity = this.parseNumber(qtyValue);
    
    // Resolve supplier (optional)
    const supplierValue = getValue('supplier');
    const supplierId = supplierValue ? await this.resolveSupplierId(supplierValue) : undefined;
    
    // Parse cost (optional)
    const costValue = getValue('cost');
    const costPerUnit = costValue !== undefined ? this.parseNumber(costValue) : undefined;
    
    // Get reason (optional)
    const reason = getValue('reason') as string | undefined;
    
    return {
      timestamp,
      lineId,
      defectTypeId,
      quantity,
      supplierId,
      costPerUnit,
      reason,
      uploadedFileId,
    };
  }
  
  private parseDate(value: unknown): Date {
    if (value instanceof Date) return value;
    
    if (typeof value === 'string') {
      // Try standard date parsing
      const parsed = new Date(value);
      if (!isNaN(parsed.getTime())) return parsed;
      
      // Try DD/MM/YYYY format
      const ddmmyyyy = value.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})$/);
      if (ddmmyyyy) {
        const [, day, month, year] = ddmmyyyy;
        const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
        if (!isNaN(date.getTime())) return date;
      }
      
      // Try MM/DD/YYYY format
      const mmddyyyy = value.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})$/);
      if (mmddyyyy) {
        const parsed2 = new Date(value);
        if (!isNaN(parsed2.getTime())) return parsed2;
      }
    }
    
    if (typeof value === 'number') {
      // Excel serial date
      return XLSX.SSF.parse_date_code(value);
    }
    
    throw new Error(`Unable to parse date: ${value}`);
  }
  
  private parseNumber(value: unknown): number {
    if (typeof value === 'number') return value;
    if (typeof value === 'string') {
      const cleaned = value.replace(/[$,\s]/g, '');
      const parsed = parseFloat(cleaned);
      if (!isNaN(parsed)) return parsed;
    }
    throw new Error(`Unable to parse number: ${value}`);
  }
  
  private async resolveLineId(value: unknown): Promise<number> {
    if (!value) throw new Error('Line value is required');
    
    const name = String(value).trim();
    
    // Try to find existing line
    const existing = await lineRepository.findByName(name);
    if (existing) {
      return existing.id;
    }
    
    // Create new line
    const created = await lineRepository.create({ name });
    return created.id;
  }
  
  private async resolveDefectTypeId(value: unknown): Promise<number> {
    if (!value) throw new Error('Defect type is required');
    
    const name = String(value).trim();
    
    // Try to find by code first
    const byCode = await defectTypeRepository.getByCode(name.toUpperCase());
    if (byCode) {
      return byCode.id;
    }
    
    // Try fuzzy match by name
    const byName = await defectTypeRepository.findByName(name);
    if (byName) {
      return byName.id;
    }
    
    // Create new defect type
    const code = name.toUpperCase().substring(0, 20).replace(/\s+/g, '_');
    const created = await defectTypeRepository.create({ 
      code, 
      name,
      category: 'Uncategorized',
      severity: 'MEDIUM',
    });
    return created.id;
  }
  
  private async resolveSupplierId(value: unknown): Promise<number> {
    if (!value) throw new Error('Supplier value is required');
    
    const name = String(value).trim();
    
    const existing = await supplierRepository.findByName(name);
    if (existing) {
      return existing.id;
    }
    
    const created = await supplierRepository.create({ name });
    return created.id;
  }
}

export const excelProcessor = new ExcelProcessor();
