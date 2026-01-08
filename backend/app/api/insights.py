"""API routes for generating market insights using LangChain."""
import sys
from pathlib import Path
from fastapi import APIRouter, HTTPException
from datetime import datetime, timedelta, timezone

# Add backend to path
backend_path = Path(__file__).parent.parent.parent
if str(backend_path) not in sys.path:
    sys.path.insert(0, str(backend_path))

from app.core.database import db
from rag.rag import RAG

router = APIRouter()

# Initialize RAG instance
rag = RAG()


async def get_recent_articles(limit: int = 50, hours: int = 24) -> list:
    """Fetch recent articles from DB for analysis."""
    if not db.is_connected():
        await db.connect()
        
    try:
        time_threshold = datetime.now(timezone.utc) - timedelta(hours=hours)
        
        articles = await db.article.find_many(
            where={'published_at': {'gte': time_threshold}},
            order={'published_at': 'desc'},
            take=limit
        )
        
        return [a.model_dump() for a in articles] if articles else []
    except Exception as e:
        print(f"Error fetching articles: {e}")
        return []


def format_articles_for_prompt(articles: list) -> str:
    """Format articles into a readable string for the LLM prompt."""
    if not articles:
        return "No recent articles available."
    
    formatted = []
    for article in articles:
        headline = article.get("headline", "No headline")
        summary = article.get("summary", "")
        sentiment = article.get("label", "neutral")
        source = article.get("source", "Unknown")
        tickers = article.get("tickers", "")
        
        formatted.append(
            f"Headline: {headline}\n"
            f"Summary: {summary[:200] if summary else 'No summary'}\n"
            f"Sentiment: {sentiment}\n"
            f"Source: {source}\n"
            f"Tickers: {tickers}\n"
            f"---"
        )
    
    return "\n".join(formatted)


@router.get("/insights/market-summary")
async def get_market_summary():
    """Generate a market summary using LangChain based on recent articles."""
    try:
        articles = await get_recent_articles(limit=30, hours=24)
        
        if not articles:
            return {
                "summary": "No recent market news available. Please check back later for market updates.",
                "generated_at": datetime.now(timezone.utc).isoformat()
            }
        
        articles_text = format_articles_for_prompt(articles)
        
        prompt = f"""Based on the following recent financial news articles, provide a concise market summary (2-3 sentences) that highlights:
1. Overall market trends and momentum
2. Key sectors or stocks showing significant movement
3. Notable market sentiment

Recent Articles:
{articles_text}

Provide a clear, professional market summary:"""

        summary = await rag.a_call(prompt)
        
        return {
            "summary": summary.strip(),
            "articles_analyzed": len(articles),
            "generated_at": datetime.now(timezone.utc).isoformat()
        }
    except Exception as e:
        print(f"Error generating market summary: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to generate market summary: {str(e)}")


@router.get("/insights/ai-recommendations")
async def get_ai_recommendations():
    """Generate AI-powered investment recommendations using LangChain based on recent articles."""
    try:
        articles = await get_recent_articles(limit=30, hours=24)
        
        if not articles:
            return {
                "recommendations": "Insufficient market data available. Please check back later for investment recommendations.",
                "generated_at": datetime.now(timezone.utc).isoformat()
            }
        
        articles_text = format_articles_for_prompt(articles)
        
        prompt = f"""Based on the following recent financial news articles, provide personalized investment recommendations (2-3 sentences) that include:
1. Portfolio diversification suggestions
2. Sectors or themes to consider
3. Risk considerations

Recent Articles:
{articles_text}

Provide clear, actionable investment recommendations:"""

        recommendations = await rag.a_call(prompt)
        
        return {
            "recommendations": recommendations.strip(),
            "articles_analyzed": len(articles),
            "generated_at": datetime.now(timezone.utc).isoformat()
        }
    except Exception as e:
        print(f"Error generating AI recommendations: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to generate AI recommendations: {str(e)}")


@router.get("/insights/both")
async def get_both_insights():
    """Get both market summary and AI recommendations in one call."""
    try:
        market_summary = await get_market_summary()
        ai_recommendations = await get_ai_recommendations()
        
        return {
            "market_summary": market_summary["summary"],
            "ai_recommendations": ai_recommendations["recommendations"],
            "articles_analyzed": market_summary.get("articles_analyzed", 0),
            "generated_at": datetime.now(timezone.utc).isoformat()
        }
    except Exception as e:
        print(f"Error generating insights: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to generate insights: {str(e)}")

