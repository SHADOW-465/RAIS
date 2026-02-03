-- ============================================================================
-- RAIS Dashboard - Complete Database Schema
-- Migration: 002_complete_schema.sql
-- Created: 2026-02-03
-- Description: Full schema for manufacturing rejection intelligence system
-- ============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- CORE TABLES
-- ============================================================================

-- Batches (Master production data)
CREATE TABLE IF NOT EXISTS batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_number VARCHAR(50) UNIQUE NOT NULL,
  product_code VARCHAR(50),
  product_name VARCHAR(200),
  planned_quantity INTEGER NOT NULL CHECK (planned_quantity > 0),
  produced_quantity INTEGER DEFAULT 0 CHECK (produced_quantity >= 0),
  rejected_quantity INTEGER DEFAULT 0 CHECK (rejected_quantity >= 0),
  production_date DATE NOT NULL,
  completion_date DATE,
  status VARCHAR(20) DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'completed', 'scrapped')),
  risk_level VARCHAR(20) DEFAULT 'normal' CHECK (risk_level IN ('normal', 'watch', 'high_risk')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE batches IS 'Master production batch records';
COMMENT ON COLUMN batches.risk_level IS 'Auto-calculated based on rejection rate';

-- Indexes for batches
CREATE INDEX idx_batches_date ON batches(production_date DESC);
CREATE INDEX idx_batches_status ON batches(status);
CREATE INDEX idx_batches_risk ON batches(risk_level);
CREATE INDEX idx_batches_product ON batches(product_code);
CREATE INDEX idx_batches_created ON batches(created_at DESC);

-- ============================================================================

-- Inspection Records (Quality checks at each stage)
CREATE TABLE IF NOT EXISTS inspection_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id UUID NOT NULL REFERENCES batches(id) ON DELETE CASCADE,
  inspection_stage VARCHAR(50) NOT NULL CHECK (inspection_stage IN ('assembly', 'visual', 'integrity', 'final', 'packaging')),
  inspector_name VARCHAR(100),
  inspector_id VARCHAR(50),
  inspected_quantity INTEGER NOT NULL CHECK (inspected_quantity > 0),
  passed_quantity INTEGER NOT NULL CHECK (passed_quantity >= 0),
  failed_quantity INTEGER NOT NULL CHECK (failed_quantity >= 0),
  inspection_date TIMESTAMPTZ DEFAULT NOW(),
  inspection_duration_minutes INTEGER,
  equipment_id VARCHAR(50),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraint: passed + failed = inspected
  CONSTRAINT chk_inspection_quantities CHECK (passed_quantity + failed_quantity = inspected_quantity)
);

COMMENT ON TABLE inspection_records IS 'Individual inspection records per stage';
COMMENT ON COLUMN inspection_records.inspection_stage IS 'Manufacturing stage: assembly, visual, integrity, final, packaging';

-- Indexes for inspection_records
CREATE INDEX idx_inspection_batch ON inspection_records(batch_id);
CREATE INDEX idx_inspection_date ON inspection_records(inspection_date DESC);
CREATE INDEX idx_inspection_stage ON inspection_records(inspection_stage);
CREATE INDEX idx_inspection_inspector ON inspection_records(inspector_id);

-- ============================================================================

-- Defects (Detailed rejection reasons)
CREATE TABLE IF NOT EXISTS defects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inspection_id UUID NOT NULL REFERENCES inspection_records(id) ON DELETE CASCADE,
  batch_id UUID NOT NULL REFERENCES batches(id) ON DELETE CASCADE,
  defect_type VARCHAR(100) NOT NULL,
  defect_code VARCHAR(20),
  defect_category VARCHAR(50) CHECK (defect_category IN ('visual', 'dimensional', 'functional', 'material', 'other')),
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  severity VARCHAR(20) DEFAULT 'minor' CHECK (severity IN ('minor', 'major', 'critical')),
  root_cause TEXT,
  corrective_action TEXT,
  detected_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE defects IS 'Detailed defect records linked to inspections';
COMMENT ON COLUMN defects.defect_type IS 'Specific defect name (e.g., "Scratches", "Wrong Dimensions")';
COMMENT ON COLUMN defects.defect_category IS 'Broad category for grouping';

-- Indexes for defects
CREATE INDEX idx_defects_inspection ON defects(inspection_id);
CREATE INDEX idx_defects_batch ON defects(batch_id);
CREATE INDEX idx_defects_type ON defects(defect_type);
CREATE INDEX idx_defects_category ON defects(defect_category);
CREATE INDEX idx_defects_severity ON defects(severity);
CREATE INDEX idx_defects_date ON defects(detected_at DESC);

-- ============================================================================

-- Suppliers (Vendor master data)
CREATE TABLE IF NOT EXISTS suppliers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_code VARCHAR(50) UNIQUE NOT NULL,
  supplier_name VARCHAR(200) NOT NULL,
  contact_person VARCHAR(100),
  contact_email VARCHAR(100),
  contact_phone VARCHAR(20),
  address TEXT,
  rating DECIMAL(3,2) DEFAULT 0 CHECK (rating >= 0 AND rating <= 5),
  certification_status VARCHAR(50),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE suppliers IS 'Supplier/vendor master data';
COMMENT ON COLUMN suppliers.rating IS 'Quality rating (0-5 scale)';

-- Indexes for suppliers
CREATE INDEX idx_suppliers_code ON suppliers(supplier_code);
CREATE INDEX idx_suppliers_active ON suppliers(is_active);
CREATE INDEX idx_suppliers_rating ON suppliers(rating DESC);

-- ============================================================================

-- Batch Suppliers (Many-to-Many relationship)
CREATE TABLE IF NOT EXISTS batch_suppliers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id UUID NOT NULL REFERENCES batches(id) ON DELETE CASCADE,
  supplier_id UUID NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
  component_type VARCHAR(100),
  component_description TEXT,
  quantity_supplied INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Unique constraint: one supplier per component type per batch
  CONSTRAINT uk_batch_supplier_component UNIQUE (batch_id, supplier_id, component_type)
);

COMMENT ON TABLE batch_suppliers IS 'Links batches to their component suppliers';

-- Indexes for batch_suppliers
CREATE INDEX idx_batch_suppliers_batch ON batch_suppliers(batch_id);
CREATE INDEX idx_batch_suppliers_supplier ON batch_suppliers(supplier_id);
CREATE INDEX idx_batch_suppliers_component ON batch_suppliers(component_type);

-- ============================================================================

-- Upload History (Excel file tracking)
CREATE TABLE IF NOT EXISTS upload_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  filename VARCHAR(255) NOT NULL,
  original_filename VARCHAR(255) NOT NULL,
  file_type VARCHAR(50) CHECK (file_type IN ('assembly', 'visual', 'integrity', 'cumulative', 'shopfloor', 'unknown')),
  file_size INTEGER,
  storage_path TEXT,
  bucket_name VARCHAR(100) DEFAULT 'uploads',
  upload_status VARCHAR(20) DEFAULT 'pending' CHECK (upload_status IN ('pending', 'processing', 'completed', 'failed')),
  records_imported INTEGER DEFAULT 0,
  records_failed INTEGER DEFAULT 0,
  validation_errors JSONB,
  error_message TEXT,
  uploaded_by VARCHAR(100),
  uploaded_at TIMESTAMPTZ DEFAULT NOW(),
  processing_started_at TIMESTAMPTZ,
  processing_completed_at TIMESTAMPTZ,
  metadata JSONB
);

COMMENT ON TABLE upload_history IS 'Track Excel file uploads and processing status';

-- Indexes for upload_history
CREATE INDEX idx_upload_date ON upload_history(uploaded_at DESC);
CREATE INDEX idx_upload_status ON upload_history(upload_status);
CREATE INDEX idx_upload_type ON upload_history(file_type);

-- ============================================================================

-- AI Insights (Cached AI-generated summaries)
CREATE TABLE IF NOT EXISTS ai_insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  insight_type VARCHAR(50) NOT NULL CHECK (insight_type IN ('health_summary', 'root_cause', 'prediction', 'recommendation', 'anomaly')),
  context_hash VARCHAR(64) UNIQUE NOT NULL, -- MD5 hash of input data for cache lookup
  context_data JSONB NOT NULL,
  insight_text TEXT NOT NULL,
  sentiment VARCHAR(20) CHECK (sentiment IN ('positive', 'neutral', 'concerning', 'critical')),
  confidence_score DECIMAL(3,2) CHECK (confidence_score >= 0 AND confidence_score <= 1),
  action_items JSONB,
  generated_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  access_count INTEGER DEFAULT 0,
  last_accessed_at TIMESTAMPTZ,
  metadata JSONB
);

COMMENT ON TABLE ai_insights IS 'Cached AI-generated insights to reduce API costs';
COMMENT ON COLUMN ai_insights.context_hash IS 'Cache key based on input data hash';
COMMENT ON COLUMN ai_insights.expires_at IS 'Cache expiration time (typically 1 hour)';

-- Indexes for ai_insights
CREATE INDEX idx_insights_type ON ai_insights(insight_type);
CREATE INDEX idx_insights_hash ON ai_insights(context_hash);
CREATE INDEX idx_insights_date ON ai_insights(generated_at DESC);
CREATE INDEX idx_insights_expiry ON ai_insights(expires_at);

-- ============================================================================
-- COMPUTED FUNCTIONS
-- ============================================================================

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
  
  -- Handle division by zero
  IF produced = 0 OR produced IS NULL THEN
    RETURN 0;
  END IF;
  
  -- Return percentage with 2 decimal places
  RETURN ROUND((rejected::DECIMAL / produced::DECIMAL) * 100, 2);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

COMMENT ON FUNCTION calculate_rejection_rate IS 'Calculate rejection rate percentage for a batch';

-- ============================================================================

-- Classify batch risk level based on rejection rate
CREATE OR REPLACE FUNCTION classify_batch_risk(rejection_rate DECIMAL)
RETURNS VARCHAR(20) AS $$
BEGIN
  IF rejection_rate >= 15 THEN
    RETURN 'high_risk';
  ELSIF rejection_rate >= 8 THEN
    RETURN 'watch';
  ELSE
    RETURN 'normal';
  END IF;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

COMMENT ON FUNCTION classify_batch_risk IS 'Classify risk level based on rejection rate thresholds';

-- ============================================================================

-- Update batch risk level automatically
CREATE OR REPLACE FUNCTION update_batch_risk_level()
RETURNS TRIGGER AS $$
DECLARE
  rejection_rate DECIMAL(5,2);
BEGIN
  -- Calculate current rejection rate
  rejection_rate := calculate_rejection_rate(NEW.id);
  
  -- Update risk level based on rejection rate
  NEW.risk_level := classify_batch_risk(rejection_rate);
  
  -- Update timestamp
  NEW.updated_at := NOW();
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update risk level when quantities change
DROP TRIGGER IF EXISTS trigger_update_batch_risk ON batches;
CREATE TRIGGER trigger_update_batch_risk
BEFORE INSERT OR UPDATE OF produced_quantity, rejected_quantity
ON batches
FOR EACH ROW
EXECUTE FUNCTION update_batch_risk_level();

COMMENT ON TRIGGER trigger_update_batch_risk ON batches IS 'Auto-update risk level when quantities change';

-- ============================================================================

-- Update batch rejected quantity from inspection records
CREATE OR REPLACE FUNCTION sync_batch_rejected_quantity()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE batches
  SET 
    rejected_quantity = (
      SELECT COALESCE(SUM(failed_quantity), 0)
      FROM inspection_records
      WHERE batch_id = NEW.batch_id
    ),
    updated_at = NOW()
  WHERE id = NEW.batch_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to sync rejected quantity
DROP TRIGGER IF EXISTS trigger_sync_batch_rejected ON inspection_records;
CREATE TRIGGER trigger_sync_batch_rejected
AFTER INSERT OR UPDATE OR DELETE
ON inspection_records
FOR EACH ROW
EXECUTE FUNCTION sync_batch_rejected_quantity();

COMMENT ON TRIGGER trigger_sync_batch_rejected ON inspection_records IS 'Sync batch rejected_quantity from inspection records';

-- ============================================================================

-- Clean expired AI insights (maintenance function)
CREATE OR REPLACE FUNCTION clean_expired_insights()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM ai_insights
  WHERE expires_at < NOW();
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION clean_expired_insights IS 'Delete expired AI insights (call periodically via cron)';

-- ============================================================================
-- MATERIALIZED VIEWS (Performance Optimization)
-- ============================================================================

-- Dashboard KPIs (refreshed every 5 minutes via cron)
DROP MATERIALIZED VIEW IF EXISTS dashboard_kpis CASCADE;
CREATE MATERIALIZED VIEW dashboard_kpis AS
SELECT
  DATE_TRUNC('day', production_date) AS date,
  COUNT(*) AS total_batches,
  SUM(produced_quantity) AS total_produced,
  SUM(rejected_quantity) AS total_rejected,
  ROUND(
    CASE 
      WHEN SUM(produced_quantity) > 0 
      THEN (SUM(rejected_quantity)::DECIMAL / SUM(produced_quantity)::DECIMAL) * 100 
      ELSE 0 
    END, 
    2
  ) AS avg_rejection_rate,
  COUNT(CASE WHEN risk_level = 'high_risk' THEN 1 END) AS high_risk_batches,
  COUNT(CASE WHEN risk_level = 'watch' THEN 1 END) AS watch_batches,
  COUNT(CASE WHEN status = 'scrapped' THEN 1 END) AS scrapped_batches,
  COUNT(CASE WHEN status = 'completed' THEN 1 END) AS completed_batches
FROM batches
WHERE production_date >= CURRENT_DATE - INTERVAL '90 days'
GROUP BY DATE_TRUNC('day', production_date)
ORDER BY date DESC;

CREATE UNIQUE INDEX idx_dashboard_kpis_date ON dashboard_kpis(date);

COMMENT ON MATERIALIZED VIEW dashboard_kpis IS 'Pre-aggregated dashboard KPIs (last 90 days)';

-- ============================================================================

-- Defect Pareto Analysis (refreshed daily)
DROP MATERIALIZED VIEW IF EXISTS defect_pareto CASCADE;
CREATE MATERIALIZED VIEW defect_pareto AS
WITH defect_totals AS (
  SELECT
    defect_category,
    defect_type,
    SUM(quantity) AS total_quantity,
    COUNT(DISTINCT batch_id) AS affected_batches
  FROM defects
  WHERE detected_at >= CURRENT_DATE - INTERVAL '30 days'
  GROUP BY defect_category, defect_type
),
defect_percentages AS (
  SELECT
    defect_category,
    defect_type,
    total_quantity,
    affected_batches,
    ROUND(
      (total_quantity::DECIMAL / SUM(total_quantity) OVER ()) * 100,
      2
    ) AS percentage,
    SUM(total_quantity) OVER () AS grand_total
  FROM defect_totals
)
SELECT
  defect_category,
  defect_type,
  total_quantity,
  affected_batches,
  percentage,
  SUM(percentage) OVER (ORDER BY total_quantity DESC) AS cumulative_percentage,
  RANK() OVER (ORDER BY total_quantity DESC) AS rank
FROM defect_percentages
ORDER BY total_quantity DESC;

CREATE INDEX idx_defect_pareto_category ON defect_pareto(defect_category);
CREATE INDEX idx_defect_pareto_rank ON defect_pareto(rank);

COMMENT ON MATERIALIZED VIEW defect_pareto IS 'Pareto analysis of defects (last 30 days)';

-- ============================================================================

-- Supplier Performance Rankings (refreshed daily)
DROP MATERIALIZED VIEW IF EXISTS supplier_performance CASCADE;
CREATE MATERIALIZED VIEW supplier_performance AS
WITH supplier_stats AS (
  SELECT
    s.id AS supplier_id,
    s.supplier_code,
    s.supplier_name,
    s.rating,
    COUNT(DISTINCT bs.batch_id) AS batch_count,
    AVG(calculate_rejection_rate(b.id)) AS avg_rejection_rate,
    SUM(b.rejected_quantity) AS total_rejected,
    MAX(b.production_date) AS last_delivery_date
  FROM suppliers s
  LEFT JOIN batch_suppliers bs ON s.id = bs.supplier_id
  LEFT JOIN batches b ON bs.batch_id = b.id
  WHERE b.production_date >= CURRENT_DATE - INTERVAL '90 days'
  GROUP BY s.id, s.supplier_code, s.supplier_name, s.rating
)
SELECT
  supplier_id,
  supplier_code,
  supplier_name,
  rating,
  batch_count,
  ROUND(COALESCE(avg_rejection_rate, 0), 2) AS avg_rejection_rate,
  total_rejected,
  last_delivery_date,
  RANK() OVER (ORDER BY avg_rejection_rate DESC NULLS LAST) AS risk_rank,
  CASE
    WHEN avg_rejection_rate >= 15 THEN 'poor'
    WHEN avg_rejection_rate >= 8 THEN 'fair'
    WHEN avg_rejection_rate >= 5 THEN 'good'
    ELSE 'excellent'
  END AS performance_grade
FROM supplier_stats
ORDER BY avg_rejection_rate DESC NULLS LAST;

CREATE INDEX idx_supplier_perf_code ON supplier_performance(supplier_code);
CREATE INDEX idx_supplier_perf_rank ON supplier_performance(risk_rank);

COMMENT ON MATERIALIZED VIEW supplier_performance IS 'Supplier performance rankings (last 90 days)';

-- ============================================================================

-- Refresh function for all materialized views
CREATE OR REPLACE FUNCTION refresh_all_materialized_views()
RETURNS VOID AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY dashboard_kpis;
  REFRESH MATERIALIZED VIEW CONCURRENTLY defect_pareto;
  REFRESH MATERIALIZED VIEW CONCURRENTLY supplier_performance;
  
  RAISE NOTICE 'All materialized views refreshed successfully';
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION refresh_all_materialized_views IS 'Refresh all materialized views (call via API or cron)';

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE inspection_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE defects ENABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE batch_suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE upload_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_insights ENABLE ROW LEVEL SECURITY;

-- For now: Allow all access for service role (internal dashboard)
-- Future: Add user authentication and role-based policies

CREATE POLICY "Service role has full access to batches"
ON batches FOR ALL TO service_role USING (true);

CREATE POLICY "Service role has full access to inspection_records"
ON inspection_records FOR ALL TO service_role USING (true);

CREATE POLICY "Service role has full access to defects"
ON defects FOR ALL TO service_role USING (true);

CREATE POLICY "Service role has full access to suppliers"
ON suppliers FOR ALL TO service_role USING (true);

CREATE POLICY "Service role has full access to batch_suppliers"
ON batch_suppliers FOR ALL TO service_role USING (true);

CREATE POLICY "Service role has full access to upload_history"
ON upload_history FOR ALL TO service_role USING (true);

CREATE POLICY "Service role has full access to ai_insights"
ON ai_insights FOR ALL TO service_role USING (true);

-- ============================================================================
-- SAMPLE DATA (For Development/Testing)
-- ============================================================================

-- Insert sample suppliers
INSERT INTO suppliers (supplier_code, supplier_name, contact_person, contact_email, rating)
VALUES
  ('S-401', 'ABC Components Ltd', 'Rajesh Kumar', 'rajesh@abccomponents.com', 2.1),
  ('S-203', 'XYZ Materials Inc', 'Priya Sharma', 'priya@xyzmaterials.com', 2.8),
  ('S-115', 'Quality Parts Co', 'Amit Patel', 'amit@qualityparts.com', 3.2),
  ('S-302', 'Premium Supplies', 'Neha Singh', 'neha@premiumsupplies.com', 4.1),
  ('S-088', 'Reliable Components', 'Vikram Reddy', 'vikram@reliablecomp.com', 3.8)
ON CONFLICT (supplier_code) DO NOTHING;

-- Insert sample batches
INSERT INTO batches (batch_number, product_code, product_name, planned_quantity, produced_quantity, rejected_quantity, production_date, status)
VALUES
  ('BR-2401', 'PROD-A1', 'Medical Device A1', 5000, 5000, 760, CURRENT_DATE - INTERVAL '2 days', 'completed'),
  ('BR-2398', 'PROD-B2', 'Medical Device B2', 3000, 3000, 384, CURRENT_DATE - INTERVAL '4 days', 'completed'),
  ('BR-2405', 'PROD-A1', 'Medical Device A1', 4500, 4500, 518, CURRENT_DATE - INTERVAL '1 day', 'in_progress'),
  ('BR-2399', 'PROD-C3', 'Medical Device C3', 6000, 6000, 552, CURRENT_DATE - INTERVAL '3 days', 'completed'),
  ('BR-2403', 'PROD-B2', 'Medical Device B2', 3500, 3500, 298, CURRENT_DATE - INTERVAL '1 day', 'in_progress')
ON CONFLICT (batch_number) DO NOTHING;

-- Note: Triggers will auto-calculate risk_level based on rejection rate

COMMENT ON SCHEMA public IS 'RAIS Manufacturing Rejection Intelligence System - Schema Version 2.0';
