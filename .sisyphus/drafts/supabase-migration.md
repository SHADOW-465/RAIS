# Draft: Supabase Migration Planning

## User Request Summary
Migrate a Next.js application from PostgreSQL+TimescaleDB to Supabase.

## Current Architecture
- Next.js 16 + React 19 + TypeScript
- `pg` (node-postgres) for database with Pool connection
- Local filesystem for file storage (fs.writeFile)
- TimescaleDB-specific features: time_bucket() for aggregation
- 5 repositories with raw SQL
- 1 connection file (src/lib/db/connection.ts)

## Target Architecture
- @supabase/supabase-js for database operations
- Supabase Storage for file uploads
- Standard PostgreSQL (no TimescaleDB)
- Same functionality preserved

## Files to Migrate
1. src/lib/db/connection.ts - Replace pg Pool
2. src/lib/db/repositories/rejectionRepository.ts - Complex SQL with time_bucket, JOINs, window functions
3. src/lib/db/repositories/defectTypeRepository.ts - Simple CRUD
4. src/lib/db/repositories/lineRepository.ts - Simple CRUD  
5. src/lib/db/repositories/supplierRepository.ts - JOIN query with aggregation
6. src/lib/db/repositories/uploadRepository.ts - CRUD with dynamic updates
7. src/app/api/upload/route.ts - Replace fs.writeFile with Supabase Storage
8. src/lib/config.ts - Add Supabase env vars

## Key Technical Challenges Identified

### 1. TimescaleDB time_bucket() Replacement
Current code uses:
```sql
time_bucket($1, timestamp) as period
```
Options:
- A: Use Supabase PostgreSQL function (date_trunc)
- B: Use date-fns library for bucketing in application layer
- C: Create custom PostgreSQL function

**Decision needed**: Which approach?

### 2. Complex SQL with Window Functions
```sql
ROUND(100.0 * SUM(rr.quantity) / SUM(SUM(rr.quantity)) OVER (), 2) as contribution
```
This uses OVER() window function for percentage calculation.

### 3. Transaction-based Bulk Insert
Current code uses BEGIN/COMMIT/ROLLBACK with client.query()
```typescript
await client.query('BEGIN');
// loop insert
await client.query('COMMIT');
```
Need Supabase equivalent (bulk upsert?)

### 4. Dynamic UPDATE with Partial Fields
uploadRepository.update() builds dynamic SET clause based on provided fields.

### 5. File Storage Migration
- Current: fs.writeFile to local ./uploads folder
- Target: Supabase Storage bucket
- Need: File path storage strategy

## Dependencies Analysis
- Connection.ts must be migrated FIRST (all repositories depend on it)
- Repositories can be migrated in parallel (except rejectionRepository which is most complex)
- API routes depend on repositories
- Upload route depends on both uploadRepository AND Supabase Storage

## Test Infrastructure
- No existing tests found (no *.test.ts or *.spec.ts files)
- Vitest is in devDependencies but not configured
- Recommendation: Setup test infrastructure as part of Wave 1

## Risk Assessment
- HIGH: rejectionRepository.getAggregatedStats() - time_bucket dependency
- HIGH: rejectionRepository.getTopDefects() - window function
- MEDIUM: uploadRepository - dynamic SQL generation
- LOW: defectTypeRepository, lineRepository, supplierRepository - simple CRUD

## Scope Boundaries
- INCLUDE: Database layer migration, storage migration, config updates
- EXCLUDE: Frontend changes, API route logic changes (just swap dependencies)
- EXCLUDE: Database schema migration (assume tables exist in Supabase)
