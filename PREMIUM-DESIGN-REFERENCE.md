# RAIS PREMIUM DESIGN SYSTEM
### Manufacturing Quality Dashboard - Design Specification
**Inspired by:** Modern HR Dashboard Reference
**Adapted for:** Manufacturing Rejection Intelligence System

---

## 🎨 DESIGN PHILOSOPHY

This design creates a **premium, calming executive experience** that transforms complex manufacturing data into clear, actionable insights. The warm color palette and generous spacing reduce cognitive load while maintaining professional authority.

---

## COLOR PALETTE

### Primary Colors
```css
--color-bg-gradient-start: #E8D5C4;    /* Warm beige/peach */
--color-bg-gradient-end: #B8B8B8;      /* Soft gray */
--color-bg-main-card: #F5EDE6;         /* Cream beige (main container) */
--color-bg-sidebar: #E8D5C4;           /* Warm beige (sidebar) */
--color-bg-card: #FFFFFF;              /* Pure white (KPI cards) */
--color-bg-card-soft: #FAF6F3;         /* Off-white (subtle cards) */
```

### Accent & Action Colors
```css
--color-accent-primary: #FF8C42;       /* Coral orange */
--color-accent-secondary: #F59E0B;     /* Amber */
--color-accent-gradient-start: #FF8C42;
--color-accent-gradient-end: #FF6B35;
```

### Dark Contrast Elements
```css
--color-dark-card: #2D3436;            /* Charcoal (for important alerts) */
--color-dark-card-secondary: #3A4145;  /* Lighter charcoal */
--color-text-on-dark: #FFFFFF;
```

### Typography Colors
```css
--color-text-primary: #2D2D2D;         /* Almost black */
--color-text-secondary: #6B7280;       /* Medium gray */
--color-text-tertiary: #9CA3AF;        /* Light gray */
--color-text-accent: #FF8C42;          /* Coral */
```

### Status Colors
```css
--color-status-success: #10B981;       /* Green */
--color-status-warning: #F59E0B;       /* Amber */
--color-status-danger: #EF4444;        /* Red */
--color-status-info: #3B82F6;          /* Blue */
```

---

## TYPOGRAPHY SYSTEM

### Font Family
```css
font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
```

### Font Sizes & Weights
```css
/* Page Title */
--font-page-title: 600 32px/1.2 'Inter';

/* Section Titles */
--font-section-title: 600 20px/1.3 'Inter';

/* KPI Numbers (Large) */
--font-kpi-large: 600 48px/1.1 'Inter';
--font-kpi-medium: 600 28px/1.2 'Inter';
--font-kpi-small: 500 18px/1.3 'Inter';

/* Body Text */
--font-body: 400 15px/1.5 'Inter';
--font-body-small: 400 13px/1.4 'Inter';
--font-caption: 400 12px/1.3 'Inter';

/* Labels */
--font-label: 500 14px/1.4 'Inter';
--font-label-small: 500 12px/1.3 'Inter';
```

---

## SPACING SYSTEM

### Base Unit: 4px
```css
--space-1: 4px;    /* Tight spacing */
--space-2: 8px;    /* Small spacing */
--space-3: 12px;   /* Compact spacing */
--space-4: 16px;   /* Default spacing */
--space-5: 20px;   /* Comfortable spacing */
--space-6: 24px;   /* Large spacing */
--space-8: 32px;   /* XL spacing */
--space-10: 40px;  /* XXL spacing */
--space-12: 48px;  /* Container spacing */
```

### Component Padding
```css
--padding-card: 24px;
--padding-card-compact: 16px;
--padding-sidebar: 20px;
--padding-content: 32px;
```

---

## BORDER RADIUS SYSTEM

```css
--radius-sm: 8px;      /* Small elements */
--radius-md: 12px;     /* Standard cards */
--radius-lg: 16px;     /* Large cards */
--radius-xl: 20px;     /* Main container */
--radius-2xl: 24px;    /* Hero elements */
--radius-full: 9999px; /* Pills, avatars */
```

---

## SHADOW SYSTEM

```css
/* Subtle depth for cards */
--shadow-card: 0 2px 8px rgba(0, 0, 0, 0.06);

/* Elevated elements */
--shadow-card-hover: 0 4px 16px rgba(0, 0, 0, 0.1);

/* Dark card shadow */
--shadow-dark-card: 0 8px 24px rgba(0, 0, 0, 0.15);

/* Main container shadow */
--shadow-container: 0 10px 40px rgba(0, 0, 0, 0.08);
```

---

## LAYOUT STRUCTURE

### Global Container
```
┌─────────────────────────────────────────┐
│  [Gradient Background]                  │
│  ┌────────────────────────────────────┐ │
│  │ [Main Container - Cream Beige]     │ │
│  │ ┌──────┬────────────────────────┐  │ │
│  │ │      │                        │  │ │
│  │ │ Side │   Content Area         │  │ │
│  │ │ bar  │                        │  │ │
│  │ │      │                        │  │ │
│  │ └──────┴────────────────────────┘  │ │
│  └────────────────────────────────────┘ │
└─────────────────────────────────────────┘
```

### Dimensions
```css
--width-sidebar: 220px;
--width-main-container: 1400px;
--max-width-content: 1120px;
--height-top-bar: 80px;
```

---

## COMPONENT SPECIFICATIONS

### 1. Background Gradient
```css
body {
  background: linear-gradient(135deg, #E8D5C4 0%, #B8B8B8 100%);
  min-height: 100vh;
}
```

### 2. Main Container
```css
.main-container {
  background: #F5EDE6;
  border-radius: 24px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.08);
  margin: 40px;
  padding: 32px;
  max-width: 1400px;
}
```

### 3. Sidebar Navigation
```css
.sidebar {
  width: 220px;
  background: #E8D5C4;
  border-radius: 16px;
  padding: 24px 16px;
}

.sidebar-item {
  padding: 12px 16px;
  border-radius: 8px;
  transition: background 200ms;
}

.sidebar-item.active {
  background: rgba(255, 255, 255, 0.4);
}

.sidebar-item:hover {
  background: rgba(255, 255, 255, 0.25);
}
```

### 4. Top Bar
```css
.top-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 0 24px 0;
  border-bottom: 1px solid rgba(0, 0, 0, 0.06);
}

.page-title {
  font-size: 32px;
  font-weight: 600;
  color: #2D2D2D;
}

.user-profile {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 16px;
  background: white;
  border-radius: 24px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}
```

### 5. KPI Cards (Small - Top Row)
```css
.kpi-card-small {
  background: white;
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  display: flex;
  align-items: center;
  gap: 16px;
}

.kpi-icon {
  width: 48px;
  height: 48px;
  background: linear-gradient(135deg, #FF8C42, #FF6B35);
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
}

.kpi-value {
  font-size: 28px;
  font-weight: 600;
  color: #2D2D2D;
  line-height: 1.2;
}

.kpi-label {
  font-size: 13px;
  color: #6B7280;
  margin-top: 4px;
}
```

### 6. Main Chart Card
```css
.chart-card {
  background: white;
  border-radius: 16px;
  padding: 32px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}

.chart-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}

.chart-title {
  font-size: 20px;
  font-weight: 600;
  color: #2D2D2D;
}

.kpi-percentage {
  font-size: 48px;
  font-weight: 600;
  color: #2D2D2D;
  line-height: 1.1;
}

.kpi-delta {
  font-size: 14px;
  color: #6B7280;
  margin-top: 4px;
}
```

### 7. Dark Contrast Card (Insights/Alerts)
```css
.dark-card {
  background: linear-gradient(135deg, #2D3436 0%, #3A4145 100%);
  border-radius: 16px;
  padding: 24px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
  color: white;
}

.dark-card-title {
  font-size: 18px;
  font-weight: 600;
  margin-bottom: 16px;
}

.dark-card-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.dark-card-item:last-child {
  border-bottom: none;
}
```

### 8. Data Table
```css
.data-table {
  background: white;
  border-radius: 16px;
  padding: 24px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}

.table {
  width: 100%;
  border-collapse: separate;
  border-spacing: 0;
}

.table th {
  text-align: left;
  padding: 12px 16px;
  font-weight: 500;
  font-size: 13px;
  color: #6B7280;
  border-bottom: 1px solid #F3F4F6;
}

.table td {
  padding: 16px;
  border-bottom: 1px solid #F9FAFB;
}

.table tr:hover {
  background: #FAFBFC;
}
```

### 9. Performance Bar
```css
.performance-bar {
  height: 6px;
  background: #F3F4F6;
  border-radius: 3px;
  overflow: hidden;
}

.performance-bar-fill {
  height: 100%;
  background: linear-gradient(90deg, #FF8C42, #F59E0B);
  border-radius: 3px;
  transition: width 500ms ease-out;
}
```

### 10. Avatar Group
```css
.avatar-group {
  display: flex;
  margin-left: -8px;
}

.avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  border: 2px solid white;
  overflow: hidden;
  margin-left: -8px;
}

.avatar:first-child {
  margin-left: 0;
}
```

---

## PAGE-SPECIFIC LAYOUTS

### Executive Overview Page

```
┌─────────────────────────────────────────────────────┐
│ Dashboard               [User Profile ▼]            │
├─────────────────────────────────────────────────────┤
│                                                     │
│ ┌──────┬──────┬──────┬──────┐  ┌────────────────┐ │
│ │ KPI  │ KPI  │ KPI  │ KPI  │  │ UPCOMING       │ │
│ │ Card │ Card │ Card │ Card │  │ BATCH REVIEWS  │ │
│ └──────┴──────┴──────┴──────┘  │ (Dark Card)    │ │
│                                  │                │ │
│ ┌───────────────────────────┐   │                │ │
│ │ REJECTION RATE CHART      │   └────────────────┘ │
│ │                           │                      │
│ │ [Bar Chart with %]        │   ┌────────────────┐ │
│ │                           │   │ DEFECT SUMMARY │ │
│ │ Top Batches at Risk ───   │   │ (Light Card)   │ │
│ │                           │   │                │ │
│ └───────────────────────────┘   └────────────────┘ │
│                                                     │
│ ┌─────────────────────────────────────────────────┐ │
│ │ HIGH RISK BATCHES TABLE                         │ │
│ │                                                 │ │
│ └─────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────┘
```

---

## ANIMATION & TRANSITIONS

```css
/* Subtle, professional transitions */
--transition-fast: 150ms cubic-bezier(0.4, 0, 0.2, 1);
--transition-base: 200ms cubic-bezier(0.4, 0, 0.2, 1);
--transition-slow: 300ms cubic-bezier(0.4, 0, 0.2, 1);

/* Card hover */
.card {
  transition: transform 200ms, box-shadow 200ms;
}

.card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
}

/* Chart animations */
@keyframes barGrow {
  from { transform: scaleY(0); }
  to { transform: scaleY(1); }
}

.chart-bar {
  animation: barGrow 800ms cubic-bezier(0.4, 0, 0.2, 1);
  transform-origin: bottom;
}
```

---

## ACCESSIBILITY

```css
/* Focus states */
:focus-visible {
  outline: 2px solid #FF8C42;
  outline-offset: 2px;
  border-radius: 4px;
}

/* Reduced motion */
@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

---

## IMPLEMENTATION CHECKLIST

### Phase 1: Foundation
- [ ] Implement gradient background
- [ ] Create main container with cream beige background
- [ ] Build sidebar with warm beige background
- [ ] Add top bar with user profile

### Phase 2: Components
- [ ] Create KPI card component (small, white background)
- [ ] Create main chart card component
- [ ] Create dark contrast card for alerts
- [ ] Build data table component
- [ ] Add performance bars

### Phase 3: Polish
- [ ] Add shadows to all cards
- [ ] Implement hover states
- [ ] Add transitions
- [ ] Test accessibility
- [ ] Responsive breakpoints

### Phase 4: Content
- [ ] Replace placeholder data
- [ ] Add real manufacturing metrics
- [ ] Implement charts
- [ ] Add avatars and user data

---

## RESPONSIVE BREAKPOINTS

```css
/* Desktop (default) */
@media (min-width: 1280px) {
  /* Full layout */
}

/* Tablet */
@media (max-width: 1279px) {
  --width-sidebar: 180px;
  --padding-content: 24px;
}

/* Mobile */
@media (max-width: 768px) {
  .main-container {
    margin: 16px;
    padding: 20px;
  }
  
  .sidebar {
    position: fixed;
    transform: translateX(-100%);
  }
  
  .kpi-row {
    grid-template-columns: 1fr;
  }
}
```

---

## DESIGN TOKENS SUMMARY

```javascript
const designTokens = {
  colors: {
    background: {
      gradient: 'linear-gradient(135deg, #E8D5C4 0%, #B8B8B8 100%)',
      mainCard: '#F5EDE6',
      sidebar: '#E8D5C4',
      cardWhite: '#FFFFFF',
      cardSoft: '#FAF6F3'
    },
    accent: {
      primary: '#FF8C42',
      secondary: '#F59E0B',
      gradient: 'linear-gradient(135deg, #FF8C42, #FF6B35)'
    },
    dark: {
      card: '#2D3436',
      cardSecondary: '#3A4145'
    },
    text: {
      primary: '#2D2D2D',
      secondary: '#6B7280',
      tertiary: '#9CA3AF'
    }
  },
  typography: {
    family: "'Inter', sans-serif",
    sizes: {
      pageTitle: '32px',
      sectionTitle: '20px',
      kpiLarge: '48px',
      kpiMedium: '28px',
      body: '15px',
      caption: '12px'
    }
  },
  spacing: {
    unit: 4,
    card: 24,
    content: 32,
    sidebar: 20
  },
  borderRadius: {
    sm: '8px',
    md: '12px',
    lg: '16px',
    xl: '20px',
    '2xl': '24px',
    full: '9999px'
  }
};
```

---

## FINAL NOTES

This design system creates a **premium, executive-grade experience** that:

1. **Reduces cognitive load** through warm colors and generous spacing
2. **Highlights critical information** using dark contrast cards
3. **Maintains professional authority** with clean typography
4. **Provides visual hierarchy** through size and color
5. **Ensures accessibility** with proper contrast and focus states

The design is specifically optimized for senior management who need to make quick decisions based on manufacturing quality data.
