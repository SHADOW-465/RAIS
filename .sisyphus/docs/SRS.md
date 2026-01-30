# Software Requirements Specification (SRS)
## RAIS - Manufacturing Quality & Rejection Statistics Dashboard

**Version**: 1.0  
**Date**: 2026-01-30  
**Status**: Draft - Technical Specification  

---

## 1. Introduction

### 1.1 Purpose
This document provides the technical software requirements for the RAIS (Rejection Analytics & Insights System) web application. It specifies the system architecture, interfaces, data models, and detailed functional requirements for developers.

### 1.2 Intended Audience
- Software developers
- System architects
- QA engineers
- DevOps engineers
- Technical project managers

### 1.3 References
- PRD: `.sisyphus/docs/PRD.md`
- Prompt: `/prompt.md`
- Architecture Consultation: Oracle session results

---

## 2. System Overview

### 2.1 System Context

RAIS is a full-stack web application built with Next.js, consisting of:
- **Frontend**: React-based UI with server and client components
- **Backend**: Next.js API routes handling business logic
- **Database**: PostgreSQL with TimescaleDB for time-series data
- **AI Layer**: Gemini 2.5 integration via backend proxy
- **File Storage**: Local filesystem for uploaded Excel files

### 2.2 System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         CLIENT BROWSER                           │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐  │
│  │   Dashboard     │  │   Trends Page   │  │  Analysis Page  │  │
│  │   (Server)      │  │   (Client)      │  │   (Client)      │  │
│  └────────┬────────┘  └────────┬────────┘  └────────┬────────┘  │
│           │                    │                    │           │
│  ┌────────┴────────────────────┴────────────────────┴────────┐  │
│  │                    NEXT.JS APP ROUTER                      │  │
│  │  ┌──────────────────────────────────────────────────────┐  │  │
│  │  │              API ROUTES (app/api/)                    │  │  │
│  │  │  • /api/upload - Excel file ingestion                 │  │  │
│  │  │  • /api/rejections - CRUD operations                  │  │  │
│  │  │  • /api/analytics - Aggregated statistics             │  │  │
│  │  │  • /api/ai/summarize - Gemini proxy                   │  │  │
│  │  │  • /api/reports - PDF/Excel generation                │  │  │
│  │  │  • /api/auth - Authentication                         │  │  │
│  │  └──────────────────────────────────────────────────────┘  │  │
│  └───────────────────────────┬────────────────────────────────┘  │
└──────────────────────────────┼───────────────────────────────────┘
                               │
               ┌───────────────┼───────────────┐
               │               │               │
        ┌──────▼──────┐ ┌──────▼──────┐ ┌──────▼──────┐
        │ PostgreSQL  │ │ Local FS    │ │ Gemini API  │
        │ +           │ │ /uploads    │ │ (via proxy) │
        │ TimescaleDB │ │             │ │             │
        └─────────────┘ └─────────────┘ └─────────────┘
```

### 2.3 Tech Stack Specification

**Core Framework**:
- Next.js: 16.1.6
- React: 19.2.3
- TypeScript: 5.x
- Node.js: 20.x LTS

**Database**:
- PostgreSQL: 15.x
- TimescaleDB: 2.x extension
- Connection: pg (node-postgres) or @vercel/postgres

**State Management**:
- Server State: SWR 2.x
- Client State: Zustand 4.x

**UI & Styling**:
- CSS Modules (existing pattern)
- CSS Variables (design tokens in globals.css)
- Recharts 2.x (charting library)

**Data Processing**:
- Excel: xlsx (SheetJS) with streaming
- Dates: date-fns 3.x
- Validation: zod 3.x

**AI Integration**:
- Gemini: @google/generative-ai 0.x
- Caching: Redis (optional) or in-memory LRU

**Authentication**:
- Passwords: bcryptjs 2.x
- JWT: jose 5.x
- Sessions: iron-session 8.x

**Testing**:
- Unit: Vitest 1.x
- E2E: Playwright 1.x
- API: MSW 2.x

---

## 3. Functional Requirements (Technical Detail)

### 3.1 Module: Excel Upload & Ingestion

#### 3.1.1 Component: Upload Interface
**Location**: `src/app/settings/upload/page.tsx`  
**API**: `POST /api/upload`

**Requirements**:
- Drag-and-drop zone supporting multiple files
- File type validation (.xlsx, .xls)
- File size limit: 50MB per file
- Progress indicator with upload percentage
- Preview first 10 rows before confirmation

**UI Specifications**:
```typescript
interface UploadZoneProps {
  onFilesSelected: (files: File[]) => void;
  maxFileSize: number; // bytes
  acceptedTypes: string[];
  multiple: boolean;
}
```

#### 3.1.2 Component: Schema Detection
**Algorithm**:
1. Read first 20 rows of uploaded file
2. Identify header row (first row with >70% string cells)
3. Map columns using fuzzy string matching:
   - Date columns: "date", "timestamp", "datetime", "date/time"
   - Line columns: "line", "production line", "line number"
   - Defect columns: "defect", "defect type", "rejection reason"
   - Quantity columns: "quantity", "qty", "count", "units"
   - Supplier columns: "supplier", "vendor", "source"
4. Score each mapping (0-100% confidence)
5. Suggest mappings for user confirmation

**Data Structure**:
```typescript
interface SchemaMapping {
  columnIndex: number;
  columnName: string;
  suggestedField: string;
  confidence: number; // 0-100
  sampleValues: (string | number | Date)[];
}

interface SchemaDetectionResult {
  mappings: SchemaMapping[];
  headerRowIndex: number;
  totalRows: number;
  sheetName: string;
}
```

#### 3.1.3 Component: Data Validation
**Validation Rules**:
- Required fields must be present: `date`, `line`, `defect_type`, `quantity`
- Date parsing: Try multiple formats (ISO, MM/DD/YYYY, DD/MM/YYYY)
- Quantity: Must be positive integer
- Line names: Normalize (trim, uppercase)
- Defect types: Fuzzy match against existing types

**Error Reporting**:
```typescript
interface ValidationError {
  rowNumber: number;
  column: string;
  value: unknown;
  error: string;
  severity: 'ERROR' | 'WARNING';
}
```

#### 3.1.4 API Specification: POST /api/upload

**Request**:
```http
POST /api/upload
Content-Type: multipart/form-data

file: <binary>
schemaMappings: JSON string of SchemaMapping[]
options: {
  skipHeaderRows: number;
  sheetIndex: number;
  onDuplicate: 'SKIP' | 'UPDATE' | 'ERROR';
}
```

**Response**:
```typescript
interface UploadResponse {
  success: boolean;
  fileId: string;
  recordsProcessed: number;
  recordsFailed: number;
  errors: ValidationError[];
  warnings: string[];
  processingTimeMs: number;
}
```

**Processing Flow**:
1. Receive file stream
2. Save to temporary location: `/tmp/uploads/{uuid}.xlsx`
3. Parse with xlsx streaming (chunk size: 1000 rows)
4. Validate each row against schema
5. Transform and normalize data
6. Bulk insert to database (batch size: 500)
7. Move file to permanent storage: `/uploads/{year}/{month}/{uuid}.xlsx`
8. Create audit record in `uploaded_files` table
9. Trigger KPI recalculation

**Error Handling**:
- If >20% rows fail: Abort transaction, return errors
- If <20% rows fail: Continue, report warnings
- Database connection lost: Retry 3x, then fail

### 3.2 Module: Data Management

#### 3.2.1 Database Schema (Detailed)

**Table: rejection_records** (TimescaleDB Hypertable)
```sql
CREATE TABLE rejection_records (
    id BIGSERIAL,
    timestamp TIMESTAMPTZ NOT NULL,
    line_id INTEGER NOT NULL,
    shift_id INTEGER,
    defect_type_id INTEGER NOT NULL,
    supplier_id INTEGER,
    product_id INTEGER,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    cost_per_unit DECIMAL(10,2),
    total_cost DECIMAL(12,2) GENERATED ALWAYS AS (quantity * COALESCE(cost_per_unit, 0)) STORED,
    reason TEXT,
    operator_id VARCHAR(50),
    uploaded_file_id INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    PRIMARY KEY (id, timestamp)
);

-- Convert to hypertable
SELECT create_hypertable('rejection_records', 'timestamp', 
    chunk_time_interval => INTERVAL '1 week',
    if_not_exists => TRUE
);

-- Indexes for common queries
CREATE INDEX idx_rejection_line_time ON rejection_records (line_id, timestamp DESC);
CREATE INDEX idx_rejection_defect_time ON rejection_records (defect_type_id, timestamp DESC);
CREATE INDEX idx_rejection_supplier_time ON rejection_records (supplier_id, timestamp DESC);
```

**Table: defect_types** (Reference)
```sql
CREATE TABLE defect_types (
    id SERIAL PRIMARY KEY,
    code VARCHAR(20) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    category VARCHAR(50),
    severity VARCHAR(20) CHECK (severity IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed data
INSERT INTO defect_types (code, name, category, severity) VALUES
('LEAK', 'Leak', 'Assembly', 'HIGH'),
('SCRATCH', 'Scratch', 'Visual', 'MEDIUM'),
('MISALIGN', 'Misalignment', 'Assembly', 'HIGH'),
('BURR', 'Burr', 'Machining', 'LOW'),
('DENT', 'Dent', 'Handling', 'MEDIUM');
```

**Table: production_lines** (Reference)
```sql
CREATE TABLE production_lines (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    department VARCHAR(50),
    factory_id INTEGER DEFAULT 1,
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Continuous Aggregate: daily_stats** (Pre-computed KPIs)
```sql
CREATE MATERIALIZED VIEW daily_rejection_stats
WITH (timescaledb.continuous) AS
SELECT
    time_bucket('1 day', timestamp) AS day,
    line_id,
    defect_type_id,
    supplier_id,
    COUNT(*) as record_count,
    SUM(quantity) as total_rejected,
    AVG(quantity) as avg_quantity,
    SUM(total_cost) as total_cost,
    MAX(quantity) as max_single_rejection
FROM rejection_records
GROUP BY day, line_id, defect_type_id, supplier_id;

-- Refresh policy: every hour
SELECT add_continuous_aggregate_policy('daily_rejection_stats',
    start_offset => INTERVAL '1 month',
    end_offset => INTERVAL '1 hour',
    schedule_interval => INTERVAL '1 hour'
);
```

#### 3.2.2 Data Access Layer

**Repository Pattern**:
```typescript
// src/lib/db/repositories/rejectionRepository.ts

export class RejectionRepository {
  async getByDateRange(
    from: Date,
    to: Date,
    filters?: {
      lineIds?: number[];
      defectTypeIds?: number[];
      supplierIds?: number[];
    }
  ): Promise<RejectionRecord[]>;

  async getAggregatedStats(
    period: 'day' | 'week' | 'month',
    from: Date,
    to: Date
  ): Promise<AggregatedStats[]>;

  async getTopDefects(
    from: Date,
    to: Date,
    limit: number
  ): Promise<TopDefectResult[]>;

  async getRejectionRate(
    from: Date,
    to: Date,
    totalProduced: number
  ): Promise<number>;

  async bulkInsert(records: RejectionRecord[]): Promise<number>;
}
```

**Query Examples**:
```typescript
// Get rejection rate for dashboard
const getRejectionRateQuery = `
  SELECT 
    SUM(quantity) as total_rejected,
    COUNT(DISTINCT DATE(timestamp)) as days_with_data
  FROM rejection_records
  WHERE timestamp >= $1 AND timestamp <= $2
  AND ($3::int[] IS NULL OR line_id = ANY($3))
`;

// Get Pareto data for defect analysis
const getParetoQuery = `
  SELECT 
    dt.name as defect_name,
    SUM(rr.quantity) as total_quantity,
    ROUND(100.0 * SUM(rr.quantity) / SUM(SUM(rr.quantity)) OVER (), 2) as percentage
  FROM rejection_records rr
  JOIN defect_types dt ON rr.defect_type_id = dt.id
  WHERE rr.timestamp >= $1 AND rr.timestamp <= $2
  GROUP BY dt.id, dt.name
  ORDER BY total_quantity DESC
`;

// Get time-series data for trends
const getTimeSeriesQuery = `
  SELECT 
    time_bucket('1 day', timestamp) as date,
    SUM(quantity) as daily_rejections,
    COUNT(*) as incident_count
  FROM rejection_records
  WHERE timestamp >= $1 AND timestamp <= $2
  GROUP BY date
  ORDER BY date
`;
```

### 3.3 Module: Analytics & KPI Computation

#### 3.3.1 KPI Calculation Engine

**Service**: `src/lib/analytics/kpiEngine.ts`

```typescript
export class KpiEngine {
  // Calculate rejection rate
  async calculateRejectionRate(params: {
    from: Date;
    to: Date;
    lineIds?: number[];
    totalProduced: number; // From external source or estimate
  }): Promise<{
    rate: number; // percentage
    rejected: number;
    produced: number;
    previousRate: number;
    delta: number;
  }>;

  // Calculate cost impact
  async calculateCostImpact(params: {
    from: Date;
    to: Date;
  }): Promise<{
    totalCost: number;
    averageDailyCost: number;
    projection: number;
    delta: number;
  }>;

  // Identify top risk
  async identifyTopRisk(params: {
    from: Date;
    to: Date;
  }): Promise<{
    defectType: string;
    contribution: number; // percentage
    count: number;
    trend: 'up' | 'down' | 'stable';
  }>;

  // Generate forecast
  async generateForecast(params: {
    historicalDays: number;
    forecastDays: number;
  }): Promise<{
    nextMonth: number;
    confidenceInterval: [number, number];
    confidence: number; // percentage
  }>;
}
```

**Statistical Calculations**:
```typescript
// Moving average
export function calculateMovingAverage(
  data: number[],
  windowSize: number
): number[];

// Standard deviation
export function calculateStdDev(data: number[]): number;

// Confidence interval (95%)
export function calculateConfidenceInterval(
  data: number[],
  confidence: number
): [number, number];

// Detect anomalies (Z-score > 2)
export function detectAnomalies(
  data: { date: Date; value: number }[]
): { date: Date; value: number; zScore: number }[];

// Pareto analysis
export function calculatePareto(
  items: { name: string; value: number }[]
): { name: string; value: number; percentage: number; cumulative: number }[];
```

#### 3.3.2 API Specification: Analytics Endpoints

**GET /api/analytics/dashboard**
```typescript
// Response
interface DashboardAnalytics {
  period: { from: string; to: string };
  rejectionRate: {
    current: number;
    previous: number;
    delta: number;
    isGood: boolean;
  };
  topRisk: {
    name: string;
    contribution: number;
    line: string;
  };
  costImpact: {
    current: number;
    projection: number;
    delta: number;
  };
  forecast: {
    nextMonth: number;
    confidenceInterval: [number, number];
    confidence: number;
  };
  aiSummary?: string;
  aiConfidence?: number;
}
```

**GET /api/analytics/trends**
```typescript
// Query params
interface TrendsQuery {
  from: string; // ISO date
  to: string;
  granularity: 'day' | 'week' | 'month';
  lineIds?: string; // comma-separated
  defectTypeIds?: string;
}

// Response
interface TrendsData {
  series: {
    date: string;
    rejectionRate: number;
    rejectionCount: number;
    producedCount: number;
  }[];
  comparison: {
    currentPeriod: { rate: number; count: number };
    previousPeriod: { rate: number; count: number };
    change: { rate: number; count: number };
  };
}
```

**GET /api/analytics/pareto**
```typescript
// Response
interface ParetoData {
  items: {
    defectType: string;
    count: number;
    percentage: number;
    cumulativePercentage: number;
  }[];
  totalDefects: number;
  totalQuantity: number;
}
```

### 3.4 Module: AI Integration

#### 3.4.1 Gemini Proxy Service

**Service**: `src/lib/ai/geminiService.ts`

```typescript
export class GeminiService {
  private client: GoogleGenerativeAI;
  private cache: Map<string, CacheEntry>;

  constructor(apiKey: string) {
    this.client = new GoogleGenerativeAI(apiKey);
    this.cache = new Map();
  }

  async generateHealthSummary(data: DashboardAnalytics): Promise<{
    summary: string;
    confidence: number;
  }>;

  async detectAnomalies(
    timeSeriesData: { date: string; value: number }[]
  ): Promise<{
    anomalies: { date: string; value: number; explanation: string }[];
  }>;

  async explainTrend(
    current: number,
    previous: number,
    context: string
  ): Promise<{
    explanation: string;
    isSignificant: boolean;
  }>;

  private buildPrompt(type: string, data: unknown): string;
  private getCached(key: string): CacheEntry | undefined;
  private setCache(key: string, value: CacheEntry): void;
}
```

**Configuration**:
```typescript
const GEMINI_CONFIG = {
  model: 'gemini-2.5-flash',
  generationConfig: {
    temperature: 0.1,
    topP: 0.1,
    maxOutputTokens: 200,
  },
  safetySettings: [
    {
      category: 'HARM_CATEGORY_DANGEROUS_CONTENT',
      threshold: 'BLOCK_NONE',
    },
  ],
};

const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour
```

#### 3.4.2 API Specification: POST /api/ai/summarize

**Request**:
```typescript
interface SummarizeRequest {
  type: 'health' | 'anomalies' | 'trend';
  data: DashboardAnalytics | TimeSeriesData | TrendContext;
  context?: string;
}
```

**Response**:
```typescript
interface SummarizeResponse {
  summary: string;
  confidence: number; // AI confidence 0-1
  generatedAt: string;
  cached: boolean;
}
```

**Error Handling**:
- If Gemini API fails: Return 503 with fallback template
- If response is malformed: Retry once, then return fallback
- Rate limiting: 429 status with retry-after header

**Prompt Examples**:

*Health Summary Prompt*:
```
You are a manufacturing quality assistant. Generate a 1-2 sentence summary for a General Manager based on this data:

Current Rejection Rate: {rejectionRate.current}% (was {rejectionRate.previous}%)
Top Defect: {topRisk.name} ({topRisk.contribution}% of rejections)
Primary Line: {topRisk.line}
Cost Impact: ${costImpact.current}

Rules:
- Use plain, simple language
- Mention if trend is concerning
- Include specific numbers
- Suggest one action if appropriate
- Maximum 2 sentences

Summary:
```

### 3.5 Module: Report Generation

#### 3.5.1 Report Service

**Service**: `src/lib/reports/reportService.ts`

```typescript
export class ReportService {
  async generatePDF(params: {
    type: 'summary' | 'detailed' | 'executive';
    dateRange: { from: Date; to: Date };
    filters?: {
      lineIds?: number[];
      defectTypeIds?: number[];
    };
  }): Promise<{
    filePath: string;
    fileName: string;
    fileSize: number;
  }>;

  async generateExcel(params: {
    dateRange: { from: Date; to: Date };
    includeRawData: boolean;
  }): Promise<{
    filePath: string;
    fileName: string;
  }>;

  async getRecentReports(userId: number): Promise<ReportRecord[]>;
  async deleteReport(reportId: string): Promise<void>;
}
```

**PDF Generation**:
- Library: Puppeteer or Playwright (server-side rendering)
- Template: HTML template with Tailwind CSS
- Sections:
  1. Executive Summary (AI-generated)
  2. KPI Overview (charts + tables)
  3. Trend Analysis
  4. Defect Breakdown (Pareto)
  5. Appendix (raw data if detailed)

**Excel Generation**:
- Library: xlsx (SheetJS)
- Sheets:
  1. Summary (KPIs)
  2. Trends (time-series)
  3. Defects (Pareto data)
  4. Raw Data (if requested)

### 3.6 Module: Authentication & Authorization

#### 3.6.1 Authentication Flow

**Session-based auth using iron-session**:

```typescript
// src/lib/auth/session.ts
import { getIronSession } from 'iron-session';

export const sessionConfig = {
  cookieName: 'rais_session',
  password: process.env.SESSION_SECRET!, // 32+ chars
  cookieOptions: {
    secure: process.env.NODE_ENV === 'production',
    maxAge: 60 * 60 * 24 * 7, // 1 week
  },
};

export interface SessionData {
  userId: number;
  email: string;
  role: 'GM' | 'ANALYST' | 'VIEWER';
  isLoggedIn: boolean;
}
```

#### 3.6.2 Authorization Middleware

```typescript
// src/middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const session = request.cookies.get('rais_session');
  const { pathname } = request.nextUrl;

  // Public routes
  if (pathname === '/login' || pathname.startsWith('/api/auth')) {
    return NextResponse.next();
  }

  // Protected routes
  if (!session) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // Role-based access
  const userRole = getRoleFromSession(session);
  
  if (pathname.startsWith('/settings') && userRole === 'GM') {
    return NextResponse.redirect(new URL('/', request.url));
  }

  return NextResponse.next();
}
```

#### 3.6.3 API Route Protection

```typescript
// src/lib/auth/withAuth.ts
import { NextRequest, NextResponse } from 'next/server';

export function withAuth(
  handler: (req: NextRequest, session: SessionData) => Promise<NextResponse>,
  requiredRole?: 'GM' | 'ANALYST' | 'VIEWER'
) {
  return async (req: NextRequest) => {
    const session = await getSession(req);
    
    if (!session.isLoggedIn) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (requiredRole && !hasRole(session.role, requiredRole)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    return handler(req, session);
  };
}
```

---

## 4. Interface Specifications

### 4.1 User Interfaces

#### 4.1.1 Dashboard Page (`src/app/page.tsx`)
**Type**: Server Component  
**Data Fetching**: Server-side with direct DB queries

**Components**:
1. `HealthCard` - Overall quality status
2. `KPICard[4]` - Rejection rate, Top risk, Cost impact, Forecast
3. `FilterBar` - Date range, Factory, Line, Shift
4. `ActionsLog` - Recent actions (client component for interactivity)

**Data Requirements**:
- Health status (AI summary)
- Rejection rate with delta
- Top defect with contribution
- Cost impact with projection
- Forecast data

#### 4.1.2 Trends Page (`src/app/trends/page.tsx`)
**Type**: Client Component  
**Data Fetching**: SWR for real-time updates

**Components**:
1. `TrendsChart` (Recharts) - Time-series with confidence band
2. `FilterPanel` - Date range, Factory, Line, Shift
3. `ComparisonStats` - Current vs previous period
4. `ExportButton` - CSV download

**Chart Specifications**:
```typescript
interface TrendChartProps {
  data: {
    date: string;
    rejectionRate: number;
    forecast?: number;
    confidenceLower?: number;
    confidenceUpper?: number;
  }[];
  onDataPointClick?: (date: string) => void;
}
```

#### 4.1.3 Analysis Page (`src/app/analysis/page.tsx`)
**Type**: Client Component

**Components**:
1. `ParetoChart` (Custom Recharts composition)
2. `DefectTable` - Sortable table with progress bars
3. `RootCausePanel` - AI-generated insights
4. `FilterBar` - Line, Shift, Product

**Pareto Chart Specification**:
- Bar chart: Defect frequency (sorted descending)
- Line chart: Cumulative percentage
- Dual Y-axes: Left (count), Right (percentage)
- Interactive: Click bar to filter table
- Highlight top 3 defects

#### 4.1.4 Supplier Page (`src/app/supplier/page.tsx`)
**Type**: Client Component

**Components**:
1. `SupplierTable` - Scorecard with sorting
2. `SupplierDetail` - Expandable row with trend chart
3. `ComparisonChart` - Side-by-side bar chart
4. `FilterBar` - Date range, Product category

#### 4.1.5 Reports Page (`src/app/reports/page.tsx`)
**Type**: Client Component

**Components**:
1. `ReportGenerator` - Form with options
2. `ReportList` - Previously generated reports
3. `DownloadButton` - File download

### 4.2 External Interfaces

#### 4.2.1 Gemini API
**Endpoint**: `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent`  
**Method**: POST  
**Authentication**: API Key (Bearer token)

**Request Format**:
```json
{
  "contents": [
    {
      "parts": [
        { "text": "prompt text here" }
      ]
    }
  ],
  "generationConfig": {
    "temperature": 0.1,
    "topP": 0.1,
    "maxOutputTokens": 200
  }
}
```

**Response Format**:
```json
{
  "candidates": [
    {
      "content": {
        "parts": [
          { "text": "generated summary" }
        ]
      },
      "finishReason": "STOP",
      "safetyRatings": [...]
    }
  ]
}
```

**Error Handling**:
- 429: Rate limited - backoff and retry
- 400: Invalid request - log and alert
- 500: Gemini error - use fallback template
- Network errors - retry 3x with exponential backoff

---

## 5. Data Requirements

### 5.1 Data Volumes

**Expected Volumes** (single factory):
- Rejection records: 100-500 per day
- Peak upload size: 10,000 rows (weekly batch)
- Storage growth: ~50MB/year for raw data
- File uploads: ~100MB total (90-day retention)

**Capacity Planning**:
- Database: 10GB initial, 50GB over 3 years
- File storage: 500MB initial, 2GB over 3 years
- Memory: 2GB for application + 1GB for file processing

### 5.2 Data Retention

**Policy**:
- Raw rejection records: 2 years, then archive
- Aggregated statistics: Indefinite
- Uploaded files: 90 days
- AI cache: 1 hour
- Session data: 7 days
- Audit logs: 1 year

**Implementation**:
- TimescaleDB data retention policies
- Cron job for file cleanup
- Database partitioning by date

### 5.3 Backup & Recovery

**Backup Strategy**:
- Database: Daily automated backups (pg_dump)
- Files: Daily sync to secondary storage
- Retention: 30 days of backups

**Recovery**:
- RTO (Recovery Time Objective): 4 hours
- RPO (Recovery Point Objective): 24 hours

---

## 6. Quality Attributes

### 6.1 Performance Requirements

| Metric | Target | Measurement |
|--------|--------|-------------|
| Dashboard FCP | <1.5s | Lighthouse |
| Dashboard TTI | <2s | Lighthouse |
| API p95 latency | <500ms | Server logs |
| Excel upload 10K rows | <10s | User timing |
| Report generation | <5s | User timing |
| Database query | <200ms | Query logs |

**Optimization Strategies**:
- Database indexes on date, line_id, defect_type_id
- Continuous aggregates for common queries
- SWR caching with stale-while-revalidate
- Image optimization and lazy loading
- Code splitting by route

### 6.2 Security Requirements

**Authentication**:
- Password complexity: 8+ chars, mixed case, number
- Brute force protection: 5 attempts, 15-min lockout
- Session timeout: 7 days
- Password reset: Secure token via email

**Authorization**:
- RBAC with 3 roles (GM, Analyst, Viewer)
- API routes enforce role checks
- Principle of least privilege

**Data Protection**:
- HTTPS only (HSTS header)
- API keys server-side only
- SQL injection prevention (parameterized queries)
- XSS prevention (output encoding)
- CSRF tokens for mutations
- File upload validation (type, size, content scan)

**Audit**:
- Log all authentication attempts
- Log all data modifications
- Log all file uploads
- Log all AI interactions

### 6.3 Reliability Requirements

**Availability**: 99.9% uptime (manufacturing operational software)  
**MTBF**: >720 hours (30 days)  
**MTTR**: <4 hours

**Resilience**:
- Graceful degradation (dashboard works if AI is down)
- Automatic retry with exponential backoff
- Circuit breaker for external APIs (Gemini)
- Health check endpoints

### 6.4 Maintainability Requirements

**Code Quality**:
- TypeScript strict mode
- ESLint + Prettier configuration
- Test coverage >70%
- Documentation for all public APIs

**Monitoring**:
- Error tracking (Sentry or similar)
- Performance monitoring
- Database query performance
- AI API usage and costs

### 6.5 Portability Requirements

**Deployment Targets**:
- Vercel (primary)
- Docker container (self-hosted option)
- Any Node.js 20+ environment

**Database**:
- PostgreSQL 15+ with TimescaleDB
- Supports managed services (Supabase, AWS RDS, etc.)

---

## 7. Constraints

### 7.1 Technical Constraints

- **Next.js App Router**: Must use App Router patterns (Server Components, etc.)
- **TypeScript**: All code must be TypeScript with strict mode
- **CSS Modules**: Styling must use existing CSS Modules pattern
- **Accessibility**: WCAG AAA compliance required
- **Browser Support**: Modern browsers only (no IE11)

### 7.2 Business Constraints

- **Single Factory**: Initial deployment for single location only
- **Excel Workflow**: Must support existing Excel-based processes
- **GM Accessibility**: Design optimized for eyesight challenges
- **Budget**: Use open-source and free-tier services where possible

### 7.3 Regulatory Constraints

- **Data Privacy**: Manufacturing data may be sensitive
- **Audit Requirements**: All data changes must be logged
- **Retention**: Follow company data retention policies

---

## 8. Appendices

### 8.1 API Reference

#### 8.1.1 Upload API

**POST /api/upload**
- Request: multipart/form-data
- Response: JSON
- Auth: Analyst only
- Rate limit: 10 uploads/hour

#### 8.1.2 Analytics API

**GET /api/analytics/dashboard**
- Query params: from, to, lineIds, defectTypeIds
- Response: DashboardAnalytics
- Auth: Any authenticated user
- Cache: 5 minutes

**GET /api/analytics/trends**
- Query params: from, to, granularity, lineIds
- Response: TrendsData
- Auth: Any authenticated user
- Cache: 5 minutes

**GET /api/analytics/pareto**
- Query params: from, to
- Response: ParetoData
- Auth: Any authenticated user

#### 8.1.3 AI API

**POST /api/ai/summarize**
- Request: JSON
- Response: SummarizeResponse
- Auth: Any authenticated user
- Rate limit: 100 requests/hour
- Cache: 1 hour

#### 8.1.4 Reports API

**POST /api/reports/generate**
- Request: JSON
- Response: { fileUrl, fileName }
- Auth: Any authenticated user
- Async: Yes (returns job ID)

**GET /api/reports/download/:id**
- Response: File stream
- Auth: Report owner only

### 8.2 Error Codes

| Code | Description | HTTP Status |
|------|-------------|-------------|
| AUTH_001 | Invalid credentials | 401 |
| AUTH_002 | Session expired | 401 |
| AUTH_003 | Insufficient permissions | 403 |
| UPLOAD_001 | Invalid file format | 400 |
| UPLOAD_002 | File too large | 413 |
| UPLOAD_003 | Schema validation failed | 422 |
| DB_001 | Database connection error | 503 |
| AI_001 | Gemini API error | 503 |
| AI_002 | Rate limited | 429 |

### 8.3 Glossary

- **FCP**: First Contentful Paint
- **TTI**: Time to Interactive
- **RBAC**: Role-Based Access Control
- **WCAG**: Web Content Accessibility Guidelines
- **Hypertable**: TimescaleDB time-series table
- **SWR**: Stale-While-Revalidate caching strategy

---

**End of SRS**
