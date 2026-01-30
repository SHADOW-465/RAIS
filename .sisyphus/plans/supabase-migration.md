# Next.js Supabase Migration Plan

## TL;DR

> **Objective**: Migrate database layer from PostgreSQL+TimescaleDB (`pg` library) to Supabase (`@supabase/supabase-js`), replacing local file storage with Supabase Storage while maintaining all existing functionality.
> 
> **Deliverables**:
> - Supabase client configuration and connection handling
> - 5 migrated repository classes with Supabase queries
> - Supabase Storage integration for file uploads
> - Updated environment configuration
> - Test coverage for critical migration paths
> 
> **Estimated Effort**: **Large** (15-20 tasks, ~8-12 hours of execution time)
> **Parallel Execution**: **YES** - 4 execution waves with ~40% speedup through parallelization
> **Critical Path**: Wave 1 (Setup) → Wave 2 (Core) → Wave 4 (Testing)

---

## Context

### Original Request
Migrate a Next.js 16 + React 19 + TypeScript application from PostgreSQL+TimescaleDB to Supabase. Keep all existing functionality while removing TimescaleDB-specific features.

### Current Architecture Analysis
- **Database**: Uses `pg` (node-postgres) with Pool connection (`src/lib/db/connection.ts`)
- **Repositories**: 5 repositories using raw SQL queries with complex JOINs and aggregations
- **TimescaleDB Features**: `time_bucket()` function for time-series aggregation in `rejectionRepository.getAggregatedStats()`
- **File Storage**: Local filesystem via `fs.writeFile()` in `src/app/api/upload/route.ts`
- **API Routes**: 4 API routes consuming repositories (`trends`, `pareto`, `suppliers`, `upload`)

### Key Technical Challenges
1. **TimescaleDB `time_bucket()` replacement**: Currently used for grouping data by day/week/month
2. **Window functions**: `OVER()` clause in `getTopDefects()` for percentage calculations
3. **Complex JOINs**: Multi-table JOINs in `getByDateRange()` with dynamic filters
4. **Transaction handling**: `BEGIN/COMMIT/ROLLBACK` pattern in `bulkInsert()`
5. **Dynamic SQL**: Partial UPDATE queries in `uploadRepository`

### Migration Strategy Decision

**TimescaleDB Replacement Approach**: Application-layer bucketing using `date-fns`
- Pros: No PostgreSQL extensions needed, works with standard Supabase
- Cons: More data transferred from DB, client-side processing
- Alternative: PostgreSQL `date_trunc()` function (less flexible than time_bucket)

**Complex Query Strategy**: Decompose window functions and aggregations
- Replace window functions with application-level calculations
- Use Supabase `.select()` with PostgREST syntax
- Keep data types and return signatures identical

---

## Task Dependency Graph

| Task | Depends On | Reason |
|------|------------|--------|
| 1.1 | None | Install dependencies, no prerequisites |
| 1.2 | None | Setup env vars, independent of code changes |
| 1.3 | None | Create Supabase client module |
| 1.4 | None | Setup test infrastructure |
| 1.5 | 1.1, 1.2, 1.3 | Create Supabase Storage bucket depends on client + env |
| 2.1 | 1.3 | Migrate connection.ts, needs Supabase client |
| 2.2 | 1.3 | Migrate defectTypeRepository, needs Supabase client |
| 2.3 | 1.3 | Migrate lineRepository, needs Supabase client |
| 2.4 | 1.3 | Migrate supplierRepository, needs Supabase client |
| 2.5 | 1.3 | Migrate uploadRepository, needs Supabase client |
| 2.6 | 1.3 | Migrate rejectionRepository (complex), needs Supabase client |
| 3.1 | 1.5, 2.5 | Migrate upload API route, needs Storage + uploadRepository |
| 3.2 | 2.1, 2.2, 2.3, 2.4, 2.5, 2.6 | Update config.ts to use Supabase, needs all repositories |
| 4.1 | 2.2 | Write tests for defectTypeRepository |
| 4.2 | 2.3 | Write tests for lineRepository |
| 4.3 | 2.4 | Write tests for supplierRepository |
| 4.4 | 2.5 | Write tests for uploadRepository |
| 4.5 | 2.6 | Write tests for rejectionRepository |
| 4.6 | 4.1, 4.2, 4.3, 4.4, 4.5 | Integration test for upload flow |
| 4.7 | 2.6 | Verify analytics API routes (trends, pareto) |
| 4.8 | 3.1 | Verify upload API with Supabase Storage |
| 4.9 | 4.6, 4.7, 4.8 | End-to-end smoke test |

---

## Parallel Execution Graph

```
Wave 1 (Setup - Start Immediately):
├── Task 1.1: Install Supabase dependencies (@supabase/supabase-js)
├── Task 1.2: Update environment configuration
├── Task 1.3: Create Supabase client module
├── Task 1.4: Setup test infrastructure
└── Task 1.5: Configure Supabase Storage bucket (depends on 1.1, 1.2, 1.3)

Wave 2 (Core Repository Migrations - After Wave 1):
├── Task 2.1: Migrate connection.ts (foundational, others depend)
├── Task 2.2: Migrate defectTypeRepository (simple CRUD)
├── Task 2.3: Migrate lineRepository (simple CRUD)
├── Task 2.4: Migrate supplierRepository (JOIN + aggregation)
├── Task 2.5: Migrate uploadRepository (dynamic UPDATE)
└── Task 2.6: Migrate rejectionRepository (complex, time_bucket, window fns)
    └── Can parallel with 2.2-2.5 once 2.1 done

Wave 3 (API & Config - After Wave 2):
├── Task 3.1: Migrate upload API route (Storage integration)
└── Task 3.2: Update config.ts (remove old DB vars, add Supabase)

Wave 4 (Testing & Verification - After Wave 3):
├── Task 4.1: Unit test - defectTypeRepository
├── Task 4.2: Unit test - lineRepository
├── Task 4.3: Unit test - supplierRepository
├── Task 4.4: Unit test - uploadRepository
├── Task 4.5: Unit test - rejectionRepository
├── Task 4.6: Integration test - upload flow
├── Task 4.7: Verify analytics API routes
├── Task 4.8: Verify upload API with Storage
└── Task 4.9: End-to-end smoke test
```

**Critical Path**: 
Wave 1 (setup) → Task 2.1 (connection) → Task 2.6 (rejection) → Task 3.1 (upload API) → Task 4.9 (E2E test)

**Estimated Parallel Speedup**: 
- Sequential time: ~12 hours
- Parallel time: ~7-8 hours  
- **Speedup: ~35-40%**

---

## Tasks

### Wave 1: Setup & Infrastructure

#### Task 1.1: Install Supabase Dependencies

**What to do**:
- Add `@supabase/supabase-js` to dependencies
- Remove `pg` from dependencies (keep @types/pg for transition period if needed)
- Run package manager install

**Must NOT do**:
- Don't remove `@types/pg` immediately if other code references it
- Don't modify any source files yet

**Delegation Recommendation**:
- **Category**: `quick` - Simple dependency management task
- **Skills**: [`git-master`] - For clean package.json commits

**Parallelization**:
- **Can Run In Parallel**: YES
- **Parallel Group**: Wave 1
- **Blocks**: Task 1.5 (Storage config needs package installed)
- **Blocked By**: None

**Acceptance Criteria**:
```bash
# Verify installation
npm list @supabase/supabase-js | grep "@supabase/supabase-js"
# Should show version installed

# Verify package.json updated
cat package.json | jq '.dependencies["@supabase/supabase-js"]'
# Should return version string, not null

# Build passes
npm run build
# Exit code 0
```

---

#### Task 1.2: Update Environment Configuration

**What to do**:
- Add Supabase environment variables to `.env.local.example`
- Update `src/lib/config.ts` to include Supabase configuration schema
- Variables needed: `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`

**Must NOT do**:
- Don't remove old DB config yet (keep for rollback safety during migration)
- Don't commit real credentials

**Delegation Recommendation**:
- **Category**: `quick` - Configuration file updates
- **Skills**: [`typescript-programmer`] - Zod schema validation expertise

**Parallelization**:
- **Can Run In Parallel**: YES
- **Parallel Group**: Wave 1
- **Blocks**: Task 1.3 (client needs env vars), Task 1.5 (Storage needs service role key)
- **Blocked By**: None

**Acceptance Criteria**:
```typescript
// In .env.local.example, verify these exist:
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

// In src/lib/config.ts, verify schema includes:
SUPABASE_URL: z.string().url()
SUPABASE_ANON_KEY: z.string()
SUPABASE_SERVICE_ROLE_KEY: z.string()

// Verification command:
bun -e "import { config } from './src/lib/config'; console.log('Supabase URL:', config.SUPABASE_URL)"
# Should output URL or throw validation error if not set
```

---

#### Task 1.3: Create Supabase Client Module

**What to do**:
- Create `src/lib/db/supabase.ts` with Supabase client initialization
- Implement singleton pattern with proper TypeScript types
- Support both client-side (anon key) and server-side (service role key) usage
- Handle connection errors gracefully

**Must NOT do**:
- Don't modify connection.ts yet (keep pg Pool for comparison during development)
- Don't export client with service role key to browser/client components

**Delegation Recommendation**:
- **Category**: `unspecified-medium` - Requires careful architecture decisions
- **Skills**: [`typescript-programmer`] - TypeScript client patterns, type safety

**Parallelization**:
- **Can Run In Parallel**: YES
- **Parallel Group**: Wave 1
- **Blocks**: All Wave 2 tasks (repositories need client)
- **Blocked By**: Task 1.2 (needs env vars configured)

**References**:
- Current: `src/lib/db/connection.ts` - Reference for Pool patterns to replicate
- Supabase docs: https://supabase.com/docs/reference/javascript/initializing

**Acceptance Criteria**:
```typescript
// Verify file exists and exports correctly:
import { createClient, createServiceClient } from './src/lib/db/supabase';

// Test server-side client (service role):
const serviceClient = createServiceClient();
const { data, error } = await serviceClient.from('defect_types').select('*').limit(1);
console.log('Service client works:', !error);

// Test anon client:
const anonClient = createClient();
const { data: data2, error: error2 } = await anonClient.from('defect_types').select('*').limit(1);
console.log('Anon client works:', !error2);
```

---

#### Task 1.4: Setup Test Infrastructure

**What to do**:
- Create `vitest.config.ts` with proper configuration for Next.js
- Add test script to `package.json`
- Create `src/__tests__/` directory structure
- Add example test file to verify setup works
- Configure test environment with Supabase test helpers if available

**Must NOT do**:
- Don't write actual tests for repositories yet (those are Wave 4 tasks)
- Don't create tests for API routes yet

**Delegation Recommendation**:
- **Category**: `unspecified-medium` - Test infrastructure setup
- **Skills**: [`typescript-programmer`] - Vitest + Next.js configuration

**Parallelization**:
- **Can Run In Parallel**: YES
- **Parallel Group**: Wave 1
- **Blocks**: All Wave 4 testing tasks
- **Blocked By**: Task 1.1 (needs vitest already in devDependencies)

**Acceptance Criteria**:
```bash
# Verify vitest config exists
ls vitest.config.ts
# Should exist

# Run tests
npm test
# Should show "No test files found" or 1 passing test (example)

# Example test passes:
bun -e "import { describe, it, expect } from 'vitest'; describe('setup', () => { it('works', () => { expect(true).toBe(true); }); });"
# Should exit 0
```

---

#### Task 1.5: Configure Supabase Storage Bucket

**What to do**:
- Create Supabase Storage bucket for file uploads (via Supabase Dashboard or programmatically)
- Set appropriate bucket policies (authenticated uploads, private files)
- Configure folder structure (year/month pattern to match current implementation)
- Document bucket name and access patterns

**Must NOT do**:
- Don't make bucket public (files should require authentication)
- Don't change existing upload code yet

**Delegation Recommendation**:
- **Category**: `quick` - Supabase dashboard/configuration task
- **Skills**: [] - No special skills needed, mostly documentation

**Parallelization**:
- **Can Run In Parallel**: NO - Must wait for 1.1, 1.2, 1.3
- **Parallel Group**: Wave 1 (end)
- **Blocks**: Task 3.1 (upload route needs bucket ready)
- **Blocked By**: Task 1.1, 1.2, 1.3

**Acceptance Criteria**:
```bash
# Using Supabase CLI or dashboard, verify bucket exists:
# Bucket name: "uploads" (or whatever you choose)

# Test upload via API:
curl -X POST "${SUPABASE_URL}/storage/v1/object/uploads/test.txt" \
  -H "Authorization: Bearer ${SUPABASE_SERVICE_ROLE_KEY}" \
  -H "Content-Type: text/plain" \
  -d "test content"
# Should return 200 with path

# Verify file exists in bucket via Supabase dashboard
```

---

### Wave 2: Core Repository Migrations

#### Task 2.1: Migrate Database Connection (connection.ts)

**What to do**:
- Replace `pg` Pool with Supabase client from Task 1.3
- Maintain same export interface (`export { pool }` or similar) to minimize repository changes
- Add connection health check/logging equivalent to current implementation
- Keep TypeScript types compatible

**Must NOT do**:
- Don't delete connection.ts entirely (keep file for backward compatibility during migration)
- Don't change the export signature if it breaks other imports

**Delegation Recommendation**:
- **Category**: `unspecified-medium` - Foundational change affecting entire app
- **Skills**: [`typescript-programmer`] - TypeScript module patterns, interface design

**Parallelization**:
- **Can Run In Parallel**: NO (MUST be first in Wave 2)
- **Parallel Group**: Wave 2 (foundational)
- **Blocks**: Tasks 2.2, 2.3, 2.4, 2.5, 2.6 (all repositories need this)
- **Blocked By**: Task 1.3 (needs Supabase client ready)

**References**:
- Current: `src/lib/db/connection.ts` lines 1-25
- Target: Use `createServiceClient()` from Task 1.3

**Acceptance Criteria**:
```typescript
// Verify connection.ts exports Supabase client:
import { pool } from './src/lib/db/connection';
// pool should now be Supabase client, not pg Pool

// Test basic query:
const { data, error } = await pool.from('defect_types').select('*').limit(1);
console.log('Connection works:', !error && data !== null);

// Error handling works:
try {
  await pool.from('nonexistent_table').select('*');
} catch (e) {
  console.log('Error handling works');
}
```

---

#### Task 2.2: Migrate DefectTypeRepository

**What to do**:
- Replace all `pool.query()` calls with Supabase `.from().select()` queries
- Keep same method signatures and return types
- Migrate methods: `getAll()`, `getById()`, `getByCode()`, `findByName()`, `create()`, `getOrCreate()`
- Handle fuzzy matching logic (LOWER() SQL → JavaScript string operations)

**Must NOT do**:
- Don't change method signatures or return types
- Don't modify `src/lib/db/types.ts` (keep type definitions)

**Delegation Recommendation**:
- **Category**: `unspecified-medium` - CRUD migration
- **Skills**: [`typescript-programmer`] - TypeScript + Supabase patterns

**Parallelization**:
- **Can Run In Parallel**: YES
- **Parallel Group**: Wave 2
- **Blocks**: Task 4.1 (tests for this repo)
- **Blocked By**: Task 2.1 (needs connection.ts migrated)

**References**:
- Current: `src/lib/db/repositories/defectTypeRepository.ts` lines 1-88
- Target: Supabase `from('defect_types')` queries

**Key Migration Points**:
```typescript
// BEFORE (pg):
const query = 'SELECT * FROM defect_types WHERE id = $1';
const result = await pool.query(query, [id]);
return result.rows[0] ? this.mapRowToDefectType(result.rows[0]) : null;

// AFTER (Supabase):
const { data, error } = await pool
  .from('defect_types')
  .select('*')
  .eq('id', id)
  .single();
if (error) throw error;
return data ? this.mapRowToDefectType(data) : null;
```

**Acceptance Criteria**:
```bash
# Run repository tests (after Task 4.1 completes):
npm test -- src/__tests__/defectTypeRepository.test.ts
# All 6 methods should pass tests

# Verify API compatibility:
bun -e "
import { defectTypeRepository } from './src/lib/db/repositories';
const all = await defectTypeRepository.getAll();
console.log('getAll works:', Array.isArray(all));
const one = await defectTypeRepository.getById(1);
console.log('getById works:', one === null || typeof one === 'object');
"
```

---

#### Task 2.3: Migrate LineRepository

**What to do**:
- Migrate similar to defectTypeRepository (simple CRUD patterns)
- Methods: `getAll()`, `getById()`, `findByName()`, `create()`, `getOrCreate()`
- Handle `active = true` filter in `getAll()`
- Maintain fuzzy name matching logic

**Delegation Recommendation**:
- **Category**: `quick` - Similar pattern to 2.2
- **Skills**: [`typescript-programmer`] - TypeScript patterns

**Parallelization**:
- **Can Run In Parallel**: YES (with 2.2, 2.4, 2.5, 2.6)
- **Parallel Group**: Wave 2
- **Blocks**: Task 4.2
- **Blocked By**: Task 2.1

**References**:
- Current: `src/lib/db/repositories/lineRepository.ts` lines 1-74

**Acceptance Criteria**:
```bash
# Run tests:
npm test -- src/__tests__/lineRepository.test.ts
# All 5 methods pass

# Quick verification:
bun -e "
import { lineRepository } from './src/lib/db/repositories';
const lines = await lineRepository.getAll();
console.log('Active lines retrieved:', lines.length);
console.log('All have active=true:', lines.every(l => l.active));
"
```

---

#### Task 2.4: Migrate SupplierRepository

**What to do**:
- Migrate CRUD methods similar to 2.2/2.3
- Special handling for `getStats()`: JOIN query with aggregation needs decomposition
- Current SQL has `LEFT JOIN rejection_records` with date filter and `GROUP BY`

**Must NOT do**:
- Don't try to replicate exact SQL query (Supabase doesn't support complex SQL strings)
- Decompose into: fetch suppliers → fetch rejections → aggregate in code

**Delegation Recommendation**:
- **Category**: `unspecified-medium` - Requires query decomposition strategy
- **Skills**: [`typescript-programmer`, `data-scientist`] - Data aggregation patterns

**Parallelization**:
- **Can Run In Parallel**: YES
- **Parallel Group**: Wave 2
- **Blocks**: Task 4.3
- **Blocked By**: Task 2.1

**References**:
- Current: `src/lib/db/repositories/supplierRepository.ts` lines 58-92 (getStats)

**Key Migration Challenge**:
```typescript
// BEFORE: Complex SQL with JOIN, aggregation, window function
// AFTER (decomposed):
async getStats(from: Date, to: Date) {
  // 1. Get all suppliers
  const { data: suppliers } = await pool.from('suppliers').select('*');
  
  // 2. Get rejection counts per supplier in date range
  const { data: rejections } = await pool
    .from('rejection_records')
    .select('supplier_id, quantity')
    .gte('timestamp', from.toISOString())
    .lte('timestamp', to.toISOString());
  
  // 3. Aggregate in JavaScript
  const statsBySupplier = suppliers.map(supplier => {
    const supplierRejections = rejections?.filter(r => r.supplier_id === supplier.id) || [];
    const totalRejections = supplierRejections.reduce((sum, r) => sum + (r.quantity || 0), 0);
    // Calculate contribution percentage...
    return { supplierId: supplier.id, totalRejections, /* ... */ };
  });
  
  return statsBySupplier;
}
```

**Acceptance Criteria**:
```bash
# Run tests:
npm test -- src/__tests__/supplierRepository.test.ts

# Verify stats calculation:
bun -e "
import { supplierRepository } from './src/lib/db/repositories';
const from = new Date('2024-01-01');
const to = new Date('2024-12-31');
const stats = await supplierRepository.getStats(from, to);
console.log('Stats retrieved:', stats.length);
console.log('Has required fields:', stats.every(s => 
  typeof s.supplierId === 'number' &&
  typeof s.totalRejections === 'number'
));
"
```

---

#### Task 2.5: Migrate UploadRepository

**What to do**:
- Migrate CRUD methods with special attention to dynamic UPDATE pattern
- Methods: `create()`, `update()`, `findById()`, `findByHash()`, `getRecent()`
- `update()` method builds dynamic SET clause - needs Supabase `.update()` with conditional fields

**Delegation Recommendation**:
- **Category**: `unspecified-medium` - Dynamic field updates
- **Skills**: [`typescript-programmer`] - Conditional object building

**Parallelization**:
- **Can Run In Parallel**: YES
- **Parallel Group**: Wave 2
- **Blocks**: Task 3.1 (upload API needs this), Task 4.4
- **Blocked By**: Task 2.1

**References**:
- Current: `src/lib/db/repositories/uploadRepository.ts` lines 22-58 (dynamic update)

**Key Migration Pattern**:
```typescript
// BEFORE: Dynamic SQL building
async update(id: number, updates: Partial<UploadedFile>) {
  const fields = [];
  const values = [];
  if (updates.storedPath !== undefined) fields.push('stored_path = $1');
  // ... build query
  await pool.query(`UPDATE uploaded_files SET ${fields.join(', ')} WHERE id = $n`, values);
}

// AFTER: Supabase .update() with object building
async update(id: number, updates: Partial<UploadedFile>) {
  const updateData: any = {};
  if (updates.storedPath !== undefined) updateData.stored_path = updates.storedPath;
  if (updates.status !== undefined) updateData.status = updates.status;
  // ...
  const { error } = await pool.from('uploaded_files').update(updateData).eq('id', id);
  if (error) throw error;
}
```

**Acceptance Criteria**:
```bash
# Run tests:
npm test -- src/__tests__/uploadRepository.test.ts

# Verify update with partial fields:
bun -e "
import { uploadRepository } from './src/lib/db/repositories';
await uploadRepository.update(1, { status: 'PROCESSING' });
const file = await uploadRepository.findById(1);
console.log('Partial update works:', file?.status === 'PROCESSING');
"
```

---

#### Task 2.6: Migrate RejectionRepository (Complex)

**What to do**:
- Migrate 5 methods with varying complexity:
  1. `getByDateRange()` - Complex JOINs with filters
  2. `getAggregatedStats()` - **TIMESCALEDB `time_bucket()` REPLACEMENT**
  3. `getTopDefects()` - Window function OVER()
  4. `getTotalRejected()` - Simple aggregation
  5. `bulkInsert()` - Transaction handling

**Must NOT do**:
- Don't lose functionality - all aggregations must produce identical results
- Don't change return types

**Delegation Recommendation**:
- **Category**: `ultrabrain` - Most complex task, requires deep reasoning
- **Skills**: [`typescript-programmer`, `data-scientist`] - Complex data transformations

**Parallelization**:
- **Can Run In Parallel**: YES (can run alongside 2.2-2.5)
- **Parallel Group**: Wave 2
- **Blocks**: Tasks 3.1, 3.2, 4.5, 4.7
- **Blocked By**: Task 2.1

**References**:
- Current: `src/lib/db/repositories/rejectionRepository.ts` lines 1-236
- Lines 56-96: `getAggregatedStats()` with time_bucket
- Lines 98-131: `getTopDefects()` with OVER()
- Lines 157-194: `bulkInsert()` with transactions

**Key Migration Challenges**:

**1. time_bucket() Replacement** (lines 64-94):
```typescript
// BEFORE:
const query = `
  SELECT time_bucket($1, timestamp) as period, ...
  FROM rejection_records
  WHERE timestamp >= $2 AND timestamp <= $3
  GROUP BY period, ${groupFields.join(', ')}
`;

// AFTER: Application-level bucketing with date-fns
import { startOfDay, startOfWeek, startOfMonth, format } from 'date-fns';

async getAggregatedStats(period, from, to, groupBy) {
  // 1. Fetch raw data
  const { data: records } = await pool
    .from('rejection_records')
    .select('timestamp, line_id, defect_type_id, supplier_id, quantity, total_cost')
    .gte('timestamp', from.toISOString())
    .lte('timestamp', to.toISOString());
  
  // 2. Bucket in JavaScript
  const bucketFn = period === 'day' ? startOfDay : period === 'week' ? startOfWeek : startOfMonth;
  const grouped = new Map();
  
  for (const record of records || []) {
    const bucket = bucketFn(new Date(record.timestamp));
    const key = format(bucket, 'yyyy-MM-dd') + '|' + [groupBy filters...];
    
    if (!grouped.has(key)) grouped.set(key, { period: bucket, /* ... */ });
    const agg = grouped.get(key);
    agg.totalRejected += record.quantity;
    agg.totalCost += record.total_cost;
    // ... continue aggregation
  }
  
  return Array.from(grouped.values());
}
```

**2. Window Function OVER() Replacement** (lines 98-131):
```typescript
// BEFORE: OVER() for percentage calculation
SUM(SUM(rr.quantity)) OVER () as total

// AFTER: Calculate total first, then percentages
async getTopDefects(from, to, limit) {
  // 1. Get defects with counts
  const { data: defectCounts } = await pool
    .from('rejection_records')
    .select('defect_type_id, quantity, defect_types(name, code), production_lines(name)')
    .gte('timestamp', from.toISOString())
    .lte('timestamp', to.toISOString());
  
  // 2. Aggregate and calculate total
  const aggregated = /* group by defect_type_id */;
  const total = aggregated.reduce((sum, d) => sum + d.count, 0);
  
  // 3. Add percentages
  return aggregated.map(d => ({
    ...d,
    percentage: total > 0 ? Math.round((d.count / total) * 100 * 100) / 100 : 0
  }));
}
```

**3. Transaction-based Bulk Insert** (lines 157-194):
```typescript
// BEFORE: BEGIN/COMMIT/ROLLBACK
await client.query('BEGIN');
for (const record of records) {
  await client.query('INSERT ...', [...]);
}
await client.query('COMMIT');

// AFTER: Supabase bulk insert (no explicit transactions, but atomic)
async bulkInsert(records: RejectionRecord[]) {
  const insertData = records.map(r => ({
    timestamp: r.timestamp,
    line_id: r.lineId,
    // ... map all fields
  }));
  
  const { data, error } = await pool
    .from('rejection_records')
    .insert(insertData)
    .select();
  
  if (error) throw error;
  return data?.length || 0;
}
```

**Acceptance Criteria**:
```bash
# Run comprehensive tests:
npm test -- src/__tests__/rejectionRepository.test.ts

# Verify time_bucket equivalent:
bun -e "
import { rejectionRepository } from './src/lib/db/repositories';
const from = new Date('2024-01-01');
const to = new Date('2024-01-31');
const stats = await rejectionRepository.getAggregatedStats('day', from, to);
console.log('Aggregated stats:', stats.length, 'buckets');
console.log('Sample bucket:', stats[0]);
console.log('Has period field:', stats.every(s => s.period instanceof Date));
"

# Verify top defects with percentages:
bun -e "
const topDefects = await rejectionRepository.getTopDefects(from, to, 10);
console.log('Top defects:', topDefects.length);
console.log('Percentages sum to ~100:', topDefects.reduce((s, d) => s + d.percentage, 0));
"
```

---

### Wave 3: API Routes & Configuration

#### Task 3.1: Migrate Upload API Route (Supabase Storage)

**What to do**:
- Replace `fs.writeFile()` with Supabase Storage upload
- Replace local path storage with Supabase Storage path
- Keep same API interface (same request/response format)
- Update file retrieval logic if needed

**Must NOT do**:
- Don't change request/response schema (keep backward compatibility)
- Don't remove local file cleanup (we'll handle migration separately)

**Delegation Recommendation**:
- **Category**: `unspecified-medium` - API route with external service integration
- **Skills**: [`typescript-programmer`] - API route patterns, Supabase Storage API

**Parallelization**:
- **Can Run In Parallel**: YES (with 3.2)
- **Parallel Group**: Wave 3
- **Blocks**: Task 4.6, Task 4.8
- **Blocked By**: Task 1.5 (Storage bucket), Task 2.5 (uploadRepository)

**References**:
- Current: `src/app/api/upload/route.ts` lines 1-134
- Lines 88-102: File save logic to replace
- Supabase Storage docs: https://supabase.com/docs/reference/javascript/storage-from-upload

**Key Migration**:
```typescript
// BEFORE (lines 88-102):
const uploadDir = path.join(process.cwd(), 'uploads', String(year), month);
await mkdir(uploadDir, { recursive: true });
const fileName = `${uuidv4()}_${file.name}`;
const filePath = path.join(uploadDir, fileName);
await writeFile(filePath, buffer);
await uploadRepository.update(uploadId, { storedPath: filePath });

// AFTER:
import { createServiceClient } from '@/lib/db/supabase';
const supabase = createServiceClient();

const fileName = `${uuidv4()}_${file.name}`;
const storagePath = `${year}/${month}/${fileName}`;

const { data: storageData, error: storageError } = await supabase
  .storage
  .from('uploads')
  .upload(storagePath, buffer, {
    contentType: file.type,
    upsert: false
  });

if (storageError) throw storageError;

await uploadRepository.update(uploadId, { 
  storedPath: storagePath  // Store Supabase path instead of local path
});
```

**Acceptance Criteria**:
```bash
# Test upload via API:
curl -X POST http://localhost:3000/api/upload \
  -F "file=@test.xlsx" \
  -F 'mappings=[]' \
  -F 'options={}'

# Should return JSON with fileId, success: true

# Verify file in Supabase Storage:
# Check Supabase Dashboard → Storage → uploads bucket

# Verify database record:
bun -e "
import { uploadRepository } from './src/lib/db/repositories';
const recent = await uploadRepository.getRecent(1);
console.log('Stored path format:', recent[0]?.storedPath);
console.log('Is Supabase path (no local filesystem):', !recent[0]?.storedPath?.includes('\\\\') && !recent[0]?.storedPath?.startsWith('/'));
"
```

---

#### Task 3.2: Update Configuration (config.ts)

**What to do**:
- Remove old PostgreSQL environment variables from schema (comment out for safety)
- Ensure Supabase variables are required
- Add any new configuration needed (bucket names, etc.)
- Update `.env.local.example` documentation

**Must NOT do**:
- Don't completely delete old config (comment out for rollback reference)
- Don't break existing code that might reference old vars during transition

**Delegation Recommendation**:
- **Category**: `quick` - Configuration cleanup
- **Skills**: [`typescript-programmer`] - Zod schemas

**Parallelization**:
- **Can Run In Parallel**: YES (with 3.1)
- **Parallel Group**: Wave 3
- **Blocks**: None (end of Wave 3)
- **Blocked By**: All Wave 2 tasks (need to know what's needed)

**Acceptance Criteria**:
```bash
# Verify config.ts has Supabase vars:
grep -E "SUPABASE_URL|SUPABASE_ANON_KEY|SUPABASE_SERVICE_ROLE_KEY" src/lib/config.ts

# Verify old DB vars removed (or commented):
! grep -E "^\\s*DB_HOST:|^\\s*DB_PORT:" src/lib/config.ts || echo "Old vars still present (OK if commented)"

# Config validation passes:
bun -e "import { config } from './src/lib/config'; console.log('Config valid:', !!config.SUPABASE_URL);"
```

---

### Wave 4: Testing & Verification

#### Task 4.1: Write Tests - DefectTypeRepository

**What to do**:
- Create `src/__tests__/repositories/defectTypeRepository.test.ts`
- Test all 6 methods: `getAll`, `getById`, `getByCode`, `findByName`, `create`, `getOrCreate`
- Include edge cases: not found, fuzzy matching, case insensitivity
- Mock Supabase client for isolated tests

**Delegation Recommendation**:
- **Category**: `unspecified-medium` - Unit testing
- **Skills**: [`typescript-programmer`] - Vitest, mocking patterns

**Parallelization**:
- **Can Run In Parallel**: YES (with 4.2, 4.3, 4.4, 4.5)
- **Parallel Group**: Wave 4 (testing phase)
- **Blocks**: Task 4.6 (integration tests need unit tests first)
- **Blocked By**: Task 2.2 (defectTypeRepository migrated)

**Acceptance Criteria**:
```bash
npm test -- src/__tests__/repositories/defectTypeRepository.test.ts
# Expected: 6 test suites, all passing
```

---

#### Task 4.2: Write Tests - LineRepository

**What to do**:
- Test all 5 methods with focus on `active` filtering and fuzzy name search
- Similar pattern to 4.1

**Delegation Recommendation**:
- **Category**: `quick` - Similar pattern to 4.1
- **Skills**: [`typescript-programmer`]

**Parallelization**:
- **Can Run In Parallel**: YES
- **Blocks**: Task 4.6
- **Blocked By**: Task 2.3

---

#### Task 4.3: Write Tests - SupplierRepository

**What to do**:
- Test all methods with special focus on `getStats()` aggregation logic
- Verify percentage calculations in stats

**Delegation Recommendation**:
- **Category**: `unspecified-medium` - Complex aggregation testing
- **Skills**: [`typescript-programmer`, `data-scientist`]

**Parallelization**:
- **Can Run In Parallel**: YES
- **Blocks**: Task 4.6
- **Blocked By**: Task 2.4

---

#### Task 4.4: Write Tests - UploadRepository

**What to do**:
- Test CRUD operations with focus on dynamic `update()` method
- Verify partial field updates work correctly
- Test `findByHash` for duplicate detection

**Delegation Recommendation**:
- **Category**: `unspecified-medium` - Dynamic update testing
- **Skills**: [`typescript-programmer`]

**Parallelization**:
- **Can Run In Parallel**: YES
- **Blocks**: Task 4.6
- **Blocked By**: Task 2.5

---

#### Task 4.5: Write Tests - RejectionRepository

**What to do**:
- Comprehensive tests for all 5 methods
- Critical focus on:
  - `getAggregatedStats()`: Verify time bucketing matches TimescaleDB behavior
  - `getTopDefects()`: Verify percentage calculations with window function replacement
  - `bulkInsert()`: Verify atomic behavior
- Compare outputs with expected data

**Delegation Recommendation**:
- **Category**: `unspecified-high` - Most critical tests
- **Skills**: [`typescript-programmer`, `data-scientist`]

**Parallelization**:
- **Can Run In Parallel**: YES
- **Blocks**: Task 4.6, Task 4.7
- **Blocked By**: Task 2.6

---

#### Task 4.6: Integration Test - Upload Flow

**What to do**:
- Test complete upload flow: API route → Storage → Repository
- Verify file lands in Supabase Storage
- Verify database record created correctly
- Test duplicate detection still works

**Delegation Recommendation**:
- **Category**: `unspecified-medium` - End-to-end integration
- **Skills**: [`typescript-programmer`]

**Parallelization**:
- **Can Run In Parallel**: NO (needs all unit tests)
- **Blocks**: Task 4.9
- **Blocked By**: Tasks 4.1, 4.2, 4.3, 4.4, 4.5

**Acceptance Criteria**:
```bash
# Run integration test:
npm test -- src/__tests__/integration/upload.test.ts
# Should pass with file uploaded to Storage and record in DB
```

---

#### Task 4.7: Verify Analytics API Routes

**What to do**:
- Manual/API verification that `trends` and `pareto` routes work
- Verify data returns with correct structure
- Check that aggregation produces sensible results

**Delegation Recommendation**:
- **Category**: `quick` - API verification
- **Skills**: [] - HTTP testing

**Parallelization**:
- **Can Run In Parallel**: YES (with 4.6, 4.8)
- **Blocks**: Task 4.9
- **Blocked By**: Task 2.6

**Acceptance Criteria**:
```bash
# Test trends API:
curl "http://localhost:3000/api/analytics/trends?from=2024-01-01&to=2024-01-31&granularity=day"
# Should return JSON with series array

# Test pareto API:
curl "http://localhost:3000/api/analytics/pareto?from=2024-01-01&to=2024-01-31"
# Should return JSON with items array and pareto calculations
```

---

#### Task 4.8: Verify Upload API with Storage

**What to do**:
- Verify uploaded files accessible via Supabase Storage
- Test file retrieval (if applicable)
- Verify stored paths work with Supabase client

**Delegation Recommendation**:
- **Category**: `quick` - Storage verification
- **Skills**: []

**Parallelization**:
- **Can Run In Parallel**: YES (with 4.6, 4.7)
- **Blocks**: Task 4.9
- **Blocked By**: Task 3.1

---

#### Task 4.9: End-to-End Smoke Test

**What to do**:
- Complete walkthrough of main user flows:
  1. Upload file → Process → View reports
  2. View trends dashboard
  3. View pareto analysis
  4. View supplier stats
- Verify all pages load and display data correctly
- Check browser console for errors

**Delegation Recommendation**:
- **Category**: `unspecified-medium` - Full application testing
- **Skills**: [`agent-browser`, `frontend-ui-ux`] - Browser automation for verification

**Parallelization**:
- **Can Run In Parallel**: NO (final verification)
- **Blocks**: None (end of project)
- **Blocked By**: Tasks 4.6, 4.7, 4.8

**Acceptance Criteria**:
```bash
# Build application:
npm run build
# Exit code 0

# Start dev server:
npm run dev &

# Run Playwright smoke tests (if available) or manual verification:
npx playwright test --grep "smoke"

# Verify key pages:
# - / (dashboard) - loads without errors
# - /trends - shows trend data
# - /analysis - shows pareto chart
# - /supplier - shows supplier stats
# - /settings/upload - can upload file
```

---

## Commit Strategy

| After Task | Message | Files | Verification |
|------------|---------|-------|--------------|
| 1.1 | `chore(deps): add @supabase/supabase-js` | package.json, package-lock.json | npm list @supabase/supabase-js |
| 1.2 | `chore(config): add Supabase environment variables` | .env.local.example, src/lib/config.ts | config validation passes |
| 1.3 | `feat(db): create Supabase client module` | src/lib/db/supabase.ts | client imports work |
| 1.4 | `chore(test): setup Vitest test infrastructure` | vitest.config.ts, src/__tests__/example.test.ts | npm test runs |
| 1.5 | `chore(storage): configure Supabase Storage bucket` | docs/storage-setup.md | bucket exists in dashboard |
| 2.1 | `refactor(db): migrate connection.ts to Supabase` | src/lib/db/connection.ts | connection test passes |
| 2.2 | `refactor(repo): migrate defectTypeRepository to Supabase` | src/lib/db/repositories/defectTypeRepository.ts | unit tests pass |
| 2.3 | `refactor(repo): migrate lineRepository to Supabase` | src/lib/db/repositories/lineRepository.ts | unit tests pass |
| 2.4 | `refactor(repo): migrate supplierRepository to Supabase` | src/lib/db/repositories/supplierRepository.ts | unit tests pass |
| 2.5 | `refactor(repo): migrate uploadRepository to Supabase` | src/lib/db/repositories/uploadRepository.ts | unit tests pass |
| 2.6 | `refactor(repo): migrate rejectionRepository to Supabase` | src/lib/db/repositories/rejectionRepository.ts | complex tests pass |
| 3.1 | `feat(api): migrate upload route to Supabase Storage` | src/app/api/upload/route.ts | upload test passes |
| 3.2 | `chore(config): finalize Supabase configuration` | src/lib/config.ts | all env vars present |
| 4.x | `test(repo): add repository tests` | src/__tests__/repositories/*.ts | npm test passes |
| 4.6 | `test(int): add upload integration test` | src/__tests__/integration/upload.test.ts | integration test passes |
| 4.9 | `test(e2e): add end-to-end smoke tests` | e2e/smoke.spec.ts | e2e tests pass |

---

## Success Criteria

### Pre-Migration Baseline
Before starting, verify current system works:
```bash
# 1. Current build passes
npm run build

# 2. API routes respond (with data if available)
curl http://localhost:3000/api/analytics/trends?from=2024-01-01&to=2024-01-31
curl http://localhost:3000/api/analytics/pareto?from=2024-01-01&to=2024-01-31

# 3. Application runs
npm run dev
```

### Post-Migration Verification
After all tasks complete:

**Functional Verification**:
- [ ] All 5 repositories pass unit tests (100% of methods tested)
- [ ] Upload flow works end-to-end (file → Storage → DB record)
- [ ] Trends API returns aggregated data correctly
- [ ] Pareto API returns defects with percentages
- [ ] Suppliers API returns supplier statistics
- [ ] Dashboard loads and displays data

**Performance Verification**:
- [ ] No significant regression in query performance (< 2x slower)
- [ ] Upload processing time comparable or faster
- [ ] Page load times unchanged

**Data Integrity Verification**:
- [ ] `getAggregatedStats()` produces identical buckets as time_bucket()
- [ ] `getTopDefects()` percentages sum to ~100%
- [ ] `bulkInsert()` inserts all records or none (atomic)

**Infrastructure Verification**:
- [ ] `pg` dependency removed from package.json
- [ ] No references to `Pool` from `pg` in codebase
- [ ] All environment variables using Supabase naming
- [ ] No local file system usage for uploads

**Rollback Safety**:
- [ ] Old environment variables documented (in comments)
- [ ] Database schema compatible with both systems during transition
- [ ] Can revert to pg Pool if needed (documented process)

---

## Risk Mitigation

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| time_bucket() replacement produces different results | Medium | High | Compare outputs side-by-side, use date-fns with careful testing |
| Window function replacement changes percentages | Low | High | Verify sum of percentages = ~100%, compare with sample data |
| Supabase Storage upload fails for large files | Low | Medium | Test with 50MB files, implement chunked upload if needed |
| Bulk insert not atomic | Low | High | Use Supabase batch insert, verify rollback on error |
| Performance degradation | Medium | Medium | Benchmark before/after, optimize if > 2x slower |
| Missing test coverage | Medium | Medium | Make tests mandatory in Wave 4, don't skip |

---

## Post-Migration Cleanup

After Wave 4.9 is complete and verified:

1. **Remove pg dependency**:
   ```bash
   npm uninstall pg @types/pg
   ```

2. **Clean up local uploads directory**:
   - Archive or delete `./uploads/` folder after confirming all files migrated to Supabase

3. **Update documentation**:
   - Update README with Supabase setup instructions
   - Document new environment variables

4. **Remove commented legacy code**:
   - After 1 week of stable production, remove commented pg Pool code

5. **Monitor and optimize**:
   - Watch query performance in production
   - Add Supabase query caching if needed

---

## Appendix: Decision Log

**Decision 1: time_bucket() Replacement Strategy**
- Chosen: Application-layer bucketing with date-fns
- Rationale: Works with standard PostgreSQL, no extensions needed
- Alternative rejected: PostgreSQL `date_trunc()` - less flexible, requires DB function

**Decision 2: Repository Migration Parallelization**
- Chosen: All 5 repositories in parallel (Wave 2)
- Rationale: No dependencies between repositories, each works independently
- Exception: rejectionRepository (Task 2.6) can be done in parallel but is more complex

**Decision 3: Transaction Handling for bulkInsert()**
- Chosen: Supabase batch insert (no explicit transaction control)
- Rationale: Supabase `.insert()` with array is atomic for small batches
- Fallback: If issues arise, implement retry logic or use Supabase RPC with stored procedure

**Decision 4: File Storage Path Format**
- Chosen: Store relative path (`year/month/filename`) in database
- Rationale: Decouples storage location from DB, allows bucket migration
- Alternative rejected: Full URL - ties to specific bucket/region
