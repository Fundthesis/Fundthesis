# Frontend Code Review & Cleanup Plan

## Phase 1: Critical Fixes (Build Blockers)

### 1.1 Environment Variable Documentation
- [ ] Create `.env.example` with all required variables:
  ```
  NEXT_PUBLIC_SUPABASE_URL=
  NEXT_PUBLIC_SUPABASE_ANON_KEY=
  NEXT_PUBLIC_APP_URL=http://localhost:3000
  DATABASE_URL=
  GEMINI_API_KEY=
  ```
- **Note**: User will manually update `.env` with real values

### 1.2 Convert JSX to TSX
- [ ] Convert `src/components/dashboard/PortfolioPerformanceChart.jsx` to TypeScript
  - Add proper type annotations for props and functions
  - Update tsconfig.json to remove explicit JSX include

### 1.3 Convert JavaScript API Route to TypeScript
- [ ] Convert `src/app/api/dashboard/portfolio/route.js` to TypeScript
  - Add proper interfaces for request/response types
  - Add type safety for Prisma operations

---

## Phase 2: API Route Cleanup

### 2.1 Add Authentication to Public Routes
Create shared auth utility and add to all routes:
- [ ] Create `src/lib/apiAuth.ts` with reusable auth check function
- [ ] Add auth check to `src/app/api/articles/route.ts`
- [ ] Add auth check to `src/app/api/stocks/route.ts`
- [ ] Add auth check to `src/app/api/stock/[symbol]/route.ts`
- [ ] Add auth check to `src/app/api/insights/route.ts`

### 2.2 Standardize Error Handling
**Files to modify:**
- `src/app/api/insights/route.ts` (line 509) - Returns 200 on error, should be 500
- `src/app/api/stocks/route.ts` - Add more descriptive error messages
- `src/app/api/articles/route.ts` - Add input validation

### 2.3 Add Input Validation
- [ ] Add pagination limits to `/api/articles` (max 100 items)
- [ ] Add symbols limit to `/api/stocks` (max 50 symbols)
- [ ] Validate ticker format in `/api/dashboard/portfolio` (regex: `/^[A-Z]{1,5}$/`)

### 2.4 Refactor Large Route Files
**`src/app/api/insights/route.ts` (512 lines) - Extract helpers:**
- [ ] Create `src/lib/insightsHelpers.ts`
- [ ] Move helper functions to the new file

### 2.5 Remove Unused Routes
- [ ] Remove `/api/health/route.ts` - Currently unused

---

## Phase 3: UI Component Cleanup

### 3.1 Refactor StockCardStack (1300+ lines → ~4 focused components)
- [ ] Create `src/components/stock/StockExpandedView.tsx` - Expanded stock modal view
- [ ] Create `src/components/stock/StockPriceChart.tsx` - Chart component with timeframes
- [ ] Create `src/components/stock/StockMetrics.tsx` - Key metrics display grid
- [ ] Create `src/components/stock/StockNews.tsx` - Related news section
- [ ] Refactor `src/components/StockCardStack.tsx` to use new components

### 3.2 Fix Directory & File Naming
- [ ] Rename `src/components/enviro-compoents-real/` to `src/components/enviro-components/`
- [ ] Convert files inside to PascalCase

### 3.3 Remove Duplicate Components
- [ ] Delete `src/components/Confetti.tsx` (keep lessonmodules version)
- [ ] Update imports in any files using the deleted Confetti

### 3.4 Remove Unused Components
- [ ] Remove `src/components/ui/LearningCard.tsx` (not imported anywhere)
- [ ] Remove `src/components/DefaultStockExpandedModal.tsx` (unused duplicate)
- [ ] Remove or use `src/components/ui/ESGCard.tsx`

### 3.5 Consolidate Navigation Config
- [ ] Create `src/constants/navigation.ts` with navItems array
- [ ] Update `src/components/Navbar.tsx` to import from constants
- [ ] Update `src/components/PageLayout.tsx` to import from constants

### 3.6 Centralize Color Constants
- [ ] Create `src/constants/colors.ts` with brand palette
- [ ] Update hardcoded colors in StockCard, StockCardStack, StockTradeModal, Footer

---

## Phase 4: Build Configuration Fixes

### 4.1 Fix Root Layout SSR Issue
- [ ] Remove `'use client'` from `src/app/layout.tsx`
- [ ] Move client-only logic to child components or providers

### 4.2 Fix AuthProvider
- [ ] Replace `window.location.reload()` with Next.js router navigation

### 4.3 Update TypeScript Configuration
- [ ] Change `tsconfig.json` target from ES2017 to ES2020

### 4.4 Remove Unused Dependencies
- [ ] Remove `langchain` from package.json
- [ ] Remove `next-themes` from package.json

### 4.5 Fix Prisma Logging
- [ ] Update `src/lib/prisma.ts` to only log queries in development

---

## Phase 5: Accessibility Improvements

### 5.1 Modal Accessibility
- [ ] Add `role="dialog"` and `aria-modal="true"` to modals

### 5.2 Navigation Accessibility
- [ ] Add `aria-expanded` and `aria-controls` to mobile menu button

### 5.3 Image Alt Text
- [ ] Add alt text to ProfileCard.tsx avatar placeholder

---

## Phase 6: Final Verification

### 6.1 Build Verification
- [ ] Run `npm run build` to verify no TypeScript errors
- [ ] Run `npm run lint` to check ESLint compliance
