# RAIS Complete System Redesign Plan v2.0

**Date:** 2026-02-04  
**Status:** ACTIVE - Greenfield Rebuild  
**Mandate:** Zero tolerance for partial delivery

---

## 1. CRITICAL ANALYSIS: What's Wrong With Current System

### 1.1 Core Problems Identified

| Problem | Evidence | Impact |
|---------|----------|--------|
| **Mock Data Fallbacks** | `kpiEngine.ts` lines 162-202, 292-326, 412-429 | Dashboard shows fake data when DB fails |
| **AI/Computation Boundary Violation** | Smart mapper directly affects KPI calculations | Non-auditable, non-deterministic results |
| **Wrong Data Model** | Current schema focused on batches, not rejection events | Cannot answer "which stage contributes most?" |
| **Missing Normalization Layer** | Direct Excel → DB transformation | Wide-format defects not properly pivoted |
| **No Audit Trail** | No traceability from KPI back to source row | Cannot explain where numbers come from |
| **Hardcoded Cost** | `COST_PER_REJECTED_UNIT = 365` in kpiEngine.ts | Not configurable, not from data |
| **No Data Validation Pipeline** | Validation is permissive, allows bad data | Garbage in, garbage out |

### 1.2 What Must Be Rebuilt

1. **Data Model** - Normalized schema that separates concerns
2. **Ingestion Pipeline** - AI for interpretation only, deterministic transformation
3. **KPI Engine** - Pure SQL-based, no fallbacks, no mock data
4. **Audit System** - Every number traceable to source file + row
5. **Validation** - Strict, fail-fast, with clear error messages
6. **API Layer** - Clean contracts, no silent failures
7. **UI** - Real data only, no fallbacks

---

## 2. NORMALIZED DATA MODEL (TARGET STATE)

### 2.1 New Schema (Migration 003)

```sql
-- ============================================================================
-- RAIS v2.0 - Normalized Schema for Auditable Manufacturing Statistics
-- ============================================================================

-- Configuration table (no more hardcoded values)
CREATE TABLE IF NOT EXISTS system_config (
  key VARCHAR(100) PRIMARY KEY,
  value JSONB NOT NULL,
  description TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default config
INSERT INTO system_config (key, value, description) VALUES
  ('cost_per_rejected_unit', '{"value": 365, "currency": "INR"}', 'Cost per rejected unit for financial calculations'),
  ('risk_thresholds', '{"high": 15, "watch": 8}', 'Rejection rate thresholds for risk classification'),
  ('upload_max_rows', '{"value": 50000}', 'Maximum rows per upload file')
ON CONFLICT (key) DO NOTHING;

-- TIME DIMENSION (for aggregations)
CREATE TABLE IF NOT EXISTS time_dimension (
  date DATE PRIMARY KEY,
  year INT GENERATED ALWAYS AS (EXTRACT(YEAR FROM date)) STORED,
  month INT GENERATED ALWAYS AS (EXTRACT(MONTH FROM date)) STORED,
  week INT GENERATED ALWAYS AS (EXTRACT(WEEK FROM date)) STORED,
  day_of_week INT GENERATED ALWAYS AS (EXTRACT(DOW FROM date)) STORED,
  quarter INT GENERATED ALWAYS AS (EXTRACT(QUARTER FROM date)) STORED
);

-- Populate time dimension for 2 years
INSERT INTO time_dimension (date)
SELECT generate_series('2024-01-01'::date, '2026-12-31'::date, '1 day'::interval)::date
ON CONFLICT DO NOTHING;

-- FILE UPLOAD LOG (audit trail root)
CREATE TABLE IF NOT EXISTS file_upload_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  filename VARCHAR(255) NOT NULL,
  original_filename VARCHAR(255) NOT NULL,
  file_hash VARCHAR(64) NOT NULL, -- SHA256 for dedup
  file_size_bytes INT,
  detected_file_type VARCHAR(50), -- shopfloor, assembly, visual, integrity, cumulative
  upload_status VARCHAR(20) DEFAULT 'pending' CHECK (upload_status IN ('pending', 'processing', 'completed', 'failed', 'partial')),
  records_total INT DEFAULT 0,
  records_valid INT DEFAULT 0,
  records_invalid INT DEFAULT 0,
  validation_errors JSONB DEFAULT '[]',
  ai_analysis JSONB, -- AI interpretation stored here (read-only reference)
  mapping_config JSONB, -- Column mapping that was applied
  storage_path TEXT,
  uploaded_by VARCHAR(100),
  uploaded_at TIMESTAMPTZ DEFAULT NOW(),
  processing_started_at TIMESTAMPTZ,
  processing_completed_at TIMESTAMPTZ,
  UNIQUE(file_hash) -- Prevent duplicate uploads
);

CREATE INDEX idx_file_upload_date ON file_upload_log(uploaded_at DESC);
CREATE INDEX idx_file_upload_status ON file_upload_log(upload_status);
CREATE INDEX idx_file_upload_hash ON file_upload_log(file_hash);

-- INSPECTION STAGE (master data)
CREATE TABLE IF NOT EXISTS inspection_stage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(20) UNIQUE NOT NULL,
  name VARCHAR(100) NOT NULL,
  sequence INT NOT NULL, -- Order in production flow
  is_active BOOLEAN DEFAULT TRUE
);

-- Seed inspection stages
INSERT INTO inspection_stage (code, name, sequence) VALUES
  ('SHOPFLOOR', 'Shopfloor Rejection', 1),
  ('ASSEMBLY', 'Assembly Inspection', 2),
  ('VISUAL', 'Visual Inspection', 3),
  ('INTEGRITY', 'Balloon & Valve Integrity', 4),
  ('FINAL', 'Final Inspection', 5)
ON CONFLICT (code) DO NOTHING;

-- PRODUCTION SUMMARY (daily aggregates from cumulative/production files)
CREATE TABLE IF NOT EXISTS production_summary (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL REFERENCES time_dimension(date),
  product_code VARCHAR(50),
  produced_quantity INT NOT NULL CHECK (produced_quantity >= 0),
  dispatched_quantity INT DEFAULT 0,
  source_file_id UUID REFERENCES file_upload_log(id) ON DELETE SET NULL,
  source_row_numbers INT[], -- Array of row numbers from source
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(date, COALESCE(product_code, 'ALL'))
);

CREATE INDEX idx_production_date ON production_summary(date DESC);
CREATE INDEX idx_production_product ON production_summary(product_code);

-- STAGE INSPECTION SUMMARY (daily stage-wise data)
CREATE TABLE IF NOT EXISTS stage_inspection_summary (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL REFERENCES time_dimension(date),
  stage_id UUID NOT NULL REFERENCES inspection_stage(id),
  received_quantity INT DEFAULT 0,
  inspected_quantity INT NOT NULL CHECK (inspected_quantity >= 0),
  accepted_quantity INT DEFAULT 0,
  hold_quantity INT DEFAULT 0,
  rejected_quantity INT NOT NULL CHECK (rejected_quantity >= 0),
  source_file_id UUID REFERENCES file_upload_log(id) ON DELETE SET NULL,
  source_row_number INT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(date, stage_id)
);

CREATE INDEX idx_stage_summary_date ON stage_inspection_summary(date DESC);
CREATE INDEX idx_stage_summary_stage ON stage_inspection_summary(stage_id);

-- DEFECT MASTER (normalized defect types)
CREATE TABLE IF NOT EXISTS defect_master (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(50) UNIQUE NOT NULL, -- Normalized code (e.g., "COAG", "RAISED_WIRE")
  display_name VARCHAR(100) NOT NULL,
  category VARCHAR(50) CHECK (category IN ('visual', 'dimensional', 'functional', 'material', 'other')),
  severity VARCHAR(20) DEFAULT 'minor' CHECK (severity IN ('minor', 'major', 'critical')),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed known defect types from Excel files
INSERT INTO defect_master (code, display_name, category, severity) VALUES
  ('COAG', 'Coagulation', 'material', 'major'),
  ('RAISED_WIRE', 'Raised Wire', 'dimensional', 'major'),
  ('SURFACE_DEFECT', 'Surface Defect', 'visual', 'minor'),
  ('OVERLAPING', 'Overlapping', 'dimensional', 'minor'),
  ('BLACK_MARK', 'Black Mark', 'visual', 'minor'),
  ('WEBBING', 'Webbing', 'material', 'major'),
  ('MISSING_FORMERS', 'Missing Formers', 'functional', 'critical'),
  ('LEAKAGE', 'Leakage', 'functional', 'critical'),
  ('BUBBLE', 'Bubble', 'material', 'minor'),
  ('THIN_SPOD', 'Thin Spod', 'dimensional', 'minor'),
  ('DIRTY', 'Dirty', 'visual', 'minor'),
  ('STICKY', 'Sticky', 'material', 'minor'),
  ('WEAK', 'Weak', 'functional', 'major'),
  ('WRONG_COLOR', 'Wrong Color', 'visual', 'minor'),
  ('OTHERS', 'Others', 'other', 'minor')
ON CONFLICT (code) DO NOTHING;

-- DEFECT OCCURRENCE (long-format defect data - pivoted from wide Excel columns)
CREATE TABLE IF NOT EXISTS defect_occurrence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL REFERENCES time_dimension(date),
  stage_id UUID NOT NULL REFERENCES inspection_stage(id),
  defect_id UUID NOT NULL REFERENCES defect_master(id),
  quantity INT NOT NULL CHECK (quantity > 0),
  source_file_id UUID REFERENCES file_upload_log(id) ON DELETE SET NULL,
  source_row_number INT,
  source_column_name VARCHAR(100), -- Original Excel column name
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_defect_occurrence_date ON defect_occurrence(date DESC);
CREATE INDEX idx_defect_occurrence_stage ON defect_occurrence(stage_id);
CREATE INDEX idx_defect_occurrence_defect ON defect_occurrence(defect_id);
CREATE INDEX idx_defect_occurrence_source ON defect_occurrence(source_file_id);

-- ============================================================================
-- COMPUTED VIEWS (Deterministic KPIs)
-- ============================================================================

-- Daily KPI Summary (materialized for performance)
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_daily_kpis AS
SELECT 
  ps.date,
  ps.produced_quantity,
  COALESCE(SUM(sis.rejected_quantity), 0) AS total_rejected,
  CASE 
    WHEN ps.produced_quantity > 0 
    THEN ROUND((COALESCE(SUM(sis.rejected_quantity), 0)::DECIMAL / ps.produced_quantity) * 100, 2)
    ELSE 0 
  END AS rejection_rate
FROM production_summary ps
LEFT JOIN stage_inspection_summary sis ON ps.date = sis.date
GROUP BY ps.date, ps.produced_quantity
ORDER BY ps.date DESC;

CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_daily_kpis_date ON mv_daily_kpis(date);

-- Stage Contribution (materialized)
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_stage_contribution AS
WITH stage_totals AS (
  SELECT 
    sis.stage_id,
    ist.code AS stage_code,
    ist.name AS stage_name,
    SUM(sis.inspected_quantity) AS total_inspected,
    SUM(sis.rejected_quantity) AS total_rejected
  FROM stage_inspection_summary sis
  JOIN inspection_stage ist ON sis.stage_id = ist.id
  WHERE sis.date >= CURRENT_DATE - INTERVAL '30 days'
  GROUP BY sis.stage_id, ist.code, ist.name
),
grand_total AS (
  SELECT SUM(total_rejected) AS grand_total FROM stage_totals
)
SELECT 
  st.stage_id,
  st.stage_code,
  st.stage_name,
  st.total_inspected,
  st.total_rejected,
  CASE 
    WHEN st.total_inspected > 0 
    THEN ROUND((st.total_rejected::DECIMAL / st.total_inspected) * 100, 2)
    ELSE 0 
  END AS rejection_rate,
  CASE 
    WHEN gt.grand_total > 0 
    THEN ROUND((st.total_rejected::DECIMAL / gt.grand_total) * 100, 2)
    ELSE 0 
  END AS contribution_pct
FROM stage_totals st
CROSS JOIN grand_total gt
ORDER BY st.total_rejected DESC;

CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_stage_contribution ON mv_stage_contribution(stage_id);

-- Defect Pareto (materialized)
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_defect_pareto AS
WITH defect_totals AS (
  SELECT 
    do.defect_id,
    dm.code AS defect_code,
    dm.display_name,
    dm.category,
    dm.severity,
    SUM(do.quantity) AS total_quantity
  FROM defect_occurrence do
  JOIN defect_master dm ON do.defect_id = dm.id
  WHERE do.date >= CURRENT_DATE - INTERVAL '30 days'
  GROUP BY do.defect_id, dm.code, dm.display_name, dm.category, dm.severity
),
ranked AS (
  SELECT 
    *,
    SUM(total_quantity) OVER () AS grand_total,
    ROW_NUMBER() OVER (ORDER BY total_quantity DESC) AS rank
  FROM defect_totals
)
SELECT 
  defect_id,
  defect_code,
  display_name,
  category,
  severity,
  total_quantity,
  ROUND((total_quantity::DECIMAL / grand_total) * 100, 2) AS percentage,
  ROUND(SUM(total_quantity::DECIMAL / grand_total * 100) OVER (ORDER BY total_quantity DESC), 2) AS cumulative_pct,
  rank
FROM ranked
ORDER BY rank;

CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_defect_pareto ON mv_defect_pareto(defect_id);

-- Refresh function
CREATE OR REPLACE FUNCTION refresh_all_kpi_views()
RETURNS VOID AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_daily_kpis;
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_stage_contribution;
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_defect_pareto;
END;
$$ LANGUAGE plpgsql;
```

---

## 3. AI USAGE BOUNDARY (STRICT)

### 3.1 AI IS ALLOWED TO:

| Capability | Implementation |
|------------|----------------|
| Classify file intent | Store in `file_upload_log.ai_analysis` |
| Infer inspection stage | Suggest, user confirms |
| Identify column meanings | Map column names to schema fields |
| Suggest mappings | Confidence scores, user reviews |
| Detect ambiguity | Flag for human review |
| Generate summaries | Read-only from computed KPIs |

### 3.2 AI IS NOT ALLOWED TO:

| Forbidden | Enforcement |
|-----------|-------------|
| Compute KPIs | All KPIs from SQL views |
| Modify values | Input validation rejects, never "cleans" |
| Infer missing numbers | NULL or reject, never invent |
| Skip validation | Hard fail on invalid data |
| Be source of truth | AI output is advisory metadata only |

---

## 4. ATOMIC TASK BREAKDOWN

### Phase 1: Database Reset (PRIORITY)

| ID | Task | Purpose | Test Gate |
|----|------|---------|-----------|
| 1.1 | Create migration 003 | New normalized schema | Migration runs |
| 1.2 | Drop old tables | Clean slate | Old tables gone |
| 1.3 | Verify schema | Check all tables exist | SELECT from all tables |
| 1.4 | Seed master data | Stages, defects | 5 stages, 15 defects exist |

### Phase 2: Pure Excel Parser (No AI)

| ID | Task | Purpose | Test Gate |
|----|------|---------|-----------|
| 2.1 | Create `excelReader.ts` | Read Excel to raw arrays | Unit test passes |
| 2.2 | Create `headerDetector.ts` | Find header row | Detects row 0-10 |
| 2.3 | Create `fileHasher.ts` | SHA256 for dedup | Hash matches expected |
| 2.4 | Unit tests | Test all parsers | 100% pass |

### Phase 3: AI Analyzer (Interpretation Only)

| ID | Task | Purpose | Test Gate |
|----|------|---------|-----------|
| 3.1 | Create `fileClassifier.ts` | Detect file type | Returns type + confidence |
| 3.2 | Create `columnMapper.ts` | Map columns to schema | Returns mapping suggestions |
| 3.3 | Store AI result | Save to `ai_analysis` JSONB | Stored correctly |
| 3.4 | Unit tests | Test AI wrapper | Mock tests pass |

### Phase 4: Validation Layer (Strict)

| ID | Task | Purpose | Test Gate |
|----|------|---------|-----------|
| 4.1 | Create `schemaValidator.ts` | Validate against schema | Rejects bad data |
| 4.2 | Create `rowValidator.ts` | Validate individual rows | Error messages clear |
| 4.3 | Validation errors | Collect all errors | Array of errors returned |
| 4.4 | Unit tests | Test validation | Bad data rejected |

### Phase 5: Transformer (Deterministic)

| ID | Task | Purpose | Test Gate |
|----|------|---------|-----------|
| 5.1 | Create `wideToLong.ts` | Pivot defect columns | Correct row count |
| 5.2 | Create `normalizer.ts` | Normalize values | Consistent formats |
| 5.3 | Create `dbInserter.ts` | Insert with source tracking | Records have file_id |
| 5.4 | Integration test | Full transform pipeline | Data in DB correct |

### Phase 6: KPI Engine (Pure SQL)

| ID | Task | Purpose | Test Gate |
|----|------|---------|-----------|
| 6.1 | Create `kpiQueries.ts` | SQL queries for KPIs | Correct results |
| 6.2 | Refresh views | Trigger view refresh | Views updated |
| 6.3 | NO FALLBACKS | Fail if no data | Returns error, not mock |
| 6.4 | Unit tests | Test all calculations | Math verified |

### Phase 7: API Layer

| ID | Task | Purpose | Test Gate |
|----|------|---------|-----------|
| 7.1 | Upload API | `/api/upload` | Returns upload_id |
| 7.2 | Overview API | `/api/analytics/overview` | Returns KPIs or error |
| 7.3 | Trends API | `/api/analytics/trends` | Returns array |
| 7.4 | Pareto API | `/api/analytics/pareto` | Returns defect list |
| 7.5 | Stage API | `/api/analytics/stages` | Returns stage breakdown |
| 7.6 | Integration tests | Test all endpoints | All pass |

### Phase 8: Frontend (Real Data Only)

| ID | Task | Purpose | Test Gate |
|----|------|---------|-----------|
| 8.1 | Dashboard | Show KPIs or empty state | No mock data |
| 8.2 | Trends page | Chart or empty state | No mock data |
| 8.3 | Analysis page | Pareto or empty state | No mock data |
| 8.4 | Stage page | Breakdown or empty state | No mock data |
| 8.5 | Upload page | Full flow | Files process |
| 8.6 | E2E tests | Test user flows | All pass |

---

## 5. EXECUTION ORDER

```
TODAY:
1. Create migration 003 (new schema)
2. Apply migration
3. Implement pure Excel parser
4. Implement validation layer

TOMORROW:
5. Implement wide-to-long transformer
6. Implement DB inserter with audit trail
7. Create KPI SQL views
8. Test with real Excel files

DAY 3:
9. Rebuild API layer (no fallbacks)
10. Rebuild frontend (no mock data)
11. Integration testing
12. E2E testing

DAY 4:
13. AI analyzer (interpretation only)
14. Final verification
15. Documentation
```

---

## 6. SUCCESS CRITERIA (MANDATORY)

Before declaring COMPLETE:

- [ ] `npm run build` exits 0
- [ ] All tests pass
- [ ] No mock data in codebase
- [ ] Every KPI traceable to source file + row
- [ ] Upload → Process → View flow works with real Excel
- [ ] All 5 business questions answerable:
  1. Is rejection improving or worsening? ✓
  2. Which stages contribute most? ✓
  3. Which defects drive losses? ✓
  4. Which batches are at risk? ✓
  5. Is data trustworthy? ✓

---

## 7. IMMEDIATE FIRST STEP

Create the new migration file and apply it.
