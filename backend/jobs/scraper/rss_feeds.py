"""RSS feed scraper for BusinessWire, PR Newswire, etc."""
import time
import hashlib
import requests
import feedparser
import asyncio
from datetime import datetime, timezone, timedelta
import re
import sys
from pathlib import Path

# Add parent directories to path
sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from jobs.scraper.extractors import get_fulltext
from jobs.scraper.article_inserter import insert_article_without_sentiment
from lib.tickers import extract_tickers_from_text

# RSS feed URLs
FEEDS = [
    {
        "name": "BusinessWire",
        "url": "https://feed.businesswire.com/rss/home/?rss=G1QFDERJXkJeEFpRXEMGSQ5SVFJTGEdfGENeUldDFUkQUhFUVFhTFEQ=",
        "enabled": True,
        "needs_filtering": False
    },
    {
        "name": "GlobeNewswire",
        "url": "https://www.globenewswire.com/RssFeed/org",
        "enabled": False,  # May return 404
        "needs_filtering": True
    },
    {
        "name": "PR Newswire",
        "url": "https://www.prnewswire.com/rss/news-releases-list.rss",
        "enabled": True,
        "needs_filtering": True
    },
    {
        "name": "MarketWatch",
        "url": "https://www.marketwatch.com/rss/topstories",
        "enabled": True,
        "needs_filtering": True
    },
    {
        "name": "Seeking Alpha",
        "url": "https://seekingalpha.com/feed.xml",
        "enabled": True,
        "needs_filtering": True
    },
    {
        "name": "Yahoo Finance",
        "url": "https://finance.yahoo.com/news/rssindex",
        "enabled": True,
        "needs_filtering": True
    },
    {
        "name": "Benzinga",
        "url": "https://www.benzinga.com/feed",
        "enabled": True,
        "needs_filtering": True
    },
    {
        "name": "Reuters Business",
        "url": "https://www.reutersagency.com/feed/?taxonomy=best-topics&post_type=best",
        "enabled": True,
        "needs_filtering": True
    }
]

# Keep track of seen items to avoid duplicates
SEEN = set()

# Financial keywords for filtering relevant news
FINANCIAL_KEYWORDS = {
    'stock', 'stocks', 'equity', 'equities', 'NASDAQ', 'NYSE', 'trading', 'trade',
    'earnings', 'revenue', 'profit', 'loss', 'quarterly', 'Q1', 'Q2', 'Q3', 'Q4',
    'forecast', 'guidance', 'dividend', 'dividends', 'IPO', 'merger', 'acquisition',
    'investor', 'investment', 'portfolio', 'market', 'markets', 'share', 'shares',
    'financial', 'finance', 'bank', 'banking', 'fund', 'hedge fund', 'ETF', 'mutual fund',
    'analyst', 'Dow', 'S&P', 'index', 'indices', 'cryptocurrency', 'bitcoin', 'BTC',
    'crypto', 'blockchain', 'FDA approval', 'clinical trial', 'biotech', 'pharma',
    'CEO', 'CFO', 'executive', 'board', 'outlook', 'expenses', 'income',
    'balance sheet', 'cash flow', 'securities', 'bond', 'bonds', 'debt', 'credit'
}

def gen_id_from(text: str) -> str:
    """Generate a stable ID for an item."""
    return hashlib.sha256(text.encode("utf-8")).hexdigest()[:16]

def is_financial_news(headline: str, summary: str = "", full_text: str = "") -> bool:
    """Check if an article is related to finance/stock market."""
    combined_text = f"{headline} {summary} {full_text}".lower()
    keyword_count = sum(1 for keyword in FINANCIAL_KEYWORDS if keyword.lower() in combined_text)
    return keyword_count >= 1

def looks_like_english(text: str) -> bool:
    """Simple heuristic to check if text appears to be English."""
    if not text:
        return True
    
    text_lower = text.lower()
    english_words = ['the', 'and', 'for', 'are', 'but', 'not', 'you', 'all', 'can', 'her',
                     'was', 'one', 'our', 'out', 'day', 'get', 'has', 'him', 'his', 'how',
                     'man', 'new', 'now', 'old', 'see', 'two', 'who', 'its', 'may', 'way',
                     'com', 'from', 'news', 'financ']
    
    word_count = sum(1 for word in english_words if word in text_lower)
    return word_count >= 2

def fetch_feed(url: str, feed_name: str):
    """Fetch and parse an RSS feed."""
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Accept": "application/rss+xml,application/xml,text/xml"
    }
    try:
        resp = requests.get(url, headers=headers, timeout=15)
        resp.raise_for_status()
        return feedparser.parse(resp.text)
    except Exception as e:
        print(f"[{feed_name}] Error fetching feed: {e}")
        return None

def normalize_entry(entry: dict, source: str) -> dict:
    """Convert a feedparser entry to our article_db format."""
    headline = entry.get("title", "").strip()
    url = entry.get("link", "").strip()
    published_raw = entry.get("published", "") or entry.get("pubDate", "")
    
    # Convert published date to datetime object
    published_dt = None
    try:
        if hasattr(entry, 'published_parsed') and entry.published_parsed:
            published_dt = datetime(*entry.published_parsed[:6], tzinfo=timezone.utc)
        elif published_raw:
            dt = datetime.fromisoformat(published_raw.replace("Z", "+00:00"))
            published_dt = dt.astimezone(timezone.utc)
    except Exception:
        published_dt = None
    
    # Get summary/description
    summary = entry.get("summary", "") or entry.get("description", "")
    if summary:
        summary = re.sub(r'<[^>]+>', '', summary).strip()
    
    # Generate stable ID from URL and title
    local_id = gen_id_from(url + headline)
    
    # Try to extract category/topic
    category = None
    tags = entry.get("tags", [])
    if tags and isinstance(tags, list):
        for tag in tags:
            if isinstance(tag, dict) and 'term' in tag:
                category = tag['term']
                break
    
    article_db = {
        "id": local_id,
        "headline": headline,
        "summary": summary or headline[:200],
        "datetime": published_dt,
        "category": category,
        "related": None,
        "source": source,
        "url": url,
    }
    return article_db

async def ingest_feed_once(feed_info: dict, generate_embeddings: bool = False):
    """
    Fetch a feed, normalize entries, scrape content, and insert into database.

    Args:
        feed_info: Dictionary containing feed name, url, enabled status, etc.
        generate_embeddings: If True, generates embeddings for new articles
    """
    feed_name = feed_info["name"]
    feed_url = feed_info["url"]
    
    # Calculate date range: yesterday and today
    now = datetime.now(timezone.utc)
    yesterday_start = (now - timedelta(days=1)).replace(hour=0, minute=0, second=0, microsecond=0)
    
    print(f"\n[{feed_name}] Fetching feed from {feed_url}...")
    print(f"[{feed_name}] Filtering for articles from {yesterday_start.date()} to {now.date()}")
    feed = fetch_feed(feed_url, feed_name)
    
    if not feed or not hasattr(feed, 'entries'):
        print(f"[{feed_name}] No entries found or error parsing feed")
        return 0
    
    new_count = 0
    for entry in feed.entries:
        article_db = normalize_entry(entry, feed_name)
        
        # Parse the article's published date
        article_date = article_db.get('datetime')
        
        # Skip articles outside the date range
        if article_date is None or article_date < yesterday_start or article_date > now:
            if article_date:
                print(f"[{feed_name}] Skipping old article from {article_date.date()}: {article_db['headline'][:50]}...")
            continue
        
        # Check if article appears to be in English
        article_text_sample = f"{article_db['headline']} {article_db['summary']}"
        if not looks_like_english(article_text_sample):
            print(f"[{feed_name}] Skipping non-English article: {article_db['headline'][:50]}...")
            continue
        
        # Skip if already seen in this session
        if article_db["id"] in SEEN:
            continue
        SEEN.add(article_db["id"])
        
        # Get full text content from URL
        print(f"[{feed_name}] Scraping: {article_db['headline'][:60]}...")
        text, status, error, http_status, meta = get_fulltext(article_db["url"])
        
        # Check if article is financial news (only if feed needs filtering)
        if feed_info.get("needs_filtering", True):
            if not is_financial_news(article_db['headline'], article_db['summary'], text or ""):
                print(f"[{feed_name}] Skipping non-financial article: {article_db['headline'][:60]}...")
                continue
        
        # Insert into database (without sentiment - that's done by sentiment job)
        try:
            await insert_article_without_sentiment(
                article_db=article_db,
                text=text,
                status=status,
                error=error,
                http_status=http_status,
                meta=meta,
                generate_embedding=generate_embeddings
            )
            new_count += 1
        except Exception as e:
            print(f"[{feed_name}] Error inserting article: {e}")

    print(f"[{feed_name}] Inserted {new_count} new articles")
    if generate_embeddings and new_count > 0:
        print(f"[{feed_name}] Embeddings generated for {new_count} articles")
    return new_count

async def ingest_all_feeds(generate_embeddings: bool = False):
    """
    Process all RSS feeds and insert articles into database.

    Args:
        generate_embeddings: If True, generates embeddings for new articles
    """
    total_new = 0
    for feed_info in FEEDS:
        if not feed_info.get("enabled", True):
            print(f"[{feed_info['name']}] Feed disabled, skipping...")
            continue

        try:
            count = await ingest_feed_once(feed_info, generate_embeddings=generate_embeddings)
            total_new += count
            time.sleep(2)  # Small delay between feeds
        except Exception as e:
            print(f"Error processing {feed_info['name']}: {e}")

    print(f"\n[All Feeds] Total inserted: {total_new} articles")
    return total_new

if __name__ == "__main__":
    asyncio.run(ingest_all_feeds())

