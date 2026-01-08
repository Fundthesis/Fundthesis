"""Rerank Service for improving search result relevance using Cohere Rerank."""

import os
import httpx
from typing import List, Dict, Optional


class RerankService:
    """Service for reranking search results using Cohere Rerank via Azure AI Foundry."""
    
    def __init__(self):
        """Initialize rerank service."""
        self.endpoint = os.getenv("AZURE_RERANK_ENDPOINT")
        self.api_key = os.getenv("AZURE_RERANK_KEY")
        self.model_name = os.getenv("AZURE_RERANK_MODEL_NAME", "RagRank")
        if not self.endpoint or not self.api_key:
            print("Warning: AZURE_RERANK_ENDPOINT or AZURE_RERANK_KEY not set. Reranking will be skipped.")
            self.is_enabled = False
        else:
            self.is_enabled = True
    
    async def rerank(
        self,
        query: str,
        documents: List[Dict],
        top_n: Optional[int] = None
    ) -> List[Dict]:
        """
        Rerank documents based on query relevance.
        
        Args:
            query: Search query
            documents: List of document dictionaries
            top_n: Number of top results to return (default: all)
            
        Returns:
            Reranked list of documents with rerank_score added
        """
        if not self.is_enabled or not documents:
            return documents
        
        try:
            # Extract text content from documents
            doc_texts = []
            for doc in documents:
                # Prefer summary, fallback to content/full_text
                text = doc.get('summary') or doc.get('content') or doc.get('full_text') or doc.get('headline', '')
                if text:
                    doc_texts.append(text[:1000])  # Limit length for rerank API
                else:
                    doc_texts.append("")
            
            if not doc_texts or all(not t for t in doc_texts):
                return documents
            
            # Prepare request for Azure AI Foundry Cohere Rerank
            # Format: POST to endpoint with query and documents
            payload = {
                "model": self.model_name,
                "query": query,
                "documents": doc_texts,
                "top_n": top_n or len(doc_texts)
            }
            
            headers = {
                "Content-Type": "application/json",
                "api-key": self.api_key
            }
            
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(
                    self.endpoint,
                    json=payload,
                    headers=headers
                )
                response.raise_for_status()
                result = response.json()
            
            # Cohere rerank returns results with index and relevance_score
            # Format: {"results": [{"index": 0, "relevance_score": 0.95}, ...]}
            if "results" in result:
                reranked_indices = {r["index"]: r.get("relevance_score", 0.0) for r in result["results"]}
                
                # Add rerank_score to documents and reorder
                reranked_docs = []
                for idx, doc in enumerate(documents):
                    if idx in reranked_indices:
                        doc_copy = doc.copy()
                        doc_copy['rerank_score'] = reranked_indices[idx]
                        reranked_docs.append(doc_copy)
                
                # Sort by rerank_score descending
                reranked_docs.sort(key=lambda x: x.get('rerank_score', 0), reverse=True)
                
                return reranked_docs[:top_n] if top_n else reranked_docs
            
            return documents
        except Exception as e:
            print(f"Error in rerank: {e}")
            return documents
