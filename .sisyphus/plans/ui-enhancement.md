# UI/UX Enhancement Plan

## Problem Statement
1. **Hidden Upload Feature**: The upload page exists at `/settings/upload` but users cannot easily discover it
2. **Plain UI**: Current interface lacks visual appeal and modern design patterns
3. **Missing Navigation**: No clear path from dashboard to data upload

## Goals
1. Make upload functionality easily discoverable from main dashboard
2. Modernize UI with better visual hierarchy, colors, and interactions
3. Improve overall user experience with clear navigation

## Scope

### IN SCOPE
- Dashboard page UI enhancements
- Settings index page creation
- Sidebar navigation improvements
- Upload page visual improvements
- Global CSS enhancements
- Add prominent upload CTA on dashboard

### OUT OF SCOPE
- Backend functionality changes
- New features beyond UI
- Mobile-responsive redesign (focused on desktop)
- Dark mode (future enhancement)

## Implementation Tasks

### Task 1: Create Settings Index Page
**Location**: `src/app/settings/page.tsx`
**What**: Landing page for settings with cards linking to different settings sections
**Visual Design**:
- Grid layout with cards
- Each card has: icon, title, description, hover effects
- Color-coded cards (blue for upload, gray for disabled features)
- Smooth hover transitions

### Task 2: Enhance Dashboard with Upload CTA
**Location**: `src/app/page.tsx`
**What**: Add prominent "Upload Data" button in Quick Actions section
**Changes**:
- Make Upload button primary (blue, filled)
- Add upload icon
- Position as first action
- Add visual emphasis

### Task 3: Improve Sidebar Navigation
**Location**: `src/components/Sidebar.tsx`
**What**: Better visual design and add upload shortcut
**Changes**:
- Add icons to nav items
- Add "Upload Data" quick link at top
- Better active state styling
- Subtle background colors

### Task 4: Modernize Upload Page
**Location**: `src/app/settings/upload/page.tsx`
**What**: Better visual design for upload interface
**Changes**:
- Better dropzone styling with dashed border
- Progress indicators with animations
- Success/error states with icons
- Better table styling for schema preview
- Colorful confidence bars

### Task 5: Global CSS Improvements
**Location**: `src/app/globals.css` and page modules
**What**: Enhanced color palette and typography
**Additions**:
- CSS variables for consistent colors
- Better spacing and shadows
- Smooth transitions
- Modern card styles

## Acceptance Criteria

### Visual Verification (Agent-Executable)
1. **Dashboard Upload Button Visible**
   - Navigate to http://localhost:3000
   - Verify blue "Upload Data" button exists in Quick Actions
   - Screenshot: `.sisyphus/evidence/dashboard-cta.png`

2. **Settings Page Accessible**
   - Navigate to http://localhost:3000/settings
   - Verify grid of setting cards displayed
   - Verify "Upload Data" card is prominent (blue, first)
   - Screenshot: `.sisyphus/evidence/settings-page.png`

3. **Sidebar Shows Upload Link**
   - Verify "Upload Data" appears in sidebar
   - Verify icons present on all nav items
   - Screenshot: `.sisyphus/evidence/sidebar.png`

4. **Upload Page Modernized**
   - Navigate to http://localhost:3000/settings/upload
   - Verify dropzone has dashed border and hover effects
   - Upload test file and verify progress animations
   - Screenshot: `.sisyphus/evidence/upload-page.png`

### Functional Verification
- All navigation links work correctly
- Upload functionality still works end-to-end
- No console errors

## Technical Approach

### Recommended Agent Profile
- **Category**: `visual-engineering`
- **Skills**: `frontend-ui-ux`
- **Justification**: This is pure UI/UX work requiring design sense

### Execution Order
1. Task 1: Create settings index page (enables navigation)
2. Task 2: Enhance dashboard (makes upload discoverable)
3. Task 3: Improve sidebar (consistent navigation)
4. Task 4: Modernize upload page (better UX)
5. Task 5: Global CSS (foundation for all above)

### Files to Modify
| File | Changes |
|------|---------|
| `src/app/settings/page.tsx` | New file - settings landing page |
| `src/app/settings/settings.module.css` | New file - settings styles |
| `src/app/page.tsx` | Add upload CTA button |
| `src/app/page.module.css` | Enhance dashboard styles |
| `src/components/Sidebar.tsx` | Add icons, upload link |
| `src/components/Sidebar.module.css` | Better sidebar styling |
| `src/app/settings/upload/page.tsx` | Modernize upload UI |
| `src/app/settings/upload/upload.module.css` | Enhanced upload styles |
| `src/app/globals.css` | Global CSS variables |

## User Instructions

**To execute this plan:**
```
/start-work
```

**To preview after completion:**
1. Run `npm run dev`
2. Go to http://localhost:3000
3. Click the blue "Upload Data" button
4. Or go to http://localhost:3000/settings

## Estimated Effort
- **Duration**: 45-60 minutes
- **Complexity**: Medium (UI focused)
- **Risk**: Low (no backend changes)
