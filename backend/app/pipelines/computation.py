"""
RAIS Backend - Computation Pipeline
Computes KPIs, trends, pareto charts from validated data
"""
from datetime import datetime, date
from typing import Optional
from collections import defaultdict

from app.models import (
    FileType,
    DataSource,
    KPIData,
    StageKPI,
    TrendDataPoint,
    TrendSeries,
    TrendChart,
    DefectData,
    ParetoChart,
    DefectTrend,
    StatsResponse,
    DefectCategory,
    Severity,
)
from app.pipelines.parser import ParseResult, excel_serial_to_date


# ============================================================================
# HELPER FUNCTIONS
# ============================================================================

def find_column_value(row: dict, patterns: list[str]) -> tuple[Optional[str], Optional[any]]:
    """Find column matching patterns and return (column_name, value)"""
    for key in row:
        key_upper = key.upper()
        for pattern in patterns:
            if pattern.upper() in key_upper:
                return key, row[key]
    return None, None


def safe_numeric(value) -> float:
    """Convert to numeric, returning 0 for invalid values"""
    if value is None:
        return 0
    try:
        if isinstance(value, (int, float)):
            return abs(float(value))
        if isinstance(value, str):
            cleaned = value.replace(",", "").strip()
            return abs(float(cleaned))
    except (ValueError, TypeError):
        pass
    return 0


def get_month_key(row: dict) -> Optional[str]:
    """Extract month key (YYYY-MM) from row"""
    col, value = find_column_value(row, ["MONTH", "DATE", "PERIOD"])
    
    if value is None:
        return None
    
    # Try to parse as date
    if isinstance(value, (int, float)):
        d = excel_serial_to_date(value)
        if d:
            return d.strftime("%Y-%m")
    elif isinstance(value, (datetime, date)):
        d = value if isinstance(value, date) else value.date()
        return d.strftime("%Y-%m")
    elif isinstance(value, str):
        # Try common formats
        for fmt in ["%B %Y", "%b %Y", "%Y-%m", "%m/%Y"]:
            try:
                parsed = datetime.strptime(value.strip(), fmt)
                return parsed.strftime("%Y-%m")
            except ValueError:
                continue
    
    return None


# ============================================================================
# COST CONFIGURATION
# ============================================================================

COST_PER_REJECTED_UNIT = 365  # INR


# ============================================================================
# AGGREGATION FUNCTIONS
# ============================================================================

class DataAggregator:
    """Aggregates data from parsed files"""
    
    def __init__(self):
        # Production data: month -> {produced, dispatched}
        self.production: dict[str, dict[str, float]] = defaultdict(lambda: {"produced": 0, "dispatched": 0})
        
        # Stage data: stage_code -> month -> {inspected, accepted, rejected}
        self.stages: dict[str, dict[str, dict[str, float]]] = defaultdict(
            lambda: defaultdict(lambda: {"inspected": 0, "accepted": 0, "rejected": 0, "received": 0})
        )
        
        # Defect data: defect_code -> month -> count
        self.defects: dict[str, dict[str, float]] = defaultdict(lambda: defaultdict(float))
        
        # Sources for traceability
        self.sources: list[DataSource] = []
    
    def add_production(self, month: str, produced: float, dispatched: float, source: DataSource):
        self.production[month]["produced"] += produced
        self.production[month]["dispatched"] += dispatched
        self.sources.append(source)
    
    def add_stage_data(
        self,
        stage_code: str,
        month: str,
        inspected: float,
        accepted: float,
        rejected: float,
        received: float,
        source: DataSource
    ):
        self.stages[stage_code][month]["inspected"] += inspected
        self.stages[stage_code][month]["accepted"] += accepted
        self.stages[stage_code][month]["rejected"] += rejected
        self.stages[stage_code][month]["received"] += received
        self.sources.append(source)
    
    def add_defect(self, defect_code: str, month: str, count: float, source: DataSource):
        self.defects[defect_code][month] += count
        self.sources.append(source)


# ============================================================================
# DATA EXTRACTION
# ============================================================================

STAGE_MAPPING = {
    FileType.SHOPFLOOR: "SHOPFLOOR",
    FileType.ASSEMBLY: "ASSEMBLY",
    FileType.VISUAL: "VISUAL",
    FileType.INTEGRITY: "INTEGRITY",
}

# Known defect columns to look for
DEFECT_PATTERNS = [
    "COAG", "RAISED WIRE", "SURFACE", "OVERLAPING", "BLACK MARK", "WEBBING",
    "MISSING", "LEAKAGE", "BUBBLE", "THIN", "DIRTY", "STICKY", "WEAK",
    "WRONG COLOR", "PIN HOLE", "STRIPPING", "BALLOON", "VALVE", "OTHER"
]


def extract_from_production(results: list[ParseResult], aggregator: DataAggregator):
    """Extract production data from production/cumulative files"""
    for result in results:
        for sheet in result.sheets:
            for row in sheet.data:
                month = get_month_key(row)
                if not month:
                    continue
                
                _, produced = find_column_value(row, ["PRODUCTION", "PRODUCED", "PROD QTY"])
                _, dispatched = find_column_value(row, ["DISPATCH", "DISPATCHED"])
                
                source = DataSource(
                    file_name=sheet.file_name,
                    sheet_name=sheet.name,
                    row_numbers=[row.get("_source_row", 0)]
                )
                
                aggregator.add_production(
                    month,
                    safe_numeric(produced),
                    safe_numeric(dispatched),
                    source
                )


def extract_from_inspection(results: list[ParseResult], file_type: FileType, aggregator: DataAggregator):
    """Extract inspection data from stage files"""
    stage_code = STAGE_MAPPING.get(file_type, "UNKNOWN")
    
    for result in results:
        for sheet in result.sheets:
            # Try to determine month from sheet name (e.g., "APRIL 25")
            sheet_month = None
            import re
            month_match = re.search(r"(JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC)[A-Z]*\s*(\d{2,4})", sheet.name.upper())
            if month_match:
                month_abbr = month_match.group(1)[:3]
                year = month_match.group(2)
                if len(year) == 2:
                    year = "20" + year
                month_map = {
                    "JAN": "01", "FEB": "02", "MAR": "03", "APR": "04",
                    "MAY": "05", "JUN": "06", "JUL": "07", "AUG": "08",
                    "SEP": "09", "OCT": "10", "NOV": "11", "DEC": "12"
                }
                sheet_month = f"{year}-{month_map.get(month_abbr, '01')}"
            
            for row in sheet.data:
                month = get_month_key(row) or sheet_month or "2025-04"
                
                _, received = find_column_value(row, ["RECEIVED", "REC", "INPUT"])
                _, inspected = find_column_value(row, ["INSPECTED", "INSP", "CHECKED", "TOTAL"])
                _, accepted = find_column_value(row, ["ACCEPTED", "ACC", "PASSED", "OK"])
                _, rejected = find_column_value(row, ["REJECTED", "REJ", "FAILED", "NG"])
                
                source = DataSource(
                    file_name=sheet.file_name,
                    sheet_name=sheet.name,
                    row_numbers=[row.get("_source_row", 0)]
                )
                
                aggregator.add_stage_data(
                    stage_code,
                    month,
                    safe_numeric(inspected),
                    safe_numeric(accepted),
                    safe_numeric(rejected),
                    safe_numeric(received),
                    source
                )
                
                # Extract defect counts from columns
                for key, value in row.items():
                    if key.startswith("_"):
                        continue
                    
                    # Check if column is a defect type
                    for pattern in DEFECT_PATTERNS:
                        if pattern in key.upper():
                            count = safe_numeric(value)
                            if count > 0:
                                defect_source = DataSource(
                                    file_name=sheet.file_name,
                                    sheet_name=sheet.name,
                                    row_numbers=[row.get("_source_row", 0)],
                                    column_name=key
                                )
                                aggregator.add_defect(pattern, month, count, defect_source)
                            break


# ============================================================================
# KPI COMPUTATION
# ============================================================================

def compute_kpis(aggregator: DataAggregator) -> KPIData:
    """Compute overall KPIs from aggregated data"""
    total_produced = sum(p["produced"] for p in aggregator.production.values())
    total_dispatched = sum(p["dispatched"] for p in aggregator.production.values())
    
    # Total rejected from all stages
    total_rejected = sum(
        stage_data["rejected"]
        for stage_months in aggregator.stages.values()
        for stage_data in stage_months.values()
    )
    
    # Rejection rate
    rejection_rate = (total_rejected / total_produced * 100) if total_produced > 0 else 0
    yield_rate = 100 - rejection_rate
    
    # Get latest month for comparison
    all_months = sorted(aggregator.production.keys())
    if len(all_months) >= 2:
        current_month = all_months[-1]
        prev_month = all_months[-2]
        
        current_prod = aggregator.production[current_month]["produced"]
        current_rej = sum(
            stage_months.get(current_month, {}).get("rejected", 0)
            for stage_months in aggregator.stages.values()
        )
        current_rate = (current_rej / current_prod * 100) if current_prod > 0 else 0
        
        prev_prod = aggregator.production[prev_month]["produced"]
        prev_rej = sum(
            stage_months.get(prev_month, {}).get("rejected", 0)
            for stage_months in aggregator.stages.values()
        )
        prev_rate = (prev_rej / prev_prod * 100) if prev_prod > 0 else 0
        
        rate_change = current_rate - prev_rate
        trend = "up" if rate_change > 0.5 else ("down" if rate_change < -0.5 else "stable")
    else:
        rate_change = 0
        trend = "stable"
    
    # Financial impact
    financial_impact = total_rejected * COST_PER_REJECTED_UNIT
    
    # Production date (latest)
    prod_date = date.today()
    if all_months:
        try:
            prod_date = datetime.strptime(all_months[-1] + "-01", "%Y-%m-%d").date()
        except ValueError:
            pass
    
    # Watch batches (simplified: stages with >10% rejection)
    watch_count = sum(
        1 for stage_months in aggregator.stages.values()
        for month_data in stage_months.values()
        if month_data["inspected"] > 0 and (month_data["rejected"] / month_data["inspected"] * 100) > 10
    )
    
    return KPIData(
        rejection_rate=round(rejection_rate, 2),
        rejection_rate_change=round(rate_change, 2),
        rejection_trend=trend,
        yield_rate=round(yield_rate, 2),
        total_produced=int(total_produced),
        total_dispatched=int(total_dispatched),
        total_rejected=int(total_rejected),
        production_date=prod_date,
        financial_impact=round(financial_impact, 2),
        watch_batches=watch_count,
        sources=aggregator.sources[:10]  # Limit sources for response size
    )


def compute_stage_kpis(aggregator: DataAggregator) -> list[StageKPI]:
    """Compute KPIs per inspection stage"""
    stage_kpis = []
    
    stage_names = {
        "SHOPFLOOR": "Shopfloor Rejection",
        "ASSEMBLY": "Assembly Inspection",
        "VISUAL": "Visual Inspection",
        "INTEGRITY": "Balloon & Valve Integrity",
    }
    
    total_rejected = sum(
        data["rejected"]
        for months in aggregator.stages.values()
        for data in months.values()
    )
    
    for stage_code, months_data in aggregator.stages.items():
        inspected = sum(d["inspected"] for d in months_data.values())
        accepted = sum(d["accepted"] for d in months_data.values())
        rejected = sum(d["rejected"] for d in months_data.values())
        
        rejection_rate = (rejected / inspected * 100) if inspected > 0 else 0
        contribution = (rejected / total_rejected * 100) if total_rejected > 0 else 0
        
        stage_kpis.append(StageKPI(
            stage_code=stage_code,
            stage_name=stage_names.get(stage_code, stage_code),
            inspected=int(inspected),
            accepted=int(accepted),
            rejected=int(rejected),
            rejection_rate=round(rejection_rate, 2),
            contribution_percent=round(contribution, 2)
        ))
    
    # Sort by rejection count
    stage_kpis.sort(key=lambda x: x.rejected, reverse=True)
    
    return stage_kpis


def compute_rejection_trend(aggregator: DataAggregator) -> TrendChart:
    """Compute rejection rate trend over months"""
    months = sorted(aggregator.production.keys())
    
    series_data = []
    for month in months:
        produced = aggregator.production[month]["produced"]
        rejected = sum(
            months_data.get(month, {}).get("rejected", 0)
            for months_data in aggregator.stages.values()
        )
        rate = (rejected / produced * 100) if produced > 0 else 0
        
        try:
            d = datetime.strptime(month + "-15", "%Y-%m-%d").date()
        except ValueError:
            d = date.today()
        
        series_data.append(TrendDataPoint(
            date=d,
            value=round(rate, 2),
            label=month
        ))
    
    return TrendChart(
        title="Monthly Rejection Rate Trend",
        x_label="Month",
        y_label="Rejection Rate (%)",
        series=[TrendSeries(name="Rejection %", data=series_data, color="#ef4444")]
    )


def compute_defect_pareto(aggregator: DataAggregator) -> ParetoChart:
    """Compute defect pareto chart (80/20 analysis)"""
    # Aggregate defects across all months
    defect_totals = {}
    for defect_code, months in aggregator.defects.items():
        defect_totals[defect_code] = sum(months.values())
    
    # Sort by count descending
    sorted_defects = sorted(defect_totals.items(), key=lambda x: x[1], reverse=True)
    
    total = sum(defect_totals.values())
    cumulative = 0
    threshold_80 = 0
    
    defect_data = []
    for idx, (code, count) in enumerate(sorted_defects):
        percentage = (count / total * 100) if total > 0 else 0
        cumulative += percentage
        
        if cumulative <= 80 and threshold_80 == 0:
            threshold_80 = idx
        elif cumulative > 80 and threshold_80 == 0:
            threshold_80 = idx
        
        defect_data.append(DefectData(
            defect_code=code,
            defect_name=code.replace("_", " ").title(),
            category=DefectCategory.OTHER,  # Simplified
            severity=Severity.MINOR,
            count=int(count),
            percentage=round(percentage, 2),
            cumulative_percentage=round(cumulative, 2)
        ))
    
    return ParetoChart(
        title="Defect Pareto Analysis (Top 80%)",
        defects=defect_data,
        threshold_80=threshold_80
    )


def compute_visual_defect_trends(aggregator: DataAggregator) -> list[DefectTrend]:
    """Compute defect-specific trends for Visual Inspection focus"""
    trends = []
    
    # Focus on top defects
    defect_totals = {code: sum(months.values()) for code, months in aggregator.defects.items()}
    top_defects = sorted(defect_totals.items(), key=lambda x: x[1], reverse=True)[:5]
    
    all_months = sorted(set(
        month for months in aggregator.defects.values() for month in months
    ))
    
    for defect_code, _ in top_defects:
        monthly_data = []
        for month in all_months:
            count = aggregator.defects[defect_code].get(month, 0)
            try:
                d = datetime.strptime(month + "-15", "%Y-%m-%d").date()
            except ValueError:
                d = date.today()
            
            monthly_data.append(TrendDataPoint(date=d, value=count, label=month))
        
        # Calculate trend direction
        if len(monthly_data) >= 2:
            first_half = sum(p.value for p in monthly_data[:len(monthly_data)//2])
            second_half = sum(p.value for p in monthly_data[len(monthly_data)//2:])
            if second_half > first_half * 1.1:
                direction = "increasing"
            elif second_half < first_half * 0.9:
                direction = "decreasing"
            else:
                direction = "stable"
        else:
            direction = "stable"
        
        avg_rate = sum(p.value for p in monthly_data) / len(monthly_data) if monthly_data else 0
        
        trends.append(DefectTrend(
            defect_code=defect_code,
            defect_name=defect_code.replace("_", " ").title(),
            monthly_data=monthly_data,
            average_rate=round(avg_rate, 2),
            trend_direction=direction
        ))
    
    return trends


# ============================================================================
# MAIN COMPUTATION
# ============================================================================

def compute_statistics(parsed_files: dict[FileType, list[ParseResult]]) -> StatsResponse:
    """
    Main computation function - generates all statistics from parsed data.
    """
    aggregator = DataAggregator()
    
    # Extract data from each file type
    for file_type in [FileType.PRODUCTION_CUMULATIVE, FileType.CUMULATIVE]:
        if file_type in parsed_files:
            extract_from_production(parsed_files[file_type], aggregator)
    
    for file_type in [FileType.SHOPFLOOR, FileType.ASSEMBLY, FileType.VISUAL, FileType.INTEGRITY]:
        if file_type in parsed_files:
            extract_from_inspection(parsed_files[file_type], file_type, aggregator)
    
def generate_business_summary(kpis: KPIData, stage_kpis: list[StageKPI], defect_pareto: ParetoChart) -> str:
    """Generate a narrative summary for the GM"""
    rejection_pct = kpis.rejection_rate
    financial_loss = kpis.financial_impact
    yield_pct = kpis.yield_rate
    
    summary = f"Summary: Yield is {yield_pct}%, Rejection {rejection_pct}%. "
    summary += f"Financial loss: ₹{financial_loss:,.0f}. "
    
    if stage_kpis:
        top_stage = stage_kpis[0]
        summary += f"Focus on {top_stage.stage_name} ({top_stage.rejection_rate}%). "
        
    if defect_pareto.defects:
        top_defect = defect_pareto.defects[0]
        summary += f"Fix '{top_defect.defect_name}' to recover {top_defect.percentage}%."
    
    if kpis.rejection_trend == "up":
        summary += " ⚠️ Trending UP."
    elif kpis.rejection_trend == "down":
        summary += " ✓ Trending DOWN."
        
    return summary


def compute_statistics(parsed_files: dict[FileType, list[ParseResult]]) -> StatsResponse:
    """
    Main computation function - generates all statistics from parsed data.
    """
    aggregator = DataAggregator()
    
    # Extract data from each file type
    for file_type in [FileType.PRODUCTION_CUMULATIVE, FileType.CUMULATIVE]:
        if file_type in parsed_files:
            extract_from_production(parsed_files[file_type], aggregator)
    
    for file_type in [FileType.SHOPFLOOR, FileType.ASSEMBLY, FileType.VISUAL, FileType.INTEGRITY]:
        if file_type in parsed_files:
            extract_from_inspection(parsed_files[file_type], file_type, aggregator)
    
    # Compute all statistics
    kpis = compute_kpis(aggregator)
    stage_kpis = compute_stage_kpis(aggregator)
    rejection_trend = compute_rejection_trend(aggregator)
    defect_pareto = compute_defect_pareto(aggregator)
    visual_trends = compute_visual_defect_trends(aggregator)
    
    # Generate AI summary
    ai_summary = generate_business_summary(kpis, stage_kpis, defect_pareto)
    
    return StatsResponse(
        kpis=kpis,
        stage_kpis=stage_kpis,
        rejection_trend=rejection_trend,
        defect_pareto=defect_pareto,
        visual_defect_trends=visual_trends,
        ai_summary=ai_summary,
        generated_at=datetime.utcnow()
    )
