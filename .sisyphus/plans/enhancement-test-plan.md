# RAIS Enhancement Plan: Features + Testing

**Date:** February 1, 2026  
**Status:** Planning Complete - Ready for Implementation  
**Priority:** High-Value Features First

---

## 📊 **PART 1: FEATURE PRIORITIZATION**

### **Top 7 Features (Ranked by GM Value)**

| Rank | Feature | Business Value | Complexity | Priority |
|------|---------|----------------|------------|----------|
| 1 | **Export to Excel/PDF** | Critical for GM reports | Medium | 🔴 HIGH |
| 2 | **Cost Tracking** | Direct financial impact | Medium | 🔴 HIGH |
| 3 | **AI Health Insights** | Decision support | Medium | 🟡 MEDIUM |
| 4 | **Notifications** | Proactive alerts | Medium | 🟡 MEDIUM |
| 5 | **Search & Filter** | Usability improvement | Low | 🟢 LOW |
| 6 | **Real-time Refresh** | Data freshness | Low | 🟢 LOW |
| 7 | **User Authentication** | Security/Roles | High | 🟢 LOW |

---

## 🎯 **PART 2: DETAILED FEATURE SPECIFICATIONS**

### **Feature 1: Export to Excel/PDF** 🔴 HIGH

**Why:** GM needs to export reports for stakeholders and audits

**Requirements:**
- Export any dashboard view to Excel (.xlsx)
- Export to PDF for presentations
- Include current filters in export
- Add metadata (generated date, filters applied)

**Implementation:**
- `src/lib/export/excelExport.ts` - Excel generation
- `src/lib/export/pdfExport.ts` - PDF generation
- Update Reports page with working export buttons
- Add export to Trends, Analysis, Batch Risk pages

**Success Criteria:**
- [ ] Can export Executive Overview to Excel with all KPIs
- [ ] Can export Batch Risk list to PDF
- [ ] Exported file includes current date range filters
- [ ] File opens correctly in Excel/Acrobat

---

### **Feature 2: Cost Tracking** 🔴 HIGH

**Why:** GM asked "How much money are we losing?"

**Requirements:**
- Add unit cost field to rejection records
- Calculate cost per batch (rejected_qty × unit_cost)
- Show financial impact on dashboard
- Monthly/yearly cost totals

**Implementation:**
- Update `src/lib/db/types.ts` - Add cost fields
- Update `src/lib/upload/excelProcessor.ts` - Parse cost columns
- Create `src/lib/analytics/costEngine.ts` - Cost calculations
- Update Executive Overview KPIs to show financial loss
- Update Batch Risk page with cost impact

**Success Criteria:**
- [ ] Dashboard shows "Potential Financial Loss" KPI
- [ ] Batch Risk shows cost per batch
- [ ] Cost calculations use actual unit costs from data
- [ ] Excel upload accepts cost columns

---

### **Feature 3: AI Health Insights** 🟡 MEDIUM

**Why:** AI provides decision support and identifies patterns

**Requirements:**
- Gemini-powered health summary on dashboard
- Identify top risk areas automatically
- Recommend actions based on data
- Update insights as new data arrives

**Implementation:**
- `src/lib/ai/geminiService.ts` already exists - enhance it
- Add AI insights to Executive Overview
- Add AI recommendations to Batch Risk page
- Cache AI results to reduce API calls

**Success Criteria:**
- [ ] Dashboard shows AI-generated health summary
- [ ] Insights update when new data uploaded
- [ ] Recommendations are actionable (e.g., "Inspect Batch X")
- [ ] AI responses cached for 1 hour

---

### **Feature 4: Notifications** 🟡 MEDIUM

**Why:** Proactive alerts for high-risk batches

**Requirements:**
- Toast notifications for new high-risk batches
- Email alerts for critical situations
- In-app notification center
- Configurable alert thresholds

**Implementation:**
- Create `src/components/NotificationCenter.tsx`
- Add toast system (react-hot-toast or similar)
- Create `src/lib/notifications/notificationService.ts`
- Add notification settings to user profile

**Success Criteria:**
- [ ] Toast appears when batch risk > threshold
- [ ] Notification center shows history
- [ ] Can configure which events trigger notifications
- [ ] Works without page refresh

---

### **Feature 5: Search & Filter** 🟢 LOW

**Why:** Easier to find specific batches/defects

**Requirements:**
- Search batches by ID
- Filter by date range, stage, defect type
- Filter by risk level
- Save filter presets

**Implementation:**
- Add search bar to Batch Risk page
- Add filter sidebar to all list pages
- Create `src/components/FilterPanel.tsx`
- Update repositories with filter methods

**Success Criteria:**
- [ ] Can search batches by partial ID match
- [ ] Can filter defects by type
- [ ] Filters update URL (shareable links)
- [ ] Clear all filters button works

---

### **Feature 6: Real-time Refresh** 🟢 LOW

**Why:** Data freshness without manual refresh

**Requirements:**
- Auto-refresh dashboard every 5 minutes
- Show "last updated" timestamp
- Manual refresh button
- Pause refresh when user inactive

**Implementation:**
- Add SWR configuration with refresh interval
- Create `src/hooks/useAutoRefresh.ts`
- Add refresh indicator to TopBar
- Pause on window blur

**Success Criteria:**
- [ ] Dashboard auto-refreshes every 5 min
- [ ] Shows "Updated 2 min ago" indicator
- [ ] Manual refresh button works
- [ ] Stops refreshing when tab inactive

---

### **Feature 7: User Authentication** 🟢 LOW

**Why:** Role-based access (GM vs Quality Manager vs Supervisor)

**Requirements:**
- Login page with email/password
- Role-based permissions
- GM: Full access
- Quality Manager: Full access
- Supervisor: Read-only + upload

**Implementation:**
- Use Supabase Auth
- Create `src/app/login/page.tsx`
- Add middleware for route protection
- Update Sidebar with user info

**Success Criteria:**
- [ ] Can login with email/password
- [ ] Supervisor sees read-only interface
- [ ] Session persists across page reloads
- [ ] Can logout

---

## 🧪 **PART 3: TESTING STRATEGY**

### **Current State: 0% Coverage**
- Vitest installed but no test files
- Need comprehensive test coverage

### **Test Pyramid**

```
    /\
   /  \  E2E Tests (Playwright)
  /____\    - User flows
 /      \   - Critical paths
/        \
----------
    /\
   /  \  Integration Tests
  /____\    - API endpoints
 /      \   - Database queries
/        \
----------
   /\/\/\  
   /\/\/\  Unit Tests (Vitest)
   /\/\/\     - Components
   /\/\/\     - Utilities
   /\/\/\     - Calculations
```

### **Test Coverage Plan**

#### **1. Unit Tests (70% of tests)**

**Components to Test:**
- [ ] `TopBar` - rendering, interactions
- [ ] `SlidePanel` - open/close, animations
- [ ] `RiskBadge` - risk level calculation
- [ ] `KPICard` - value display, deltas
- [ ] `Sidebar` - navigation, active states

**Utilities to Test:**
- [ ] `calculateRiskLevel()` - all 3 tiers
- [ ] Date formatting functions
- [ ] Export utilities (Excel, PDF)
- [ ] Schema detection logic

**Calculations to Test:**
- [ ] Rejection rate formulas
- [ ] Cost calculations
- [ ] Pareto percentages
- [ ] Trend comparisons

**Test Files to Create:**
- `src/components/__tests__/TopBar.test.tsx`
- `src/components/__tests__/RiskBadge.test.tsx`
- `src/lib/analytics/__tests__/riskAssessment.test.ts`
- `src/lib/export/__tests__/excelExport.test.ts`

#### **2. Integration Tests (20% of tests)**

**API Endpoints:**
- [ ] `/api/upload` - file upload flow
- [ ] `/api/analytics/trends` - trend data
- [ ] `/api/ai/summarize` - AI insights

**Database Queries:**
- [ ] Rejection repository queries
- [ ] Batch aggregation queries
- [ ] Filter/sort operations

**Test Files to Create:**
- `src/app/api/upload/__tests__/route.test.ts`
- `src/lib/db/repositories/__tests__/rejectionRepository.test.ts`

#### **3. E2E Tests (10% of tests)**

**Critical User Flows:**
- [ ] Upload Excel → See data in dashboard
- [ ] View Batch Risk → Export to PDF
- [ ] Navigate all pages → No errors
- [ ] Login → Access dashboard

**Test Files to Create:**
- `e2e/upload.spec.ts`
- `e2e/dashboard.spec.ts`
- `e2e/navigation.spec.ts`

---

## 🚀 **PART 4: PARALLEL EXECUTION PLAN**

### **Wave 1: Foundation (Tests + Core Features)**
**Duration:** 2-3 hours  
**Dependencies:** None

#### **Parallel Tasks:**

**Task 1.1: Setup Test Infrastructure** (Category: quick)
- [ ] Create `vitest.config.ts` with proper config
- [ ] Add test script to package.json
- [ ] Setup test utilities and mocks
- [ ] Create test directory structure

**Task 1.2: Unit Tests - Components** (Category: quick, Skills: frontend-ui-ux)
- [ ] Test TopBar component
- [ ] Test RiskBadge component  
- [ ] Test KPICard component
- [ ] Test SlidePanel component

**Task 1.3: Unit Tests - Utilities** (Category: quick)
- [ ] Test calculateRiskLevel()
- [ ] Test date formatting
- [ ] Test cost calculations

**Task 1.4: Export Feature - Excel** (Category: ultrabrain)
- [ ] Create `src/lib/export/excelExport.ts`
- [ ] Integrate with Reports page
- [ ] Add export to Batch Risk page

**Task 1.5: Export Feature - PDF** (Category: ultrabrain)
- [ ] Create `src/lib/export/pdfExport.ts`
- [ ] Integrate with Reports page
- [ ] Style PDF output

---

### **Wave 2: Data Features**
**Duration:** 2-3 hours  
**Dependencies:** Wave 1 complete

#### **Parallel Tasks:**

**Task 2.1: Cost Tracking - Backend** (Category: ultrabrain)
- [ ] Update database types with cost fields
- [ ] Update Excel processor to parse costs
- [ ] Add cost to rejection repository queries

**Task 2.2: Cost Tracking - Frontend** (Category: visual-engineering, Skills: frontend-ui-ux)
- [ ] Update Executive Overview with cost KPI
- [ ] Update Batch Risk page with cost column
- [ ] Add cost calculation engine

**Task 2.3: AI Insights Enhancement** (Category: ultrabrain)
- [ ] Enhance geminiService.ts
- [ ] Add AI insights to dashboard
- [ ] Cache AI responses

**Task 2.4: Integration Tests** (Category: quick)
- [ ] Test upload API endpoint
- [ ] Test analytics API
- [ ] Test database queries

---

### **Wave 3: UX Features**
**Duration:** 2-3 hours  
**Dependencies:** Wave 2 complete

#### **Parallel Tasks:**

**Task 3.1: Notifications System** (Category: visual-engineering, Skills: frontend-ui-ux)
- [ ] Create NotificationCenter component
- [ ] Add toast notifications
- [ ] Configure notification service

**Task 3.2: Search & Filter** (Category: visual-engineering, Skills: frontend-ui-ux)
- [ ] Create FilterPanel component
- [ ] Add search to Batch Risk page
- [ ] Update repositories with filter methods

**Task 3.3: Real-time Refresh** (Category: quick)
- [ ] Create useAutoRefresh hook
- [ ] Add refresh indicator to TopBar
- [ ] Configure SWR refresh interval

**Task 3.4: E2E Tests** (Category: quick, Skills: playwright)
- [ ] Test upload flow
- [ ] Test dashboard navigation
- [ ] Test export functionality

---

### **Wave 4: Authentication (Optional)**
**Duration:** 3-4 hours  
**Dependencies:** All other waves complete

#### **Tasks:**

**Task 4.1: Auth Setup** (Category: ultrabrain)
- [ ] Configure Supabase Auth
- [ ] Create login page
- [ ] Add auth middleware

**Task 4.2: Role-based UI** (Category: visual-engineering, Skills: frontend-ui-ux)
- [ ] Update Sidebar with user info
- [ ] Add role-based permissions
- [ ] Create read-only mode for Supervisor

---

## 📈 **PART 5: SUCCESS CRITERIA**

### **Feature Completion Criteria**

| Feature | Metric | Target |
|---------|--------|--------|
| Export | Export success rate | 100% |
| Cost Tracking | Cost calculation accuracy | 100% |
| AI Insights | Response time | < 2 seconds |
| Notifications | Alert delivery | Real-time |
| Search | Search response time | < 500ms |
| Real-time | Refresh interval | 5 minutes |
| Auth | Login success rate | 100% |

### **Test Coverage Criteria**

| Level | Coverage Target | Files |
|-------|-----------------|-------|
| Unit Tests | 70% | 10+ files |
| Integration Tests | 20% | 5+ files |
| E2E Tests | 10% | 3+ files |
| **Total** | **100% of critical paths** | **18+ files** |

### **Quality Gates**

- [ ] All tests pass (`npm test` exits 0)
- [ ] Build succeeds (`npm run build` exits 0)
- [ ] No TypeScript errors
- [ ] No ESLint errors
- [ ] E2E tests pass in CI

---

## 🎯 **PART 6: RECOMMENDED IMPLEMENTATION ORDER**

### **Phase 1: Immediate (Do First)**
1. ✅ Setup test infrastructure
2. ✅ Export to Excel/PDF (HIGH value)
3. ✅ Cost tracking (HIGH value)

### **Phase 2: Next (Do Second)**
4. ✅ AI insights enhancement
5. ✅ Notifications system
6. ✅ Integration tests

### **Phase 3: Polish (Do Third)**
7. ✅ Search & filter
8. ✅ Real-time refresh
9. ✅ E2E tests

### **Phase 4: Advanced (Do Last)**
10. ✅ User authentication
11. ✅ Advanced settings

---

## 🔧 **PART 7: TECHNICAL DETAILS**

### **New Files to Create**

```
src/
├── components/
│   ├── __tests__/
│   │   ├── TopBar.test.tsx
│   │   ├── RiskBadge.test.tsx
│   │   ├── KPICard.test.tsx
│   │   └── SlidePanel.test.tsx
│   ├── FilterPanel.tsx
│   ├── NotificationCenter.tsx
│   └── RefreshIndicator.tsx
├── lib/
│   ├── export/
│   │   ├── excelExport.ts
│   │   ├── pdfExport.ts
│   │   └── __tests__/
│   ├── analytics/
│   │   ├── costEngine.ts
│   │   └── __tests__/
│   ├── notifications/
│   │   └── notificationService.ts
│   └── hooks/
│       ├── useAutoRefresh.ts
│       └── useNotifications.ts
├── app/
│   ├── login/
│   │   └── page.tsx
│   └── api/
│       └── __tests__/
└── __tests__/
    └── setup.ts

e2e/
├── upload.spec.ts
├── dashboard.spec.ts
└── navigation.spec.ts

vitest.config.ts
```

### **Dependencies to Add**

```json
{
  "dependencies": {
    "jspdf": "^2.5.1",
    "jspdf-autotable": "^3.8.2",
    "xlsx-js-style": "^1.2.0",
    "react-hot-toast": "^2.4.1"
  },
  "devDependencies": {
    "@vitest/coverage-v8": "^1.0.0",
    "jsdom": "^23.0.0"
  }
}
```

---

## ✅ **PART 8: VERIFICATION CHECKLIST**

### **Before Implementation**
- [ ] Review plan with user
- [ ] Confirm priority order
- [ ] Identify any blockers

### **During Implementation**
- [ ] Write tests BEFORE implementation (TDD)
- [ ] Run tests after each feature
- [ ] Verify no regressions

### **After Implementation**
- [ ] Run full test suite
- [ ] Verify build succeeds
- [ ] Test on actual Excel files
- [ ] User acceptance testing

---

## 🎉 **SUMMARY**

**Total Features:** 7 high-value features  
**Total Test Files:** 18+ test files  
**Estimated Duration:** 8-12 hours of focused work  
**Parallel Waves:** 4 waves with parallel tasks  
**Category Distribution:**
- visual-engineering: 40%
- ultrabrain: 35%
- quick: 25%

**Ready to execute?** Review this plan and confirm priorities!
