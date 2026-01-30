// Types for Excel upload processing

export interface SchemaMapping {
  columnIndex: number;
  columnName: string;
  suggestedField: string;
  confidence: number;
  sampleValues: (string | number | Date | undefined)[];
}

export interface SchemaDetectionResult {
  mappings: SchemaMapping[];
  headerRowIndex: number;
  totalRows: number;
  sheetName: string;
}

export interface ValidationError {
  rowNumber: number;
  column: string;
  value: unknown;
  error: string;
  severity: 'ERROR' | 'WARNING';
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationError[];
}

export interface ProcessingOptions {
  skipHeaderRows?: number;
  sheetIndex?: number;
  onDuplicate?: 'SKIP' | 'UPDATE' | 'ERROR';
}

export interface ProcessingResult {
  success: boolean;
  recordsProcessed: number;
  recordsFailed: number;
  errors: ValidationError[];
  fileId: number;
}

// Field patterns for fuzzy matching
export const FIELD_PATTERNS: Record<string, string[]> = {
  date: ['date', 'timestamp', 'datetime', 'time', 'created', 'recorded', 'record date', 'date/time'],
  line: ['line', 'production line', 'line number', 'line id', 'line_name', 'line name', 'production'],
  defectType: ['defect', 'defect type', 'rejection reason', 'issue', 'problem', 'type', 'rejection', 'defect_name', 'defect code'],
  quantity: ['quantity', 'qty', 'count', 'units', 'amount', 'number', 'volume', 'rejected qty'],
  supplier: ['supplier', 'vendor', 'source', 'provider', 'manufacturer', 'supplier name', 'vendor name'],
  cost: ['cost', 'price', 'value', 'amount', 'expense', 'unit cost', 'cost per unit'],
  shift: ['shift', 'period', 'session', 'work shift'],
  product: ['product', 'item', 'sku', 'part', 'component', 'product name', 'item name'],
  operator: ['operator', 'worker', 'employee', 'operator id', 'operator name'],
  reason: ['reason', 'notes', 'comments', 'description', 'rejection reason'],
};

export const REQUIRED_FIELDS = ['date', 'line', 'defectType', 'quantity'];
