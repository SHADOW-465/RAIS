# Implementation Plan - Manufacturing Rejection Statistics System
## RAIS v3.0 - Simplified & Focused

**Goal:** Build a statistics system that turns Excel chaos into clear numbers for the GM.  
**Timeline:** 4 weeks (simplified from previous 6-week plan)  
**Status:** Requirements Refactored - Ready for Implementation

---

## Week 1: Foundation & Core Upload

### Day 1-2: Database & Project Setup
**Tasks:**
- [ ] Initialize Next.js 16 project with TypeScript
- [ ] Setup Supabase project and connection
- [ ] Create simplified database schema:
  - `batches` (core entity)
  - `rejection_records` (consolidated data)
  - `defect_types` (master data)
  - `uploaded_files` (tracking)
- [ ] Create database types file
- [ ] Setup Supabase Storage bucket for Excel files

**Files to Create:**
- `src/lib/db/supabaseClient.ts`
- `src/lib/db/database.types.ts`
- `supabase/migrations/001_schema.sql`

**Deliverable:** Working database connection, can insert test data

### Day 3-4: Excel Upload Core
**Tasks:**
- [ ] Create Excel parser using `xlsx` library
- [ ] Build column mapping interface (one-time setup)
- [ ] Implement data validation
- [ ] Create upload API endpoint
- [ ] Store uploaded files in Supabase Storage
- [ ] Track upload status

**Files to Create:**
- `src/lib/upload/excelParser.ts`
- `src/lib/upload/validator.ts`
- `src/lib/upload/mapper.ts`
- `src/app/api/upload/route.ts`

**Deliverable:** Can upload Excel file and store data in database

### Day 5: Upload UI & Testing
**Tasks:**
- [ ] Create simple upload page
- [ ] Drag & drop interface
- [ ] Show upload progress
- [ ] Display validation errors
- [ ] Test with sample Excel files

**Files to Create:**
- `src/app/upload/page.tsx`
- `src/app/upload/upload.module.css`

**Deliverable:** Working upload flow end-to-end

---

## Week 2: Statistics Engine

### Day 6-7: Core Statistics Calculations
**Tasks:**
- [ ] Build statistics calculation functions:
  - Overall rejection rate
  - Stage-wise breakdown
  - Defect-wise breakdown
  - Batch-level statistics
- [ ] SQL aggregation queries
- [ ] Time-series calculations (trends)
- [ ] Pareto analysis for defects

**Files to Create:**
- `src/lib/analytics/statistics.ts`
- `src/lib/analytics/queries.ts`

**Deliverable:** Can calculate all required statistics from database

### Day 8-9: Batch Risk Assessment
**Tasks:**
- [ ] Implement risk scoring algorithm
  - Stage failures count
  - Rejection density calculation
  - Simple 3-tier risk (Normal/Watch/High Risk)
- [ ] Risk threshold configuration
- [ ] Risk indicator display logic

**Files to Create:**
- `src/lib/analytics/riskEngine.ts`

**Deliverable:** Batches have calculated risk scores

### Day 10: API Endpoints for Statistics
**Tasks:**
- [ ] Create statistics API endpoints:
  - `/api/statistics/overall`
  - `/api/statistics/by-stage`
  - `/api/statistics/by-defect`
  - `/api/statistics/by-batch`
- [ ] Add filtering (date range, stage, risk)
- [ ] Add pagination for large datasets

**Files to Create:**
- `src/app/api/statistics/overall/route.ts`
- `src/app/api/statistics/by-stage/route.ts`
- `src/app/api/statistics/by-defect/route.ts`
- `src/app/api/statistics/by-batch/route.ts`

**Deliverable:** All statistics available via API

---

## Week 3: User Interface

### Day 11-12: Executive Dashboard
**Tasks:**
- [ ] Create minimal dashboard page
- [ ] Large rejection rate display
- [ ] Total rejected units (monthly)
- [ ] Cost impact (if data available)
- [ ] Trend indicator
- [ ] Recent high-risk batches list
- [ ] Quick upload button

**Files to Create:**
- `src/app/page.tsx` (dashboard)
- `src/app/page.module.css`
- `src/components/KPIStat.tsx`

**Design:** Clean, minimal, no clutter. One glance gives GM the picture.

### Day 13-14: Statistics Views
**Tasks:**
- [ ] Stage-wise statistics page (table view)
- [ ] Defect-wise statistics page (table + Pareto)
- [ ] Batch-wise statistics page (table with risk)
- [ ] Filtering and sorting
- [ ] Export to Excel button

**Files to Create:**
- `src/app/stage-analysis/page.tsx`
- `src/app/defect-analysis/page.tsx`
- `src/app/batch-analysis/page.tsx`
- `src/components/DataTable.tsx`

**Design:** Simple tables, clear headers, sortable columns.

### Day 15: Navigation & Layout
**Tasks:**
- [ ] Simple sidebar navigation
- [ ] Responsive layout
- [ ] Mobile-friendly tables
- [ ] Consistent styling

**Files to Create:**
- `src/components/Sidebar.tsx`
- `src/app/layout.tsx`
- `src/app/globals.css`

---

## Week 4: Reports, Polish & Testing

### Day 16-17: Reports & Export
**Tasks:**
- [ ] Monthly summary report page
- [ ] Batch risk report
- [ ] Export to Excel functionality
- [ ] Export to PDF (optional, can defer)
- [ ] Print-friendly styling

**Files to Create:**
- `src/app/reports/page.tsx`
- `src/lib/export/excelExport.ts`

### Day 18-19: Testing & Bug Fixes
**Tasks:**
- [ ] Test with real Excel files (if available)
- [ ] Test edge cases (empty files, bad data)
- [ ] Performance testing (10,000 rows)
- [ ] Fix bugs
- [ ] Error handling improvements

**Testing Checklist:**
- [ ] Upload works with all Excel formats
- [ ] Statistics calculate correctly
- [ ] Batch risk scoring accurate
- [ ] Dashboard loads fast
- [ ] Mobile view works
- [ ] Export produces valid files

### Day 20: Final Polish
**Tasks:**
- [ ] UI refinements
- [ ] Add loading states
- [ ] Error messages review
- [ ] Code cleanup
- [ ] Documentation update

**Optional (if time permits):**
- [ ] Simple AI summary using Gemini (optional)
- [ ] Data lineage display
- [ ] User guide creation

---

## Simplified Architecture

### Database Schema (Minimal)
```sql
-- 4 core tables only
batches: id, batch_number, product_name, production_date
rejection_records: id, batch_id, stage, defect_type, quantity, date
uploaded_files: id, filename, status, record_count
defect_types: id, code, name, severity
```

### Pages (5 only)
1. **Dashboard** (`/`) - Executive summary
2. **Upload** (`/upload`) - Excel upload
3. **Stage Analysis** (`/stage-analysis`) - Stage-wise stats
4. **Defect Analysis** (`/defect-analysis`) - Defect-wise stats
5. **Batch Analysis** (`/batch-analysis`) - Batch-wise stats + risk

### Components (Minimal)
- `Sidebar` - Navigation
- `KPIStat` - Dashboard stat cards
- `DataTable` - Sortable tables
- `RiskBadge` - Risk indicator (green/yellow/red)
- `UploadZone` - File upload area

### API Routes (6 only)
- `POST /api/upload` - Excel upload
- `GET /api/statistics/overall` - Overall stats
- `GET /api/statistics/by-stage` - Stage stats
- `GET /api/statistics/by-defect` - Defect stats
- `GET /api/statistics/by-batch` - Batch stats
- `GET /api/export/excel` - Export to Excel

---

## Success Criteria

### Must Have (Week 4)
- [ ] Can upload Excel and store data
- [ ] Dashboard shows rejection rate clearly
- [ ] Stage/defect/batch statistics available
- [ ] Batch risk scores calculated
- [ ] Tables sort and filter
- [ ] Export to Excel works
- [ ] UI is simple enough for GM

### Nice to Have (If Time)
- [ ] AI summary (Gemini)
- [ ] PDF export
- [ ] Email reports
- [ ] Advanced filtering

---

## Anti-Patterns (What NOT to Do)

❌ **Don't Over-Engineer:**
- No complex AI/ML models
- No real-time data streams
- No fancy charts unless essential
- No operator-level features
- No ERP integration attempts

❌ **Don't Over-Design:**
- Keep UI minimal and focused
- One page = one purpose
- GM should understand in 30 seconds

✅ **Do Focus On:**
- Excel → Database → Statistics pipeline
- Clear numbers for decision-making
- Batch risk visibility
- Simple, fast, reliable

---

## Communication Plan

### Week 1 End
> "Database ready, can upload Excel files. Basic data storage working."

### Week 2 End
> "Statistics engine complete. Can calculate rejection rates, stage breakdowns, batch risk scores."

### Week 3 End
> "UI complete. Dashboard shows key metrics. Can view statistics by stage, defect, batch."

### Week 4 End
> "System ready for GM. Can upload rejection data, see clear statistics, identify risky batches."

---

## Final Checklist

Before starting implementation:
- [ ] Review this plan with stakeholders
- [ ] Confirm Excel file formats to support
- [ ] Get sample Excel files for testing
- [ ] Setup Supabase project
- [ ] Confirm risk thresholds with GM
- [ ] Define "success" metrics

**Keep it simple. Keep it focused. Deliver value.**
