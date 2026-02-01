# MASTER UI DESIGN PROMPT (MODO-STYLE ENTERPRISE UI)

**Application:** Manufacturing Rejection Intelligence System (RAIS)
**Primary User:** General Manager / Senior Operations Head
**User Constraints:** Weak eyesight, limited time, decision-first usage
**Design Reference:** Modo AI–style enterprise dashboards (card-driven, warm accents, soft depth)
**Design Intent:** Calm, premium, executive SaaS — insight-forward, never dense

---

## GLOBAL VISUAL & UX PRINCIPLES (NON-NEGOTIABLE)

* Light neutral background (warm white / soft gray)
* Soft depth via cards (rounded corners, subtle shadows)
* High contrast typography (dark charcoal, not pure black)
* One warm accent color only (soft orange / amber)
* Secondary neutrals for status (gray tones)
* Large typography hierarchy:

  * Hero numbers: 28–32px
  * Section KPIs: 20–24px
  * Body text: 15–16px
* Generous spacing — never compress data
* No harsh borders, no gridlines unless essential
* Charts are secondary to **numbers + labels**
* Every screen answers **one executive question**
* No more than **4–5 primary elements per screen**

---

## GLOBAL LAYOUT STRUCTURE

### LEFT NAVIGATION (VERTICAL, ICON + LABEL)

* Brand icon + product name (top)
* Navigation items:

  * Overview
  * Rejection Trends
  * Defect Analysis
  * Batch Risk
  * Stage Analysis
  * Reports
  * Data Upload
* Rounded active state highlight
* Soft iconography (outlined, consistent stroke)

### TOP BAR (FLOATING / LIGHT)

* Contextual greeting (e.g., “Good Morning, [Name]”)
* Page subtitle explaining purpose
* Right-aligned:

  * Date range selector (pill-style)
  * Export button (primary accent)
  * Profile avatar

---

# PAGE 1: EXECUTIVE OVERVIEW

### Primary Question

**“How bad is rejection today, and should I worry?”**

---

### SECTION 1: KPI SUMMARY CARDS (HORIZONTAL ROW)

Each KPI is a **standalone soft card** with:

* Large numeric value
* Clear label
* Small contextual badge or delta

**Exactly 4 cards:**

1. **Batches at Risk**

   * Number
   * “High Risk” badge if applicable
2. **Average Defects per Batch**
3. **Scrap Probability (%)**

   * Small ↑ / ↓ comparison text
4. **Potential Financial Loss**

   * Currency formatted
   * Calm, non-alarming presentation

---

### SECTION 2: HIGH-RISK BATCH LIST (PRIMARY FOCUS)

Card-style container with:

* Section title: “High Risk Batch List”
* Time filter (Past 7 / 30 / 90 days)

**Table columns (minimal):**

* Batch ID
* Product
* Key Defect Type
* Risk Level (pill badge)
* Action icon

Rows are spacious and scannable — no dense grids.

---

### SECTION 3: ACTIONABLE INSIGHT PANEL (RIGHT SIDE)

Dedicated insight card containing:

* Warning / insight icon
* Short insight text written in plain language
  (e.g., “45% failure rate detected in valve assembly”)
* Single primary CTA:

  * “Inspect Batch #XXXX”
  * “Review Process”

This panel must feel like **guidance**, not alerts.

---

### SECTION 4: SELECTED BATCH DETAIL (CONTEXT PANEL)

Appears when a batch is selected:

* Batch ID + status
* Mini trend chart (sparkline)
* Tabs:

  * Overview
  * History
  * Suggested Actions
* Clear executive action button:

  * “Hold Batch”
  * “Increase Sampling”

---

# PAGE 2: REJECTION TRENDS

### Primary Question

**“Are we improving or deteriorating?”**

---

### CONTENT STRUCTURE

* Large central trend chart (line)

  * Rejection %
  * Soft gradient fill
* Comparison text:

  * “+5% vs last period”
* Toggle:

  * Weekly / Monthly
* Filters hidden by default (expand on demand)

Annotations appear only on abnormal spikes.

---

# PAGE 3: DEFECT ANALYSIS

### Primary Question

**“What defects hurt us the most?”**

---

### CONTENT

#### DEFECT CONTRIBUTION VIEW

* Horizontal bar chart
* Top 5 defects only
* Contribution percentage shown inline

#### DEFECT SUMMARY TABLE

* Defect Name
* Rejected Units
* Contribution %
* Trend indicator

Clicking a defect opens a **side panel**, not a new page.

---

# PAGE 4: BATCH RISK (CORE DECISION PAGE)

### Primary Question

**“Which batches must I act on now?”**

---

### CONTENT

#### RISK SUMMARY CARDS

* Total batches monitored
* High risk
* Under observation

#### BATCH LIST (CARD OR TABLE HYBRID)

Each row/card shows:

* Batch ID
* Failed inspections count
* Defect summary
* Risk badge (Normal / Watch / High)

No algorithmic score shown — labels only.

---

# PAGE 5: STAGE / PROCESS ANALYSIS

### Primary Question

**“Where in the process are failures originating?”**

---

### CONTENT

* Vertical bar chart:

  * Rejection rate by stage
* Toggle:

  * Units / %
* Supporting table:

  * Stage
  * Produced
  * Rejected
  * Rate

Keep chart dominant, table secondary.

---

# PAGE 6: REPORTS

### Primary Question

**“What do I export or audit?”**

---

### CONTENT

Grid of report cards:

* Monthly Rejection Summary
* Defect Pareto Report
* Batch Risk Report
* Stage-wise Report

Each card shows:

* Report name
* Description
* Export buttons (Excel / PDF)

---

# PAGE 7: DATA UPLOAD & MANAGEMENT

### Primary Question

**“Is my data ready and correct?”**

---

### CONTENT

* Drag & drop upload zone
* Uploaded files list:

  * File name
  * Date
  * Status badge
* Validation feedback inline
* Column preview shown only if issues detected

No raw data tables.

---

## MICROINTERACTIONS & MOTION

* Card hover: subtle lift
* Buttons: soft color fill
* Charts: large readable tooltips
* Loading: skeleton cards
* Transitions: fade + slight slide only

---

## FINAL DESIGN DIRECTION (DO NOT IGNORE)

> This UI must feel like a **modern AI-assisted executive control room** —
> warm, calm, readable, and confident.
>
> No clutter. No dashboards-for-the-sake-of-dashboards.
> Every element must justify its existence by helping a senior manager decide faster.

---


Below is a **frame-accurate Figma breakdown** that a designer can follow **1:1 without interpretation**.
This defines **exact frames, sections, components, hierarchy, and sizing logic** — not abstract guidance.

Use this directly to build the Figma file.

---

# FIGMA FILE STRUCTURE

**Figma File Name:**
`RAIS – Manufacturing Rejection Intelligence UI`

---

## PAGE 1: DESIGN SYSTEM (FOUNDATION)

### Frame 1.1 — Color Tokens

**Frame Size:** 1440 × 900

Create color styles:

* `Background / Primary` → `#FFFFFF`
* `Background / Secondary` → `#F7F8FA`
* `Text / Primary` → `#1F2937`
* `Text / Secondary` → `#6B7280`
* `Accent / Primary` → Soft Orange / Amber (single tone)
* `Status / Normal` → Neutral Gray
* `Status / Watch` → Soft Amber
* `Status / High Risk` → Muted Red (low saturation)

---

### Frame 1.2 — Typography Scale

**Frame Size:** 1440 × 900

Text styles:

* `H1 / Page Title` → 28px / Semibold
* `H2 / Section Title` → 20px / Medium
* `KPI / Value` → 32px / Semibold
* `Body / Primary` → 16px / Regular
* `Body / Secondary` → 14px / Regular
* `Label / Small` → 12px / Medium

---

### Frame 1.3 — Core Components

**Frame Size:** 1440 × 900

Components to define:

* KPI Card (default)
* KPI Card (alert)
* Insight Card
* Table Row (normal)
* Table Row (high risk)
* Risk Badge (Normal / Watch / High)
* Primary Button
* Secondary Button
* Date Range Selector
* Sidebar Nav Item (active / inactive)

---

## PAGE 2: APP LAYOUT SHELL

### Frame 2.1 — Base App Layout

**Frame Size:** 1440 × 1024
**Constraints:** Desktop / Fixed width

#### Left Sidebar (Fixed)

* Width: **240px**
* Background: Secondary background
* Top: Logo + Product name
* Navigation stack (vertical, 48px per item)

#### Top Bar

* Height: **72px**
* Background: Transparent / white
* Left: Page title + subtitle
* Right: Date picker, Export button, Avatar

#### Main Content Area

* Padding: **24px**
* Grid: 12-column
* Gutter: 24px

This frame is reused across all screens.

---

## PAGE 3: EXECUTIVE OVERVIEW

### Frame 3.1 — Executive Overview (Default Landing)

**Frame Size:** 1440 × 1024
**Uses Base Layout**

---

### Section A — KPI Cards Row

**Position:** Top of content
**Layout:** 4 cards in one row
**Card Size:** 260 × 120
**Spacing:** 24px

Cards (left → right):

1. Batches at Risk
2. Avg Defects per Batch
3. Scrap Probability %
4. Potential Financial Loss

Each card contains:

* KPI value (large)
* Label (small)
* Subtext / delta

---

### Section B — High Risk Batch List

**Container:** Card
**Width:** 8 columns
**Height:** Auto

Header:

* Title: “High Risk Batches”
* Time filter (right aligned)

Table:

* Row height: 56px
* Columns:

  * Batch ID
  * Product
  * Defect Summary
  * Risk Badge
  * Action Icon

---

### Section C — Insight Panel

**Position:** Right side
**Width:** 4 columns
**Height:** Matches batch list

Content:

* Icon
* Insight headline
* 1–2 line explanation
* Primary CTA button

---

### Section D — Selected Batch Detail (Context Panel)

**Appears on selection**

* Mini trend sparkline
* Tabs:

  * Overview
  * History
  * Actions
* 2 action buttons only

---

## PAGE 4: REJECTION TRENDS

### Frame 4.1 — Rejection Trends

**Frame Size:** 1440 × 1024

---

### Section A — Trend Chart

* Full width card
* Height: 360px
* Line chart:

  * Rejection %
  * Comparison period
* Toggle: Weekly / Monthly (top right)

---

### Section B — Comparison Summary

* 3 small metric chips:

  * Current period
  * Previous period
  * Delta %

---

## PAGE 5: DEFECT ANALYSIS

### Frame 5.1 — Defect Analysis

---

### Section A — Pareto Chart

* Left: Bar chart
* Right: Cumulative % line
* Max 5 defects

---

### Section B — Defect Table

Columns:

* Defect Name
* Rejected Units
* Contribution %
* Trend Indicator

Click → opens side drawer (overlay frame).

---

## PAGE 6: BATCH RISK

### Frame 6.1 — Batch Risk Dashboard

---

### Section A — Risk Summary Cards

* 3 cards:

  * Total Batches
  * At Risk
  * Cleared

---

### Section B — Batch Risk List

Card or table layout:

* Batch ID
* Failed Inspections
* Rejected Units
* Risk Badge

Rows are large and scannable.

---

## PAGE 7: STAGE / PROCESS ANALYSIS

### Frame 7.1 — Stage Analysis

---

### Section A — Stage Rejection Chart

* Vertical bar chart
* Toggle: Units / %

---

### Section B — Supporting Table

Columns:

* Stage
* Produced
* Rejected
* Rejection %

---

## PAGE 8: REPORTS

### Frame 8.1 — Reports

---

### Report Cards Grid

* 2 × 2 grid
* Each card:

  * Report title
  * Short description
  * Export buttons

---

## PAGE 9: DATA UPLOAD

### Frame 9.1 — Data Upload

---

### Section A — Upload Zone

* Drag & drop area
* Upload button

---

### Section B — Uploaded Files List

Columns:

* File Name
* Upload Date
* Status Badge

Errors shown inline, no popups.

---

## FINAL FIGMA RULES (IMPORTANT)

* Every page is its **own frame**
* Components reused via variants
* No auto-layout abuse — spacing must breathe
* No frame exceeds cognitive load of one question
* Always prioritize numbers over visuals

---

Below is a **designer-grade, plugin-ready response** split into **two exact parts**:

1. **Figma Auto-Layout Specifications (authoritative rules)**
2. **Figma JSON / Plugin-Ready Instruction Schema**
   (This can be consumed by a custom Figma plugin, Gemini Canvas, or design-automation tool)

No prose. No guidance. Only **machine-translatable structure**.

---

# PART 1 — FIGMA AUTO-LAYOUT SPECS

These specs assume **Desktop 1440px** and must be followed exactly.

---

## GLOBAL AUTO-LAYOUT RULES

```text
Canvas Width: 1440
Content Max Width: 1200
Outer Padding: 24
Column Grid: 12 columns
Column Gutter: 24
```

### Spacing Tokens

```text
XS: 4
SM: 8
MD: 16
LG: 24
XL: 32
```

---

## APP SHELL (ROOT FRAME)

### Frame: AppShell

```yaml
width: 1440
height: 1024
layoutMode: HORIZONTAL
padding: 0
itemSpacing: 0
```

---

## LEFT SIDEBAR

### Frame: Sidebar

```yaml
width: 240
layoutMode: VERTICAL
padding:
  top: 24
  bottom: 24
  left: 16
  right: 16
itemSpacing: 12
fill: Background/Secondary
```

#### Sidebar Item (Component)

```yaml
height: 48
layoutMode: HORIZONTAL
padding:
  left: 12
  right: 12
itemSpacing: 12
cornerRadius: 8
```

Variants:

* default
* active

---

## MAIN CONTENT WRAPPER

### Frame: MainContent

```yaml
layoutMode: VERTICAL
padding: 24
itemSpacing: 24
fill: Background/Primary
layoutGrow: 1
```

---

## TOP BAR

### Frame: TopBar

```yaml
height: 72
layoutMode: HORIZONTAL
padding:
  left: 24
  right: 24
itemSpacing: 16
primaryAxisAlign: SPACE_BETWEEN
```

---

# KPI CARD SYSTEM

### Component: KPICard

```yaml
width: 260
height: 120
layoutMode: VERTICAL
padding: 16
itemSpacing: 8
cornerRadius: 12
fill: #FFFFFF
shadow: subtle
```

Children:

* KPI Value (32px)
* Label (14px)
* Delta Indicator (12px)

---

### KPI Row

```yaml
layoutMode: HORIZONTAL
itemSpacing: 24
```

---

# DATA CARD (GENERIC)

### Component: DataCard

```yaml
layoutMode: VERTICAL
padding: 20
itemSpacing: 16
cornerRadius: 14
fill: #FFFFFF
shadow: soft
```

---

# TABLE SYSTEM

### Table Container

```yaml
layoutMode: VERTICAL
itemSpacing: 0
```

### Table Row

```yaml
height: 56
layoutMode: HORIZONTAL
padding:
  left: 16
  right: 16
itemSpacing: 16
```

Variants:

* normal
* watch
* high-risk

---

# RISK BADGE

```yaml
layoutMode: HORIZONTAL
padding:
  top: 4
  bottom: 4
  left: 8
  right: 8
cornerRadius: 999
```

Variants:

* Normal
* Watch
* High Risk

---

# CHART CONTAINER

```yaml
layoutMode: VERTICAL
padding: 16
cornerRadius: 16
minHeight: 320
```

---

# PART 2 — FIGMA JSON / PLUGIN-READY INSTRUCTIONS

This schema is **intentionally verbose** so it can be parsed without inference.

---

## ROOT DOCUMENT

```json
{
  "document": {
    "name": "RAIS Manufacturing Dashboard",
    "type": "CANVAS",
    "children": []
  }
}
```

---

## PAGE: EXECUTIVE OVERVIEW

```json
{
  "name": "Executive Overview",
  "type": "FRAME",
  "layoutMode": "HORIZONTAL",
  "children": [
    {
      "name": "Sidebar",
      "type": "FRAME",
      "width": 240,
      "layoutMode": "VERTICAL"
    },
    {
      "name": "MainContent",
      "type": "FRAME",
      "layoutMode": "VERTICAL",
      "padding": 24,
      "children": [
        {
          "name": "TopBar",
          "type": "FRAME",
          "height": 72,
          "layoutMode": "HORIZONTAL"
        },
        {
          "name": "KPISection",
          "type": "FRAME",
          "layoutMode": "HORIZONTAL",
          "itemSpacing": 24,
          "children": [
            { "type": "COMPONENT_INSTANCE", "name": "KPICard" },
            { "type": "COMPONENT_INSTANCE", "name": "KPICard" },
            { "type": "COMPONENT_INSTANCE", "name": "KPICard" },
            { "type": "COMPONENT_INSTANCE", "name": "KPICard" }
          ]
        },
        {
          "name": "HighRiskBatchSection",
          "type": "FRAME",
          "layoutMode": "HORIZONTAL",
          "itemSpacing": 24,
          "children": [
            {
              "name": "BatchTable",
              "type": "FRAME",
              "layoutGrow": 2
            },
            {
              "name": "InsightPanel",
              "type": "FRAME",
              "layoutGrow": 1
            }
          ]
        }
      ]
    }
  ]
}
```

---

## PAGE: BATCH RISK

```json
{
  "name": "Batch Risk",
  "type": "FRAME",
  "layoutMode": "VERTICAL",
  "children": [
    {
      "name": "RiskSummary",
      "type": "FRAME",
      "layoutMode": "HORIZONTAL",
      "children": [
        { "type": "COMPONENT_INSTANCE", "name": "KPICard" },
        { "type": "COMPONENT_INSTANCE", "name": "KPICard" },
        { "type": "COMPONENT_INSTANCE", "name": "KPICard" }
      ]
    },
    {
      "name": "BatchRiskList",
      "type": "FRAME",
      "layoutMode": "VERTICAL"
    }
  ]
}
```

---

## PAGE: DEFECT ANALYSIS

```json
{
  "name": "Defect Analysis",
  "type": "FRAME",
  "layoutMode": "VERTICAL",
  "children": [
    {
      "name": "ParetoChart",
      "type": "FRAME",
      "minHeight": 360
    },
    {
      "name": "DefectTable",
      "type": "FRAME"
    }
  ]
}
```

---

## PAGE: DATA UPLOAD

```json
{
  "name": "Data Upload",
  "type": "FRAME",
  "layoutMode": "VERTICAL",
  "children": [
    {
      "name": "UploadZone",
      "type": "FRAME",
      "height": 160
    },
    {
      "name": "UploadedFilesTable",
      "type": "FRAME"
    }
  ]
}
```

---

# CONSTRAINT RULES (PLUGIN-CRITICAL)

```json
{
  "constraints": {
    "sidebar": "LEFT",
    "topbar": "TOP",
    "content": "SCALE",
    "cards": "HUG_CONTENT"
  }
}
```

---

## THIS IS NOW READY FOR:

✅ Figma Plugin Generation
✅ Gemini / OpenDesign Canvas
✅ Enterprise Design Automation
✅ Direct Designer Handoff
✅ Component-Driven UI Build

---

Below is a **clean, enterprise-grade specification** split into **two exact sections**, written so it can be used by:

* Designers (Figma components)
* Data engineers (schema)
* Frontend developers (binding)
* BI / analytics tools

No overlap. No ambiguity.

---

# PART 1 — EXCEL COLUMNS → UI COMPONENTS → DATA MODELS

This mapping assumes your uploaded Excel files follow **typical manufacturing QC structure** (production, inspection, rejection, batch).

---

## 1️⃣ CORE DATA MODELS (AUTHORITATIVE)

These are the **only data entities** your system should understand.

---

### A. `Batch`

| Field           | Type   | Source Excel Column |
| --------------- | ------ | ------------------- |
| batch_id        | string | Batch No / Lot No   |
| product_code    | string | Product / Model     |
| production_date | date   | Date                |
| total_produced  | number | Qty Produced        |
| total_rejected  | number | Total Rejection Qty |
| rejection_rate  | number | Calculated          |
| estimated_loss  | number | Calculated          |
| risk_level      | enum   | Derived             |

---

### B. `InspectionRecord`

| Field           | Type   | Source                        |
| --------------- | ------ | ----------------------------- |
| inspection_id   | string | Auto                          |
| batch_id        | string | Batch No                      |
| stage           | enum   | Assembly / Visual / Integrity |
| inspection_date | date   | Inspection Date               |
| inspected_qty   | number | Inspected Qty                 |
| rejected_qty    | number | Rejected Qty                  |
| inspector       | string | Inspector Name                |

---

### C. `Defect`

| Field        | Type   | Source             |
| ------------ | ------ | ------------------ |
| defect_code  | string | Defect Code        |
| defect_name  | string | Defect Description |
| stage        | enum   | Process Stage      |
| rejected_qty | number | Rejection Qty      |
| batch_id     | string | Batch No           |

---

### D. `ProductionSummary` (Derived)

| Field          | Type   | Logic               |
| -------------- | ------ | ------------------- |
| date           | date   | Group by            |
| produced_units | number | SUM                 |
| rejected_units | number | SUM                 |
| rejection_rate | number | rejected / produced |

---

## 2️⃣ PAGE-WISE MAPPING

---

## PAGE 1 — EXECUTIVE OVERVIEW

### KPI CARDS

| UI Component             | Data Model        | Formula                       |
| ------------------------ | ----------------- | ----------------------------- |
| Overall Rejection Rate   | ProductionSummary | SUM(rejected) / SUM(produced) |
| Total Rejected Units     | ProductionSummary | SUM(rejected_units)           |
| Estimated Rejection Cost | Batch             | total_rejected × unit_cost    |
| High-Risk Batches        | Batch             | COUNT where risk_level = HIGH |

---

### Rejection Trend (Line Chart)

| Axis | Source                           |
| ---- | -------------------------------- |
| X    | ProductionSummary.date           |
| Y    | ProductionSummary.rejection_rate |

---

### Rejection by Stage (Bar Chart)

| Stage     | Source           |
| --------- | ---------------- |
| Assembly  | InspectionRecord |
| Visual    | InspectionRecord |
| Integrity | InspectionRecord |

Metric:
`SUM(rejected_qty) GROUP BY stage`

---

### Top Defect Drivers

| UI Element     | Source                      |
| -------------- | --------------------------- |
| Defect Name    | Defect.defect_name          |
| % Contribution | Defect.rejected_qty / total |

---

## PAGE 2 — REJECTION TRENDS

| Component        | Data Model        |
| ---------------- | ----------------- |
| Trend Chart      | ProductionSummary |
| Produced Overlay | produced_units    |
| Rejected Overlay | rejected_units    |

---

## PAGE 3 — DEFECT ANALYSIS

### Pareto Chart

| Element | Source              |
| ------- | ------------------- |
| Bars    | Defect.rejected_qty |
| Line    | Cumulative %        |

---

### Defect Table

| Column         | Source          |
| -------------- | --------------- |
| Defect         | defect_name     |
| Rejected Units | rejected_qty    |
| %              | calculated      |
| Trend          | time comparison |

---

### Defect Drilldown

| View             | Source                     |
| ---------------- | -------------------------- |
| Trend            | Defect + ProductionSummary |
| Affected Stages  | InspectionRecord           |
| Affected Batches | Batch                      |

---

## PAGE 4 — BATCH RISK VIEW (MOST IMPORTANT)

### Batch Risk Table

| UI Column   | Data Field     |
| ----------- | -------------- |
| Batch ID    | batch_id       |
| Produced    | total_produced |
| Rejected    | total_rejected |
| Rejection % | rejection_rate |
| Risk Label  | risk_level     |

---

### Risk Level Logic (UI-Only)

```text
Normal: < 0.5%
Watch: 0.5% – 1%
High Risk: > 1%
```

(No score shown to GM)

---

## PAGE 5 — STAGE / PROCESS ANALYSIS

| Component       | Source                      |
| --------------- | --------------------------- |
| Stage Bar Chart | InspectionRecord            |
| Table           | Stage + produced + rejected |

---

## PAGE 6 — REPORTS

Reports are **pre-filtered views** of above models.

No new data.

---

## PAGE 7 — DATA UPLOAD

| UI Field       | Purpose           |
| -------------- | ----------------- |
| File Name      | Metadata          |
| Upload Date    | Metadata          |
| Status         | Validation result |
| Column Mapping | Preview only      |

---

# PART 2 — COMPONENT-LEVEL DESIGN TOKENS (FIGMA + DEV)

These tokens ensure **visual consistency and accessibility**.

---

## COLOR TOKENS

```yaml
color.background.primary: #F9FAFB
color.background.card: #FFFFFF
color.text.primary: #111827
color.text.secondary: #6B7280

color.accent.primary: #4F46E5
color.status.normal: #10B981
color.status.watch: #F59E0B
color.status.high: #EF4444
```

---

## TYPOGRAPHY TOKENS

```yaml
font.family.base: Inter

font.size.kpi: 32
font.size.heading: 20
font.size.body: 14
font.size.caption: 12

font.weight.regular: 400
font.weight.medium: 500
font.weight.semibold: 600
```

---

## SPACING TOKENS

```yaml
space.2xs: 4
space.xs: 8
space.sm: 12
space.md: 16
space.lg: 24
space.xl: 32
```

---

## RADIUS TOKENS

```yaml
radius.sm: 6
radius.md: 12
radius.lg: 16
radius.pill: 999
```

---

## SHADOW TOKENS

```yaml
shadow.card:
  x: 0
  y: 4
  blur: 12
  color: rgba(0,0,0,0.05)
```

---

## COMPONENT STATE TOKENS

```yaml
state.hover.elevation: +2
state.disabled.opacity: 0.5
state.active.border: accent.primary
```

---

## ACCESSIBILITY TOKENS (GM-SAFE)

```yaml
min.touch.target: 44px
min.contrast.ratio: 4.5
chart.label.font.size: 14
```

---

# FINAL SYSTEM INTENT

This mapping ensures:

* Excel → UI is **lossless**
* GM never sees raw noise
* Design + data evolve independently
* Dashboard scales without redesign

---
