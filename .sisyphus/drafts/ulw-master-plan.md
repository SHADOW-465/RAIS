# ULW MASTER PLAN: RAIS Manufacturing Dashboard
## Complete Implementation Strategy

**Status:** Ready for Approval  
**Scope:** Full Application Refactor + All 7 Pages  
**Data Source:** REJECTION DATA/ folder (6 Excel files)  
**Design Reference:** UI-Design Context.md + 7 reference images  
**Skill:** frontend-ui-ux (Premium Design Execution)

---

## 📊 PHASE 0: Data Structure Analysis

### Excel Files Inventory (REJECTION DATA/)
1. **ASSEMBLY REJECTION REPORT.xlsx** - Assembly stage rejections
2. **VISUAL INSPECTION REPORT 2025.xlsx** - Visual inspection data
3. **BALLOON & VALVE INTEGRITY INSPECTION REPORT FILE 2025.xlsx** - Integrity testing
4. **SHOPFLOOR REJECTION REPORT.xlsx** - Shopfloor production issues
5. **YEARLY PRODUCTION COMMULATIVE 2025-26.xlsx** - Production totals
6. **COMMULATIVE 2025-26.xlsx** - Cumulative rejection data

### Expected Column Mappings (Based on Manufacturing QC Standards)
| Standard Field | Excel Variations | Pattern |
|----------------|------------------|---------|
| **Batch ID** | Batch No, Lot No, Batch Number | `batch_id` |
| **Date** | Date, Inspection Date, Timestamp | `timestamp` |
| **Stage** | Assembly, Visual, Integrity, Shopfloor | `stage` |
| **Defect Type** | Defect, Rejection Type, Defect Description | `defectType` |
| **Quantity** | Reject Qty, Rejected, Quantity | `quantity` |
| **Line** | Line, Production Line, Line No | `line` |
| **Supplier** | Supplier, Vendor, Supplier Name | `supplier` |
| **Reason** | Reason, Cause, Remarks | `reason` |

**Current Schema Detection:** Already implemented in `schemaDetector.ts` with fuzzy matching and Levenshtein distance algorithm. Will enhance with batch-specific patterns.

---

## 🎨 PHASE 1: Visual Design System (Aesthetic Direction)

### Design Philosophy: "Executive Control Room"
**Tone:** Premium, calm, confident, insight-forward  
**Reference:** Modo AI-style enterprise dashboards  
**Target User:** GM with weak eyesight, limited time

### Color System (From UI-Design Context.md)
```yaml
# Backgrounds
color.background.primary: #FFFFFF      # Main canvas
color.background.secondary: #F7F8FA   # Sidebar background
color.background.card: #FFFFFF         # Card surfaces

# Text
color.text.primary: #1F2937            # Dark charcoal (not pure black)
color.text.secondary: #6B7280          # Secondary text

# Accent (ONE warm accent only)
color.accent.primary: #F59E0B          # Soft amber/orange

# Status (3-tier risk system)
color.status.normal: #9CA3AF           # Gray
color.status.watch: #F59E0B            # Amber
color.status.high: #EF4444             # Muted red
```

### Typography Scale
```yaml
font.size.kpi: 32px / Semibold         # Hero numbers
font.size.heading: 20px / Medium       # Section titles
font.size.body: 16px / Regular         # Primary text
font.size.secondary: 14px / Regular    # Secondary text
font.size.label: 12px / Medium         # Small labels
```

### Layout Grid
```yaml
Canvas: 1440px fixed
Content Max Width: 1200px
Sidebar: 240px fixed
TopBar: 72px height
Padding: 24px
Grid: 12-column, 24px gutter
```

### Component Specs (Figma-Accurate)

**KPI Card (260×120)**
- Layout: Vertical, 16px padding, 8px itemSpacing
- Border radius: 12px
- Shadow: subtle (0 4px 12px rgba(0,0,0,0.05))
- Children: KPI Value (32px) → Label (14px) → Delta (12px)

**Table Row (56px height)**
- Layout: Horizontal, 16px horizontal padding
- Variants: normal, watch, high-risk
- Columns: Batch ID | Product | Defect Summary | Risk Badge | Action

**Risk Badge**
- Layout: Horizontal, 4px vertical / 8px horizontal padding
- Border radius: 999px (pill)
- Variants: Normal (gray), Watch (amber), High Risk (red)

---

## 🏗️ PHASE 2: Application Architecture

### Current State Analysis
**Already Built:**
- ✅ Next.js 16 + React 19 + TypeScript
- ✅ Supabase backend (PostgreSQL, Auth, Storage)
- ✅ Excel processing pipeline (schema detection, validation)
- ✅ Repository pattern (rejectionRepository, etc.)
- ✅ Upload system with Supabase Storage
- ✅ 7 pages exist but DON'T match design spec
- ✅ CSS variables in globals.css (needs color update)

**Critical Gaps:**
- ❌ Batch Risk page (CORE page missing)
- ❌ TopBar component (72px floating bar)
- ❌ Side panel pattern (overlay drill-downs)
- ❌ Color system misaligned (gold → amber)
- ❌ Layout doesn't follow Figma specs

### Refactor Strategy
1. **Keep:** Data layer, upload pipeline, Supabase integration
2. **Update:** Color tokens, typography, spacing
3. **Create:** TopBar, SidePanel, Batch Risk page
4. **Refactor:** All 7 page layouts to match Figma specs exactly

### Data Flow
```
Excel Files → Schema Detection → Validation → Supabase
                                           ↓
Dashboard ← RejectionRepository ← PostgreSQL
    ↓
  KPI Cards, Charts, Tables, Risk Assessment
```

---

## 📄 PHASE 3: Page-by-Page Implementation Plan

### PAGE 1: Executive Overview (/) - REFACTOR
**Primary Question:** "How bad is rejection today, and should I worry?"

**Layout (Frame 3.1: 1440×1024)**
```
┌─────────────────────────────────────────────────────────────┐
│ TopBar (72px)                                               │
├──────────────┬──────────────────────────────────────────────┤
│              │ 4 KPI Cards (horizontal, 260×120 each)       │
│  Sidebar     │ [Batches at Risk] [Avg Defects] [Scrap %] [Loss]│
│  (240px)     ├──────────────────────────────────────────────┤
│              │ High Risk Batch List (8 cols) │ Insight (4)   │
│              │ • Batch ID                    │ ⚠️ Warning    │
│              │ • Product                     │ "45% failure  │
│              │ • Defect Summary              │  in valve     │
│              │ • Risk Badge                  │  assembly"    │
│              │ • Action                      │ [Inspect]     │
│              ├──────────────────────────────────────────────┤
│              │ Selected Batch Detail (appears on click)      │
│              │ • Sparkline • Tabs • Action buttons           │
└──────────────┴──────────────────────────────────────────────┘
```

**Components Needed:**
- TopBar (new)
- KPICard (refactor existing MetricCard)
- HighRiskBatchTable (new, 8 cols)
- InsightPanel (new, 4 cols)
- BatchDetailPanel (new, slide-in)

**Data Requirements:**
- Risk calculation: rejection_rate > 1% = HIGH
- Aggregation by batch
- Top risk batch list
- AI insight generation (existing geminiService)

---

### PAGE 2: Rejection Trends (/trends) - REFACTOR
**Primary Question:** "Are we improving or deteriorating?"

**Layout (Frame 4.1)**
```
┌─────────────────────────────────────────────────────────────┐
│ TopBar: "Rejection Trends"         [Weekly ▼] [Export]      │
├─────────────────────────────────────────────────────────────┤
│ Large Trend Chart (full width, 360px height)                │
│ • Line chart with soft gradient fill                        │
│ • Rejection % over time                                     │
│ • Annotations on abnormal spikes                            │
├─────────────────────────────────────────────────────────────┤
│ [Current: 3.2%] [Previous: 2.8%] [Delta: +14% ▲]           │
└─────────────────────────────────────────────────────────────┘
```

**Components Needed:**
- TrendChart (refactor existing)
- MetricChips (new, 3-chip comparison)
- Weekly/Monthly Toggle (new)

**Data Requirements:**
- Time-series aggregation by day/week/month
- Comparison with previous period
- Anomaly detection for spikes

---

### PAGE 3: Defect Analysis (/analysis) - REFACTOR
**Primary Question:** "What defects hurt us the most?"

**Layout (Frame 5.1)**
```
┌─────────────────────────────────────────────────────────────┐
│ TopBar: "Defect Analysis"                                   │
├─────────────────────────────────────────────────────────────┤
│ Pareto Chart (full width, 360px)                            │
│ • Left: Horizontal bar chart (Top 5 defects)               │
│ • Right: Cumulative % line                                  │
├─────────────────────────────────────────────────────────────┤
│ Defect Summary Table                                        │
│ • Defect Name | Rejected Units | % | Trend | Action        │
│ Click row → Opens side panel (not new page)                │
└─────────────────────────────────────────────────────────────┘
```

**Side Panel (on defect click):**
```
┌─────────────────────────────┐
│ Defect: Valve Leakage    [X]│
├─────────────────────────────┤
│ [Sparkline: trend]          │
├─────────────────────────────┤
│ Affected Stages:            │
│ • Assembly (45%)            │
│ • Integrity (30%)           │
├─────────────────────────────┤
│ Affected Batches:           │
│ • BT-2025-001               │
│ • BT-2025-015               │
└─────────────────────────────┘
```

**Components Needed:**
- ParetoChart (new)
- DefectTable (refactor existing DataTable)
- SlidePanel (new, reusable)

---

### PAGE 4: Batch Risk (/batch-risk) - **CREATE NEW**
**Primary Question:** "Which batches must I act on now?"

**⚠️ MOST CRITICAL - Page doesn't exist!**

**Layout (Frame 6.1)**
```
┌─────────────────────────────────────────────────────────────┐
│ TopBar: "Batch Risk Assessment"                             │
├─────────────────────────────────────────────────────────────┤
│ [Total: 156] [At Risk: 12 🔴] [Under Observation: 8 🟡]      │
├─────────────────────────────────────────────────────────────┤
│ Batch Risk List (card/table hybrid)                         │
│ • Batch ID | Failed Inspections | Defect Summary | Risk     │
│ • BT-2025-089 | 3 stages | Leak, Misalign | 🔴 HIGH        │
│ • BT-2025-087 | 2 stages | Crack | 🟡 WATCH                │
│ • BT-2025-085 | 1 stage | Minor dent | ⚪ NORMAL           │
└─────────────────────────────────────────────────────────────┘
```

**Risk Level Logic:**
```typescript
Normal: rejection_rate < 0.5% AND stages_failed <= 1
Watch: rejection_rate 0.5-1% OR stages_failed = 2
High: rejection_rate > 1% OR stages_failed >= 3
```

**Components Needed:**
- RiskSummaryCards (3 cards)
- RiskBadge (3 variants)
- BatchRiskTable (spacious rows)

---

### PAGE 5: Stage Analysis (/stage-analysis) - REFACTOR/RENAME
**Primary Question:** "Where in the process are failures originating?"

**Layout (Frame 7.1)**
```
┌─────────────────────────────────────────────────────────────┐
│ TopBar: "Stage / Process Analysis"  [Units ▼]              │
├─────────────────────────────────────────────────────────────┤
│ Vertical Bar Chart (rejection rate by stage)                │
│ • Shopfloor (1.5%)                                          │
│ • Assembly (4.2%)                                           │
│ • Visual (2.8%)                                             │
│ • Integrity (1.2%)                                          │
├─────────────────────────────────────────────────────────────┤
│ Supporting Table                                            │
│ Stage | Produced | Rejected | Rejection %                   │
└─────────────────────────────────────────────────────────────┘
```

**Components Needed:**
- StageBarChart (vertical)
- StageTable
- Units/% Toggle

---

### PAGE 6: Reports (/reports) - REFACTOR
**Primary Question:** "What do I export or audit?"

**Layout (Frame 8.1)**
```
┌─────────────────────────────────────────────────────────────┐
│ TopBar: "Reports"                                           │
├─────────────────────────────────────────────────────────────┤
│ [Monthly Summary]    [Defect Pareto]                        │
│ Generate summary     Top defects analysis                   │
│ [📊 Excel] [📄 PDF]  [📊 Excel] [📄 PDF]                    │
├─────────────────────────────────────────────────────────────┤
│ [Batch Risk]         [Stage-wise]                           │
│ Risk assessment      Process breakdown                      │
│ [📊 Excel] [📄 PDF]  [📊 Excel] [📄 PDF]                    │
└─────────────────────────────────────────────────────────────┘
```

**Components Needed:**
- ReportCard (2×2 grid)
- Export buttons (Excel/PDF)

---

### PAGE 7: Data Upload (/settings/upload) - POLISH
**Primary Question:** "Is my data ready and correct?"

**Layout (Frame 9.1)**
```
┌─────────────────────────────────────────────────────────────┐
│ TopBar: "Data Upload"                                       │
├─────────────────────────────────────────────────────────────┤
│ Drag & Drop Zone (dashed border, 160px height)              │
│ 📁 Drop Excel files here or click to browse                 │
├─────────────────────────────────────────────────────────────┤
│ Uploaded Files List                                         │
│ File Name | Upload Date | Status                            │
│ assembly.xlsx | Jan 15, 2025 | ✅ Processed (234 records)   │
│ visual.xlsx | Jan 16, 2025 | ⚠️ Validating...               │
└─────────────────────────────────────────────────────────────┘
```

**Components Needed:**
- UploadZone (polish existing)
- FileListTable (polish existing)
- Status badges

---

## 🧩 PHASE 4: Component Library

### New Components to Build
1. **TopBar** - 72px floating bar with greeting, date picker, export
2. **SlidePanel** - Right-side overlay panel (4 columns)
3. **RiskBadge** - 3-tier status badges (Normal/Watch/High)
4. **KPICard** - 260×120 hero cards with delta indicators
5. **ParetoChart** - Bar + cumulative line chart
6. **MetricChip** - Small comparison chips
7. **DateRangePicker** - Pill-style selector

### Refactored Components
1. **Sidebar** - Update colors, add Batch Risk nav
2. **TrendChart** - Add gradient fill, annotations
3. **DataTable** - Add risk row variants
4. **UploadZone** - Polish styling

---

## 🎨 PHASE 5: CSS Design System Update

### globals.css Changes
```css
/* UPDATE COLORS */
--color-accent: #F59E0B;           /* Change from gold to amber */
--color-status-normal: #9CA3AF;    /* Gray */
--color-status-watch: #F59E0B;     /* Amber */
--color-status-high: #EF4444;      /* Red */

/* SPACING ALIGNMENT */
--spacing-xs: 4px;   /* XS */
--spacing-sm: 8px;   /* SM */
--spacing-md: 16px;  /* MD */
--spacing-lg: 24px;  /* LG */
--spacing-xl: 32px;  /* XL */

/* COMPONENT SPECIFIC */
--sidebar-width: 240px;
--topbar-height: 72px;
--kpi-card-width: 260px;
--kpi-card-height: 120px;
--table-row-height: 56px;
```

---

## 📊 PHASE 6: Data Layer Enhancements

### New Repository Methods Needed
```typescript
// rejectionRepository.ts additions:
- getBatchesByRisk(from, to, riskLevel)
- getBatchDetail(batchId)
- getDefectPareto(from, to, limit)
- getStageAnalysis(from, to)
- getRiskSummary(from, to)
```

### Risk Calculation Service
```typescript
// New: riskAssessment.ts
calculateRiskLevel(batch: Batch): RiskLevel {
  if (batch.rejectionRate > 0.01 || batch.stagesFailed >= 3) {
    return 'HIGH';
  } else if (batch.rejectionRate > 0.005 || batch.stagesFailed === 2) {
    return 'WATCH';
  }
  return 'NORMAL';
}
```

---

## 🔄 PHASE 7: Implementation Order (Waves)

### Wave 1: Foundation (Day 1)
- [ ] Update globals.css with new color tokens
- [ ] Create TopBar component
- [ ] Update Sidebar navigation (add Batch Risk)
- [ ] Create SlidePanel component

### Wave 2: Core Pages (Day 1-2)
- [ ] Refactor Executive Overview page
- [ ] Create Batch Risk page (NEW)
- [ ] Refactor Rejection Trends page

### Wave 3: Analysis Pages (Day 2-3)
- [ ] Refactor Defect Analysis (add Pareto, side panel)
- [ ] Refactor Stage Analysis page
- [ ] Refactor Reports page

### Wave 4: Data Integration (Day 3-4)
- [ ] Add risk calculation methods to repository
- [ ] Connect all pages to real Supabase data
- [ ] Implement side panel data loading
- [ ] Polish Data Upload page

### Wave 5: Testing & Polish (Day 4-5)
- [ ] Test with actual Excel files from REJECTION DATA/
- [ ] Verify all risk calculations
- [ ] Ensure responsive behavior
- [ ] Add loading states and error handling

---

## ✅ Success Criteria

### Must Have (Critical)
- [ ] All 7 pages functional with exact Figma layouts
- [ ] Batch Risk page fully operational with 3-tier system
- [ ] Top bar with greeting, date selector, export on all pages
- [ ] Side panel drill-down on Defect Analysis
- [ ] Real data from Supabase on all pages
- [ ] Risk badges: Normal (gray), Watch (amber), High (red)

### Should Have (Important)
- [ ] Pareto chart with cumulative line
- [ ] Weekly/Monthly toggle on Trends
- [ ] Selected batch detail panel on Overview
- [ ] Export functionality (Excel/PDF)
- [ ] Responsive tablet view

### Nice to Have (Enhancement)
- [ ] All microinteractions (hover, transitions)
- [ ] WCAG AAA accessibility
- [ ] AI-generated insights on all pages
- [ ] Real-time data refresh

---

## 📁 Files to Create/Modify

### New Files
```
src/components/
  TopBar.tsx                    # NEW
  TopBar.module.css             # NEW
  SlidePanel.tsx                # NEW
  SlidePanel.module.css         # NEW
  RiskBadge.tsx                 # NEW
  KPICard.tsx                   # NEW (refactor from MetricCard)
  ParetoChart.tsx               # NEW

src/app/
  batch-risk/
    page.tsx                    # NEW
    page.module.css             # NEW

src/lib/analytics/
  riskAssessment.ts             # NEW
```

### Modified Files
```
src/app/
  globals.css                   # UPDATE colors
  page.tsx                      # REFACTOR layout
  trends/page.tsx               # REFACTOR
  analysis/page.tsx             # REFACTOR
  supplier/page.tsx             # REFACTOR (to Stage Analysis)
  reports/page.tsx              # REFACTOR
  settings/upload/page.tsx      # POLISH

src/components/
  Sidebar.tsx                   # UPDATE nav
  Sidebar.module.css            # UPDATE colors
```

---

## 🎯 Approval Request

**I am ready to execute this ULW plan.** 

**What I'll deliver:**
- Complete working application with all 7 pages
- Exact Figma-frame layouts from UI-Design Context.md
- Real Supabase data integration
- All 6 Excel file formats supported
- Premium executive SaaS aesthetic
- Risk assessment logic working with actual data
- Side panel interactions
- Export functionality

**Execution time:** 5 days of focused work  
**Output:** Production-ready RAIS dashboard

**Please confirm:**
1. ✅ Proceed with all 7 pages?
2. ✅ Use amber accent (#F59E0B) instead of gold?
3. ✅ Risk logic: Normal <0.5%, Watch 0.5-1%, High >1%?
4. ✅ Any specific Excel column names I should prioritize?

**Once approved, I will immediately begin ULW execution.**
