"""Azure OpenAI Embedding Service for generating vector embeddings.

Uses Azure AI Foundry with OpenAI-compatible API for embeddings.
"""

import os
import httpx
from typing import List, Optional
import logging

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')


class EmbeddingService:
    """Service for generating embeddings using Azure OpenAI-compatible API."""

    def __init__(self):
        """Initialize embedding client."""
        # Azure AI Foundry OpenAI-compatible endpoint
        # Format: https://fundthesis.services.ai.azure.com/openai/v1/
        self.endpoint = os.getenv("AZURE_EMBED_ENDPOINT")
        self.api_key = os.getenv("AZURE_EMBED_KEY")
        self.model_name = os.getenv("AZURE_EMBED_MODEL_NAME", "RagEmbed")
        self.dimensions = 1536  # OpenAI ada-002 default

        # Log the actual values from environment (for debugging Azure vs local)
        logging.info(f"[Embeddings] INIT - Endpoint from env: '{self.endpoint}'")
        logging.info(f"[Embeddings] INIT - Model name from env: '{self.model_name}'")
        logging.info(f"[Embeddings] INIT - Has API key: {bool(self.api_key)}")

        if not self.endpoint or not self.api_key:
            logging.warning("Embed credentials not configured (AZURE_EMBED_ENDPOINT, AZURE_EMBED_KEY)")

    async def generate_embedding(self, text: str, input_type: str = "search_document") -> Optional[List[float]]:
        """
        Generate embedding for a single text.

        Args:
            text: Text to embed
            input_type: Ignored for OpenAI API (kept for compatibility)

        Returns:
            List of floats representing the embedding, or None if failed
        """
        if not text or not text.strip():
            return None

        embeddings = await self.generate_embeddings_batch([text], input_type)
        return embeddings[0] if embeddings else None

    async def generate_embeddings_batch(
        self,
        texts: List[str],
        input_type: str = "search_document"
    ) -> List[Optional[List[float]]]:
        """
        Generate embeddings for multiple texts in batch.

        Args:
            texts: List of texts to embed
            input_type: Ignored for OpenAI API (kept for compatibility)

        Returns:
            List of embeddings (each is a list of floats)
        """
        # VERSION v2.2 - Simplified URL construction for Azure
        logging.info("=" * 60)
        logging.info("[Embeddings] VERSION v2.2 - generate_embeddings_batch")
        logging.info("=" * 60)
        
        if not texts:
            return []

        if not self.endpoint or not self.api_key:
            logging.warning("Embed credentials not configured - RAG operating without context retrieval")
            return [None] * len(texts)

        # Filter out empty texts, keep track of indices
        valid_texts = []
        valid_indices = []
        for i, text in enumerate(texts):
            if text and text.strip():
                # Truncate to ~8000 chars to stay within limits
                valid_texts.append(text.strip()[:8000])
                valid_indices.append(i)

        if not valid_texts:
            return [None] * len(texts)

        try:
            # OpenAI-compatible endpoint format
            # The endpoint should be: https://fundthesis.services.ai.azure.com/openai/v1
            # We need to construct: https://fundthesis.services.ai.azure.com/openai/v1/embeddings
            # The model name (RagEmbed) goes in the JSON body, NOT in the URL
            
            endpoint_raw = self.endpoint.rstrip('/')
            
            # Extract the base domain - everything before /openai/v1 or /models
            # This handles all cases:
            # - https://fundthesis.services.ai.azure.com/openai/v1
            # - https://fundthesis.services.ai.azure.com/openai/v1/RagEmbed
            # - https://fundthesis.services.ai.azure.com/models/RagEmbed
            if '/openai/v1' in endpoint_raw:
                # Split on /openai/v1 and take only the base domain part
                base_domain = endpoint_raw.split('/openai/v1')[0]
            elif '/models' in endpoint_raw:
                # Split on /models and take only the base domain part
                base_domain = endpoint_raw.split('/models')[0]
            else:
                # If neither found, use as-is (shouldn't happen but be safe)
                base_domain = endpoint_raw
            
            # Always construct the URL as: {base_domain}/openai/v1/embeddings
            url = f"{base_domain}/openai/v1/embeddings"
            
            logging.info(f"[Embeddings] Raw endpoint from env: '{self.endpoint}'")
            logging.info(f"[Embeddings] Extracted base domain: '{base_domain}'")
            logging.info(f"[Embeddings] Final URL: '{url}'")
            logging.info(f"[Embeddings] Model name in JSON body: '{self.model_name}'")

            async with httpx.AsyncClient(timeout=120.0) as client:
                response = await client.post(
                    url,
                    headers={
                        "Authorization": f"Bearer {self.api_key}",
                        "Content-Type": "application/json",
                    },
                    json={
                        "input": valid_texts,
                        "model": self.model_name
                    }
                )

                if response.status_code != 200:
                    logging.error(f"Embed API error: {response.status_code} - {response.text[:500]}")
                    return [None] * len(texts)

                data = response.json()

                # OpenAI format: {"data": [{"embedding": [...], "index": 0}, ...]}
                embeddings_list = data.get("data", [])

                if not embeddings_list:
                    logging.error(f"No embeddings in response: {data}")
                    return [None] * len(texts)

                # Sort by index to ensure correct order
                embeddings_list.sort(key=lambda x: x.get("index", 0))

                raw_embeddings = [item.get("embedding") for item in embeddings_list]

                # Map results back to original indices
                result: List[Optional[List[float]]] = [None] * len(texts)
                for idx, embedding in zip(valid_indices, raw_embeddings):
                    result[idx] = embedding

                logging.info(f"Generated {len(raw_embeddings)} embeddings using Azure OpenAI")
                return result

        except Exception as e:
            logging.error(f"Error calling Embed API: {e}")
            return [None] * len(texts)

    async def embed_query(self, query: str) -> Optional[List[float]]:
        """
        Generate embedding for a search query.
        """
        return await self.generate_embedding(query, input_type="search_query")

    async def embed_document(self, text: str) -> Optional[List[float]]:
        """
        Generate embedding for a document to be indexed.
        """
        return await self.generate_embedding(text, input_type="search_document")


# Singleton instance
_embed_service: Optional[EmbeddingService] = None


def get_embed_service() -> EmbeddingService:
    """Get or create the embedding service singleton."""
    global _embed_service
    if _embed_service is None:
        _embed_service = EmbeddingService()
    return _embed_service


# Convenience functions for backward compatibility
async def embed_text(text: str) -> Optional[List[float]]:
    """Generate embedding for a single text (for indexing)."""
    return await get_embed_service().embed_document(text)


async def embed_query(query: str) -> Optional[List[float]]:
    """Generate embedding for a search query."""
    return await get_embed_service().embed_query(query)


async def embed_documents(texts: List[str]) -> List[Optional[List[float]]]:
    """Generate embeddings for multiple documents."""
    return await get_embed_service().generate_embeddings_batch(texts, input_type="search_document")
