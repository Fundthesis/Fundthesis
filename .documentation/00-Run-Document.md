# Run Document

This document explains how to run FundThesis locally and provides an overview of the GitHub Actions workflows configured for automated deployment and scheduled jobs.

## Table of Contents

- [Local Development Setup](#local-development-setup)
- [Frontend Setup](#frontend-setup)
- [Backend Setup](#backend-setup)
- [GitHub Actions Workflows](#github-actions-workflows)
- [Environment Variables](#environment-variables)

---

## Local Development Setup

### Prerequisites

- **Node.js** 20.19.1 (LTS recommended)
- **Python** 3.11 or 3.12
- **PostgreSQL** (Azure PostgreSQL in production, local PostgreSQL for development)
- **Prisma CLI** (installed via npm)

### Quick Start

1. Clone the repository
2. Set up environment variables (see [Environment Variables](#environment-variables))
3. Run frontend and backend in separate terminals

---

## Frontend Setup

### Installation

```bash
cd Frontend
npm install
```

### Generate Prisma Client

```bash
npx prisma generate
```

### Run Development Server

```bash
npm run dev
```

The frontend will be available at `http://localhost:3000`

### Build for Production

```bash
npm run build
npm start
```

### Available Scripts

- `npm run dev` - Start development server with Turbopack
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run clean` - Clean `.next` directory

---

## Backend Setup

### Installation

```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
```

### Generate Prisma Client

```bash
prisma generate --schema=schema.prisma
```

### Run Development Server

```bash
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

The API will be available at:
- API: `http://localhost:8000`
- Swagger Docs: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`

### Run Scheduled Jobs Manually

**Forecasting Job:**
```bash
python -m jobs.forecasting.runner
```

**News Scraper Job:**
```bash
python -m jobs.scraper.runner
```

**Sentiment Analysis Job:**
```bash
python -m jobs.sentiment.runner
```

**RAG Article Indexing (generate embeddings for articles):**
```bash
python -m rag.index_articles
```

**RAG Module Indexing (index learning modules for RAG):**
```bash
python -m rag.index_modules
```

---

## GitHub Actions Workflows

FundThesis uses GitHub Actions for CI/CD and scheduled jobs. All workflows are located in `.github/workflows/`.

### 1. Frontend Deployment (`azure-static-web-apps-wonderful-grass-0bee73f0f.yml`)

**Trigger:**
- Push to `main` branch
- Pull requests to `main`, `dev`, or `feature/**` branches

**What it does:**
- Builds the Next.js frontend application
- Deploys to Azure Static Web Apps
- Uses Node.js 20.19.1
- Runs on Ubuntu latest

**Secrets Required:**
- `DATABASE_URL`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `BETTER_AUTH_SECRET`
- `BETTER_AUTH_URL`
- `NEXT_PUBLIC_APP_URL`
- `NEXT_PUBLIC_API_BASE_URL`
- `AZURE_STATIC_WEB_APPS_API_TOKEN_WONDERFUL_GRASS_0BEE73F0F`

### 2. Backend Deployment (`main_fundthesis-python-backend.yml`)

**Trigger:**
- Push to `main` branch
- Manual workflow dispatch

**What it does:**
- Sets up Python 3.12
- Installs dependencies from `requirements.txt`
- Builds the Python application
- Deploys to Azure Web App Service
- Uses Oryx build engine for deployment

**Secrets Required:**
- `AZUREAPPSERVICE_CLIENTID_26C2851733554A3B84B8367E8146CF8C`
- `AZUREAPPSERVICE_TENANTID_905D00ACBAA14A78855EA372B426C2CE`
- `AZUREAPPSERVICE_SUBSCRIPTIONID_6A9B0945746C42C982816254A6CF2BC5`

### 3. Forecasting Job (`forecasting-job.yml`)

**Trigger:**
- Scheduled: Daily at 6:00 AM UTC (after market close)
- Manual workflow dispatch

**What it does:**
- Generates 30-day stock price forecasts for all tracked stocks
- Uses XGBoost machine learning model
- Stores forecasts in PostgreSQL database
- Runs on Python 3.11

**Schedule:** `0 6 * * *` (Cron format)

**Secrets Required:**
- `DATABASE_URL`

### 4. News Scraper Job (`scraper-job.yml`)

**Trigger:**
- Scheduled: Every 4 hours
- Manual workflow dispatch

**What it does:**
- Scrapes financial news from Finnhub API
- Scrapes RSS feeds (BusinessWire, PR Newswire)
- Extracts article text and metadata
- Stores articles in PostgreSQL database

**Schedule:** `0 */4 * * *` (Every 4 hours)

**Secrets Required:**
- `DATABASE_URL`
- `FINNHUB_KEY`

### 5. Sentiment Analysis Job (`sentiment-job.yml`)

**Trigger:**
- Scheduled: Every 4 hours at :30 minutes (offset from scraper)
- Manual workflow dispatch

**What it does:**
- Analyzes articles missing sentiment labels
- Uses FinBERT transformer model
- Classifies sentiment (positive, negative, neutral)
- Updates article records in database

**Schedule:** `30 */4 * * *` (Every 4 hours at :30)

**Secrets Required:**
- `DATABASE_URL`

### 6. Backend Tests (`backend-tests.yml`)

**Trigger:**
- Push to `main` or `dev` branches
- Pull requests

**What it does:**
- Runs pytest test suite
- Validates backend functionality
- Ensures code quality before deployment

---

## Environment Variables

### Frontend (`.env.local`)

```env
# Database
DATABASE_URL="postgresql://username:password@host:5432/database?sslmode=require"

# Authentication
BETTER_AUTH_SECRET="your-secret-key"
BETTER_AUTH_URL="http://localhost:3000"
NEXT_PUBLIC_APP_URL="http://localhost:3000"

# Supabase (if using)
NEXT_PUBLIC_SUPABASE_URL="https://your-project.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="your-anon-key"

# API
NEXT_PUBLIC_API_BASE_URL="http://localhost:8000"
```

### Backend (`.env`)

```env
# Database (shared with frontend)
DATABASE_URL="postgresql://username:password@host:5432/database?sslmode=require"

# External APIs
FINNHUB_KEY="your-finnhub-api-key"

# Application
FRONTEND_URL="http://localhost:3000"
ENV="development"
DEBUG="true"

# Azure OpenAI (for LLM generation)
AZURE_OPENAI_ENDPOINT="https://your-resource.openai.azure.com/openai/deployments/your-deployment/chat/completions?api-version=2024-12-01-preview"
AZURE_OPENAI_API_KEY="your-api-key"
AZURE_OPENAI_DEPLOYMENT_NAME="PrimaryParser"
AZURE_OPENAI_API_VERSION="2024-12-01-preview"

# Azure AI Foundry - Embeddings (Cohere Embed)
AZURE_EMBED_ENDPOINT="https://your-resource.services.ai.azure.com/openai/v1"
AZURE_EMBED_KEY="your-embed-api-key"
AZURE_EMBED_MODEL_NAME="RagEmbed"

# Azure AI Foundry - Rerank (Cohere Rerank)
AZURE_RERANK_ENDPOINT="https://your-resource.services.ai.azure.com/models/rerank-v3.5"
AZURE_RERANK_KEY="your-rerank-api-key"
AZURE_RERANK_MODEL_NAME="RagRank"
```

### Production Secrets

All production secrets are stored in GitHub Secrets and automatically injected into workflows. Never commit secrets to the repository.

---

## Troubleshooting

### Frontend Issues

- **Build fails:** Ensure Node.js version matches (20.19.1)
- **Prisma errors:** Run `npx prisma generate` after schema changes
- **Port already in use:** Change port with `npm run dev -- -p 3001`

### Backend Issues

- **Database connection:** Verify `DATABASE_URL` format and Azure firewall rules
- **Import errors:** Ensure virtual environment is activated and dependencies installed
- **Prisma client:** Run `prisma generate --schema=schema.prisma` after schema changes

### GitHub Actions Issues

- **Workflow fails:** Check secrets are properly configured in repository settings
- **Deployment fails:** Verify Azure credentials and permissions
- **Scheduled jobs not running:** Check cron syntax and GitHub Actions billing status

---

## Development Workflow

1. Create a feature branch from `dev`
2. Make changes locally
3. Test frontend and backend
4. Commit and push to feature branch
5. Create pull request to `dev`
6. After review, merge to `dev`
7. Deploy to production by merging `dev` to `main`

---

## Additional Resources

- [Frontend README](../Frontend/README.md)
- [Backend README](../backend/README.md)
- [Prisma Documentation](https://www.prisma.io/docs)
- [Next.js Documentation](https://nextjs.org/docs)
- [FastAPI Documentation](https://fastapi.tiangolo.com/)
