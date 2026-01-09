# FundThesis Backend

FastAPI-based backend for the FundThesis financial analysis platform. Provides REST APIs for stock data, news articles, and AI-powered insights, along with scheduled cron jobs for forecasting, news scraping, and sentiment analysis.

## 📁 Project Structure

```
backend/
├── app/                    # FastAPI application
│   ├── api/               # API route modules
│   │   ├── routes.py      # General routes (home, dashboard)
│   │   ├── news.py       # News article endpoints
│   │   ├── stocks.py     # Stock data and forecast endpoints
│   │   └── insights.py   # AI-powered market insights
│   └── core/             # Core application components
│       ├── config.py     # Configuration and settings
│       └── database.py   # Prisma database client
├── jobs/                  # Cron job modules
│   ├── forecasting/      # Stock price forecasting job
│   │   ├── runner.py     # Job entry point
│   │   └── xgboost_model.py  # XGBoost forecasting model
│   ├── scraper/          # News scraping job
│   │   ├── runner.py     # Job entry point
│   │   ├── finnhub.py    # Finnhub news scraper
│   │   ├── rss_feeds.py  # RSS feed scraper
│   │   ├── extractors.py # Text extraction utilities
│   │   └── article_inserter.py  # Database insertion logic
│   └── sentiment/        # Sentiment analysis job
│       ├── runner.py     # Job entry point
│       └── finbert.py    # FinBERT sentiment classifier
├── lib/                   # Shared utilities
│   ├── tickers.py        # Ticker constants and extraction
│   ├── stock_data.py     # yfinance wrappers
│   └── stock_symbols.json  # Tracked stock symbols
├── rag/                   # RAG (Retrieval Augmented Generation) module
│   ├── rag_pipeline.py   # Main RAG orchestrator
│   ├── rag.py           # Base RAG implementation
│   ├── education_rag.py # Education-focused RAG with Socratic method
│   ├── embeddings.py    # Azure OpenAI embedding service
│   ├── vector_search.py # pgvector search operations
│   ├── rerank.py        # Cohere Rerank integration
│   ├── llm.py           # Azure OpenAI LLM client
│   ├── chunking.py      # Document chunking utilities
│   ├── text_cleaning.py # Text preprocessing
│   ├── query_translation.py # Query augmentation
│   ├── learning_modules.py  # TypeScript content extraction
│   ├── index_articles.py    # Article embedding script
│   └── index_modules.py     # Module embedding script
├── services/              # Business logic services
│   ├── user_context_service.py  # User interaction tracking
│   └── schema_manager.py        # LLM-driven schema management
├── main.py               # FastAPI application entry point
└── schema.prisma        # Prisma database schema
```

## 🚀 Setup

### Prerequisites

- Python 3.9+
- Azure PostgreSQL database (shared with frontend)
- Prisma CLI

### Installation

1. **Clone the repository and navigate to backend:**

   ```bash
   cd backend
   ```

2. **Create a virtual environment:**

   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. **Install dependencies:**

   ```bash
   pip install -r requirements.txt
   ```

4. **Set up Prisma:**

   ```bash
   prisma generate --schema=schema.prisma
   ```

   This generates the Python Prisma client compatible with the Azure PostgreSQL database.

5. **Set up environment variables:**
   Create a `.env` file in the backend directory:

   ```env
   DATABASE_URL="postgresql://username:password@your-azure-server.postgres.database.azure.com:5432/database?schema=public&sslmode=require"
   FINNHUB_KEY="your_finnhub_api_key"
   FRONTEND_URL="http://localhost:3000"
   ENV="development"
   DEBUG="true"
   ```

   **Important:** The `DATABASE_URL` must point to the same Azure PostgreSQL database used by the frontend. Both applications share the same database instance.

   **Obtaining DATABASE_URL from Azure:**

   - Navigate to your Azure Portal → Azure Database for PostgreSQL
   - Go to "Connection strings" or "Settings" → "Connection strings"
   - Copy the PostgreSQL connection string
   - Format: `postgresql://{username}@{server}:{password}@{server}.postgres.database.azure.com:5432/{database}?sslmode=require`
   - Replace `{password}` with your actual password

6. **Database Schema:**
   The database schema is managed by Prisma and shared between frontend and backend. The backend uses `prisma-client-py` while the frontend uses `prisma-client-js`, but both connect to the same database.

   **Note:** Schema changes should be coordinated between frontend and backend. The `schema.prisma` file in the backend mirrors the frontend schema structure.

## 🔧 Environment Variables

| Variable       | Description                                               | Required                            |
| -------------- | --------------------------------------------------------- | ----------------------------------- |
| `DATABASE_URL` | Azure PostgreSQL connection string (shared with frontend) | Yes                                 |
| `FINNHUB_KEY`  | Finnhub API key for news scraping                         | Yes                                 |
| `FRONTEND_URL` | Frontend application URL for CORS                         | No (default: http://localhost:3000) |
| `ENV`          | Environment (development/production)                      | No (default: development)           |
| `DEBUG`        | Enable debug mode                                         | No (default: false)                 |

**DATABASE_URL Format for Azure PostgreSQL:**

```
postgresql://{username}:{password}@{server}.postgres.database.azure.com:5432/{database}?schema=public&sslmode=require
```

## 🏃 Running the API

### Development Mode

```bash
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

The API will be available at `http://localhost:8000`

### API Documentation

Once running, visit:

- Swagger UI: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`

## 📡 API Endpoints

### General Routes

- `GET /` - Welcome message
- `GET /home` - Health check
- `GET /dashboard` - Dashboard info
- `GET /roulette` - Demo route

### Stock API (`/api/stocks`)

- `GET /api/stocks` - Get paginated list of stocks
  - Query params: `limit` (default: 20), `offset` (default: 0)
- `GET /api/stock/{symbol}` - Get detailed stock information with forecast
  - Query params: `days` (default: 30) - Historical data timeframe
- `GET /api/health` - API health check

### News API (`/api/news`)

- `GET /api/news/recent` - Get recent news articles (last 24 hours)
- `GET /api/news/{article_id}` - Get article details by ID
- `GET /api/news/ticker/{ticker}` - Get articles for a specific ticker
  - Query params: `hours` (default: 24), `limit` (default: 50)

### Insights API (`/api/insights`)

- `GET /api/insights/market-summary` - Generate AI market summary
- `GET /api/insights/ai-recommendations` - Generate AI investment recommendations
- `GET /api/insights/both` - Get both summary and recommendations

### AI Coach API (`/api/coach`)

- `POST /api/coach` - Query the AI Coach with RAG-enhanced responses
  - Request body: `{ message, context?, conversation_history?, userId? }`
  - Returns: `{ message, citations, sources, suggested_actions? }`

### Education API (`/api/education`)

- `POST /api/education/explain` - Explain a concept using Socratic method
  - Request body: `{ concept, module_context?, use_analogy? }`
- `POST /api/education/socratic` - Get Socratic guidance for a question
  - Request body: `{ question, student_context? }`
- `POST /api/education/adaptive-learning` - Get personalized learning recommendations
  - Request body: `{ user_performance, current_behavior? }`
- `POST /api/education/mentor` - Full AI mentor chat interface

### User Tracking API (`/api/tracking`)

- `POST /api/tracking/interaction` - Track user content interaction
  - Request body: `{ userId, contentType, contentId?, metadata? }`
- `GET /api/tracking/health` - Tracking service health check

## ⏰ Cron Jobs

The backend includes three scheduled jobs that should be run via GitHub Actions or a cron scheduler:

### 1. Forecasting Job

Generates 30-day price forecasts for all tracked stocks using XGBoost.

**Run manually:**

```bash
python -m jobs.forecasting.runner
```

**Schedule:** Daily at 6 AM UTC (after market close)

### 2. News Scraper Job

Scrapes financial news from Finnhub and RSS feeds (BusinessWire, PR Newswire).

**Run manually:**

```bash
python -m jobs.scraper.runner
```

**Schedule:** Every 4 hours

### 3. Sentiment Analysis Job

Analyzes articles missing sentiment labels using FinBERT.

**Run manually:**

```bash
python -m jobs.sentiment.runner
```

**Schedule:** Every 4 hours (after scraper job)

## 🔍 RAG Indexing

The RAG (Retrieval-Augmented Generation) system requires indexing articles and learning modules:

### Index Articles

Generate embeddings for articles without embeddings:

```bash
python -m rag.index_articles
```

### Index Learning Modules

Extract and index learning module content from TypeScript files:

```bash
python -m rag.index_modules
```

**Note:** These are manual commands. Run after adding new content or when embeddings need refreshing.

## 🧪 Testing

Run tests (when available):

```bash
pytest
```

## 📦 Dependencies

Key dependencies include:

- `fastapi` - Web framework
- `prisma` - Database ORM (Python client)
- `yfinance` - Stock data fetching
- `xgboost` - Forecasting model
- `transformers` - FinBERT sentiment model
- `beautifulsoup4`, `trafilatura`, `newspaper3k` - Web scraping
- `openai` - Azure OpenAI SDK for LLM generation
- `httpx` - Async HTTP client for Azure AI Foundry APIs

See `requirements.txt` for complete list.

## 🗄️ Database

The application uses **Azure PostgreSQL** with Prisma ORM. The backend connects to the same database instance as the frontend, sharing all data and schema.

**Database Architecture:**

- **Frontend:** Uses `prisma-client-js` (TypeScript/JavaScript)
- **Backend:** Uses `prisma-client-py` (Python)
- **Shared Database:** Azure PostgreSQL in the cloud
- **Schema:** Defined in `schema.prisma` (backend) and `Frontend/prisma/schema.prisma` (frontend)

**Important Notes:**

- Both applications must use the same `DATABASE_URL`
- Schema changes should be synchronized between frontend and backend schema files
- The backend schema uses camelCase field names (Python Prisma convention) with `@map` directives for snake_case database columns
- Database connection is managed via Prisma lifecycle events in `main.py`

**Key models:**

- `Article` - News articles with sentiment and ticker associations
- `StockForecast` - Cached forecast predictions
- `User` - User accounts and authentication
- `SimulationAccount`, `Position`, `Trade` - Paper trading simulation data

## 🔐 Security Notes

- Never commit `.env` files
- Keep API keys secure
- Use environment variables for sensitive data
- CORS is configured for frontend origins only

## 📝 Development Notes

- The backend uses async/await throughout for better performance
- Database connections are managed via Prisma lifecycle events
- Cron jobs are designed to be idempotent (safe to run multiple times)
- Stock symbols are managed in `lib/stock_symbols.json`

## 🐛 Troubleshooting

**Database connection issues:**

- Verify `DATABASE_URL` is correct and points to Azure PostgreSQL
- Ensure the connection string includes `?sslmode=require` for Azure
- Check that the database server allows connections from your IP (Azure firewall rules)
- Verify credentials are correct (username format: `username@servername`)
- Run `prisma generate --schema=schema.prisma` after schema changes
- Ensure both frontend and backend use the same database URL

**Import errors:**

- Ensure virtual environment is activated
- Run `pip install -r requirements.txt`
- Check Python path includes backend directory

**Forecast job failures:**

- Verify stock symbols are valid
- Check yfinance API availability
- Ensure sufficient historical data exists

## 📄 License

[Your License Here]

## 👥 Contributing

[Contributing guidelines here]
