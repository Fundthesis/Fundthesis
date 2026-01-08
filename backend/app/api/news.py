"""News API endpoints."""
from fastapi import APIRouter, HTTPException, Query
from datetime import datetime, timezone, timedelta
from typing import List

from app.core.database import db
from lib.tickers import extract_tickers_from_text

router = APIRouter()


def generate_recommendation(article: dict) -> str:
    """
    Generate Buy/Hold/Sell recommendation based on sentiment and article content.
    """
    sentiment = article.get('label', '').lower() if article.get('label') else 'neutral'
    
    # Keywords that suggest strong positive/negative signals
    positive_keywords = ['surge', 'rally', 'gain', 'beat', 'exceed', 'growth', 'profit', 
                        'earnings', 'upgrade', 'bullish', 'outperform', 'buy', 'strong']
    negative_keywords = ['plunge', 'drop', 'fall', 'miss', 'decline', 'loss', 'downgrade',
                        'bearish', 'underperform', 'sell', 'weak', 'concern', 'warning']
    
    headline = (article.get('headline') or '').lower()
    summary = (article.get('summary') or '').lower()
    text = headline + ' ' + summary
    
    positive_count = sum(1 for word in positive_keywords if word in text)
    negative_count = sum(1 for word in negative_keywords if word in text)
    
    # Determine recommendation
    if sentiment == 'positive' and positive_count >= 2:
        return 'Buy'
    elif sentiment == 'negative' and negative_count >= 2:
        return 'Sell'
    elif sentiment == 'positive' and positive_count >= 1:
        return 'Buy'
    elif sentiment == 'negative' and negative_count >= 1:
        return 'Sell'
    elif sentiment == 'positive':
        return 'Hold'
    elif sentiment == 'negative':
        return 'Hold'
    else:
        return 'Hold'


@router.get("/news/recent")
async def get_recent_news():
    """Get recent financial news articles from the past 24 hours."""
    if not db.is_connected():
        await db.connect()
    
    try:
        twenty_four_hours_ago = datetime.now(timezone.utc) - timedelta(hours=24)
        
        articles = await db.article.find_many(
            where={'publishedAt': {'gte': twenty_four_hours_ago}},
            order={'publishedAt': 'desc'},
            take=100
        )
        
        # Fallback to longer timeframes if no recent articles
        if not articles:
            forty_eight_hours_ago = datetime.now(timezone.utc) - timedelta(hours=48)
            articles = await db.article.find_many(
                where={'publishedAt': {'gte': forty_eight_hours_ago}},
                order={'publishedAt': 'desc'},
                take=100
            )
        
        if not articles:
            seven_days_ago = datetime.now(timezone.utc) - timedelta(days=7)
            articles = await db.article.find_many(
                where={'publishedAt': {'gte': seven_days_ago}},
                order={'publishedAt': 'desc'},
                take=100
            )
        
        if not articles:
            articles = await db.article.find_many(
                order={'publishedAt': 'desc'},
                take=20
            )
        
        if not articles:
            return {"articles": [], "count": 0}
        
        articles_with_tickers = []
        
        for article_obj in articles:
            article = article_obj.model_dump()
            
            # Get tickers from database
            tickers_str = article.get('tickers', '')
            tickers = tickers_str.split(',') if tickers_str else []
            
            # Extract if not stored
            if not tickers:
                headline = article.get('headline', '') or ''
                summary = article.get('summary', '') or ''
                full_text = article.get('fullText', '') or ''
                full_text_snippet = full_text[:500] if full_text else ''
                combined_text = f"{headline} {summary} {full_text_snippet}"
                tickers = extract_tickers_from_text(combined_text)
            
            recommendation = generate_recommendation(article)
            sentiment_label = article.get('label', '').capitalize() if article.get('label') else 'Neutral'
            sentiment_percentage = 85 if sentiment_label.lower() in ['positive', 'negative'] else 70
            
            article['tickers'] = tickers if tickers else []
            article['recommendation'] = recommendation
            article['sentiment_label'] = sentiment_label
            article['sentiment_percentage'] = sentiment_percentage
            
            articles_with_tickers.append(article)
        
        articles_with_tickers = articles_with_tickers[:20]
        
        return {
            "articles": articles_with_tickers,
            "count": len(articles_with_tickers)
        }
        
    except Exception as e:
        print(f"Error fetching news: {e}")
        raise HTTPException(status_code=500, detail=f"Error fetching news: {str(e)}")


@router.get("/news/{article_id}")
async def get_article_detail(article_id: str):
    """Get detailed information about a specific article by ID."""
    if not db.is_connected():
        await db.connect()
    
    try:
        article_obj = await db.article.find_unique(where={'id': article_id})
        
        if not article_obj:
            raise HTTPException(status_code=404, detail="Article not found")
        
        article = article_obj.model_dump()
        
        tickers_str = article.get('tickers', '')
        tickers = tickers_str.split(',') if tickers_str else []
        
        if not tickers:
            headline = article.get('headline', '')
            summary = article.get('summary', '')
            full_text = article.get('fullText', '')
            combined_text = f"{headline} {summary} {full_text[:500]}"
            tickers = extract_tickers_from_text(combined_text)
        
        recommendation = generate_recommendation(article)
        sentiment_label = article.get('label', '').capitalize() if article.get('label') else 'Neutral'
        sentiment_percentage = 85 if sentiment_label.lower() in ['positive', 'negative'] else 70
        
        article['tickers'] = tickers
        article['recommendation'] = recommendation
        article['sentiment_label'] = sentiment_label
        article['sentiment_percentage'] = sentiment_percentage
        
        return article
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching article: {str(e)}")


@router.get("/news/ticker/{ticker}")
async def get_articles_by_ticker(
    ticker: str,
    hours: int = Query(default=24, ge=1, le=168),
    limit: int = Query(default=50, ge=1, le=100)
):
    """Get all articles mentioning a specific stock ticker."""
    if not db.is_connected():
        await db.connect()
    
    ticker = ticker.upper().strip()
    if not ticker or len(ticker) > 5:
        raise HTTPException(status_code=400, detail="Invalid ticker symbol")
    
    try:
        time_threshold = datetime.now(timezone.utc) - timedelta(hours=hours)
        
        articles = await db.article.find_many(
            where={
                'AND': [
                    {'publishedAt': {'gte': time_threshold}},
                    {
                        'OR': [
                            {'tickers': {'contains': ticker, 'mode': 'insensitive'}},
                            {'headline': {'contains': ticker, 'mode': 'insensitive'}},
                            {'summary': {'contains': ticker, 'mode': 'insensitive'}},
                            {'fullText': {'contains': ticker, 'mode': 'insensitive'}}
                        ]
                    }
                ]
            },
            order={'publishedAt': 'desc'},
            take=limit
        )
        
        if not articles:
            articles = await db.article.find_many(
                where={
                    'OR': [
                        {'tickers': {'contains': ticker, 'mode': 'insensitive'}},
                        {'headline': {'contains': ticker, 'mode': 'insensitive'}},
                        {'summary': {'contains': ticker, 'mode': 'insensitive'}},
                        {'fullText': {'contains': ticker, 'mode': 'insensitive'}}
                    ]
                },
                order={'publishedAt': 'desc'},
                take=limit
            )
        
        if not articles:
            return {
                "ticker": ticker,
                "articles": [],
                "count": 0,
                "time_range_hours": hours
            }
        
        articles_list = []
        
        for article_obj in articles:
            article = article_obj.model_dump()
            
            tickers_str = article.get('tickers', '')
            tickers = tickers_str.split(',') if tickers_str else []
            
            if not tickers:
                headline = article.get('headline', '') or ''
                summary = article.get('summary', '') or ''
                full_text = article.get('fullText', '') or ''
                full_text_snippet = full_text[:500] if full_text else ''
                combined_text = f"{headline} {summary} {full_text_snippet}"
                tickers = extract_tickers_from_text(combined_text)
            
            if ticker in tickers or ticker.upper() in [t.upper() for t in tickers]:
                recommendation = generate_recommendation(article)
                sentiment_label = article.get('label', '').capitalize() if article.get('label') else 'Neutral'
                sentiment_percentage = 85 if sentiment_label.lower() in ['positive', 'negative'] else 70
                
                article['tickers'] = tickers
                article['recommendation'] = recommendation
                article['sentiment_label'] = sentiment_label
                article['sentiment_percentage'] = sentiment_percentage
                articles_list.append(article)
        
        return {
            "ticker": ticker,
            "articles": articles_list,
            "count": len(articles_list),
            "time_range_hours": hours
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching articles for ticker: {str(e)}")

