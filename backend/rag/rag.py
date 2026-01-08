"""RAG (Retrieval-Augmented Generation) implementation with vector search and reranking."""

from __future__ import annotations

import asyncio
from typing import Optional, List, Dict

from .llm import LLMClient
from .embeddings import EmbeddingService
from .vector_search import VectorSearchService
from .rerank import RerankService
from .text_cleaning import TextCleaner
from .query_translation import QueryTranslationService


class RAG:
    """Main RAG implementation class with true retrieval-augmented generation."""
    
    def __init__(self):
        """Initialize RAG with all required services."""
        self._llm: Optional[LLMClient] = None
        self._embeddings: Optional[EmbeddingService] = None
        self._vector_search: Optional[VectorSearchService] = None
        self._rerank: Optional[RerankService] = None
        self._text_cleaner = TextCleaner()
        self._query_translation: Optional[QueryTranslationService] = None
    
    @property
    def llm(self) -> LLMClient:
        """Lazy initialization of LLM client."""
        if self._llm is None:
            self._llm = LLMClient()
        return self._llm
    
    @property
    def embeddings(self) -> EmbeddingService:
        """Lazy initialization of embeddings service."""
        if self._embeddings is None:
            self._embeddings = EmbeddingService()
        return self._embeddings
    
    @property
    def vector_search(self) -> VectorSearchService:
        """Lazy initialization of vector search service."""
        if self._vector_search is None:
            self._vector_search = VectorSearchService()
        return self._vector_search
    
    @property
    def rerank(self) -> RerankService:
        """Lazy initialization of rerank service."""
        if self._rerank is None:
            self._rerank = RerankService()
        return self._rerank
    
    @property
    def query_translation(self) -> QueryTranslationService:
        """Lazy initialization of query translation service."""
        if self._query_translation is None:
            self._query_translation = QueryTranslationService()
        return self._query_translation

    async def a_call(
        self, 
        query: str, 
        use_retrieval: bool = True,
        top_k: int = 10,
        rerank_top_n: int = 5,
        similarity_threshold: float = 0.7
    ) -> str:
        """
        Generate response with RAG (Retrieval-Augmented Generation).
        
        Args:
            query: User query/question
            use_retrieval: Whether to use vector search (default: True)
            top_k: Number of articles to retrieve initially
            rerank_top_n: Number of top articles after reranking to use in context
            similarity_threshold: Minimum similarity score (0-1)
            
        Returns:
            Generated response text
        """
        if not use_retrieval:
            # Direct LLM call without retrieval (fallback)
            return await self.llm.a_call(query)
        
        # RAG flow:
        # 1. Clean query for consistent embedding
        cleaned_query = self._text_cleaner.clean_for_embedding(query)
        
        # 2. Generate query embedding
        query_embedding = await self.embeddings.generate_embedding(cleaned_query)
        
        if not query_embedding:
            # Fallback to direct call if embedding fails
            print("Warning: Failed to generate query embedding, using direct LLM call")
            return await self.llm.a_call(query)
        
        # 2. Search for similar articles
        try:
            await self.vector_search.connect()
            similar_articles = await self.vector_search.search_similar(
                query_embedding, 
                top_k=top_k,
                similarity_threshold=similarity_threshold
            )
        except Exception as e:
            print(f"Error in vector search: {e}")
            similar_articles = []
        finally:
            await self.vector_search.disconnect()
        
        if not similar_articles:
            # No relevant articles found, use direct LLM call
            print("Warning: No similar articles found, using direct LLM call")
            return await self.llm.a_call(query)
        
        # 3. Rerank articles for better relevance
        try:
            reranked_articles = await self.rerank.rerank(
                query=query,
                documents=similar_articles,
                top_n=rerank_top_n
            )
        except Exception as e:
            print(f"Error in rerank: {e}, using original results")
            reranked_articles = similar_articles[:rerank_top_n]
        
        # 4. Format context from retrieved articles
        context = self._format_articles_context(reranked_articles)
        
        # 5. Build prompt with context
        system_prompt = """You are a financial analyst assistant. Answer questions based on the provided financial news articles. 
Be accurate, cite specific information from the articles when possible, and acknowledge when information is not available in the provided context."""
        
        user_prompt = f"""Based on the following relevant financial news articles, answer the query.

Relevant Articles:
{context}

Query: {query}

Provide a clear, accurate answer based on the articles above. If the articles don't contain relevant information to answer the query, say so explicitly."""

        # 6. Generate response with context
        response = await self.llm.a_call(user_prompt, system_prompt=system_prompt)
        return response
    
    def _format_articles_context(self, articles: List[Dict]) -> str:
        """Format retrieved articles as context string."""
        if not articles:
            return "No relevant articles found."
        
        formatted = []
        for i, article in enumerate(articles, 1):
            headline = article.get('headline', 'No headline')
            summary = article.get('summary') or article.get('content', '')[:500]
            source = article.get('source', 'Unknown')
            published = article.get('published_at', '')
            similarity = article.get('similarity', 0)
            rerank_score = article.get('rerank_score', 0)
            
            score_info = f"Relevance: {similarity:.1%}"
            if rerank_score > 0:
                score_info += f", Rerank: {rerank_score:.3f}"
            
            formatted.append(
                f"[Article {i}] ({score_info})\n"
                f"Headline: {headline}\n"
                f"Summary: {summary}\n"
                f"Source: {source}\n"
                f"Published: {published}\n"
                f"---"
            )
        return "\n\n".join(formatted)
    
    async def testllm(self, prompt: str) -> str:
        """Test method to verify LLM functionality."""
        return await self.llm.a_call(prompt)


async def generate_response(query: str) -> str:
    """Generate a response for the given query using RAG.
    
    This is a standalone function that creates its own RAG instance.
    For multiple calls, prefer instantiating a RAG class instead.
    """
    rag = RAG()
    response = await rag.a_call(query)
    return response


# Add proper exports
__all__ = ['RAG', 'generate_response']


# Simple test function
async def _test():
    """Test the RAG functionality."""
    r = RAG()
    test_prompt = "What are the latest market trends?"
    response = await r.a_call(test_prompt)
    print(f"Test response: {response}")
    return response


# Allow running this file directly for testing
if __name__ == "__main__":
    asyncio.run(_test())
