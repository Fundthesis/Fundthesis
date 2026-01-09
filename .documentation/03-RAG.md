# RAG (Retrieval-Augmented Generation)

This document describes the RAG (Retrieval-Augmented Generation) implementation in FundThesis.

## Table of Contents

- [Overview](#overview)
- [Current Status](#current-status)
- [Architecture](#architecture)
- [Components](#components)
- [Implementation Details](#implementation-details)
- [Data Sources](#data-sources)
- [Environment Variables](#environment-variables)
- [Usage](#usage)
- [Future Development](#future-development)

---

## Overview

RAG (Retrieval-Augmented Generation) is a technique that enhances AI language model responses by retrieving relevant context from a knowledge base before generating answers. In FundThesis, RAG powers the AI Coach feature, providing:

1. **Multi-source retrieval** from financial news articles and learning modules
2. **Context-aware responses** augmented with relevant educational content
3. **Personalized coaching** using user's recent activity and learning progress
4. **Source-grounded answers** with citations for transparency

### Why RAG?

- **Accuracy:** Grounds AI responses in actual news articles and curriculum content
- **Relevance:** Provides up-to-date information from recent articles + educational context
- **Transparency:** Shows sources used in generating answers with snippets and links
- **Personalization:** Uses user's recent activity to tailor responses
- **Reduces Hallucination:** Prevents AI from making up information by grounding in retrieved content

---

## Current Status

### ✅ Fully Implemented

- **Vector Embeddings:** Article and learning module embeddings stored in PostgreSQL (pgvector) with HNSW indexing
- **Azure OpenAI Embeddings:** `text-embedding-ada-002` model (1536 dimensions) via Azure AI Foundry
- **Vector Search:** Cosine similarity search with configurable thresholds for both articles and modules
- **Cohere Rerank:** Document reranking via Azure AI Foundry for improved result quality
- **RAG Pipeline:** Complete orchestration with `RAGPipeline` class (`rag_pipeline.py`)
- **LLM Generation:** GPT-4o Mini via Azure OpenAI for response generation
- **Text Cleaning:** Article text preprocessing and normalization
- **Query Translation:** LLM-based query augmentation and decomposition
- **Source Attribution:** Full citation system with headlines, URLs, snippets, and relevance scores
- **Learning Module Indexing:** Educational content extraction and chunking from TypeScript files
- **User Context Integration:** Personalized responses based on user's recent activity
- **Markdown Formatting:** Responses formatted with proper Markdown structure

### ⚠️ Areas for Enhancement

- **Real-Time Indexing:** New articles require manual embedding via `python -m rag.index_articles`
- **Caching Layer:** No caching for repeated queries
- **Multi-hop Reasoning:** Single-hop retrieval only

---

## Architecture

```
User Query
    │
    ├─────────────────────────────────┐
    ▼                                 ▼
Query Embedding              User Context Service
(Azure OpenAI ada-002)       (Recent activity, portfolio)
    │                                 │
    ▼                                 │
┌───────────────────────────────────┐ │
│        Vector Search              │ │
│  ┌─────────────┬────────────────┐ │ │
│  │   Articles  │ Learning       │ │ │
│  │   (pgvector)│ Modules        │ │ │
│  │             │ (pgvector)     │ │ │
│  └─────────────┴────────────────┘ │ │
└───────────────────────────────────┘ │
    │                                 │
    ▼                                 │
Cohere Rerank                         │
(Azure AI Foundry)                    │
    │                                 │
    ▼                                 │
Top N Relevant Documents              │
    │                                 │
    ├─────────────────────────────────┘
    ▼
Prompt Assembly
(Context + User Activity + Query)
    │
    ▼
Azure OpenAI GPT-4o Mini
    │
    ▼
┌─────────────────────────────────────┐
│ Response                            │
│ ├─ Generated Answer (Markdown)      │
│ ├─ Sources (with snippets, URLs)    │
│ └─ Context Metadata                 │
└─────────────────────────────────────┘
```

### Pipeline Flow

1. **User submits query** (e.g., "What is diversification?")
2. **Query embedding** via Azure OpenAI `text-embedding-ada-002` (1536 dimensions)
3. **Parallel vector search** across articles AND learning modules (pgvector)
4. **Result merging** combines candidates from both sources
5. **Cohere Rerank** refines combined results by relevance
6. **User context retrieval** fetches recent activity if user is authenticated
7. **Prompt assembly** combines retrieved context + user activity + system prompt
8. **LLM generation** via Azure OpenAI GPT-4o Mini
9. **Response formatting** with Markdown and source citations

---

## Components

### 1. Embedding Service (`embeddings.py`)

**Purpose:** Generate vector embeddings for text using Azure OpenAI

**Technology:**
- Azure AI Foundry with OpenAI-compatible API
- Model: `text-embedding-ada-002` (configurable via `AZURE_EMBED_MODEL_NAME`)
- Output: 1536-dimensional vectors

**Key Features:**
- Batch embedding support for efficient indexing
- Automatic text truncation (8000 chars max)
- Graceful degradation when credentials unavailable
- Singleton pattern for service reuse

**Usage:**
```python
from rag.embeddings import get_embed_service

service = get_embed_service()
embedding = await service.embed_query("What is diversification?")

# Batch embeddings for indexing
embeddings = await service.generate_embeddings_batch(["text1", "text2"])
```

**Environment Variables:**
- `AZURE_EMBED_ENDPOINT` - Azure AI Foundry endpoint
- `AZURE_EMBED_KEY` - API key
- `AZURE_EMBED_MODEL_NAME` - Model deployment name (default: "RagEmbed")

### 2. Vector Search Service (`vector_search.py`)

**Purpose:** Find similar documents using PostgreSQL pgvector

**Technology:**
- PostgreSQL pgvector extension
- Cosine similarity search (`1 - (embedding <=> query)`)
- Separate search methods for articles and learning modules

**Key Methods:**
```python
# Search articles
results = await vector_search.search_similar(
    query_embedding=embedding,
    top_k=10,
    similarity_threshold=0.5
)

# Search learning modules
modules = await vector_search.search_modules(
    query_embedding=embedding,
    top_k=5,
    similarity_threshold=0.3
)
```

**Search Queries:**
```sql
-- Article search
SELECT id, headline, summary, full_text, source, url, published_at, tickers, label,
       1 - (embedding <=> $1::vector) as similarity
FROM "articles"
WHERE embedding IS NOT NULL
  AND (1 - (embedding <=> $1::vector)) >= $2
ORDER BY embedding <=> $1::vector
LIMIT $3;

-- Module search
SELECT id, module_number, section_index, section_heading, title, content,
       chunk_type, url_path, 1 - (embedding <=> $1::vector) as similarity
FROM "learning_modules"
WHERE embedding IS NOT NULL
  AND (1 - (embedding <=> $1::vector)) >= $2
ORDER BY embedding <=> $1::vector
LIMIT $3;
```

### 3. Rerank Service (`rerank.py`)

**Purpose:** Improve search results using Cohere Rerank

**Technology:**
- Cohere Rerank v3.5 model via Azure AI Foundry
- HTTP API integration (not SDK)
- Configurable top_n results

**Key Features:**
- Reranks combined article + module results
- Adds `rerank_score` to each document
- Graceful fallback if service unavailable

**Usage:**
```python
from rag.rerank import RerankService

reranker = RerankService()
reranked_docs = await reranker.rerank(
    query="What is portfolio diversification?",
    documents=candidates,
    top_n=5
)
```

**Environment Variables:**
- `AZURE_RERANK_ENDPOINT` - Azure AI Foundry rerank endpoint
- `AZURE_RERANK_KEY` - API key
- `AZURE_RERANK_MODEL_NAME` - Model deployment name (default: "RagRank")

### 4. Query Translation Service (`query_translation.py`)

**Purpose:** Enhance user queries for better retrieval

**Technology:**
- LLM-based query augmentation (Azure OpenAI)
- Financial domain specialization

**Key Methods:**
```python
from rag.query_translation import QueryTranslationService

translator = QueryTranslationService()

# Augment query with synonyms and related terms
augmented = await translator.augment_query(
    "What is beta?",
    context="Portfolio management module"
)

# Decompose complex queries into subqueries
decomposed = await translator.decompose_query(
    "How does diversification reduce risk and what are the limits?"
)
```

### 5. Text Cleaning (`text_cleaning.py`)

**Purpose:** Preprocess text before embedding

**Operations:**
- Unicode normalization (NFD, remove combining marks)
- Lowercase conversion
- Whitespace normalization
- Consistent preprocessing for query-document matching

**Usage:**
```python
from rag.text_cleaning import TextCleaner

cleaner = TextCleaner()
cleaned = cleaner.clean_for_embedding("RAW text with   extra spaces")
display = cleaner.clean_for_display("Text for UI")
```

### 6. Chunking Service (`chunking.py`)

**Purpose:** Break documents into semantic chunks for embedding

**Technology:**
- Sentence-boundary chunking
- Configurable chunk size (default: 500 chars) and overlap (default: 50 chars)

**Usage:**
```python
from rag.chunking import ChunkingService

chunker = ChunkingService(chunk_size=500, chunk_overlap=50)
chunks = chunker.chunk_by_sentences(long_text, min_chunk_size=100)
```

### 7. LLM Client (`llm.py`)

**Purpose:** Generate responses using Azure OpenAI

**Technology:**
- Azure OpenAI Python SDK
- GPT-4o Mini deployment (configurable)
- Sync and async interfaces

**Key Features:**
- Automatic Markdown formatting instruction injection
- Configurable temperature
- System prompt support

**Usage:**
```python
from rag.llm import LLMClient

llm = LLMClient(temperature=0.7)

# Synchronous call
response = llm.chat(prompt, system_prompt="You are a financial coach.")

# Async call
response = await llm.a_call(prompt, system_prompt="...")
```

**Environment Variables:**
- `AZURE_OPENAI_ENDPOINT` - Azure OpenAI endpoint
- `AZURE_OPENAI_API_KEY` - API key
- `AZURE_OPENAI_API_VERSION` - API version (default: "2024-12-01-preview")
- `AZURE_OPENAI_DEPLOYMENT_NAME` - Deployment name (default: "PrimaryParser")

### 8. RAG Pipeline (`rag_pipeline.py`)

**Purpose:** Main orchestration class for complete RAG flow

**Key Features:**
- Combines all components into unified interface
- Parallel search across articles and learning modules
- User context integration for personalization
- Conversation history support
- Source attribution with metadata

**Methods:**
```python
from rag.rag_pipeline import get_rag_pipeline, rag_query

pipeline = get_rag_pipeline()

# Full RAG query with all features
result = await pipeline.query(
    user_input="What is diversification?",
    system_prompt="You are a financial education coach.",
    conversation_history=[...],
    include_sources=True,
    user_id="user-uuid"
)

# Result structure
{
    "response": "Diversification is...",
    "sources": [
        {
            "id": "article-uuid",
            "headline": "Understanding Portfolio Diversification",
            "source": "BusinessWire",
            "url": "https://...",
            "snippet": "First 250 chars...",
            "score": 0.92,
            "source_type": "article"  # or "module"
        }
    ],
    "context_used": 5,
    "retrieval_count": 7
}

# Convenience function
result = await rag_query(
    user_input="What is beta?",
    system_prompt="...",
    user_id="user-uuid"
)
```

### 9. Education RAG (`education_rag.py`)

**Purpose:** Specialized RAG for education track with Socratic method

**Key Features:**
- Explains concepts using analogies
- Retrieves relevant lesson content
- Grounded citations from curriculum

**Methods:**
```python
from rag.education_rag import EducationRAG

edu_rag = EducationRAG()
result = await edu_rag.explain_concept(
    concept="diversification",
    module_context=3,
    use_analogy=True
)
```

### 10. Learning Module Extractor (`learning_modules.py`)

**Purpose:** Extract educational content from TypeScript files

**Process:**
1. Reads `content.ts` files from `Frontend/src/app/lessonmodules/{N}/`
2. Parses TypeScript to extract title, intro, sections, key points
3. Structures content for embedding and search

**Usage:**
```python
from rag.learning_modules import get_module_extractor

extractor = get_module_extractor()
all_modules = extractor.extract_all_modules()
chunks = extractor.extract_and_chunk_all()
```

---

## Future Development

### Planned Enhancements

1. **Automated Real-Time Indexing**
   - Automatically embed new articles after scraping
   - Background job for continuous indexing

2. **Caching Layer**
   - Redis cache for repeated queries
   - Reduce latency for common questions

3. **Multi-hop Reasoning**
   - Handle complex queries requiring multiple retrieval steps
   - Cross-reference articles and modules

4. **Enhanced Query Understanding**
   - Better financial domain query parsing
   - Temporal query handling ("What happened to Apple last week?")

---

## Technical Stack Summary

| Component | Technology |
|-----------|------------|
| Embeddings | Azure OpenAI text-embedding-ada-002 (1536 dims) |
| Vector Database | PostgreSQL pgvector |
| Reranking | Cohere Rerank v3.5 via Azure AI Foundry |
| LLM Generation | Azure OpenAI GPT-4o Mini |
| Document Parsing | Azure Document Intelligence (available) |
| Orchestration | Custom Python pipeline (rag_pipeline.py) |

---

## Conclusion

The RAG system in FundThesis is **fully operational** and powers the AI Coach feature. The pipeline leverages cutting-edge AI technologies:

- **Azure Document Intelligence** for document parsing
- **Cohere Embed** via Azure AI Foundry for semantic embeddings
- **Cohere Rerank** for intelligent result refinement
- **Azure OpenAI GPT-4o Mini** for response generation

The system provides personalized, source-grounded financial education with full citation support.

---

**Status:** ✅ Production Ready  
**Last Updated:** January 2026
