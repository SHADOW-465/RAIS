-- ============================================================================
-- RAIS v2.0 - Complete Schema (Normalized + AI)
-- Date: 2026-02-04
-- Purpose: Single source of truth for RAIS database schema
-- ============================================================================

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- 1. CLEANUP (Drop old objects to ensure clean state)
-- ============================================================================
DROP MATERIALIZED VIEW IF EXISTS supplier_performance CASCADE;
DROP MATERIALIZED VIEW IF EXISTS defect_pareto CASCADE;
DROP MATERIALIZED VIEW IF EXISTS dashboard_kpis CASCADE;
DROP MATERIALIZED VIEW IF EXISTS mv_daily_kpis CASCADE;
DROP MATERIALIZED VIEW IF EXISTS mv_stage_contribution CASCADE;
DROP MATERIALIZED VIEW IF EXISTS mv_defect_pareto CASCADE;

DROP TABLE IF EXISTS ai_insights CASCADE;
DROP TABLE IF EXISTS upload_history CASCADE;
DROP TABLE IF EXISTS batch_suppliers CASCADE;
DROP TABLE IF EXISTS suppliers CASCADE;
DROP TABLE IF EXISTS defects CASCADE;
DROP TABLE IF EXISTS inspection_records CASCADE;
DROP TABLE IF EXISTS batches CASCADE;
-- Drop new tables if they exist to ensuring clean recreation (optional but safer for "reset")
DROP TABLE IF EXISTS defect_occurrence CASCADE;
DROP TABLE IF EXISTS stage_inspection_summary CASCADE;
DROP TABLE IF EXISTS production_summary CASCADE;
DROP TABLE IF EXISTS defect_master CASCADE;
DROP TABLE IF EXISTS inspection_stage CASCADE;
DROP TABLE IF EXISTS file_upload_log CASCADE;
DROP TABLE IF EXISTS time_dimension CASCADE;
DROP TABLE IF EXISTS system_config CASCADE;

-- ============================================================================
-- 2. CONFIGURATION & DIMENSIONS
-- ============================================================================

-- Configuration Table
CREATE TABLE IF NOT EXISTS system_config (
  key VARCHAR(100) PRIMARY KEY,
  value JSONB NOT NULL,
  description TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE system_config IS 'System configuration - all thresholds and settings stored here';

INSERT INTO system_config (key, value, description) VALUES
  ('cost_per_rejected_unit', '{"value": 365, "currency": "INR"}', 'Cost per rejected unit for financial impact calculations'),
  ('risk_thresholds', '{"high_risk": 15, "watch": 8}', 'Rejection rate thresholds for risk classification (percentage)'),
  ('upload_max_rows', '{"value": 50000}', 'Maximum rows allowed per upload file'),
  ('kpi_default_period_days', '{"value": 30}', 'Default period for KPI calculations')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW();

-- Time Dimension
CREATE TABLE IF NOT EXISTS time_dimension (
  date DATE PRIMARY KEY,
  year INT GENERATED ALWAYS AS (EXTRACT(YEAR FROM date)::INT) STORED,
  month INT GENERATED ALWAYS AS (EXTRACT(MONTH FROM date)::INT) STORED,
  week INT GENERATED ALWAYS AS (EXTRACT(WEEK FROM date)::INT) STORED,
  day_of_week INT GENERATED ALWAYS AS (EXTRACT(DOW FROM date)::INT) STORED,
  quarter INT GENERATED ALWAYS AS (EXTRACT(QUARTER FROM date)::INT) STORED,
  month_name VARCHAR(20) GENERATED ALWAYS AS (TO_CHAR(date, 'Month')) STORED,
  is_weekend BOOLEAN GENERATED ALWAYS AS (EXTRACT(DOW FROM date) IN (0, 6)) STORED
);

-- Populate time dimension (2024-2026)
INSERT INTO time_dimension (date)
SELECT generate_series('2024-01-01'::date, '2026-12-31'::date, '1 day'::interval)::date
ON CONFLICT DO NOTHING;

-- ============================================================================
-- 3. CORE TABLES (Ingestion & Normalization)
-- ============================================================================

-- File Upload Log (Audit Trail)
CREATE TABLE IF NOT EXISTS file_upload_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- File identification
  filename VARCHAR(255) NOT NULL,
  original_filename VARCHAR(255) NOT NULL,
  file_hash VARCHAR(64) NOT NULL, -- SHA256
  file_size_bytes INT,
  storage_path TEXT,
  
  -- Classification
  detected_file_type VARCHAR(50) CHECK (detected_file_type IN ('shopfloor', 'assembly', 'visual', 'integrity', 'cumulative', 'production', 'unknown')),
  
  -- Status
  upload_status VARCHAR(20) DEFAULT 'pending' CHECK (upload_status IN ('pending', 'processing', 'completed', 'failed', 'partial')),
  records_total INT DEFAULT 0,
  records_valid INT DEFAULT 0,
  records_invalid INT DEFAULT 0,
  
  -- Metadata
  validation_errors JSONB DEFAULT '[]'::jsonb,
  error_message TEXT,
  ai_analysis JSONB DEFAULT '{}'::jsonb,
  mapping_config JSONB DEFAULT '{}'::jsonb,
  
  -- Audit
  uploaded_by VARCHAR(100),
  uploaded_at TIMESTAMPTZ DEFAULT NOW(),
  processing_started_at TIMESTAMPTZ,
  processing_completed_at TIMESTAMPTZ,
  
  CONSTRAINT uk_file_hash UNIQUE (file_hash)
);

CREATE INDEX idx_file_upload_date ON file_upload_log(uploaded_at DESC);
CREATE INDEX idx_file_upload_status ON file_upload_log(upload_status);

-- Inspection Stage (Master)
CREATE TABLE IF NOT EXISTS inspection_stage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(20) UNIQUE NOT NULL,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  sequence INT NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO inspection_stage (code, name, description, sequence) VALUES
  ('SHOPFLOOR', 'Shopfloor Rejection', 'Rejections detected during production on shopfloor', 1),
  ('ASSEMBLY', 'Assembly Inspection', 'Quality check during assembly process', 2),
  ('VISUAL', 'Visual Inspection', 'Visual quality inspection for defects', 3),
  ('INTEGRITY', 'Balloon & Valve Integrity', 'Integrity testing including balloon and valve tests', 4),
  ('FINAL', 'Final Inspection', 'Final quality check before dispatch', 5)
ON CONFLICT (code) DO NOTHING;

-- Defect Master (Normalized Types)
CREATE TABLE IF NOT EXISTS defect_master (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(50) UNIQUE NOT NULL,
  display_name VARCHAR(100) NOT NULL,
  category VARCHAR(50) CHECK (category IN ('visual', 'dimensional', 'functional', 'material', 'other')),
  severity VARCHAR(20) DEFAULT 'minor' CHECK (severity IN ('minor', 'major', 'critical')),
  description TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO defect_master (code, display_name, category, severity, description) VALUES
  ('COAG', 'Coagulation', 'material', 'major', 'Material coagulation defect'),
  ('RAISED_WIRE', 'Raised Wire', 'dimensional', 'major', 'Wire protrusion above surface'),
  ('SURFACE_DEFECT', 'Surface Defect', 'visual', 'minor', 'General surface irregularity'),
  ('OVERLAPING', 'Overlapping', 'dimensional', 'minor', 'Material overlap issue'),
  ('BLACK_MARK', 'Black Mark', 'visual', 'minor', 'Visible black marking on surface'),
  ('WEBBING', 'Webbing', 'material', 'major', 'Webbing formation in material'),
  ('MISSING_FORMERS', 'Missing Formers', 'functional', 'critical', 'Required formers are missing'),
  ('LEAKAGE', 'Leakage', 'functional', 'critical', 'Product leakage detected'),
  ('BUBBLE', 'Bubble', 'material', 'minor', 'Air bubble in material'),
  ('THIN_SPOD', 'Thin Spod', 'dimensional', 'minor', 'Thin spot in material'),
  ('DIRTY', 'Dirty', 'visual', 'minor', 'Contamination or dirt visible'),
  ('STICKY', 'Sticky', 'material', 'minor', 'Material stickiness issue'),
  ('WEAK', 'Weak', 'functional', 'major', 'Structural weakness detected'),
  ('WRONG_COLOR', 'Wrong Color', 'visual', 'minor', 'Color does not match specification'),
  ('OTHERS', 'Others', 'other', 'minor', 'Miscellaneous defects')
ON CONFLICT (code) DO UPDATE SET 
  display_name = EXCLUDED.display_name,
  category = EXCLUDED.category,
  severity = EXCLUDED.severity;

-- Production Summary (Daily Aggregates)
CREATE TABLE IF NOT EXISTS production_summary (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL REFERENCES time_dimension(date),
  product_code VARCHAR(50),
  produced_quantity INT NOT NULL CHECK (produced_quantity >= 0),
  dispatched_quantity INT DEFAULT 0 CHECK (dispatched_quantity >= 0),
  source_file_id UUID REFERENCES file_upload_log(id) ON DELETE SET NULL,
  source_row_numbers INT[],
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT uk_production_date_product UNIQUE (date, COALESCE(product_code, '__ALL__'))
);

CREATE INDEX idx_production_date ON production_summary(date DESC);

-- Stage Inspection Summary
CREATE TABLE IF NOT EXISTS stage_inspection_summary (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL REFERENCES time_dimension(date),
  stage_id UUID NOT NULL REFERENCES inspection_stage(id),
  received_quantity INT DEFAULT 0 CHECK (received_quantity >= 0),
  inspected_quantity INT NOT NULL CHECK (inspected_quantity >= 0),
  accepted_quantity INT DEFAULT 0 CHECK (accepted_quantity >= 0),
  hold_quantity INT DEFAULT 0 CHECK (hold_quantity >= 0),
  rejected_quantity INT NOT NULL CHECK (rejected_quantity >= 0),
  source_file_id UUID REFERENCES file_upload_log(id) ON DELETE SET NULL,
  source_row_number INT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT uk_stage_date UNIQUE (date, stage_id),
  CONSTRAINT chk_quantities CHECK (accepted_quantity + hold_quantity + rejected_quantity <= inspected_quantity)
);

CREATE INDEX idx_stage_summary_date ON stage_inspection_summary(date DESC);

-- Defect Occurrence (Detailed Records)
CREATE TABLE IF NOT EXISTS defect_occurrence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL REFERENCES time_dimension(date),
  stage_id UUID NOT NULL REFERENCES inspection_stage(id),
  defect_id UUID NOT NULL REFERENCES defect_master(id),
  quantity INT NOT NULL CHECK (quantity > 0),
  source_file_id UUID REFERENCES file_upload_log(id) ON DELETE SET NULL,
  source_row_number INT,
  source_column_name VARCHAR(100),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_defect_date ON defect_occurrence(date DESC);
CREATE INDEX idx_defect_type ON defect_occurrence(defect_id);

-- ============================================================================
-- 4. AI INSIGHTS
-- ============================================================================

CREATE TABLE IF NOT EXISTS ai_insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  insight_type VARCHAR(50) NOT NULL CHECK (insight_type IN ('health_summary', 'root_cause', 'prediction', 'recommendation', 'anomaly', 'file_analysis')),
  context_hash VARCHAR(64) NOT NULL,
  context_data JSONB NOT NULL,
  insight_text TEXT NOT NULL,
  sentiment VARCHAR(20) CHECK (sentiment IN ('positive', 'neutral', 'concerning', 'critical')),
  confidence_score DECIMAL(3,2) CHECK (confidence_score BETWEEN 0 AND 1),
  action_items TEXT[],
  metadata JSONB DEFAULT '{}'::jsonb,
  generated_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  access_count INT DEFAULT 0,
  last_accessed_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_ai_insights_lookup ON ai_insights(insight_type, context_hash);

-- ============================================================================
-- 5. MATERIALIZED VIEWS (KPI Engine)
-- ============================================================================

-- Daily KPIs
CREATE MATERIALIZED VIEW mv_daily_kpis AS
SELECT 
  ps.date,
  td.year,
  td.month,
  td.week,
  ps.produced_quantity,
  COALESCE(stage_rej.total_rejected, 0) AS total_rejected,
  CASE 
    WHEN ps.produced_quantity > 0 
    THEN ROUND((COALESCE(stage_rej.total_rejected, 0)::DECIMAL / ps.produced_quantity) * 100, 2)
    ELSE 0 
  END AS rejection_rate
FROM production_summary ps
JOIN time_dimension td ON ps.date = td.date
LEFT JOIN (
  SELECT date, SUM(rejected_quantity) AS total_rejected
  FROM stage_inspection_summary
  GROUP BY date
) stage_rej ON ps.date = stage_rej.date
ORDER BY ps.date DESC;

CREATE UNIQUE INDEX idx_mv_daily_kpis_date ON mv_daily_kpis(date);

-- Stage Contribution
CREATE MATERIALIZED VIEW mv_stage_contribution AS
WITH stage_totals AS (
  SELECT 
    sis.stage_id,
    ist.code AS stage_code,
    ist.name AS stage_name,
    ist.sequence,
    SUM(sis.inspected_quantity) AS total_inspected,
    SUM(sis.rejected_quantity) AS total_rejected
  FROM stage_inspection_summary sis
  JOIN inspection_stage ist ON sis.stage_id = ist.id
  WHERE sis.date >= CURRENT_DATE - INTERVAL '30 days'
  GROUP BY sis.stage_id, ist.code, ist.name, ist.sequence
),
grand_total AS (
  SELECT COALESCE(SUM(total_rejected), 0) AS grand_rejected FROM stage_totals
)
SELECT 
  st.stage_id,
  st.stage_code,
  st.stage_name,
  st.sequence,
  st.total_inspected,
  st.total_rejected,
  CASE 
    WHEN st.total_inspected > 0 
    THEN ROUND((st.total_rejected::DECIMAL / st.total_inspected) * 100, 2)
    ELSE 0 
  END AS rejection_rate,
  CASE 
    WHEN gt.grand_rejected > 0 
    THEN ROUND((st.total_rejected::DECIMAL / gt.grand_rejected) * 100, 2)
    ELSE 0 
  END AS contribution_pct
FROM stage_totals st
CROSS JOIN grand_total gt
ORDER BY st.total_rejected DESC;

CREATE UNIQUE INDEX idx_mv_stage_contribution ON mv_stage_contribution(stage_id);

-- Defect Pareto
CREATE MATERIALIZED VIEW mv_defect_pareto AS
WITH defect_totals AS (
  SELECT 
    do.defect_id,
    dm.code AS defect_code,
    dm.display_name,
    dm.category,
    dm.severity,
    SUM(do.quantity) AS total_quantity,
    COUNT(DISTINCT do.date) AS days_occurred
  FROM defect_occurrence do
  JOIN defect_master dm ON do.defect_id = dm.id
  WHERE do.date >= CURRENT_DATE - INTERVAL '30 days'
  GROUP BY do.defect_id, dm.code, dm.display_name, dm.category, dm.severity
),
grand_total AS (
  SELECT COALESCE(SUM(total_quantity), 0) AS grand_qty FROM defect_totals
),
ranked AS (
  SELECT 
    dt.*,
    gt.grand_qty,
    ROW_NUMBER() OVER (ORDER BY dt.total_quantity DESC) AS rank
  FROM defect_totals dt
  CROSS JOIN grand_total gt
)
SELECT 
  defect_id,
  defect_code,
  display_name,
  category,
  severity,
  total_quantity,
  days_occurred,
  CASE 
    WHEN grand_qty > 0 
    THEN ROUND((total_quantity::DECIMAL / grand_qty) * 100, 2)
    ELSE 0 
  END AS percentage,
  CASE 
    WHEN grand_qty > 0 
    THEN ROUND(SUM(total_quantity::DECIMAL / grand_qty * 100) OVER (ORDER BY total_quantity DESC), 2)
    ELSE 0 
  END AS cumulative_pct,
  rank
FROM ranked
ORDER BY rank;

CREATE UNIQUE INDEX idx_mv_defect_pareto ON mv_defect_pareto(defect_id);

-- ============================================================================
-- 6. FUNCTIONS & TRIGGERS
-- ============================================================================

-- Get Config Helper
CREATE OR REPLACE FUNCTION get_config(config_key VARCHAR)
RETURNS JSONB AS $$
  SELECT value FROM system_config WHERE key = config_key;
$$ LANGUAGE sql STABLE;

-- Refresh Views
CREATE OR REPLACE FUNCTION refresh_all_kpi_views()
RETURNS TABLE(view_name TEXT, refresh_time INTERVAL) AS $$
DECLARE
  start_time TIMESTAMPTZ;
  end_time TIMESTAMPTZ;
BEGIN
  -- Daily KPIs
  start_time := clock_timestamp();
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_daily_kpis;
  end_time := clock_timestamp();
  RETURN QUERY SELECT 'mv_daily_kpis'::TEXT, end_time - start_time;
  
  -- Stage Contribution
  start_time := clock_timestamp();
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_stage_contribution;
  end_time := clock_timestamp();
  RETURN QUERY SELECT 'mv_stage_contribution'::TEXT, end_time - start_time;
  
  -- Defect Pareto
  start_time := clock_timestamp();
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_defect_pareto;
  end_time := clock_timestamp();
  RETURN QUERY SELECT 'mv_defect_pareto'::TEXT, end_time - start_time;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 7. SECURITY (RLS)
-- ============================================================================

ALTER TABLE system_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE file_upload_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE inspection_stage ENABLE ROW LEVEL SECURITY;
ALTER TABLE defect_master ENABLE ROW LEVEL SECURITY;
ALTER TABLE production_summary ENABLE ROW LEVEL SECURITY;
ALTER TABLE stage_inspection_summary ENABLE ROW LEVEL SECURITY;
ALTER TABLE defect_occurrence ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_insights ENABLE ROW LEVEL SECURITY;

-- Allow service role full access
CREATE POLICY "service_role_full_access_config" ON system_config FOR ALL TO service_role USING (true);
CREATE POLICY "service_role_full_access_upload" ON file_upload_log FOR ALL TO service_role USING (true);
CREATE POLICY "service_role_full_access_stage" ON inspection_stage FOR ALL TO service_role USING (true);
CREATE POLICY "service_role_full_access_defect" ON defect_master FOR ALL TO service_role USING (true);
CREATE POLICY "service_role_full_access_production" ON production_summary FOR ALL TO service_role USING (true);
CREATE POLICY "service_role_full_access_stage_summary" ON stage_inspection_summary FOR ALL TO service_role USING (true);
CREATE POLICY "service_role_full_access_occurrence" ON defect_occurrence FOR ALL TO service_role USING (true);
CREATE POLICY "service_role_full_access_ai" ON ai_insights FOR ALL TO service_role USING (true);

COMMENT ON SCHEMA public IS 'RAIS v2.0 - Complete Auditable Schema';
