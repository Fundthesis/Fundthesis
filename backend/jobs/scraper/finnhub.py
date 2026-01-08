"""Finnhub news scraper."""
import sys
from pathlib import Path
import os
from dotenv import load_dotenv

# Add backend to path
backend_path = Path(__file__).parent.parent.parent
if str(backend_path) not in sys.path:
    sys.path.insert(0, str(backend_path))

import finnhub

from jobs.scraper.extractors import get_fulltext
from jobs.scraper.article_inserter import insert_article

load_dotenv()
API_KEY = os.getenv("FINNHUB_KEY")


def finn_client():
    """Get Finnhub client."""
    if not API_KEY:
        raise RuntimeError("FINNHUB_KEY not set in env")
    return finnhub.Client(api_key=API_KEY)


async def scrape_finnhub_news():
    """Scrape general news from Finnhub and insert into database."""
    finc = finn_client()
    news = finc.general_news('general', min_id=0)

    inserted = 0
    for art in news:
        # Get article body by scraping the URL
        text, status, error, http_status, meta = get_fulltext(art['url'])

        # Insert into DB (without sentiment - will be added by sentiment job)
        await insert_article(
            article_db=art,
            text=text,
            status=status,
            error=error,
            http_status=http_status,
            meta=meta,
            sentiment_label=None  # Sentiment job will update this
        )

        inserted += 1

    print(f"Inserted {inserted} articles from Finnhub into DB")
    return inserted

