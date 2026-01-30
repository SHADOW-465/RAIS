# Implementation Work Plan
## RAIS - Manufacturing Quality & Rejection Statistics Dashboard

**Plan Version**: 1.0  
**Created**: 2026-01-30  
**Estimated Duration**: 3-4 weeks (MVP), 6-8 weeks (production-ready)  
**Priority Order**: Critical path tasks marked with ⭐

---

## Executive Summary

This work plan provides a step-by-step execution guide for building the RAIS manufacturing quality dashboard. The plan is organized into 6 phases, with tasks grouped by parallelization potential and dependencies clearly marked.

**Current State**: Next.js 16 + React 19 scaffold exists with basic UI components  
**Target State**: Full-stack production application with Excel ingestion, analytics, AI integration, and 5 functional pages

---

## Phase 1: Foundation & Infrastructure (Days 1-3)

### Objective
Set up database, dependencies, and core infrastructure. This phase must complete before any feature work begins.

### Prerequisites
- PostgreSQL 15+ with TimescaleDB extension installed locally or accessible
- Node.js 20+ installed
- Gemini API key available

### Tasks

#### ⭐ Task 1.1: Install Dependencies
**Priority**: CRITICAL | **Parallel**: YES | **Estimated**: 2 hours  
**Agent Profile**: quick (npm install tasks)

**What to do**:
Install all required production and development dependencies.

```bash
# Charting and data visualization
npm install recharts

# Excel processing
npm install xlsx

# AI integration
npm install @google/generative-ai

# State management
npm install zustand swr

# Date handling and utilities
npm install date-fns clsx

# Validation
npm install zod

# Authentication
npm install bcryptjs jose iron-session

# Testing
npm install -D vitest @vitejs/plugin-react @testing-library/react @testing-library/jest-dom
npm install -D @playwright/test
```

**Verification**:
```bash
npm list recharts zustand swr xlsx @google/generative-ai
# All packages should be listed without errors
```

**Commit**: NO (group with Task 1.2)

---

#### ⭐ Task 1.2: Database Setup
**Priority**: CRITICAL | **Parallel**: NO (depends on 1.1) | **Estimated**: 4 hours  
**Agent Profile**: ultrabrain (database architecture)

**What to do**:
1. Create database connection utility
2. Create all schema tables (SQL from SRS Section 3.2.1)
3. Set up TimescaleDB hypertable
4. Create indexes for performance
5. Create continuous aggregates
6. Seed reference data (defect types, sample lines)

**Files to create**:
- `src/lib/db/connection.ts` - Database connection pool
- `src/lib/db/schema.sql` - Full schema definition
- `src/lib/db/seed.sql` - Reference data
- `src/lib/db/migrations/001_initial_schema.sql` - Migration file

**Key Implementation Details**:
```typescript
// src/lib/db/connection.ts
import { Pool } from 'pg';

export const db = new Pool({
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  max: 20, // Maximum pool size
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});
```

**SQL to execute** (save in `scripts/setup-db.sql`):
```sql
-- Create tables
CREATE TABLE IF NOT EXISTS rejection_records (...);
CREATE TABLE IF NOT EXISTS defect_types (...);
CREATE TABLE IF NOT EXISTS production_lines (...);
CREATE TABLE IF NOT EXISTS suppliers (...);
CREATE TABLE IF NOT EXISTS uploaded_files (...);
CREATE TABLE IF NOT EXISTS users (...);

-- Convert to hypertable
SELECT create_hypertable('rejection_records', 'timestamp', if_not_exists => TRUE);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_rejection_line_time ON rejection_records (line_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_rejection_defect_time ON rejection_records (defect_type_id, timestamp DESC);

-- Create continuous aggregate
CREATE MATERIALIZED VIEW IF NOT EXISTS daily_rejection_stats ...;
```

**Verification**:
```bash
# Run setup script
psql -d rais_db -f scripts/setup-db.sql

# Verify tables exist
psql -d rais_db -c "\dt"
# Should show: rejection_records, defect_types, production_lines, suppliers, uploaded_files, users

# Verify hypertable
psql -d rais_db -c "SELECT * FROM timescaledb_information.hypertables;"
```

**Commit**: YES  
**Message**: `chore(db): initialize PostgreSQL schema with TimescaleDB`
**Files**: `src/lib/db/*`, `scripts/setup-db.sql`

---

#### Task 1.3: Environment Configuration
**Priority**: HIGH | **Parallel**: YES (with 1.2) | **Estimated**: 1 hour  
**Agent Profile**: quick

**What to do**:
Create environment variable templates and configuration.

**Files to create**:
- `.env.local.example` - Template with all required variables
- `.env.local` - Actual environment file (not committed)
- `src/lib/config.ts` - Type-safe config loader

**Environment Variables**:
```bash
# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=rais_db
DB_USER=rais_user
DB_PASSWORD=your_secure_password

# AI
GEMINI_API_KEY=your_gemini_api_key_here

# Authentication
SESSION_SECRET=your_32_character_session_secret_here

# Storage
UPLOAD_DIR=./uploads
MAX_FILE_SIZE=52428800  # 50MB in bytes

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
NODE_ENV=development
```

**Verification**:
```typescript
// src/lib/config.ts should validate all required vars
import { z } from 'zod';

const configSchema = z.object({
  DB_HOST: z.string(),
  DB_PORT: z.string().transform(Number),
  DB_NAME: z.string(),
  DB_USER: z.string(),
  DB_PASSWORD: z.string(),
  GEMINI_API_KEY: z.string(),
  SESSION_SECRET: z.string().min(32),
});

export const config = configSchema.parse(process.env);
```

**Commit**: YES  
**Message**: `chore(config): add environment configuration and validation`
**Files**: `.env.local.example`, `src/lib/config.ts`

---

#### Task 1.4: Create Upload Directory Structure
**Priority**: MEDIUM | **Parallel**: YES | **Estimated**: 30 minutes  
**Agent Profile**: quick

**What to do**:
Create the file storage directory structure.

```bash
mkdir -p uploads/2026/01
mkdir -p uploads/2026/02
mkdir -p uploads/temp
touch uploads/.gitkeep
```

**Add to `.gitignore`**:
```
/uploads/*
!/uploads/.gitkeep
```

**Commit**: NO (group with 1.3)

---

## Phase 2: Backend Core (Days 4-7)

### Objective
Build the data access layer, API routes, and core business logic. This phase creates the foundation for all frontend features.

### Tasks

#### ⭐ Task 2.1: Data Access Layer - Repository Pattern
**Priority**: CRITICAL | **Parallel**: NO (depends on 1.2) | **Estimated**: 6 hours  
**Agent Profile**: ultrabrain (data layer architecture)

**What to do**:
Implement repository classes for all database operations.

**Files to create**:
- `src/lib/db/repositories/rejectionRepository.ts`
- `src/lib/db/repositories/defectTypeRepository.ts`
- `src/lib/db/repositories/lineRepository.ts`
- `src/lib/db/repositories/supplierRepository.ts`
- `src/lib/db/repositories/uploadRepository.ts`
- `src/lib/db/types.ts` - Shared TypeScript types

**Key Implementation**:
```typescript
// src/lib/db/repositories/rejectionRepository.ts
export class RejectionRepository {
  async getByDateRange(
    from: Date,
    to: Date,
    filters?: { lineIds?: number[]; defectTypeIds?: number[]; supplierIds?: number[] }
  ): Promise<RejectionRecord[]> {
    const query = `
      SELECT rr.*, dt.name as defect_name, pl.name as line_name
      FROM rejection_records rr
      JOIN defect_types dt ON rr.defect_type_id = dt.id
      JOIN production_lines pl ON rr.line_id = pl.id
      WHERE rr.timestamp >= $1 AND rr.timestamp <= $2
      AND ($3::int[] IS NULL OR rr.line_id = ANY($3))
      AND ($4::int[] IS NULL OR rr.defect_type_id = ANY($4))
      AND ($5::int[] IS NULL OR rr.supplier_id = ANY($5))
      ORDER BY rr.timestamp DESC
    `;
    
    const result = await db.query(query, [
      from, to, 
      filters?.lineIds || null,
      filters?.defectTypeIds || null,
      filters?.supplierIds || null
    ]);
    
    return result.rows;
  }

  async getAggregatedStats(
    period: 'day' | 'week' | 'month',
    from: Date,
    to: Date
  ): Promise<AggregatedStats[]> {
    const bucketSize = period === 'day' ? '1 day' : period === 'week' ? '1 week' : '1 month';
    
    const query = `
      SELECT 
        time_bucket($1, timestamp) as period,
        SUM(quantity) as total_rejected,
        COUNT(*) as incident_count,
        SUM(total_cost) as total_cost
      FROM rejection_records
      WHERE timestamp >= $2 AND timestamp <= $3
      GROUP BY period
      ORDER BY period
    `;
    
    const result = await db.query(query, [bucketSize, from, to]);
    return result.rows;
  }

  async bulkInsert(records: RejectionRecord[]): Promise<number> {
    const client = await db.connect();
    try {
      await client.query('BEGIN');
      
      const query = `
        INSERT INTO rejection_records 
        (timestamp, line_id, shift_id, defect_type_id, supplier_id, quantity, cost_per_unit, reason, uploaded_file_id)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      `;
      
      for (const record of records) {
        await client.query(query, [
          record.timestamp,
          record.lineId,
          record.shiftId,
          record.defectTypeId,
          record.supplierId,
          record.quantity,
          record.costPerUnit,
          record.reason,
          record.uploadedFileId,
        ]);
      }
      
      await client.query('COMMIT');
      return records.length;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
}

export const rejectionRepository = new RejectionRepository();
```

**Types to define** (`src/lib/db/types.ts`):
```typescript
export interface RejectionRecord {
  id: number;
  timestamp: Date;
  lineId: number;
  lineName?: string;
  shiftId?: number;
  defectTypeId: number;
  defectName?: string;
  supplierId?: number;
  supplierName?: string;
  productId?: number;
  quantity: number;
  costPerUnit?: number;
  totalCost?: number;
  reason?: string;
  operatorId?: string;
  uploadedFileId?: number;
  createdAt: Date;
}

export interface AggregatedStats {
  period: Date;
  totalRejected: number;
  incidentCount: number;
  totalCost: number;
}
```

**Verification**:
```typescript
// Create test file: src/lib/db/repositories/rejectionRepository.test.ts
import { describe, it, expect, beforeAll } from 'vitest';
import { rejectionRepository } from './rejectionRepository';

describe('RejectionRepository', () => {
  it('should fetch records by date range', async () => {
    const from = new Date('2026-01-01');
    const to = new Date('2026-01-31');
    const records = await rejectionRepository.getByDateRange(from, to);
    expect(Array.isArray(records)).toBe(true);
  });
});
```

**Commit**: YES  
**Message**: `feat(db): implement repository pattern for data access`
**Files**: `src/lib/db/repositories/*`, `src/lib/db/types.ts`

---

#### ⭐ Task 2.2: Excel Processing Service
**Priority**: CRITICAL | **Parallel**: NO (depends on 2.1) | **Estimated**: 8 hours  
**Agent Profile**: ultrabrain (file processing logic)

**What to do**:
Build the Excel upload processing pipeline with schema detection, validation, and data normalization.

**Files to create**:
- `src/lib/upload/excelProcessor.ts` - Main processing logic
- `src/lib/upload/schemaDetector.ts` - Schema detection algorithm
- `src/lib/upload/validator.ts` - Data validation rules
- `src/lib/upload/types.ts` - Type definitions

**Key Implementation - Schema Detection**:
```typescript
// src/lib/upload/schemaDetector.ts
import * as XLSX from 'xlsx';

export interface SchemaMapping {
  columnIndex: number;
  columnName: string;
  suggestedField: string;
  confidence: number;
  sampleValues: unknown[];
}

export interface SchemaDetectionResult {
  mappings: SchemaMapping[];
  headerRowIndex: number;
  totalRows: number;
  sheetName: string;
}

const FIELD_PATTERNS: Record<string, string[]> = {
  date: ['date', 'timestamp', 'datetime', 'time', 'created', 'recorded'],
  line: ['line', 'production line', 'line number', 'line id', 'line_name'],
  defectType: ['defect', 'defect type', 'rejection reason', 'issue', 'problem', 'type'],
  quantity: ['quantity', 'qty', 'count', 'units', 'amount', 'number', 'volume'],
  supplier: ['supplier', 'vendor', 'source', 'provider', 'manufacturer'],
  cost: ['cost', 'price', 'value', 'amount', 'expense'],
  shift: ['shift', 'period', 'session'],
  product: ['product', 'item', 'sku', 'part', 'component'],
};

export class SchemaDetector {
  detect(buffer: Buffer, sheetIndex: number = 0): SchemaDetectionResult {
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[sheetIndex];
    const worksheet = workbook.Sheets[sheetName];
    
    // Convert to JSON with headers
    const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as unknown[][];
    
    // Find header row (first row with >70% string cells)
    let headerRowIndex = 0;
    for (let i = 0; i < Math.min(10, jsonData.length); i++) {
      const row = jsonData[i];
      const stringCount = row.filter(cell => typeof cell === 'string').length;
      if (row.length > 0 && stringCount / row.length > 0.7) {
        headerRowIndex = i;
        break;
      }
    }
    
    const headers = jsonData[headerRowIndex] as string[];
    const dataRows = jsonData.slice(headerRowIndex + 1, headerRowIndex + 11); // Sample 10 rows
    
    // Map each column
    const mappings: SchemaMapping[] = headers.map((header, index) => {
      const normalizedHeader = header.toLowerCase().trim();
      let bestMatch = { field: 'unknown', confidence: 0 };
      
      for (const [field, patterns] of Object.entries(FIELD_PATTERNS)) {
        for (const pattern of patterns) {
          const similarity = this.calculateSimilarity(normalizedHeader, pattern);
          if (similarity > bestMatch.confidence) {
            bestMatch = { field, confidence: similarity };
          }
        }
      }
      
      // Extract sample values
      const sampleValues = dataRows.map(row => row[index]).filter(v => v !== undefined);
      
      return {
        columnIndex: index,
        columnName: header,
        suggestedField: bestMatch.confidence > 0.6 ? bestMatch.field : 'unknown',
        confidence: Math.round(bestMatch.confidence * 100),
        sampleValues,
      };
    });
    
    return {
      mappings,
      headerRowIndex,
      totalRows: jsonData.length - headerRowIndex - 1,
      sheetName,
    };
  }
  
  private calculateSimilarity(str1: string, str2: string): number {
    // Simple string similarity (can be improved with Levenshtein)
    if (str1 === str2) return 1;
    if (str1.includes(str2) || str2.includes(str1)) return 0.9;
    // ... more sophisticated matching
    return 0;
  }
}
```

**Key Implementation - Excel Processor**:
```typescript
// src/lib/upload/excelProcessor.ts
import * as XLSX from 'xlsx';
import { SchemaDetector, SchemaDetectionResult } from './schemaDetector';
import { DataValidator, ValidationError } from './validator';
import { rejectionRepository } from '@/lib/db/repositories/rejectionRepository';
import { uploadRepository } from '@/lib/db/repositories/uploadRepository';

export interface ProcessingResult {
  success: boolean;
  recordsProcessed: number;
  recordsFailed: number;
  errors: ValidationError[];
  fileId: number;
}

export class ExcelProcessor {
  private schemaDetector = new SchemaDetector();
  private validator = new DataValidator();
  
  async detectSchema(buffer: Buffer): Promise<SchemaDetectionResult> {
    return this.schemaDetector.detect(buffer);
  }
  
  async process(
    buffer: Buffer,
    mappings: SchemaMapping[],
    options: {
      skipHeaderRows?: number;
      sheetIndex?: number;
      uploadedFileId: number;
    }
  ): Promise<ProcessingResult> {
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const worksheet = workbook.Sheets[workbook.SheetNames[options.sheetIndex || 0]];
    
    // Convert to JSON
    const jsonData = XLSX.utils.sheet_to_json(worksheet, { 
      header: 1,
      raw: false,
      dateNF: 'yyyy-mm-dd'
    }) as unknown[][];
    
    const startRow = (options.skipHeaderRows || 0) + 1;
    const dataRows = jsonData.slice(startRow);
    
    const records: RejectionRecord[] = [];
    const errors: ValidationError[] = [];
    
    for (let i = 0; i < dataRows.length; i++) {
      const row = dataRows[i];
      const rowNumber = startRow + i + 1;
      
      try {
        const record = this.transformRow(row, mappings, rowNumber, options.uploadedFileId);
        const validation = this.validator.validate(record);
        
        if (validation.isValid) {
          records.push(record);
        } else {
          errors.push(...validation.errors);
        }
      } catch (error) {
        errors.push({
          rowNumber,
          column: 'unknown',
          value: row,
          error: error instanceof Error ? error.message : 'Unknown error',
          severity: 'ERROR',
        });
      }
    }
    
    // Bulk insert valid records
    let inserted = 0;
    if (records.length > 0) {
      inserted = await rejectionRepository.bulkInsert(records);
    }
    
    return {
      success: errors.length === 0 || (errors.length / dataRows.length) < 0.2,
      recordsProcessed: inserted,
      recordsFailed: dataRows.length - inserted,
      errors,
      fileId: options.uploadedFileId,
    };
  }
  
  private transformRow(
    row: unknown[],
    mappings: SchemaMapping[],
    rowNumber: number,
    uploadedFileId: number
  ): RejectionRecord {
    const getValue = (field: string) => {
      const mapping = mappings.find(m => m.suggestedField === field);
      return mapping ? row[mapping.columnIndex] : undefined;
    };
    
    const dateValue = getValue('date');
    const timestamp = this.parseDate(dateValue);
    
    return {
      timestamp,
      lineId: this.resolveLineId(getValue('line')),
      defectTypeId: this.resolveDefectTypeId(getValue('defectType')),
      quantity: parseInt(getValue('quantity') as string, 10),
      supplierId: getValue('supplier') ? this.resolveSupplierId(getValue('supplier')) : undefined,
      costPerUnit: getValue('cost') ? parseFloat(getValue('cost') as string) : undefined,
      uploadedFileId,
    } as RejectionRecord;
  }
  
  private parseDate(value: unknown): Date {
    if (value instanceof Date) return value;
    if (typeof value === 'string') {
      // Try multiple date formats
      const parsed = new Date(value);
      if (!isNaN(parsed.getTime())) return parsed;
      
      // Try DD/MM/YYYY format
      const parts = value.split(/[/\-.]/);
      if (parts.length === 3) {
        return new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
      }
    }
    throw new Error(`Unable to parse date: ${value}`);
  }
  
  private resolveLineId(value: unknown): number {
    // Lookup or create line
    // Implementation depends on lineRepository
    return 1; // Placeholder
  }
  
  private resolveDefectTypeId(value: unknown): number {
    // Fuzzy match against defect_types table
    // Implementation depends on defectTypeRepository
    return 1; // Placeholder
  }
  
  private resolveSupplierId(value: unknown): number {
    // Lookup or create supplier
    return 1; // Placeholder
  }
}
```

**Verification**:
```typescript
// Test with sample Excel file
const processor = new ExcelProcessor();
const buffer = fs.readFileSync('test-data/sample-rejections.xlsx');
const schema = await processor.detectSchema(buffer);
expect(schema.mappings.length).toBeGreaterThan(0);
```

**Commit**: YES  
**Message**: `feat(upload): implement Excel processing with schema detection`
**Files**: `src/lib/upload/*`

---

#### ⭐ Task 2.3: API Routes - Upload Endpoint
**Priority**: CRITICAL | **Parallel**: NO (depends on 2.2) | **Estimated**: 4 hours  
**Agent Profile**: quick (API route implementation)

**What to do**:
Create the API route for file uploads with streaming support.

**Files to create**:
- `src/app/api/upload/route.ts` - Main upload endpoint
- `src/app/api/upload/schema/route.ts` - Schema detection endpoint

**Implementation**:
```typescript
// src/app/api/upload/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { ExcelProcessor } from '@/lib/upload/excelProcessor';
import { uploadRepository } from '@/lib/db/repositories/uploadRepository';
import { writeFile } from 'fs/promises';
import { mkdir } from 'fs/promises';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const mappingsJson = formData.get('mappings') as string;
    const optionsJson = formData.get('options') as string;
    
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }
    
    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: 'File too large', maxSize: MAX_FILE_SIZE },
        { status: 413 }
      );
    }
    
    // Validate file type
    if (!file.name.match(/\.(xlsx|xls)$/i)) {
      return NextResponse.json(
        { error: 'Invalid file format. Only .xlsx and .xls supported' },
        { status: 400 }
      );
    }
    
    // Read file buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    
    // Calculate file hash for duplicate detection
    const fileHash = crypto.createHash('sha256').update(buffer).digest('hex');
    
    // Check for duplicates
    const existing = await uploadRepository.findByHash(fileHash);
    if (existing) {
      return NextResponse.json(
        { error: 'File already uploaded', uploadedAt: existing.uploadedAt },
        { status: 409 }
      );
    }
    
    // Create upload record
    const uploadId = await uploadRepository.create({
      originalFilename: file.name,
      fileHash,
      fileSize: file.size,
      status: 'PROCESSING',
    });
    
    // Save file to disk
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const uploadDir = path.join(process.cwd(), 'uploads', String(year), month);
    await mkdir(uploadDir, { recursive: true });
    
    const fileName = `${uuidv4()}_${file.name}`;
    const filePath = path.join(uploadDir, fileName);
    await writeFile(filePath, buffer);
    
    // Update upload record with path
    await uploadRepository.update(uploadId, {
      storedPath: filePath,
    });
    
    // Process Excel
    const processor = new ExcelProcessor();
    const mappings = JSON.parse(mappingsJson || '[]');
    const options = JSON.parse(optionsJson || '{}');
    
    const result = await processor.process(buffer, mappings, {
      ...options,
      uploadedFileId: uploadId,
    });
    
    // Update upload record with results
    await uploadRepository.update(uploadId, {
      status: result.success ? 'COMPLETED' : 'FAILED',
      recordsProcessed: result.recordsProcessed,
      recordsFailed: result.recordsFailed,
      errorMessage: result.errors.length > 0 ? JSON.stringify(result.errors) : null,
      processedAt: new Date(),
    });
    
    return NextResponse.json({
      success: result.success,
      fileId: uploadId,
      recordsProcessed: result.recordsProcessed,
      recordsFailed: result.recordsFailed,
      errors: result.errors.slice(0, 20), // Limit error details
    });
    
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

**Commit**: YES  
**Message**: `feat(api): implement file upload endpoint with validation`
**Files**: `src/app/api/upload/route.ts`

---

#### Task 2.4: Analytics Engine
**Priority**: HIGH | **Parallel**: YES (with 2.3) | **Estimated**: 6 hours  
**Agent Profile**: ultrabrain (statistical calculations)

**What to do**:
Implement the KPI calculation and statistical analysis engine.

**Files to create**:
- `src/lib/analytics/kpiEngine.ts` - KPI calculations
- `src/lib/analytics/statistics.ts` - Statistical functions
- `src/lib/analytics/types.ts` - Type definitions

**Implementation**:
```typescript
// src/lib/analytics/kpiEngine.ts
import { rejectionRepository } from '@/lib/db/repositories/rejectionRepository';
import { calculateMovingAverage, calculateStdDev, calculateConfidenceInterval } from './statistics';

export interface RejectionRateResult {
  current: number;
  previous: number;
  delta: number;
  isGood: boolean;
}

export class KpiEngine {
  async calculateRejectionRate(
    from: Date,
    to: Date,
    totalProduced: number,
    filters?: { lineIds?: number[] }
  ): Promise<RejectionRateResult> {
    // Get current period data
    const currentData = await rejectionRepository.getAggregatedStats('day', from, to);
    const currentRejected = currentData.reduce((sum, d) => sum + d.totalRejected, 0);
    const currentRate = (currentRejected / totalProduced) * 100;
    
    // Get previous period data (same duration)
    const periodDuration = to.getTime() - from.getTime();
    const previousFrom = new Date(from.getTime() - periodDuration);
    const previousTo = new Date(to.getTime() - periodDuration);
    const previousData = await rejectionRepository.getAggregatedStats('day', previousFrom, previousTo);
    const previousRejected = previousData.reduce((sum, d) => sum + d.totalRejected, 0);
    const previousRate = (previousRejected / totalProduced) * 100;
    
    const delta = currentRate - previousRate;
    
    return {
      current: parseFloat(currentRate.toFixed(2)),
      previous: parseFloat(previousRate.toFixed(2)),
      delta: parseFloat(delta.toFixed(2)),
      isGood: delta < 0, // Lower rejection rate is better
    };
  }
  
  async calculateCostImpact(from: Date, to: Date): Promise<{
    current: number;
    projection: number;
    delta: number;
  }> {
    const data = await rejectionRepository.getAggregatedStats('day', from, to);
    const totalCost = data.reduce((sum, d) => sum + (d.totalCost || 0), 0);
    const avgDailyCost = totalCost / data.length;
    const daysInMonth = 30;
    const projection = avgDailyCost * daysInMonth;
    
    // Calculate delta vs previous period
    const periodDuration = to.getTime() - from.getTime();
    const previousFrom = new Date(from.getTime() - periodDuration);
    const previousTo = new Date(to.getTime() - periodDuration);
    const previousData = await rejectionRepository.getAggregatedStats('day', previousFrom, previousTo);
    const previousCost = previousData.reduce((sum, d) => sum + (d.totalCost || 0), 0);
    const delta = ((totalCost - previousCost) / previousCost) * 100;
    
    return {
      current: parseFloat(totalCost.toFixed(2)),
      projection: parseFloat(projection.toFixed(2)),
      delta: parseFloat(delta.toFixed(2)),
    };
  }
  
  async identifyTopRisk(from: Date, to: Date): Promise<{
    name: string;
    contribution: number;
    line: string;
    trend: 'up' | 'down' | 'stable';
  }> {
    const topDefects = await rejectionRepository.getTopDefects(from, to, 1);
    if (topDefects.length === 0) {
      return { name: 'None', contribution: 0, line: 'N/A', trend: 'stable' };
    }
    
    const top = topDefects[0];
    
    // Get previous period for trend
    const periodDuration = to.getTime() - from.getTime();
    const previousFrom = new Date(from.getTime() - periodDuration);
    const previousTo = new Date(to.getTime() - periodDuration);
    const previousTop = await rejectionRepository.getTopDefects(previousFrom, previousTo, 1);
    
    let trend: 'up' | 'down' | 'stable' = 'stable';
    if (previousTop.length > 0) {
      const change = ((top.count - previousTop[0].count) / previousTop[0].count) * 100;
      if (change > 10) trend = 'up';
      else if (change < -10) trend = 'down';
    }
    
    return {
      name: top.defectName,
      contribution: parseFloat(top.percentage.toFixed(1)),
      line: top.lineName || 'Unknown',
      trend,
    };
  }
  
  async generateForecast(historicalDays: number = 30, forecastDays: number = 30): Promise<{
    nextMonth: number;
    confidenceInterval: [number, number];
    confidence: number;
  }> {
    const to = new Date();
    const from = new Date(to.getTime() - historicalDays * 24 * 60 * 60 * 1000);
    
    const data = await rejectionRepository.getAggregatedStats('day', from, to);
    const rates = data.map(d => d.totalRejected);
    
    if (rates.length === 0) {
      return { nextMonth: 0, confidenceInterval: [0, 0], confidence: 0 };
    }
    
    // Simple moving average forecast
    const ma = calculateMovingAverage(rates, 7);
    const lastMA = ma[ma.length - 1] || rates[rates.length - 1];
    
    // Calculate confidence interval
    const stdDev = calculateStdDev(rates);
    const [lower, upper] = calculateConfidenceInterval(rates, 0.95);
    
    // Confidence based on data variance
    const confidence = Math.max(0, 100 - (stdDev / lastMA) * 100);
    
    return {
      nextMonth: parseFloat(lastMA.toFixed(2)),
      confidenceInterval: [parseFloat(lower.toFixed(2)), parseFloat(upper.toFixed(2))],
      confidence: parseFloat(confidence.toFixed(0)),
    };
  }
}

export const kpiEngine = new KpiEngine();
```

**Commit**: YES  
**Message**: `feat(analytics): implement KPI calculation engine`
**Files**: `src/lib/analytics/*`

---

#### Task 2.5: AI Integration Service
**Priority**: HIGH | **Parallel**: YES (with 2.4) | **Estimated**: 4 hours  
**Agent Profile**: quick (API integration)

**What to do**:
Implement the Gemini AI proxy service with caching.

**Files to create**:
- `src/lib/ai/geminiService.ts` - Main AI service
- `src/lib/ai/prompts.ts` - Prompt templates
- `src/app/api/ai/summarize/route.ts` - API endpoint

**Implementation**:
```typescript
// src/lib/ai/geminiService.ts
import { GoogleGenerativeAI } from '@google/generative-ai';
import { config } from '@/lib/config';

const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

interface CacheEntry {
  response: string;
  timestamp: number;
  confidence: number;
}

export class GeminiService {
  private client: GoogleGenerativeAI;
  private cache: Map<string, CacheEntry>;
  private model: any;
  
  constructor() {
    this.client = new GoogleGenerativeAI(config.GEMINI_API_KEY);
    this.cache = new Map();
    this.model = this.client.getGenerativeModel({
      model: 'gemini-2.5-flash',
      generationConfig: {
        temperature: 0.1,
        topP: 0.1,
        maxOutputTokens: 200,
      },
    });
  }
  
  async generateHealthSummary(data: {
    rejectionRate: { current: number; previous: number; delta: number };
    topRisk: { name: string; contribution: number; line: string };
    costImpact: { current: number; projection: number };
  }): Promise<{ summary: string; confidence: number }> {
    const cacheKey = this.generateCacheKey('health', data);
    const cached = this.getCached(cacheKey);
    if (cached) return cached;
    
    const prompt = this.buildHealthPrompt(data);
    
    try {
      const result = await this.model.generateContent(prompt);
      const response = result.response.text();
      
      // Confidence based on response quality
      const confidence = this.calculateConfidence(response, data);
      
      this.setCache(cacheKey, { response, confidence, timestamp: Date.now() });
      
      return { summary: response, confidence };
    } catch (error) {
      console.error('Gemini API error:', error);
      // Fallback to template
      return this.fallbackHealthSummary(data);
    }
  }
  
  private buildHealthPrompt(data: unknown): string {
    return `
You are a manufacturing quality assistant. Generate a 1-2 sentence summary for a General Manager based on this data:

Current Rejection Rate: ${data.rejectionRate.current}% (was ${data.rejectionRate.previous}%)
Change: ${data.rejectionRate.delta > 0 ? '+' : ''}${data.rejectionRate.delta}%
Top Defect: ${data.topRisk.name} (${data.topRisk.contribution}% of rejections)
Primary Line: ${data.topRisk.line}
Cost Impact: $${data.costImpact.current}

Rules:
- Use plain, simple language
- Mention if the trend is concerning (rejection rate increasing)
- Include specific numbers
- Suggest one action if appropriate
- Maximum 2 sentences

Summary:
`;
  }
  
  private fallbackHealthSummary(data: unknown): { summary: string; confidence: number } {
    const trend = data.rejectionRate.delta > 0 ? 'increasing' : 'decreasing';
    return {
      summary: `Rejection rate is ${data.rejectionRate.current}% and ${trend}. Top issue is ${data.topRisk.name} on ${data.topRisk.line}.`,
      confidence: 0.5,
    };
  }
  
  private generateCacheKey(type: string, data: unknown): string {
    const dataStr = JSON.stringify(data);
    return `${type}:${Buffer.from(dataStr).toString('base64')}`;
  }
  
  private getCached(key: string): { summary: string; confidence: number } | null {
    const entry = this.cache.get(key);
    if (!entry) return null;
    
    if (Date.now() - entry.timestamp > CACHE_TTL_MS) {
      this.cache.delete(key);
      return null;
    }
    
    return { summary: entry.response, confidence: entry.confidence };
  }
  
  private setCache(key: string, entry: CacheEntry): void {
    this.cache.set(key, entry);
  }
  
  private calculateConfidence(response: string, data: unknown): number {
    // Simple heuristic: check if response contains key numbers
    const hasRate = response.includes(String(data.rejectionRate.current));
    const hasDefect = response.includes(data.topRisk.name);
    const isShort = response.split('.').length <= 3;
    
    let confidence = 0.7;
    if (hasRate) confidence += 0.1;
    if (hasDefect) confidence += 0.1;
    if (isShort) confidence += 0.1;
    
    return Math.min(1, confidence);
  }
}

export const geminiService = new GeminiService();
```

**Commit**: YES  
**Message**: `feat(ai): implement Gemini integration with caching`
**Files**: `src/lib/ai/*`, `src/app/api/ai/summarize/route.ts`

---

## Phase 3: Frontend - Core Pages (Days 8-12)

### Objective
Build the 5 main application pages with real data integration, replacing mock data.

### Tasks

#### ⭐ Task 3.1: Dashboard Page with Real Data
**Priority**: CRITICAL | **Parallel**: NO (depends on Phase 2) | **Estimated**: 6 hours  
**Agent Profile**: visual-engineering (React + UI)

**What to do**:
Update the existing Dashboard page to fetch real data from APIs.

**Files to modify**:
- `src/app/page.tsx` - Convert to use real data
- Create loading states and error handling

**Implementation**:
```typescript
// src/app/page.tsx (updated)
import { kpiEngine } from '@/lib/analytics/kpiEngine';
import { geminiService } from '@/lib/ai/geminiService';
import HealthCard from '@/components/dashboard/HealthCard';
import KPICard from '@/components/dashboard/KPICard';
import styles from './page.module.css';
import { subDays } from 'date-fns';

async function getDashboardData() {
  const to = new Date();
  const from = subDays(to, 30);
  const totalProduced = 100000; // This should come from production data
  
  const [rejectionRate, costImpact, topRisk, forecast] = await Promise.all([
    kpiEngine.calculateRejectionRate(from, to, totalProduced),
    kpiEngine.calculateCostImpact(from, to),
    kpiEngine.identifyTopRisk(from, to),
    kpiEngine.generateForecast(30, 30),
  ]);
  
  const aiSummary = await geminiService.generateHealthSummary({
    rejectionRate,
    topRisk,
    costImpact,
  });
  
  return {
    rejectionRate,
    costImpact,
    topRisk,
    forecast,
    aiSummary,
  };
}

export default async function DashboardPage() {
  const data = await getDashboardData();
  
  return (
    <div className={styles.container}>
      <HealthCard
        status={data.rejectionRate.delta > 0.5 ? 'WARNING' : 'GOOD'}
        summary={data.aiSummary.summary}
        confidence={data.aiSummary.confidence}
      />
      
      <div className={styles.kpiGrid}>
        <KPICard
          title="Rejection Rate"
          value={`${data.rejectionRate.current}%`}
          delta={{
            value: `${Math.abs(data.rejectionRate.delta)}%`,
            direction: data.rejectionRate.delta > 0 ? 'up' : 'down',
            isGood: data.rejectionRate.isGood,
          }}
          subtext="Last 30 days"
        />
        
        <KPICard
          title="Top Risk"
          value={`${data.topRisk.contribution}%`}
          subtext={`${data.topRisk.name} - ${data.topRisk.line}`}
        />
        
        <KPICard
          title="Cost Impact"
          value={`$${data.costImpact.current.toLocaleString()}`}
          delta={{
            value: `${Math.abs(data.costImpact.delta)}%`,
            direction: data.costImpact.delta > 0 ? 'up' : 'down',
            isGood: data.costImpact.delta < 0,
          }}
          subtext={`Proj: $${data.costImpact.projection.toLocaleString()}`}
        />
        
        <KPICard
          title="Forecast"
          value={`${data.forecast.nextMonth}%`}
          subtext={`CI: ${data.forecast.confidenceInterval[0]}% - ${data.forecast.confidenceInterval[1]}%`}
        />
      </div>
    </div>
  );
}
```

**Commit**: YES  
**Message**: `feat(dashboard): integrate real data and AI summaries`
**Files**: `src/app/page.tsx`

---

#### ⭐ Task 3.2: Trends Page with Recharts
**Priority**: CRITICAL | **Parallel**: YES (with 3.1) | **Estimated**: 6 hours  
**Agent Profile**: visual-engineering (charts)

**What to do**:
Replace the mock SVG chart with a real Recharts implementation.

**Files to modify**:
- `src/app/trends/page.tsx` - Full rewrite with Recharts
- Add filtering and date range controls

**Implementation**:
```typescript
// src/app/trends/page.tsx
'use client';

import { useState, useEffect } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  ComposedChart,
} from 'recharts';
import { format, subDays } from 'date-fns';
import styles from './trends.module.css';

interface TrendDataPoint {
  date: string;
  rejectionRate: number;
  forecast?: number;
  confidenceUpper?: number;
  confidenceLower?: number;
}

export default function TrendsPage() {
  const [dateRange, setDateRange] = useState(30);
  const [data, setData] = useState<TrendDataPoint[]>([]);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    fetchTrends();
  }, [dateRange]);
  
  async function fetchTrends() {
    setLoading(true);
    const to = new Date();
    const from = subDays(to, dateRange);
    
    const response = await fetch(
      `/api/analytics/trends?from=${from.toISOString()}&to=${to.toISOString()}&granularity=day`
    );
    const result = await response.json();
    setData(result.series);
    setLoading(false);
  }
  
  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1 className={styles.title}>Rejection Trends</h1>
        <div className={styles.controls}>
          <select 
            value={dateRange} 
            onChange={(e) => setDateRange(Number(e.target.value))}
          >
            <option value={30}>Last 30 days</option>
            <option value={90}>Last 90 days</option>
            <option value={365}>This Year</option>
          </select>
        </div>
      </header>
      
      <main className={styles.chartContainer}>
        {loading ? (
          <div>Loading...</div>
        ) : (
          <ResponsiveContainer width="100%" height={400}>
            <ComposedChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E6E8EB" />
              <XAxis 
                dataKey="date" 
                tickFormatter={(date) => format(new Date(date), 'MMM d')}
                stroke="#6B7280"
              />
              <YAxis stroke="#6B7280" />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: '#FFFFFF',
                  border: '1px solid #E6E8EB',
                  borderRadius: '8px',
                }}
              />
              
              {/* Confidence band */}
              <Area
                type="monotone"
                dataKey="confidenceUpper"
                stroke="none"
                fill="#D1FAE5"
                fillOpacity={0.5}
              />
              <Area
                type="monotone"
                dataKey="confidenceLower"
                stroke="none"
                fill="#FFFFFF"
                fillOpacity={1}
              />
              
              {/* Actual trend */}
              <Line
                type="monotone"
                dataKey="rejectionRate"
                stroke="#1F9D55"
                strokeWidth={3}
                dot={false}
              />
              
              {/* Forecast */}
              <Line
                type="monotone"
                dataKey="forecast"
                stroke="#1F9D55"
                strokeWidth={2}
                strokeDasharray="5 5"
                dot={false}
              />
            </ComposedChart>
          </ResponsiveContainer>
        )}
      </main>
    </div>
  );
}
```

**Commit**: YES  
**Message**: `feat(trends): implement Recharts time-series visualization`
**Files**: `src/app/trends/page.tsx`

---

#### ⭐ Task 3.3: Analysis Page with Pareto Chart
**Priority**: CRITICAL | **Parallel**: YES (with 3.2) | **Estimated**: 6 hours  
**Agent Profile**: visual-engineering

**What to do**:
Build the Defect Analysis page with real Pareto chart using Recharts.

**Files to modify**:
- `src/app/analysis/page.tsx` - Full rewrite

**Implementation**:
```typescript
// src/app/analysis/page.tsx
'use client';

import { useState, useEffect } from 'react';
import {
  BarChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ComposedChart,
} from 'recharts';
import styles from './analysis.module.css';

interface ParetoItem {
  defectType: string;
  count: number;
  percentage: number;
  cumulativePercentage: number;
}

export default function AnalysisPage() {
  const [data, setData] = useState<ParetoItem[]>([]);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    fetchPareto();
  }, []);
  
  async function fetchPareto() {
    setLoading(true);
    const response = await fetch('/api/analytics/pareto');
    const result = await response.json();
    setData(result.items);
    setLoading(false);
  }
  
  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1 className={styles.title}>Defect Analysis</h1>
      </header>
      
      <div className={styles.contentGrid}>
        <section className={styles.card}>
          <h2 className={styles.cardTitle}>Pareto Chart</h2>
          {loading ? (
            <div>Loading...</div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <ComposedChart data={data}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E6E8EB" />
                <XAxis dataKey="defectType" stroke="#6B7280" />
                <YAxis 
                  yAxisId="left" 
                  stroke="#6B7280"
                  label={{ value: 'Count', angle: -90, position: 'insideLeft' }}
                />
                <YAxis 
                  yAxisId="right" 
                  orientation="right" 
                  stroke="#6B7280"
                  label={{ value: 'Cumulative %', angle: 90, position: 'insideRight' }}
                />
                <Tooltip />
                
                <Bar 
                  yAxisId="left"
                  dataKey="count" 
                  fill="#D64545"
                  radius={[4, 4, 0, 0]}
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="cumulativePercentage"
                  stroke="#2563EB"
                  strokeWidth={2}
                  dot={false}
                />
              </ComposedChart>
            </ResponsiveContainer>
          )}
        </section>
        
        <section className={styles.card}>
          <h2 className={styles.cardTitle}>Defect Details</h2>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Defect Type</th>
                <th>Count</th>
                <th>Contribution</th>
              </tr>
            </thead>
            <tbody>
              {data.map((item) => (
                <tr key={item.defectType}>
                  <td>{item.defectType}</td>
                  <td>{item.count.toLocaleString()}</td>
                  <td>{item.percentage}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </div>
    </div>
  );
}
```

**Commit**: YES  
**Message**: `feat(analysis): implement Pareto chart with Recharts`
**Files**: `src/app/analysis/page.tsx`

---

#### Task 3.4: Supplier Quality Page
**Priority**: HIGH | **Parallel**: YES (with 3.3) | **Estimated**: 5 hours  
**Agent Profile**: visual-engineering

**What to do**:
Build the Supplier Quality page with scorecard and comparison charts.

**Files to create**:
- `src/app/supplier/page.tsx` - New page
- Add to Sidebar navigation

**Implementation**:
```typescript
// src/app/supplier/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface SupplierData {
  supplierId: number;
  supplierName: string;
  rejectionRate: number;
  totalUnits: number;
  totalRejections: number;
  contribution: number;
}

export default function SupplierPage() {
  const [data, setData] = useState<SupplierData[]>([]);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    fetchSuppliers();
  }, []);
  
  async function fetchSuppliers() {
    const response = await fetch('/api/analytics/suppliers');
    const result = await response.json();
    setData(result.suppliers);
    setLoading(false);
  }
  
  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1 className={styles.title}>Supplier Quality</h1>
      </header>
      
      <div className={styles.content}>
        <section className={styles.card}>
          <h2 className={styles.cardTitle}>Supplier Scorecard</h2>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Supplier</th>
                <th>Rejection Rate</th>
                <th>Total Units</th>
                <th>Contribution</th>
              </tr>
            </thead>
            <tbody>
              {data.map((supplier) => (
                <tr key={supplier.supplierId}>
                  <td>{supplier.supplierName}</td>
                  <td>{supplier.rejectionRate.toFixed(2)}%</td>
                  <td>{supplier.totalUnits.toLocaleString()}</td>
                  <td>{supplier.contribution.toFixed(1)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
        
        <section className={styles.card}>
          <h2 className={styles.cardTitle}>Comparison</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="supplierName" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="rejectionRate" fill="#D64545" />
            </BarChart>
          </ResponsiveContainer>
        </section>
      </div>
    </div>
  );
}
```

**Commit**: YES  
**Message**: `feat(supplier): add supplier quality page with scorecard`
**Files**: `src/app/supplier/page.tsx`

---

#### Task 3.5: Reports Page
**Priority**: MEDIUM | **Parallel**: YES | **Estimated**: 4 hours  
**Agent Profile**: visual-engineering

**What to do**:
Build the Reports page for generating and downloading reports.

**Files to create**:
- `src/app/reports/page.tsx` - New page

**Implementation**:
```typescript
// src/app/reports/page.tsx
'use client';

import { useState } from 'react';
import styles from './reports.module.css';

export default function ReportsPage() {
  const [generating, setGenerating] = useState(false);
  const [reportType, setReportType] = useState('summary');
  const [dateRange, setDateRange] = useState(30);
  
  async function generateReport() {
    setGenerating(true);
    
    const response = await fetch('/api/reports/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: reportType,
        dateRange,
      }),
    });
    
    if (response.ok) {
      const { fileUrl } = await response.json();
      window.open(fileUrl, '_blank');
    }
    
    setGenerating(false);
  }
  
  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1 className={styles.title}>Reports</h1>
      </header>
      
      <div className={styles.form}>
        <div className={styles.field}>
          <label>Report Type</label>
          <select value={reportType} onChange={(e) => setReportType(e.target.value)}>
            <option value="summary">Summary</option>
            <option value="detailed">Detailed</option>
            <option value="executive">Executive</option>
          </select>
        </div>
        
        <div className={styles.field}>
          <label>Date Range</label>
          <select value={dateRange} onChange={(e) => setDateRange(Number(e.target.value))}>
            <option value={30}>Last 30 days</option>
            <option value={90}>Last 90 days</option>
            <option value={365}>Last year</option>
          </select>
        </div>
        
        <button 
          className={styles.generateButton}
          onClick={generateReport}
          disabled={generating}
        >
          {generating ? 'Generating...' : 'Generate Report'}
        </button>
      </div>
    </div>
  );
}
```

**Commit**: YES  
**Message**: `feat(reports): add report generation page`
**Files**: `src/app/reports/page.tsx`, `src/app/reports/reports.module.css`

---

## Phase 4: Data Upload UI (Days 13-15)

### Objective
Build the user interface for Excel file upload with schema mapping.

### Tasks

#### ⭐ Task 4.1: Upload Page with Drag-and-Drop
**Priority**: HIGH | **Parallel**: NO | **Estimated**: 6 hours  
**Agent Profile**: visual-engineering

**What to do**:
Create the upload interface with drag-and-drop, preview, and schema mapping.

**Files to create**:
- `src/app/settings/upload/page.tsx` - Upload page
- `src/components/upload/UploadZone.tsx` - Drag-and-drop component
- `src/components/upload/SchemaMapper.tsx` - Column mapping UI
- `src/components/upload/PreviewTable.tsx` - Data preview

**Implementation**:
```typescript
// src/components/upload/UploadZone.tsx
'use client';

import { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import styles from './UploadZone.module.css';

interface UploadZoneProps {
  onFilesSelected: (files: File[]) => void;
  disabled?: boolean;
}

export function UploadZone({ onFilesSelected, disabled }: UploadZoneProps) {
  const onDrop = useCallback((acceptedFiles: File[]) => {
    onFilesSelected(acceptedFiles);
  }, [onFilesSelected]);
  
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls'],
    },
    disabled,
  });
  
  return (
    <div 
      {...getRootProps()} 
      className={`${styles.zone} ${isDragActive ? styles.active : ''} ${disabled ? styles.disabled : ''}`}
    >
      <input {...getInputProps()} />
      {isDragActive ? (
        <p>Drop the files here...</p>
      ) : (
        <div className={styles.content}>
          <p className={styles.icon}>📁</p>
          <p className={styles.text}>
            Drag & drop Excel files here, or click to select
          </p>
          <p className={styles.hint}>
            Supported formats: .xlsx, .xls (max 50MB)
          </p>
        </div>
      )}
    </div>
  );
}
```

**Commit**: YES  
**Message**: `feat(upload-ui): implement drag-and-drop upload zone`
**Files**: `src/app/settings/upload/page.tsx`, `src/components/upload/*`

---

## Phase 5: Polish & Testing (Days 16-19)

### Objective
Add accessibility features, testing, error handling, and performance optimization.

### Tasks

#### Task 5.1: Accessibility Improvements
**Priority**: HIGH | **Parallel**: YES | **Estimated**: 6 hours  
**Agent Profile**: frontend-ui-ux

**What to do**:
Ensure WCAG AAA compliance throughout the application.

**Checklist**:
- [ ] All text minimum 18px
- [ ] Contrast ratio 7:1 for all text
- [ ] ARIA labels on all interactive elements
- [ ] Keyboard navigation for all pages
- [ ] Focus indicators visible
- [ ] Screen reader announcements for data updates
- [ ] Skip links for navigation
- [ ] Alt text for all charts

**Files to modify**:
- `src/app/globals.css` - Update font sizes
- All page components - Add ARIA attributes
- `src/components/Sidebar.tsx` - Keyboard navigation

**Commit**: YES  
**Message**: `a11y: implement WCAG AAA accessibility compliance`

---

#### Task 5.2: Error Handling & Loading States
**Priority**: HIGH | **Parallel**: YES | **Estimated**: 4 hours  
**Agent Profile**: quick

**What to do**:
Add comprehensive error handling and loading states.

**Files to create**:
- `src/components/ErrorBoundary.tsx` - React error boundary
- `src/components/LoadingSpinner.tsx` - Loading indicator
- `src/components/ErrorMessage.tsx` - Error display
- `src/app/error.tsx` - Global error page
- `src/app/loading.tsx` - Global loading page

**Commit**: YES  
**Message**: `feat(ui): add error boundaries and loading states`

---

#### Task 5.3: Unit Tests
**Priority**: MEDIUM | **Parallel**: YES | **Estimated**: 8 hours  
**Agent Profile**: quick

**What to do**:
Write unit tests for core business logic.

**Test Coverage**:
- Repository methods (with mocked DB)
- Analytics calculations
- Excel processing
- Schema detection
- AI service (mocked API)

**Files to create**:
- `src/lib/db/repositories/*.test.ts`
- `src/lib/analytics/*.test.ts`
- `src/lib/upload/*.test.ts`
- `src/lib/ai/*.test.ts`

**Commit**: YES  
**Message**: `test: add unit tests for core services`

---

#### Task 5.4: E2E Tests
**Priority**: MEDIUM | **Parallel**: YES | **Estimated**: 6 hours  
**Agent Profile**: playwright

**What to do**:
Write end-to-end tests for critical user flows.

**Test Scenarios**:
1. Dashboard loads with data
2. Upload Excel file successfully
3. Navigate between pages
4. Generate report
5. Filter data on Trends page

**Files to create**:
- `e2e/dashboard.spec.ts`
- `e2e/upload.spec.ts`
- `e2e/navigation.spec.ts`

**Commit**: YES  
**Message**: `test(e2e): add Playwright end-to-end tests`

---

## Phase 6: Documentation & Deployment (Days 20-21)

### Objective
Complete documentation and prepare for deployment.

### Tasks

#### Task 6.1: API Documentation
**Priority**: MEDIUM | **Parallel**: YES | **Estimated**: 3 hours  
**Agent Profile**: writing

**What to do**:
Document all API endpoints.

**Files to create**:
- `docs/API.md` - API reference
- `docs/DATABASE.md` - Database schema documentation
- `docs/DEPLOYMENT.md` - Deployment guide

**Commit**: YES  
**Message**: `docs: add API and deployment documentation`

---

#### Task 6.2: Production Build & Optimization
**Priority**: HIGH | **Parallel**: NO | **Estimated**: 4 hours  
**Agent Profile**: quick

**What to do**:
Optimize for production and verify build.

**Checklist**:
- [ ] Run production build (`npm run build`)
- [ ] Verify no TypeScript errors
- [ ] Check bundle size
- [ ] Optimize images
- [ ] Verify all environment variables documented
- [ ] Create production `.env` template

**Commit**: YES  
**Message**: `chore(build): optimize for production build`

---

## Summary & Timeline

### Critical Path
```
Task 1.1 → Task 1.2 → Task 2.1 → Task 2.2 → Task 2.3 → Task 3.1 → Task 3.2 → Task 3.3
(Deps)    (DB)      (Repo)    (Excel)   (API)     (Dash)    (Trends)  (Analysis)
     ↑________↑________↑________↑           ↑________↑________↑
     Parallel Groups                      Parallel Pages
```

### Week-by-Week Breakdown

**Week 1: Foundation**
- Days 1-3: Phase 1 (Infrastructure)
- Days 4-7: Phase 2 (Backend Core)

**Week 2: Frontend Core**
- Days 8-12: Phase 3 (Pages)
- Days 13-15: Phase 4 (Upload UI)

**Week 3: Polish & Launch**
- Days 16-19: Phase 5 (Testing, Accessibility)
- Days 20-21: Phase 6 (Documentation, Deployment)

### Parallelization Strategy

**Wave 1 (Days 1-3)**:
- 1.1: Dependencies (2h)
- 1.2: Database (4h) 
- 1.3: Config (1h)
- 1.4: Directories (0.5h)

**Wave 2 (Days 4-7)**:
- 2.1: Repositories (6h)
- 2.2: Excel Processor (8h) → depends on 2.1
- 2.3: Upload API (4h) → depends on 2.2
- 2.4: Analytics (6h) → parallel with 2.3
- 2.5: AI Service (4h) → parallel with 2.3

**Wave 3 (Days 8-12)**:
- 3.1: Dashboard (6h) → depends on Phase 2
- 3.2: Trends (6h) → parallel
- 3.3: Analysis (6h) → parallel
- 3.4: Supplier (5h) → parallel
- 3.5: Reports (4h) → parallel

**Wave 4 (Days 13-21)**:
- 4.1: Upload UI (6h)
- 5.1: Accessibility (6h) → parallel
- 5.2: Error Handling (4h) → parallel
- 5.3: Unit Tests (8h) → parallel
- 5.4: E2E Tests (6h) → parallel
- 6.1: Documentation (3h) → parallel
- 6.2: Production Build (4h)

---

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| Excel schema variations | Implement fuzzy matching + manual override UI |
| Database performance | Add indexes early, use continuous aggregates |
| Gemini API failures | Implement template-based fallback summaries |
| Accessibility issues | Test continuously, not at the end |
| Scope creep | Strict adherence to "Out of Scope" list in PRD |

---

## Definition of Done

**MVP Release**:
- [ ] All 5 pages functional with real data
- [ ] Excel upload working end-to-end
- [ ] Dashboard displays AI summaries
- [ ] WCAG AAA accessibility compliance
- [ ] All critical path tests passing
- [ ] Production build successful

**Production Release**:
- [ ] All MVP items complete
- [ ] 70%+ test coverage
- [ ] E2E tests passing
- [ ] Performance benchmarks met
- [ ] Documentation complete
- [ ] Security audit passed

---

**End of Implementation Work Plan**
