"""Query translation services for improving retrieval quality."""

import re
from typing import List, Optional, Dict
from .llm import LLMClient


class QueryTranslationService:
    """Service for translating queries to improve retrieval."""
    
    def __init__(self):
        """Initialize query translation service."""
        self.llm = LLMClient(temperature=0.3)  # Lower temperature for more deterministic augmentation
    
    async def augment_query(self, query: str, context: Optional[str] = None) -> str:
        """
        Augment a query to be more specific and complete.
        
        Based on Azure RAG best practices - expands vague queries with context.
        
        Args:
            query: Original user query
            context: Optional context (e.g., current module, portfolio state)
            
        Returns:
            Augmented query
        """
        if not query or not query.strip():
            return query
        
        system_prompt = """You are a query augmentation assistant for a financial education platform. 
Your role is to expand vague or incomplete queries to be more specific and searchable, while maintaining the original intent.

Guidelines:
- Add relevant financial terminology and synonyms
- Include domain-specific context when appropriate
- Maintain the original question's intent
- Don't change the core meaning
- If context is provided, use it to make the query more specific"""

        user_prompt = f"""Expand and enhance the following query to make it more effective for semantic search in a financial education knowledge base.

Original Query: {query}

{f"Context: {context}" if context else ""}

Provide an augmented version that:
1. Includes relevant synonyms and related terms
2. Adds financial domain context if needed
3. Maintains the original intent
4. Is optimized for both keyword and semantic search

Augmented Query:"""

        try:
            augmented = await self.llm.a_call(user_prompt, system_prompt=system_prompt)
            # Clean up the response (remove quotes, extra text)
            augmented = augmented.strip().strip('"').strip("'")
            # If LLM added explanation, extract just the query
            if ":" in augmented and len(augmented.split(":")) > 1:
                # Try to extract the query part
                parts = augmented.split(":")
                if len(parts) > 1:
                    augmented = parts[-1].strip()
            return augmented[:500]  # Limit length
        except Exception as e:
            print(f"Error augmenting query: {e}")
            return query  # Return original on error
    
    async def decompose_query(self, query: str) -> Dict[str, any]:
        """
        Decompose a complex query into simpler subqueries.
        
        Based on Azure RAG best practices for multi-part questions.
        
        Args:
            query: Complex query to decompose
            
        Returns:
            Dictionary with 'type' ('simple' or 'complex') and 'queries' (list of subqueries)
        """
        system_prompt = """You are a query analysis assistant. Analyze queries to determine if they are simple or complex, and if complex, break them into subqueries.

A simple query:
- Asks for a single piece of information
- Can be answered from one source
- Doesn't require multiple searches

A complex query:
- Has multiple parts or components
- Requires information from multiple sources
- Needs synthesis of different concepts

Respond in JSON format only."""

        user_prompt = f"""Analyze this query and determine if it's simple or complex. If complex, break it into subqueries.

Query: {query}

Respond in this JSON format:
{{
  "type": "simple" or "complex",
  "queries": ["subquery1", "subquery2"] (only if complex, otherwise just the original query)
}}"""

        try:
            response = await self.llm.a_call(user_prompt, system_prompt=system_prompt)
            # Try to parse JSON from response
            import json
            # Extract JSON from response (might have extra text)
            json_match = re.search(r'\{[^}]+\}', response, re.DOTALL)
            if json_match:
                result = json.loads(json_match.group())
                if result.get('type') == 'complex' and 'queries' in result:
                    return {
                        'type': 'complex',
                        'queries': result['queries']
                    }
                else:
                    return {
                        'type': 'simple',
                        'queries': [query]
                    }
            return {'type': 'simple', 'queries': [query]}
        except Exception as e:
            print(f"Error decomposing query: {e}")
            return {'type': 'simple', 'queries': [query]}
    
    async def rewrite_for_search(self, query: str) -> str:
        """
        Rewrite query to optimize for both keyword and semantic search.
        
        Based on Azure RAG best practices.
        
        Args:
            query: Original query
            
        Returns:
            Rewritten query optimized for search
        """
        system_prompt = """You are a query optimization assistant. Rewrite queries to be effective for both keyword-based and semantic similarity search.

Include:
- Core keywords that might appear in documents
- Synonyms and related terms
- Domain-specific terminology
- Natural language phrasing for semantic search"""

        user_prompt = f"""Rewrite this query to optimize it for both keyword-based and semantic-similarity search:

Original Query: {query}

Rewritten Query:"""

        try:
            rewritten = await self.llm.a_call(user_prompt, system_prompt=system_prompt)
            rewritten = rewritten.strip().strip('"').strip("'")
            # Extract just the query if LLM added explanation
            if ":" in rewritten:
                parts = rewritten.split(":")
                if len(parts) > 1:
                    rewritten = parts[-1].strip()
            return rewritten[:500]
        except Exception as e:
            print(f"Error rewriting query: {e}")
            return query
