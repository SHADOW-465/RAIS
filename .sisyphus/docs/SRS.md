# Software Requirements Specification (SRS)
# Manufacturing Rejection Statistics System (RAIS) v3.0

**Date:** 2026-01-31  
**Status:** Simplified Requirements - Focused on Statistics  
**Stack:** Next.js + Supabase

---

## 1. Introduction

### 1.1 Purpose
This SRS defines requirements for a Manufacturing Rejection Statistics System that consolidates rejection data from multiple Excel sources into clear, decision-ready statistics.

### 1.2 Scope
**In Scope:**
- Excel file upload and consolidation
- Statistical calculations (rejection rates, trends, costs)
- Batch risk assessment
- Simple reporting interface

**Out of Scope:**
- Real-time monitoring
- Predictive AI/ML
- ERP integration
- Operator control systems

---

## 2. System Overview

### 2.1 System Context
```
[Excel Files] → [Upload] → [Consolidation] → [Statistics Engine] → [Reports]
     ↑                                                                     ↓
[Users] ←——————————————————[Dashboard/UI]←——————————————————————————————┘
```

### 2.2 Key Entities

**Batch:** Central entity. A production batch that may have rejections across multiple inspection stages.

**Rejection Record:** Individual rejection entry consolidated from Excel sources.

**Inspection Stage:** Where rejection occurred (Shopfloor, Assembly, Visual, Integrity).

**Defect Type:** Classification of rejection (Dimensional, Visual, Functional, etc.).

---

## 3. Functional Requirements

### 3.1 Excel Upload (F-01)

**F-01.01: File Upload**
- System shall accept Excel files (.xlsx, .xls)
- Maximum file size: 50MB
- Multiple file upload supported
- Store original files in Supabase Storage

**F-01.02: Column Mapping**
- User can map Excel columns to system fields:
  - Batch ID ← "Batch No", "Batch Number", "BatchID"
  - Rejected Quantity ← "Reject Qty", "Rejected", "Rejection Count"
  - Date ← "Date", "Inspection Date", "Timestamp"
  - Stage ← "Stage", "Inspection Stage", "Department"
  - Defect Type ← "Defect", "Defect Type", "Rejection Type"
- Save mapping templates for reuse
- Auto-suggest mappings based on column names

**F-01.03: Data Validation**
- Validate required fields: Batch ID, Rejected Quantity, Date
- Reject non-numeric quantities
- Parse dates in multiple formats
- Report validation errors with row numbers
- Allow partial upload (skip invalid rows)

**F-01.04: Upload Tracking**
- Track upload status: Pending, Processing, Completed, Failed
- Store record count, processed count, failed count
- Allow re-upload of failed files

### 3.2 Data Consolidation (F-02)

**F-02.01: Batch Matching**
- Link rejection records to batches by Batch ID
- Handle slight variations in Batch ID (case insensitive, trim whitespace)
- Create batch records if not exists

**F-02.02: Stage Normalization**
- Normalize stage names:
  - "Shopfloor", "SF", "Production" → SHOPFLOOR
  - "Assembly", "ASM" → ASSEMBLY
  - "Visual", "Visual Inspection", "VI" → VISUAL
  - "Integrity", "Balloon Test", "Valve Test" → INTEGRITY

**F-02.03: Defect Normalization**
- Normalize defect type names
- Maintain defect type master list
- Auto-categorize defects if pattern matches

### 3.3 Statistics Calculation (F-03)

**F-03.01: Overall Statistics**
```
Total Rejection Rate = (Total Rejected Units / Total Inspected Units) × 100
Trend = Compare current period vs previous period
```

**F-03.02: Stage-wise Statistics**
```
Stage Rejection Rate = (Stage Rejections / Total Stage Inspections) × 100
Stage Contribution % = (Stage Rejections / Total Rejections) × 100
```

**F-03.03: Defect-wise Statistics**
```
Defect Count = Sum of rejected quantity by defect type
Defect Contribution % = (Defect Rejections / Total Rejections) × 100
Pareto % = Cumulative contribution of top defects
```

**F-03.04: Batch Statistics**
```
Batch Rejection Rate = (Batch Rejections / Batch Production) × 100
Inspections Failed = Count of stages with rejections
Rejection Density = Rejections per unit inspected
```

**F-03.05: Cost Statistics (if cost data provided)**
```
Cost of Rejection = Rejected Quantity × Unit Cost
Total Loss = Sum of all rejection costs
Cost per Batch = Batch rejection cost
```

### 3.4 Batch Risk Assessment (F-04)

**F-04.01: Risk Calculation**
Risk Score = f(Stage Failures, Rejection Density, Severity)

Simple 3-tier:
- **Normal (Green):** ≤1 stage failed, density < threshold
- **Watch (Yellow):** 2 stages failed OR density approaching threshold  
- **High Risk (Red):** ≥3 stages failed OR density above threshold OR critical defect

**F-04.02: Risk Display**
- Show risk indicator on all batch listings
- Filter batches by risk level
- Highlight recent high-risk batches on dashboard

### 3.5 User Interface (F-05)

**F-05.01: Executive Dashboard**
Display (minimal, no clutter):
- Large overall rejection rate
- Total rejected units (this month)
- Cost impact (if available)
- Trend arrow (up/down/stable)
- Recent high-risk batches (top 5)
- Quick upload button

**F-05.02: Statistics Views**
Each view is a simple table with filters:
- **By Stage:** Stage name | Rejections | Rate % | Contribution %
- **By Defect:** Defect name | Count | Rate % | Trend
- **By Batch:** Batch ID | Rejections | Rate % | Risk | Stages Failed
- **By Date:** Date | Rejections | Rate % | Trend

**F-05.03: Filters**
- Date range picker
- Stage multi-select
- Defect type multi-select
- Risk level filter
- Batch ID search

**F-05.04: Export**
- Export any view to Excel
- Export to PDF
- Include metadata (generated date, filters applied)

### 3.6 Reports (F-06)

**F-06.01: Monthly Summary Report**
- Overall statistics for month
- Stage-wise breakdown
- Top defects
- High-risk batches
- Cost summary (if available)

**F-06.02: Batch Risk Report**
- All batches with risk indicators
- Detailed rejection breakdown per batch
- Recommended actions (template)

---

## 4. Non-Functional Requirements

### 4.1 Performance (NF-01)
- Excel processing: 10,000 rows in < 30 seconds
- Dashboard load: < 2 seconds
- Statistics query: < 3 seconds
- Support 100+ concurrent users

### 4.2 Reliability (NF-02)
- 99.5% uptime
- Data validation before storage
- No data loss on upload failure
- Automatic retry on transient errors

### 4.3 Security (NF-03)
- User authentication required
- Role-based access control
  - GM: Full access
  - Quality Manager: Full access
  - Supervisor: Read-only + upload
- Secure file upload (scan for malicious content)
- No SQL injection vulnerabilities

### 4.4 Usability (NF-04)
- No training required
- Excel-like interface where possible
- Clear error messages
- Mobile-responsive (tablet-friendly)

### 4.5 Maintainability (NF-05)
- Modular code structure
- Well-commented SQL queries
- Configuration files for thresholds
- Simple deployment process

---

## 5. Interface Requirements

### 5.1 User Interfaces

**Dashboard Page:**
```
┌─────────────────────────────────────┐
│  RAIS - Manufacturing Statistics    │
├─────────────────────────────────────┤
│  Overall Rejection Rate: 3.2%  ↗️   │
│  This Month: 1,247 units rejected   │
│  Est. Loss: $12,470                 │
├─────────────────────────────────────┤
│  [Upload New Data]                  │
├─────────────────────────────────────┤
│  High Risk Batches:                 │
│  ⚠️ BT-2024-089 (Assembly + Visual) │
│  ⚠️ BT-2024-091 (3 stages failed)   │
├─────────────────────────────────────┤
│  [View by Stage] [View by Defect]   │
│  [View by Batch] [View Trends]      │
└─────────────────────────────────────┘
```

**Statistics Table:**
```
┌─────────────┬──────────┬────────┬──────────────┐
│ Batch ID    │ Rejected │ Rate % │ Risk         │
├─────────────┼──────────┼────────┼──────────────┤
│ BT-2024-089 │     45   │   4.5% │ 🔴 High Risk │
│ BT-2024-087 │     12   │   1.2% │ 🟢 Normal    │
│ BT-2024-085 │     28   │   2.8% │ 🟡 Watch     │
└─────────────┴──────────┴────────┴──────────────┘
[Export to Excel] [Filter by Date] [Filter by Risk]
```

### 5.2 API Interfaces

**Upload Endpoint:**
```
POST /api/upload
Request: multipart/form-data (Excel file)
Response: { uploadId, status, recordCount, errors }
```

**Statistics Endpoint:**
```
GET /api/statistics/overall?from=2024-01-01&to=2024-01-31
Response: { totalRejected, totalInspected, rejectionRate, trend }

GET /api/statistics/by-stage?from=...&to=...
Response: [{ stage, rejections, rate, contribution }]

GET /api/statistics/by-defect?from=...&to=...
Response: [{ defectType, count, rate, contribution }]

GET /api/statistics/by-batch?from=...&to=...&riskLevel=...
Response: [{ batchId, rejections, rate, risk, stagesFailed }]
```

---

## 6. Data Requirements

### 6.1 Data Model (Simplified)

```sql
-- Batches (Core Entity)
CREATE TABLE batches (
  id SERIAL PRIMARY KEY,
  batch_number VARCHAR(50) UNIQUE NOT NULL,
  product_name VARCHAR(100),
  production_date DATE,
  total_produced INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Rejection Records (Consolidated Data)
CREATE TABLE rejection_records (
  id SERIAL PRIMARY KEY,
  batch_id INTEGER REFERENCES batches(id),
  stage VARCHAR(20) NOT NULL, -- SHOPFLOOR, ASSEMBLY, VISUAL, INTEGRITY
  defect_type VARCHAR(50) NOT NULL,
  rejected_quantity INTEGER NOT NULL,
  inspection_date DATE NOT NULL,
  source_file VARCHAR(255),
  source_row INTEGER,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Defect Types (Master Data)
CREATE TABLE defect_types (
  id SERIAL PRIMARY KEY,
  code VARCHAR(20) UNIQUE NOT NULL,
  name VARCHAR(100) NOT NULL,
  category VARCHAR(50),
  severity VARCHAR(20) -- LOW, MEDIUM, HIGH, CRITICAL
);

-- Uploaded Files (Tracking)
CREATE TABLE uploaded_files (
  id SERIAL PRIMARY KEY,
  filename VARCHAR(255) NOT NULL,
  storage_path VARCHAR(500),
  upload_date TIMESTAMP DEFAULT NOW(),
  status VARCHAR(20) DEFAULT 'PENDING', -- PENDING, PROCESSING, COMPLETED, FAILED
  record_count INTEGER DEFAULT 0,
  processed_count INTEGER DEFAULT 0,
  failed_count INTEGER DEFAULT 0,
  column_mapping JSONB,
  error_message TEXT
);

-- Cost Data (Optional)
CREATE TABLE batch_costs (
  id SERIAL PRIMARY KEY,
  batch_id INTEGER REFERENCES batches(id),
  unit_cost DECIMAL(10,2),
  currency VARCHAR(3) DEFAULT 'USD',
  calculated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for Performance
CREATE INDEX idx_rejection_batch ON rejection_records(batch_id);
CREATE INDEX idx_rejection_date ON rejection_records(inspection_date);
CREATE INDEX idx_rejection_stage ON rejection_records(stage);
CREATE INDEX idx_rejection_defect ON rejection_records(defect_type);
CREATE INDEX idx_batch_number ON batches(batch_number);
```

### 6.2 Data Volumes
- Expected: 1,000-10,000 rejection records per month
- Peak: 50,000 records per month
- Retention: 2 years (configurable)
- File storage: 100MB per month (Excel files)

---

## 7. Constraints

### 7.1 Technical Constraints
- Must use Supabase (PostgreSQL)
- Must use Next.js App Router
- Excel processing must handle 50,000 rows
- No external AI services required (optional Gemini for summaries only)

### 7.2 Business Constraints
- Medical export compliance (data integrity)
- Batch ID is primary correlation key
- Rejection data is historical (not real-time)
- Excel is primary input method

---

## 8. Acceptance Criteria

### 8.1 Upload Feature
- [ ] Can upload Excel file with 1,000 rows successfully
- [ ] Column mapping saves and reapplies
- [ ] Validation errors shown with row numbers
- [ ] Upload status tracked and displayed

### 8.2 Statistics Feature
- [ ] Overall rejection rate calculates correctly
- [ ] Stage-wise breakdown adds up to 100%
- [ ] Batch risk scores calculate consistently
- [ ] Trends show correct direction (up/down)

### 8.3 UI Feature
- [ ] GM can view dashboard without training
- [ ] All tables sort and filter correctly
- [ ] Export produces valid Excel file
- [ ] Mobile view is readable on tablet

### 8.4 Performance
- [ ] Dashboard loads in < 2 seconds
- [ ] 10,000 row Excel processes in < 30 seconds
- [ ] Statistics queries return in < 3 seconds

---

## 9. Appendix

### 9.1 Glossary

**Batch:** A production lot identified by Batch ID (e.g., BT-2024-089)

**Stage:** Inspection point where rejection detected (Shopfloor, Assembly, Visual, Integrity)

**Defect Type:** Classification of rejection reason

**Rejection Density:** Rejections per unit inspected in a batch

**Risk Score:** Calculated score indicating batch scrap risk

### 9.2 Risk Thresholds (Configurable)

```javascript
const RISK_THRESHOLDS = {
  normal: {
    maxStagesFailed: 1,
    maxRejectionDensity: 0.03, // 3%
  },
  watch: {
    maxStagesFailed: 2,
    maxRejectionDensity: 0.05, // 5%
  },
  highRisk: {
    minStagesFailed: 3,
    minRejectionDensity: 0.05, // 5%
  }
};
```

### 9.3 Example Statistics Output

```json
{
  "overall": {
    "period": "2024-01",
    "totalRejected": 1247,
    "totalInspected": 38900,
    "rejectionRate": 3.21,
    "trend": "up",
    "trendDelta": 0.4,
    "estimatedLoss": 12470.00
  },
  "byStage": [
    { "stage": "ASSEMBLY", "rejections": 523, "rate": 4.2, "contribution": 41.9 },
    { "stage": "VISUAL", "rejections": 418, "rate": 2.8, "contribution": 33.5 },
    { "stage": "SHOPFLOOR", "rejections": 186, "rate": 1.5, "contribution": 14.9 },
    { "stage": "INTEGRITY", "rejections": 120, "rate": 1.2, "contribution": 9.6 }
  ],
  "byDefect": [
    { "defect": "DIMENSIONAL", "count": 445, "contribution": 35.7 },
    { "defect": "VISUAL", "count": 312, "contribution": 25.0 },
    { "defect": "LEAKAGE", "count": 278, "contribution": 22.3 }
  ],
  "highRiskBatches": [
    { "batchId": "BT-2024-089", "rejections": 45, "risk": "HIGH", "stagesFailed": 2 },
    { "batchId": "BT-2024-091", "rejections": 67, "risk": "HIGH", "stagesFailed": 3 }
  ]
}
```
