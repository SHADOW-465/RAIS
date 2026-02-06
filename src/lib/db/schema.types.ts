/**
 * RAIS v2.0 - Database Types
 * Normalized schema types for auditable manufacturing statistics
 * 
 * IMPORTANT: These types match the schema in 003_normalized_schema.sql
 * All KPIs are computed via SQL views, NOT TypeScript code
 */

// ============================================================================
// ENUMS (Match database CHECK constraints)
// ============================================================================

export type FileType = 'shopfloor' | 'assembly' | 'visual' | 'integrity' | 'cumulative' | 'production' | 'unknown';
export type UploadStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'partial';
export type DefectCategory = 'visual' | 'dimensional' | 'functional' | 'material' | 'other';
export type DefectSeverity = 'minor' | 'major' | 'critical';
export type RiskLevel = 'normal' | 'watch' | 'high_risk';

// ============================================================================
// CONFIGURATION
// ============================================================================

export interface SystemConfig {
  key: string;
  value: Record<string, unknown>;
  description: string | null;
  updated_at: string;
}

export interface CostConfig {
  value: number;
  currency: string;
}

export interface RiskThresholds {
  high_risk: number;
  watch: number;
}

// ============================================================================
// TIME DIMENSION
// ============================================================================

export interface TimeDimension {
  date: string; // ISO date string YYYY-MM-DD
  year: number;
  month: number;
  week: number;
  day_of_week: number;
  quarter: number;
  month_name: string;
  is_weekend: boolean;
}

// ============================================================================
// FILE UPLOAD LOG (Audit Trail Root)
// ============================================================================

export interface FileUploadLog {
  id: string;
  filename: string;
  original_filename: string;
  file_hash: string;
  file_size_bytes: number | null;
  storage_path: string | null;
  detected_file_type: FileType | null;
  upload_status: UploadStatus;
  records_total: number;
  records_valid: number;
  records_invalid: number;
  validation_errors: ValidationError[];
  error_message: string | null;
  ai_analysis: AIAnalysisResult | null;
  mapping_config: MappingConfig | null;
  uploaded_by: string | null;
  uploaded_at: string;
  processing_started_at: string | null;
  processing_completed_at: string | null;
}

export interface ValidationError {
  row: number;
  column?: string;
  message: string;
  severity: 'error' | 'warning';
}

export interface AIAnalysisResult {
  detected_type: FileType;
  confidence: number;
  suggested_mappings: Record<string, string>;
  notes: string[];
  analyzed_at: string;
}

export interface MappingConfig {
  column_mappings: Record<string, string>;
  defect_columns: string[];
  date_column: string | null;
  quantity_columns: Record<string, string>;
}

// ============================================================================
// INSPECTION STAGE (Master Data)
// ============================================================================

export interface InspectionStage {
  id: string;
  code: string;
  name: string;
  description: string | null;
  sequence: number;
  is_active: boolean;
  created_at: string;
}

// ============================================================================
// DEFECT MASTER (Normalized Defect Types)
// ============================================================================

export interface DefectMaster {
  id: string;
  code: string;
  display_name: string;
  category: DefectCategory | null;
  severity: DefectSeverity;
  description: string | null;
  is_active: boolean;
  created_at: string;
}

// ============================================================================
// PRODUCTION SUMMARY
// ============================================================================

export interface ProductionSummary {
  id: string;
  date: string;
  product_code: string | null;
  produced_quantity: number;
  dispatched_quantity: number;
  source_file_id: string | null;
  source_row_numbers: number[] | null;
  created_at: string;
  updated_at: string;
}

// ============================================================================
// STAGE INSPECTION SUMMARY
// ============================================================================

export interface StageInspectionSummary {
  id: string;
  date: string;
  stage_id: string;
  received_quantity: number;
  inspected_quantity: number;
  accepted_quantity: number;
  hold_quantity: number;
  rejected_quantity: number;
  source_file_id: string | null;
  source_row_number: number | null;
  created_at: string;
}

// ============================================================================
// DEFECT OCCURRENCE (Long-format pivoted data)
// ============================================================================

export interface DefectOccurrence {
  id: string;
  date: string;
  stage_id: string;
  defect_id: string;
  quantity: number;
  source_file_id: string | null;
  source_row_number: number | null;
  source_column_name: string | null;
  created_at: string;
}

// ============================================================================
// MATERIALIZED VIEW TYPES (Read-only, computed by SQL)
// ============================================================================

export interface DailyKPI {
  date: string;
  year: number;
  month: number;
  week: number;
  produced_quantity: number;
  total_rejected: number;
  rejection_rate: number; // Computed in SQL, not TypeScript
}

export interface StageContribution {
  stage_id: string;
  stage_code: string;
  stage_name: string;
  sequence: number;
  total_inspected: number;
  total_rejected: number;
  rejection_rate: number; // Computed in SQL
  contribution_pct: number; // Computed in SQL
}

export interface DefectPareto {
  defect_id: string;
  defect_code: string;
  display_name: string;
  category: DefectCategory | null;
  severity: DefectSeverity;
  total_quantity: number;
  days_occurred: number;
  percentage: number; // Computed in SQL
  cumulative_pct: number; // Computed in SQL
  rank: number;
}

// ============================================================================
// INSERT TYPES (For creating new records)
// ============================================================================

export type FileUploadLogInsert = Omit<FileUploadLog, 'id' | 'uploaded_at' | 'processing_started_at' | 'processing_completed_at'>;
export type ProductionSummaryInsert = Omit<ProductionSummary, 'id' | 'created_at' | 'updated_at'>;
export type StageInspectionSummaryInsert = Omit<StageInspectionSummary, 'id' | 'created_at'>;
export type DefectOccurrenceInsert = Omit<DefectOccurrence, 'id' | 'created_at'>;

// ============================================================================
// API RESPONSE TYPES
// ============================================================================

/**
 * Standard API response format
 * NO fallback data - either real data or explicit error
 */
export interface APIResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
  meta?: {
    timestamp: string;
    source: 'database' | 'cache';
  };
}

/**
 * KPI Response - NEVER contains mock data
 */
export interface OverviewKPIResponse {
  period: {
    start: string;
    end: string;
    days: number;
  };
  rejection: {
    rate: number;
    previous_rate: number;
    change: number;
    trend: 'improving' | 'worsening' | 'stable';
  };
  volume: {
    produced: number;
    rejected: number;
    previous_rejected: number;
    change: number;
  };
  cost: {
    estimated_loss: number;
    currency: string;
    per_unit_cost: number;
  };
  risk: {
    high_risk_days: number;
    watch_days: number;
  };
  data_quality: {
    total_files: number;
    last_upload: string | null;
    coverage_pct: number; // % of days with data
  };
}

export interface TrendDataPoint {
  date: string;
  produced: number;
  rejected: number;
  rejection_rate: number;
  risk_level: RiskLevel;
}

export interface TrendResponse {
  timeline: TrendDataPoint[];
  summary: {
    avg_rejection_rate: number;
    total_produced: number;
    total_rejected: number;
    data_points: number;
    missing_days: number;
  };
}

export interface ParetoResponse {
  defects: DefectPareto[];
  total_defects: number;
  top_80_pct_count: number; // Number of defect types that make up 80%
}

export interface StageAnalysisResponse {
  stages: StageContribution[];
  total_rejected: number;
  worst_stage: string | null;
}

// ============================================================================
// UPLOAD TYPES
// ============================================================================

export interface UploadResult {
  upload_id: string;
  status: UploadStatus;
  detected_type: FileType;
  records_total: number;
  records_valid: number;
  records_invalid: number;
  validation_errors: ValidationError[];
  processing_time_ms: number;
}

export interface ParsedExcelData {
  headers: string[];
  rows: Record<string, unknown>[];
  sheet_name: string;
  header_row_index: number;
  total_rows: number;
}

export interface TransformResult {
  production_records: ProductionSummaryInsert[];
  stage_records: StageInspectionSummaryInsert[];
  defect_records: DefectOccurrenceInsert[];
  warnings: string[];
  errors: ValidationError[];
}

// ============================================================================
// AI INSIGHTS
// ============================================================================

export type InsightType = 'health_summary' | 'root_cause' | 'prediction' | 'recommendation' | 'anomaly' | 'file_analysis';
export type Sentiment = 'positive' | 'neutral' | 'concerning' | 'critical';

export interface AIInsight {
  id: string;
  insight_type: InsightType;
  context_hash: string;
  context_data: Record<string, unknown>;
  insight_text: string;
  sentiment: Sentiment | null;
  confidence_score: number | null;
  action_items: string[] | null;
  metadata: Record<string, unknown> | null;
  generated_at: string;
  expires_at: string;
  access_count: number;
  last_accessed_at: string | null;
}

export type AIInsightInsert = Omit<AIInsight, 'id' | 'generated_at' | 'access_count' | 'last_accessed_at'>;
