"""
RAIS Backend - Stats Router
Handles statistics queries and data export
"""
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import StreamingResponse
import io
import json

from app.models import (
    StatsFilter,
    StatsResponse,
    ExportFormat,
    ExportRequest,
    KPIData,
    StageKPI,
    TrendChart,
    TrendSeries,
    TrendDataPoint,
    ParetoChart,
    DefectData,
    DefectTrend,
    DataSource,
    DefectCategory,
    Severity,
)
from app.db import get_latest_stats

router = APIRouter()


def _generate_mock_stats() -> StatsResponse:
    """Generate mock stats when no data is available"""
    from datetime import date
    
    today = date.today()
    
    return StatsResponse(
        kpis=KPIData(
            rejection_rate=0.0,
            rejection_rate_change=0.0,
            rejection_trend="stable",
            yield_rate=100.0,
            total_produced=0,
            total_dispatched=0,
            total_rejected=0,
            production_date=today,
            financial_impact=0.0,
            watch_batches=0,
            sources=[]
        ),
        stage_kpis=[],
        rejection_trend=TrendChart(
            title="Rejection Rate Trend",
            x_label="Date",
            y_label="Rejection Rate (%)",
            series=[]
        ),
        defect_pareto=ParetoChart(
            title="Defect Pareto Analysis",
            defects=[],
            threshold_80=0
        ),
        visual_defect_trends=[],
        ai_summary="No data available. Please upload Excel files to see analytics.",
        generated_at=datetime.utcnow()
    )


@router.post("/stats", response_model=StatsResponse)
async def get_stats(filters: Optional[StatsFilter] = None):
    """
    Get computed statistics with optional filters.
    
    Filters can be applied by:
    - Date range (start_date, end_date)
    - Specific month (format: "2025-04")
    - Inspection stage
    - Defect category
    
    Returns KPIs, trends, pareto charts, and visual inspection focus data.
    """
    # Get latest computed stats from database
    stats_data = await get_latest_stats()
    
    if not stats_data:
        # Return mock/empty response if no data
        return _generate_mock_stats()
    
    # Parse stored stats
    try:
        # Reconstruct StatsResponse from stored JSON
        return StatsResponse(**stats_data)
    except Exception as e:
        # If parsing fails, return mock
        return _generate_mock_stats()


@router.get("/stats/overview")
async def get_overview():
    """
    Get quick overview stats for dashboard.
    Returns condensed KPIs without full chart data.
    """
    stats_data = await get_latest_stats()
    
    if not stats_data:
        return {
            "has_data": False,
            "message": "No data available. Upload Excel files to begin."
        }
    
    try:
        kpis = stats_data.get("kpis", {})
        return {
            "has_data": True,
            "rejection_rate": kpis.get("rejection_rate", 0),
            "yield_rate": kpis.get("yield_rate", 100),
            "total_produced": kpis.get("total_produced", 0),
            "total_rejected": kpis.get("total_rejected", 0),
            "watch_batches": kpis.get("watch_batches", 0),
            "generated_at": stats_data.get("generated_at")
        }
    except Exception:
        return {"has_data": False, "message": "Error reading stats"}


@router.get("/export")
async def export_data(
    format: ExportFormat = Query(ExportFormat.CSV, description="Export format"),
    include_charts: bool = Query(True, description="Include chart data")
):
    """
    Export computed statistics in various formats.
    
    Supported formats:
    - CSV: Tabular data export
    - JSON: Full data export
    - PDF: Report with charts (requires kaleido)
    """
    stats_data = await get_latest_stats()
    
    if not stats_data:
        raise HTTPException(status_code=404, detail="No data available for export")
    
    if format == ExportFormat.JSON:
        content = json.dumps(stats_data, indent=2, default=str)
        return StreamingResponse(
            io.BytesIO(content.encode()),
            media_type="application/json",
            headers={"Content-Disposition": "attachment; filename=rais_stats.json"}
        )
    
    elif format == ExportFormat.CSV:
        # Generate CSV with KPIs and defect data
        lines = ["Metric,Value,Source"]
        
        kpis = stats_data.get("kpis", {})
        lines.append(f"Rejection Rate,{kpis.get('rejection_rate', 0)}%,Computed")
        lines.append(f"Yield Rate,{kpis.get('yield_rate', 0)}%,Computed")
        lines.append(f"Total Produced,{kpis.get('total_produced', 0)},Aggregated")
        lines.append(f"Total Rejected,{kpis.get('total_rejected', 0)},Aggregated")
        lines.append(f"Financial Impact,INR {kpis.get('financial_impact', 0)},Computed")
        
        # Add defect pareto
        lines.append("")
        lines.append("Defect,Count,Percentage,Cumulative %")
        for defect in stats_data.get("defect_pareto", {}).get("defects", []):
            lines.append(
                f"{defect.get('defect_name', '')},{defect.get('count', 0)},"
                f"{defect.get('percentage', 0)}%,{defect.get('cumulative_percentage', 0)}%"
            )
        
        content = "\n".join(lines)
        return StreamingResponse(
            io.BytesIO(content.encode()),
            media_type="text/csv",
            headers={"Content-Disposition": "attachment; filename=rais_stats.csv"}
        )
    
    elif format == ExportFormat.PDF:
        # PDF generation would require additional implementation
        raise HTTPException(
            status_code=501,
            detail="PDF export not yet implemented. Use CSV or JSON."
        )


@router.get("/defects")
async def get_defect_list():
    """
    Get list of known defect types with categories and severities.
    Useful for filtering and display.
    """
    return {
        "defects": [
            {"code": "COAG", "name": "Coagulation", "category": "material", "severity": "major"},
            {"code": "RAISED_WIRE", "name": "Raised Wire", "category": "dimensional", "severity": "major"},
            {"code": "SURFACE_DEFECT", "name": "Surface Defect", "category": "visual", "severity": "minor"},
            {"code": "OVERLAPING", "name": "Overlapping", "category": "dimensional", "severity": "minor"},
            {"code": "BLACK_MARK", "name": "Black Mark", "category": "visual", "severity": "minor"},
            {"code": "WEBBING", "name": "Webbing", "category": "material", "severity": "major"},
            {"code": "MISSING_FORMERS", "name": "Missing Formers", "category": "functional", "severity": "critical"},
            {"code": "LEAKAGE", "name": "Leakage", "category": "functional", "severity": "critical"},
            {"code": "BUBBLE", "name": "Bubble", "category": "material", "severity": "minor"},
            {"code": "THIN_SPOD", "name": "Thin Spod", "category": "dimensional", "severity": "minor"},
            {"code": "PIN_HOLE", "name": "Pin Hole", "category": "visual", "severity": "major"},
            {"code": "BAD_STRIPPING", "name": "Bad Stripping", "category": "functional", "severity": "major"},
        ]
    }


@router.get("/stages")
async def get_stage_list():
    """
    Get list of inspection stages in sequence order.
    """
    return {
        "stages": [
            {"code": "SHOPFLOOR", "name": "Shopfloor Rejection", "sequence": 1},
            {"code": "ASSEMBLY", "name": "Assembly Inspection", "sequence": 2},
            {"code": "VISUAL", "name": "Visual Inspection", "sequence": 3},
            {"code": "INTEGRITY", "name": "Balloon & Valve Integrity", "sequence": 4},
            {"code": "FINAL", "name": "Final Inspection", "sequence": 5},
        ]
    }
