"""RAG API endpoint for AI Coach queries."""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional, Dict, Any

from rag.rag_pipeline import get_rag_pipeline

router = APIRouter()


class CoachMessage(BaseModel):
    """A message in the conversation."""
    role: str  # 'user' or 'coach'
    content: str


class CoachRequest(BaseModel):
    """Request body for coach queries."""
    message: str
    context: Optional[Dict[str, Any]] = None
    conversation_history: Optional[List[CoachMessage]] = None


class CoachResponse(BaseModel):
    """Response from the coach."""
    message: str
    citations: List[str]
    sources: Optional[List[Dict[str, Any]]] = None
    suggested_actions: Optional[List[str]] = None


# Socratic teaching system prompt
SYSTEM_PROMPT = """You are "The Editor" - an AI investment coach for FundThesis, an educational platform teaching retail investors.

Your teaching method:
- Use the Socratic method: guide users to discover answers themselves through questions
- Never give direct investment advice or stock picks
- Reference the provided context when relevant
- Keep responses concise (2-3 paragraphs max)
- Use a gentle, encouraging newspaper-editor tone
- Ask follow-up questions to deepen understanding

When answering, base your response on the context provided. If the context contains relevant information, reference it naturally in your response.

Remember: Your goal is education, not financial advice. Guide them to think critically about investments."""


@router.post("/coach", response_model=CoachResponse)
async def query_coach(request: CoachRequest):
    """
    Query the AI Coach with RAG-enhanced responses.
    
    Uses Cohere Embed-v4 for retrieval, Cohere Rerank for refinement,
    and Azure OpenAI for response generation.
    """
    try:
        # Get RAG pipeline
        pipeline = get_rag_pipeline()
        
        # Build context from request
        context = request.context or {}
        archetype = context.get('archetype', 'Not yet determined')
        rank = context.get('rank', 'Beginner')
        
        # Custom system prompt with user context
        custom_prompt = f"""{SYSTEM_PROMPT}

User context:
- Current archetype: {archetype}
- Knowledge rank: {rank}"""
        
        # Convert conversation history
        history = []
        if request.conversation_history:
            history = [
                {"role": msg.role, "content": msg.content}
                for msg in request.conversation_history
            ]
        
        # Run RAG query
        result = await pipeline.query(
            user_input=request.message,
            system_prompt=custom_prompt,
            conversation_history=history,
            include_sources=True
        )
        
        # Build citations from sources
        citations = []
        if result.get('sources'):
            for source in result['sources'][:3]:  # Top 3 sources
                headline = source.get('headline', 'Unknown')
                src = source.get('source', 'Unknown')
                citations.append(f"{headline} ({src})")
        
        # If no citations from RAG, add default module reference
        if not citations:
            citations = ["Module 1: Introduction to FundThesis"]
        
        # Suggested actions based on query
        suggested = get_suggested_actions(request.message)
        
        return CoachResponse(
            message=result.get('response', 'I apologize, but I had trouble processing your question.'),
            citations=citations,
            sources=result.get('sources', []),
            suggested_actions=suggested
        )
        
    except Exception as e:
        print(f"Error in coach query: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")


def get_suggested_actions(query: str) -> List[str]:
    """Get suggested actions based on the query content."""
    query_lower = query.lower()
    
    if any(word in query_lower for word in ['buy', 'sell', 'trade', 'order']):
        return ['Practice in the Sandbox', 'Review Module 3: Buying vs Selling']
    if any(word in query_lower for word in ['chart', 'graph', 'pattern', 'technical']):
        return ['Study chart patterns', 'Review Module 8: Reading a Graph']
    if any(word in query_lower for word in ['research', 'analys', 'company', 'earnings']):
        return ['Research a company', 'Review Module 6: Company Research']
    if any(word in query_lower for word in ['volatil', 'risk', 'beta', 'market']):
        return ['Review the volatility section', 'Try a practice mission']
    if any(word in query_lower for word in ['portfolio', 'diversif', 'allocation']):
        return ['Explore the Portfolio mission', 'Review Module 4: Portfolio Basics']
    if any(word in query_lower for word in ['esg', 'sustainable', 'environment', 'climate']):
        return ['Review ESG investing', 'Review Module 9: Sustainability Factors']
    
    return ['Explore a mission', 'Continue learning']
