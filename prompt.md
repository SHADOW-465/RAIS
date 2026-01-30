You are an expert staff-level software architect, product engineer, and technical program manager.
Your task is to create a **production-grade, step-by-step execution plan** for building a **Manufacturing Quality & Rejection Statistics Web Application** using **OpenCode**.

### Context (Read Carefully)

**End User**

* Primary user: **General Manager (GM)** in a manufacturing company
* Has **eyesight challenges** → UI must be **minimal, high-contrast, low cognitive load**
* Wants to **quickly understand statistics**, not operational noise

**Core Problem**

* Manufacturing rejection data is scattered across multiple Excel sheets (shop floor rejections, assembly, visual inspection, supplier quality, cumulative reports).
* GM wants **clear statistics** to:

  * Understand rejection rate trends
  * Identify top defect causes
  * See cost impact
  * Make informed decisions quickly

**Design Philosophy**

* White background
* Minimal data on the main dashboard
* No decorative or “shiny” UI
* Large typography, strong spacing
* Data segmented across **dedicated pages**
* Dashboard = only *must-have KPIs*
* Drill-down pages = detailed analysis

Use UI/UX pro max to build a premium GM dashboard with senior level design and shaders and smooth transitions, readable fonts , properly scaled to the screen size

---

### Product Scope

#### Pages (Final UI Structure)

1. **Dashboard (Executive View)**

   * Rejection Rate (%)
   * Units Produced
   * Units Rejected
   * Cost Impact of Rejections
   * Simple trend line (last 30 days)
   * AI-generated 1–2 sentence insight (optional)

2. **Rejection Trends Page**

   * Time-series rejection trends
   * Filters: Date range, Factory, Line, Shift
   * Comparison vs previous period

3. **Defect Analysis Page**

   * Pareto (Top defect reasons)
   * Defect contribution %
   * Units rejected per defect
   * Root-cause highlights (textual)

4. **Supplier Quality Page**

   * Supplier-wise rejection rate
   * Contribution to total rejection
   * Trend per supplier

5. **Reports / Export Page**

   * Download Excel / PDF summaries
   * Period-based reports

---

### Functional Requirements

* Excel upload & ingestion
* Automatic schema detection
* Data normalization
* Aggregation (daily, weekly, monthly)
* KPI computation
* Statistical calculations (rates, deltas, trends)
* Role-based access (GM, Analyst – future ready)

---

### AI Usage (Optional but Value-Adding)

AI should:

* Generate **plain-language summaries** from statistics
* Highlight anomalies (e.g., sudden spike)
* Explain “why this matters” in simple terms
* NEVER replace raw statistics
* NEVER hallucinate data

AI Model:

* Gemini 2.5 (for summaries only)
* Deterministic, low-temperature usage

---

### Tech Constraints

* Web-based application
* Production-ready architecture
* Scalable data model
* Secure file handling
* Audit-friendly
* Clean separation of:

  * Frontend
  * Backend
  * Analytics
  * AI layer

---

### What You Must Produce

Create a **complete OpenCode execution plan** including:

1. System architecture (high-level)
2. Data flow (Excel → Database → Analytics → UI)
3. Tech stack recommendation
4. Backend module breakdown
5. Frontend page breakdown
6. Database schema (conceptual)
7. Analytics & statistics layer design
8. AI integration boundaries
9. Security & access considerations
10. Performance considerations
11. Incremental development roadmap (phases)
12. Clear assumptions and risks
13. What NOT to build (scope control)

---

### Output Requirements

* Structured
* Extremely clear
* No fluff
* Written as instructions OpenCode can directly act on
* Assume this will be used to generate real production code

Begin the plan now.
