"""Vector Search Service using Prisma and pgvector."""

import logging
from typing import List, Dict
from prisma import Prisma

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')


class VectorSearchService:
    """Service for vector similarity search using PostgreSQL pgvector."""

    def __init__(self):
        """Initialize Prisma client."""
        self.db = Prisma()
        self._connected = False

    async def connect(self):
        """Connect to database."""
        if not self._connected:
            await self.db.connect()
            self._connected = True

    async def disconnect(self):
        """Disconnect from database."""
        if self._connected:
            await self.db.disconnect()
            self._connected = False

    async def verify_pgvector_extension(self) -> Dict[str, any]:
        """Verify that the pgvector extension is installed and enabled."""
        try:
            await self.connect()
            result = await self.db.query_raw(
                "SELECT extname, extversion FROM pg_extension WHERE extname = 'vector'"
            )
            if result and len(result) > 0:
                return {
                    "installed": True,
                    "version": result[0].get("extversion"),
                    "message": "pgvector extension is installed and enabled"
                }
            else:
                return {
                    "installed": False,
                    "message": "pgvector extension is not installed. Run: CREATE EXTENSION IF NOT EXISTS vector;"
                }
        except Exception as e:
            logging.error(f"[VectorSearch] Error checking pgvector: {e}")
            return {"installed": False, "error": str(e)}

    async def ensure_pgvector_extension(self) -> bool:
        """Ensure pgvector extension is enabled."""
        try:
            await self.connect()
            await self.db.execute_raw("CREATE EXTENSION IF NOT EXISTS vector")
            logging.info("[VectorSearch] pgvector extension enabled")
            return True
        except Exception as e:
            logging.error(f"[VectorSearch] Error enabling pgvector: {e}")
            return False

    def _format_vector(self, embedding: List[float]) -> str:
        """Convert embedding list to PostgreSQL vector format: '[0.1,0.2,0.3]'"""
        return '[' + ','.join(map(str, embedding)) + ']'

    async def index_article(self, article_id: str, embedding: List[float]) -> bool:
        """Store embedding for an article using raw SQL (pgvector not supported by Prisma ORM)."""
        try:
            await self.connect()
            embedding_str = self._format_vector(embedding)

            await self.db.execute_raw(
                'UPDATE "articles" SET embedding = $1::vector WHERE id = $2',
                embedding_str, article_id
            )
            return True
        except Exception as e:
            logging.error(f"Error indexing article {article_id}: {e}")
            return False

    async def index_articles_batch(self, articles_embeddings: List[tuple[str, List[float]]]) -> int:
        """
        Store embeddings for multiple articles in a single batch UPDATE.

        Args:
            articles_embeddings: List of (article_id, embedding) tuples

        Returns:
            Number of articles updated
        """
        if not articles_embeddings:
            return 0

        try:
            await self.connect()

            # Build arrays for unnest
            ids = [item[0] for item in articles_embeddings]
            embeddings = [self._format_vector(item[1]) for item in articles_embeddings]

            # Batch update using unnest
            result = await self.db.execute_raw(
                '''
                UPDATE "articles" AS a
                SET embedding = data.embedding::vector
                FROM unnest($1::text[], $2::text[]) AS data(id, embedding)
                WHERE a.id = data.id
                ''',
                ids, embeddings
            )

            return len(articles_embeddings)
        except Exception as e:
            logging.error(f"Error batch indexing articles: {e}")
            return 0

    async def search_similar(
        self,
        query_embedding: List[float],
        top_k: int = 10,
        similarity_threshold: float = 0.7
    ) -> List[Dict]:
        """Search for similar articles using cosine similarity."""
        try:
            await self.connect()
            embedding_str = self._format_vector(query_embedding)

            results = await self.db.query_raw(
                '''
                SELECT
                    id, headline, summary, full_text, source, url,
                    published_at, tickers, label,
                    1 - (embedding <=> $1::vector) as similarity
                FROM "articles"
                WHERE embedding IS NOT NULL
                  AND (1 - (embedding <=> $1::vector)) >= $2
                ORDER BY embedding <=> $1::vector
                LIMIT $3
                ''',
                embedding_str, similarity_threshold, top_k
            )

            return [
                {
                    'id': str(r['id']),
                    'headline': r['headline'],
                    'summary': r['summary'],
                    'content': r['full_text'],
                    'source': r['source'],
                    'url': r['url'],
                    'published_at': str(r['published_at']) if r['published_at'] else None,
                    'tickers': r['tickers'],
                    'sentiment': r['label'],
                    'similarity': float(r['similarity'])
                }
                for r in results
            ]
        except Exception as e:
            logging.error(f"Error in vector search: {e}")
            return []

    async def search_modules(
        self,
        query_embedding: List[float],
        top_k: int = 10,
        similarity_threshold: float = 0.3
    ) -> List[Dict]:
        """
        Search for similar learning module chunks using cosine similarity.
        
        Args:
            query_embedding: Query vector embedding
            top_k: Number of results to return
            similarity_threshold: Minimum similarity score (0-1)
            
        Returns:
            List of module chunks with metadata
        """
        try:
            await self.connect()
            embedding_str = self._format_vector(query_embedding)

            results = await self.db.query_raw(
                '''
                SELECT
                    id, module_number, section_index, section_heading,
                    title, content, chunk_type, url_path,
                    1 - (embedding <=> $1::vector) as similarity
                FROM "learning_modules"
                WHERE embedding IS NOT NULL
                  AND (1 - (embedding <=> $1::vector)) >= $2
                ORDER BY embedding <=> $1::vector
                LIMIT $3
                ''',
                embedding_str, similarity_threshold, top_k
            )

            return [
                {
                    'id': str(r['id']),
                    'module_number': int(r['module_number']),
                    'section_index': int(r['section_index']) if r['section_index'] is not None else None,
                    'section_heading': r['section_heading'],
                    'title': r['title'],
                    'content': r['content'],
                    'chunk_type': r['chunk_type'],
                    'url_path': r['url_path'],
                    'similarity': float(r['similarity']),
                    'source_type': 'module'  # Mark as module for RAG pipeline
                }
                for r in results
            ]
        except Exception as e:
            logging.error(f"Error in module vector search: {e}")
            return []

    async def get_articles_without_embeddings(self, limit: int = 100) -> List[Dict]:
        """Get articles that don't have embeddings yet."""
        try:
            await self.connect()

            # Raw SQL needed because embedding is an Unsupported type in Prisma
            articles = await self.db.query_raw(
                f'''
                SELECT id, headline, summary, full_text, source, published_at, tickers, label
                FROM "articles"
                WHERE embedding IS NULL
                  AND (headline IS NOT NULL OR summary IS NOT NULL OR full_text IS NOT NULL)
                ORDER BY published_at DESC NULLS LAST, inserted_at DESC
                LIMIT {int(limit)}
                '''
            )

            return [
                {
                    'id': str(a['id']),
                    'headline': a['headline'],
                    'summary': a['summary'],
                    'full_text': a['full_text'],
                    'source': a['source'],
                    'published_at': str(a['published_at']) if a['published_at'] else None,
                    'tickers': a['tickers'],
                    'label': a['label']
                }
                for a in articles
            ]
        except Exception as e:
            logging.error(f"Error fetching articles without embeddings: {e}")
            return []
