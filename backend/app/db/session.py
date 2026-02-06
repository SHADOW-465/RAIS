"""
RAIS Backend - Database Session Management
SQLite for processing state and session storage
"""
import aiosqlite
from pathlib import Path
from datetime import datetime
from uuid import UUID
import json

from app.config import settings
from app.models import ProcessingStatus

# Database path
DB_PATH = Path("./rais_sessions.db")


async def init_db():
    """Initialize the SQLite database with required tables"""
    async with aiosqlite.connect(DB_PATH) as db:
        # Upload sessions table
        await db.execute("""
            CREATE TABLE IF NOT EXISTS upload_sessions (
                upload_id TEXT PRIMARY KEY,
                status TEXT NOT NULL DEFAULT 'uploading',
                progress_percent INTEGER DEFAULT 0,
                current_stage TEXT DEFAULT 'Waiting',
                files_received INTEGER DEFAULT 0,
                files_processed INTEGER DEFAULT 0,
                errors TEXT DEFAULT '[]',
                started_at TEXT NOT NULL,
                completed_at TEXT,
                file_paths TEXT DEFAULT '[]',
                created_at TEXT DEFAULT CURRENT_TIMESTAMP
            )
        """)
        
        # Processed data table (stores computed stats as JSON)
        await db.execute("""
            CREATE TABLE IF NOT EXISTS processed_data (
                upload_id TEXT PRIMARY KEY,
                raw_data TEXT,
                validated_data TEXT,
                computed_stats TEXT,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (upload_id) REFERENCES upload_sessions(upload_id)
            )
        """)
        
        await db.commit()


async def create_session(upload_id: UUID, files_received: int) -> dict:
    """Create a new upload session"""
    async with aiosqlite.connect(DB_PATH) as db:
        now = datetime.utcnow().isoformat()
        await db.execute(
            """
            INSERT INTO upload_sessions 
            (upload_id, status, files_received, started_at)
            VALUES (?, ?, ?, ?)
            """,
            (str(upload_id), ProcessingStatus.UPLOADING.value, files_received, now)
        )
        await db.commit()
        
    return {
        "upload_id": upload_id,
        "status": ProcessingStatus.UPLOADING,
        "files_received": files_received,
        "started_at": now
    }


async def update_session(
    upload_id: UUID,
    status: ProcessingStatus = None,
    progress_percent: int = None,
    current_stage: str = None,
    files_processed: int = None,
    errors: list[str] = None,
    completed_at: datetime = None
):
    """Update session status"""
    async with aiosqlite.connect(DB_PATH) as db:
        updates = []
        params = []
        
        if status is not None:
            updates.append("status = ?")
            params.append(status.value)
        if progress_percent is not None:
            updates.append("progress_percent = ?")
            params.append(progress_percent)
        if current_stage is not None:
            updates.append("current_stage = ?")
            params.append(current_stage)
        if files_processed is not None:
            updates.append("files_processed = ?")
            params.append(files_processed)
        if errors is not None:
            updates.append("errors = ?")
            params.append(json.dumps(errors))
        if completed_at is not None:
            updates.append("completed_at = ?")
            params.append(completed_at.isoformat())
        
        if updates:
            params.append(str(upload_id))
            await db.execute(
                f"UPDATE upload_sessions SET {', '.join(updates)} WHERE upload_id = ?",
                params
            )
            await db.commit()


async def get_session(upload_id: UUID) -> dict | None:
    """Get session by ID"""
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        async with db.execute(
            "SELECT * FROM upload_sessions WHERE upload_id = ?",
            (str(upload_id),)
        ) as cursor:
            row = await cursor.fetchone()
            if row:
                return {
                    "upload_id": UUID(row["upload_id"]),
                    "status": ProcessingStatus(row["status"]),
                    "progress_percent": row["progress_percent"],
                    "current_stage": row["current_stage"],
                    "files_received": row["files_received"],
                    "files_processed": row["files_processed"],
                    "errors": json.loads(row["errors"]),
                    "started_at": datetime.fromisoformat(row["started_at"]),
                    "completed_at": datetime.fromisoformat(row["completed_at"]) if row["completed_at"] else None
                }
            return None


async def save_processed_data(upload_id: UUID, raw_data: dict = None, validated_data: dict = None, computed_stats: dict = None):
    """Save processed data for a session"""
    async with aiosqlite.connect(DB_PATH) as db:
        # Check if exists
        async with db.execute(
            "SELECT upload_id FROM processed_data WHERE upload_id = ?",
            (str(upload_id),)
        ) as cursor:
            exists = await cursor.fetchone()
        
        if exists:
            updates = []
            params = []
            if raw_data is not None:
                updates.append("raw_data = ?")
                params.append(json.dumps(raw_data, default=str))
            if validated_data is not None:
                updates.append("validated_data = ?")
                params.append(json.dumps(validated_data, default=str))
            if computed_stats is not None:
                updates.append("computed_stats = ?")
                params.append(json.dumps(computed_stats, default=str))
            
            if updates:
                params.append(str(upload_id))
                await db.execute(
                    f"UPDATE processed_data SET {', '.join(updates)} WHERE upload_id = ?",
                    params
                )
        else:
            await db.execute(
                """
                INSERT INTO processed_data (upload_id, raw_data, validated_data, computed_stats)
                VALUES (?, ?, ?, ?)
                """,
                (
                    str(upload_id),
                    json.dumps(raw_data, default=str) if raw_data else None,
                    json.dumps(validated_data, default=str) if validated_data else None,
                    json.dumps(computed_stats, default=str) if computed_stats else None
                )
            )
        
        await db.commit()


async def get_processed_data(upload_id: UUID) -> dict | None:
    """Get processed data by upload ID"""
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        async with db.execute(
            "SELECT * FROM processed_data WHERE upload_id = ?",
            (str(upload_id),)
        ) as cursor:
            row = await cursor.fetchone()
            if row:
                return {
                    "raw_data": json.loads(row["raw_data"]) if row["raw_data"] else None,
                    "validated_data": json.loads(row["validated_data"]) if row["validated_data"] else None,
                    "computed_stats": json.loads(row["computed_stats"]) if row["computed_stats"] else None
                }
            return None


async def get_latest_stats() -> dict | None:
    """Get the most recent computed stats"""
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        async with db.execute(
            """
            SELECT computed_stats FROM processed_data 
            WHERE computed_stats IS NOT NULL 
            ORDER BY created_at DESC 
            LIMIT 1
            """
        ) as cursor:
            row = await cursor.fetchone()
            if row and row["computed_stats"]:
                return json.loads(row["computed_stats"])
            return None


async def reset_db():
    """Clear all data from the database"""
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute("DELETE FROM processed_data")
        await db.execute("DELETE FROM upload_sessions")
        await db.commit()
