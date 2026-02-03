/**
 * AI Data Mapper
 * Universal column mapping using Gemini AI
 * Makes upload pipeline completely format-agnostic
 */

import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';
import { v4 as uuidv4 } from 'uuid';

// ============================================================================
// CONFIGURATION
// ============================================================================

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';

const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

const MODEL_NAME = 'gemini-2.0-flash-exp';

const GENERATION_CONFIG = {
  temperature: 0.2, // Low temperature for consistent, deterministic mappings
  topP: 0.95,
  topK: 40,
  maxOutputTokens: 2048,
};

const SAFETY_SETTINGS = [
  {
    category: HarmCategory.HARM_CATEGORY_HARASSMENT,
    threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
  },
  {
    category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
    threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
  },
  {
    category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
    threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
  },
  {
    category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
    threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
  },
];

// ============================================================================
// TYPES
// ============================================================================

export interface ColumnMapping {
  [excelColumn: string]: string; // excel_col -> db_field
}

export interface BatchGenerationStrategy {
  type: 'date_based' | 'uuid' | 'row_index' | 'composite';
  format?: string; // e.g., 'BATCH-YYYY-MM-DD', 'AUTO-{UUID}'
  sourceColumns?: string[]; // Columns to use for generation
}

export interface DataTransformationConfig {
  mapping: ColumnMapping;
  batchGeneration: BatchGenerationStrategy;
  typeConversions: {
    [dbField: string]: 'string' | 'number' | 'date' | 'boolean';
  };
  defaultValues: {
    [dbField: string]: unknown;
  };
}

export interface MappingResult {
  success: boolean;
  config: DataTransformationConfig;
  confidence: number;
  explanation: string;
  warnings: string[];
  errors: string[];
}

export interface DatabaseSchema {
  tableName: string;
  fields: Array<{
    name: string;
    type: string;
    required: boolean;
    description: string;
  }>;
}

// ============================================================================
// DATABASE SCHEMAS
// ============================================================================

export const BATCH_SCHEMA: DatabaseSchema = {
  tableName: 'batches',
  fields: [
    { name: 'batch_number', type: 'string', required: true, description: 'Unique identifier for the batch. Can be generated from date if not present.' },
    { name: 'production_date', type: 'date', required: true, description: 'Date when batch was produced' },
    { name: 'product_code', type: 'string', required: false, description: 'Product SKU or code' },
    { name: 'product_name', type: 'string', required: false, description: 'Product name/description' },
    { name: 'planned_quantity', type: 'number', required: false, description: 'Planned production quantity' },
    { name: 'produced_quantity', type: 'number', required: false, description: 'Actual produced quantity' },
    { name: 'rejected_quantity', type: 'number', required: false, description: 'Number of rejected units' },
    { name: 'status', type: 'string', required: false, description: 'Batch status: in_progress, completed, scrapped' },
    { name: 'risk_level', type: 'string', required: false, description: 'Risk assessment: normal, watch, high_risk' },
    { name: 'notes', type: 'string', required: false, description: 'Additional notes' },
  ],
};

export const INSPECTION_SCHEMA: DatabaseSchema = {
  tableName: 'inspection_records',
  fields: [
    { name: 'batch_id', type: 'string', required: true, description: 'Reference to batch (foreign key)' },
    { name: 'inspection_stage', type: 'string', required: true, description: 'Stage: assembly, visual, integrity, final, packaging' },
    { name: 'inspector_name', type: 'string', required: false, description: 'Name of inspector' },
    { name: 'inspected_quantity', type: 'number', required: true, description: 'Total units inspected' },
    { name: 'passed_quantity', type: 'number', required: true, description: 'Units that passed inspection' },
    { name: 'failed_quantity', type: 'number', required: true, description: 'Units that failed inspection' },
    { name: 'inspection_date', type: 'date', required: true, description: 'Date of inspection' },
    { name: 'notes', type: 'string', required: false, description: 'Inspection notes' },
  ],
};

export const DEFECT_SCHEMA: DatabaseSchema = {
  tableName: 'defects',
  fields: [
    { name: 'inspection_id', type: 'string', required: true, description: 'Reference to inspection record' },
    { name: 'batch_id', type: 'string', required: true, description: 'Reference to batch' },
    { name: 'defect_type', type: 'string', required: true, description: 'Type of defect (e.g., scratch, dent, leak)' },
    { name: 'defect_category', type: 'string', required: false, description: 'Category: visual, dimensional, functional, material, other' },
    { name: 'quantity', type: 'number', required: true, description: 'Number of defects' },
    { name: 'severity', type: 'string', required: false, description: 'Severity: minor, major, critical' },
    { name: 'root_cause', type: 'string', required: false, description: 'Root cause analysis' },
    { name: 'detected_at', type: 'date', required: true, description: 'When defect was detected' },
  ],
};

// ============================================================================
// AI MAPPING GENERATOR
// ============================================================================

/**
 * Generate column mapping using Gemini AI
 * This is the brain of the Universal Data Adapter
 */
export async function generateColumnMapping(
  filePreview: Record<string, unknown>[],
  headers: string[],
  targetSchema: DatabaseSchema,
  fileType: string,
  fileName: string
): Promise<MappingResult> {
  // Check if API is available
  if (!GEMINI_API_KEY) {
    console.warn('Gemini API key not configured, using fallback mapping');
    return getFallbackMapping(headers, targetSchema);
  }

  try {
    const model = genAI.getGenerativeModel({
      model: MODEL_NAME,
      generationConfig: GENERATION_CONFIG,
      safetySettings: SAFETY_SETTINGS,
    });

    const prompt = buildMappingPrompt(filePreview, headers, targetSchema, fileType, fileName);

    const result = await model.generateContent(prompt);
    const response = result.response;
    const text = response.text();

    // Parse the JSON response
    try {
      const cleanText = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      const parsed = JSON.parse(cleanText);

      return {
        success: true,
        config: {
          mapping: parsed.mapping || {},
          batchGeneration: parsed.batchGeneration || { type: 'uuid' },
          typeConversions: parsed.typeConversions || {},
          defaultValues: parsed.defaultValues || {},
        },
        confidence: parsed.confidence || 0.5,
        explanation: parsed.explanation || 'AI mapping generated',
        warnings: parsed.warnings || [],
        errors: parsed.errors || [],
      };
    } catch (parseError) {
      console.error('Failed to parse Gemini mapping response:', parseError);
      console.log('Raw response:', text);
      return getFallbackMapping(headers, targetSchema);
    }
  } catch (error) {
    console.error('AI mapping generation failed:', error);
    return getFallbackMapping(headers, targetSchema);
  }
}

/**
 * Build the prompt for Gemini AI
 */
function buildMappingPrompt(
  filePreview: Record<string, unknown>[],
  headers: string[],
  schema: DatabaseSchema,
  fileType: string,
  fileName: string
): string {
  return `
You are an expert data mapping AI for a manufacturing quality control system.
Your task is to intelligently map Excel column headers to database fields.

**FILE INFORMATION:**
- File Name: ${fileName}
- Detected Type: ${fileType}
- Excel Columns: ${JSON.stringify(headers)}
- Sample Data (first ${Math.min(filePreview.length, 5)} rows):
${JSON.stringify(filePreview.slice(0, 5), null, 2)}

**TARGET DATABASE SCHEMA:**
Table: ${schema.tableName}
Fields:
${schema.fields.map(f => `- ${f.name} (${f.type}${f.required ? ', REQUIRED' : ''}): ${f.description}`).join('\n')}

**YOUR TASK:**
Create a mapping configuration that transforms this Excel file into the database schema.

**RULES:**
1. **Column Mapping**: Match each Excel column to the most appropriate database field
   - Use fuzzy matching (e.g., "Rej Qty" → "rejected_quantity")
   - Handle abbreviations (e.g., "Dt" → "date", "No" → "number")
   - Map synonyms (e.g., "Fail" → "rejected", "Pass" → "passed")

2. **Missing Required Fields**: If a REQUIRED database field has no matching Excel column:
   - Generate it using the batchGeneration strategy
   - For batch_number: use date_based (format: "BATCH-YYYY-MM-DD") or uuid
   - For dates: use current date or infer from other date columns
   - For quantities: default to 0

3. **Type Conversions**: Specify how to convert Excel values:
   - Strings to numbers: parseFloat, handle "N/A", "-", empty strings
   - Various date formats: "DD/MM/YYYY", "MM-DD-YY", "YYYY-MM-DD" → ISO format
   - Boolean indicators: "Yes/No", "Y/N", "Pass/Fail" → true/false

4. **Batch Number Generation Strategy** (CRITICAL):
   If "batch_number" is missing or unclear, choose ONE strategy:
   - "date_based": Generate from production_date (format: "BATCH-YYYY-MM-DD")
   - "uuid": Generate random UUID
   - "row_index": Use "BATCH-{ROW_NUMBER}"
   - "composite": Combine multiple fields (e.g., "{PRODUCT}-{DATE}")

**RESPONSE FORMAT (JSON ONLY):**
{
  "mapping": {
    "excel_column_name": "database_field_name",
    "Qty": "produced_quantity",
    "Rej": "rejected_quantity",
    "Dt": "production_date"
  },
  "batchGeneration": {
    "type": "date_based",
    "format": "BATCH-YYYY-MM-DD",
    "sourceColumns": ["production_date"]
  },
  "typeConversions": {
    "production_date": "date",
    "rejected_quantity": "number",
    "planned_quantity": "number"
  },
  "defaultValues": {
    "status": "completed",
    "risk_level": "normal",
    "planned_quantity": 0
  },
  "confidence": 0.92,
  "explanation": "Mapped 'Qty' to produced_quantity, 'Rej' to rejected_quantity. Generated batch_numbers from dates.",
  "warnings": ["Row 5 has missing quantity data - will use default 0"],
  "errors": []
}

**IMPORTANT:**
- Return ONLY the JSON object, no markdown formatting
- Be creative in mapping - use context clues from file name and sample data
- If uncertain, use uuid strategy for batch numbers
- Always provide at least one mapping for required fields
- Include helpful warnings about data quality issues
`;
}

// ============================================================================
// FALLBACK MAPPING
// ============================================================================

/**
 * Generate fallback mapping when AI is unavailable
 * Uses keyword matching and heuristics
 */
function getFallbackMapping(
  headers: string[],
  schema: DatabaseSchema
): MappingResult {
  const mapping: ColumnMapping = {};
  const warnings: string[] = [];
  const errors: string[] = [];
  const typeConversions: { [key: string]: 'string' | 'number' | 'date' | 'boolean' } = {};
  const defaultValues: { [key: string]: unknown } = {};

  // Keyword patterns for common fields
  const patterns: { [dbField: string]: RegExp[] } = {
    batch_number: [/batch/i, /lot/i, /id/i, /no/i, /number/i, /ref/i],
    production_date: [/date/i, /dt/i, /day/i, /time/i, /created/i, /prod/i],
    product_code: [/code/i, /sku/i, /product.*code/i, /item/i],
    product_name: [/name/i, /desc/i, /product/i, /item.*name/i],
    planned_quantity: [/plan/i, /target/i, /scheduled/i],
    produced_quantity: [/prod/i, /output/i, /made/i, /completed/i, /qty/i, /quantity/i, /total/i],
    rejected_quantity: [/rej/i, /fail/i, /ng/i, /defect/i, /scrap/i, /waste/i, /bad/i],
    inspection_date: [/inspect/i, /check/i, /qc.*date/i],
    inspected_quantity: [/inspect/i, /check.*qty/i, /tested/i],
    passed_quantity: [/pass/i, /ok/i, /good/i, /accepted/i],
    failed_quantity: [/fail/i, /reject/i, /ng/i, /bad/i],
    defect_type: [/defect/i, /issue/i, /problem/i, /fault/i, /type/i],
  };

  // Try to match each header to a database field
  for (const header of headers) {
    const headerLower = header.toLowerCase();
    let matched = false;

    for (const [dbField, regexps] of Object.entries(patterns)) {
      for (const regex of regexps) {
        if (regex.test(headerLower)) {
          mapping[header] = dbField;
          matched = true;

          // Infer type conversion
          if (dbField.includes('date')) {
            typeConversions[dbField] = 'date';
          } else if (dbField.includes('quantity') || dbField.includes('_qty')) {
            typeConversions[dbField] = 'number';
          }

          break;
        }
      }
      if (matched) break;
    }

    if (!matched) {
      warnings.push(`Could not map column "${header}" - will be ignored`);
    }
  }

  // Check for missing required fields
  const requiredFields = schema.fields.filter(f => f.required).map(f => f.name);
  const mappedFields = Object.values(mapping);

  for (const required of requiredFields) {
    if (!mappedFields.includes(required)) {
      warnings.push(`Required field "${required}" not found in Excel - will be auto-generated`);

      // Set default value based on field type
      if (required.includes('date')) {
        defaultValues[required] = new Date().toISOString().split('T')[0];
      } else if (required.includes('quantity') || required.includes('_qty')) {
        defaultValues[required] = 0;
      } else if (required === 'batch_number') {
        // Will be generated using uuid strategy
      }
    }
  }

  // Determine batch generation strategy
  let batchStrategy: BatchGenerationStrategy;
  if (mappedFields.includes('production_date')) {
    batchStrategy = {
      type: 'date_based',
      format: 'BATCH-YYYY-MM-DD',
      sourceColumns: ['production_date'],
    };
  } else {
    batchStrategy = {
      type: 'uuid',
    };
  }

  // Set common defaults
  defaultValues.status = 'completed';
  defaultValues.risk_level = 'normal';

  return {
    success: true,
    config: {
      mapping,
      batchGeneration: batchStrategy,
      typeConversions,
      defaultValues,
    },
    confidence: 0.6, // Lower confidence for fallback
    explanation: 'Generated using keyword pattern matching (AI unavailable)',
    warnings,
    errors,
  };
}

// ============================================================================
// DATA TRANSFORMATION
// ============================================================================

/**
 * Apply the AI-generated mapping to transform Excel rows to database records
 */
export function applyMapping(
  rows: Record<string, unknown>[],
  mappingConfig: DataTransformationConfig,
  fileType: string
): {
  batches: Array<Record<string, unknown>>;
  inspections: Array<Record<string, unknown>>;
  defects: Array<Record<string, unknown>>;
  warnings: string[];
  errors: string[];
} {
  const batches: Array<Record<string, unknown>> = [];
  const inspections: Array<Record<string, unknown>> = [];
  const defects: Array<Record<string, unknown>> = [];
  const warnings: string[] = [];
  const errors: string[] = [];

  const batchMap = new Map<string, Record<string, unknown> & { produced_quantity: number; rejected_quantity: number }>();

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowNum = i + 2; // +2 for 1-indexed + header

    try {
      // Transform row based on mapping
      const transformed: Record<string, unknown> = {};

      // Apply column mappings
      for (const [excelCol, dbField] of Object.entries(mappingConfig.mapping)) {
        const value = row[excelCol];
        transformed[dbField] = transformValue(value, mappingConfig.typeConversions[dbField]);
      }

      // Apply default values
      for (const [field, defaultVal] of Object.entries(mappingConfig.defaultValues)) {
        if (transformed[field] === undefined || transformed[field] === null || transformed[field] === '') {
          transformed[field] = defaultVal;
        }
      }

      // Generate batch number if missing
      let batchNumber = transformed.batch_number as string;
      if (!batchNumber) {
        batchNumber = generateBatchNumber(transformed, mappingConfig.batchGeneration, i);
        transformed.batch_number = batchNumber;
      }

      // Check if batch already exists
      if (!batchMap.has(batchNumber)) {
        const batch = createBatchRecord(transformed, batchNumber) as Record<string, unknown> & { produced_quantity: number; rejected_quantity: number };
        batchMap.set(batchNumber, batch);
        batches.push(batch);
      }

      const batch = batchMap.get(batchNumber)!;
      const batchId = batch.id as string;

      // Create inspection record based on file type
      if (fileType === 'visual' || fileType === 'rejection') {
        const inspection = createInspectionRecord(transformed, batchId, 'visual');
        inspections.push(inspection);

        // Create defect if defect data exists
        if (transformed.defect_type || transformed.rejected_quantity) {
          const defect = createDefectRecord(transformed, inspection.id, batchId);
          defects.push(defect);

          // Update batch rejected count
          batch.rejected_quantity = (batch.rejected_quantity || 0) + (defect.quantity as number || 0);
        }
      } else if (fileType === 'assembly' || fileType === 'integrity') {
        const inspection = createInspectionRecord(transformed, batchId, fileType === 'integrity' ? 'integrity' : 'assembly');
        inspections.push(inspection);

        // Update batch quantities
        batch.produced_quantity = (batch.produced_quantity || 0) + (inspection.inspected_quantity as number || 0);
        batch.rejected_quantity = (batch.rejected_quantity || 0) + (inspection.failed_quantity as number || 0);
      } else if (fileType === 'cumulative') {
        // Cumulative files directly populate batch data
        batch.produced_quantity = transformed.produced_quantity as number || 0;
        batch.rejected_quantity = transformed.rejected_quantity as number || 0;
        batch.planned_quantity = transformed.planned_quantity as number || batch.produced_quantity;
        batch.status = 'completed';

        // Calculate risk level
        const prodQty = batch.produced_quantity;
        const rejQty = batch.rejected_quantity;
        const rejectionRate = prodQty > 0 ? (rejQty / prodQty) * 100 : 0;

        if (rejectionRate >= 15) batch.risk_level = 'high_risk';
        else if (rejectionRate >= 8) batch.risk_level = 'watch';
        else batch.risk_level = 'normal';
      }

      // Flag rows with low data quality
      if (!transformed.production_date && !transformed.inspection_date) {
        warnings.push(`Row ${rowNum}: No date found - using current date`);
      }

    } catch (error) {
      errors.push(`Row ${rowNum}: ${error instanceof Error ? error.message : 'Transformation error'}`);
    }
  }

  return { batches, inspections, defects, warnings, errors };
}

/**
 * Transform a single value based on type
 */
function transformValue(value: unknown, targetType?: 'string' | 'number' | 'date' | 'boolean'): unknown {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }

  switch (targetType) {
    case 'number':
      if (typeof value === 'number') return value;
      const strVal = String(value).replace(/,/g, ''); // Remove commas
      if (strVal === '-' || strVal === 'N/A' || strVal === '') return 0;
      const num = parseFloat(strVal);
      return isNaN(num) ? 0 : num;

    case 'date':
      if (value instanceof Date) return value.toISOString().split('T')[0];
      
      // Handle Excel serial dates (numbers > 20000 usually imply dates after 1954)
      if (typeof value === 'number' && value > 20000) {
        // Excel base date is Dec 30, 1899
        // JS base date is Jan 1, 1970
        // The difference is 25569 days
        const date = new Date(Math.round((value - 25569) * 86400 * 1000));
        if (!isNaN(date.getTime())) {
          return date.toISOString().split('T')[0];
        }
      }

      const dateStr = String(value);
      // Try various date formats
      const date = new Date(dateStr);
      if (!isNaN(date.getTime())) {
        return date.toISOString().split('T')[0];
      }
      // Try DD/MM/YYYY format
      const parts = dateStr.split(/[/-]/);
      if (parts.length === 3) {
        const d = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
        if (!isNaN(d.getTime())) return d.toISOString().split('T')[0];
      }
      return new Date().toISOString().split('T')[0];

    case 'boolean':
      const boolStr = String(value).toLowerCase();
      return ['yes', 'y', 'true', 'pass', 'ok', '1'].includes(boolStr);

    case 'string':
    default:
      return String(value).trim();
  }
}

/**
 * Generate batch number based on strategy
 */
function generateBatchNumber(
  transformed: Record<string, unknown>,
  strategy: BatchGenerationStrategy,
  rowIndex: number
): string {
  switch (strategy.type) {
    case 'date_based': {
      const date = transformed.production_date || transformed.inspection_date || new Date().toISOString().split('T')[0];
      const dateStr = String(date).replace(/-/g, '');
      return `BATCH-${dateStr}`;
    }

    case 'composite': {
      const parts = strategy.sourceColumns?.map(col => transformed[col]) || [];
      const validParts = parts.filter(p => p !== undefined && p !== null);
      if (validParts.length > 0) {
        return validParts.join('-');
      }
      return `BATCH-${rowIndex + 1}`;
    }

    case 'row_index':
      return `BATCH-${rowIndex + 1}`;

    case 'uuid':
    default:
      return `AUTO-${uuidv4().slice(0, 8)}`;
  }
}

/**
 * Create a batch record from transformed data
 */
function createBatchRecord(transformed: Record<string, unknown>, batchNumber: string): Record<string, unknown> {
  const date = transformed.production_date || transformed.inspection_date || new Date().toISOString().split('T')[0];

  return {
    id: uuidv4(),
    batch_number: batchNumber,
    production_date: date,
    product_code: transformed.product_code || null,
    product_name: transformed.product_name || null,
    planned_quantity: transformed.planned_quantity || 0,
    produced_quantity: transformed.produced_quantity || 0, // Use row value (don't zero out)
    rejected_quantity: 0, // Initialize to 0 for aggregation
    status: 'in_progress',
    risk_level: 'normal',
    notes: null,
  };
}

/**
 * Create an inspection record from transformed data
 */
function createInspectionRecord(
  transformed: Record<string, unknown>,
  batchId: string,
  stage: string
): Record<string, unknown> & { id: string } {
  const inspectedQty = (transformed.inspected_quantity as number) ||
    ((transformed.passed_quantity as number) || 0) + ((transformed.failed_quantity as number) || 0) ||
    ((transformed.rejected_quantity as number) || 0);

  const passedQty = (transformed.passed_quantity as number) || Math.max(0, inspectedQty - ((transformed.rejected_quantity as number) || 0));
  const failedQty = (transformed.failed_quantity as number) || (transformed.rejected_quantity as number) || 0;

  return {
    id: uuidv4(),
    batch_id: batchId,
    inspection_stage: stage,
    inspector_name: transformed.inspector_name || null,
    inspected_quantity: inspectedQty,
    passed_quantity: passedQty,
    failed_quantity: failedQty,
    inspection_date: transformed.inspection_date || transformed.production_date || new Date().toISOString().split('T')[0],
    notes: null,
  };
}

/**
 * Create a defect record from transformed data
 */
function createDefectRecord(
  transformed: Record<string, unknown>,
  inspectionId: string,
  batchId: string
): Record<string, unknown> & { id: string } {
  const defectType = String(transformed.defect_type || 'Unknown');

  return {
    id: uuidv4(),
    inspection_id: inspectionId,
    batch_id: batchId,
    defect_type: defectType,
    defect_category: categorizeDefect(defectType),
    quantity: transformed.rejected_quantity || 1,
    severity: 'minor',
    root_cause: null,
    detected_at: transformed.inspection_date || transformed.production_date || new Date().toISOString().split('T')[0],
  };
}

/**
 * Categorize defect based on type name
 */
function categorizeDefect(defectType: string): string {
  const type = defectType.toLowerCase();
  if (type.includes('scratch') || type.includes('dent') || type.includes('mark') || type.includes('visual')) return 'visual';
  if (type.includes('dimension') || type.includes('size') || type.includes('length') || type.includes('width')) return 'dimensional';
  if (type.includes('leak') || type.includes('function') || type.includes('operation')) return 'functional';
  if (type.includes('material') || type.includes('component')) return 'material';
  return 'other';
}

// ============================================================================
// CACHE
// ============================================================================

const mappingCache = new Map<string, MappingResult>();

/**
 * Get cached mapping or generate new one
 */
export async function getOrGenerateMapping(
  cacheKey: string,
  filePreview: Record<string, unknown>[],
  headers: string[],
  targetSchema: DatabaseSchema,
  fileType: string,
  fileName: string
): Promise<MappingResult> {
  // Check cache first
  if (mappingCache.has(cacheKey)) {
    console.log('Using cached column mapping');
    return mappingCache.get(cacheKey)!;
  }

  // Generate new mapping
  const result = await generateColumnMapping(filePreview, headers, targetSchema, fileType, fileName);

  // Cache successful mappings
  if (result.success) {
    mappingCache.set(cacheKey, result);
  }

  return result;
}

/**
 * Clear mapping cache
 */
export function clearMappingCache(): void {
  mappingCache.clear();
}
