# RAG Pipeline Documentation

## Overview

The FundThesis RAG (Retrieval-Augmented Generation) system is a comprehensive AI-powered knowledge retrieval and generation pipeline that combines vector search, semantic reranking, and Azure OpenAI to provide accurate, contextually-grounded responses to financial education queries.

This document provides a complete technical overview of the RAG pipeline, including all technologies used, architecture, data flow, and implementation details.

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Technologies Used](#technologies-used)
3. [Pipeline Flow](#pipeline-flow)
4. [Component Details](#component-details)
5. [API Endpoints](#api-endpoints)
6. [Configuration](#configuration)
7. [Data Flow Diagram](#data-flow-diagram)

---

## Architecture Overview

The RAG pipeline follows a **hybrid retrieval approach** combining:

1. **Semantic Vector Search** - Using embeddings to find semantically similar content
2. **Reranking** - Using cross-encoder models to refine relevance
3. **Context-Augmented Generation** - Using retrieved context to ground LLM responses

### Key Design Principles

- **True RAG**: Not just context-augmented generation, but actual retrieval from a vector database
- **Hybrid Search**: Combines semantic similarity with keyword matching
- **Multi-stage Refinement**: Initial retrieval → Reranking → Context formatting → Generation
- **Graceful Degradation**: Falls back to direct LLM calls if retrieval fails
- **Education-Focused**: Specialized `EducationRAG` class for Socratic method and adaptive learning

---

## Technologies Used

### Core Technologies

| Technology | Version | Purpose |
|-----------|---------|---------|
| **Python** | 3.8+ | Backend runtime |
| **FastAPI** | ≥0.104.0 | API framework |
| **Prisma** | ≥0.11.0 | Database ORM |
| **PostgreSQL** | Latest | Primary database |
| **pgvector** | Latest | Vector extension for PostgreSQL |

### Azure Services

| Service | Deployment | Purpose |
|---------|------------|---------|
| **Azure OpenAI** | GPT-4o Mini (`PrimaryParser`) | Chat completions and text generation |
| **Azure OpenAI** | `text-embedding-ada-002` | Vector embeddings (1536 dimensions) |
| **Azure AI Foundry** | Cohere Rerank v4.0 Fast (`RagRank`) | Document reranking for relevance |
| **Azure Database for PostgreSQL** | Managed PostgreSQL | Vector storage and retrieval |

### Python Libraries

| Library | Purpose |
|---------|---------|
| `openai` | Azure OpenAI SDK for embeddings and chat |
| `httpx` | Async HTTP client for rerank API calls |
| `prisma` | Database ORM with raw SQL support for vectors |
| `asyncio` | Async/await support for concurrent operations |

---

## Pipeline Flow

### Complete RAG Query Flow

```
┌─────────────────┐
│  User Query     │
│  "What is..."   │
└────────┬────────┘
         │
         ▼
┌─────────────────────────┐
│  1. Text Cleaning       │
│  - Normalize Unicode    │
│  - Lowercase            │
│  - Remove whitespace    │
└────────┬────────────────┘
         │
         ▼
┌─────────────────────────┐
│  2. Query Embedding     │
│  Azure OpenAI           │
│  text-embedding-ada-002 │
│  → 1536-dim vector      │
└────────┬────────────────┘
         │
         ▼
┌─────────────────────────┐
│  3. Vector Search       │
│  PostgreSQL + pgvector  │
│  Cosine similarity      │
│  → Top K articles       │
│  (default: 10)         │
└────────┬────────────────┘
         │
         ▼
┌─────────────────────────┐
│  4. Reranking           │
│  Cohere Rerank v4.0     │
│  Cross-encoder scoring   │
│  → Top N articles       │
│  (default: 5)           │
└────────┬────────────────┘
         │
         ▼
┌─────────────────────────┐
│  5. Context Formatting  │
│  - Article metadata      │
│  - Relevance scores      │
│  - Summaries            │
└────────┬────────────────┘
         │
         ▼
┌─────────────────────────┐
│  6. LLM Generation      │
│  GPT-4o Mini            │
│  System + User prompts   │
│  → Final response       │
└────────┬────────────────┘
         │
         ▼
┌─────────────────┐
│  Response       │
│  to User        │
└─────────────────┘
```

### Fallback Mechanisms

1. **Embedding Failure** → Direct LLM call (no retrieval)
2. **No Search Results** → Direct LLM call (no retrieval)
3. **Rerank Failure** → Use original search results (no reranking)

---

## Component Details

### 1. Text Cleaning Service (`text_cleaning.py`)

**Purpose**: Normalize text for consistent embedding generation

**Process**:
- Unicode normalization (NFD)
- Remove combining marks
- Lowercase conversion
- Whitespace normalization

**Key Methods**:
- `clean_for_embedding()` - Full normalization for embeddings
- `clean_for_display()` - Light cleaning preserving case

**Why It Matters**: Ensures query embeddings match document embeddings by applying the same preprocessing.

---

### 2. Embedding Service (`embeddings.py`)

**Purpose**: Generate vector embeddings using Azure OpenAI

**Configuration**:
- Model: `text-embedding-ada-002` (default)
- Dimensions: 1536
- Endpoint: Extracted from `AZURE_OPENAI_ENDPOINT`

**Key Methods**:
- `generate_embedding(text)` - Single text → embedding vector
- `generate_embeddings_batch(texts)` - Batch processing for efficiency

**Output Format**: `List[float]` (1536 floats representing semantic meaning)

**Rate Limiting**: Handled by Azure OpenAI service limits

---

### 3. Vector Search Service (`vector_search.py`)

**Purpose**: Perform similarity search in PostgreSQL using pgvector

**Database Schema**:
```sql
ALTER TABLE "articles" ADD COLUMN embedding vector(1536);
CREATE INDEX embedding_idx ON "articles" 
USING hnsw (embedding vector_cosine_ops);
```

**Search Algorithm**:
- **Distance Metric**: Cosine similarity (`<=>` operator)
- **Similarity Calculation**: `1 - (embedding <=> query_embedding)`
- **Index Type**: HNSW (Hierarchical Navigable Small World) for fast approximate search

**Key Methods**:
- `search_similar(query_embedding, top_k, threshold)` - Find similar articles
- `index_article(article_id, embedding)` - Store embedding for article
- `get_articles_without_embeddings(limit)` - Find unindexed articles

**Query Format**:
```sql
SELECT id, headline, summary, full_text, source, published_at, tickers, label,
       1 - (embedding <=> %s::vector) as similarity
FROM "articles"
WHERE embedding IS NOT NULL
  AND (1 - (embedding <=> %s::vector)) >= %s
ORDER BY embedding <=> %s::vector
LIMIT %s
```

**Parameters**:
- `top_k`: Initial retrieval count (default: 10)
- `similarity_threshold`: Minimum similarity score 0-1 (default: 0.7)

---

### 4. Rerank Service (`rerank.py`)

**Purpose**: Improve relevance using Cohere Rerank v4.0 Fast via Azure AI Foundry

**Why Reranking?**
- Vector search finds semantically similar content
- Reranking uses cross-encoder to understand query-document relationship
- Better precision for final context selection

**Configuration**:
- Endpoint: `AZURE_RERANK_ENDPOINT`
- Model: `RagRank` (Cohere Rerank v4.0 Fast)
- API Key: `AZURE_RERANK_KEY`

**Process**:
1. Extract text from documents (prefer summary, fallback to content)
2. Send query + documents to Cohere Rerank API
3. Receive relevance scores for each document
4. Sort by rerank score (descending)
5. Return top N documents

**API Format**:
```json
{
  "model": "RagRank",
  "query": "user query",
  "documents": ["doc1 text", "doc2 text", ...],
  "top_n": 5
}
```

**Response Format**:
```json
{
  "results": [
    {"index": 0, "relevance_score": 0.95},
    {"index": 1, "relevance_score": 0.87},
    ...
  ]
}
```

**Fallback**: If reranking fails, uses original search results (graceful degradation)

---

### 5. Query Translation Service (`query_translation.py`)

**Purpose**: Enhance queries for better retrieval (optional, not currently used in main flow)

**Capabilities**:
- **Query Augmentation**: Expand vague queries with synonyms and context
- **Query Decomposition**: Break complex queries into subqueries
- **Query Rewriting**: Optimize for both keyword and semantic search

**Use Cases**:
- Education RAG uses this for Socratic method
- Can be integrated into main RAG for improved retrieval

---

### 6. LLM Client (`llm.py`)

**Purpose**: Azure OpenAI chat completions wrapper

**Configuration**:
- Deployment: `PrimaryParser` (GPT-4o Mini)
- API Version: `2024-12-01-preview`
- Temperature: 0.7 (default, configurable)

**Key Methods**:
- `a_call(prompt, system_prompt)` - Async chat completion
- `chat(prompt, system_prompt)` - Synchronous wrapper

**Prompt Structure**:
```python
messages = [
    {"role": "system", "content": system_prompt},
    {"role": "user", "content": user_prompt}
]
```

**System Prompt Example**:
```
You are a financial analyst assistant. Answer questions based on the 
provided financial news articles. Be accurate, cite specific information 
from the articles when possible, and acknowledge when information is not 
available in the provided context.
```

---

### 7. Main RAG Class (`rag.py`)

**Purpose**: Orchestrate the complete RAG pipeline

**Initialization**:
- Lazy loading of all services (initialized on first use)
- Singleton pattern for efficiency

**Main Method**: `a_call(query, use_retrieval, top_k, rerank_top_n, similarity_threshold)`

**Parameters**:
- `query`: User question
- `use_retrieval`: Enable/disable retrieval (default: True)
- `top_k`: Initial retrieval count (default: 10)
- `rerank_top_n`: Final context count (default: 5)
- `similarity_threshold`: Minimum similarity (default: 0.7)

**Context Formatting**:
Each article in context includes:
- Headline
- Summary (first 500 chars)
- Source
- Published date
- Similarity score
- Rerank score (if available)

**Example Context**:
```
[Article 1] (Relevance: 87.3%, Rerank: 0.952)
Headline: Market Volatility Increases
Summary: Financial markets experienced significant volatility...
Source: Financial Times
Published: 2024-01-15T10:30:00
---
```

---

### 8. Education RAG (`education_rag.py`)

**Purpose**: Specialized RAG for Education Track features

**Extends**: Base `RAG` class

**Additional Features**:

#### a) Explain Concept
- Retrieves lesson content for concept explanations
- Uses portfolio-based analogies
- Provides citations to source modules

#### b) Socratic Guidance
- Never gives direct answers
- Asks guided questions
- Provides hints based on lesson content
- References student's portfolio/experience

#### c) Adaptive Learning Recommendations
- Analyzes user performance (quiz results, module completion)
- Detects behavioral patterns (viewing high-risk stocks, impulsive trading)
- Recommends personalized modules and mini-quests
- Generates coach prompts

**Response Format**:
```json
{
  "guidance": "Socratic questions...",
  "hints": ["Hint 1", "Hint 2"],
  "related_concepts": ["concept1", "concept2"],
  "think_about": ["Consideration 1"]
}
```

---

## API Endpoints

### Base RAG Endpoints

#### `/api/insights/market-summary`
- **Method**: GET
- **Purpose**: Generate market summary from recent articles
- **Uses**: Base RAG with retrieval

#### `/api/insights/ai-recommendations`
- **Method**: GET
- **Purpose**: Generate investment recommendations
- **Uses**: Base RAG with retrieval

#### `/api/insights/both`
- **Method**: GET
- **Purpose**: Get both summary and recommendations
- **Uses**: Base RAG (two calls)

### Education RAG Endpoints

#### `/api/education/explain`
- **Method**: POST
- **Body**:
  ```json
  {
    "concept": "diversification",
    "module_context": 4,
    "use_analogy": true
  }
  ```
- **Response**: Explanation with citations

#### `/api/education/socratic`
- **Method**: POST
- **Body**:
  ```json
  {
    "question": "Why should I diversify?",
    "student_context": {
      "portfolio": {...},
      "recent_trades": [...],
      "current_module": 4
    }
  }
  ```
- **Response**: Socratic guidance with hints

#### `/api/education/adaptive-learning`
- **Method**: POST
- **Body**:
  ```json
  {
    "user_performance": {
      "quiz_results": [...],
      "completed_modules": [1, 2, 3],
      "current_module": 4
    },
    "current_behavior": {
      "viewing_high_risk_stocks": true,
      "impulsive_trading": false
    }
  }
  ```
- **Response**: Personalized recommendations

#### `/api/education/mentor`
- **Method**: POST
- **Query Params**: `question`, `context` (optional)
- **Purpose**: Full-page mentor chat interface
- **Uses**: Socratic guidance

---

## Configuration

### Environment Variables

#### Azure OpenAI
```bash
AZURE_OPENAI_ENDPOINT=https://fundthesis.cognitiveservices.azure.com/
AZURE_OPENAI_API_KEY=your_api_key
AZURE_OPENAI_DEPLOYMENT_NAME=PrimaryParser
AZURE_OPENAI_API_VERSION=2024-12-01-preview
AZURE_OPENAI_EMBEDDING_DEPLOYMENT=text-embedding-ada-002
```

#### Cohere Rerank (Azure AI Foundry)
```bash
AZURE_RERANK_ENDPOINT=https://fundthesis.services.ai.azure.com/providers/cohere/v2/rerank
AZURE_RERANK_KEY=your_api_key
AZURE_RERANK_MODEL_NAME=RagRank
```

#### Database
```bash
DATABASE_URL=postgresql://user:password@host:5432/database?sslmode=require
```

### Database Setup

1. **Enable pgvector extension**:
   ```sql
   CREATE EXTENSION IF NOT EXISTS vector;
   ```

2. **Add embedding column**:
   ```sql
   ALTER TABLE "articles" ADD COLUMN IF NOT EXISTS embedding vector(1536);
   ```

3. **Create HNSW index**:
   ```sql
   CREATE INDEX IF NOT EXISTS embedding_idx
   ON "articles"
   USING hnsw (embedding vector_cosine_ops);
   ```

### Indexing Articles

Run the indexing script to generate embeddings for existing articles:

```bash
cd backend
python -m rag.index_articles
```

This script:
- Finds articles without embeddings
- Generates embeddings in batches (default: 50)
- Stores embeddings in database
- Respects rate limits with delays

---

## Data Flow Diagram

### Indexing Flow (One-time setup)

```
┌──────────────┐
│  Articles    │
│  (Database)  │
└──────┬───────┘
       │
       ▼
┌─────────────────────┐
│  Get articles       │
│  without embeddings │
└──────┬──────────────┘
       │
       ▼
┌─────────────────────┐
│  Combine text        │
│  (headline + summary │
│   + full_text)       │
└──────┬──────────────┘
       │
       ▼
┌─────────────────────┐
│  Generate Embeddings │
│  (Batch processing)  │
│  Azure OpenAI        │
└──────┬──────────────┘
       │
       ▼
┌─────────────────────┐
│  Store Embeddings    │
│  PostgreSQL +        │
│  pgvector            │
└──────────────────────┘
```

### Query Flow (Real-time)

```
User Query
    │
    ├─→ Text Cleaning
    │
    ├─→ Embedding Generation (Azure OpenAI)
    │
    ├─→ Vector Search (PostgreSQL + pgvector)
    │   └─→ Top 10 articles
    │
    ├─→ Reranking (Cohere Rerank)
    │   └─→ Top 5 articles
    │
    ├─→ Context Formatting
    │
    ├─→ LLM Generation (GPT-4o Mini)
    │
    └─→ Response to User
```

---

## Performance Considerations

### Optimization Strategies

1. **Lazy Loading**: Services initialized only when needed
2. **Connection Pooling**: Prisma manages database connections
3. **Batch Processing**: Embeddings generated in batches
4. **HNSW Index**: Fast approximate nearest neighbor search
5. **Async Operations**: Non-blocking I/O throughout

### Typical Latency

- **Embedding Generation**: ~200-500ms
- **Vector Search**: ~50-200ms (with HNSW index)
- **Reranking**: ~300-800ms (depends on document count)
- **LLM Generation**: ~1-3s (depends on response length)

**Total Query Time**: ~2-5 seconds (typical)

### Scaling Considerations

- **Vector Search**: HNSW index scales to millions of vectors
- **Reranking**: Can be rate-limited; consider caching
- **LLM**: Azure OpenAI handles scaling automatically
- **Database**: PostgreSQL can be scaled horizontally with read replicas

---

## Error Handling

### Graceful Degradation

1. **Embedding Failure** → Direct LLM call
2. **Search Failure** → Direct LLM call
3. **Rerank Failure** → Use original search results
4. **LLM Failure** → Return error message

### Logging

All errors are logged with context:
- Query text
- Error type
- Fallback action taken

---

## Future Enhancements

### Planned Improvements

1. **Hybrid Search**: Combine vector search with full-text search (PostgreSQL `tsvector`)
2. **Query Translation Integration**: Use query augmentation in main flow
3. **Caching**: Cache embeddings and search results
4. **Chunking**: Implement semantic chunking for long articles
5. **Multi-modal**: Support for images and charts in articles
6. **Feedback Loop**: Learn from user interactions to improve retrieval

### Education Track Enhancements

1. **Lesson Content Indexing**: Index module content separately
2. **Student Context**: Persistent student profiles for better personalization
3. **Progress Tracking**: Track concept mastery for adaptive recommendations
4. **Gamification Integration**: Link RAG responses to achievements

---

## Troubleshooting

### Common Issues

1. **No embeddings found**
   - Run `python -m rag.index_articles` to index articles
   - Check `AZURE_OPENAI_EMBEDDING_DEPLOYMENT` is set correctly

2. **Vector search returns no results**
   - Lower `similarity_threshold` (try 0.5)
   - Check pgvector extension is enabled
   - Verify HNSW index exists

3. **Reranking fails**
   - Check `AZURE_RERANK_ENDPOINT` and `AZURE_RERANK_KEY`
   - Verify Cohere model is deployed in Azure AI Foundry
   - System will fall back to original results

4. **Slow performance**
   - Ensure HNSW index is created
   - Check database connection pooling
   - Consider caching frequently accessed embeddings

---

## References

- [Azure OpenAI Documentation](https://learn.microsoft.com/azure/ai-services/openai/)
- [pgvector Documentation](https://github.com/pgvector/pgvector)
- [Cohere Rerank Documentation](https://docs.cohere.com/docs/reranking)
- [Prisma Python Documentation](https://www.prisma.io/docs/orm/prisma-client-python)

---

**Last Updated**: January 2025  
**Version**: 1.0  
**Maintained By**: FundThesis Development Team

