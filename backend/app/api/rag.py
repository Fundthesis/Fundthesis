"""RAG API endpoint for AI Coach queries."""

import logging
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional, Dict, Any

from rag.rag_pipeline import get_rag_pipeline
from rag.vector_search import VectorSearchService
from services.user_context_service import get_user_context_service

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

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
    userId: Optional[str] = None  # Optional user ID for personalized context


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

When answering, base your response on the context provided. If the context contains relevant information, reference it naturally in your response. If no relevant context was found in our database, you can still provide educational guidance based on your knowledge, but acknowledge that you're drawing from general knowledge rather than recent articles from our database.

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
        
        # Track coach query as interaction if userId is provided
        if request.userId:
            try:
                context_service = get_user_context_service()
                await context_service.track_interaction(
                    user_id=request.userId,
                    content_type='coach_query',
                    content_id=None,
                    metadata={
                        'query': request.message[:200]  # Store first 200 chars of query
                    }
                )
            except Exception as e:
                print(f"Error tracking coach query: {e}")
                # Continue even if tracking fails
        
        # Convert conversation history
        history = []
        if request.conversation_history:
            history = [
                {"role": msg.role, "content": msg.content}
                for msg in request.conversation_history
            ]
        
        # Run RAG query with user_id for personalized context
        result = await pipeline.query(
            user_input=request.message,
            system_prompt=custom_prompt,
            conversation_history=history,
            include_sources=True,
            user_id=request.userId
        )
        
        # Build citations from sources with URLs (for backward compatibility)
        citations = []
        formatted_sources = []
        
        if result.get('sources'):
            for source in result['sources'][:5]:  # Top 5 sources for rich display
                source_type = source.get('source_type', 'article')
                headline = source.get('headline', 'Unknown')
                src = source.get('source', 'Unknown')
                url = source.get('url')
                published_at = source.get('published_at')
                snippet = source.get('snippet', '')

                # Format citation with URL if available (for backward compatibility)
                if url:
                    citation = f"[{headline}]({url}) - {src}"
                else:
                    citation = f"{headline} ({src})"

                # Add publication date if available (only for articles)
                if published_at and source_type == 'article':
                    # Parse date if it's a string
                    if isinstance(published_at, str):
                        try:
                            from datetime import datetime
                            dt = datetime.fromisoformat(published_at.replace('Z', '+00:00'))
                            date_str = dt.strftime('%b %d, %Y')
                            citation += f" - {date_str}"
                        except:
                            pass

                citations.append(citation)
                
                # Format source for rich display with all metadata
                formatted_source = {
                    'id': source.get('id'),
                    'headline': headline,
                    'source': src,
                    'url': url,
                    'publishedAt': published_at,
                    'snippet': snippet,
                    'score': source.get('score'),
                    'sourceType': source_type,  # 'article' or 'module'
                }
                
                # Add article-specific fields
                if source_type == 'article':
                    if source.get('tickers'):
                        formatted_source['tickers'] = source.get('tickers')
                    if source.get('sentiment'):
                        formatted_source['sentiment'] = source.get('sentiment')
                
                # Add module-specific fields
                if source_type == 'module':
                    formatted_source['moduleNumber'] = source.get('module_number')
                    formatted_source['sectionHeading'] = source.get('section_heading')
                    formatted_source['chunkType'] = source.get('chunk_type')
                
                formatted_sources.append(formatted_source)
        
        # Suggested actions based on query
        suggested = get_suggested_actions(request.message)
        
        return CoachResponse(
            message=result.get('response', 'I apologize, but I had trouble processing your question.'),
            citations=citations,
            sources=formatted_sources if formatted_sources else None,
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


@router.get("/rag/health")
async def rag_health():
    """
    Health check endpoint for RAG system.

    Verifies:
    - pgvector extension is installed
    - Embedding service is configured
    - Vector search is operational
    """
    try:
        vector_service = VectorSearchService()

        # Check pgvector extension
        pgvector_status = await vector_service.verify_pgvector_extension()

        # Check if embedding service is configured
        from rag.embeddings import get_embed_service
        embed_service = get_embed_service()
        embeddings_configured = bool(embed_service.endpoint and embed_service.api_key)

        # Overall status
        healthy = pgvector_status.get("installed", False)

        return {
            "status": "healthy" if healthy else "degraded",
            "pgvector": pgvector_status,
            "embeddings_configured": embeddings_configured,
            "message": "RAG system is operational" if healthy else "pgvector extension not installed"
        }

    except Exception as e:
        logging.error(f"[RAG API] Health check failed: {e}")
        return {
            "status": "unhealthy",
            "error": str(e),
            "message": "RAG system health check failed"
        }
