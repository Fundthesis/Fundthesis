# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Fundthesis is an AI-powered financial education platform with:

- **Frontend**: Next.js 15 (React 19, TypeScript, Tailwind CSS v4, shadcn/ui)
- **Backend**: FastAPI (Python 3.12, async/await)
- **Database**: Azure PostgreSQL with pgvector extension
- **ML/AI**: XGBoost forecasting, FinBERT sentiment analysis, RAG pipeline with Azure OpenAI

## Common Commands

### Frontend (from `Frontend/`)

```bash
npm run dev              # Dev server with Turbopack (port 3000)
npm run build            # Production build
npm run lint             # ESLint
```

### Backend (from `backend/`)

```bash
uvicorn main:app --reload --host 0.0.0.0 --port 8000   # Dev server
pytest                                                   # Run all tests
pytest tests/path/to/test.py::test_function -v         # Run single test
prisma generate --schema=schema.prisma                  # Generate Prisma client
```

### Cron Jobs (from `backend/`)

```bash
python -m jobs.forecasting.runner   # 30-day price predictions
python -m jobs.scraper.runner       # News scraping (Finnhub + RSS)
python -m jobs.sentiment.runner     # FinBERT sentiment analysis
```

## Architecture

### Monorepo Structure

```
Fundthesis/
├── Frontend/           # Next.js app (App Router)
│   ├── src/app/       # Pages and API routes
│   ├── src/components/# React components (ui/, dashboard/, etc.)
│   └── src/lib/       # Utilities, hooks, types, providers
├── backend/           # FastAPI application
│   ├── app/api/       # Route modules (stocks.py, news.py, insights.py)
│   ├── app/core/      # Config, database, auth, rate limiting
│   ├── jobs/          # Scheduled jobs (forecasting, scraper, sentiment)
│   └── rag/           # RAG pipeline (embeddings, vector search, rerank)
└── Documentation/     # Project docs (RAG_PIPELINE.md, White Page)
```

### Key Patterns

**Frontend**:

- App Router with nested layouts
- Server Components by default, `'use client'` for interactivity
- TanStack React Query for server state (see Data Fetching section below)
- Path alias: `@/*` maps to `src/*`
- **UI Components**: Always use shadcn/ui components from `@/components/ui/` instead of plain HTML elements
  - Use `Input` component instead of `<input>`
  - Use `Button` component instead of `<button>`
  - Use `Card`, `Dialog`, `Select`, `Tabs`, etc. from shadcn/ui
  - Icons from `lucide-react` (e.g., `import { X, Search } from "lucide-react"`)
  - Available components: `button`, `input`, `card`, `dialog`, `select`, `tabs`, `table`, `form`, `label`, `textarea`, `checkbox`, `dropdown-menu`, `alert-dialog`, `tooltip`
- **localStorage**: Always check `typeof window !== "undefined"` before accessing localStorage to prevent SSR errors

**Backend**:

- FastAPI with dependency injection via `Depends()`
- Async/await throughout for non-blocking I/O
- Prisma ORM with multi-schema support (public, auth, vault)
- Rate limiting: 30 requests/60 seconds for guests

**Database**:

- Both frontend and backend share the same Azure PostgreSQL database
- Frontend uses `prisma-client-js`, backend uses `prisma-client-py`
- Schema changes must be synchronized between `Frontend/prisma/` and `backend/schema.prisma`

### RAG Pipeline

The RAG system uses:

1. **Embeddings**: Azure OpenAI `text-embedding-ada-002` (1536 dimensions)
2. **Vector Search**: PostgreSQL pgvector with HNSW index
3. **Reranking**: Cohere Rerank v4.0 via Azure AI Foundry
4. **Generation**: GPT-4o Mini

Index new articles: `python -m rag.index_articles`

## Environment Variables

**Frontend** (`.env.local`):

- `NEXT_PUBLIC_API_BASE_URL` - Backend URL
- `BETTER_AUTH_SECRET` - Auth secret
- `DATABASE_URL` - PostgreSQL connection string

**Backend** (`.env`):

- `DATABASE_URL` - Must match frontend, include `?sslmode=require` for Azure
- `FINNHUB_KEY` - For news scraping
- `AZURE_OPENAI_*` - For RAG pipeline
- `AZURE_RERANK_*` - For document reranking

## UI Components (shadcn/ui)

**Always use shadcn/ui components** instead of plain HTML elements for consistency and accessibility:

### Available Components

Located in `Frontend/src/components/ui/`:

- `Button` - Use instead of `<button>`, supports variants: `default`, `outline`, `ghost`, `secondary`, `destructive`, `link`
- `Input` - Use instead of `<input>`, includes proper styling and focus states
- `Card`, `CardHeader`, `CardTitle`, `CardContent` - For card layouts
- `Dialog` - For modals and dialogs
- `Select` - For dropdowns
- `Tabs`, `TabsList`, `TabsTrigger`, `TabsContent` - For tabbed interfaces
- `Table`, `TableHeader`, `TableBody`, `TableRow`, `TableCell` - For tables
- `Form`, `FormField`, `FormLabel`, `FormMessage` - For forms with validation
- `Label` - For form labels
- `Textarea` - For multi-line text input
- `Checkbox` - For checkboxes
- `DropdownMenu` - For dropdown menus
- `AlertDialog` - For confirmation dialogs
- `Tooltip` - For tooltips

### Icons

Use icons from `lucide-react`:

```tsx
import { X, Search, ChevronDown, Menu } from "lucide-react";
```

### Example Usage

```tsx
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { X } from "lucide-react";

// Good - using shadcn components
<Button variant="outline" onClick={handleClick}>Click me</Button>
<Input placeholder="Search..." value={query} onChange={handleChange} />

// Bad - using plain HTML
<button onClick={handleClick}>Click me</button>
<input placeholder="Search..." value={query} onChange={handleChange} />
```

## Data Fetching Patterns

### TanStack Query (React Query)

**Always use TanStack Query hooks** for data fetching instead of manual `useEffect` + `fetch`:

**Available Hooks** (in `Frontend/src/lib/hooks/`):

- `useArticles(params)` - Fetch articles with search, pagination, filters
- `useArticleDetail(articleId)` - Fetch single article
- `useStocks(params)` - Fetch stocks list with search, pagination
- `useStockDetail(symbol)` - Fetch stock details
- `useStockChart(symbol, days)` - Fetch stock chart data
- `useInsights(type)` - Fetch AI-generated market insights
- `useBiography()` - Fetch user biography data (XP, archetype, achievements, rank)

**Example Pattern** (from insights page):

```tsx
import { useArticles } from "@/lib/hooks/useArticles";
import { useInsights } from "@/lib/hooks/useInsights";

export default function MyPage() {
  const [searchQuery, setSearchQuery] = useState("");

  // Use hooks instead of manual useEffect
  const { data, isLoading, error } = useArticles({
    limit: 100,
    offset: 0,
    search: searchQuery || undefined,
  });

  const { data: insightsData } = useInsights("both");

  // Transform data with useMemo
  const articles = useMemo(() => {
    return data?.articles || [];
  }, [data]);

  // Use useCallback for handlers
  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query);
  }, []);
}
```

**Benefits**:

- Automatic caching and refetching
- Loading and error states handled
- Query invalidation and updates
- Optimistic updates support

### Pagination Pattern

**Client-side pagination** (for filtered/searched results):

```tsx
const ARTICLES_PER_PAGE = 20;
const [currentPage, setCurrentPage] = useState(1);

const totalPages = Math.ceil(articles.length / ARTICLES_PER_PAGE);
const startIndex = (currentPage - 1) * ARTICLES_PER_PAGE;
const paginatedArticles = articles.slice(
  startIndex,
  startIndex + ARTICLES_PER_PAGE
);

// Reset page when filters change
useEffect(() => {
  setCurrentPage(1);
}, [searchQuery]);
```

**Server-side pagination** (for large datasets):

```tsx
const { data } = useArticles({
  limit: ARTICLES_PER_PAGE,
  offset: (currentPage - 1) * ARTICLES_PER_PAGE,
});
```

### Sticky Sidebar Pattern

For sticky sidebars that follow scroll:

```tsx
<div className="lg:sticky lg:top-32 lg:self-start lg:max-h-[calc(100vh-8rem)] lg:overflow-y-auto">
  {/* Sidebar content */}
</div>
```

**Key classes**:

- `lg:sticky` - Makes element sticky on large screens
- `lg:top-32` - Offset from top (adjust for header height)
- `lg:self-start` - Aligns to start of flex container
- `lg:max-h-[calc(100vh-8rem)]` - Limits height to viewport minus offset
- `lg:overflow-y-auto` - Enables scrolling when content exceeds max-height

## Biography & User Progress System

### Database Models

**UserProgress** (`user_progress` table):

- `id` - Primary key
- `userId` - Foreign key to User (unique)
- `totalXP` - Total experience points (calculated from activities)
- `archetypeId` - Current investor archetype ID
- `achievements` - JSON array of earned achievement IDs
- `lastCalculatedAt` - Timestamp of last calculation
- `createdAt`, `updatedAt` - Timestamps

**UserModuleProgress** (`user_module_progress` table):

- `id` - Primary key
- `userId` - Foreign key to User
- `moduleNumber` - Learning module number (1-10)
- `completedAt` - Timestamp when module was completed (nullable)
- `progress` - JSON field for storing quiz answers, etc.
- Unique constraint on `(userId, moduleNumber)`

### Backend Helper Functions

Located in `backend/app/api/biography.py`:

**`calculate_user_xp(user_id: str) -> int`**

- Calculates total XP from:
  - Completed missions (based on difficulty and grade)
  - Completed learning modules (100 XP each)
  - Profitable trades (estimated from mission results)
  - Streak bonuses (3-day, 7-day, 30-day)

**`determine_user_archetype(user_id: str) -> str`**

- Analyzes trading behavior to determine archetype:
  - Average holding period (from trades)
  - Trade frequency (trades per week)
  - Volatility tolerance (from max drawdown in missions)
  - Diversification score (unique tickers in positions)
  - News reactivity (article interactions per week)
- Returns archetype ID: `value-veronica`, `risky-randy`, `saver-steve`, `trend-tina`, or `news-nina`

**`check_user_achievements(user_id: str) -> List[str]`**

- Checks achievement conditions:
  - `first-trade` - User has made at least one trade
  - `diversified` - 5+ unique tickers in positions
  - `profit-100` - $100+ in virtual profits from missions
  - `module-master` - 10+ modules completed
  - `mission-1`, `mission-5`, `mission-all` - Mission completion milestones
  - `streak-7`, `streak-30` - Learning streaks
  - `no-loss` - Mission completed with no losses
  - `grade-s` - Earned S grade on any mission
  - `mentor-chat` - 10+ coach queries submitted
- Returns list of earned achievement IDs

**`get_user_biography_data(user_id: str) -> Dict`**

- Main function that returns complete biography data:
  - `xp` - Total XP
  - `archetype` - Current archetype ID
  - `achievements` - List of earned achievement IDs
  - `rank` - Current rank object (level, title, requiredXP)
  - `nextRank` - Next rank object or null
  - `progress` - Progress percentage to next rank

### API Endpoints

**GET `/api/users/me/biography`**

- Returns user biography data including XP, archetype, achievements, and rank
- Automatically updates `UserProgress` table with calculated values
- Requires authentication

**POST `/api/users/me/modules/{module_number}/complete`**

- Marks a learning module as completed for the user
- Creates or updates `UserModuleProgress` record
- Requires authentication
- Called automatically when all questions in a module are answered

### XP Calculation Rules

XP values (matching `Frontend/src/data/ranks.ts`):

- Module completion: 100 XP
- Mission completion (by difficulty):
  - Beginner (easy): 150 XP
  - Intermediate (medium): 250 XP
  - Advanced (hard): 400 XP
  - Expert: 600 XP
- Grade bonuses:
  - S grade: +100 XP
  - A grade: +50 XP
- Profitable trades: 10 XP each (estimated from mission results)
- Streak bonuses:
  - 3-day streak: 50 XP
  - 7-day streak: 150 XP
  - 30-day streak: 500 XP

### Rank Progression

Ranks (matching `Frontend/src/data/ranks.ts`):

1. **Novice** (Level 1) - 0 XP
2. **Apprentice** (Level 2) - 500 XP
3. **Analyst** (Level 3) - 1,500 XP
4. **Strategist** (Level 4) - 3,500 XP
5. **Portfolio Manager** (Level 5) - 7,000 XP
6. **Market Master** (Level 6) - 15,000 XP

### Frontend Usage

**Biography Page** (`Frontend/src/app/biography/page.tsx`):

- Uses `useBiography()` hook to fetch data from API
- Displays XP, rank, archetype, and achievements
- No longer uses localStorage - all data comes from database

**Module Completion** (`Frontend/src/app/lessonmodules/data/userProgress.ts`):

- Automatically calls completion API when all questions are answered
- Uses `markQuestionAnswered()` which checks for completion

## API Documentation

When backend is running:

- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc
