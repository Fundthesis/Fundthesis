"""Sentiment analysis API endpoints for heat map visualization."""
import sys
from pathlib import Path
from fastapi import APIRouter, HTTPException, Query, Depends
from typing import Optional, Dict, List, Any, Tuple
from datetime import datetime, timedelta
import time
import traceback
import asyncio

# Add backend to path
backend_path = Path(__file__).parent.parent.parent
if str(backend_path) not in sys.path:
    sys.path.insert(0, str(backend_path))

from app.core.database import db
from app.api.dependencies import get_optional_user

# Lazy import for sentiment analysis (optional dependency)
def get_sentiment_analyzer():
    """Get sentiment analyzer function, with fallback if transformers not installed."""
    try:
        from jobs.sentiment.finbert import analyze_sentiment
        return analyze_sentiment
    except ImportError:
        print("⚠️  transformers not installed - sentiment analysis will return neutral")
        def fallback_analyzer(text: str) -> str:
            return 'neutral'
        return fallback_analyzer

router = APIRouter()

# Simple in-memory cache with TTL
_cache: Dict[str, Tuple[float, Any]] = {}
HEATMAP_CACHE_TTL_SECONDS = 900  # Cache for 15 minutes


def get_cached(key: str, ttl: int) -> Optional[Any]:
    """Get cached value if not expired."""
    if key in _cache:
        timestamp, value = _cache[key]
        if time.time() - timestamp < ttl:
            return value
        else:
            del _cache[key]
    return None


def set_cached(key: str, value: Any):
    """Set cached value with current timestamp."""
    _cache[key] = (time.time(), value)


def sentiment_to_score(sentiment: str) -> float:
    """Convert sentiment label to numeric score (-1 to 1)."""
    sentiment_lower = sentiment.lower()
    if sentiment_lower == 'positive':
        return 1.0
    elif sentiment_lower == 'negative':
        return -1.0
    else:
        return 0.0


@router.get("/sentiment/heatmap")
async def get_sentiment_heatmap(
    timeframe: str = Query(default="1d", description="Timeframe: 1d, 1w, 1m"),
    sectors: Optional[str] = Query(default=None, description="Comma-separated list of sectors"),
    user=Depends(get_optional_user)
):
    """
    Aggregate sentiment scores by company from news articles.
    Returns heat map data with sentiment scores for visualization.
    """
    # Check cache first
    cache_key = f"sentiment_heatmap_{timeframe}_{sectors or ''}"
    cached_result = get_cached(cache_key, HEATMAP_CACHE_TTL_SECONDS)
    if cached_result:
        print(f"✅ Cache hit for sentiment heatmap")
        return cached_result
    
    try:
        # Calculate date range based on timeframe with fallback
        now = datetime.now()
        if timeframe == "1d":
            start_date = now - timedelta(days=1)
            fallback_start = now - timedelta(days=2)
        elif timeframe == "1w":
            start_date = now - timedelta(weeks=1)
            fallback_start = now - timedelta(days=10)
        elif timeframe == "1m":
            start_date = now - timedelta(days=30)
            fallback_start = now - timedelta(days=35)
        else:
            start_date = now - timedelta(days=1)
            fallback_start = now - timedelta(days=2)
        
        print(f"📊 Fetching sentiment heatmap data for timeframe: {timeframe}")
        
        # Query articles from database
        # Note: Use model field name (publishedAt), not DB column name (published_at)
        where_clause = {
            'publishedAt': {
                'gte': start_date
            }
        }
        
        # Filter by sectors if provided (would need sector mapping in articles)
        # For now, we'll filter by tickers mentioned in articles
        
        # Prisma Python doesn't support 'select' parameter - returns all fields by default
        articles = await db.article.find_many(
            where=where_clause,
            take=1000  # Limit to recent articles for performance
        )
        
        # If insufficient articles (< 50), use fallback range
        if len(articles) < 50:
            print(f"⚠️ Only {len(articles)} articles found, using fallback range")
            fallback_where_clause = {
                'publishedAt': {
                    'gte': fallback_start
                }
            }
            articles = await db.article.find_many(
                where=fallback_where_clause,
                take=1000
            )
            print(f"✅ Found {len(articles)} articles with fallback range")
        else:
            print(f"✅ Found {len(articles)} articles")
        
        # Aggregate sentiment by ticker
        ticker_sentiments: Dict[str, List[float]] = {}
        ticker_counts: Dict[str, int] = {}
        
        for article in articles:
            # Get sentiment from article label or analyze if not present
            sentiment_score = 0.0
            
            # Access Prisma model attributes (Prisma Python uses attribute access)
            article_label = article.label if article.label else None
            if article_label:
                sentiment_score = sentiment_to_score(str(article_label))
            else:
                # Analyze sentiment if not already stored (run CPU-bound work in thread pool)
                text = (article.summary if article.summary else "") or (article.headline if article.headline else "")
                if text:
                    analyze_sentiment = get_sentiment_analyzer()
                    # Run CPU-bound sentiment analysis in thread pool to avoid blocking
                    sentiment_label = await asyncio.to_thread(analyze_sentiment, str(text))
                    sentiment_score = sentiment_to_score(sentiment_label)
            
            # Extract tickers from article
            tickers_str = article.tickers if article.tickers else None
            if tickers_str:
                tickers = [t.strip().upper() for t in str(tickers_str).split(',') if t.strip()]
                
                for ticker in tickers:
                    if ticker not in ticker_sentiments:
                        ticker_sentiments[ticker] = []
                        ticker_counts[ticker] = 0
                    
                    ticker_sentiments[ticker].append(sentiment_score)
                    ticker_counts[ticker] += 1
        
        # Calculate average sentiment per ticker
        heatmap_data = []
        for ticker, scores in ticker_sentiments.items():
            if len(scores) > 0:
                avg_sentiment = sum(scores) / len(scores)
                heatmap_data.append({
                    'ticker': ticker,
                    'sentiment': avg_sentiment,
                    'sentimentLabel': 'positive' if avg_sentiment > 0.1 else 'negative' if avg_sentiment < -0.1 else 'neutral',
                    'articleCount': ticker_counts[ticker],
                    'score': round(avg_sentiment, 3)
                })
        
        # Sort by sentiment score (most positive first)
        heatmap_data.sort(key=lambda x: x['sentiment'], reverse=True)
        
        result = {
            'timeframe': timeframe,
            'data': heatmap_data,
            'total': len(heatmap_data),
            'timestamp': datetime.now().isoformat()
        }
        
        # Cache the result
        set_cached(cache_key, result)
        
        print(f"✅ Generated heatmap with {len(heatmap_data)} tickers")
        return result
        
    except Exception as e:
        print(f"❌ Error generating sentiment heatmap: {e}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

