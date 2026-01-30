-- Supabase Migration: Database Functions
-- Run these in the Supabase SQL Editor

-- ============================================
-- Function: get_aggregated_stats
-- Replaces TimescaleDB time_bucket functionality
-- ============================================
CREATE OR REPLACE FUNCTION get_aggregated_stats(
  bucket_size TEXT,
  from_date TIMESTAMP WITH TIME ZONE,
  to_date TIMESTAMP WITH TIME ZONE,
  group_by_line BOOLEAN DEFAULT FALSE,
  group_by_defect BOOLEAN DEFAULT FALSE,
  group_by_supplier BOOLEAN DEFAULT FALSE
)
RETURNS TABLE (
  period TIMESTAMP WITH TIME ZONE,
  line_id INTEGER,
  defect_type_id INTEGER,
  supplier_id INTEGER,
  record_count BIGINT,
  total_rejected BIGINT,
  avg_quantity NUMERIC,
  total_cost NUMERIC,
  max_single_rejection INTEGER
) AS $$
DECLARE
  interval_val INTERVAL;
BEGIN
  -- Convert bucket_size to interval
  interval_val := bucket_size::INTERVAL;
  
  RETURN QUERY
  SELECT 
    DATE_TRUNC(
      CASE 
        WHEN bucket_size = '1 day' THEN 'day'
        WHEN bucket_size = '1 week' THEN 'week'
        WHEN bucket_size = '1 month' THEN 'month'
        ELSE 'day'
      END,
      rr.timestamp
    ) AS period,
    CASE WHEN group_by_line THEN rr.line_id END AS line_id,
    CASE WHEN group_by_defect THEN rr.defect_type_id END AS defect_type_id,
    CASE WHEN group_by_supplier THEN rr.supplier_id END AS supplier_id,
    COUNT(*)::BIGINT AS record_count,
    SUM(rr.quantity)::BIGINT AS total_rejected,
    AVG(rr.quantity)::NUMERIC AS avg_quantity,
    SUM(rr.total_cost)::NUMERIC AS total_cost,
    MAX(rr.quantity)::INTEGER AS max_single_rejection
  FROM rejection_records rr
  WHERE rr.timestamp >= from_date AND rr.timestamp <= to_date
  GROUP BY 
    DATE_TRUNC(
      CASE 
        WHEN bucket_size = '1 day' THEN 'day'
        WHEN bucket_size = '1 week' THEN 'week'
        WHEN bucket_size = '1 month' THEN 'month'
        ELSE 'day'
      END,
      rr.timestamp
    ),
    CASE WHEN group_by_line THEN rr.line_id END,
    CASE WHEN group_by_defect THEN rr.defect_type_id END,
    CASE WHEN group_by_supplier THEN rr.supplier_id END
  ORDER BY period;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- Function: get_top_defects
-- Returns top defects with percentages
-- ============================================
CREATE OR REPLACE FUNCTION get_top_defects(
  from_date TIMESTAMP WITH TIME ZONE,
  to_date TIMESTAMP WITH TIME ZONE,
  limit_count INTEGER DEFAULT 10,
  line_ids INTEGER[] DEFAULT NULL,
  supplier_ids INTEGER[] DEFAULT NULL
)
RETURNS TABLE (
  defect_id INTEGER,
  defect_name TEXT,
  defect_code TEXT,
  count BIGINT,
  percentage NUMERIC,
  line_name TEXT
) AS $$
DECLARE
  total_count BIGINT;
BEGIN
  -- Calculate total for percentage
  SELECT SUM(rr.quantity)::BIGINT INTO total_count
  FROM rejection_records rr
  WHERE rr.timestamp >= from_date 
    AND rr.timestamp <= to_date
    AND (line_ids IS NULL OR rr.line_id = ANY(line_ids))
    AND (supplier_ids IS NULL OR rr.supplier_id = ANY(supplier_ids));

  RETURN QUERY
  SELECT 
    dt.id AS defect_id,
    dt.name::TEXT AS defect_name,
    dt.code::TEXT AS defect_code,
    SUM(rr.quantity)::BIGINT AS count,
    ROUND(100.0 * SUM(rr.quantity) / NULLIF(total_count, 0), 2)::NUMERIC AS percentage,
    pl.name::TEXT AS line_name
  FROM rejection_records rr
  JOIN defect_types dt ON rr.defect_type_id = dt.id
  LEFT JOIN production_lines pl ON rr.line_id = pl.id
  WHERE rr.timestamp >= from_date 
    AND rr.timestamp <= to_date
    AND (line_ids IS NULL OR rr.line_id = ANY(line_ids))
    AND (supplier_ids IS NULL OR rr.supplier_id = ANY(supplier_ids))
  GROUP BY dt.id, dt.name, dt.code, pl.name
  ORDER BY count DESC
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- Function: get_supplier_stats
-- Returns supplier statistics for a date range
-- ============================================
CREATE OR REPLACE FUNCTION get_supplier_stats(
  from_date TIMESTAMP WITH TIME ZONE,
  to_date TIMESTAMP WITH TIME ZONE
)
RETURNS TABLE (
  supplier_id INTEGER,
  supplier_name TEXT,
  total_rejections BIGINT,
  contribution NUMERIC
) AS $$
DECLARE
  grand_total BIGINT;
BEGIN
  -- Calculate grand total
  SELECT SUM(rr.quantity)::BIGINT INTO grand_total
  FROM rejection_records rr
  WHERE rr.timestamp >= from_date AND rr.timestamp <= to_date;

  RETURN QUERY
  SELECT 
    s.id AS supplier_id,
    s.name::TEXT AS supplier_name,
    COALESCE(SUM(rr.quantity), 0)::BIGINT AS total_rejections,
    ROUND(100.0 * COALESCE(SUM(rr.quantity), 0) / NULLIF(grand_total, 0), 2)::NUMERIC AS contribution
  FROM suppliers s
  LEFT JOIN rejection_records rr ON s.id = rr.supplier_id 
    AND rr.timestamp >= from_date AND rr.timestamp <= to_date
  GROUP BY s.id, s.name
  HAVING COALESCE(SUM(rr.quantity), 0) > 0
  ORDER BY total_rejections DESC;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- Enable Row Level Security (RLS) policies
-- ============================================

-- Enable RLS on all tables
ALTER TABLE rejection_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE defect_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE production_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE uploaded_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Create permissive policy for service role (server-side operations)
-- This allows the service role to bypass RLS
CREATE POLICY "Service role can do everything" ON rejection_records
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Service role can do everything" ON defect_types
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Service role can do everything" ON production_lines
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Service role can do everything" ON suppliers
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Service role can do everything" ON shifts
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Service role can do everything" ON uploaded_files
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Service role can do everything" ON users
  FOR ALL USING (true) WITH CHECK (true);

-- Note: For production, you should add more restrictive policies
-- that check the user's role from the JWT claims
