# Software Requirements Specification (SRS)
## RAIS - Manufacturing Quality & Rejection Statistics Dashboard

**Version**: 2.0 (Supabase Edition)  
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
- Supabase Documentation: https://supabase.com/docs

---

## 2. System Overview

### 2.1 System Context

RAIS is a full-stack web application built with Next.js and Supabase, consisting of:
- **Frontend**: React-based UI with server and client components
- **Backend**: Next.js API routes handling business logic
- **Database**: Supabase PostgreSQL for data storage
- **Auth**: Supabase Authentication for user management
- **Storage**: Supabase Storage for uploaded Excel files
- **AI Layer**: Gemini 2.5 integration via backend proxy

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
│  │  │  • /api/auth - Supabase Auth helpers                  │  │  │
│  │  └──────────────────────────────────────────────────────┘  │  │
│  └───────────────────────────┬────────────────────────────────┘  │
└──────────────────────────────┼───────────────────────────────────┘
                               │
               ┌───────────────┼───────────────┐
               │               │               │
        ┌──────▼──────┐ ┌──────▼──────┐ ┌──────▼──────┐
        │  Supabase   │ │  Supabase   │ │  Gemini API │
        │ PostgreSQL  │ │   Storage   │ │ (via proxy) │
        │   + Auth    │ │  /uploads   │ │             │
        └─────────────┘ └─────────────┘ └─────────────┘
```

### 2.3 Tech Stack Specification

**Core Framework**:
- Next.js: 16.1.6
- React: 19.2.3
- TypeScript: 5.x
- Node.js: 20.x LTS

**Backend Services (Supabase)**:
- **Database**: Supabase PostgreSQL
- **Auth**: Supabase Auth (@supabase/supabase-js)
- **Storage**: Supabase Storage (for Excel uploads)
- **RLS**: Row Level Security policies

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
- Caching: in-memory LRU

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
2. Upload to Supabase Storage: `uploads/{year}/{month}/{uuid}.xlsx`
3. Parse with xlsx streaming (chunk size: 1000 rows)
4. Validate each row against schema
5. Transform and normalize data
6. Batch insert to Supabase (using supabase-js)
7. Create audit record in `uploaded_files` table with storage path
8. Trigger KPI recalculation

**Error Handling**:
- If >20% rows fail: Abort transaction, return errors
- If <20% rows fail: Continue, report warnings
- Supabase connection error: Retry 3x with exponential backoff

### 3.2 Module: Data Management

#### 3.2.1 Database Schema (Detailed)

**Table: rejection_records** (Standard PostgreSQL table)
```sql
CREATE TABLE rejection_records (
    id BIGSERIAL PRIMARY KEY,
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
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for time-series queries
CREATE INDEX idx_rejection_timestamp ON rejection_records (timestamp DESC);
CREATE INDEX idx_rejection_line_time ON rejection_records (line_id, timestamp DESC);
CREATE INDEX idx_rejection_defect_time ON rejection_records (defect_type_id, timestamp DESC);
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

**Table: uploaded_files** (Supabase Storage metadata)
```sql
CREATE TABLE uploaded_files (
    id SERIAL PRIMARY KEY,
    uuid UUID DEFAULT gen_random_uuid(),
    original_filename VARCHAR(255) NOT NULL,
    storage_path VARCHAR(500) NOT NULL, -- Supabase Storage path
    file_size_bytes INTEGER,
    file_hash VARCHAR(64),
    uploaded_by UUID REFERENCES auth.users(id), -- Supabase Auth user ID
    uploaded_at TIMESTAMPTZ DEFAULT NOW(),
    processed_at TIMESTAMPTZ,
    status VARCHAR(20) DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED')),
    error_message TEXT,
    records_processed INTEGER DEFAULT 0,
    records_failed INTEGER DEFAULT 0
);
```

**Table: user_profiles** (Extends Supabase Auth)
```sql
-- Supabase Auth manages auth.users table automatically
-- We create a public profile table for additional user data
CREATE TABLE user_profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id),
    name VARCHAR(100) NOT NULL,
    role VARCHAR(20) DEFAULT 'ANALYST' CHECK (role IN ('GM', 'ANALYST', 'VIEWER')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Materialized View: daily_stats** (Pre-computed KPIs)
```sql
-- Note: Using standard PostgreSQL materialized view (not TimescaleDB continuous aggregate)
CREATE MATERIALIZED VIEW daily_rejection_stats AS
SELECT
    date_trunc('day', timestamp) AS day,
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

-- Create index on materialized view
CREATE INDEX idx_daily_stats_day ON daily_rejection_stats (day DESC);

-- Refresh manually or via scheduled function
-- REFRESH MATERIALIZED VIEW CONCURRENTLY daily_rejection_stats;
```

**Row Level Security (RLS) Policies**:
```sql
-- Enable RLS on all tables
ALTER TABLE rejection_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE defect_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE production_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE uploaded_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Allow authenticated read" ON rejection_records
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow analyst insert" ON rejection_records
    FOR INSERT TO authenticated 
    WITH CHECK (EXISTS (
        SELECT 1 FROM user_profiles 
        WHERE id = auth.uid() 
        AND role IN ('ANALYST', 'GM')
    ));

CREATE POLICY "Users can view own profile" ON user_profiles
    FOR SELECT TO authenticated USING (auth.uid() = id);
```

#### 3.2.2 Data Access Layer

**Supabase Client Setup**:
```typescript
// src/lib/db/supabaseClient.ts
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Client for browser (respects RLS)
export const supabaseClient = createClient(supabaseUrl, supabaseKey);

// Admin client for server-side (bypasses RLS)
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
```

**Repository Pattern**:
```typescript
// src/lib/db/repositories/rejectionRepository.ts
import { supabaseClient, supabaseAdmin } from '@/lib/db/supabaseClient';

export class RejectionRepository {
  async getByDateRange(
    from: Date,
    to: Date,
    filters?: {
      lineIds?: number[];
      defectTypeIds?: number[];
      supplierIds?: number[];
    }
  ): Promise<RejectionRecord[]> {
    let query = supabaseClient
      .from('rejection_records')
      .select(`
        *,
        defect_types(defect_name),
        production_lines(line_name)
      `)
      .gte('timestamp', from.toISOString())
      .lte('timestamp', to.toISOString())
      .order('timestamp', { ascending: false });

    if (filters?.lineIds?.length) {
      query = query.in('line_id', filters.lineIds);
    }
    if (filters?.defectTypeIds?.length) {
      query = query.in('defect_type_id', filters.defectTypeIds);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  }

  async bulkInsert(records: RejectionRecord[]): Promise<number> {
    const { data, error } = await supabaseAdmin
      .from('rejection_records')
      .insert(records)
      .select();
    
    if (error) throw error;
    return data?.length || 0;
  }
}

export const rejectionRepository = new RejectionRepository();
```

### 3.3 Module: Supabase Authentication

#### 3.3.1 Supabase Auth Integration

**Client-Side Auth**:
```typescript
// src/lib/auth/supabaseAuth.ts
import { supabaseClient } from '@/lib/db/supabaseClient';

export class SupabaseAuthService {
  async signIn(email: string, password: string) {
    const { data, error } = await supabaseClient.auth.signInWithPassword({
      email,
      password,
    });
    
    if (error) throw error;
    return data;
  }

  async signOut() {
    const { error } = await supabaseClient.auth.signOut();
    if (error) throw error;
  }

  async getCurrentUser() {
    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) return null;

    // Fetch user profile with role
    const { data: profile } = await supabaseClient
      .from('user_profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    return { ...user, profile };
  }

  async createUser(email: string, password: string, name: string, role: string) {
    // Create auth user
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

    if (authError) throw authError;

    // Create user profile
    const { error: profileError } = await supabaseAdmin
      .from('user_profiles')
      .insert({
        id: authData.user.id,
        name,
        role,
      });

    if (profileError) throw profileError;
    return authData.user;
  }
}

export const authService = new SupabaseAuthService();
```

#### 3.3.2 Middleware for Route Protection

```typescript
// src/middleware.ts
import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();
  const supabase = createMiddlewareClient({ req, res });
  
  const { data: { session } } = await supabase.auth.getSession();

  // Protect routes
  if (!session && req.nextUrl.pathname.startsWith('/settings')) {
    return NextResponse.redirect(new URL('/login', req.url));
  }

  return res;
}

export const config = {
  matcher: ['/settings/:path*', '/api/:path*'],
};
```

### 3.4 Module: Supabase Storage

#### 3.4.1 Storage Service

```typescript
// src/lib/storage/supabaseStorage.ts
import { supabaseClient, supabaseAdmin } from '@/lib/db/supabaseClient';

const BUCKET_NAME = 'uploads';

export class SupabaseStorageService {
  async uploadFile(file: File, path: string): Promise<string> {
    const { data, error } = await supabaseAdmin
      .storage
      .from(BUCKET_NAME)
      .upload(path, file, {
        cacheControl: '3600',
        upsert: false,
      });

    if (error) throw error;
    return data.path;
  }

  async getSignedUrl(path: string, expiresIn: number = 3600): Promise<string> {
    const { data, error } = await supabaseAdmin
      .storage
      .from(BUCKET_NAME)
      .createSignedUrl(path, expiresIn);

    if (error) throw error;
    return data.signedUrl;
  }

  async deleteFile(path: string): Promise<void> {
    const { error } = await supabaseAdmin
      .storage
      .from(BUCKET_NAME)
      .remove([path]);

    if (error) throw error;
  }
}

export const storageService = new SupabaseStorageService();
```

### 3.5 Module: Analytics & KPI Computation

#### 3.5.1 KPI Calculation Engine

```typescript
// src/lib/analytics/kpiEngine.ts
import { supabaseClient } from '@/lib/db/supabaseClient';

export class KpiEngine {
  async calculateRejectionRate(
    from: Date,
    to: Date,
    totalProduced: number
  ): Promise<RejectionRateResult> {
    const { data, error } = await supabaseClient
      .from('rejection_records')
      .select('quantity')
      .gte('timestamp', from.toISOString())
      .lte('timestamp', to.toISOString());

    if (error) throw error;

    const totalRejected = data?.reduce((sum, r) => sum + r.quantity, 0) || 0;
    const currentRate = totalProduced > 0 ? (totalRejected / totalProduced) * 100 : 0;

    // Calculate previous period...
    return {
      current: parseFloat(currentRate.toFixed(2)),
      previous: 0, // Calculate from previous period
      delta: 0,
      isGood: true,
    };
  }
}
```

### 3.6 Module: AI Integration

#### 3.6.1 Gemini Proxy Service

```typescript
// src/lib/ai/geminiService.ts
import { GoogleGenerativeAI } from '@google/generative-ai';

// Same implementation as before, no Supabase changes needed
```

---

## 4. Interface Specifications

### 4.1 User Interfaces

Same as original PRD/SRS - no changes needed for Supabase migration.

### 4.2 External Interfaces

#### 4.2.1 Supabase API
**Endpoints**: Managed by Supabase client library  
**Authentication**: JWT tokens (Supabase Auth)  
**Rate Limits**: Supabase free tier: 500 requests/second

#### 4.2.2 Gemini API
**Endpoint**: `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent`  
**Method**: POST  
**Authentication**: API Key (server-side only)

---

## 5. Data Requirements

### 5.1 Data Volumes

Same as original - no changes for Supabase migration.

### 5.2 Data Retention

**Policy**:
- Raw rejection records: 2 years
- Aggregated statistics: Indefinite
- Uploaded files: 90 days (in Supabase Storage)
- Supabase Auth logs: Managed by Supabase

### 5.3 Backup & Recovery

**Supabase Managed Backups**:
- Daily automated backups (included with Supabase)
- Point-in-time recovery available
- RTO (Recovery Time Objective): 4 hours
- RPO (Recovery Point Objective): 24 hours

---

## 6. Quality Attributes

### 6.1 Performance Requirements

Same as original, but using Supabase optimizations:

**Supabase Optimizations**:
- Database indexes on date, line_id, defect_type_id
- Materialized views for common queries (refresh via cron or trigger)
- Connection pooling handled by Supabase
- Edge caching available

### 6.2 Security Requirements

**Supabase-Specific Security**:
- Row Level Security (RLS) policies on all tables
- JWT-based authentication
- API keys stored server-side only
- Supabase Auth for user management
- HTTPS enforced by Supabase

### 6.3 Reliability Requirements

**Supabase SLA**: 99.9% uptime guarantee  
**Automatic Failover**: Handled by Supabase  
**Backups**: Automated daily backups

---

## 7. Constraints

### 7.1 Technical Constraints

- **Next.js App Router**: Must use App Router patterns
- **TypeScript**: All code must be TypeScript with strict mode
- **CSS Modules**: Styling must use existing CSS Modules pattern
- **Supabase**: Must use Supabase client libraries
- **Accessibility**: WCAG AAA compliance required
- **Browser Support**: Modern browsers only

### 7.2 Supabase Constraints

- **Free Tier Limits**: 500MB database, 1GB storage, 2GB bandwidth
- **Rate Limiting**: 500 requests/second
- **Connection Limit**: 60 concurrent connections (pooled)
- **Regional**: Choose Supabase region closest to users

---

## 8. Appendices

### 8.1 API Reference

Supabase client methods replace raw SQL:
- `supabase.from('table').select()` - Query
- `supabase.from('table').insert()` - Insert
- `supabase.from('table').update()` - Update
- `supabase.from('table').delete()` - Delete
- `supabase.auth.signInWithPassword()` - Auth
- `supabase.storage.from('bucket').upload()` - Storage

### 8.2 Environment Variables

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# AI
GEMINI_API_KEY=your-gemini-api-key

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 8.3 Glossary

- **Supabase**: Backend-as-a-Service platform
- **RLS**: Row Level Security
- **JWT**: JSON Web Token (authentication)
- **SWR**: Stale-While-Revalidate
- **WCAG**: Web Content Accessibility Guidelines

### 8.4 Migration Notes

**From PostgreSQL+TimescaleDB to Supabase**:
- Replace `pg` client with `@supabase/supabase-js`
- Remove TimescaleDB-specific features (hypertables, continuous aggregates)
- Use standard PostgreSQL materialized views instead
- Implement RLS policies for security
- Use Supabase Auth instead of custom auth
- Use Supabase Storage instead of local filesystem
- No self-managed database backups needed

---

**End of SRS (Supabase Edition)**
