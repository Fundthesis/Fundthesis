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
- TanStack React Query for server state
- Path alias: `@/*` maps to `src/*`

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

## API Documentation

When backend is running:
- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc
