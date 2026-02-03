/**
 * Data Validator
 * Validate Excel data before database import
 */

import type { FileType } from '../db/types';
import { getSchemaPattern } from './schemaDetector';

// ============================================================================
// TYPES
// ============================================================================

export interface ValidationError {
  row: number;
  column: string;
  message: string;
  severity: 'error' | 'warning';
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationError[];
  summary: {
    totalRows: number;
    validRows: number;
    errorRows: number;
    warningRows: number;
  };
}

export interface ValidationRule {
  column: string;
  type: 'required' | 'type' | 'range' | 'pattern' | 'custom';
  params?: Record<string, unknown>;
  message: string;
}

// ============================================================================
// VALIDATION RULES BY TYPE
// ============================================================================

const COMMON_RULES: ValidationRule[] = [
  {
    column: 'batch_number',
    type: 'required',
    message: 'Batch number is required',
  },
  {
    column: 'batch_number',
    type: 'pattern',
    params: { pattern: '^[A-Za-z0-9\\-_]+$' },
    message: 'Batch number should only contain letters, numbers, hyphens, and underscores',
  },
];

const TYPE_SPECIFIC_RULES: Record<FileType, ValidationRule[]> = {
  visual: [
    { column: 'defect_type', type: 'required', message: 'Defect type is required' },
    {
      column: 'defect_count',
      type: 'type',
      params: { expectedType: 'number' },
      message: 'Defect count must be a number',
    },
    {
      column: 'defect_count',
      type: 'range',
      params: { min: 0 },
      message: 'Defect count cannot be negative',
    },
  ],
  assembly: [
    { column: 'stage', type: 'required', message: 'Stage is required' },
    {
      column: 'pass_count',
      type: 'type',
      params: { expectedType: 'number' },
      message: 'Pass count must be a number',
    },
    {
      column: 'fail_count',
      type: 'type',
      params: { expectedType: 'number' },
      message: 'Fail count must be a number',
    },
    {
      column: 'pass_count',
      type: 'range',
      params: { min: 0 },
      message: 'Pass count cannot be negative',
    },
    {
      column: 'fail_count',
      type: 'range',
      params: { min: 0 },
      message: 'Fail count cannot be negative',
    },
  ],
  integrity: [
    { column: 'test_type', type: 'required', message: 'Test type is required' },
    { column: 'result', type: 'required', message: 'Result is required' },
  ],
  cumulative: [
    {
      column: 'produced_quantity',
      type: 'type',
      params: { expectedType: 'number' },
      message: 'Produced quantity must be a number',
    },
    {
      column: 'rejected_quantity',
      type: 'type',
      params: { expectedType: 'number' },
      message: 'Rejected quantity must be a number',
    },
    {
      column: 'produced_quantity',
      type: 'range',
      params: { min: 0 },
      message: 'Produced quantity cannot be negative',
    },
    {
      column: 'rejected_quantity',
      type: 'range',
      params: { min: 0 },
      message: 'Rejected quantity cannot be negative',
    },
  ],
  shopfloor: [
    { column: 'supplier', type: 'required', message: 'Supplier is required' },
    { column: 'material', type: 'required', message: 'Material is required' },
    {
      column: 'quantity',
      type: 'type',
      params: { expectedType: 'number' },
      message: 'Quantity must be a number',
    },
    {
      column: 'quantity',
      type: 'range',
      params: { min: 0 },
      message: 'Quantity cannot be negative',
    },
  ],
  rejection: [
    { column: 'batch_number', type: 'required', message: 'Batch number is required' },
    {
      column: 'rejected_quantity',
      type: 'type',
      params: { expectedType: 'number' },
      message: 'Rejected quantity must be a number',
    },
    {
      column: 'rejected_quantity',
      type: 'range',
      params: { min: 0 },
      message: 'Rejected quantity cannot be negative',
    },
  ],
  unknown: [],
};

// ============================================================================
// VALIDATION FUNCTIONS
// ============================================================================

/**
 * Find a column value with fuzzy matching
 */
function getColumnValue(row: Record<string, unknown>, columnName: string): unknown {
  // Exact match first
  if (columnName in row) return row[columnName];

  // Try normalized matching
  const normalizedTarget = columnName.toLowerCase().replace(/[_\-\s]/g, '');
  for (const [key, value] of Object.entries(row)) {
    const normalizedKey = key.toLowerCase().replace(/[_\-\s]/g, '');
    if (normalizedKey === normalizedTarget || normalizedKey.includes(normalizedTarget)) {
      return value;
    }
  }

  return undefined;
}

/**
 * Validate a single row against rules
 */
function validateRow(
  row: Record<string, unknown>,
  rowIndex: number,
  rules: ValidationRule[]
): ValidationError[] {
  const errors: ValidationError[] = [];

  for (const rule of rules) {
    const value = getColumnValue(row, rule.column);

    switch (rule.type) {
      case 'required':
        if (value === undefined || value === null || value === '') {
          errors.push({
            row: rowIndex,
            column: rule.column,
            message: rule.message,
            severity: 'error',
          });
        }
        break;

      case 'type':
        if (value !== undefined && value !== null && value !== '') {
          const expectedType = rule.params?.expectedType as string;
          if (expectedType === 'number' && typeof value !== 'number' && isNaN(Number(value))) {
            errors.push({
              row: rowIndex,
              column: rule.column,
              message: rule.message,
              severity: 'error',
            });
          }
        }
        break;

      case 'range':
        if (value !== undefined && value !== null && value !== '') {
          const numValue = typeof value === 'number' ? value : Number(value);
          if (!isNaN(numValue)) {
            const min = rule.params?.min as number | undefined;
            const max = rule.params?.max as number | undefined;
            if (min !== undefined && numValue < min) {
              errors.push({
                row: rowIndex,
                column: rule.column,
                message: rule.message,
                severity: 'error',
              });
            }
            if (max !== undefined && numValue > max) {
              errors.push({
                row: rowIndex,
                column: rule.column,
                message: rule.message,
                severity: 'error',
              });
            }
          }
        }
        break;

      case 'pattern':
        if (value !== undefined && value !== null && value !== '') {
          const pattern = new RegExp(rule.params?.pattern as string);
          if (!pattern.test(String(value))) {
            errors.push({
              row: rowIndex,
              column: rule.column,
              message: rule.message,
              severity: 'warning',
            });
          }
        }
        break;
    }
  }

  return errors;
}

/**
 * Validate rows against schema
 * @param rows - Array of row objects from parsed Excel
 * @param fileType - Detected file type
 * @returns ValidationResult with errors and warnings
 */
export async function validateData(
  rows: Record<string, unknown>[],
  fileType: FileType
): Promise<ValidationResult> {
  const errors: ValidationError[] = [];
  const warnings: ValidationError[] = [];
  const errorRowSet = new Set<number>();
  const warningRowSet = new Set<number>();

  // Get validation rules for this file type
  const schema = getSchemaPattern(fileType);
  if (!schema && fileType !== 'unknown') {
    return {
      valid: false,
      errors: [
        {
          row: 0,
          column: '',
          message: `Unknown file type: ${fileType}`,
          severity: 'error',
        },
      ],
      warnings: [],
      summary: {
        totalRows: rows.length,
        validRows: 0,
        errorRows: rows.length,
        warningRows: 0,
      },
    };
  }

  const rules = [...COMMON_RULES, ...(TYPE_SPECIFIC_RULES[fileType] || [])];

  // Validate each row
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowErrors = validateRow(row, i + 2, rules); // +2 for 1-indexed + header row

    for (const error of rowErrors) {
      if (error.severity === 'error') {
        errors.push(error);
        errorRowSet.add(i);
      } else {
        warnings.push(error);
        warningRowSet.add(i);
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    summary: {
      totalRows: rows.length,
      validRows: rows.length - errorRowSet.size,
      errorRows: errorRowSet.size,
      warningRows: warningRowSet.size,
    },
  };
}

/**
 * Get validation rules for a file type (for UI display)
 */
export function getValidationRules(fileType: FileType): ValidationRule[] {
  return [...COMMON_RULES, ...(TYPE_SPECIFIC_RULES[fileType] || [])];
}
