# Excel Upload Processing

**Purpose:** Handle Excel file uploads with schema detection and validation

## Structure

```
src/lib/upload/
├── excelProcessor.ts      # Main processor (253 lines)
├── schemaDetector.ts      # Column mapping detection (139 lines)
├── validator.ts           # Data validation (113 lines)
├── types.ts               # Upload type definitions
└── index.ts               # Public exports
```

## Workflow

1. **Upload** (`/api/upload/route.ts`) → Supabase Storage
2. **Schema Detection** (`schemaDetector.ts`) → Map columns to fields
3. **Validation** (`validator.ts`) → Check data quality
4. **Processing** (`excelProcessor.ts`) → Insert to database

## Key Components

### SchemaDetector
- Reads Excel headers
- Suggests field mappings using fuzzy matching
- Returns confidence scores (0-100%)
- Handles multiple sheet formats

### ExcelProcessor
- Parses Excel with `xlsx` library
- Applies column mappings
- Validates each row
- Bulk inserts to database
- Tracks progress and errors

### Validator
- Type checking (dates, numbers, strings)
- Required field validation
- Range validation (quantities, costs)
- Custom business rules

## Usage

```typescript
import { excelProcessor } from '@/lib/upload';

const result = await excelProcessor.process(buffer, mappings, {
  skipHeaderRows: 1,
  uploadedFileId: fileId,
});

// Result: { success, recordsProcessed, recordsFailed, errors }
```

## File Format Support

- **.xlsx** - Modern Excel format
- **.xls** - Legacy Excel format
- **Max size:** 50MB
- **Processing:** Server-side only

## Anti-Patterns

- ❌ Never process Excel on client-side (security)
- ❌ Never trust header row detection blindly
- ❌ Never skip validation before database insert
- ✅ Always handle validation errors gracefully
- ✅ Always track upload status in database

## Integration Points

- **Database:** Uses `rejectionRepository.bulkInsert()`
- **Storage:** Supabase Storage bucket "uploads"
- **API:** `/api/upload/route.ts` handles HTTP layer
