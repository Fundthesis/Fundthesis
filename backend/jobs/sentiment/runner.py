"""Sentiment analysis job runner - analyzes articles missing sentiment labels."""
import sys
import asyncio
from pathlib import Path
from datetime import datetime, timezone, timedelta

# Add backend to path
backend_path = Path(__file__).parent.parent.parent
if str(backend_path) not in sys.path:
    sys.path.insert(0, str(backend_path))

from app.core.database import db
from jobs.sentiment.finbert import analyze_sentiment


async def analyze_articles_without_sentiment(limit: int = 100):
    """Analyze articles that don't have sentiment labels yet."""
    if not db.is_connected():
        await db.connect()
    
    try:
        # Find articles without sentiment labels (label is None or empty)
        articles = await db.article.find_many(
            where={
                'OR': [
                    {'label': None},
                    {'label': ''}
                ]
            },
            take=limit,
            order={
                'published_at': 'desc'
            }
        )
        
        if not articles:
            print("No articles found without sentiment labels.")
            return 0
        
        print(f"Found {len(articles)} articles to analyze")
        
        updated = 0
        for article in articles:
            # Use headline or summary for sentiment analysis
            text_for_analysis = (
                article.summary or 
                article.headline or 
                (article.full_text[:500] if article.full_text else "")
            )
            
            if not text_for_analysis:
                continue
            
            # Analyze sentiment
            sentiment = analyze_sentiment(text_for_analysis)
            
            # Capitalize first letter for consistency
            sentiment_label = sentiment.capitalize()
            
            # Update article
            try:
                await db.article.update(
                    where={'id': article.id},
                    data={'label': sentiment_label}
                )
                updated += 1
                print(f"Updated article {article.id[:8]}... with sentiment: {sentiment_label}")
            except Exception as e:
                print(f"Error updating article {article.id}: {e}")
        
        print(f"Successfully updated {updated} articles with sentiment labels")
        return updated
        
    except Exception as e:
        print(f"Error in sentiment analysis job: {e}")
        raise
    finally:
        await db.disconnect()


async def main():
    """Main entry point for sentiment analysis job."""
    print("Starting sentiment analysis job...")
    try:
        await analyze_articles_without_sentiment(limit=100)
    except Exception as e:
        print(f"Fatal error in sentiment job: {e}")
        raise


if __name__ == "__main__":
    asyncio.run(main())

