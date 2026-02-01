# Application Pages (Next.js App Router)

**Purpose:** Next.js App Router pages and layouts

## Structure

```
src/app/
├── page.tsx               # Dashboard (root) - 276 lines
├── layout.tsx             # Root layout
├── globals.css            # Global styles
├── api/                   # API routes
│   ├── upload/route.ts    # File upload
│   └── ...
├── analysis/page.tsx      # Defect analysis - 219 lines
├── reports/page.tsx       # Reports - 204 lines
├── settings/              # Settings & upload UI
│   ├── page.tsx           # Settings index - NEW
│   └── upload/page.tsx    # Upload interface - 287 lines
├── supplier/page.tsx      # Supplier quality - 249 lines
└── trends/page.tsx        # Rejection trends - 238 lines
```

## Page Patterns

### Async Data Fetching (Server Components)
```typescript
// Dashboard pattern
async function getDashboardData() {
  const [rate, cost, risk] = await Promise.all([
    kpiEngine.calculateRejectionRate(...),
    // ... parallel fetching
  ]);
  return { rate, cost, risk };
}

export default async function Page() {
  const data = await getDashboardData();
  return <DashboardView data={data} />;
}
```

### Client Components (Interactivity)
```typescript
'use client';  // Required for state/hooks

// Used in: Upload page, forms, interactive charts
export default function ClientPage() {
  const [state, setState] = useState(...);
  // ... client-side logic
}
```

## Key Features by Page

| Page | Type | Key Feature |
|------|------|-------------|
| Dashboard | Server | KPI cards + AI summary |
| Trends | Server | Rejection trend charts |
| Analysis | Server | Defect breakdown + Pareto |
| Supplier | Server | Supplier rankings |
| Reports | Server | Report generation |
| Settings | Server | Settings navigation |
| Upload | Client | Excel upload UI |

## Styling

- **CSS Modules:** `page.module.css` per page
- **Global styles:** `globals.css` for shared utilities
- **CSS Variables:** Defined in globals.css for consistency

## Navigation

All pages accessible via:
- **Sidebar:** Main navigation
- **Quick Actions:** Dashboard footer links
- **Direct URL:** `/[page]`

## Adding New Pages

1. Create folder: `src/app/[page]/`
2. Create `page.tsx` with component
3. Create `page.module.css` for styles
4. Add to Sidebar navigation
5. (Optional) Add API route in `src/app/api/`

## Anti-Patterns

- ❌ Don't mix server/client logic confusingly
- ❌ Don't fetch data in client components (use API routes)
- ❌ Don't skip loading/error states
- ✅ Keep pages focused on one responsibility
- ✅ Use parallel fetching with `Promise.all`
