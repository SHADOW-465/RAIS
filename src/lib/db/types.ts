/**
 * Database Types for RAIS Dashboard
 * Auto-generated type definitions for Supabase tables
 */

// ============================================================================
// ENUMS
// ============================================================================

export type BatchStatus = 'in_progress' | 'completed' | 'scrapped';
export type RiskLevel = 'normal' | 'watch' | 'high_risk';
export type InspectionStage = 'assembly' | 'visual' | 'integrity' | 'final' | 'packaging';
export type DefectCategory = 'visual' | 'dimensional' | 'functional' | 'material' | 'other';
export type DefectSeverity = 'minor' | 'major' | 'critical';
export type UploadStatus = 'pending' | 'processing' | 'completed' | 'failed';
export type FileType = 'assembly' | 'visual' | 'integrity' | 'cumulative' | 'shopfloor' | 'rejection' | 'unknown';
export type InsightType = 'health_summary' | 'root_cause' | 'prediction' | 'recommendation' | 'anomaly';
export type Sentiment = 'positive' | 'neutral' | 'concerning' | 'critical';
export type SupplierPerformanceGrade = 'poor' | 'fair' | 'good' | 'excellent';

// ============================================================================
// TABLE TYPES
// ============================================================================

export interface Batch {
  id: string;
  batch_number: string;
  product_code: string | null;
  product_name: string | null;
  planned_quantity: number;
  produced_quantity: number;
  rejected_quantity: number;
  production_date: string; // ISO date string
  completion_date: string | null;
  status: BatchStatus;
  risk_level: RiskLevel;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface InspectionRecord {
  id: string;
  batch_id: string;
  inspection_stage: InspectionStage;
  inspector_name: string | null;
  inspector_id: string | null;
  inspected_quantity: number;
  passed_quantity: number;
  failed_quantity: number;
  inspection_date: string;
  inspection_duration_minutes: number | null;
  equipment_id: string | null;
  notes: string | null;
  created_at: string;
}

export interface Defect {
  id: string;
  inspection_id: string;
  batch_id: string;
  defect_type: string;
  defect_code: string | null;
  defect_category: DefectCategory | null;
  quantity: number;
  severity: DefectSeverity;
  root_cause: string | null;
  corrective_action: string | null;
  detected_at: string;
  created_at: string;
}

export interface Supplier {
  id: string;
  supplier_code: string;
  supplier_name: string;
  contact_person: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  address: string | null;
  rating: number;
  certification_status: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface BatchSupplier {
  id: string;
  batch_id: string;
  supplier_id: string;
  component_type: string | null;
  component_description: string | null;
  quantity_supplied: number | null;
  created_at: string;
}

export interface UploadHistory {
  id: string;
  filename: string;
  original_filename: string;
  file_type: FileType | null;
  file_size: number | null;
  storage_path: string | null;
  bucket_name: string;
  upload_status: UploadStatus;
  records_imported: number;
  records_failed: number;
  validation_errors: Record<string, unknown> | null;
  error_message: string | null;
  uploaded_by: string | null;
  uploaded_at: string;
  processing_started_at: string | null;
  processing_completed_at: string | null;
  metadata: Record<string, unknown> | null;
}

export interface AIInsight {
  id: string;
  insight_type: InsightType;
  context_hash: string;
  context_data: Record<string, unknown>;
  insight_text: string;
  sentiment: Sentiment | null;
  confidence_score: number | null;
  action_items: string[] | null;
  generated_at: string;
  expires_at: string;
  access_count: number;
  last_accessed_at: string | null;
  metadata: Record<string, unknown> | null;
}

// ============================================================================
// MATERIALIZED VIEW TYPES
// ============================================================================

export interface DashboardKPI {
  date: string;
  total_batches: number;
  total_produced: number;
  total_rejected: number;
  avg_rejection_rate: number;
  high_risk_batches: number;
  watch_batches: number;
  scrapped_batches: number;
  completed_batches: number;
}

export interface DefectPareto {
  defect_category: DefectCategory | null;
  defect_type: string;
  total_quantity: number;
  affected_batches: number;
  percentage: number;
  cumulative_percentage: number;
  rank: number;
}

export interface SupplierPerformance {
  supplier_id: string;
  supplier_code: string;
  supplier_name: string;
  rating: number;
  batch_count: number;
  avg_rejection_rate: number;
  total_rejected: number;
  last_delivery_date: string | null;
  risk_rank: number;
  performance_grade: SupplierPerformanceGrade;
}

// ============================================================================
// JOIN TYPES (Common queries)
// ============================================================================

export interface BatchWithInspections extends Batch {
  inspections: InspectionRecord[];
  defects: Defect[];
  suppliers: (BatchSupplier & { supplier: Supplier })[];
}

export interface InspectionWithDefects extends InspectionRecord {
  defects: Defect[];
  batch: Batch;
}

export interface DefectWithContext extends Defect {
  inspection: InspectionRecord;
  batch: Batch;
}

// ============================================================================
// INSERT TYPES (for creating new records)
// ============================================================================

export type BatchInsert = Omit<Batch, 'id' | 'created_at' | 'updated_at' | 'risk_level'> & {
  id?: string;
  risk_level?: RiskLevel;
};

export type InspectionRecordInsert = Omit<InspectionRecord, 'id' | 'created_at'> & {
  id?: string;
};

export type DefectInsert = Omit<Defect, 'id' | 'created_at' | 'detected_at'> & {
  id?: string;
  detected_at?: string;
};

export type SupplierInsert = Omit<Supplier, 'id' | 'created_at' | 'updated_at'> & {
  id?: string;
};

export type BatchSupplierInsert = Omit<BatchSupplier, 'id' | 'created_at'> & {
  id?: string;
};

export type UploadHistoryInsert = Omit<UploadHistory, 'id' | 'uploaded_at' | 'processing_started_at' | 'processing_completed_at'> & {
  id?: string;
};

export type AIInsightInsert = Omit<AIInsight, 'id' | 'generated_at' | 'access_count' | 'last_accessed_at'> & {
  id?: string;
};

// ============================================================================
// UPDATE TYPES (for updating existing records)
// ============================================================================

export type BatchUpdate = Partial<Omit<Batch, 'id' | 'created_at' | 'batch_number'>>;
export type InspectionRecordUpdate = Partial<Omit<InspectionRecord, 'id' | 'created_at' | 'batch_id'>>;
export type DefectUpdate = Partial<Omit<Defect, 'id' | 'created_at' | 'inspection_id' | 'batch_id'>>;
export type SupplierUpdate = Partial<Omit<Supplier, 'id' | 'created_at' | 'supplier_code'>>;
export type UploadHistoryUpdate = Partial<Omit<UploadHistory, 'id' | 'uploaded_at' | 'filename'>>;

// ============================================================================
// FILTER TYPES (for queries)
// ============================================================================

export interface BatchFilters {
  status?: BatchStatus | BatchStatus[];
  risk_level?: RiskLevel | RiskLevel[];
  product_code?: string;
  date_from?: string;
  date_to?: string;
  search?: string; // Search in batch_number or product_name
}

export interface DefectFilters {
  category?: DefectCategory | DefectCategory[];
  severity?: DefectSeverity | DefectSeverity[];
  defect_type?: string;
  date_from?: string;
  date_to?: string;
  batch_id?: string;
}

export interface SupplierFilters {
  is_active?: boolean;
  rating_min?: number;
  rating_max?: number;
  performance_grade?: SupplierPerformanceGrade;
}

// ============================================================================
// PAGINATION TYPES
// ============================================================================

export interface PaginationParams {
  limit?: number;
  offset?: number;
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  limit: number;
  offset: number;
  has_more: boolean;
}

// ============================================================================
// CALCULATED FIELDS (not in database, computed at runtime)
// ============================================================================

export interface BatchWithCalculations extends Batch {
  rejection_rate: number; // calculated_rejection_rate(id)
  cost_impact?: number; // Optional: if cost data is available
  days_in_production?: number; // Days since production_date
}

export interface InspectionWithRate extends InspectionRecord {
  failure_rate: number; // (failed_quantity / inspected_quantity) * 100
}

// ============================================================================
// DATABASE FUNCTION RETURN TYPES
// ============================================================================

export interface RejectionRateResult {
  batch_id: string;
  rejection_rate: number;
}

export interface RiskClassificationResult {
  batch_id: string;
  risk_level: RiskLevel;
  rejection_rate: number;
}
