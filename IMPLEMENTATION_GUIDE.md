# RAIS Dashboard - Implementation Guide

## Quick Start

### 1. Environment Setup

```bash
# Copy environment template
cp .env.local.example .env.local

# Edit .env.local with your credentials
# - NEXT_PUBLIC_SUPABASE_URL
# - NEXT_PUBLIC_SUPABASE_ANON_KEY
# - SUPABASE_SERVICE_ROLE_KEY
# - GEMINI_API_KEY
```

### 2. Install Dependencies

```bash
npm install
# or
bun install
```

### 3. Database Setup

```bash
# Run migrations in Supabase SQL Editor
# Execute: supabase/migrations/002_complete_schema.sql
```

### 4. Run Development Server

```bash
npm run dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## Implementation Checklist

### Phase 1: Foundation (Week 1-2)

#### Database
- [ ] Execute migration `002_complete_schema.sql` in Supabase
- [ ] Verify all tables created successfully
- [ ] Test database functions (calculate_rejection_rate, etc.)
- [ ] Refresh materialized views manually
- [ ] Insert sample data for testing

#### Design System
- [ ] Install shadcn/ui components
  ```bash
  npx shadcn-ui@latest init
  npx shadcn-ui@latest add button card badge table select dialog toast
  ```
- [ ] Verify Tailwind configuration
- [ ] Test WCAG AAA contrast ratios
- [ ] Create base component library

#### Core API Routes
- [x] `/api/analytics/overview` - Dashboard KPIs ✓
- [x] `/api/analytics/trends` - Time series data ✓
- [x] `/api/analytics/pareto` - Defect analysis ✓
- [x] `/api/batches` - Batch listing ✓
- [x] `/api/batches/[id]` - Batch details ✓
- [ ] `/api/upload` - File upload handler
- [ ] `/api/ai/summarize` - AI health summary

#### Dashboard Page
- [ ] Create layout with sidebar
- [ ] Implement KPI cards
- [ ] Add trend chart (Recharts)
- [ ] Display high-risk batches
- [ ] Integrate AI summary panel

**Success Criteria:**
- Dashboard loads in <2 seconds
- All KPIs display correctly
- No console errors
- WCAG AAA compliant

---

### Phase 2: Analytics Pages (Week 3-4)

#### Trends Page (`/trends`)
- [ ] Time-series chart component
- [ ] Period selector (7d/14d/30d/90d)
- [ ] Period-over-period comparison
- [ ] Forecast visualization (optional)

#### Defect Analysis (`/analysis`)
- [ ] Pareto chart component
- [ ] Defect breakdown table
- [ ] AI root cause panel
- [ ] Drill-down to batch details

#### Batch Risk (`/batch-risk`)
- [ ] Risk-filtered table
- [ ] Risk badge components
- [ ] Batch detail modal
- [ ] Export to Excel

#### Supplier Page (`/supplier`)
- [ ] Supplier ranking table
- [ ] Performance trend chart
- [ ] Supplier detail view

#### Reports Page (`/reports`)
- [ ] Report type selector
- [ ] Generate report button
- [ ] PDF export functionality
- [ ] Report history list

**Success Criteria:**
- All pages functional
- Charts render correctly
- Filtering works
- Mobile responsive

---

### Phase 3: Data Ingestion (Week 5)

#### Upload Page (`/settings/upload`)
- [ ] Drag-drop file zone
- [ ] File validation
- [ ] Upload progress indicator
- [ ] Upload history table

#### Excel Processing
- [ ] Create `excelParser.ts`
- [ ] Implement schema detection
- [ ] Data validation logic
- [ ] Error handling

#### API Routes
- [ ] `POST /api/upload` - Handle file upload
- [ ] `GET /api/upload/[id]/status` - Poll upload status
- [ ] `GET /api/upload/history` - Get upload history

#### Supabase Storage
- [ ] Configure uploads bucket
- [ ] File upload to storage
- [ ] Metadata tracking in `upload_history`

**Success Criteria:**
- Excel upload works end-to-end
- Schema detection is accurate
- Validation catches errors
- Data imports correctly

---

### Phase 4: AI Integration (Week 6-7)

#### Gemini Setup
- [x] Create `gemini.ts` wrapper ✓
- [x] Implement prompt templates ✓
- [x] Add caching layer ✓
- [ ] Test API connection

#### AI Features
- [ ] Health summary on dashboard
- [ ] Root cause analysis on defect page
- [ ] Predictive alerts on batch risk
- [ ] Anomaly detection (optional)

#### UI Components
- [ ] AIInsightPanel component
- [ ] Loading states
- [ ] Error handling
- [ ] Sentiment indicators

**Success Criteria:**
- AI summaries generate in <3s
- Cache works (no duplicate calls)
- Insights are accurate
- No API errors

---

### Phase 5: Polish & Testing (Week 8)

#### Performance
- [ ] Implement SWR caching
- [ ] Add loading skeletons
- [ ] Optimize database queries
- [ ] Lazy load charts

#### Accessibility
- [ ] Run Lighthouse audit
- [ ] Test keyboard navigation
- [ ] Verify WCAG AAA compliance
- [ ] Screen reader testing

#### Error Handling
- [ ] Global error boundary
- [ ] API error states
- [ ] User-friendly messages
- [ ] Retry mechanisms

#### Testing
- [ ] Write Playwright E2E tests
- [ ] Test upload workflow
- [ ] Test AI features
- [ ] Cross-browser testing

**Success Criteria:**
- Lighthouse score >90
- All WCAG AAA criteria met
- E2E tests pass
- No critical bugs

---

## Development Workflow

### Running the App
```bash
npm run dev        # Development mode
npm run build      # Production build
npm run start      # Production server
npm run lint       # Lint check
```

### Database Operations
```bash
# Refresh materialized views (after data import)
# Call via API: POST /api/admin/refresh-views
# Or SQL: SELECT refresh_all_materialized_views();

# Clean expired AI insights (hourly cron job)
# Call via API: POST /api/admin/clean-cache
# Or SQL: SELECT clean_expired_insights();
```

### Common Issues

**Issue: Supabase connection fails**
```bash
# Check environment variables
echo $NEXT_PUBLIC_SUPABASE_URL
echo $SUPABASE_SERVICE_ROLE_KEY

# Test connection
# Add to API route:
import { testConnection } from '@/lib/db/client';
const connected = await testConnection();
console.log('Connected:', connected);
```

**Issue: Gemini API errors**
```bash
# Verify API key
echo $GEMINI_API_KEY

# Test Gemini connection
import { testGeminiConnection } from '@/lib/ai/gemini';
const works = await testGeminiConnection();
console.log('Gemini works:', works);
```

**Issue: Tailwind classes not applying**
```bash
# Rebuild Tailwind
npm run dev

# Check tailwind.config.ts content paths
# Ensure all component paths are included
```

---

## File Structure Reference

```
src/
├── app/                      # Next.js App Router
│   ├── (dashboard)/          # Dashboard layout group
│   │   ├── layout.tsx        # Shared layout
│   │   ├── page.tsx          # Dashboard home
│   │   ├── trends/
│   │   ├── analysis/
│   │   ├── batch-risk/
│   │   ├── supplier/
│   │   └── reports/
│   ├── api/                  # API routes
│   │   ├── analytics/
│   │   ├── batches/
│   │   ├── upload/
│   │   └── ai/
│   └── globals.css           # Global styles
├── components/               # React components
│   ├── ui/                   # shadcn/ui primitives
│   ├── dashboard/            # Dashboard components
│   └── layout/               # Layout components
├── lib/                      # Core logic
│   ├── db/                   # Database layer
│   ├── analytics/            # KPI engine
│   ├── ai/                   # Gemini integration
│   └── upload/               # Excel processing
└── types/                    # TypeScript types
```

---

## Next Steps After Implementation

1. **Deploy to Vercel**
   ```bash
   vercel --prod
   ```

2. **Setup Cron Jobs**
   - Refresh materialized views every 5 minutes
   - Clean expired AI insights hourly

3. **User Training**
   - Create user guide for GM
   - Record demo video
   - Setup support channel

4. **Monitoring**
   - Setup Sentry for error tracking
   - Add Vercel Analytics
   - Monitor API usage

5. **Iterate**
   - Collect GM feedback
   - Add requested features
   - Optimize based on usage patterns

---

## Support

- Documentation: `.sisyphus/docs/REDESIGN_PLAN.md`
- Database Schema: `supabase/migrations/002_complete_schema.sql`
- API Types: `src/lib/db/types.ts`
- Design System: `tailwind.config.ts` + `src/app/globals.css`

**Built with ❤️ for manufacturing quality excellence**
