-- ============================================================================
-- RAIS v2.0 - AI Insights Support
-- Migration: 004_ai_insights.sql
-- Date: 2026-02-04
-- Purpose: Add AI insights table for caching interpretation results
-- ============================================================================

-- Enable extensions (if not already)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- AI INSIGHTS TABLE
-- Stores cached results from LLM to avoid re-generation
-- ============================================================================
CREATE TABLE IF NOT EXISTS ai_insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Context
  insight_type VARCHAR(50) NOT NULL CHECK (insight_type IN ('health_summary', 'root_cause', 'prediction', 'recommendation', 'anomaly', 'file_analysis')),
  context_hash VARCHAR(64) NOT NULL, -- MD5/SHA hash of the input data/context
  context_data JSONB NOT NULL, -- The actual input data used for generation
  
  -- Content
  insight_text TEXT NOT NULL,
  sentiment VARCHAR(20) CHECK (sentiment IN ('positive', 'neutral', 'concerning', 'critical')),
  confidence_score DECIMAL(3,2) CHECK (confidence_score BETWEEN 0 AND 1),
  action_items TEXT[], -- Array of strings
  
  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb,
  
  -- Cache Management
  generated_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  access_count INT DEFAULT 0,
  last_accessed_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for cache lookup
CREATE INDEX idx_ai_insights_lookup ON ai_insights(insight_type, context_hash);
CREATE INDEX idx_ai_insights_expiry ON ai_insights(expires_at);

-- RLS
ALTER TABLE ai_insights ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_role_full_access_ai" ON ai_insights FOR ALL TO service_role USING (true);

COMMENT ON TABLE ai_insights IS 'Cache for AI-generated insights to reduce API costs and latency';
