"""Azure OpenAI LLM client wrapper for the rag module."""

import os
import asyncio
from typing import Optional
from openai import AzureOpenAI


class LLMClient:
    """Azure OpenAI client wrapper for chat completions.

    Methods:
      - chat(prompt: str) -> str : synchronous wrapper
      - a_call(prompt: str) -> str : async wrapper
    """

    def __init__(self, deployment: Optional[str] = None, temperature: float = 0.7):
        """Initialize Azure OpenAI client.
        
        Args:
            deployment: Deployment name (defaults to AZURE_OPENAI_DEPLOYMENT_NAME)
            temperature: Temperature for generation (0.0-1.0)
        """
        # Extract base endpoint (remove /chat/completions?api-version=... if present)
        endpoint = os.getenv("AZURE_OPENAI_ENDPOINT", "").split("/chat/completions")[0].split("?")[0].rstrip("/")
        
        self.client = AzureOpenAI(
            api_key=os.getenv("AZURE_OPENAI_API_KEY"),
            api_version=os.getenv("AZURE_OPENAI_API_VERSION", "2024-12-01-preview"),
            azure_endpoint=endpoint
        )
        self.deployment = deployment or os.getenv("AZURE_OPENAI_DEPLOYMENT_NAME", "PrimaryParser")
        self.temperature = temperature

    def chat(self, prompt: str, system_prompt: Optional[str] = None) -> str:
        """Synchronous chat wrapper.

        Args:
            prompt: User prompt
            system_prompt: Optional system prompt
            
        Returns:
            Generated response text
        """
        try:
            messages = []
            if system_prompt:
                messages.append({"role": "system", "content": system_prompt})
            messages.append({"role": "user", "content": prompt})
            
            response = self.client.chat.completions.create(
                model=self.deployment,
                messages=messages,
                temperature=self.temperature
            )
            return response.choices[0].message.content or ""
        except Exception as e:
            print(f"Error in LLM chat: {e}")
            return f"[Error: Failed to generate response]"

    async def a_call(self, prompt: str, system_prompt: Optional[str] = None) -> str:
        """Async wrapper for chat completions.

        Args:
            prompt: User prompt
            system_prompt: Optional system prompt
            
        Returns:
            Generated response text
        """
        try:
            # Run blocking call in thread to avoid blocking event loop
            def _call():
                messages = []
                if system_prompt:
                    messages.append({"role": "system", "content": system_prompt})
                messages.append({"role": "user", "content": prompt})
                
                response = self.client.chat.completions.create(
                    model=self.deployment,
                    messages=messages,
                    temperature=self.temperature
                )
                return response.choices[0].message.content or ""
            
            return await asyncio.to_thread(_call)
        except Exception as e:
            print(f"Error in async LLM call: {e}")
            return f"[Error: Failed to generate response]"


__all__ = ["LLMClient"]

