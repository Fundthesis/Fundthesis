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
        
        # Scrape from Finnhub - fail if error occurs
        print("\n[1/2] Scraping Finnhub news...")
        try:
            finnhub_count = await scrape_finnhub_news()
        except Exception as e:
            print(f"❌ Fatal error in Finnhub scraping: {e}")
            raise
        
        # Scrape from RSS feeds - fail if error occurs
        print("\n[2/2] Scraping RSS feeds...")
        try:
            rss_count = await ingest_all_feeds()
        except Exception as e:
            print(f"❌ Fatal error in RSS feed scraping: {e}")
            raise
        
        total = finnhub_count + rss_count
        print("\n" + "=" * 80)
        print(f"Scraper job completed: {total} total articles inserted")
        print("=" * 80)
        
        return total
    finally:
        await db.disconnect()


if __name__ == "__main__":
    asyncio.run(run_scraper())

