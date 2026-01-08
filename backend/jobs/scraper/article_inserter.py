"""Shared article insertion logic for scraper jobs."""
import sys
from pathlib import Path
from datetime import datetime, timezone
from urllib.parse import urlparse

# Add backend to path
backend_path = Path(__file__).parent.parent.parent
if str(backend_path) not in sys.path:
    sys.path.insert(0, str(backend_path))

from app.core.database import db
from lib.tickers import extract_tickers_from_text


async def insert_article(
    article_db: dict,
    text: str | None,
    status: str,
    error: str | None,
    http_status: int | None,
    meta: dict,
    sentiment_label: str | None = None
):
    """
    Insert article into database.
    sentiment_label: Optional sentiment label. If None, will be set later by sentiment job.
    """
    # Domain extraction
    try:
        domain = urlparse(article_db.get('url', '')).netloc or None
    except Exception:
        domain = None

    # Normalize published_at
    published_raw = article_db.get('datetime')
    published_iso = None

    # Case 1: epoch-like (e.g. 1698432000)
    if isinstance(published_raw, (int, float)) or (isinstance(published_raw, str) and published_raw.isdigit()):
        try:
            ts = int(published_raw)
            published_iso = datetime.fromtimestamp(ts, timezone.utc)
        except:
            published_iso = None

    # Case 2: ISO string
    elif isinstance(published_raw, str):
        try:
            published_iso = datetime.fromisoformat(published_raw.replace("Z", "+00:00"))
        except Exception:
            published_iso = None

    # Extract tickers from article content
    headline = article_db.get('headline', '') or ''
    summary = article_db.get('summary', '') or ''
    full_text_snippet = (text[:500] if text else '') or ''
    combined_text = f"{headline} {summary} {full_text_snippet}"
    tickers = extract_tickers_from_text(combined_text)
    
    # Convert tickers list to comma-separated string
    tickers_str = ','.join(tickers) if tickers else None

    # Build payload - use camelCase field names for Prisma Python client
    data = {
        "category": article_db.get('category'),
        "publishedAt": published_iso,
        "headline": article_db.get('headline'),
        "related": article_db.get('related'),
        "source": article_db.get('source'),
        "summary": article_db.get('summary'),
        "fullText": text,
        "url": meta.get("best_url") or article_db.get('url'),
        "label": sentiment_label,  # Will be None initially, updated by sentiment job
        "insertedAt": datetime.now(timezone.utc),
        "fetchStatus": f"{status}:{http_status}|{meta.get('used_extractor')}|html={meta.get('html_len')}",
        "fetchError": error,
        "sourceDomain": domain,
        "tickers": tickers_str
    }

    # Add sqliteId/articleId if numeric
    art_id = article_db.get('id')
    if isinstance(art_id, (int, float)) or (isinstance(art_id, str) and art_id.isdigit()):
        data["sqliteId"] = str(art_id)
        data["articleId"] = str(art_id)

    # Upsert
    if not db.is_connected():
        await db.connect()

    try:
        res = await db.article.upsert(
            where={'url': data['url']},
            data={'create': data, 'update': data}
        )
        return res
    except Exception as e:
        print(f"Error inserting article: {e}")
        return None

