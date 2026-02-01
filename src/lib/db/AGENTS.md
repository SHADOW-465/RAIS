# Database Layer (Supabase)

**Purpose:** Database access layer with Supabase client and repositories

## Structure

```
src/lib/db/
├── repositories/          # Data access objects
│   ├── rejectionRepository.ts    # Main data access (362 lines)
│   ├── supplierRepository.ts     # Supplier queries
│   ├── defectTypeRepository.ts   # Defect type CRUD
│   ├── lineRepository.ts         # Production lines
│   ├── uploadRepository.ts       # File upload tracking
│   └── index.ts                  # Exports
├── supabaseClient.ts      # Supabase client setup
├── database.types.ts      # TypeScript types (296 lines)
├── types.ts               # Domain entity types
└── connection.ts          # Legacy pg connection (deprecated)
```

## Key Patterns

### Repository Pattern
```typescript
// All repositories use supabaseAdmin for server-side
import { supabaseAdmin } from '../supabaseClient';

// Example query pattern
const { data, error } = await supabaseAdmin
  .from('table')
  .select('*')
  .eq('id', id);

if (error) throw error;
return data;
```

### Foreign Relations
Supabase returns foreign relations as **arrays**. Always handle this:
```typescript
const line = Array.isArray(row.line) ? row.line[0] : row.line;
```

### RPC Fallback
Complex aggregations use RPC with application-layer fallback:
```typescript
const { data, error } = await supabaseAdmin.rpc('function_name', params);
if (error) return fallbackImplementation();
```

## Critical Files

| File | Lines | Purpose |
|------|-------|---------|
| rejectionRepository.ts | 362 | Core rejection data access with aggregations |
| database.types.ts | 296 | TypeScript types for all tables |
| supabaseClient.ts | 50 | Client + admin instances |

## Migrations

Location: `../../supabase/migrations/001_functions.sql`

Required functions:
- `get_aggregated_stats()` - Time-series aggregation
- `get_top_defects()` - Defect rankings
- `get_supplier_stats()` - Supplier analytics

## Anti-Patterns

- ❌ Never use `pg` (node-postgres) directly - use `supabaseAdmin`
- ❌ Never skip error handling on Supabase queries
- ❌ Never forget to handle array-wrapped foreign relations
- ✅ Always use TypeScript types from `database.types.ts`

## Where to Add

- New table → Add to `database.types.ts` first
- New queries → Add to appropriate repository
- Complex aggregations → Create SQL function + RPC
