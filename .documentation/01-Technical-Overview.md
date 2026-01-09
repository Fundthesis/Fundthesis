# Technical Overview

This document provides a high-level technical overview of the FundThesis platform architecture, technology stack, and system design.

## Table of Contents

- [Architecture Overview](#architecture-overview)
- [Technology Stack](#technology-stack)
- [System Components](#system-components)
- [Data Flow](#data-flow)
- [Deployment Architecture](#deployment-architecture)

---

## Architecture Overview

FundThesis follows a modern, cloud-native architecture with clear separation between frontend and backend services:

```
┌─────────────────┐         ┌─────────────────┐
│   Frontend      │─────────▶│    Backend      │
│   (Next.js)     │  HTTP   │   (FastAPI)     │
│   Port 3000     │◀────────│   Port 8000     │
└─────────────────┘         └─────────────────┘
         │                           │
         │                           │
         ▼                           ▼
┌─────────────────┐         ┌─────────────────┐
│  Azure Static   │         │  Azure Web App  │
│  Web Apps       │         │  Service        │
└─────────────────┘         └─────────────────┘
                                      │
                                      ▼
                            ┌─────────────────┐
                            │ Azure PostgreSQL │
                            │   (Shared DB)    │
                            └─────────────────┘
```

### Key Architectural Principles

1. **Separation of Concerns:** Frontend handles UI/UX, backend handles business logic and data processing
2. **Shared Database:** Both frontend and backend connect to the same PostgreSQL database
3. **API-First Design:** Backend exposes RESTful APIs consumed by frontend
4. **Stateless Services:** Both services are stateless, enabling horizontal scaling
5. **Cloud-Native:** Built for Azure cloud infrastructure

---

## Technology Stack

### Frontend

- **Framework:** Next.js 15.5.3 (React 19.1.0)
- **Language:** TypeScript
- **Styling:** Tailwind CSS v4
- **UI Components:** shadcn/ui, Radix UI
- **State Management:** React Query (TanStack Query)
- **Authentication:** Better-Auth
- **Database ORM:** Prisma (JavaScript client)
- **Deployment:** Azure Static Web Apps

### Backend

- **Framework:** FastAPI (Python)
- **Language:** Python 3.11/3.12
- **Database ORM:** Prisma (Python client)
- **Machine Learning:**
  - XGBoost (forecasting)
  - Transformers/Hugging Face (FinBERT for sentiment)
  - Sentence-Transformers (embeddings)
- **NLP Libraries:**
  - LangChain (RAG implementation)
  - ChromaDB (vector database)
- **Data Processing:**
  - Pandas, NumPy
  - yfinance (stock data)
- **Deployment:** Azure App Service

### Database

- **Primary Database:** Azure PostgreSQL
- **Vector Storage:** pgvector extension (for RAG embeddings)
- **Schema Management:** Prisma (shared between frontend and backend)

### External Services

- **Stock Data:** yFinance, Alpha Vantage, Twelve Data
- **News:** Finnhub API, RSS feeds (BusinessWire, PR Newswire)
- **Authentication:** Better-Auth (self-hosted)
- **AI/LLM:** Azure OpenAI (for RAG and insights)

---

## System Components

### Frontend Components

#### 1. **Next.js Application**
- Server-side rendering (SSR) and static site generation (SSG)
- API routes for server-side logic
- Client-side React components
- File-based routing

#### 2. **Authentication System**
- Better-Auth integration
- Email/password authentication
- Google OAuth support
- Session management

#### 3. **Data Fetching**
- React Query for server state management
- Custom hooks for API calls
- Caching and refetching strategies

#### 4. **UI Components**
- Reusable component library
- Dark mode support
- Responsive design
- Newspaper-inspired layout

#### 5. **Mission System**
- Interactive market simulations (2008 crash, COVID, inflation, etc.)
- Difficulty-based learning (Easy/Medium/Hard)
- Real-time portfolio tracking
- Behavioral analysis and grading
- See [08-Mission-System.md](./08-Mission-System.md) for details

### Backend Components

#### 1. **FastAPI Application**
- RESTful API endpoints
- Request/response validation
- CORS middleware
- Rate limiting

#### 2. **API Routes**
- `/api/stocks` - Stock data and forecasts
- `/api/news` - News articles
- `/api/insights` - AI insights
- `/api/sentiment` - Sentiment analysis
- `/api/coach` - AI coaching/education
- `/api/mission/results` - Mission completion results (save/retrieve)

#### 3. **Scheduled Jobs**
- **Forecasting Job:** Daily stock price predictions
- **Scraper Job:** News article collection (every 4 hours)
- **Sentiment Job:** Article sentiment analysis (every 4 hours)

#### 4. **Machine Learning Services**
- XGBoost forecasting models
- FinBERT sentiment classifier
- RAG pipeline (in development)

---

## Data Flow

### User Request Flow

1. **User Action:** User interacts with frontend (e.g., views dashboard)
2. **Frontend Request:** React Query hook makes API call to Next.js API route
3. **API Route:** Next.js API route forwards request to backend FastAPI service
4. **Backend Processing:** FastAPI processes request, queries database
5. **Database Query:** Prisma ORM executes query on PostgreSQL
6. **Response:** Data flows back through the chain to frontend
7. **UI Update:** React components re-render with new data

### Data Collection Flow

1. **Scheduled Job Trigger:** GitHub Actions triggers scheduled job
2. **Job Execution:** Python script runs (scraper, sentiment, forecasting)
3. **External API Calls:** Job fetches data from external sources (Finnhub, yFinance)
4. **Data Processing:** Raw data is cleaned, transformed, analyzed
5. **Database Storage:** Processed data is stored in PostgreSQL
6. **Frontend Access:** Frontend queries database for latest data

### Real-Time Updates

- Frontend uses React Query's refetch intervals for near-real-time updates
- Stock ticker updates every 60 seconds
- News articles refresh on page navigation
- Forecasts update daily via scheduled job

---

## Deployment Architecture

### Frontend Deployment

- **Platform:** Azure Static Web Apps
- **Build:** Next.js production build
- **CI/CD:** GitHub Actions on push to `main`
- **Environment:** Production secrets injected via GitHub Secrets

### Backend Deployment

- **Platform:** Azure App Service (Python)
- **Build:** Oryx build engine (automatic)
- **CI/CD:** GitHub Actions on push to `main`
- **Scaling:** Manual scaling (can be configured for auto-scaling)

### Database

- **Platform:** Azure Database for PostgreSQL
- **Connection:** Both frontend and backend connect to same instance
- **Backup:** Automated backups (Azure managed)
- **Extensions:** pgvector for vector similarity search

### Scheduled Jobs

- **Platform:** GitHub Actions
- **Execution:** Runs on GitHub-hosted runners (Ubuntu)
- **Scheduling:** Cron-based schedules
- **Monitoring:** GitHub Actions logs and notifications

---

## Security Considerations

### Authentication & Authorization

- Better-Auth handles user authentication
- Session-based authentication with secure tokens
- OAuth integration for Google sign-in
- Password hashing and verification

### API Security

- Rate limiting on all endpoints
- CORS configuration restricts origins
- Environment variables for sensitive data
- No secrets committed to repository

### Database Security

- SSL/TLS connections required
- Azure firewall rules restrict access
- Connection strings stored as secrets
- Prisma ORM prevents SQL injection

### Data Privacy

- User data stored securely in PostgreSQL
- No sensitive financial data stored (paper trading only)
- GDPR-compliant data handling
- User consent for data collection

---

## Scalability

### Current Architecture

- **Frontend:** Static hosting, scales automatically
- **Backend:** Single instance, can scale horizontally
- **Database:** Single PostgreSQL instance with read replicas option

### Future Scaling Options

- **Frontend:** Already scalable (static hosting)
- **Backend:** Azure App Service auto-scaling rules
- **Database:** Read replicas for query distribution
- **Caching:** Redis for frequently accessed data
- **CDN:** Azure CDN for static assets

---

## Monitoring & Logging

### Current Monitoring

- **GitHub Actions:** Workflow execution logs
- **Azure Portal:** Application insights and metrics
- **Application Logs:** Console logging in both services

### Future Enhancements

- Application Performance Monitoring (APM)
- Error tracking (e.g., Sentry)
- User analytics
- Performance metrics dashboard

---

## Development Workflow

1. **Local Development:** Developers run frontend and backend locally
2. **Feature Branches:** Work done in feature branches
3. **Pull Requests:** Code review before merging to `dev`
4. **Testing:** Automated tests run on PRs
5. **Deployment:** Merge to `main` triggers production deployment
6. **Scheduled Jobs:** Run automatically via GitHub Actions

---

## Technology Decisions

### Why Next.js?

- Server-side rendering for better SEO
- API routes for backend logic
- Excellent developer experience
- Strong TypeScript support
- Active community and ecosystem

### Why FastAPI?

- High performance (async/await)
- Automatic API documentation
- Type validation with Pydantic
- Easy to learn and maintain
- Great for Python ML ecosystem

### Why Prisma?

- Type-safe database access
- Works with both JavaScript and Python
- Excellent migration system
- Shared schema between frontend/backend
- Strong developer experience

### Why Azure?

- Integrated services (Static Web Apps, App Service, PostgreSQL)
- Easy deployment via GitHub Actions
- Scalable infrastructure
- Good documentation and support
- Cost-effective for startups

---

## Future Architecture Considerations

- **Microservices:** Split backend into specialized services if needed
- **Message Queue:** For async job processing
- **Caching Layer:** Redis for frequently accessed data
- **Search:** Elasticsearch for advanced article search
- **Real-Time:** WebSocket support for live updates
- **Mobile App:** React Native or native apps

---

## Conclusion

FundThesis is built on modern, scalable technologies with a clear separation of concerns. The architecture supports current needs while providing flexibility for future growth. The use of cloud-native services ensures reliability and scalability as the platform grows.
