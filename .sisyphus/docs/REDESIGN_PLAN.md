# RAIS Dashboard Complete Redesign Plan

**Generated:** 2026-02-03  
**Status:** Architecture & Implementation Blueprint  
**Objective:** Build production-ready manufacturing rejection intelligence dashboard from scratch

---

## 🔍 Current State Analysis

### Critical Findings
1. **100% Stub Implementation**: All pages return `<div>Page Content</div>`
2. **No Backend**: All API routes return `501 Not Implemented`
3. **Empty Infrastructure**: `src/lib/` and `src/components/` directories are empty
4. **Tech Stack Present**: Next.js 16, React 19, Supabase, Gemini AI, Recharts, SWR, Zustand installed
5. **Environment Configured**: Supabase and Gemini API keys present

### What Needs Building
Everything. This is a greenfield project despite the directory structure.

---

## 🎯 Design Constraints (Non-Negotiable)

### User Profile: General Manager
- **Age**: 50-65 years
- **Vision**: Weak eyesight (requires WCAG AAA compliance)
- **Tech Proficiency**: Limited
- **Time**: Extremely limited (needs 10-second insights)
- **Goal**: Prevent batch scrapping, identify risks early

### UX Principles
1. **Summary-First**: No raw data by default (drill-down on demand)
2. **High Contrast**: WCAG AAA - minimum 7:1 ratio for normal text, 4.5:1 for large text
3. **Large Typography**: Minimum 18px for body text, 24px+ for headings
4. **One Question Per Page**: Each page answers one business question
5. **Executive Dashboard Pattern**: KPI cards → Trends → Drill-down

---

## 🏗️ Architecture Design

### Technology Stack Decisions

#### Frontend
```typescript
// Component Library: shadcn/ui (Radix + Tailwind)
// ✅ Fully accessible (WCAG AAA compliant)
// ✅ Customizable
// ✅ TypeScript-first
// ✅ Next.js 14+ compatible

// Visualization: Recharts
// ✅ Already installed
// ✅ Declarative API
// ✅ Responsive
// ❌ Limited accessibility (need custom wrappers)

// State Management: Zustand (already installed)
// ✅ Lightweight
// ✅ TypeScript-friendly
// ✅ No boilerplate

// Data Fetching: SWR (already installed)
// ✅ Optimistic updates
// ✅ Auto revalidation
// ✅ Cache management
```

#### Backend
```typescript
// Database: Supabase (PostgreSQL)
// ✅ Already configured
// ✅ Real-time subscriptions
// ✅ Row-Level Security
// ✅ Storage for Excel files

// API: Next.js API Routes
// ✅ Serverless
// ✅ Type-safe with TypeScript
// ✅ Edge runtime support

// AI: Gemini 2.5 Flash
// ✅ Fast inference (<1s)
// ✅ 1M token context window
// ✅ Structured output support
// ✅ Cost-effective
```

#### Design System
```css
/* Color Palette (WCAG AAA Compliant) */
--color-bg-primary: #FFFFFF;      /* Background */
--color-text-primary: #000000;    /* 21:1 contrast */
--color-text-secondary: #333333;  /* 12.63:1 contrast */

--color-success: #006600;         /* 7.58:1 contrast on white */
--color-warning: #CC6600;         /* 4.52:1 contrast (large text only) */
--color-danger: #CC0000;          /* 5.9:1 contrast */
--color-info: #004080;            /* 8.59:1 contrast */

--color-accent: #0066CC;          /* Primary actions - 6.5:1 contrast */
--color-accent-hover: #004C99;    /* Hover state - 9.74:1 contrast */

/* Typography Scale */
--font-size-xs: 14px;
--font-size-sm: 16px;
--font-size-base: 18px;           /* Body text minimum */
--font-size-lg: 20px;
--font-size-xl: 24px;             /* Headings minimum */
--font-size-2xl: 32px;
--font-size-3xl: 48px;            /* KPI values */

/* Spacing (8px grid) */
--spacing-xs: 8px;
--spacing-sm: 16px;
--spacing-md: 24px;
--spacing-lg: 32px;
--spacing-xl: 48px;
--spacing-2xl: 64px;

/* Font Weights */
--font-weight-normal: 400;
--font-weight-medium: 600;        /* For emphasis */
--font-weight-bold: 700;          /* KPIs, headings */
```

---

## 📊 Database Schema Design

### Core Tables

```sql
-- Batches (Master data)
CREATE TABLE batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_number VARCHAR(50) UNIQUE NOT NULL,
  product_code VARCHAR(50),
  planned_quantity INTEGER NOT NULL,
  produced_quantity INTEGER DEFAULT 0,
  rejected_quantity INTEGER DEFAULT 0,
  production_date DATE NOT NULL,
  status VARCHAR(20) CHECK (status IN ('in_progress', 'completed', 'scrapped')),
  risk_level VARCHAR(20) CHECK (risk_level IN ('normal', 'watch', 'high_risk')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_batches_date ON batches(production_date DESC);
CREATE INDEX idx_batches_status ON batches(status);
CREATE INDEX idx_batches_risk ON batches(risk_level);

-- Inspection Records
CREATE TABLE inspection_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id UUID REFERENCES batches(id) ON DELETE CASCADE,
  inspection_stage VARCHAR(50) NOT NULL, -- 'assembly', 'visual', 'integrity', 'final'
  inspector_name VARCHAR(100),
  inspected_quantity INTEGER NOT NULL,
  passed_quantity INTEGER NOT NULL,
  failed_quantity INTEGER NOT NULL,
  inspection_date TIMESTAMPTZ DEFAULT NOW(),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_inspection_batch ON inspection_records(batch_id);
CREATE INDEX idx_inspection_date ON inspection_records(inspection_date DESC);
CREATE INDEX idx_inspection_stage ON inspection_records(inspection_stage);

-- Defects (Rejection reasons)
CREATE TABLE defects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inspection_id UUID REFERENCES inspection_records(id) ON DELETE CASCADE,
  defect_type VARCHAR(100) NOT NULL, -- 'visual_defect', 'dimensional', 'functional', etc.
  defect_code VARCHAR(20),
  quantity INTEGER NOT NULL,
  severity VARCHAR(20) CHECK (severity IN ('minor', 'major', 'critical')),
  root_cause TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_defects_inspection ON defects(inspection_id);
CREATE INDEX idx_defects_type ON defects(defect_type);
CREATE INDEX idx_defects_severity ON defects(severity);

-- Suppliers
CREATE TABLE suppliers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_code VARCHAR(50) UNIQUE NOT NULL,
  supplier_name VARCHAR(200) NOT NULL,
  contact_email VARCHAR(100),
  contact_phone VARCHAR(20),
  rating DECIMAL(3,2) CHECK (rating >= 0 AND rating <= 5),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Supplier Batches (Many-to-Many)
CREATE TABLE batch_suppliers (
  batch_id UUID REFERENCES batches(id) ON DELETE CASCADE,
  supplier_id UUID REFERENCES suppliers(id) ON DELETE CASCADE,
  component_type VARCHAR(100),
  PRIMARY KEY (batch_id, supplier_id, component_type)
);

CREATE INDEX idx_batch_suppliers_batch ON batch_suppliers(batch_id);
CREATE INDEX idx_batch_suppliers_supplier ON batch_suppliers(supplier_id);

-- Upload History (Excel file metadata)
CREATE TABLE upload_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  filename VARCHAR(255) NOT NULL,
  file_type VARCHAR(50), -- 'assembly', 'visual', 'integrity', 'cumulative'
  file_size INTEGER,
  storage_path TEXT, -- Supabase Storage path
  upload_status VARCHAR(20) CHECK (upload_status IN ('pending', 'processing', 'completed', 'failed')),
  records_imported INTEGER DEFAULT 0,
  error_message TEXT,
  uploaded_at TIMESTAMPTZ DEFAULT NOW(),
  processed_at TIMESTAMPTZ
);

CREATE INDEX idx_upload_date ON upload_history(uploaded_at DESC);
CREATE INDEX idx_upload_status ON upload_history(upload_status);

-- AI Insights (Cached AI-generated summaries)
CREATE TABLE ai_insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  insight_type VARCHAR(50), -- 'health_summary', 'root_cause', 'prediction', 'recommendation'
  context_data JSONB, -- Input data for AI prompt
  insight_text TEXT NOT NULL,
  confidence_score DECIMAL(3,2),
  generated_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ, -- Cache expiration
  metadata JSONB
);

CREATE INDEX idx_insights_type ON ai_insights(insight_type);
CREATE INDEX idx_insights_date ON ai_insights(generated_at DESC);
CREATE INDEX idx_insights_expiry ON ai_insights(expires_at);
```

### Database Functions (Computed Metrics)

```sql
-- Calculate rejection rate for a batch
CREATE OR REPLACE FUNCTION calculate_rejection_rate(batch_uuid UUID)
RETURNS DECIMAL(5,2) AS $$
DECLARE
  produced INT;
  rejected INT;
BEGIN
  SELECT produced_quantity, rejected_quantity
  INTO produced, rejected
  FROM batches
  WHERE id = batch_uuid;
  
  IF produced = 0 THEN
    RETURN 0;
  END IF;
  
  RETURN ROUND((rejected::DECIMAL / produced::DECIMAL) * 100, 2);
END;
$$ LANGUAGE plpgsql;

-- Update batch risk level based on rejection rate
CREATE OR REPLACE FUNCTION update_batch_risk_level()
RETURNS TRIGGER AS $$
DECLARE
  rejection_rate DECIMAL(5,2);
BEGIN
  rejection_rate := calculate_rejection_rate(NEW.id);
  
  IF rejection_rate >= 15 THEN
    NEW.risk_level := 'high_risk';
  ELSIF rejection_rate >= 8 THEN
    NEW.risk_level := 'watch';
  ELSE
    NEW.risk_level := 'normal';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_batch_risk
BEFORE INSERT OR UPDATE OF produced_quantity, rejected_quantity
ON batches
FOR EACH ROW
EXECUTE FUNCTION update_batch_risk_level();

-- Materialized view for dashboard KPIs (performance optimization)
CREATE MATERIALIZED VIEW dashboard_kpis AS
SELECT
  DATE_TRUNC('day', production_date) AS date,
  COUNT(*) AS total_batches,
  SUM(produced_quantity) AS total_produced,
  SUM(rejected_quantity) AS total_rejected,
  ROUND(AVG(calculate_rejection_rate(id)), 2) AS avg_rejection_rate,
  COUNT(CASE WHEN risk_level = 'high_risk' THEN 1 END) AS high_risk_batches,
  COUNT(CASE WHEN status = 'scrapped' THEN 1 END) AS scrapped_batches
FROM batches
WHERE production_date >= CURRENT_DATE - INTERVAL '90 days'
GROUP BY DATE_TRUNC('day', production_date)
ORDER BY date DESC;

CREATE UNIQUE INDEX idx_dashboard_kpis_date ON dashboard_kpis(date);

-- Refresh function (call via API)
CREATE OR REPLACE FUNCTION refresh_dashboard_kpis()
RETURNS VOID AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY dashboard_kpis;
END;
$$ LANGUAGE plpgsql;
```

---

## 🎨 Component Architecture

### Directory Structure

```
src/
├── app/                                # Next.js App Router
│   ├── (dashboard)/                   # Dashboard layout group
│   │   ├── layout.tsx                 # Shared dashboard layout (sidebar, header)
│   │   ├── page.tsx                   # Dashboard home
│   │   ├── trends/page.tsx            # Rejection trends
│   │   ├── analysis/page.tsx          # Defect analysis
│   │   ├── batch-risk/page.tsx        # Batch risk monitoring
│   │   ├── supplier/page.tsx          # Supplier quality
│   │   └── reports/page.tsx           # Report generation
│   ├── settings/
│   │   ├── layout.tsx
│   │   └── upload/page.tsx            # Excel upload (client component)
│   ├── api/
│   │   ├── analytics/
│   │   │   ├── overview/route.ts      # Dashboard KPIs
│   │   │   ├── trends/route.ts        # Time-series data
│   │   │   ├── pareto/route.ts        # Defect Pareto
│   │   │   └── suppliers/route.ts     # Supplier rankings
│   │   ├── batches/
│   │   │   ├── route.ts               # List batches (with filters)
│   │   │   └── [id]/route.ts          # Batch details
│   │   ├── upload/
│   │   │   ├── route.ts               # File upload handler
│   │   │   └── validate/route.ts      # Schema validation
│   │   └── ai/
│   │       ├── summarize/route.ts     # Health summary
│   │       ├── root-cause/route.ts    # Root cause analysis
│   │       └── predict/route.ts       # Predictive alerts
│   ├── layout.tsx                     # Root layout
│   └── globals.css                    # Global styles + design tokens
├── components/
│   ├── ui/                            # shadcn/ui primitives
│   │   ├── button.tsx
│   │   ├── card.tsx
│   │   ├── badge.tsx
│   │   ├── table.tsx
│   │   └── ...
│   ├── dashboard/
│   │   ├── KPICard.tsx                # Reusable KPI display
│   │   ├── TrendChart.tsx             # Time-series chart wrapper
│   │   ├── ParetoChart.tsx            # Pareto chart
│   │   ├── RiskBadge.tsx              # Risk level indicator
│   │   └── AIInsightPanel.tsx         # AI summary display
│   ├── layout/
│   │   ├── DashboardSidebar.tsx       # Navigation sidebar
│   │   ├── DashboardHeader.tsx        # Page header
│   │   └── PageContainer.tsx          # Consistent page wrapper
│   └── upload/
│       ├── FileUploadZone.tsx         # Drag-drop upload
│       └── UploadStatusTable.tsx      # Upload history
├── lib/
│   ├── db/
│   │   ├── client.ts                  # Supabase client factory
│   │   ├── types.ts                   # Generated types from schema
│   │   └── repositories/
│   │       ├── batchRepository.ts     # Batch data access
│   │       ├── inspectionRepository.ts
│   │       ├── defectRepository.ts
│   │       └── supplierRepository.ts
│   ├── analytics/
│   │   ├── kpiEngine.ts               # KPI calculation logic
│   │   ├── riskClassifier.ts          # Batch risk logic
│   │   └── forecasting.ts             # Simple trend forecasting
│   ├── ai/
│   │   ├── gemini.ts                  # Gemini client wrapper
│   │   ├── prompts.ts                 # AI prompt templates
│   │   └── cache.ts                   # AI response caching
│   ├── upload/
│   │   ├── excelParser.ts             # Excel processing
│   │   ├── schemaDetector.ts          # Auto-detect file type
│   │   ├── validator.ts               # Data validation
│   │   └── transformer.ts             # Data normalization
│   ├── utils/
│   │   ├── formatters.ts              # Number/date formatting
│   │   ├── colors.ts                  # WCAG-compliant color utilities
│   │   └── accessibility.ts           # A11y helpers
│   └── hooks/
│       ├── useDashboardData.ts        # SWR wrapper for dashboard
│       ├── useTrends.ts               # Trends data hook
│       └── useFileUpload.ts           # Upload state management
└── types/
    ├── analytics.ts                   # Analytics types
    ├── batch.ts                       # Domain types
    └── api.ts                         # API response types
```

---

## 🎯 Page Specifications

### 1. Dashboard (Home) - `/`

**Business Question:** *What's the current rejection health?*

**Layout:**
```
┌─────────────────────────────────────────────┐
│  🏠 Dashboard                       [GM Name]│
├─────────────────────────────────────────────┤
│                                              │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐    │
│  │ Overall  │ │ Rejected │ │ Est. Cost│    │
│  │   8.2%   │ │  1,234   │ │ ₹4.5 Lac │    │
│  │ ──────── │ │ ──────── │ │ ──────── │    │
│  │ ↑ 1.2%   │ │ ↑ 156    │ │ ↑ ₹0.8L  │    │
│  └──────────┘ └──────────┘ └──────────┘    │
│                                              │
│  ┌───────────────────────────────────────┐  │
│  │ 🤖 AI Health Summary                  │  │
│  │                                       │  │
│  │ Rejection rate increased 1.2% this   │  │
│  │ week. Main driver: visual defects    │  │
│  │ in Batch BR-2401 (15.2% rejection).  │  │
│  │                                       │  │
│  │ ⚠️ 3 batches at high risk of        │  │
│  │ scrapping. Immediate review needed.  │  │
│  └───────────────────────────────────────┘  │
│                                              │
│  ┌───────────────────────────────────────┐  │
│  │ Rejection Trend (Last 30 Days)        │  │
│  │         📈                             │  │
│  │    [Line Chart: Produced vs Rejected] │  │
│  └───────────────────────────────────────┘  │
│                                              │
│  ┌───────────────────────────────────────┐  │
│  │ High-Risk Batches (3)         [View]  │  │
│  │ • BR-2401 - 15.2% rejection          │  │
│  │ • BR-2398 - 12.8% rejection          │  │
│  │ • BR-2405 - 11.5% rejection          │  │
│  └───────────────────────────────────────┘  │
└─────────────────────────────────────────────┘
```

**Components:**
- 3 KPI cards (rejection rate, rejected units, cost impact)
- AI-generated health summary panel
- Trend chart (30-day rolling)
- High-risk batch quick list

**API Endpoints:**
- `GET /api/analytics/overview` - KPIs + high-risk batches
- `GET /api/ai/summarize` - AI health summary
- `GET /api/analytics/trends?days=30` - Trend data

---

### 2. Rejection Trends - `/trends`

**Business Question:** *Are we improving or getting worse?*

**Layout:**
```
┌─────────────────────────────────────────────┐
│  📊 Rejection Trends                         │
├─────────────────────────────────────────────┤
│                                              │
│  Time Period: [Last 7 Days ▼]               │
│                                              │
│  ┌───────────────────────────────────────┐  │
│  │ Daily Rejection Rate                  │  │
│  │         📊                             │  │
│  │    [Bar Chart with trend line]        │  │
│  └───────────────────────────────────────┘  │
│                                              │
│  ┌──────────────┐ ┌──────────────┐         │
│  │ This Period  │ │ Last Period  │         │
│  │   8.2%       │ │   7.0%       │         │
│  │ ──────────── │ │ ──────────── │         │
│  │ ↑ 1.2% worse │ │ Baseline     │         │
│  └──────────────┘ └──────────────┘         │
│                                              │
│  ┌───────────────────────────────────────┐  │
│  │ Produced vs Rejected                  │  │
│  │         📈                             │  │
│  │    [Stacked area chart]               │  │
│  └───────────────────────────────────────┘  │
└─────────────────────────────────────────────┘
```

**Features:**
- Time period selector (7/14/30/90 days)
- Period-over-period comparison
- Dual charts (rejection rate + volume)

**API Endpoints:**
- `GET /api/analytics/trends?period=7d`

---

### 3. Defect Analysis - `/analysis`

**Business Question:** *What's causing the most rejections?*

**Layout:**
```
┌─────────────────────────────────────────────┐
│  🔍 Defect Analysis                          │
├─────────────────────────────────────────────┤
│                                              │
│  ┌───────────────────────────────────────┐  │
│  │ Top Defects (Pareto Chart)            │  │
│  │         📊                             │  │
│  │    [Bar + Line showing 80/20 rule]    │  │
│  └───────────────────────────────────────┘  │
│                                              │
│  ┌─────────────────────────────────────────┐│
│  │ Defect             Count    % of Total  ││
│  │ Visual Defects      456        38%      ││
│  │ Dimensional         234        19%      ││
│  │ Functional          189        16%      ││
│  │ Material            145        12%      ││
│  │ Other               180        15%      ││
│  └─────────────────────────────────────────┘│
│                                              │
│  ┌───────────────────────────────────────┐  │
│  │ 🤖 AI Root Cause Insight              │  │
│  │                                       │  │
│  │ Visual defects spiked 2 days ago.    │  │
│  │ Correlation detected with:            │  │
│  │ • Supplier S-401 material batch      │  │
│  │ • Assembly stage operator change     │  │
│  │                                       │  │
│  │ 💡 Recommendation: Inspect incoming  │  │
│  │ material quality from S-401          │  │
│  └───────────────────────────────────────┘  │
└─────────────────────────────────────────────┘
```

**Features:**
- Pareto chart (80/20 rule visualization)
- Defect type breakdown table
- AI root cause analysis

**API Endpoints:**
- `GET /api/analytics/pareto?period=30d`
- `GET /api/ai/root-cause?defect_type=visual`

---

### 4. Batch Risk - `/batch-risk`

**Business Question:** *Which batches need immediate attention?*

**Layout:**
```
┌─────────────────────────────────────────────┐
│  ⚠️ Batch Risk Monitor                       │
├─────────────────────────────────────────────┤
│                                              │
│  Risk Filter: [All ▼] [High Risk] [Watch]   │
│                                              │
│  ┌─────────────────────────────────────────┐│
│  │ Batch      Date    Rejection  Risk   🔍 ││
│  │ BR-2401   2/1/26     15.2%    🔴 HIGH   ││
│  │ BR-2398   1/30/26    12.8%    🔴 HIGH   ││
│  │ BR-2405   2/2/26     11.5%    🔴 HIGH   ││
│  │ BR-2399   1/31/26     9.2%    🟡 WATCH  ││
│  │ BR-2403   2/1/26      8.5%    🟡 WATCH  ││
│  │ ...                                      ││
│  └─────────────────────────────────────────┘│
│                                              │
│  Click batch ID to see details ───────────▶ │
└─────────────────────────────────────────────┘
```

**Features:**
- Risk-based filtering
- Color-coded risk badges
- Sortable table
- Click → batch detail modal

**API Endpoints:**
- `GET /api/batches?risk_level=high_risk`
- `GET /api/batches/{id}` - Batch details

---

### 5. Supplier Quality - `/supplier`

**Business Question:** *Which suppliers are problematic?*

**Layout:**
```
┌─────────────────────────────────────────────┐
│  🏭 Supplier Quality                         │
├─────────────────────────────────────────────┤
│                                              │
│  ┌─────────────────────────────────────────┐│
│  │ Supplier    Batches  Avg Rejection  ⭐  ││
│  │ S-401         12        14.2%      2.1  ││
│  │ S-203          8        11.5%      2.8  ││
│  │ S-115         15         8.9%      3.2  ││
│  │ S-302         22         4.2%      4.1  ││
│  │ ...                                      ││
│  └─────────────────────────────────────────┘│
│                                              │
│  ┌───────────────────────────────────────┐  │
│  │ Supplier Performance Trend            │  │
│  │         📊                             │  │
│  │    [Line chart: top 5 suppliers]      │  │
│  └───────────────────────────────────────┘  │
└─────────────────────────────────────────────┘
```

**Features:**
- Supplier ranking table
- Performance trend chart
- Star rating visualization

**API Endpoints:**
- `GET /api/analytics/suppliers?period=90d`

---

### 6. Reports - `/reports`

**Business Question:** *Generate reports for audits/reviews*

**Layout:**
```
┌─────────────────────────────────────────────┐
│  📄 Reports                                  │
├─────────────────────────────────────────────┤
│                                              │
│  Report Type: [Monthly Summary ▼]           │
│  Period: [Last Month ▼]                     │
│                                              │
│  [Generate Report]  [Download PDF]          │
│                                              │
│  ┌───────────────────────────────────────┐  │
│  │ Recent Reports                        │  │
│  │                                       │  │
│  │ • Monthly Summary - Jan 2026          │  │
│  │   Generated: 2/1/26  [Download]       │  │
│  │                                       │  │
│  │ • Defect Pareto - Q4 2025             │  │
│  │   Generated: 1/5/26  [Download]       │  │
│  │                                       │  │
│  │ • Batch Risk - Jan 2026               │  │
│  │   Generated: 1/31/26  [Download]      │  │
│  └───────────────────────────────────────┘  │
└─────────────────────────────────────────────┘
```

**Features:**
- Report type selector
- Period selector
- Generate & download
- Recent reports list

**API Endpoints:**
- `POST /api/reports/generate`
- `GET /api/reports/{id}/download`

---

### 7. Upload - `/settings/upload`

**Business Question:** *Upload new inspection data*

**Layout:**
```
┌─────────────────────────────────────────────┐
│  ⬆️ Upload Inspection Data                   │
├─────────────────────────────────────────────┤
│                                              │
│  ┌───────────────────────────────────────┐  │
│  │                                       │  │
│  │         📁 Drag & Drop Excel          │  │
│  │                                       │  │
│  │       or click to browse              │  │
│  │                                       │  │
│  └───────────────────────────────────────┘  │
│                                              │
│  Supported: .xlsx, .xls (Max 50MB)          │
│                                              │
│  ┌─────────────────────────────────────────┐│
│  │ Upload History                          ││
│  │                                         ││
│  │ File              Date      Status      ││
│  │ visual_feb.xlsx  2/3 10am  ✅ Success   ││
│  │ assembly.xlsx    2/2 2pm   ✅ Success   ││
│  │ integrity.xlsx   2/1 9am   ❌ Failed    ││
│  │                              [Retry]    ││
│  └─────────────────────────────────────────┘│
└─────────────────────────────────────────────┘
```

**Features:**
- Drag-drop file upload
- Real-time upload progress
- Upload history with status
- Error messages + retry

**API Endpoints:**
- `POST /api/upload` - File upload
- `GET /api/upload/history` - Upload history

---

## 🤖 AI Features (Gemini 2.5 Flash)

### 1. Health Summary (Dashboard)
**Prompt Template:**
```typescript
const HEALTH_SUMMARY_PROMPT = `
You are an AI assistant for a manufacturing quality manager.

Analyze this rejection data and provide a concise executive summary (3-4 sentences maximum):

Data:
- Overall rejection rate: ${data.rejectionRate}% (${data.trend} from last period)
- Total rejected units: ${data.rejectedCount}
- High-risk batches: ${data.highRiskBatches.length}
- Top defect: ${data.topDefect.type} (${data.topDefect.percentage}%)

Focus on:
1. Overall health (improving/worsening)
2. Main problem area
3. Urgent action items (if any)

Use simple language. No technical jargon.
`;
```

**Output Format:**
```typescript
interface HealthSummary {
  summary: string;
  sentiment: 'positive' | 'neutral' | 'concerning' | 'critical';
  actionItems: string[];
}
```

### 2. Root Cause Analysis (Defect Analysis Page)
**Prompt Template:**
```typescript
const ROOT_CAUSE_PROMPT = `
You are a manufacturing quality expert.

Analyze this defect pattern and suggest probable root causes:

Defect: ${defectType}
Recent trend: ${trendData}
Correlated factors:
- Suppliers: ${supplierData}
- Stages: ${stageData}
- Time patterns: ${timePatterns}

Provide:
1. Most likely root cause (1-2 sentences)
2. Supporting evidence from data
3. Recommended investigation steps (2-3 bullet points)

Be specific and actionable.
`;
```

### 3. Predictive Alerts (Batch Risk Page)
**Prompt Template:**
```typescript
const PREDICTION_PROMPT = `
You are a predictive analytics assistant.

Based on this batch's inspection history, predict risk level:

Batch: ${batchNumber}
Current rejection rate: ${currentRate}%
Inspection history: ${inspectionHistory}
Similar batch patterns: ${historicalComparison}

Predict:
1. Risk level (Normal/Watch/High Risk)
2. Confidence level (0-100%)
3. Reasoning (2-3 sentences)
4. Recommended actions

Use historical data patterns for prediction.
`;
```

### 4. Natural Language Query (Future Enhancement)
**Example:**
```typescript
// User types: "Why is batch BR-2401 failing?"
const NLQ_PROMPT = `
User question: ${userQuery}

Available data:
- Batch details: ${batchData}
- Defects: ${defectData}
- Supplier: ${supplierData}
- Stage-wise breakdown: ${stageData}

Provide a clear answer in 2-3 sentences.
If data is insufficient, say so.
`;
```

### AI Caching Strategy
```typescript
// Cache AI responses for 1 hour to save costs
interface AICache {
  key: string; // Hash of prompt + data
  response: string;
  generatedAt: Date;
  expiresAt: Date;
}

// Check cache before calling Gemini API
async function getAISummary(data: KPIData): Promise<string> {
  const cacheKey = hashData(data);
  const cached = await getCachedInsight(cacheKey);
  
  if (cached && cached.expiresAt > new Date()) {
    return cached.response;
  }
  
  const response = await gemini.generateContent(HEALTH_SUMMARY_PROMPT);
  await cacheInsight(cacheKey, response, 1 /* hour */);
  
  return response;
}
```

---

## 🎨 Design System Implementation

### Tailwind Configuration
```typescript
// tailwind.config.ts
import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // WCAG AAA compliant palette
        primary: {
          DEFAULT: '#0066CC', // 6.5:1 contrast
          dark: '#004C99',    // 9.74:1 contrast
          light: '#3385D6',
        },
        success: {
          DEFAULT: '#006600', // 7.58:1
          dark: '#004400',
        },
        warning: {
          DEFAULT: '#CC6600', // 4.52:1 (large text)
          dark: '#994D00',
        },
        danger: {
          DEFAULT: '#CC0000', // 5.9:1
          dark: '#990000',
        },
        text: {
          primary: '#000000',   // 21:1
          secondary: '#333333', // 12.63:1
          tertiary: '#666666',  // 5.74:1 (large text only)
        },
        bg: {
          primary: '#FFFFFF',
          secondary: '#F5F5F5',
          tertiary: '#E8E8E8',
        },
      },
      fontSize: {
        // Executive-friendly sizes
        xs: ['14px', { lineHeight: '20px' }],
        sm: ['16px', { lineHeight: '24px' }],
        base: ['18px', { lineHeight: '28px' }],  // Body text
        lg: ['20px', { lineHeight: '30px' }],
        xl: ['24px', { lineHeight: '32px' }],    // Headings
        '2xl': ['32px', { lineHeight: '40px' }],
        '3xl': ['48px', { lineHeight: '56px' }], // KPI values
      },
      spacing: {
        // 8px grid system
        xs: '8px',
        sm: '16px',
        md: '24px',
        lg: '32px',
        xl: '48px',
        '2xl': '64px',
      },
      fontWeight: {
        normal: '400',
        medium: '600',
        bold: '700',
      },
    },
  },
  plugins: [],
};

export default config;
```

### shadcn/ui Setup
```bash
# Install shadcn/ui CLI
npx shadcn-ui@latest init

# Add required components
npx shadcn-ui@latest add button
npx shadcn-ui@latest add card
npx shadcn-ui@latest add badge
npx shadcn-ui@latest add table
npx shadcn-ui@latest add select
npx shadcn-ui@latest add dialog
npx shadcn-ui@latest add toast
```

### Custom Components

#### KPICard.tsx
```typescript
interface KPICardProps {
  title: string;
  value: string | number;
  change?: {
    value: number;
    direction: 'up' | 'down';
    label: string;
  };
  icon?: React.ReactNode;
  variant?: 'default' | 'success' | 'warning' | 'danger';
}

export function KPICard({ title, value, change, icon, variant = 'default' }: KPICardProps) {
  const colorMap = {
    default: 'text-text-primary',
    success: 'text-success',
    warning: 'text-warning',
    danger: 'text-danger',
  };

  return (
    <Card className="p-lg">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-base font-normal text-text-secondary mb-xs">
            {title}
          </p>
          <p className={`text-3xl font-bold ${colorMap[variant]}`}>
            {value}
          </p>
          {change && (
            <div className="flex items-center gap-xs mt-sm">
              <span className={`text-sm ${change.direction === 'up' ? 'text-danger' : 'text-success'}`}>
                {change.direction === 'up' ? '↑' : '↓'} {Math.abs(change.value)}%
              </span>
              <span className="text-sm text-text-tertiary">{change.label}</span>
            </div>
          )}
        </div>
        {icon && <div className="text-primary text-2xl">{icon}</div>}
      </div>
    </Card>
  );
}
```

#### RiskBadge.tsx
```typescript
interface RiskBadgeProps {
  level: 'normal' | 'watch' | 'high_risk';
  showIcon?: boolean;
}

export function RiskBadge({ level, showIcon = true }: RiskBadgeProps) {
  const config = {
    normal: {
      label: 'Normal',
      color: 'bg-success text-white',
      icon: '✓',
    },
    watch: {
      label: 'Watch',
      color: 'bg-warning text-white',
      icon: '⚠',
    },
    high_risk: {
      label: 'High Risk',
      color: 'bg-danger text-white',
      icon: '⚠',
    },
  };

  const { label, color, icon } = config[level];

  return (
    <Badge className={`${color} text-base font-medium px-md py-xs`}>
      {showIcon && <span className="mr-xs">{icon}</span>}
      {label}
    </Badge>
  );
}
```

---

## 📡 API Contract Specification

### Authentication
```typescript
// All API routes use Supabase RLS (Row Level Security)
// No explicit authentication required for now (internal dashboard)
// Future: Add JWT-based auth with iron-session
```

### Response Format
```typescript
interface APIResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
  meta?: {
    timestamp: string;
    version: string;
  };
}
```

### Endpoints

#### 1. Analytics Overview
```typescript
GET /api/analytics/overview
Query Params: period?: '7d' | '30d' | '90d' (default: 30d)

Response:
{
  success: true,
  data: {
    rejectionRate: {
      current: 8.2,
      previous: 7.0,
      change: 1.2,
      trend: 'up'
    },
    rejectedUnits: {
      current: 1234,
      previous: 1078,
      change: 156
    },
    estimatedCost: {
      current: 450000,
      previous: 370000,
      change: 80000,
      currency: 'INR'
    },
    highRiskBatches: [
      {
        id: 'uuid',
        batchNumber: 'BR-2401',
        rejectionRate: 15.2,
        productionDate: '2026-02-01'
      }
    ]
  }
}
```

#### 2. Trends
```typescript
GET /api/analytics/trends
Query Params: 
  - period: '7d' | '14d' | '30d' | '90d'
  - granularity: 'daily' | 'weekly'

Response:
{
  success: true,
  data: {
    timeline: [
      {
        date: '2026-02-01',
        produced: 5000,
        rejected: 410,
        rejectionRate: 8.2
      },
      // ...
    ],
    summary: {
      avgRejectionRate: 8.2,
      totalProduced: 150000,
      totalRejected: 12300
    }
  }
}
```

#### 3. Pareto Analysis
```typescript
GET /api/analytics/pareto
Query Params: period?: '30d' | '90d'

Response:
{
  success: true,
  data: {
    defects: [
      {
        type: 'Visual Defects',
        count: 456,
        percentage: 38,
        cumulativePercentage: 38
      },
      {
        type: 'Dimensional',
        count: 234,
        percentage: 19,
        cumulativePercentage: 57
      }
      // ...
    ],
    total: 1204
  }
}
```

#### 4. Batch List
```typescript
GET /api/batches
Query Params:
  - risk_level?: 'normal' | 'watch' | 'high_risk'
  - status?: 'in_progress' | 'completed' | 'scrapped'
  - limit?: number (default: 50)
  - offset?: number (default: 0)
  - sort?: 'date_desc' | 'rejection_rate_desc'

Response:
{
  success: true,
  data: {
    batches: [
      {
        id: 'uuid',
        batchNumber: 'BR-2401',
        productCode: 'PROD-A1',
        producedQuantity: 5000,
        rejectedQuantity: 760,
        rejectionRate: 15.2,
        riskLevel: 'high_risk',
        productionDate: '2026-02-01',
        status: 'in_progress'
      }
    ],
    total: 245,
    limit: 50,
    offset: 0
  }
}
```

#### 5. Batch Details
```typescript
GET /api/batches/{id}

Response:
{
  success: true,
  data: {
    batch: {
      id: 'uuid',
      batchNumber: 'BR-2401',
      // ... batch fields
    },
    inspections: [
      {
        stage: 'assembly',
        inspectedQuantity: 5000,
        passedQuantity: 4800,
        failedQuantity: 200,
        inspectionDate: '2026-02-01T10:00:00Z'
      }
    ],
    defects: [
      {
        type: 'Visual Defects',
        code: 'VD-01',
        quantity: 120,
        severity: 'major'
      }
    ],
    suppliers: [
      {
        supplierCode: 'S-401',
        supplierName: 'ABC Components',
        componentType: 'Housing'
      }
    ]
  }
}
```

#### 6. Supplier Rankings
```typescript
GET /api/analytics/suppliers
Query Params: period?: '30d' | '90d'

Response:
{
  success: true,
  data: {
    suppliers: [
      {
        id: 'uuid',
        supplierCode: 'S-401',
        supplierName: 'ABC Components',
        batchCount: 12,
        avgRejectionRate: 14.2,
        rating: 2.1,
        trend: 'worsening'
      }
    ]
  }
}
```

#### 7. AI Summarize
```typescript
POST /api/ai/summarize
Body: {
  type: 'health' | 'root_cause' | 'prediction',
  data: Record<string, unknown>
}

Response:
{
  success: true,
  data: {
    summary: 'Rejection rate increased 1.2% this week...',
    sentiment: 'concerning',
    actionItems: [
      'Review Batch BR-2401 immediately',
      'Inspect supplier S-401 quality'
    ],
    confidence: 0.85
  }
}
```

#### 8. File Upload
```typescript
POST /api/upload
Content-Type: multipart/form-data
Body: FormData with 'file' field

Response:
{
  success: true,
  data: {
    uploadId: 'uuid',
    filename: 'visual_feb.xlsx',
    status: 'processing',
    estimatedTime: 30 // seconds
  }
}

// Poll for status:
GET /api/upload/{uploadId}/status
Response:
{
  success: true,
  data: {
    status: 'completed' | 'processing' | 'failed',
    recordsImported: 1234,
    errors: []
  }
}
```

---

## 🚀 Implementation Roadmap

### Phase 1: Foundation (Week 1-2)
**Goal:** Core infrastructure + basic dashboard

**Tasks:**
1. ✅ **Database Setup**
   - Create Supabase tables
   - Add triggers & functions
   - Create materialized views
   - Seed sample data

2. ✅ **Design System**
   - Install shadcn/ui
   - Configure Tailwind with WCAG colors
   - Create base components (KPICard, RiskBadge)
   - Setup typography system

3. ✅ **Layout System**
   - DashboardLayout with sidebar
   - Responsive navigation
   - Page containers

4. ✅ **Core API Routes**
   - `/api/analytics/overview`
   - `/api/analytics/trends`
   - `/api/batches`

5. ✅ **Dashboard Page**
   - KPI cards
   - Trend chart
   - High-risk batch list

**Deliverable:** Functional dashboard with real data (no AI yet)

---

### Phase 2: Analytics Pages (Week 3-4)
**Goal:** Complete all analytics views

**Tasks:**
1. ✅ **Trends Page**
   - Time-series charts
   - Period selectors
   - Comparison logic

2. ✅ **Defect Analysis Page**
   - Pareto chart
   - Defect breakdown table
   - Drill-down to batch details

3. ✅ **Batch Risk Page**
   - Filterable batch table
   - Risk classification logic
   - Batch detail modal

4. ✅ **Supplier Page**
   - Supplier ranking table
   - Performance trend chart

5. ✅ **Reports Page**
   - Report generator
   - PDF export (using jsPDF or similar)
   - Report history

**Deliverable:** Complete analytics dashboard (no AI, no upload yet)

---

### Phase 3: Data Ingestion (Week 5)
**Goal:** Excel upload pipeline

**Tasks:**
1. ✅ **Upload Page UI**
   - Drag-drop zone
   - Upload progress
   - Upload history table

2. ✅ **Excel Parser**
   - Schema detection (file type)
   - Data validation
   - Error handling

3. ✅ **API Routes**
   - `/api/upload` (POST)
   - `/api/upload/{id}/status` (GET)
   - `/api/upload/history` (GET)

4. ✅ **Supabase Storage**
   - Upload to storage bucket
   - File metadata tracking

5. ✅ **Data Transformation**
   - Normalize Excel → database schema
   - Batch creation
   - Inspection record insertion

**Deliverable:** End-to-end upload workflow

---

### Phase 4: AI Integration (Week 6-7)
**Goal:** AI-powered insights

**Tasks:**
1. ✅ **Gemini API Setup**
   - Create Gemini client wrapper
   - Implement prompt templates
   - Add caching layer

2. ✅ **Health Summary**
   - Implement `/api/ai/summarize`
   - Add to dashboard page
   - Cache for 1 hour

3. ✅ **Root Cause Analysis**
   - Implement `/api/ai/root-cause`
   - Add to defect analysis page
   - Contextual insights

4. ✅ **Predictive Alerts**
   - Implement `/api/ai/predict`
   - Add to batch risk page
   - Confidence scoring

5. ✅ **AI Insight Panel Component**
   - Reusable AI display component
   - Loading states
   - Error handling

**Deliverable:** AI-enhanced dashboard

---

### Phase 5: Polish & Optimization (Week 8)
**Goal:** Production readiness

**Tasks:**
1. ✅ **Performance**
   - Implement SWR caching
   - Optimize database queries
   - Add loading skeletons
   - Lazy load charts

2. ✅ **Accessibility**
   - WCAG AAA audit
   - Keyboard navigation
   - Screen reader testing
   - Focus management

3. ✅ **Error Handling**
   - Global error boundary
   - API error states
   - User-friendly messages

4. ✅ **Testing**
   - Write Playwright E2E tests
   - Test upload workflow
   - Test AI features

5. ✅ **Documentation**
   - User guide (for GM)
   - API documentation
   - Deployment guide

**Deliverable:** Production-ready dashboard

---

## 🧪 Testing Strategy

### Unit Tests (Vitest)
```typescript
// src/lib/analytics/kpiEngine.test.ts
describe('KPI Engine', () => {
  it('calculates rejection rate correctly', () => {
    const rate = calculateRejectionRate(1000, 82);
    expect(rate).toBe(8.2);
  });

  it('classifies risk level correctly', () => {
    expect(classifyRisk(15.2)).toBe('high_risk');
    expect(classifyRisk(9.5)).toBe('watch');
    expect(classifyRisk(5.0)).toBe('normal');
  });
});
```

### Integration Tests (Vitest)
```typescript
// src/app/api/analytics/overview/route.test.ts
describe('GET /api/analytics/overview', () => {
  it('returns dashboard KPIs', async () => {
    const response = await GET(new Request('http://localhost/api/analytics/overview'));
    const data = await response.json();
    
    expect(data.success).toBe(true);
    expect(data.data.rejectionRate).toBeDefined();
    expect(data.data.highRiskBatches).toBeInstanceOf(Array);
  });
});
```

### E2E Tests (Playwright)
```typescript
// tests/e2e/dashboard.spec.ts
import { test, expect } from '@playwright/test';

test('dashboard loads and displays KPIs', async ({ page }) => {
  await page.goto('/');
  
  // Check KPI cards
  await expect(page.getByText('Overall Rejection Rate')).toBeVisible();
  await expect(page.getByText('%')).toBeVisible();
  
  // Check AI summary
  await expect(page.getByText('AI Health Summary')).toBeVisible();
  
  // Check chart
  await expect(page.locator('[data-testid="trend-chart"]')).toBeVisible();
});

test('upload workflow completes successfully', async ({ page }) => {
  await page.goto('/settings/upload');
  
  // Upload file
  const fileInput = page.locator('input[type="file"]');
  await fileInput.setInputFiles('tests/fixtures/sample_inspection.xlsx');
  
  // Wait for upload
  await expect(page.getByText('Upload successful')).toBeVisible({ timeout: 30000 });
  
  // Verify in history
  await expect(page.getByText('sample_inspection.xlsx')).toBeVisible();
});

test('batch risk filtering works', async ({ page }) => {
  await page.goto('/batch-risk');
  
  // Filter by high risk
  await page.getByLabel('Risk Filter').selectOption('high_risk');
  
  // Verify filtered results
  const rows = page.locator('table tbody tr');
  await expect(rows).toHaveCount(3); // Assuming 3 high-risk batches
  
  // All should have high risk badge
  await expect(page.getByText('High Risk')).toHaveCount(3);
});
```

---

## 🔐 Security Considerations

### Supabase RLS Policies
```sql
-- Enable RLS on all tables
ALTER TABLE batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE inspection_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE defects ENABLE ROW LEVEL SECURITY;

-- For now: Allow all (internal dashboard)
-- Future: Add user authentication and role-based policies
CREATE POLICY "Allow all for service role"
ON batches
FOR ALL
TO service_role
USING (true);

-- Example future policy (when auth is added):
CREATE POLICY "Users can view their company's batches"
ON batches
FOR SELECT
TO authenticated
USING (company_id = auth.uid()::uuid);
```

### API Rate Limiting
```typescript
// Implement simple rate limiting for AI endpoints
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(10, '1 m'), // 10 requests per minute
});

export async function POST(request: Request) {
  const ip = request.headers.get('x-forwarded-for') || 'anonymous';
  const { success } = await ratelimit.limit(ip);
  
  if (!success) {
    return new Response('Rate limit exceeded', { status: 429 });
  }
  
  // ... AI processing
}
```

### Input Validation
```typescript
// Use Zod for all input validation
import { z } from 'zod';

const BatchFilterSchema = z.object({
  risk_level: z.enum(['normal', 'watch', 'high_risk']).optional(),
  status: z.enum(['in_progress', 'completed', 'scrapped']).optional(),
  limit: z.coerce.number().min(1).max(100).default(50),
  offset: z.coerce.number().min(0).default(0),
});

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const parsed = BatchFilterSchema.safeParse(Object.fromEntries(searchParams));
  
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: { code: 'INVALID_PARAMS', message: parsed.error.message } },
      { status: 400 }
    );
  }
  
  // ... use parsed.data
}
```

---

## 📦 Deployment Guide

### Environment Variables
```bash
# .env.production
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
GEMINI_API_KEY=your-gemini-api-key
SESSION_SECRET=your-32-char-secret
NEXT_PUBLIC_APP_URL=https://rais.yourcompany.com
NODE_ENV=production
```

### Vercel Deployment
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel --prod

# Environment variables are set via Vercel dashboard
```

### Performance Optimizations
```typescript
// next.config.ts
const config = {
  experimental: {
    serverComponentsExternalPackages: ['@google/generative-ai'],
  },
  images: {
    domains: ['lizwjtkymenscifgfcvh.supabase.co'],
  },
  // Enable Vercel Analytics
  analytics: {
    enabled: true,
  },
};
```

---

## 📚 Key Dependencies

```json
{
  "dependencies": {
    "@google/generative-ai": "^0.24.1",     // Gemini AI
    "@supabase/supabase-js": "^2.93.3",     // Database
    "@radix-ui/react-*": "latest",          // shadcn/ui primitives
    "next": "16.1.6",                        // Framework
    "react": "19.2.3",                       // UI
    "recharts": "^3.7.0",                    // Charts
    "swr": "^2.3.8",                         // Data fetching
    "zustand": "^5.0.10",                    // State management
    "zod": "^4.3.6",                         // Validation
    "xlsx": "^0.18.5",                       // Excel parsing
    "date-fns": "^4.1.0",                    // Date formatting
    "jspdf": "^2.5.2",                       // PDF export
    "jspdf-autotable": "^3.8.4"              // PDF tables
  }
}
```

---

## ✅ Success Criteria

### Functional
- [ ] GM can view rejection health in <10 seconds
- [ ] High-risk batches are clearly highlighted
- [ ] Excel upload works end-to-end (<1 min for 5000 rows)
- [ ] AI summaries are accurate and actionable
- [ ] All charts are responsive and accessible

### Performance
- [ ] Dashboard loads in <2 seconds (LCP)
- [ ] API responses <500ms (p95)
- [ ] AI summaries generate in <3 seconds
- [ ] Upload processing <30 seconds for typical file

### Accessibility
- [ ] WCAG AAA compliance (7:1 contrast ratio)
- [ ] Full keyboard navigation
- [ ] Screen reader compatible
- [ ] No accessibility errors in Lighthouse

### User Experience
- [ ] No raw data visible by default
- [ ] One business question per page
- [ ] Clear call-to-action buttons
- [ ] Error messages are user-friendly
- [ ] Mobile-responsive (tablet minimum)

---

## 🎯 Next Steps

1. **Review this plan** - Get stakeholder approval
2. **Setup Supabase** - Create tables and seed data
3. **Install shadcn/ui** - Setup design system
4. **Build Phase 1** - Dashboard foundation
5. **Iterate and test** - Get GM feedback early and often

---

**Document Version:** 1.0  
**Last Updated:** 2026-02-03  
**Author:** Hephaestus (AI Architect)  
**Status:** Ready for Implementation
