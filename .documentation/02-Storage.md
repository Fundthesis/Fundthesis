# Storage Architecture

This document describes the storage and database architecture of FundThesis, including data models, schema design, and storage strategies.

## Table of Contents

- [Database Overview](#database-overview)
- [Schema Architecture](#schema-architecture)
- [Data Models](#data-models)
- [Storage Technologies](#storage-technologies)
- [Data Management](#data-management)

---

## Database Overview

FundThesis uses **Azure PostgreSQL** as its primary database, shared between the frontend (Next.js) and backend (FastAPI) applications.

### Key Characteristics

- **Type:** PostgreSQL (managed Azure service)
- **Connection:** Both frontend and backend connect to the same database instance
- **ORM:** Prisma (JavaScript client for frontend, Python client for backend)
- **Extensions:** pgvector (for vector similarity search in RAG)
- **Schemas:** Multiple schemas (`public`, `auth`, `vault`)

### Connection Details

- **SSL Required:** All connections use SSL/TLS encryption
- **Connection String Format:**
  ```
  postgresql://username:password@server.postgres.database.azure.com:5432/database?schema=public&sslmode=require
  ```
- **Firewall:** Azure firewall rules restrict access to authorized IPs

---

## Schema Architecture

The database uses multiple schemas to organize different types of data:

### 1. `public` Schema

Contains application data:
- User accounts (Better-Auth)
- Articles and news
- Stock forecasts
- Simulation accounts and trades
- User progress and achievements

### 2. `auth` Schema

Contains Supabase authentication data (legacy/compatibility):
- Supabase users
- Sessions
- Identity providers
- MFA factors

### 3. `vault` Schema

Reserved for future encryption/security features

---

## Data Models

### Core Models

#### User Model
```prisma
model User {
  id                 String              @id @default(cuid())
  name               String?
  email              String              @unique
  emailVerified      Boolean?
  image              String?
  createdAt          DateTime            @default(now())
  updatedAt          DateTime            @updatedAt
  sessions           Session[]
  accounts           Account[]
  userAccounts       UserAccount[]
  simulationAccounts SimulationAccount[]
}
```

**Purpose:** Core user identity and authentication

#### Article Model
```prisma
model Article {
  id           String                       @id @default(uuid())
  url          String                       @unique
  headline     String?
  summary      String?
  fullText     String?                      @map("full_text")
  publishedAt  DateTime?                    @map("published_at")
  source       String?
  label        String?                      // Sentiment label
  category     String?
  tickers      String?                      // Associated stock symbols
  embedding    Unsupported("vector(1536)")?  // pgvector for RAG
  // ... additional fields
}
```

**Purpose:** Stores news articles with sentiment analysis and embeddings for RAG

**Key Features:**
- Unique URL constraint prevents duplicates
- Full-text search support (PostgreSQL `tsvector`)
- Vector embeddings for semantic search (1536 dimensions)
- Sentiment labels (positive, negative, neutral)

#### StockForecast Model
```prisma
model StockForecast {
  id              String   @id @default(uuid())
  symbol          String
  forecastDate    DateTime @map("forecast_date")
  predictedPrice  Decimal  @map("predicted_price")
  confidence      Decimal?
  modelVersion    String?  @map("model_version")
  createdAt       DateTime @default(now()) @map("created_at")
  // ... additional fields
}
```

**Purpose:** Stores machine learning-generated stock price forecasts

**Key Features:**
- One forecast per symbol per date
- Confidence scores for predictions
- Model version tracking
- Historical forecast storage

#### SimulationAccount Model
```prisma
model SimulationAccount {
  id          String   @id @default(uuid())
  userId      String   @map("user_id")
  name        String?
  balance     Decimal  @default(0)
  createdAt   DateTime @default(now()) @map("created_at")
  positions   Position[]
  trades      Trade[]
  // ... additional fields
}
```

**Purpose:** Paper trading simulation accounts

**Key Features:**
- Multiple accounts per user
- Tracks virtual balance
- Links to positions and trades

#### Position Model
```prisma
model Position {
  id          String   @id @default(uuid())
  accountId   String   @map("account_id")
  symbol      String
  quantity    Decimal
  avgPrice    Decimal  @map("avg_price")
  // ... additional fields
}
```

**Purpose:** Tracks holdings in simulation accounts

#### Trade Model
```prisma
model Trade {
  id          String   @id @default(uuid())
  accountId   String   @map("account_id")
  symbol      String
  action      String   // 'buy' or 'sell'
  quantity    Decimal
  price       Decimal
  timestamp   DateTime
  // ... additional fields
}
```

**Purpose:** Historical trade records for analysis and debriefs

---

## Storage Technologies

### PostgreSQL

**Primary Use Cases:**
- Relational data (users, articles, forecasts, trades)
- Full-text search (article content)
- Transactional integrity
- ACID compliance

**Advantages:**
- Mature and reliable
- Excellent for structured data
- Strong consistency guarantees
- Rich feature set (JSON, arrays, full-text search)

### pgvector Extension

**Purpose:** Vector similarity search for RAG (Retrieval-Augmented Generation)

**Use Cases:**
- Store article embeddings (1536-dimensional vectors)
- Semantic search for similar articles
- Find relevant context for AI queries

**Implementation:**
```sql
-- Example: Article embeddings stored as vector(1536)
embedding vector(1536)
```

**Status:** Extension installed, embeddings stored, but RAG search not fully implemented yet

### Full-Text Search

**Purpose:** Fast text search across article content

**Implementation:**
- PostgreSQL `tsvector` type
- Automatic generation via database triggers
- Indexed for performance

**Use Cases:**
- Search articles by keywords
- Find articles mentioning specific stocks
- Filter articles by content

---

## Data Management

### Schema Synchronization

Both frontend and backend use Prisma, but with different clients:
- **Frontend:** `prisma-client-js` (TypeScript/JavaScript)
- **Backend:** `prisma-client-py` (Python)

**Synchronization Strategy:**
- Schema files maintained separately but kept in sync
- Frontend: `Frontend/prisma/schema.prisma`
- Backend: `backend/schema.prisma`
- Manual coordination required for schema changes

### Migrations

**Current Approach:**
- Prisma migrations managed separately per client
- Frontend migrations: `npx prisma migrate`
- Backend migrations: `prisma migrate` (Python)

**Best Practices:**
- Coordinate schema changes between frontend and backend
- Test migrations in development first
- Backup database before production migrations

### Data Retention

**Articles:**
- Stored indefinitely
- No automatic deletion
- Can be archived if needed

**Forecasts:**
- Stored for historical analysis
- Old forecasts retained for model evaluation

**Trades:**
- Permanent record for user learning
- Used for trading debriefs and analysis

### Backup Strategy

**Azure Managed Backups:**
- Automated daily backups
- Point-in-time restore available
- Retention period configurable

**Manual Backups:**
- Can be performed via Azure Portal
- Export/import via Prisma or pg_dump

---

## Data Access Patterns

### Frontend Access

**Pattern:** Next.js API routes → Prisma Client → PostgreSQL

**Example:**
```typescript
// Frontend API route
import { prisma } from '@/lib/prisma'

export async function GET() {
  const articles = await prisma.article.findMany({
    take: 10,
    orderBy: { publishedAt: 'desc' }
  })
  return Response.json(articles)
}
```

### Backend Access

**Pattern:** FastAPI endpoint → Prisma Client (Python) → PostgreSQL

**Example:**
```python
# Backend API endpoint
from app.core.database import db

async def get_articles():
    articles = await db.article.find_many(
        take=10,
        order_by={'published_at': 'desc'}
    )
    return articles
```

### Scheduled Jobs Access

**Pattern:** Python script → Prisma Client → PostgreSQL

**Example:**
```python
# Scraper job
from app.core.database import db

async def store_article(article_data):
    await db.article.create(data=article_data)
```

---

## Performance Considerations

### Indexing

**Current Indexes:**
- Primary keys (automatic)
- Unique constraints (email, URL)
- Foreign keys

**Recommended Indexes:**
- `articles.published_at` (for time-based queries)
- `articles.tickers` (for stock-specific queries)
- `stock_forecasts.symbol` (for forecast lookups)
- `trades.account_id` (for user trade history)

### Query Optimization

- Use Prisma's `select` to limit fields
- Implement pagination for large result sets
- Use `include` carefully to avoid N+1 queries
- Consider database views for complex queries

### Caching Strategy

**Current:** No caching layer

**Future Considerations:**
- Redis for frequently accessed data
- Cache article summaries
- Cache stock forecasts
- Cache user session data

---

## Data Privacy & Security

### Encryption

- **In Transit:** SSL/TLS for all connections
- **At Rest:** Azure managed encryption
- **Sensitive Fields:** Passwords hashed (Better-Auth)

### Access Control

- **Database Level:** Azure firewall rules
- **Application Level:** Authentication required for user data
- **Row Level:** User data filtered by user ID

### Compliance

- **GDPR:** User data can be exported/deleted
- **Data Retention:** Configurable retention policies
- **Audit Logs:** Track data access (future enhancement)

---

## Future Storage Considerations

### Vector Database

**Current:** pgvector extension in PostgreSQL

**Future Options:**
- Dedicated vector database (Pinecone, Weaviate)
- Better performance for large-scale semantic search
- Specialized vector operations

### Time-Series Data

**Consideration:** Stock price history and forecasts

**Options:**
- TimescaleDB (PostgreSQL extension)
- Dedicated time-series database
- Current PostgreSQL sufficient for now

### Object Storage

**Future Needs:**
- User profile images
- Generated reports
- Export files

**Options:**
- Azure Blob Storage
- CDN integration

---

## Conclusion

FundThesis uses a single, shared PostgreSQL database with a well-structured schema. The use of Prisma provides type safety and consistency across frontend and backend. The addition of pgvector enables future RAG capabilities, though full implementation is still in progress.

The architecture supports current needs while providing flexibility for future enhancements like dedicated vector databases, caching layers, and object storage.
