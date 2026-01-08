"""Main entry point for scraper cron job."""
import asyncio
import sys
from pathlib import Path

# Add backend to path
backend_path = Path(__file__).parent.parent.parent
if str(backend_path) not in sys.path:
    sys.path.insert(0, str(backend_path))

from app.core.database import db
from .finnhub import scrape_finnhub_news
from .rss_feeds import ingest_all_feeds


async def run_scraper():
    """Run all scraper jobs."""
    # Connect to database
    if not db.is_connected():
        await db.connect()
    
    try:
        print("=" * 80)
        print("Starting scraper job...")
        print("=" * 80)
        
        # Scrape from Finnhub
        print("\n[1/2] Scraping Finnhub news...")
        finnhub_count = await scrape_finnhub_news()
        
        # Scrape from RSS feeds
        print("\n[2/2] Scraping RSS feeds...")
        rss_count = await ingest_all_feeds()
        
        total = finnhub_count + rss_count
        print("\n" + "=" * 80)
        print(f"Scraper job completed: {total} total articles inserted")
        print("=" * 80)
        
        return total
    finally:
        await db.disconnect()


if __name__ == "__main__":
    asyncio.run(run_scraper())

