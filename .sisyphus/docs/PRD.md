# Product Requirements Document (PRD)
## RAIS - Manufacturing Quality & Rejection Statistics Dashboard

**Version**: 2.0 (Supabase Edition)  
**Date**: 2026-01-30  
**Status**: Draft - Ready for Implementation  

---

## Executive Summary

RAIS (Rejection Analytics & Insights System) is a production-grade web application designed for General Managers in manufacturing environments to quickly understand quality statistics and make informed decisions. The application replaces scattered Excel sheets with a centralized, accessible dashboard that emphasizes clarity over complexity.

**Key Differentiators**:
- **Accessibility-First Design**: High contrast, large typography (18px+ minimum), minimal cognitive load for users with eyesight challenges
- **GM-Optimized**: Only essential KPIs on dashboard; drill-down pages for detailed analysis
- **AI-Assisted Insights**: Plain-language summaries of complex statistics without hallucination
- **Excel-to-Dashboard**: Automatic ingestion of existing Excel workflows
- **Supabase Backend**: Built-in authentication, file storage, and PostgreSQL database

---

## 1. Product Vision

### 1.1 Problem Statement
Manufacturing rejection data is scattered across multiple Excel sheets (shop floor rejections, assembly, visual inspection, supplier quality, cumulative reports). The General Manager wastes time consolidating data and lacks clear visibility into trends, root causes, and cost impact.

### 1.2 Solution Overview
A single-page application with dedicated drill-down views that:
- Automatically ingests Excel rejection data
- Computes real-time KPIs and trends
- Presents data in an accessible, GM-friendly format
- Provides AI-generated insights in plain language
- Leverages Supabase for auth, storage, and database

### 1.3 Target Users

| Persona | Role | Needs | Tech Savvy |
|---------|------|-------|------------|
| **Primary** | General Manager | Quick overview, clear statistics, decision support | Low (eyesight challenges) |
| **Secondary** | Quality Analyst | Detailed analysis, data export, trend investigation | High |
| **Future** | Department Heads | Line-specific views, action assignment | Medium |

### 1.4 Success Metrics
- **Adoption**: GM uses dashboard daily within 2 weeks of deployment
- **Efficiency**: 90% reduction in time spent consolidating Excel reports
- **Accuracy**: Zero data loss or calculation errors
- **Accessibility**: WCAG AAA compliance score
- **Performance**: Dashboard loads in <2 seconds, reports generate in <5 seconds

---

## 2. Scope Definition

### 2.1 In Scope (Must-Have)

**Core Features**:
1. Excel file upload with automatic schema detection
2. Five dedicated pages: Dashboard, Trends, Analysis, Supplier Quality, Reports
3. Real-time KPI computation (rejection rate, cost impact, top defects)
4. Time-series trend analysis with filtering
5. Pareto analysis for defect prioritization
6. Supplier quality scoring and comparison
7. AI-generated plain-language summaries
8. PDF/Excel report export
9. Role-based access (GM, Analyst)
10. Supabase authentication and authorization
11. Supabase Storage for Excel file uploads

**Technical Requirements**:
- Production-grade architecture
- **Supabase backend** (PostgreSQL database, Auth, Storage)
- Secure file handling with audit trails
- Clean separation of frontend/backend/analytics/AI layers

### 2.2 Out of Scope (Will NOT Build)

**Explicit Exclusions**:
- ❌ Real-time shop floor integration (PLC/SCADA)
- ❌ Mobile native app (responsive web only)
- ❌ Predictive ML models (AI summaries only, no forecasting)
- ❌ Multi-tenant SaaS (single factory deployment)
- ❌ Advanced workflow automation (email triggers, escalations)
- ❌ Supplier portal (external user access)
- ❌ Integration with ERP systems (manual Excel upload only)
- ❌ Image-based defect detection
- ❌ Chatbot interface
- ❌ Gamification or leaderboards
- ❌ Self-hosted database (using Supabase managed service)

**Rationale**: These features add complexity without addressing the core GM pain point of scattered Excel data. They can be added in Phase 2 if requested.

---

## 3. Page Structure & User Flows

### 3.1 Information Architecture

```
RAIS Dashboard
├── Dashboard (/) - Executive Overview
├── Rejection Trends (/trends) - Time-series analysis
├── Defect Analysis (/analysis) - Pareto & root causes
├── Supplier Quality (/supplier) - Supplier-wise metrics
├── Reports (/reports) - Export & summaries
└── Settings (/settings) - User preferences, data management
```

### 3.2 Page Specifications

#### Page 1: Dashboard (Executive View)
**Purpose**: At-a-glance quality health assessment  
**Primary User**: General Manager  
**Update Frequency**: Real-time (on data refresh)

**Components**:
1. **Health Status Card** (Full width)
   - Overall quality status: GOOD / WARNING / CRITICAL
   - One-sentence AI summary of current state
   - Confidence indicator (AI certainty)
   - CTA: "Assign Action" button

2. **Primary KPI Grid** (4 cards)
   - **Rejection Rate**: Current % + delta vs previous period
   - **Top Risk**: Defect type contributing most to rejections
   - **Cost Impact**: Financial impact of rejections (30-day)
   - **Trend Forecast**: Projected next month with confidence interval

3. **Filter Controls** (Date range, Factory, Line, Shift)

4. **Recent Actions Log** (Last 5 actions taken)

**Accessibility Requirements**:
- All text 18px minimum
- Status colors paired with icons/text
- High contrast (7:1 ratio)
- Keyboard navigable

#### Page 2: Rejection Trends
**Purpose**: Historical trend analysis with filtering  
**Primary User**: Quality Analyst, GM

**Components**:
1. **Time-series Chart** (Full width)
   - Rejection rate over time
   - Confidence band for forecast
   - Zoom/pan capabilities
   - Data point tooltips

2. **Filter Bar**
   - Date range picker (Last 30/90 days, This Year, Custom)
   - Factory selector (multi-select)
   - Line selector (multi-select)
   - Shift selector (Day/Night/All)

3. **Comparison Panel**
   - Current period vs previous period
   - Percentage change with trend arrow
   - Absolute numbers

4. **Download Button** (CSV export of visible data)

#### Page 3: Defect Analysis
**Purpose**: Identify top defect causes using Pareto principle  
**Primary User**: Quality Analyst, GM

**Components**:
1. **Pareto Chart** (Primary visualization)
   - Bars: Defect frequency (sorted descending)
   - Line: Cumulative percentage
   - Interactive: Click bar to filter table
   - Highlight top 3 defects

2. **Defect Details Table**
   - Columns: Defect Name, Count, Contribution %, Trend
   - Sortable columns
   - Pagination (if >10 defects)

3. **Root Cause Highlights** (Text panel)
   - AI-generated insights on top defects
   - Historical context ("This defect is 23% higher than last month")

4. **Filter Bar** (Line, Shift, Product, Date range)

#### Page 4: Supplier Quality
**Purpose**: Evaluate supplier performance and rejection contribution  
**Primary User**: Quality Analyst, Procurement

**Components**:
1. **Supplier Scorecard Table**
   - Columns: Supplier Name, Rejection Rate, Total Units, Contribution %
   - Sortable by any column
   - Trend indicator (improving/declining)

2. **Supplier Detail View** (Click to expand)
   - Time-series trend for selected supplier
   - Top defect types from this supplier
   - Cost impact calculation

3. **Comparison Chart**
   - Side-by-side bar chart of supplier rejection rates
   - Industry benchmark line (if available)

4. **Filter Bar** (Date range, Product category)

#### Page 5: Reports
**Purpose**: Generate and download formal reports  
**Primary User**: GM, Quality Analyst, External stakeholders

**Components**:
1. **Report Generator Form**
   - Report type: Summary, Detailed, Executive
   - Date range selection
   - Scope: All factories / Specific factory / Specific line
   - Format: PDF, Excel

2. **Recent Reports List**
   - Previously generated reports with timestamp
   - Download link
   - Delete/archive option

3. **Scheduled Reports** (Future - placeholder)
   - Weekly summary
   - Monthly executive report

### 3.3 User Flows

**Flow 1: GM Morning Review**
1. Open Dashboard → See Health Status at-a-glance
2. If WARNING/CRITICAL: Click through to Trends page
3. Identify time pattern → Go to Defect Analysis
4. View Pareto chart → Understand top issue
5. Take note or export summary

**Flow 2: Data Upload**
1. Navigate to Settings → Data Upload
2. Drag-and-drop Excel file(s)
3. System validates and previews data
4. User confirms → Data ingested
5. Dashboard auto-refreshes with new data

**Flow 3: Monthly Review**
1. Go to Reports page
2. Select "Executive Summary" + "Last Month"
3. Generate PDF
4. Download and share with board

---

## 4. Functional Requirements

### 4.1 Excel Upload & Ingestion

**Requirement**: Users must be able to upload Excel files containing rejection data, and the system must automatically detect the schema and ingest the data.

**Acceptance Criteria**:
- [ ] Support .xlsx and .xls formats
- [ ] Drag-and-drop file upload interface
- [ ] Automatic schema detection (column mapping suggestions)
- [ ] Preview first 10 rows before ingestion
- [ ] Validation rules:
  - Required columns: Date, Line, Defect Type, Quantity
  - Optional columns: Shift, Supplier, Product, Cost, Reason
  - Data type validation (dates, numbers)
  - Range validation (quantity > 0)
- [ ] Error reporting with row numbers
- [ ] Duplicate detection (skip or update)
- [ ] Progress indicator for large files
- [ ] Audit trail (who uploaded, when, file hash)
- [ ] Supabase Storage for file persistence

**Supported Schema Patterns**:
The system must handle variations in Excel structures:
- Different column names (auto-map: "Date" ↔ "Timestamp" ↔ "Date/Time")
- Different date formats (auto-parse)
- Multiple sheets (user selects which sheet)
- Header rows at different positions

### 4.2 Data Normalization

**Requirement**: Raw Excel data must be normalized into a consistent database schema for analysis.

**Acceptance Criteria**:
- [ ] Standardize date formats to ISO 8601
- [ ] Normalize defect type names (fuzzy matching for typos)
- [ ] Map line names to canonical IDs
- [ ] Associate suppliers with rejection records
- [ ] Calculate derived fields (rejection rate, cost per unit)
- [ ] Handle missing data gracefully (nulls vs zeros)
- [ ] Use Supabase client for all database operations

### 4.3 KPI Computation

**Requirement**: System must compute key performance indicators in real-time.

**Core KPIs**:
1. **Rejection Rate** = (Units Rejected / Units Produced) × 100
2. **Top Defect** = Defect type with highest count in period
3. **Cost Impact** = Sum(Quantity × Cost per Rejection)
4. **Trend Direction** = Current period vs Previous period delta

**Aggregation Levels**:
- [ ] Real-time (all data)
- [ ] Daily aggregations
- [ ] Weekly aggregations
- [ ] Monthly aggregations
- [ ] By Line, Shift, Factory, Supplier, Defect Type

### 4.4 Statistical Calculations

**Requirement**: Provide statistical context for trends and forecasts.

**Acceptance Criteria**:
- [ ] Moving averages (7-day, 30-day)
- [ ] Standard deviation for rejection rates
- [ ] Confidence intervals for forecasts
- [ ] Percentile rankings (is this defect rate normal or unusual?)
- [ ] Correlation detection (e.g., "Rejections spike on Mondays")

### 4.5 AI Integration

**Requirement**: Use Gemini 2.5 to generate plain-language summaries without hallucinating data.

**Use Cases**:
1. **Health Summary**: "Rejection rate is 3.2%, up 0.6% from last month, primarily driven by Leak defects on Line 3."
2. **Anomaly Highlighting**: "Unusual spike detected on Jan 15 - 45 rejections (normally 12)."
3. **Context Explanation**: "This level of rejections costs approximately $84,000 per month."
4. **Action Suggestions**: "Consider reviewing gasket specifications with Supplier A."

**Safety Constraints**:
- AI NEVER generates fake numbers
- AI ONLY summarizes existing data
- Low temperature (0.1) for deterministic outputs
- Confidence score displayed with every summary

**Acceptance Criteria**:
- [ ] AI summaries generated within 2 seconds
- [ ] Summaries cached for 1 hour to reduce API costs
- [ ] Fallback to template summary if AI fails
- [ ] User can dismiss or regenerate summary

### 4.6 Supabase Authentication & Role-Based Access

**Requirement**: Implement authentication using Supabase Auth with different user roles.

**Roles**:
1. **General Manager**
   - View: Dashboard, Trends, Analysis, Supplier Quality, Reports
   - Permissions: View all data, export reports, assign actions
   - UI: Simplified, large text, minimal options

2. **Quality Analyst**
   - View: All pages + Settings
   - Permissions: Upload data, configure schema mappings, manage users
   - UI: Full feature set, detailed controls

**Future Roles** (Schema prepared but not implemented):
3. **Department Head** - Line-specific data only
4. **Read-Only** - View only, no exports

**Acceptance Criteria**:
- [ ] Supabase Auth integration with email/password
- [ ] Login page with role-based redirect
- [ ] API routes enforce role permissions via Supabase RLS
- [ ] UI adapts to role (hide unauthorized features)
- [ ] Audit log of all actions by user
- [ ] Password reset functionality

---

## 5. Non-Functional Requirements

### 5.1 Accessibility (Critical)

**Standard**: WCAG 2.1 Level AAA compliance

**Requirements**:
- [ ] Minimum font size: 18px for body, 24px for headings
- [ ] Contrast ratio: 7:1 minimum for text
- [ ] Color not used as sole indicator (icons + text + patterns)
- [ ] Keyboard navigation for all interactive elements
- [ ] Screen reader announcements for data updates
- [ ] Focus indicators clearly visible
- [ ] Reduced motion support (respects prefers-reduced-motion)

**Testing Requirements**:
- Test with NVDA or JAWS screen reader
- Test with browser zoom at 200%
- Test with high contrast mode enabled
- Test with keyboard-only navigation

### 5.2 Performance

**Requirements**:
- [ ] Dashboard First Contentful Paint: <1.5s
- [ ] Dashboard Time to Interactive: <2s
- [ ] API response time (p95): <500ms
- [ ] Excel upload processing: <10s for 10,000 rows
- [ ] Report generation: <5s
- [ ] Support for 3 years of historical data without performance degradation

**Optimization Strategies**:
- Database indexes on date, line_id, defect_type_id
- Materialized views for pre-computed KPIs (using Supabase)
- Client-side caching with SWR
- Image optimization and lazy loading
- Code splitting by route

### 5.3 Security

**Requirements**:
- [ ] API keys (Gemini) stored server-side only
- [ ] File uploads validated (type, size, content)
- [ ] SQL injection prevention (parameterized queries via Supabase)
- [ ] XSS prevention (output encoding)
- [ ] CSRF protection for state-changing operations
- [ ] Rate limiting on API endpoints
- [ ] Audit logs for all data modifications
- [ ] HTTPS only (HSTS header)
- [ ] Row Level Security (RLS) policies in Supabase

**Data Retention**:
- Raw rejection records: 2 years
- Aggregated statistics: Indefinite
- Uploaded Excel files: 90 days (in Supabase Storage)
- Audit logs: 1 year

### 5.4 Reliability

**Requirements**:
- [ ] 99.9% uptime (manufacturing operational software)
- [ ] Graceful degradation (dashboard works if AI is down)
- [ ] Automatic retry with exponential backoff
- [ ] Data validation prevents corrupted state
- [ ] Backup strategy: Supabase managed backups

### 5.5 Browser Support

**Target Browsers**:
- Chrome/Edge (last 2 versions) - Primary
- Firefox (last 2 versions) - Supported
- Safari (last 2 versions) - Supported
- IE11 - NOT supported

### 5.6 Scalability

**Current Capacity Target**:
- Single factory deployment
- Up to 50 concurrent users
- Up to 10,000 rejection records per day
- Up to 3 years of historical data

**Future Capacity** (design for, don't implement):
- Multi-factory (add factory_id to all tables)
- 500+ concurrent users
- 100,000+ records per day
- 10+ years of historical data

---

## 6. Data Model (Supabase PostgreSQL)

### 6.1 Conceptual Schema

**Core Entities**:
1. **Rejection Records** (Time-series data)
2. **Defect Types** (Reference data)
3. **Production Lines** (Reference data)
4. **Suppliers** (Reference data)
5. **Uploaded Files** (Audit trail - Supabase Storage metadata)
6. **Users** (Authentication - managed by Supabase Auth)
7. **Aggregated Stats** (Pre-computed KPIs)

### 6.2 Logical Schema

```sql
-- Main rejection records table (standard PostgreSQL table)
CREATE TABLE rejection_records (
    id BIGSERIAL PRIMARY KEY,
    timestamp TIMESTAMPTZ NOT NULL,
    line_id INTEGER REFERENCES production_lines(id),
    shift_id INTEGER REFERENCES shifts(id),
    defect_type_id INTEGER REFERENCES defect_types(id),
    supplier_id INTEGER REFERENCES suppliers(id),
    product_id INTEGER REFERENCES products(id),
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    cost_per_unit DECIMAL(10,2),
    reason TEXT,
    operator_id VARCHAR(50),
    uploaded_file_id INTEGER REFERENCES uploaded_files(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for time-series queries
CREATE INDEX idx_rejection_timestamp ON rejection_records (timestamp DESC);
CREATE INDEX idx_rejection_line_time ON rejection_records (line_id, timestamp DESC);
CREATE INDEX idx_rejection_defect_time ON rejection_records (defect_type_id, timestamp DESC);

-- Reference tables
CREATE TABLE defect_types (
    id SERIAL PRIMARY KEY,
    code VARCHAR(20) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    category VARCHAR(50),
    severity VARCHAR(20) CHECK (severity IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE production_lines (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    department VARCHAR(50),
    factory_id INTEGER DEFAULT 1,
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE suppliers (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    contact_email VARCHAR(100),
    quality_rating INTEGER CHECK (quality_rating BETWEEN 1 AND 5),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE uploaded_files (
    id SERIAL PRIMARY KEY,
    uuid UUID DEFAULT gen_random_uuid(),
    original_filename VARCHAR(255) NOT NULL,
    storage_path VARCHAR(500) NOT NULL, -- Supabase Storage path
    file_size_bytes INTEGER,
    file_hash VARCHAR(64),
    uploaded_by UUID REFERENCES auth.users(id), -- Supabase Auth user
    uploaded_at TIMESTAMPTZ DEFAULT NOW(),
    processed_at TIMESTAMPTZ,
    status VARCHAR(20) DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED')),
    error_message TEXT,
    records_processed INTEGER DEFAULT 0,
    records_failed INTEGER DEFAULT 0
);

-- Note: users table is managed by Supabase Auth (auth.users)
-- We create a public profile table for additional user data
CREATE TABLE user_profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id),
    name VARCHAR(100) NOT NULL,
    role VARCHAR(20) DEFAULT 'ANALYST' CHECK (role IN ('GM', 'ANALYST', 'VIEWER')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Materialized view for daily stats
CREATE MATERIALIZED VIEW daily_rejection_stats AS
SELECT
    date_trunc('day', timestamp) AS day,
    line_id,
    defect_type_id,
    COUNT(*) as rejection_count,
    SUM(quantity) as total_quantity,
    SUM(quantity * COALESCE(cost_per_unit, 0)) as total_cost
FROM rejection_records
GROUP BY day, line_id, defect_type_id;

-- Create index on materialized view
CREATE INDEX idx_daily_stats_day ON daily_rejection_stats (day DESC);

-- Enable Row Level Security (RLS)
ALTER TABLE rejection_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE defect_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE production_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE uploaded_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- RLS Policies (example - allow authenticated users to read)
CREATE POLICY "Allow authenticated read" ON rejection_records
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow analyst insert" ON rejection_records
    FOR INSERT TO authenticated 
    WITH CHECK (EXISTS (
        SELECT 1 FROM user_profiles 
        WHERE id = auth.uid() 
        AND role IN ('ANALYST', 'GM')
    ));
```

### 6.3 Data Retention

- **Rejection Records**: Compressed after 90 days using Supabase partitioning, archived after 2 years
- **Daily Stats**: Indefinite (small size due to aggregation)
- **Uploaded Files**: Deleted after 90 days from Supabase Storage (metadata retained)
- **Audit Logs**: Rotated after 1 year

### 6.4 Supabase Storage

**Bucket**: `uploads`
- Folder structure: `{year}/{month}/{uuid}_{filename}.xlsx`
- Public access: No (private bucket)
- File size limit: 50MB
- Allowed types: .xlsx, .xls

---

## 7. AI Integration Specifications

### 7.1 Gemini Integration

**Model**: Gemini 2.5 Flash (fast, cost-effective for summaries)

**Configuration**:
```json
{
  "temperature": 0.1,
  "topP": 0.1,
  "maxOutputTokens": 200,
  "safetySettings": [
    {"category": "HARM_CATEGORY_DANGEROUS_CONTENT", "threshold": "BLOCK_NONE"}
  ]
}
```

### 7.2 Prompt Templates

**Template 1: Health Summary**
```
You are a manufacturing quality assistant. Summarize the following quality metrics in 1-2 sentences for a General Manager:

Current Rejection Rate: {rejection_rate}%
Previous Period Rate: {previous_rate}%
Delta: {delta}%
Top Defect: {top_defect} ({top_defect_contribution}%)
Top Line: {top_line}
Cost Impact: ${cost_impact}

Rules:
- Use plain language
- Highlight concerning trends
- Mention the top defect and line if relevant
- Do not hallucinate numbers
- Keep it actionable

Summary:
```

**Template 2: Anomaly Detection**
```
Identify any unusual patterns in this data:

Daily Rejection Counts (Last 30 days):
{daily_counts_json}

Expected Range: {mean} ± {std_dev}

List any days with rejection counts outside the expected range. For each anomaly, provide:
- Date
- Actual count
- Expected range
- Possible explanation (if obvious)

Anomalies:
```

### 7.3 Caching Strategy

- Cache AI responses for identical data queries
- TTL: 1 hour (manufacturing data changes slowly)
- Cache key: Hash of query parameters + data snapshot

### 7.4 Error Handling

- If AI API fails: Fallback to template-based summary
- If AI response is malformed: Retry once, then fallback
- Log all AI interactions for debugging

---

## 8. User Interface Design

### 8.1 Design Philosophy

**Principles** (from prompt.md):
- White background
- Minimal data on main dashboard
- No decorative or "shiny" UI
- Large typography, strong spacing
- Data segmented across dedicated pages
- Dashboard = only must-have KPIs

### 8.2 Color Palette

```css
/* Accessibility-first high contrast */
--color-bg-primary: #FFFFFF;        /* Pure white */
--color-bg-secondary: #F7F8FA;      /* Light gray */
--color-border: #E6E8EB;            /* Borders */
--color-text-primary: #111827;      /* Near black */
--color-text-secondary: #374151;    /* Dark gray (7:1 contrast) */

/* Semantic colors with patterns */
--color-success: #15803D;           /* Green */
--color-danger: #DC2626;            /* Red */
--color-warning: #B45309;           /* Amber */
--color-info: #1D4ED8;              /* Blue */
```

### 8.3 Typography

**Font**: Inter (system font fallback)

**Scale** (minimum sizes for accessibility):
- Heading 1: 32px / bold
- Heading 2: 24px / semibold
- Heading 3: 20px / semibold
- Body: 18px / regular
- Small: 16px / regular
- Caption: 14px / regular (minimum allowed)

### 8.4 Spacing

- XS: 4px
- SM: 8px
- MD: 16px
- LG: 24px
- XL: 32px
- XXL: 48px

### 8.5 Component Specifications

**KPICard**:
- Padding: 24px
- Background: White
- Border: 1px solid #E6E8EB
- Border radius: 8px
- Shadow: 0 1px 2px rgba(0,0,0,0.05)
- Title: 18px semibold
- Value: 32px bold
- Delta: 16px with color coding

**HealthCard**:
- Full width
- Background: Contextual (green/yellow/red tint)
- Status pill: 14px uppercase, bold
- Summary: 20px regular
- CTA button: 18px, high contrast

**Sidebar**:
- Fixed width: 280px (increased for accessibility)
- Background: #111827 (dark for contrast)
- Text: White, 18px
- Active item: Light blue background (#1E40AF)

---

## 9. Risks & Mitigation

### 9.1 Technical Risks

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|------------|
| Excel schema variations break import | High | High | Fuzzy matching + manual mapping UI |
| AI generates incorrect summaries | Medium | High | Low temperature + template fallback |
| Database performance degrades | Low | High | Supabase indexes + materialized views |
| File uploads too large for memory | Medium | Medium | Streaming parser + chunked upload |
| Accessibility compliance issues | Medium | High | WCAG testing from day one |
| Supabase rate limits | Low | Medium | Implement client-side caching |

### 9.2 Business Risks

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|------------|
| GM doesn't adopt the tool | Medium | Critical | Involve GM in design, accessibility focus |
| Data quality issues | High | Medium | Validation + preview before ingestion |
| Integration takes too long | Low | Medium | Phased rollout, quick wins first |

### 9.3 Assumptions

1. **Excel format is consistent**: We assume uploaded Excel files follow a predictable structure. Reality: Users may have variations. Mitigation: Flexible schema detection.

2. **Single factory deployment**: Architecture assumes one manufacturing location. Reality: May need multi-factory in future. Mitigation: Include factory_id in schema from day one.

3. **Internet connectivity**: AI features require internet. Reality: Factory may have intermittent connectivity. Mitigation: Offline-first dashboard, AI optional.

4. **Users have modern browsers**: IE11 not supported. Reality: Corporate environments may have old browsers. Mitigation: Browser detection + warning.

5. **Supabase availability**: System relies on Supabase cloud service. Reality: Network issues or service outages. Mitigation: Client-side caching, retry logic.

---

## 10. Dependencies & External Services

### 10.1 Required Dependencies

**Production**:
- Next.js 16.x (framework)
- React 19.x (UI library)
- TypeScript 5.x (type safety)
- **Supabase**: @supabase/supabase-js (database, auth, storage)

**To Add**:
- `recharts` (charting library)
- `xlsx` (Excel parsing)
- `@google/generative-ai` (Gemini SDK)
- `zustand` (state management)
- `swr` (data fetching)
- `bcryptjs` (password hashing - for local dev, Supabase Auth in production)
- `jose` (JWT handling)
- `zod` (schema validation)
- `date-fns` (date manipulation)
- `clsx` + `tailwind-merge` (class utilities)

### 10.2 External Services

**Required**:
- **Supabase**: Database, Authentication, Storage
- **Google Gemini API**: AI summaries

**Supabase Services Used**:
- PostgreSQL Database
- Authentication (auth.users, email/password)
- Storage (for Excel uploads)
- Row Level Security (RLS)

### 10.3 Development Tools

- ESLint (linting)
- Prettier (formatting)
- Playwright (E2E testing)
- Vitest (unit testing)
- MSW (API mocking)

---

## 11. Success Criteria Checklist

**Before Release, Must Have**:
- [ ] All 5 pages functional with real data from Supabase
- [ ] Excel upload working with Supabase Storage
- [ ] Dashboard displays AI summaries
- [ ] Supabase Auth implemented with role-based access
- [ ] RLS policies configured for security
- [ ] WCAG AAA accessibility compliance
- [ ] Dashboard loads in <2 seconds
- [ ] Mobile responsive (tablet minimum)
- [ ] Audit logs operational
- [ ] Documentation complete

**Post-Release Nice-to-Have**:
- [ ] Email reports
- [ ] Slack/Teams integration
- [ ] Advanced analytics (predictions)
- [ ] Mobile app
- [ ] Multi-language support

---

## 12. Appendix

### 12.1 Glossary

- **GM**: General Manager
- **KPI**: Key Performance Indicator
- **Pareto Chart**: Bar + line chart showing frequency and cumulative percentage
- **Supabase**: Backend-as-a-Service platform (PostgreSQL, Auth, Storage)
- **RLS**: Row Level Security
- **SWR**: Stale-While-Revalidate caching strategy
- **WCAG**: Web Content Accessibility Guidelines

### 12.2 Reference Documents

- Original prompt: `/prompt.md`
- Architecture guide: Oracle consultation results
- Supabase Docs: https://supabase.com/docs
- Design mockups: (to be created during implementation)

### 12.3 Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-01-30 | Prometheus | Initial PRD creation |
| 2.0 | 2026-01-30 | Prometheus | Migrated to Supabase (Auth, Storage, PostgreSQL) |

---

**End of PRD**
