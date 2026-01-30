import { ValidationError, ValidationResult, SchemaMapping, REQUIRED_FIELDS } from './types';
import { RejectionRecord } from '@/lib/db/types';

export class DataValidator {
  validate(record: Partial<RejectionRecord>, rowNumber: number = 0): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationError[] = [];
    
    // Validate required fields
    if (!record.timestamp) {
      errors.push({
        rowNumber,
        column: 'date',
        value: record.timestamp,
        error: 'Date is required',
        severity: 'ERROR',
      });
    }
    
    if (!record.lineId || record.lineId <= 0) {
      errors.push({
        rowNumber,
        column: 'line',
        value: record.lineId,
        error: 'Valid line ID is required',
        severity: 'ERROR',
      });
    }
    
    if (!record.defectTypeId || record.defectTypeId <= 0) {
      errors.push({
        rowNumber,
        column: 'defectType',
        value: record.defectTypeId,
        error: 'Valid defect type is required',
        severity: 'ERROR',
      });
    }
    
    if (!record.quantity || record.quantity <= 0) {
      errors.push({
        rowNumber,
        column: 'quantity',
        value: record.quantity,
        error: 'Quantity must be a positive number',
        severity: 'ERROR',
      });
    } else if (record.quantity > 10000) {
      warnings.push({
        rowNumber,
        column: 'quantity',
        value: record.quantity,
        error: 'Unusually high quantity (>10,000) - please verify',
        severity: 'WARNING',
      });
    }
    
    // Validate optional fields
    if (record.costPerUnit !== undefined) {
      if (record.costPerUnit < 0) {
        errors.push({
          rowNumber,
          column: 'cost',
          value: record.costPerUnit,
          error: 'Cost cannot be negative',
          severity: 'ERROR',
        });
      }
    }
    
    // Validate date is not in the future
    if (record.timestamp && record.timestamp > new Date()) {
      warnings.push({
        rowNumber,
        column: 'date',
        value: record.timestamp,
        error: 'Date is in the future',
        severity: 'WARNING',
      });
    }
    
    // Validate date is not too old (>3 years)
    const threeYearsAgo = new Date();
    threeYearsAgo.setFullYear(threeYearsAgo.getFullYear() - 3);
    if (record.timestamp && record.timestamp < threeYearsAgo) {
      warnings.push({
        rowNumber,
        column: 'date',
        value: record.timestamp,
        error: 'Date is more than 3 years old',
        severity: 'WARNING',
      });
    }
    
    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }
  
  validateMappings(mappings: SchemaMapping[]): { valid: boolean; missing: string[] } {
    const detectedFields = new Set(mappings.map(m => m.suggestedField));
    const missing = REQUIRED_FIELDS.filter(f => !detectedFields.has(f));
    
    return {
      valid: missing.length === 0,
      missing,
    };
  }
}

export const dataValidator = new DataValidator();
