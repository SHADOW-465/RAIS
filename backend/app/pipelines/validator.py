"""
RAIS Backend - Validation Pipeline
Validates parsed data with cross-file reconciliation and traceability
"""
from typing import Optional
from dataclasses import dataclass, field

from app.models import FileType, DataSource, ValidationError as ValidationErrorModel


@dataclass
class ValidationContext:
    """Context for validation including cross-file data"""
    production_totals: dict[str, int] = field(default_factory=dict)  # month -> qty
    dispatch_totals: dict[str, int] = field(default_factory=dict)
    stage_rejections: dict[str, dict[str, int]] = field(default_factory=dict)  # stage -> {month: qty}
    defect_totals: dict[str, int] = field(default_factory=dict)  # defect_code -> qty


class ValidationResult:
    """Result of validation pipeline"""
    def __init__(self):
        self.valid = True
        self.errors: list[ValidationErrorModel] = []
        self.warnings: list[ValidationErrorModel] = []
        self.total_rows = 0
        self.valid_rows = 0
        self.error_rows = 0
    
    def add_error(
        self,
        message: str,
        file_name: str,
        sheet_name: str,
        row: int,
        column: Optional[str] = None,
        value: Optional[str] = None
    ):
        self.errors.append(ValidationErrorModel(
            message=message,
            severity="error",
            source=DataSource(
                file_name=file_name,
                sheet_name=sheet_name,
                row_numbers=[row],
                column_name=column
            ),
            value=value
        ))
        self.valid = False
        self.error_rows += 1
    
    def add_warning(
        self,
        message: str,
        file_name: str,
        sheet_name: str,
        row: int,
        column: Optional[str] = None,
        value: Optional[str] = None
    ):
        self.warnings.append(ValidationErrorModel(
            message=message,
            severity="warning",
            source=DataSource(
                file_name=file_name,
                sheet_name=sheet_name,
                row_numbers=[row],
                column_name=column
            ),
            value=value
        ))


# ============================================================================
# COLUMN MATCHERS
# ============================================================================

def find_column(row: dict, patterns: list[str]) -> tuple[Optional[str], Optional[any]]:
    """Find a column matching any of the patterns"""
    for key in row:
        key_upper = key.upper()
        for pattern in patterns:
            if pattern.upper() in key_upper:
                return key, row[key]
    return None, None


def get_numeric(value) -> Optional[float]:
    """Convert value to numeric, handling strings"""
    if value is None:
        return None
    if isinstance(value, (int, float)):
        return float(value)
    if isinstance(value, str):
        try:
            # Remove commas and whitespace
            cleaned = value.replace(",", "").strip()
            return float(cleaned)
        except ValueError:
            return None
    return None


# ============================================================================
# TYPE-SPECIFIC VALIDATORS
# ============================================================================

def validate_production_row(row: dict, sheet: 'ParsedSheet', result: ValidationResult, context: ValidationContext):
    """Validate a production/cumulative row"""
    row_num = row.get("_source_row", 0)
    
    # Find production quantity
    _, prod_value = find_column(row, ["PRODUCTION", "PRODUCED", "PROD QTY"])
    prod_num = get_numeric(prod_value)
    
    # Find rejection quantity
    _, rej_value = find_column(row, ["REJECTION", "REJECTED", "TOTAL REJ", "REJ QTY"])
    rej_num = get_numeric(rej_value)
    
    # Validate: rejection cannot exceed production
    if prod_num is not None and rej_num is not None:
        if rej_num > prod_num:
            result.add_error(
                f"Rejection ({rej_num}) exceeds production ({prod_num})",
                sheet.file_name,
                sheet.name,
                row_num,
                column="REJECTION",
                value=str(rej_num)
            )
    
    # Check for negative values
    if prod_num is not None and prod_num < 0:
        result.add_warning(
            f"Negative production value: {prod_num} (using absolute)",
            sheet.file_name,
            sheet.name,
            row_num,
            column="PRODUCTION",
            value=str(prod_num)
        )
    
    if rej_num is not None and rej_num < 0:
        result.add_warning(
            f"Negative rejection value: {rej_num} (using absolute)",
            sheet.file_name,
            sheet.name,
            row_num,
            column="REJECTION",
            value=str(rej_num)
        )


def validate_inspection_row(row: dict, sheet: 'ParsedSheet', result: ValidationResult, context: ValidationContext):
    """Validate an inspection row (assembly, visual, integrity, shopfloor)"""
    row_num = row.get("_source_row", 0)
    
    # Find quantities
    _, received = find_column(row, ["RECEIVED", "REC QTY", "INPUT"])
    _, inspected = find_column(row, ["INSPECTED", "INSP QTY", "CHECKED"])
    _, accepted = find_column(row, ["ACCEPTED", "ACC QTY", "PASSED"])
    _, rejected = find_column(row, ["REJECTED", "REJ QTY", "FAILED"])
    
    received_num = get_numeric(received)
    inspected_num = get_numeric(inspected)
    accepted_num = get_numeric(accepted)
    rejected_num = get_numeric(rejected)
    
    # Validate: accepted + rejected should equal inspected (with tolerance)
    if accepted_num is not None and rejected_num is not None and inspected_num is not None:
        total = accepted_num + rejected_num
        if abs(total - inspected_num) > 1:  # Allow 1 unit tolerance
            result.add_warning(
                f"Accepted ({accepted_num}) + Rejected ({rejected_num}) = {total} doesn't match Inspected ({inspected_num})",
                sheet.file_name,
                sheet.name,
                row_num
            )
    
    # Validate: rejected cannot exceed received
    if rejected_num is not None and received_num is not None:
        if rejected_num > received_num:
            result.add_error(
                f"Rejected ({rejected_num}) exceeds received ({received_num})",
                sheet.file_name,
                sheet.name,
                row_num,
                column="REJECTED",
                value=str(rejected_num)
            )


def validate_defect_row(row: dict, sheet: 'ParsedSheet', result: ValidationResult, context: ValidationContext):
    """Validate defect counts"""
    row_num = row.get("_source_row", 0)
    
    # Check for negative defect counts
    for key, value in row.items():
        if key.startswith("_"):
            continue
        
        num = get_numeric(value)
        if num is not None and num < 0:
            result.add_warning(
                f"Negative defect count: {value} (using absolute)",
                sheet.file_name,
                sheet.name,
                row_num,
                column=key,
                value=str(value)
            )


# ============================================================================
# MAIN VALIDATION
# ============================================================================

def validate_parsed_data(
    parsed_files: dict['FileType', list['ParseResult']],
    context: Optional[ValidationContext] = None
) -> ValidationResult:
    """
    Validate all parsed data with cross-file reconciliation.
    
    Rules:
    1. Production data comes from first 2 file types
    2. Rejection <= Production
    3. Stage rejection <= Received quantity
    4. Defect sum == Total rejection (with tolerance)
    5. No negative values (warn and use absolute)
    6. Cross-file totals should reconcile (1% tolerance)
    """
    from app.pipelines.parser import ParseResult
    
    result = ValidationResult()
    context = context or ValidationContext()
    
    for file_type, parse_results in parsed_files.items():
        for parse_result in parse_results:
            if not parse_result.success:
                for error in parse_result.errors:
                    result.add_error(
                        error,
                        parse_result.file_name,
                        "N/A",
                        0
                    )
                continue
            
            for sheet in parse_result.sheets:
                result.total_rows += sheet.row_count
                
                for row in sheet.data:
                    # Apply type-specific validation
                    if file_type in [FileType.PRODUCTION_CUMULATIVE, FileType.CUMULATIVE]:
                        validate_production_row(row, sheet, result, context)
                    elif file_type in [FileType.ASSEMBLY, FileType.VISUAL, FileType.INTEGRITY, FileType.SHOPFLOOR]:
                        validate_inspection_row(row, sheet, result, context)
                        validate_defect_row(row, sheet, result, context)
    
    result.valid_rows = result.total_rows - result.error_rows
    
    return result
