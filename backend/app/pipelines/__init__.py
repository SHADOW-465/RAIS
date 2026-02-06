"""
RAIS Backend - Pipeline Orchestration
Coordinates parsing, validation, and computation pipelines
"""
from uuid import UUID
from datetime import datetime
import asyncio

from app.models import ProcessingStatus, FileType
from app.db import update_session, save_processed_data
from app.pipelines.parser import parse_multiple_files
from app.pipelines.validator import validate_parsed_data
from app.pipelines.computation import compute_statistics


async def process_files(upload_id: UUID, file_paths: list[str]):
    """
    Main processing orchestrator - runs in background task.
    
    Pipeline stages:
    1. PARSING - Parse all Excel files
    2. VALIDATING - Validate data consistency
    3. COMPUTING - Generate statistics
    4. COMPLETED - Save results
    """
    total_files = len(file_paths)
    
    try:
        # Stage 1: Parsing
        await update_session(
            upload_id,
            status=ProcessingStatus.PARSING,
            progress_percent=10,
            current_stage="Parsing Excel files"
        )
        
        # Run parsing (CPU-bound, so run in executor)
        loop = asyncio.get_event_loop()
        parsed_files = await loop.run_in_executor(
            None,
            parse_multiple_files,
            file_paths
        )
        
        # Count parsed files
        files_parsed = sum(
            len([r for r in results if r.success])
            for results in parsed_files.values()
        )
        
        await update_session(
            upload_id,
            progress_percent=40,
            current_stage=f"Parsed {files_parsed}/{total_files} files",
            files_processed=files_parsed
        )
        
        # Save raw parsed data
        raw_data = {
            file_type.value: [
                {
                    "file_name": r.file_name,
                    "success": r.success,
                    "sheets": [
                        {
                            "name": s.name,
                            "headers": s.headers,
                            "row_count": s.row_count
                        }
                        for s in r.sheets
                    ],
                    "errors": r.errors
                }
                for r in results
            ]
            for file_type, results in parsed_files.items()
        }
        await save_processed_data(upload_id, raw_data=raw_data)
        
        # Stage 2: Validation
        await update_session(
            upload_id,
            status=ProcessingStatus.VALIDATING,
            progress_percent=50,
            current_stage="Validating data consistency"
        )
        
        validation_result = await loop.run_in_executor(
            None,
            validate_parsed_data,
            parsed_files
        )
        
        # Check for critical errors
        if not validation_result.valid and validation_result.error_rows > validation_result.total_rows * 0.5:
            # More than 50% errors - fail
            await update_session(
                upload_id,
                status=ProcessingStatus.FAILED,
                progress_percent=100,
                current_stage="Validation failed - too many errors",
                errors=[e.message for e in validation_result.errors[:10]],
                completed_at=datetime.utcnow()
            )
            return
        
        await update_session(
            upload_id,
            progress_percent=70,
            current_stage=f"Validated {validation_result.valid_rows}/{validation_result.total_rows} rows"
        )
        
        # Save validated data summary
        validated_data = {
            "valid": validation_result.valid,
            "total_rows": validation_result.total_rows,
            "valid_rows": validation_result.valid_rows,
            "error_rows": validation_result.error_rows,
            "errors": [
                {
                    "message": e.message,
                    "source": {
                        "file_name": e.source.file_name,
                        "sheet_name": e.source.sheet_name,
                        "row_numbers": e.source.row_numbers
                    }
                }
                for e in validation_result.errors[:20]
            ],
            "warnings": [
                {
                    "message": w.message,
                    "source": {
                        "file_name": w.source.file_name,
                        "sheet_name": w.source.sheet_name,
                        "row_numbers": w.source.row_numbers
                    }
                }
                for w in validation_result.warnings[:20]
            ]
        }
        await save_processed_data(upload_id, validated_data=validated_data)
        
        # Stage 3: Computation
        await update_session(
            upload_id,
            status=ProcessingStatus.COMPUTING,
            progress_percent=80,
            current_stage="Computing statistics and trends"
        )
        
        stats = await loop.run_in_executor(
            None,
            compute_statistics,
            parsed_files
        )
        
        # Convert stats to dict for storage
        stats_dict = stats.model_dump(mode="json")
        await save_processed_data(upload_id, computed_stats=stats_dict)
        
        # Stage 4: Complete
        await update_session(
            upload_id,
            status=ProcessingStatus.COMPLETED,
            progress_percent=100,
            current_stage="Processing complete",
            files_processed=total_files,
            completed_at=datetime.utcnow()
        )
        
    except Exception as e:
        # Handle any unexpected errors
        await update_session(
            upload_id,
            status=ProcessingStatus.FAILED,
            progress_percent=100,
            current_stage=f"Error: {str(e)[:100]}",
            errors=[str(e)],
            completed_at=datetime.utcnow()
        )


# Re-export for convenience
from app.pipelines.parser import (
    parse_excel_file,
    parse_multiple_files,
    detect_file_type,
    ParseResult,
)
from app.pipelines.validator import (
    validate_parsed_data,
    ValidationResult,
)
from app.pipelines.computation import (
    compute_statistics,
)

__all__ = [
    "process_files",
    "parse_excel_file",
    "parse_multiple_files",
    "detect_file_type",
    "ParseResult",
    "validate_parsed_data",
    "ValidationResult",
    "compute_statistics",
]
