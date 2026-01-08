"""RAG Pipeline Orchestrator.

Combines Cohere Embed-v4, pgvector search, Cohere Rerank, and Azure OpenAI
for a complete Retrieval-Augmented Generation pipeline.

Pipeline Flow:
1. User Query → Embed with Cohere Embed-v4 (search_query mode)
2. Vector Search → Find top-k similar documents from pgvector
3. Rerank → Use Cohere Rerank to refine results
4. Generate → Send context + query to Azure OpenAI
"""

import os
from typing import List, Dict, Optional, Any
import logging

from rag.embeddings import get_embed_service
from rag.vector_search import VectorSearchService
from rag.rerank import RerankService

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')


class RAGPipeline:
    """Complete RAG pipeline for the AI Coach."""
    
    def __init__(self):
        """Initialize all RAG components."""
        self.embed_service = get_embed_service()
        self.vector_search = VectorSearchService()
        self.rerank_service = RerankService()
        
        # Azure OpenAI config
        self.azure_endpoint = os.getenv("AZURE_OPENAI_ENDPOINT")
        self.azure_api_key = os.getenv("AZURE_OPENAI_API_KEY")
    
    async def retrieve(
        self,
        query: str,
        top_k: int = 10,
        rerank_top_n: int = 5,
        similarity_threshold: float = 0.5
    ) -> List[Dict[str, Any]]:
        """
        Retrieve relevant documents for a query.
        
        Args:
            query: User's search query
            top_k: Initial number of candidates from vector search
            rerank_top_n: Number of results after reranking
            similarity_threshold: Minimum similarity for vector search
            
        Returns:
            List of relevant documents with metadata
        """
        # Step 1: Embed the query
        logging.info(f"[RAG] Embedding query: {query[:50]}...")
        query_embedding = await self.embed_service.embed_query(query)
        
        if not query_embedding:
            logging.error("[RAG] Failed to embed query")
            return []
        
        # Step 2: Vector search
        logging.info(f"[RAG] Searching for top {top_k} similar documents...")
        candidates = await self.vector_search.search_similar(
            query_embedding=query_embedding,
            top_k=top_k,
            similarity_threshold=similarity_threshold
        )
        
        if not candidates:
            logging.info("[RAG] No candidates found from vector search")
            return []
        
        logging.info(f"[RAG] Found {len(candidates)} candidates")
        
        # Step 3: Rerank
        logging.info(f"[RAG] Reranking to top {rerank_top_n}...")
        reranked = await self.rerank_service.rerank(
            query=query,
            documents=candidates,
            top_n=rerank_top_n
        )
        
        logging.info(f"[RAG] Returning {len(reranked)} reranked results")
        return reranked
    
    async def query(
        self,
        user_input: str,
        system_prompt: str = "",
        conversation_history: List[Dict] = None,
        include_sources: bool = True
    ) -> Dict[str, Any]:
        """
        Full RAG query: retrieve context and generate response.
        
        Args:
            user_input: User's question
            system_prompt: System prompt for the LLM
            conversation_history: Previous messages for context
            include_sources: Whether to include source citations
            
        Returns:
            Dict with 'response', 'sources', and 'context_used'
        """
        # Retrieve relevant context
        relevant_docs = await self.retrieve(user_input)
        
        # Build context from retrieved documents
        context_texts = []
        sources = []
        
        for doc in relevant_docs:
            # Handle both dict and RerankResult objects
            if hasattr(doc, 'document'):
                doc_data = doc.document
                score = doc.relevance_score if hasattr(doc, 'relevance_score') else None
            else:
                doc_data = doc
                score = doc.get('rerank_score') or doc.get('similarity')
            
            content = doc_data.get('content') or doc_data.get('summary') or doc_data.get('headline', '')
            if content:
                context_texts.append(content[:1000])  # Limit each chunk
                
                source_info = {
                    'headline': doc_data.get('headline', 'Unknown'),
                    'source': doc_data.get('source', 'Unknown'),
                    'score': score
                }
                if doc_data.get('tickers'):
                    source_info['tickers'] = doc_data.get('tickers')
                sources.append(source_info)
        
        # Build the prompt with context
        context_section = "\n\n---\n".join(context_texts) if context_texts else ""
        
        augmented_prompt = f"""Based on the following relevant information:

{context_section}

---

Please answer this question: {user_input}"""
        
        # If Azure OpenAI is configured, call it
        if self.azure_endpoint and self.azure_api_key:
            import httpx
            
            messages = [{"role": "system", "content": system_prompt}] if system_prompt else []
            
            if conversation_history:
                for msg in conversation_history[-6:]:  # Last 6 messages for context
                    role = "assistant" if msg.get("role") == "coach" else "user"
                    messages.append({"role": role, "content": msg.get("content", "")})
            
            messages.append({"role": "user", "content": augmented_prompt})
            
            try:
                async with httpx.AsyncClient(timeout=60.0) as client:
                    response = await client.post(
                        self.azure_endpoint,
                        headers={
                            "Content-Type": "application/json",
                            "api-key": self.azure_api_key
                        },
                        json={
                            "messages": messages,
                            "max_tokens": 800,
                            "temperature": 0.7
                        }
                    )
                    
                    if response.status_code == 200:
                        data = response.json()
                        llm_response = data.get("choices", [{}])[0].get("message", {}).get("content", "")
                    else:
                        logging.error(f"[RAG] Azure OpenAI error: {response.status_code}")
                        llm_response = "I apologize, but I'm having trouble generating a response right now."
                        
            except Exception as e:
                logging.error(f"[RAG] Error calling Azure OpenAI: {e}")
                llm_response = "I apologize, but I'm having trouble connecting right now."
        else:
            llm_response = "Azure OpenAI not configured. Here's the relevant context I found:\n\n" + context_section
        
        return {
            "response": llm_response,
            "sources": sources if include_sources else [],
            "context_used": len(context_texts),
            "retrieval_count": len(relevant_docs)
        }


# Singleton
_rag_pipeline: Optional[RAGPipeline] = None


def get_rag_pipeline() -> RAGPipeline:
    """Get or create the RAG pipeline singleton."""
    global _rag_pipeline
    if _rag_pipeline is None:
        _rag_pipeline = RAGPipeline()
    return _rag_pipeline


# Convenience function
async def rag_query(
    user_input: str,
    system_prompt: str = "",
    conversation_history: List[Dict] = None
) -> Dict[str, Any]:
    """Run a RAG query."""
    return await get_rag_pipeline().query(
        user_input=user_input,
        system_prompt=system_prompt,
        conversation_history=conversation_history
    )
