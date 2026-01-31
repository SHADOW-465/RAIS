# Product Requirements Document (PRD)
# Manufacturing Rejection Statistics System (RAIS) v3.0

**Date:** 2026-01-31  
**Status:** Requirements Refactored - Focused on GM's Actual Needs  
**Stack:** Next.js 16 + React 19 + TypeScript + Supabase + Gemini 2.5 Flash (Optional)

---

## 1. Executive Summary

**What the GM Actually Asked:**
> "I want statistics for the rejections in manufacturing by inputting the Excel sheets."

**Decoded Meaning:**
A single, reliable system that takes multiple rejection-related Excel sheets, combines them into one source of truth, and produces clear, decision-ready statistics to help control rejection-related losses, especially batch scrap risk.

**What This Is:**
A **Manufacturing Rejection Statistics Engine + Reporting Interface** - NOT an ERP, NOT real-time monitoring, NOT AI-first prediction platform.

**Core Value Proposition:**
- **Input:** Multiple Excel rejection reports (Shopfloor, Assembly, Visual, Integrity)
- **Process:** Standardization + Aggregation + Statistics calculation
- **Output:** Clear numbers that answer: "Where are rejections coming from? Which batches are at risk? How much money are we losing?"

---

## 2. Problem Statement (Medical Export Context)

### The Real Problem
> "Rejection data exists, but it is fragmented across multiple Excel sheets, making it impossible to see where rejections are coming from, which ones matter most, and which batches are at risk of being scrapped."

### Why This Is Serious
- **Even 1-2 failed samples** → entire batch scrapped
- **Scrap = direct financial loss**
- **Late detection = unavoidable loss**
- **Current Excel-based review is reactive, not preventive**

### Data Reality
**Types of Excel Sheets:**
- Shopfloor Rejection Report
- Assembly Rejection Report
- Visual Inspection Report
- Balloon & Valve Integrity Inspection
- Cumulative / Yearly Production Reports

**Common Characteristics:**
- Different formats
- Different inspection stages
- Same batch appears in multiple files
- Data is historical, fragmented, hard to correlate
- No single place to answer: "Is this batch becoming risky?"

---

## 3. Target Users

**Primary: General Manager (GM)**
- Needs: High-level statistics, batch risk visibility, financial impact
- Usage: Weekly reviews, monthly reports, batch decisions
- Tech comfort: Excel power user, needs simple UI

**Secondary: Quality Manager**
- Needs: Defect analysis, stage-wise breakdowns, corrective action data
- Usage: Daily analysis, supplier discussions, trend monitoring
- Tech comfort: Comfortable with data tools

**Tertiary: Production Supervisor**
- Needs: Line-wise statistics, immediate feedback
- Usage: Shift reviews, operator feedback
- Tech comfort: Basic computer skills

---

## 4. Core Functional Requirements

### 4.1 Excel Upload & Data Consolidation

**FR-1.1: Multi-Format Excel Support**
- System must accept Excel files from different inspection stages
- Support formats: .xlsx, .xls
- Maximum file size: 50MB per file
- Support for multiple sheets within single workbook

**FR-1.2: Column Mapping Interface (One-Time Setup)**
- Map columns like "Batch No" → Batch ID
- Map columns like "Reject Qty" → Rejected Units
- Save mapping profiles for recurring uploads
- Auto-detect common column names

**FR-1.3: Data Validation**
- Validate required columns present
- Check data types (dates, numbers)
- Flag rows with missing critical fields
- Provide clear error messages with row numbers

**FR-1.4: Batch Correlation**
- Link rejection records to specific batches
- Aggregate multiple inspections for same batch
- Track batch through different stages

### 4.2 Statistics Engine (Core)

**FR-2.1: Overall Manufacturing Statistics**
- Total units produced (from all sources)
- Total units rejected
- Overall rejection rate (%)
- Rejection trend over time (30-day rolling)

**FR-2.2: Stage-wise Rejection Statistics**
- Rejection rate by: Shopfloor, Assembly, Visual Inspection, Integrity Testing
- Contribution % of each stage to total rejections
- Stage trend comparison

**FR-2.3: Defect-wise Statistics**
- Top defect types by count and %
- % contribution of each defect to total rejections
- Trend of critical defects over time
- Pareto analysis (80/20 rule visualization)

**FR-2.4: Batch-level Statistics (CRITICAL)**
- Rejected units per batch
- Number of inspections failed per batch
- Rejection rate per batch
- Historical batch performance

**FR-2.5: Cost Impact Statistics**
- Cost of rejected units (when cost data available)
- Estimated loss per batch
- Monthly / yearly rejection cost totals
- Cost trend analysis

**FR-2.6: Line / Supplier Statistics (If Available)**
- Rejection rate per production line
- Worst-performing contributors
- Supplier quality comparison

### 4.3 Batch Risk Assessment (High Value)

**FR-3.1: Risk Scoring**
- Calculate batch risk based on:
  - Number of inspection stages failed
  - Rejection density (rejections per unit inspected)
  - Historical patterns (if available)
- Simple 3-tier system:
  - **Normal** (Green) - Within acceptable limits
  - **Watch** (Yellow) - Approaching risk threshold
  - **High Risk** (Red) - High probability of scrap

**FR-3.2: Risk Alerts**
- Highlight batches requiring immediate attention
- Show risk indicators on batch listings
- Filter views by risk level

### 4.4 User Interface (Simple, GM-Friendly)

**FR-4.1: Executive Dashboard (Minimal)**
- Overall rejection rate (large, prominent)
- Total rejected units
- Cost impact (if available)
- Trend indicator (up/down/stable)
- Top 1-2 risk areas
- Recent high-risk batches
- **No clutter, no unnecessary charts**

**FR-4.2: Statistics Pages**
Each page answers ONE question only:
- **Stage Analysis:** Where are defects introduced?
- **Defect Analysis:** What are the root causes?
- **Batch Analysis:** Which batches are risky?
- **Trend Analysis:** Is the situation improving?

**FR-4.3: Data Tables**
- Clear, sortable tables
- Export to Excel option
- Pagination for large datasets
- Filtering by date, stage, defect type, batch

**FR-4.4: Upload Management**
- List of uploaded files
- Upload date, status, record count
- Re-upload option
- Delete/archive old uploads

### 4.5 Reporting & Export

**FR-4.6: Standard Reports**
- Monthly rejection summary
- Stage-wise summary
- Defect Pareto report
- Batch risk report
- Cost impact report (if cost data available)

**FR-4.7: Export Options**
- Export any view to Excel
- Export to PDF (for presentations)
- Scheduled report generation (future)

### 4.6 Data Trust & Auditability

**FR-4.8: Data Lineage**
- Show which Excel file each record came from
- Link back to original row numbers
- Clear calculation logic displayed
- No black-box numbers

---

## 5. Non-Functional Requirements

### 5.1 Performance
- Excel upload processing: < 30 seconds for 10,000 rows
- Dashboard load: < 2 seconds
- Statistics queries: < 3 seconds
- Support for 1M+ rejection records

### 5.2 Reliability
- 99.5% uptime (internal system)
- Data validation before storage
- Backup of uploaded files in Supabase Storage
- Error recovery for failed uploads

### 5.3 Usability
- No training required for GM
- Interface similar to Excel (familiar)
- Clear labels, no technical jargon
- Mobile-responsive for tablet viewing

### 5.4 Security
- Role-based access (GM, Quality Manager, Supervisor)
- Secure file upload validation
- No sensitive data in URLs
- Session management

### 5.5 Maintainability
- Well-documented codebase
- Modular architecture
- Easy to add new Excel formats
- Simple deployment process

---

## 6. Out of Scope (To Avoid Creep)

**Explicitly NOT Included:**
- ❌ Real-time machine monitoring
- ❌ SPC (Statistical Process Control) automation
- ❌ Operator-level control system
- ❌ Predictive AI/ML models (basic stats only)
- ❌ Integration with ERP/MES systems
- ❌ IoT sensor data
- ❌ Video/image analysis
- ❌ Complex workflow automation

---

## 7. Technical Architecture

### 7.1 Stack (Simplified)
- **Frontend:** Next.js 16 + React 19 + TypeScript
- **Styling:** CSS Modules (no heavy UI framework)
- **Database:** Supabase PostgreSQL
- **Storage:** Supabase Storage (uploaded Excel files)
- **AI:** Gemini 2.5 Flash (Optional - for summary text only)
- **Excel Processing:** xlsx library (client-side parsing)

### 7.2 Database Schema (Simplified)

**Core Tables:**
```sql
-- Batches (central entity)
batches: id, batch_number, product_name, production_date, status

-- Rejection Records (consolidated from all sources)
rejection_records: 
  id, batch_id, stage (enum), defect_type, 
  rejected_quantity, inspection_date, source_file

-- Defect Types (master data)
defect_types: id, code, name, category, severity

-- Uploaded Files (tracking)
uploaded_files: 
  id, filename, upload_date, record_count, 
  status, column_mapping

-- Cost Data (optional)
rejection_costs: 
  id, batch_id, unit_cost, total_cost, currency
```

### 7.3 Key Components

**Excel Processor:**
- Parse Excel files (xlsx library)
- Apply column mappings
- Validate data
- Bulk insert to database

**Statistics Engine:**
- SQL aggregation queries
- Time-series calculations
- Pareto analysis
- Batch risk scoring

**Dashboard:**
- Simple KPI display
- Minimal charts (only if essential)
- Data tables

---

## 8. Success Metrics

### 8.1 Business Metrics
- GM uses system weekly for reviews
- Batch scrap incidents reduced by 20%
- Time to identify at-risk batches: < 5 minutes
- All rejection data consolidated (no more Excel hunting)

### 8.2 System Metrics
- Upload processing success rate: > 95%
- Dashboard load time: < 2 seconds
- User satisfaction score: > 4/5
- Zero data loss incidents

---

## 9. Implementation Phases (Simplified)

### Phase 1: Foundation (Week 1)
- Database setup (Supabase)
- Basic Excel upload
- Simple data storage

### Phase 2: Core Statistics (Week 2)
- Statistics calculations
- Basic dashboard
- Stage/defect analysis pages

### Phase 3: Batch Risk (Week 3)
- Batch correlation logic
- Risk scoring algorithm
- Risk indicators in UI

### Phase 4: Polish (Week 4)
- UI refinement
- Reports & export
- Cost tracking (if data available)
- Testing & bug fixes

---

## 10. User Communication

**How to Explain to GM:**
> "We will create a system where you can upload all your rejection-related Excel files and get one clear view of rejection statistics — overall, stage-wise, defect-wise, and batch-wise. This will help you quickly see where rejections are coming from, which batches are becoming risky, and how much money is being lost, so corrective actions can be taken earlier."

---

## 11. Final Takeaway

**The GM asked for statistics, not software.**

Our job is to:
- Turn Excel chaos into **clear numbers**
- Turn numbers into **visibility**
- Turn visibility into **control**

**Keep it simple, focused, and useful.**
