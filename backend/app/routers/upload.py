"""
RAIS Backend - Upload Router
Handles file uploads and processing status polling
"""
from uuid import uuid4, UUID
from datetime import datetime
from pathlib import Path
import shutil

from fastapi import APIRouter, UploadFile, File, BackgroundTasks, HTTPException

from app.config import settings
from app.models import (
    UploadResponse,
    ProcessingStatusResponse,
    ProcessingStatus,
)
from app.db import create_session, update_session, get_session
from app.pipelines import process_files

router = APIRouter()


@router.post("/upload", response_model=UploadResponse)
async def upload_files(
    background_tasks: BackgroundTasks,
    files: list[UploadFile] = File(..., description="Excel files to upload")
):
    """
    Upload Excel files for processing.
    
    Accepts up to 6 Excel files matching the expected RAIS report formats:
    - YEARLY PRODUCTION COMMULATIVE
    - COMMULATIVE
    - ASSEMBLY REJECTION REPORT
    - VISUAL INSPECTION REPORT
    - BALLOON & VALVE INTEGRITY INSPECTION REPORT
    - SHOPFLOOR REJECTION REPORT
    
    Returns an upload_id for polling processing status.
    """
    # Validate number of files
    if len(files) == 0:
        raise HTTPException(status_code=400, detail="No files provided")
    
    if len(files) > 6:
        raise HTTPException(status_code=400, detail="Maximum 6 files allowed")
    
    # Validate file extensions
    for file in files:
        ext = Path(file.filename or "").suffix.lower()
        if ext not in settings.allowed_extensions:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid file extension: {ext}. Allowed: {settings.allowed_extensions}"
            )
    
    # Generate upload ID
    upload_id = uuid4()
    upload_dir = settings.upload_dir / str(upload_id)
    upload_dir.mkdir(parents=True, exist_ok=True)
    
    # Save files to disk
    saved_files = []
    try:
        for file in files:
            file_path = upload_dir / file.filename
            with open(file_path, "wb") as buffer:
                shutil.copyfileobj(file.file, buffer)
            saved_files.append(str(file_path))
    except Exception as e:
        # Cleanup on failure
        shutil.rmtree(upload_dir, ignore_errors=True)
        raise HTTPException(status_code=500, detail=f"Failed to save files: {str(e)}")
    
    # Create session in database
    await create_session(upload_id, len(files))
    
    # Start background processing
    background_tasks.add_task(process_files, upload_id, saved_files)
    
    return UploadResponse(
        upload_id=upload_id,
        message=f"Upload successful. Processing {len(files)} files.",
        files_received=len(files),
        status=ProcessingStatus.UPLOADING
    )


@router.get("/process/{upload_id}", response_model=ProcessingStatusResponse)
async def get_processing_status(upload_id: UUID):
    """
    Poll processing status for an upload.
    
    Returns current status, progress, and any errors.
    Use this endpoint to track file processing progress.
    """
    session = await get_session(upload_id)
    
    if not session:
        raise HTTPException(status_code=404, detail="Upload not found")
    
    return ProcessingStatusResponse(
        upload_id=session["upload_id"],
        status=session["status"],
        progress_percent=session["progress_percent"],
        current_stage=session["current_stage"],
        files_processed=session["files_processed"],
        total_files=session["files_received"],
        errors=session["errors"],
        started_at=session["started_at"],
        completed_at=session["completed_at"]
    )


@router.delete("/upload/{upload_id}")
async def cancel_upload(upload_id: UUID):
    """
    Cancel an upload and cleanup files.
    """
    session = await get_session(upload_id)
    
    if not session:
        raise HTTPException(status_code=404, detail="Upload not found")
    
    # Cleanup files
    upload_dir = settings.upload_dir / str(upload_id)
    if upload_dir.exists():
        shutil.rmtree(upload_dir, ignore_errors=True)
    
    # Update status
    await update_session(
        upload_id,
        status=ProcessingStatus.FAILED,
        current_stage="Cancelled",
        completed_at=datetime.utcnow()
    )
    
    return {"message": "Upload cancelled", "upload_id": str(upload_id)}


@router.get("/uploads", response_model=list[ProcessingStatusResponse])
async def get_upload_history():
    """
    Get history of recent uploads.
    """
    from app.db import get_all_sessions
    sessions = await get_all_sessions()
    return [
        ProcessingStatusResponse(
            upload_id=s["upload_id"],
            status=s["status"],
            progress_percent=s["progress_percent"],
            current_stage=s["current_stage"],
            files_processed=s["files_processed"],
            total_files=s["files_received"],
            errors=s["errors"],
            started_at=s["started_at"],
            completed_at=s["completed_at"],
            file_name=s.get("file_name"),
            file_size_bytes=s.get("file_size_bytes"),
            records_valid=s.get("records_valid"),
            records_invalid=s.get("records_invalid"),
            detected_file_type=s.get("detected_file_type")
        )
        for s in sessions
    ]

@router.get("/uploads/{upload_id}/data")
async def get_upload_data(upload_id: UUID):
    """
    Get processed data for a specific upload.
    Returns raw data and validated data record counts/details.
    """
    from app.db import get_processed_data
    data = await get_processed_data(upload_id)
    
    if not data:
        raise HTTPException(status_code=404, detail="Upload data not found")
        
    return data

@router.post("/reset")
async def reset_database():
    """Clear all processed data and session history"""
    from app.db import reset_db
    await reset_db()
    # Also cleanup upload files
    import shutil
    if settings.upload_dir.exists():
        for item in settings.upload_dir.iterdir():
            if item.is_dir():
                shutil.rmtree(item, ignore_errors=True)
    return {"message": "Database and files cleared successfully"}
