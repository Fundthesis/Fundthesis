"""Azure OpenAI Embeddings Service for generating vector embeddings."""

import os
from typing import List, Optional
from openai import AzureOpenAI


class EmbeddingService:
    """Service for generating embeddings using Azure OpenAI."""
    
    def __init__(self):
        """Initialize Azure OpenAI client for embeddings."""
        # Extract base endpoint (remove /chat/completions?api-version=... if present)
        endpoint = os.getenv("AZURE_OPENAI_ENDPOINT", "").split("/chat/completions")[0].split("?")[0].rstrip("/")
        
        self.client = AzureOpenAI(
            api_key=os.getenv("AZURE_OPENAI_API_KEY"),
            api_version=os.getenv("AZURE_OPENAI_API_VERSION", "2024-12-01-preview"),
            azure_endpoint=endpoint
        )
        # Default to text-embedding-ada-002 (1536 dimensions)
        # If you have text-embedding-3-small, use that (384 dimensions - update schema!)
        self.deployment = os.getenv("AZURE_OPENAI_EMBEDDING_DEPLOYMENT", "text-embedding-ada-002")
        self.dimensions = 1536  # text-embedding-ada-002 dimensions
    
    async def generate_embedding(self, text: str) -> Optional[List[float]]:
        """
        Generate embedding for a single text.
        
        Args:
            text: Text to embed
            
        Returns:
            List of floats representing the embedding, or None if failed
        """
        if not text or not text.strip():
            return None
        
        try:
            response = self.client.embeddings.create(
                model=self.deployment,
                input=text
            )
            return response.data[0].embedding
        except Exception as e:
            print(f"Error generating embedding: {e}")
            return None
    
    async def generate_embeddings_batch(self, texts: List[str]) -> List[List[float]]:
        """
        Generate embeddings for multiple texts (batch).
        
        Args:
            texts: List of texts to embed
            
        Returns:
            List of embeddings (each is a list of floats)
        """
        if not texts:
            return []
        
        # Filter out empty texts
        valid_texts = [t for t in texts if t and t.strip()]
        if not valid_texts:
            return []
        
        try:
            response = self.client.embeddings.create(
                model=self.deployment,
                input=valid_texts
            )
            return [item.embedding for item in response.data]
        except Exception as e:
            print(f"Error generating batch embeddings: {e}")
            return []

