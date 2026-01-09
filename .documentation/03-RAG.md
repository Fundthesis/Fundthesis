# RAG (Retrieval-Augmented Generation)

This document describes the RAG (Retrieval-Augmented Generation) implementation in FundThesis. **Important Note:** The RAG system is currently in development and not fully implemented in production.

## Table of Contents

- [Overview](#overview)
- [Current Status](#current-status)
- [Architecture](#architecture)
- [Components](#components)
- [Implementation Details](#implementation-details)
- [Future Development](#future-development)

---

## Overview

RAG (Retrieval-Augmented Generation) is a technique that enhances AI language model responses by retrieving relevant context from a knowledge base before generating answers. In FundThesis, RAG is designed to:

1. **Retrieve** relevant financial news articles based on user queries
2. **Augment** AI responses with retrieved context
3. **Generate** accurate, context-aware answers about market conditions, stocks, and investment concepts

### Why RAG?

- **Accuracy:** Grounds AI responses in actual news and data
- **Relevance:** Provides up-to-date information from recent articles
- **Transparency:** Shows sources used in generating answers
- **Reduces Hallucination:** Prevents AI from making up information

---

## Current Status

### ✅ Implemented

- **Vector Embeddings:** Article embeddings stored in PostgreSQL (pgvector)
- **Embedding Service:** Sentence-Transformers for generating embeddings
- **Vector Search:** Basic vector similarity search infrastructure
- **Text Cleaning:** Article text preprocessing and cleaning
- **Query Translation:** Query enhancement and expansion
- **Reranking:** Cross-encoder reranking for result quality

### ⚠️ Partially Implemented

- **RAG Pipeline:** Core pipeline exists but not fully integrated
- **LLM Integration:** Azure OpenAI client configured but not actively used
- **Article Indexing:** Embeddings generated but indexing process incomplete

### ❌ Not Yet Implemented

- **Production Integration:** RAG not connected to user-facing features
- **Real-Time Indexing:** New articles not automatically embedded
- **Query Interface:** No API endpoint for RAG queries
- **Source Attribution:** Citation system not implemented
- **Performance Optimization:** No caching or optimization layer

### Honest Assessment

The RAG infrastructure is **built but not operational**. The components exist, embeddings are stored, but the system is not actively used in production. This is a work-in-progress feature that requires additional development to become fully functional.

---

## Architecture

```
User Query
    │
    ▼
Query Translation Service
    │
    ▼
Embedding Service (Query → Vector)
    │
    ▼
Vector Search Service
    │
    ├─→ PostgreSQL (pgvector)
    │   └─→ Article Embeddings
    │
    ▼
Rerank Service (Cross-Encoder)
    │
    ▼
Retrieved Articles (Top K)
    │
    ▼
LLM Client (Azure OpenAI)
    │   ├─→ Context: Retrieved Articles
    │   └─→ Query: User Question
    │
    ▼
Generated Response + Citations
```

### Data Flow

1. **User submits query** (e.g., "What's happening with Apple stock?")
2. **Query translation** enhances and expands the query
3. **Query embedding** converts text to vector representation
4. **Vector search** finds similar article embeddings in database
5. **Reranking** improves result quality using cross-encoder
6. **Context assembly** combines top articles into prompt
7. **LLM generation** creates response using context
8. **Response formatting** includes citations and sources

---

## Components

### 1. Embedding Service (`embeddings.py`)

**Purpose:** Generate vector embeddings for text

**Technology:**
- Sentence-Transformers library
- Model: `sentence-transformers/all-MiniLM-L6-v2` (or similar)
- Output: 384 or 1536-dimensional vectors

**Usage:**
```python
from rag.embeddings import EmbeddingService

service = EmbeddingService()
embedding = service.embed_text("Apple stock rises on earnings")
```

**Status:** ✅ Implemented

### 2. Vector Search Service (`vector_search.py`)

**Purpose:** Find similar articles using vector similarity

**Technology:**
- PostgreSQL pgvector extension
- Cosine similarity search
- Returns top K most similar articles

**Query Example:**
```sql
SELECT id, headline, 
       1 - (embedding <=> $1::vector) as similarity
FROM articles
WHERE embedding IS NOT NULL
ORDER BY embedding <=> $1::vector
LIMIT 10;
```

**Status:** ✅ Implemented (basic functionality)

### 3. Rerank Service (`rerank.py`)

**Purpose:** Improve search results using cross-encoder reranking

**Technology:**
- Cross-encoder model (more accurate than bi-encoder)
- Re-ranks initial vector search results
- Improves relevance of top results

**Status:** ✅ Implemented (basic functionality)

### 4. Query Translation Service (`query_translation.py`)

**Purpose:** Enhance user queries for better retrieval

**Functions:**
- Query expansion (add synonyms, related terms)
- Query normalization
- Financial term recognition

**Status:** ✅ Implemented (basic functionality)

### 5. Text Cleaning (`text_cleaning.py`)

**Purpose:** Preprocess article text before embedding

**Operations:**
- Remove HTML tags
- Normalize whitespace
- Remove special characters
- Extract main content

**Status:** ✅ Implemented

### 6. LLM Client (`llm.py`)

**Purpose:** Generate responses using Azure OpenAI

**Configuration:**
- Azure OpenAI service
- GPT-4 or GPT-3.5-turbo
- Prompt engineering for RAG

**Status:** ⚠️ Configured but not actively used

### 7. RAG Pipeline (`rag.py`)

**Purpose:** Main orchestration class

**Responsibilities:**
- Coordinate all RAG components
- Manage lazy initialization
- Provide high-level query interface

**Status:** ⚠️ Structure exists, not fully integrated

---

## Implementation Details

### Embedding Storage

**Database Schema:**
```prisma
model Article {
  id           String
  headline     String?
  summary      String?
  fullText     String?
  embedding    Unsupported("vector(1536)")?  // pgvector
  // ... other fields
}
```

**Vector Dimensions:** 1536 (OpenAI embedding size) or 384 (sentence-transformers)

**Indexing:**
```sql
CREATE INDEX ON articles USING ivfflat (embedding vector_cosine_ops);
```

### Vector Search Implementation

**Similarity Metric:** Cosine similarity

**Search Process:**
1. Generate query embedding
2. Execute vector similarity query
3. Return top K results with similarity scores
4. Filter by minimum similarity threshold

**Performance Considerations:**
- IVFFlat index for faster search
- Limit result set size
- Consider approximate nearest neighbor (ANN) for scale

### Reranking Process

**Why Rerank?**
- Initial vector search is fast but may miss nuanced relevance
- Cross-encoder provides more accurate relevance scoring
- Re-ranks top N results (e.g., top 50 → top 10)

**Model:**
- Cross-encoder model from sentence-transformers
- More computationally expensive but more accurate
- Only applied to top results for efficiency

---

## Current Limitations

### 1. **Incomplete Integration**
- RAG not connected to user-facing API endpoints
- No way for users to interact with RAG system
- Education RAG exists but not actively used

### 2. **Indexing Gaps**
- Not all articles have embeddings
- No automated embedding generation for new articles
- Manual indexing process required

### 3. **Performance**
- No caching layer
- Vector search not optimized for scale
- Reranking adds latency

### 4. **Source Attribution**
- Citations not formatted for display
- No link back to original articles
- Source credibility not evaluated

### 5. **Query Understanding**
- Limited financial domain knowledge
- May not understand complex financial queries
- No multi-hop reasoning

---

## Future Development

### Phase 1: Basic Integration

**Goals:**
- Connect RAG to API endpoint
- Enable querying from frontend
- Display responses with basic citations

**Tasks:**
- Create `/api/rag/query` endpoint
- Integrate RAG pipeline
- Format responses for frontend
- Add basic error handling

### Phase 2: Production Readiness

**Goals:**
- Automated embedding generation
- Real-time indexing
- Performance optimization

**Tasks:**
- Add embedding job to scheduled tasks
- Index new articles automatically
- Implement caching layer
- Optimize vector search queries

### Phase 3: Enhanced Features

**Goals:**
- Better query understanding
- Multi-document reasoning
- Source credibility scoring

**Tasks:**
- Improve query translation
- Implement multi-hop retrieval
- Add source quality metrics
- Enhanced prompt engineering

### Phase 4: Advanced Capabilities

**Goals:**
- Multi-modal RAG (charts, tables)
- Temporal reasoning
- Personalized context

**Tasks:**
- Extract information from charts
- Understand time-based queries
- User-specific context retrieval

---

## Usage (When Implemented)

### API Endpoint (Planned)

```http
POST /api/rag/query
Content-Type: application/json

{
  "query": "What are analysts saying about Tesla's Q4 earnings?",
  "max_results": 5,
  "include_sources": true
}
```

### Response Format (Planned)

```json
{
  "answer": "Based on recent articles, analysts are...",
  "sources": [
    {
      "id": "article-uuid",
      "headline": "Tesla Q4 Earnings Beat Expectations",
      "url": "https://...",
      "relevance_score": 0.92
    }
  ],
  "confidence": 0.85
}
```

---

## Technical Stack

- **Embeddings:** Sentence-Transformers, OpenAI embeddings
- **Vector Database:** PostgreSQL pgvector extension
- **Reranking:** Cross-encoder models
- **LLM:** Azure OpenAI (GPT-4, GPT-3.5-turbo)
- **NLP:** LangChain (for orchestration, planned)

---

## Testing RAG (Development)

### Manual Testing

```python
from rag.rag import RAG

rag = RAG()
result = await rag.query(
    "What's the sentiment on tech stocks?",
    max_results=5
)
print(result.answer)
print(result.sources)
```

### Integration Testing

- Test embedding generation
- Test vector search accuracy
- Test reranking improvement
- Test end-to-end pipeline

---

## Conclusion

The RAG system in FundThesis has a solid foundation with all major components implemented. However, it is **not yet production-ready** and requires additional development to:

1. Complete integration with user-facing features
2. Automate embedding generation and indexing
3. Optimize performance and add caching
4. Implement proper source attribution
5. Add comprehensive error handling

The infrastructure is in place, and with focused development effort, RAG can become a powerful feature for providing accurate, source-grounded financial insights to users.

---

**Status:** 🚧 Work in Progress  
**Priority:** Medium  
**Estimated Completion:** TBD
