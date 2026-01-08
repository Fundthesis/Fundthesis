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
│   ├── rag.py           # RAG implementation
│   ├── llm.py           # LLM integration
│   └── vector.py        # Vector database operations
├── main.py               # FastAPI application entry point
└── schema.prisma        # Prisma database schema
```

## 🚀 Setup

### Prerequisites

- Python 3.9+
- PostgreSQL database
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
   prisma generate
   ```

5. **Set up environment variables:**
   Create a `.env` file in the backend directory:
   ```env
   DATABASE_URL="postgresql://user:password@localhost:5432/fundthesis"
   FINNHUB_KEY="your_finnhub_api_key"
   FRONTEND_URL="http://localhost:3000"
   ENV="development"
   DEBUG="true"
   ```

6. **Run database migrations:**
   ```bash
   prisma migrate dev
   ```

## 🔧 Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `DATABASE_URL` | PostgreSQL connection string | Yes |
| `FINNHUB_KEY` | Finnhub API key for news scraping | Yes |
| `FRONTEND_URL` | Frontend application URL for CORS | No (default: http://localhost:3000) |
| `ENV` | Environment (development/production) | No (default: development) |
| `DEBUG` | Enable debug mode | No (default: false) |

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

## 🧪 Testing

Run tests (when available):
```bash
pytest
```

## 📦 Dependencies

Key dependencies include:
- `fastapi` - Web framework
- `prisma` - Database ORM
- `yfinance` - Stock data fetching
- `xgboost` - Forecasting model
- `transformers` - FinBERT sentiment model
- `beautifulsoup4`, `trafilatura`, `newspaper3k` - Web scraping
- `langchain-ollama` - RAG implementation

See `requirements.txt` for complete list.

## 🗄️ Database

The application uses PostgreSQL with Prisma ORM. The schema is defined in `schema.prisma`.

Key models:
- `Article` - News articles with sentiment and ticker associations
- `StockForecast` - Cached forecast predictions
- `User` - User accounts and authentication

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
- Verify `DATABASE_URL` is correct
- Ensure PostgreSQL is running
- Run `prisma generate` after schema changes

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

