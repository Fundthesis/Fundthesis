"""Vector Search Service using Prisma and pgvector."""

import os
from typing import List, Dict, Optional
from prisma import Prisma


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
    
    def _format_vector(self, embedding: List[float]) -> str:
        """Convert embedding list to PostgreSQL vector format: '[0.1,0.2,0.3]'"""
        return '[' + ','.join(map(str, embedding)) + ']'
    
    async def index_article(self, article_id: str, embedding: List[float]) -> bool:
        """
        Store embedding for an article.
        
        Args:
            article_id: UUID of the article
            embedding: Vector embedding (list of floats)
            
        Returns:
            True if successful, False otherwise
        """
        try:
            await self.connect()
            
            # Convert list to PostgreSQL vector format
            embedding_str = self._format_vector(embedding)
            
            # Use raw SQL since Prisma doesn't support vector type directly
            # Prisma Python query_raw uses %s placeholders with tuple parameters
            await self.db.query_raw(
                """
                UPDATE "articles" 
                SET embedding = %s::vector 
                WHERE id = %s::uuid
                """,
                (embedding_str, article_id)
            )
            return True
        except Exception as e:
            print(f"Error indexing article {article_id}: {e}")
            return False
    
    async def search_similar(
        self, 
        query_embedding: List[float], 
        top_k: int = 10,
        similarity_threshold: float = 0.7
    ) -> List[Dict]:
        """
        Search for similar articles using cosine similarity.
        
        Args:
            query_embedding: Query vector embedding
            top_k: Number of results to return
            similarity_threshold: Minimum similarity score (0-1)
            
        Returns:
            List of articles ordered by similarity (highest first)
        """
        try:
            await self.connect()
            
            # Convert embedding to PostgreSQL vector format
            embedding_str = self._format_vector(query_embedding)
            
            # Cosine similarity search using pgvector
            # 1 - cosine_distance = cosine_similarity
            # <=> operator is cosine distance
            results = await self.db.query_raw(
                """
                SELECT 
                    id,
                    headline,
                    summary,
                    full_text,
                    source,
                    published_at,
                    tickers,
                    label,
                    1 - (embedding <=> %s::vector) as similarity
                FROM "articles"
                WHERE embedding IS NOT NULL
                  AND (1 - (embedding <=> %s::vector)) >= %s
                ORDER BY embedding <=> %s::vector
                LIMIT %s
                """,
                (embedding_str, embedding_str, similarity_threshold, embedding_str, top_k)
            )
            
            return [
                {
                    'id': str(r['id']),
                    'headline': r['headline'],
                    'summary': r['summary'],
                    'content': r['full_text'],
                    'source': r['source'],
                    'published_at': r['published_at'].isoformat() if r['published_at'] else None,
                    'tickers': r['tickers'],
                    'sentiment': r['label'],
                    'similarity': float(r['similarity'])
                }
                for r in results
            ]
        except Exception as e:
            print(f"Error in vector search: {e}")
            return []
    
    async def get_articles_without_embeddings(self, limit: int = 100) -> List[Dict]:
        """
        Get articles that don't have embeddings yet (for indexing).
        
        Args:
            limit: Maximum number of articles to return
            
        Returns:
            List of article dictionaries
        """
        try:
            await self.connect()
            
            # Use raw SQL to check for NULL embeddings
            articles = await self.db.query_raw(
                """
                SELECT 
                    id,
                    headline,
                    summary,
                    full_text,
                    source,
                    published_at,
                    tickers,
                    label
                FROM "articles"
                WHERE embedding IS NULL
                  AND (headline IS NOT NULL OR summary IS NOT NULL OR full_text IS NOT NULL)
                ORDER BY published_at DESC NULLS LAST, inserted_at DESC
                LIMIT %s
                """,
                (limit,)
            )
            
            return [
                {
                    'id': str(a['id']),
                    'headline': a['headline'],
                    'summary': a['summary'],
                    'full_text': a['full_text'],
                    'source': a['source'],
                    'published_at': a['published_at'].isoformat() if a['published_at'] else None,
                    'tickers': a['tickers'],
                    'label': a['label']
                }
                for a in articles
            ]
        except Exception as e:
            print(f"Error fetching articles without embeddings: {e}")
            return []
