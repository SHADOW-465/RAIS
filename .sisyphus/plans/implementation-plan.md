# Implementation Work Plan (Supabase Edition)
## RAIS - Manufacturing Quality & Rejection Statistics Dashboard

**Plan Version**: 2.0 (Supabase Edition)  
**Created**: 2026-01-30  
**Estimated Duration**: 3-4 weeks (MVP), 6-8 weeks (production-ready)  
**Priority Order**: Critical path tasks marked with ⭐

---

## Executive Summary

This work plan provides a step-by-step execution guide for building the RAIS manufacturing quality dashboard using **Supabase** as the backend platform. Supabase provides PostgreSQL database, Authentication, and Storage in one integrated platform.

**Current State**: Next.js 16 + React 19 scaffold exists with basic UI components  
**Target State**: Full-stack production application with Supabase backend, Excel ingestion, analytics, AI integration, and 5 functional pages

---

## Phase 1: Foundation & Infrastructure (Days 1-3)

### Objective
Set up Supabase project, install dependencies, and configure core infrastructure.

### Prerequisites
- Supabase account (free tier sufficient for MVP)
- Node.js 20+ installed
- Gemini API key available

### Tasks

#### ⭐ Task 1.1: Install Dependencies
**Priority**: CRITICAL | **Parallel**: YES | **Estimated**: 2 hours  
**Agent Profile**: quick (npm install tasks)

**What to do**:
Install all required production and development dependencies.

```bash
# Supabase
npm install @supabase/supabase-js @supabase/auth-helpers-nextjs

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

# Testing
npm install -D vitest @vitejs/plugin-react @testing-library/react @testing-library/jest-dom
npm install -D @playwright/test
```

**Verification**:
```bash
npm list @supabase/supabase-js recharts zustand swr xlsx @google/generative-ai
# All packages should be listed without errors
```

**Commit**: NO (group with Task 1.2)

---

#### ⭐ Task 1.2: Supabase Setup
**Priority**: CRITICAL | **Parallel**: NO (depends on 1.1) | **Estimated**: 4 hours  
**Agent Profile**: ultrabrain (Supabase architecture)

**What to do**:
1. Create Supabase project at https://app.supabase.com
2. Create database tables using SQL Editor
3. Set up Row Level Security (RLS) policies
4. Create Supabase Storage bucket for uploads
5. Configure authentication (email/password)
6. Create database indexes
7. Seed reference data (defect types, sample lines)

**Files to create**:
- `src/lib/db/supabaseClient.ts` - Supabase client configuration
- `scripts/setup-supabase.sql` - Full schema definition
- `scripts/seed-data.sql` - Reference data

**Key Implementation Details**:
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

**SQL to execute in Supabase SQL Editor** (`scripts/setup-supabase.sql`):
```sql
-- Create tables
CREATE TABLE IF NOT EXISTS rejection_records (
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

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_rejection_timestamp ON rejection_records (timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_rejection_line_time ON rejection_records (line_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_rejection_defect_time ON rejection_records (defect_type_id, timestamp DESC);

-- Reference tables
CREATE TABLE IF NOT EXISTS defect_types (
    id SERIAL PRIMARY KEY,
    code VARCHAR(20) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    category VARCHAR(50),
    severity VARCHAR(20) CHECK (severity IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS production_lines (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    department VARCHAR(50),
    factory_id INTEGER DEFAULT 1,
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS suppliers (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    contact_email VARCHAR(100),
    quality_rating INTEGER CHECK (quality_rating BETWEEN 1 AND 5),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS uploaded_files (
    id SERIAL PRIMARY KEY,
    uuid UUID DEFAULT gen_random_uuid(),
    original_filename VARCHAR(255) NOT NULL,
    storage_path VARCHAR(500) NOT NULL,
    file_size_bytes INTEGER,
    file_hash VARCHAR(64),
    uploaded_by UUID REFERENCES auth.users(id),
    uploaded_at TIMESTAMPTZ DEFAULT NOW(),
    processed_at TIMESTAMPTZ,
    status VARCHAR(20) DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED')),
    error_message TEXT,
    records_processed INTEGER DEFAULT 0,
    records_failed INTEGER DEFAULT 0
);

-- User profiles (extends Supabase Auth)
CREATE TABLE IF NOT EXISTS user_profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id),
    name VARCHAR(100) NOT NULL,
    role VARCHAR(20) DEFAULT 'ANALYST' CHECK (role IN ('GM', 'ANALYST', 'VIEWER')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Materialized view for daily stats
CREATE MATERIALIZED VIEW IF NOT EXISTS daily_rejection_stats AS
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

-- Enable RLS
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
```

**Supabase Storage Setup**:
1. Go to Storage in Supabase Dashboard
2. Create bucket named `uploads`
3. Set to Private (no public access)
4. Configure allowed MIME types: `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`, `application/vnd.ms-excel`
5. Set max file size: 50MB

**Verification**:
```bash
# Test Supabase connection
npm run dev
# Visit http://localhost:3000 and verify no connection errors
```

Check Supabase Table Editor to verify:
- rejection_records table exists
- defect_types, production_lines, suppliers reference tables exist
- uploaded_files table exists
- user_profiles table exists

**Commit**: YES  
**Message**: `chore(db): initialize Supabase project with PostgreSQL schema`  
**Files**: `src/lib/db/supabaseClient.ts`, `scripts/setup-supabase.sql`, `scripts/seed-data.sql`

---

#### ⭐ Task 1.3: Environment Configuration
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
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# AI
GEMINI_API_KEY=your_gemini_api_key_here

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
NODE_ENV=development
```

**Verification**:
```typescript
// src/lib/config.ts should validate all required vars
import { z } from 'zod';

const configSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string(),
  SUPABASE_SERVICE_ROLE_KEY: z.string(),
  GEMINI_API_KEY: z.string(),
});

export const config = configSchema.parse(process.env);
```

**Commit**: YES  
**Message**: `chore(config): add Supabase environment configuration`  
**Files**: `.env.local.example`, `src/lib/config.ts`

---

## Phase 2: Backend Core (Days 4-7)

### Objective
Build the data access layer using Supabase, API routes, and core business logic.

### Tasks

#### ⭐ Task 2.1: Data Access Layer - Supabase Repository Pattern
**Priority**: CRITICAL | **Parallel**: NO (depends on 1.2) | **Estimated**: 6 hours  
**Agent Profile**: ultrabrain (data layer architecture)

**What to do**:
Implement repository classes using Supabase client for all database operations.

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
import { supabaseClient, supabaseAdmin } from '@/lib/db/supabaseClient';

export class RejectionRepository {
  async getByDateRange(
    from: Date,
    to: Date,
    filters?: { lineIds?: number[]; defectTypeIds?: number[]; supplierIds?: number[] }
  ): Promise<RejectionRecord[]> {
    let query = supabaseClient
      .from('rejection_records')
      .select(`
        *,
        defect_types(name),
        production_lines(name)
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

**Commit**: YES  
**Message**: `feat(db): implement Supabase repository pattern`  
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

Same implementation as original plan (no changes needed for Supabase migration).

**Commit**: YES  
**Message**: `feat(upload): implement Excel processing with schema detection`  
**Files**: `src/lib/upload/*`

---

#### ⭐ Task 2.3: API Routes - Upload Endpoint with Supabase Storage
**Priority**: CRITICAL | **Parallel**: NO (depends on 2.2) | **Estimated**: 4 hours  
**Agent Profile**: quick (API route implementation)

**What to do**:
Create the API route for file uploads using Supabase Storage.

**Files to create**:
- `src/app/api/upload/route.ts` - Main upload endpoint
- `src/app/api/upload/schema/route.ts` - Schema detection endpoint

**Key Implementation**:
```typescript
// src/app/api/upload/route.ts
import { supabaseAdmin } from '@/lib/db/supabaseClient';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    
    // Upload to Supabase Storage
    const fileName = `${uuidv4()}_${file.name}`;
    const { data: uploadData, error: uploadError } = await supabaseAdmin
      .storage
      .from('uploads')
      .upload(fileName, file);
    
    if (uploadError) throw uploadError;
    
    // Process Excel and insert to database
    // ... processing logic
    
    return NextResponse.json({ success: true, fileId: uploadData.path });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
```

**Commit**: YES  
**Message**: `feat(api): implement file upload with Supabase Storage`  
**Files**: `src/app/api/upload/route.ts`, `src/app/api/upload/schema/route.ts`

---

#### ⭐ Task 2.4: Supabase Authentication Setup
**Priority**: HIGH | **Parallel**: YES (with 2.3) | **Estimated**: 4 hours  
**Agent Profile**: quick

**What to do**:
Implement authentication using Supabase Auth.

**Files to create**:
- `src/lib/auth/supabaseAuth.ts` - Auth service
- `src/middleware.ts` - Route protection middleware
- `src/app/login/page.tsx` - Login page

**Key Implementation**:
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
}
```

**Commit**: YES  
**Message**: `feat(auth): implement Supabase authentication`  
**Files**: `src/lib/auth/*`, `src/middleware.ts`, `src/app/login/page.tsx`

---

#### Task 2.5: Analytics Engine
**Priority**: HIGH | **Parallel**: YES (with 2.3) | **Estimated**: 6 hours  
**Agent Profile**: ultrabrain (statistical calculations)

**What to do**:
Implement the KPI calculation and statistical analysis engine.

Same implementation as original plan, but using Supabase client for data queries.

**Files to create**:
- `src/lib/analytics/kpiEngine.ts` - KPI calculations
- `src/lib/analytics/statistics.ts` - Statistical functions
- `src/lib/analytics/types.ts` - Type definitions

**Commit**: YES  
**Message**: `feat(analytics): implement KPI calculation engine`  
**Files**: `src/lib/analytics/*`

---

#### Task 2.6: AI Integration Service
**Priority**: HIGH | **Parallel**: YES (with 2.4) | **Estimated**: 4 hours  
**Agent Profile**: quick (API integration)

**What to do**:
Implement the Gemini AI proxy service with caching.

Same implementation as original plan (no changes needed for Supabase migration).

**Files to create**:
- `src/lib/ai/geminiService.ts` - Main AI service
- `src/lib/ai/prompts.ts` - Prompt templates
- `src/app/api/ai/summarize/route.ts` - API endpoint

**Commit**: YES  
**Message**: `feat(ai): implement Gemini integration with caching`  
**Files**: `src/lib/ai/*`, `src/app/api/ai/summarize/route.ts`

---

## Phase 3: Frontend - Core Pages (Days 8-12)

### Objective
Build the 5 main application pages with real data integration from Supabase.

### Tasks

#### ⭐ Task 3.1: Dashboard Page with Real Data
**Priority**: CRITICAL | **Parallel**: NO (depends on Phase 2) | **Estimated**: 6 hours  
**Agent Profile**: visual-engineering (React + UI)

Update the existing Dashboard page to fetch real data from Supabase APIs.

**Commit**: YES  
**Message**: `feat(dashboard): integrate Supabase data and AI summaries`  
**Files**: `src/app/page.tsx`

---

#### ⭐ Task 3.2: Trends Page with Recharts
**Priority**: CRITICAL | **Parallel**: YES (with 3.1) | **Estimated**: 6 hours  
**Agent Profile**: visual-engineering (charts)

Build the Trends page with real data from Supabase.

**Commit**: YES  
**Message**: `feat(trends): implement Recharts time-series with Supabase data`  
**Files**: `src/app/trends/page.tsx`

---

#### ⭐ Task 3.3: Analysis Page with Pareto Chart
**Priority**: CRITICAL | **Parallel**: YES (with 3.2) | **Estimated**: 6 hours  
**Agent Profile**: visual-engineering

Build the Defect Analysis page with Pareto chart using Supabase data.

**Commit**: YES  
**Message**: `feat(analysis): implement Pareto chart with Supabase data`  
**Files**: `src/app/analysis/page.tsx`

---

#### ⭐ Task 3.4: Supplier Quality Page
**Priority**: HIGH | **Parallel**: YES (with 3.3) | **Estimated**: 5 hours  
**Agent Profile**: visual-engineering

Build the Supplier Quality page with Supabase data.

**Commit**: YES  
**Message**: `feat(supplier): add supplier quality page with Supabase data`  
**Files**: `src/app/supplier/page.tsx`

---

#### Task 3.5: Reports Page
**Priority**: MEDIUM | **Parallel**: YES | **Estimated**: 4 hours  
**Agent Profile**: visual-engineering

Build the Reports page for generating and downloading reports.

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

Create the upload interface with drag-and-drop, preview, and schema mapping.

**Files to create**:
- `src/app/settings/upload/page.tsx` - Upload page
- `src/components/upload/UploadZone.tsx` - Drag-and-drop component

**Commit**: YES  
**Message**: `feat(upload-ui): implement drag-and-drop upload with Supabase Storage`  
**Files**: `src/app/settings/upload/page.tsx`, `src/components/upload/*`

---

## Phase 5: Polish & Testing (Days 16-19)

### Objective
Add accessibility features, testing, error handling, and performance optimization.

Same tasks as original plan:
- Task 5.1: Accessibility Improvements (WCAG AAA)
- Task 5.2: Error Handling & Loading States
- Task 5.3: Unit Tests
- Task 5.4: E2E Tests

---

## Phase 6: Documentation & Deployment (Days 20-21)

### Objective
Complete documentation and prepare for deployment on Vercel with Supabase.

### Tasks

#### Task 6.1: API Documentation
**Priority**: MEDIUM | **Parallel**: YES | **Estimated**: 3 hours  
**Agent Profile**: writing

Document all API endpoints and Supabase configuration.

**Files to create**:
- `docs/API.md` - API reference
- `docs/SUPABASE_SETUP.md` - Supabase setup guide
- `docs/DEPLOYMENT.md` - Vercel deployment guide

**Commit**: YES  
**Message**: `docs: add API and Supabase setup documentation`  
**Files**: `docs/*`

---

#### Task 6.2: Production Build & Vercel Deployment
**Priority**: HIGH | **Parallel**: NO | **Estimated**: 4 hours  
**Agent Profile**: quick

Optimize for production and deploy to Vercel with Supabase integration.

**Checklist**:
- [ ] Run production build (`npm run build`)
- [ ] Verify no TypeScript errors
- [ ] Check bundle size
- [ ] Configure Vercel environment variables
- [ ] Connect Supabase project to Vercel
- [ ] Configure custom domain (optional)
- [ ] Test all features on production

**Vercel Environment Variables**:
```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
GEMINI_API_KEY=your-gemini-api-key
```

**Commit**: YES  
**Message**: `chore(build): optimize for production and Vercel deployment`  
**Files**: `next.config.ts`, `vercel.json` (if needed)

---

## Summary & Timeline

### Critical Path
```
Task 1.1 → Task 1.2 → Task 2.1 → Task 2.2 → Task 2.3 → Task 3.1 → Task 3.2 → Task 3.3
(Deps)    (Supabase) (Repo)    (Excel)   (API)     (Dash)    (Trends)  (Analysis)
     ↑________↑________↑________↑           ↑________↑________↑
     Parallel Groups                      Parallel Pages
```

### Week-by-Week Breakdown

**Week 1: Foundation**
- Days 1-3: Phase 1 (Supabase setup, dependencies)
- Days 4-7: Phase 2 (Backend with Supabase)

**Week 2: Frontend Core**
- Days 8-12: Phase 3 (Pages with Supabase data)
- Days 13-15: Phase 4 (Upload UI)

**Week 3: Polish & Launch**
- Days 16-19: Phase 5 (Testing, accessibility)
- Days 20-21: Phase 6 (Documentation, Vercel deployment)

---

## Key Changes from Original Plan (PostgreSQL → Supabase)

| Component | Before (PostgreSQL+TimescaleDB) | After (Supabase) |
|-----------|----------------------------------|------------------|
| **Database** | Self-hosted PostgreSQL + TimescaleDB | Supabase managed PostgreSQL |
| **Connection** | `pg` (node-postgres) | `@supabase/supabase-js` |
| **Auth** | Custom auth with bcrypt/iron-session | Supabase Auth |
| **Storage** | Local filesystem | Supabase Storage |
| **Security** | Manual implementation | RLS policies |
| **Backups** | Manual pg_dump | Automated Supabase backups |
| **Hosting** | Self-managed or AWS RDS | Fully managed |
| **Scaling** | Manual | Automatic (up to limits) |

---

## Definition of Done

**MVP Release**:
- [ ] All 5 pages functional with Supabase data
- [ ] Excel upload working with Supabase Storage
- [ ] Dashboard displays AI summaries
- [ ] Supabase Auth implemented with role-based access
- [ ] RLS policies configured
- [ ] WCAG AAA accessibility compliance
- [ ] Dashboard loads in <2 seconds
- [ ] Deployed to Vercel
- [ ] Documentation complete

---

**End of Implementation Work Plan (Supabase Edition)**
