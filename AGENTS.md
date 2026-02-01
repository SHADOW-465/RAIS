# RAIS - Manufacturing Quality Dashboard

**Generated:** 2026-01-31  
**Stack:** Next.js 16 + React 19 + TypeScript + Supabase  
**Purpose:** Real-time rejection analysis & intelligence system for manufacturing quality control

## Project Overview

RAIS is a full-stack dashboard for manufacturing quality managers to:
- Upload Excel files with rejection data
- View real-time KPIs (rejection rates, cost impact, forecasts)
- Analyze trends and defect patterns
- Monitor supplier quality
- Generate AI-powered health summaries

## Directory Structure

```
.
├── src/
│   ├── app/              # Next.js App Router pages
│   │   ├── api/          # API routes (REST endpoints)
│   │   ├── analysis/     # Defect analysis page
│   │   ├── reports/      # Reports page
│   │   ├── settings/     # Settings & upload
│   │   ├── supplier/     # Supplier quality page
│   │   ├── trends/       # Rejection trends page
│   │   └── page.tsx      # Dashboard (root)
│   ├── components/       # React components
│   │   ├── dashboard/    # Dashboard-specific components
│   │   └── Sidebar.tsx   # Navigation sidebar
│   └── lib/              # Core business logic
│       ├── ai/           # Gemini AI integration
│       ├── analytics/    # KPI calculation engine
│       ├── db/           # Database layer (Supabase)
│       └── upload/       # Excel processing
├── supabase/             # SQL migrations & setup docs
├── public/               # Static assets
└── .sisyphus/            # Project documentation (PRD, SRS, plans)
```

## Where to Look

| Task | Location | Notes |
|------|----------|-------|
| Add new page | `src/app/[page]/page.tsx` | Create folder + page.tsx |
| Add API endpoint | `src/app/api/[route]/route.ts` | RESTful route handlers |
| Database query | `src/lib/db/repositories/*.ts` | Repository pattern with Supabase |
| Upload processing | `src/lib/upload/` | Excel parsing, schema detection |
| AI features | `src/lib/ai/geminiService.ts` | Gemini API integration |
| KPI calculation | `src/lib/analytics/kpiEngine.ts` | Statistics & forecasting |
| Shared components | `src/components/` | Reusable React components |
| Global styles | `src/app/globals.css` | CSS variables & utilities |

## Key Files

### Entry Points
- `src/app/page.tsx` - Dashboard (main entry)
- `src/app/layout.tsx` - Root layout
- `src/app/api/upload/route.ts` - File upload API

### Configuration
- `next.config.ts` - Next.js config
- `package.json` - Dependencies
- `.env.local.example` - Environment variables template
- `supabase/migrations/001_functions.sql` - Database functions

### Business Logic
- `src/lib/db/repositories/rejectionRepository.ts` - Core data access (362 lines)
- `src/lib/analytics/kpiEngine.ts` - KPI calculations
- `src/lib/upload/excelProcessor.ts` - Excel parsing
- `src/lib/ai/geminiService.ts` - AI summaries

## Conventions

### File Naming
- Pages: `page.tsx` (Next.js App Router convention)
- API routes: `route.ts` (Next.js convention)
- Components: PascalCase (e.g., `Sidebar.tsx`)
- Utilities: camelCase (e.g., `kpiEngine.ts`)

### Code Style
- TypeScript strict mode enabled
- CSS Modules for styling (`.module.css`)
- Repository pattern for database access
- Async/await for all async operations
- Error boundaries not yet implemented

### Database
- **Supabase** (migrated from PostgreSQL/pg)
- Type-safe queries with `database.types.ts`
- Service role key for server operations
- RLS policies defined in migrations

## Anti-Patterns (Avoid)

1. **Don't use `pg` client directly** - Use `supabaseAdmin` from `supabaseClient.ts`
2. **Don't store files locally** - Use Supabase Storage (bucket: "uploads")
3. **Don't skip type safety** - All DB queries should use types from `database.types.ts`
4. **Don't mix server/client code** - Keep API routes pure, pages can be async

## Commands

```bash
# Development
npm run dev              # Start dev server (http://localhost:3000)

# Build
npm run build            # Production build
npm run start            # Start production server

# Linting
npm run lint             # ESLint check
```

## Environment Setup

Required in `.env.local`:
```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
GEMINI_API_KEY=your-gemini-api-key
SESSION_SECRET=your-32-char-secret
```

## Notes

- **Supabase Migration Complete**: All code migrated from PostgreSQL+TimescaleDB to Supabase
- **Upload Workflow**: Excel → Schema Detection → Validation → Supabase Storage → Database
- **AI Integration**: Gemini generates health summaries from KPI data
- **No Tests**: Vitest configured but no test files written yet
- **Playwright**: Configured for E2E but no tests written

## Related Documentation

- `.sisyphus/docs/PRD.md` - Product Requirements
- `.sisyphus/docs/SRS.md` - Software Requirements
- `.sisyphus/plans/implementation-plan.md` - Implementation history
- `.sisyphus/plans/ui-enhancement.md` - UI improvements plan
- `supabase/README.md` - Supabase setup instructions
