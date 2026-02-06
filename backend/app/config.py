"""
RAIS Backend Configuration
"""
from pydantic_settings import BaseSettings, SettingsConfigDict
from pathlib import Path


class Settings(BaseSettings):
    """Application settings with environment variable support"""
    
    # API Settings
    api_title: str = "RAIS Backend API"
    api_version: str = "1.0.0"
    api_prefix: str = "/api"
    
    # CORS Settings
    cors_origins: list[str] = ["http://localhost:3000", "http://127.0.0.1:3000"]
    
    # File Upload Settings
    max_file_size_mb: int = 10
    upload_dir: Path = Path("./uploads")
    allowed_extensions: set[str] = {".xlsx", ".xls"}
    
    # Database Settings
    database_url: str = "sqlite+aiosqlite:///./rais_sessions.db"
    
    # Processing Settings
    max_rows_per_file: int = 50000
    processing_timeout_seconds: int = 300
    
    # Expected file patterns for validation
    expected_files: list[str] = [
        "YEARLY PRODUCTION COMMULATIVE",
        "COMMULATIVE",
        "ASSEMBLY REJECTION REPORT",
        "VISUAL INSPECTION REPORT",
        "BALLOON & VALVE INTEGRITY",
        "SHOPFLOOR REJECTION REPORT"
    ]
    
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8"
    )


settings = Settings()

# Ensure upload directory exists
settings.upload_dir.mkdir(parents=True, exist_ok=True)
