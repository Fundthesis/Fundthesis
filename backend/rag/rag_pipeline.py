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
from services.user_context_service import get_user_context_service

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
        similarity_threshold: float = 0.5,
        module_top_k: int = 5,
        module_threshold: float = 0.3
    ) -> List[Dict[str, Any]]:
        """
        Retrieve relevant documents for a query from both articles and learning modules.
        
        Args:
            query: User's search query
            top_k: Initial number of candidates from article vector search
            rerank_top_n: Number of results after reranking
            similarity_threshold: Minimum similarity for article vector search
            module_top_k: Initial number of candidates from module vector search
            module_threshold: Minimum similarity for module vector search
            
        Returns:
            List of relevant documents with metadata (articles and modules combined)
        """
        # Step 1: Embed the query
        logging.info(f"[RAG] Embedding query: {query[:50]}...")
        query_embedding = await self.embed_service.embed_query(query)
        
        if not query_embedding:
            logging.warning("[RAG] Operating in degraded mode: embeddings unavailable, skipping context retrieval")
            return []
        
        # Step 2: Separate vector searches
        logging.info(f"[RAG] Searching for top {top_k} similar articles...")
        article_candidates = await self.vector_search.search_similar(
            query_embedding=query_embedding,
            top_k=top_k,
            similarity_threshold=similarity_threshold
        )
        
        logging.info(f"[RAG] Searching for top {module_top_k} similar module chunks...")
        module_candidates = await self.vector_search.search_modules(
            query_embedding=query_embedding,
            top_k=module_top_k,
            similarity_threshold=module_threshold
        )
        
        # Step 3: Merge results
        all_candidates = article_candidates + module_candidates
        
        if not all_candidates:
            logging.info("[RAG] No candidates found from vector search")
            return []
        
        logging.info(f"[RAG] Found {len(article_candidates)} articles and {len(module_candidates)} module chunks")
        
        # Step 4: Rerank combined results
        logging.info(f"[RAG] Reranking to top {rerank_top_n}...")
        reranked = await self.rerank_service.rerank(
            query=query,
            documents=all_candidates,
            top_n=rerank_top_n
        )
        
        logging.info(f"[RAG] Returning {len(reranked)} reranked results")
        return reranked
    
    async def query(
        self,
        user_input: str,
        system_prompt: str = "",
        conversation_history: List[Dict] = None,
        include_sources: bool = True,
        user_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Full RAG query: retrieve context and generate response.
        
        Args:
            user_input: User's question
            system_prompt: System prompt for the LLM
            conversation_history: Previous messages for context
            include_sources: Whether to include source citations
            user_id: Optional user ID for personalized context
            
        Returns:
            Dict with 'response', 'sources', and 'context_used'
        """
        # Retrieve relevant context with lower threshold and more candidates for better coverage
        relevant_docs = await self.retrieve(
            user_input,
            top_k=15,  # Increased from default 10
            rerank_top_n=7,  # Increased from default 5
            similarity_threshold=0.3,  # Lowered from default 0.5 for better recall
            module_top_k=5,  # Number of module chunks to retrieve
            module_threshold=0.3  # Similarity threshold for modules
        )
        
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
            
            # Check if this is a module or article
            source_type = doc_data.get('source_type', 'article')
            
            if source_type == 'module':
                # Handle learning module source
                content = doc_data.get('content', '')
                if content:
                    context_texts.append(content[:1000])  # Limit each chunk
                    
                    # Extract snippet for preview
                    snippet = content[:250].strip() if content else ''
                    if len(content) > 250:
                        snippet += '...'
                    
                    # Build module source info
                    module_number = doc_data.get('module_number')
                    section_heading = doc_data.get('section_heading')
                    chunk_type = doc_data.get('chunk_type', 'section')
                    
                    # Create display title
                    if section_heading:
                        display_title = f"{doc_data.get('title', 'Module')} - {section_heading}"
                    else:
                        display_title = doc_data.get('title', 'Module')
                    
                    source_info = {
                        'id': doc_data.get('id'),
                        'headline': display_title,
                        'source': f"Module {module_number}",
                        'url': doc_data.get('url_path', f'/lessonmodules/{module_number}'),
                        'published_at': None,  # Modules don't have publication dates
                        'snippet': snippet,
                        'score': score,
                        'source_type': 'module',
                        'module_number': module_number,
                        'section_heading': section_heading,
                        'chunk_type': chunk_type
                    }
                    sources.append(source_info)
            else:
                # Handle article source (existing logic)
                content = doc_data.get('content') or doc_data.get('summary') or doc_data.get('headline', '')
                if content:
                    context_texts.append(content[:1000])  # Limit each chunk

                    # Extract content snippet for preview (first 250 chars)
                    full_text = doc_data.get('content') or doc_data.get('full_text') or ''
                    summary = doc_data.get('summary') or ''
                    snippet_source = full_text if full_text else summary
                    snippet = snippet_source[:250].strip() if snippet_source else ''
                    # Add ellipsis if truncated
                    if snippet_source and len(snippet_source) > 250:
                        snippet += '...'

                    source_info = {
                        'id': doc_data.get('id'),  # Article ID for linking
                        'headline': doc_data.get('headline', 'Unknown'),
                        'source': doc_data.get('source', 'Unknown'),
                        'url': doc_data.get('url'),  # Article URL for citations
                        'published_at': doc_data.get('published_at'),  # Publication date
                        'snippet': snippet,  # Content preview snippet
                        'score': score,
                        'source_type': 'article'
                    }
                    if doc_data.get('tickers'):
                        source_info['tickers'] = doc_data.get('tickers')
                    if doc_data.get('sentiment'):
                        source_info['sentiment'] = doc_data.get('sentiment')
                    sources.append(source_info)
        
        # Get user context if user_id is provided
        user_context = ""
        if user_id:
            try:
                context_service = get_user_context_service()
                user_context = await context_service.format_context_for_prompt(
                    user_id=user_id,
                    days=7,
                    limit=50
                )
                if user_context and user_context != "No recent activity to reference.":
                    logging.info(f"[RAG] Retrieved user context for user {user_id}")
            except Exception as e:
                logging.warning(f"[RAG] Error retrieving user context: {e}")
        
        # Build the prompt with context (only if context exists)
        context_section = "\n\n---\n".join(context_texts) if context_texts else ""
        
        # Enhance system prompt with user context and markdown instruction
        enhanced_system_prompt = system_prompt
        if user_context and user_context != "No recent activity to reference.":
            enhanced_system_prompt = f"""{system_prompt}

## User's Recent Activity (Last 7 Days)
{user_context}

Use this context to personalize your response and reference what the user has been learning or viewing recently."""
        
        # Add markdown formatting instruction
        if enhanced_system_prompt:
            markdown_instruction = "\n\nIMPORTANT: Format your responses using Markdown. Use headers, lists, bold text, and code blocks where appropriate to make complex information clear and well-structured."
            enhanced_system_prompt = enhanced_system_prompt + markdown_instruction
        
        if context_texts:
            augmented_prompt = f"""Based on the following relevant information:

{context_section}

---

Please answer this question: {user_input}"""
            logging.info(f"[RAG] Using {len(context_texts)} context documents for response generation")
        else:
            augmented_prompt = user_input
            logging.info("[RAG] No context retrieved - generating response without RAG context")
        
        # If Azure OpenAI is configured, call it
        if self.azure_endpoint and self.azure_api_key:
            import httpx
            
            messages = [{"role": "system", "content": enhanced_system_prompt}] if enhanced_system_prompt else []
            
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
                            "max_tokens": 1000,
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
            if context_section:
                llm_response = "Azure OpenAI not configured. Here's the relevant context I found:\n\n" + context_section
            else:
                llm_response = "Azure OpenAI not configured. No context was retrieved from RAG."
        
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
    conversation_history: List[Dict] = None,
    user_id: Optional[str] = None
) -> Dict[str, Any]:
    """Run a RAG query."""
    return await get_rag_pipeline().query(
        user_input=user_input,
        system_prompt=system_prompt,
        conversation_history=conversation_history,
        user_id=user_id
    )
