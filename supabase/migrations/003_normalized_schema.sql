-- ============================================================================
-- RAIS v2.0 - Normalized Schema for Auditable Manufacturing Statistics
-- Migration: 003_normalized_schema.sql
-- Date: 2026-02-04
-- Purpose: Complete schema rebuild following strict data governance principles
-- ============================================================================

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- DROP OLD TABLES (Clean Slate)
-- ============================================================================
DROP MATERIALIZED VIEW IF EXISTS supplier_performance CASCADE;
DROP MATERIALIZED VIEW IF EXISTS defect_pareto CASCADE;
DROP MATERIALIZED VIEW IF EXISTS dashboard_kpis CASCADE;

DROP TABLE IF EXISTS ai_insights CASCADE;
DROP TABLE IF EXISTS upload_history CASCADE;
DROP TABLE IF EXISTS batch_suppliers CASCADE;
DROP TABLE IF EXISTS suppliers CASCADE;
DROP TABLE IF EXISTS defects CASCADE;
DROP TABLE IF EXISTS inspection_records CASCADE;
DROP TABLE IF EXISTS batches CASCADE;

-- ============================================================================
-- CONFIGURATION TABLE (No more hardcoded values)
-- ============================================================================
CREATE TABLE IF NOT EXISTS system_config (
  key VARCHAR(100) PRIMARY KEY,
  value JSONB NOT NULL,
  description TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE system_config IS 'System configuration - all thresholds and settings stored here, not in code';

-- Insert default config
INSERT INTO system_config (key, value, description) VALUES
  ('cost_per_rejected_unit', '{"value": 365, "currency": "INR"}', 'Cost per rejected unit for financial impact calculations'),
  ('risk_thresholds', '{"high_risk": 15, "watch": 8}', 'Rejection rate thresholds for risk classification (percentage)'),
  ('upload_max_rows', '{"value": 50000}', 'Maximum rows allowed per upload file'),
  ('kpi_default_period_days', '{"value": 30}', 'Default period for KPI calculations')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW();

-- ============================================================================
-- TIME DIMENSION (For aggregations and reporting)
-- ============================================================================
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

COMMENT ON TABLE time_dimension IS 'Time dimension for efficient date-based aggregations';

-- Populate time dimension for 3 years (2024-2026)
INSERT INTO time_dimension (date)
SELECT generate_series('2024-01-01'::date, '2026-12-31'::date, '1 day'::interval)::date
ON CONFLICT DO NOTHING;

-- ============================================================================
-- FILE UPLOAD LOG (Audit Trail Root)
-- ============================================================================
CREATE TABLE IF NOT EXISTS file_upload_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- File identification
  filename VARCHAR(255) NOT NULL,
  original_filename VARCHAR(255) NOT NULL,
  file_hash VARCHAR(64) NOT NULL, -- SHA256 for deduplication
  file_size_bytes INT,
  storage_path TEXT,
  
  -- Classification
  detected_file_type VARCHAR(50) CHECK (detected_file_type IN ('shopfloor', 'assembly', 'visual', 'integrity', 'cumulative', 'production', 'unknown')),
  
  -- Processing status
  upload_status VARCHAR(20) DEFAULT 'pending' CHECK (upload_status IN ('pending', 'processing', 'completed', 'failed', 'partial')),
  records_total INT DEFAULT 0,
  records_valid INT DEFAULT 0,
  records_invalid INT DEFAULT 0,
  
  -- Error tracking
  validation_errors JSONB DEFAULT '[]'::jsonb,
  error_message TEXT,
  
  -- AI analysis (READ-ONLY reference - never used for computation)
  ai_analysis JSONB DEFAULT '{}'::jsonb,
  
  -- Column mapping that was applied
  mapping_config JSONB DEFAULT '{}'::jsonb,
  
  -- Audit fields
  uploaded_by VARCHAR(100),
  uploaded_at TIMESTAMPTZ DEFAULT NOW(),
  processing_started_at TIMESTAMPTZ,
  processing_completed_at TIMESTAMPTZ,
  
  -- Prevent duplicate uploads
  CONSTRAINT uk_file_hash UNIQUE (file_hash)
);

CREATE INDEX idx_file_upload_date ON file_upload_log(uploaded_at DESC);
CREATE INDEX idx_file_upload_status ON file_upload_log(upload_status);
CREATE INDEX idx_file_upload_type ON file_upload_log(detected_file_type);

COMMENT ON TABLE file_upload_log IS 'Tracks all uploaded files - root of audit trail';
COMMENT ON COLUMN file_upload_log.file_hash IS 'SHA256 hash for duplicate detection';
COMMENT ON COLUMN file_upload_log.ai_analysis IS 'AI interpretation stored for reference only - never affects calculations';

-- ============================================================================
-- INSPECTION STAGE (Master Data)
-- ============================================================================
CREATE TABLE IF NOT EXISTS inspection_stage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(20) UNIQUE NOT NULL,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  sequence INT NOT NULL, -- Order in production flow
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE inspection_stage IS 'Master data for inspection stages in production flow';

-- Seed inspection stages
INSERT INTO inspection_stage (code, name, description, sequence) VALUES
  ('SHOPFLOOR', 'Shopfloor Rejection', 'Rejections detected during production on shopfloor', 1),
  ('ASSEMBLY', 'Assembly Inspection', 'Quality check during assembly process', 2),
  ('VISUAL', 'Visual Inspection', 'Visual quality inspection for defects', 3),
  ('INTEGRITY', 'Balloon & Valve Integrity', 'Integrity testing including balloon and valve tests', 4),
  ('FINAL', 'Final Inspection', 'Final quality check before dispatch', 5)
ON CONFLICT (code) DO NOTHING;

-- ============================================================================
-- DEFECT MASTER (Normalized Defect Types)
-- ============================================================================
CREATE TABLE IF NOT EXISTS defect_master (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(50) UNIQUE NOT NULL, -- Normalized code (e.g., "COAG", "RAISED_WIRE")
  display_name VARCHAR(100) NOT NULL,
  category VARCHAR(50) CHECK (category IN ('visual', 'dimensional', 'functional', 'material', 'other')),
  severity VARCHAR(20) DEFAULT 'minor' CHECK (severity IN ('minor', 'major', 'critical')),
  description TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE defect_master IS 'Master list of normalized defect types';

-- Seed known defect types from Excel files
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

-- ============================================================================
-- PRODUCTION SUMMARY (Daily Production Aggregates)
-- ============================================================================
CREATE TABLE IF NOT EXISTS production_summary (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL REFERENCES time_dimension(date),
  product_code VARCHAR(50),
  
  -- Quantities
  produced_quantity INT NOT NULL CHECK (produced_quantity >= 0),
  dispatched_quantity INT DEFAULT 0 CHECK (dispatched_quantity >= 0),
  
  -- Audit trail
  source_file_id UUID REFERENCES file_upload_log(id) ON DELETE SET NULL,
  source_row_numbers INT[], -- Array of row numbers from source file
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Unique constraint: one record per date+product
  CONSTRAINT uk_production_date_product UNIQUE (date, COALESCE(product_code, '__ALL__'))
);

CREATE INDEX idx_production_date ON production_summary(date DESC);
CREATE INDEX idx_production_product ON production_summary(product_code);
CREATE INDEX idx_production_source ON production_summary(source_file_id);

COMMENT ON TABLE production_summary IS 'Daily production quantities aggregated from cumulative/production files';

-- ============================================================================
-- STAGE INSPECTION SUMMARY (Daily Stage-wise Inspection Data)
-- ============================================================================
CREATE TABLE IF NOT EXISTS stage_inspection_summary (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL REFERENCES time_dimension(date),
  stage_id UUID NOT NULL REFERENCES inspection_stage(id),
  
  -- Quantities
  received_quantity INT DEFAULT 0 CHECK (received_quantity >= 0),
  inspected_quantity INT NOT NULL CHECK (inspected_quantity >= 0),
  accepted_quantity INT DEFAULT 0 CHECK (accepted_quantity >= 0),
  hold_quantity INT DEFAULT 0 CHECK (hold_quantity >= 0),
  rejected_quantity INT NOT NULL CHECK (rejected_quantity >= 0),
  
  -- Audit trail
  source_file_id UUID REFERENCES file_upload_log(id) ON DELETE SET NULL,
  source_row_number INT,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Unique constraint: one record per date+stage
  CONSTRAINT uk_stage_date UNIQUE (date, stage_id),
  
  -- Validation: accepted + hold + rejected should not exceed inspected
  CONSTRAINT chk_quantities CHECK (accepted_quantity + hold_quantity + rejected_quantity <= inspected_quantity)
);

CREATE INDEX idx_stage_summary_date ON stage_inspection_summary(date DESC);
CREATE INDEX idx_stage_summary_stage ON stage_inspection_summary(stage_id);
CREATE INDEX idx_stage_summary_source ON stage_inspection_summary(source_file_id);

COMMENT ON TABLE stage_inspection_summary IS 'Daily inspection results per stage';

-- ============================================================================
-- DEFECT OCCURRENCE (Long-format Defect Data)
-- This is the pivoted data from wide-format Excel columns
-- ============================================================================
CREATE TABLE IF NOT EXISTS defect_occurrence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL REFERENCES time_dimension(date),
  stage_id UUID NOT NULL REFERENCES inspection_stage(id),
  defect_id UUID NOT NULL REFERENCES defect_master(id),
  
  -- Quantity
  quantity INT NOT NULL CHECK (quantity > 0),
  
  -- Audit trail (critical for traceability)
  source_file_id UUID REFERENCES file_upload_log(id) ON DELETE SET NULL,
  source_row_number INT,
  source_column_name VARCHAR(100), -- Original Excel column name (e.g., "COAG")
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_defect_date ON defect_occurrence(date DESC);
CREATE INDEX idx_defect_stage ON defect_occurrence(stage_id);
CREATE INDEX idx_defect_type ON defect_occurrence(defect_id);
CREATE INDEX idx_defect_source ON defect_occurrence(source_file_id);

COMMENT ON TABLE defect_occurrence IS 'Individual defect occurrences - pivoted from wide Excel format';
COMMENT ON COLUMN defect_occurrence.source_column_name IS 'Original column name from Excel for audit trail';

-- ============================================================================
-- COMPUTED VIEWS (Deterministic KPIs - Pure SQL)
-- ============================================================================

-- Daily KPI Summary
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

COMMENT ON MATERIALIZED VIEW mv_daily_kpis IS 'Pre-computed daily KPIs for dashboard performance';

-- Stage Contribution Analysis
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

COMMENT ON MATERIALIZED VIEW mv_stage_contribution IS 'Stage-wise rejection contribution (last 30 days)';

-- Defect Pareto Analysis
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

COMMENT ON MATERIALIZED VIEW mv_defect_pareto IS 'Pareto analysis of defects (last 30 days)';

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Get config value
CREATE OR REPLACE FUNCTION get_config(config_key VARCHAR)
RETURNS JSONB AS $$
  SELECT value FROM system_config WHERE key = config_key;
$$ LANGUAGE sql STABLE;

-- Get risk thresholds
CREATE OR REPLACE FUNCTION get_risk_level(rejection_rate DECIMAL)
RETURNS VARCHAR AS $$
DECLARE
  thresholds JSONB;
  high_threshold DECIMAL;
  watch_threshold DECIMAL;
BEGIN
  thresholds := get_config('risk_thresholds');
  high_threshold := (thresholds->>'high_risk')::DECIMAL;
  watch_threshold := (thresholds->>'watch')::DECIMAL;
  
  IF rejection_rate >= high_threshold THEN
    RETURN 'high_risk';
  ELSIF rejection_rate >= watch_threshold THEN
    RETURN 'watch';
  ELSE
    RETURN 'normal';
  END IF;
END;
$$ LANGUAGE plpgsql STABLE;

-- Refresh all materialized views
CREATE OR REPLACE FUNCTION refresh_all_kpi_views()
RETURNS TABLE(view_name TEXT, refresh_time INTERVAL) AS $$
DECLARE
  start_time TIMESTAMPTZ;
  end_time TIMESTAMPTZ;
BEGIN
  -- Refresh daily KPIs
  start_time := clock_timestamp();
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_daily_kpis;
  end_time := clock_timestamp();
  RETURN QUERY SELECT 'mv_daily_kpis'::TEXT, end_time - start_time;
  
  -- Refresh stage contribution
  start_time := clock_timestamp();
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_stage_contribution;
  end_time := clock_timestamp();
  RETURN QUERY SELECT 'mv_stage_contribution'::TEXT, end_time - start_time;
  
  -- Refresh defect pareto
  start_time := clock_timestamp();
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_defect_pareto;
  end_time := clock_timestamp();
  RETURN QUERY SELECT 'mv_defect_pareto'::TEXT, end_time - start_time;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE system_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE file_upload_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE inspection_stage ENABLE ROW LEVEL SECURITY;
ALTER TABLE defect_master ENABLE ROW LEVEL SECURITY;
ALTER TABLE production_summary ENABLE ROW LEVEL SECURITY;
ALTER TABLE stage_inspection_summary ENABLE ROW LEVEL SECURITY;
ALTER TABLE defect_occurrence ENABLE ROW LEVEL SECURITY;

-- Policies: Service role has full access
CREATE POLICY "service_role_full_access_config" ON system_config FOR ALL TO service_role USING (true);
CREATE POLICY "service_role_full_access_upload" ON file_upload_log FOR ALL TO service_role USING (true);
CREATE POLICY "service_role_full_access_stage" ON inspection_stage FOR ALL TO service_role USING (true);
CREATE POLICY "service_role_full_access_defect" ON defect_master FOR ALL TO service_role USING (true);
CREATE POLICY "service_role_full_access_production" ON production_summary FOR ALL TO service_role USING (true);
CREATE POLICY "service_role_full_access_stage_summary" ON stage_inspection_summary FOR ALL TO service_role USING (true);
CREATE POLICY "service_role_full_access_occurrence" ON defect_occurrence FOR ALL TO service_role USING (true);

-- ============================================================================
-- SCHEMA DOCUMENTATION
-- ============================================================================

COMMENT ON SCHEMA public IS 'RAIS v2.0 - Auditable Manufacturing Rejection Statistics System';
