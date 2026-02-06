# RAIS Backend

Python FastAPI backend for RAIS Dashboard data processing.

## Quick Start

```bash
# Install dependencies
poetry install

# Run server
poetry run uvicorn app.main:app --reload --port 8000
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/upload` | Upload Excel files |
| GET | `/api/process/{id}` | Poll processing status |
| POST | `/api/stats` | Query statistics |
| GET | `/api/export` | Export data (CSV/JSON) |

## API Docs

- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

## Supported Files

1. YEARLY PRODUCTION COMMULATIVE 2025-26.xlsx
2. COMMULATIVE 2025-26.xlsx
3. ASSEMBLY REJECTION REPORT.xlsx
4. VISUAL INSPECTION REPORT 2025.xlsx
5. BALLOON & VALVE INTEGRITY INSPECTION REPORT FILE 2025.xlsx
6. SHOPFLOOR REJECTION REPORT.xlsx

## Testing

```bash
poetry run pytest tests/ -v
```
