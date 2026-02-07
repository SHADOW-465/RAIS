"""
RAIS Backend - Pydantic Models/Schemas
Data models for API requests/responses with full traceability
"""
from datetime import datetime, date
from enum import Enum
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, Field


# ============================================================================
# ENUMS
# ============================================================================

class ProcessingStatus(str, Enum):
    """Status of file processing pipeline"""
    UPLOADING = "uploading"
    PARSING = "parsing"
    VALIDATING = "validating"
    COMPUTING = "computing"
    COMPLETED = "completed"
    FAILED = "failed"


class FileType(str, Enum):
    """Types of Excel files supported"""
    PRODUCTION_CUMULATIVE = "production_cumulative"
    CUMULATIVE = "cumulative"
    ASSEMBLY = "assembly"
    VISUAL = "visual"
    INTEGRITY = "integrity"
    SHOPFLOOR = "shopfloor"
    UNKNOWN = "unknown"


class DefectCategory(str, Enum):
    """Defect categories"""
    VISUAL = "visual"
    DIMENSIONAL = "dimensional"
    FUNCTIONAL = "functional"
    MATERIAL = "material"
    OTHER = "other"


class Severity(str, Enum):
    """Defect severity levels"""
    MINOR = "minor"
    MAJOR = "major"
    CRITICAL = "critical"


# ============================================================================
# TRACEABILITY
# ============================================================================

class DataSource(BaseModel):
    """Traceability: Source of a data point"""
    file_name: str
    sheet_name: str
    row_numbers: list[int]
    column_name: Optional[str] = None


# ============================================================================
# UPLOAD MODELS
# ============================================================================

class UploadResponse(BaseModel):
    """Response after file upload"""
    upload_id: UUID
    message: str
    files_received: int
    status: ProcessingStatus = ProcessingStatus.UPLOADING


class ProcessingStatusResponse(BaseModel):
    """Response for processing status polling"""
    upload_id: UUID
    status: ProcessingStatus
    progress_percent: int = Field(ge=0, le=100)
    current_stage: str
    files_processed: int
    total_files: int
    errors: list[str] = []
    started_at: datetime
    completed_at: Optional[datetime] = None
    
    # Extended History Fields
    file_name: Optional[str] = None
    file_size_bytes: Optional[int] = None
    records_valid: Optional[int] = None
    records_invalid: Optional[int] = None
    detected_file_type: Optional[FileType] = None


# ============================================================================
# VALIDATION MODELS
# ============================================================================

class ValidationError(BaseModel):
    """A single validation error with traceability"""
    message: str
    severity: str = "error"  # "error" or "warning"
    source: DataSource
    value: Optional[str] = None


class ValidationResult(BaseModel):
    """Result of validation pipeline"""
    valid: bool
    errors: list[ValidationError] = []
    warnings: list[ValidationError] = []
    total_rows: int
    valid_rows: int
    error_rows: int


# ============================================================================
# KPI MODELS
# ============================================================================

class KPIData(BaseModel):
    """Key Performance Indicators"""
    rejection_rate: float = Field(description="Overall rejection rate %")
    rejection_rate_change: float = Field(description="Change from previous period")
    rejection_trend: str = Field(description="up, down, or stable")
    
    yield_rate: float = Field(description="Overall yield rate %")
    
    total_produced: int
    total_dispatched: int
    total_rejected: int
    
    production_date: date
    
    financial_impact: float = Field(description="Financial impact in INR")
    
    watch_batches: int = Field(description="Batches needing attention")
    
    sources: list[DataSource] = Field(default=[], description="Data sources for traceability")


class StageKPI(BaseModel):
    """KPI for a specific inspection stage"""
    stage_code: str
    stage_name: str
    inspected: int
    accepted: int
    rejected: int
    rejection_rate: float
    contribution_percent: float = Field(description="% of total rejections")
    sources: list[DataSource] = []


# ============================================================================
# TREND MODELS
# ============================================================================

class TrendDataPoint(BaseModel):
    """Single data point for trend charts"""
    date: date
    value: float
    label: Optional[str] = None
    sources: list[DataSource] = []


class TrendSeries(BaseModel):
    """A series of trend data"""
    name: str
    data: list[TrendDataPoint]
    color: Optional[str] = None


class TrendChart(BaseModel):
    """Complete trend chart data"""
    title: str
    x_label: str
    y_label: str
    series: list[TrendSeries]


# ============================================================================
# DEFECT ANALYSIS MODELS
# ============================================================================

class DefectData(BaseModel):
    """Defect data for pareto/analysis"""
    defect_code: str
    defect_name: str
    category: DefectCategory
    severity: Severity
    count: int
    percentage: float
    cumulative_percentage: float
    sources: list[DataSource] = []


class ParetoChart(BaseModel):
    """Pareto chart data"""
    title: str
    defects: list[DefectData]
    threshold_80: int = Field(description="Index where 80% cumulative is reached")


class DefectTrend(BaseModel):
    """Defect-specific trend (for Visual Inspection focus)"""
    defect_code: str
    defect_name: str
    monthly_data: list[TrendDataPoint]
    average_rate: float
    trend_direction: str  # "increasing", "decreasing", "stable"


# ============================================================================
# STATS REQUEST/RESPONSE
# ============================================================================

class StatsFilter(BaseModel):
    """Filter for stats query"""
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    stage: Optional[str] = None
    defect_category: Optional[DefectCategory] = None
    month: Optional[str] = None  # Format: "2025-04"


class StatsResponse(BaseModel):
    """Complete stats response"""
    kpis: KPIData
    stage_kpis: list[StageKPI]
    rejection_trend: TrendChart
    defect_pareto: ParetoChart
    visual_defect_trends: list[DefectTrend] = Field(
        default=[], 
        description="Visual Inspection specific defect trends"
    )
    ai_summary: Optional[str] = None
    generated_at: datetime


# ============================================================================
# EXPORT MODELS
# ============================================================================

class ExportFormat(str, Enum):
    """Supported export formats"""
    CSV = "csv"
    PDF = "pdf"
    JSON = "json"


class ExportRequest(BaseModel):
    """Export request"""
    format: ExportFormat
    filters: Optional[StatsFilter] = None
    include_charts: bool = True
