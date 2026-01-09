"""Shared article insertion logic for scraper jobs."""
import sys
import logging
from pathlib import Path
from datetime import datetime, timezone
from urllib.parse import urlparse
from typing import Optional

# Add backend to path
backend_path = Path(__file__).parent.parent.parent
if str(backend_path) not in sys.path:
    sys.path.insert(0, str(backend_path))

from app.core.database import db
from lib.tickers import extract_tickers_from_text

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')


async def insert_article(
    article_db: dict,
    text: str | None,
    status: str,
    error: str | None,
    http_status: int | None,
    meta: dict,
    sentiment_label: str | None = None,
    generate_embedding: bool = False
):
    """
    Insert article into database.

    Args:
        article_db: Article metadata dictionary
        text: Full text content
        status: Fetch status
        error: Error message if any
        http_status: HTTP status code
        meta: Additional metadata
        sentiment_label: Optional sentiment label. If None, will be set later by sentiment job.
        generate_embedding: If True, generates and stores embedding for RAG indexing
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

        # Generate and store embedding if requested
        if generate_embedding and res and res.id:
            await _generate_and_store_embedding(res.id, article_db, text)

        return res
    except Exception as e:
        logging.error(f"[ArticleInserter] Error inserting article: {e}")
        return None


async def _generate_and_store_embedding(
    article_id: str,
    article_db: dict,
    full_text: str | None
) -> bool:
    """
    Generate embedding for an article and store it in the database.

    Args:
        article_id: UUID of the inserted article
        article_db: Article metadata dictionary
        full_text: Full text content

    Returns:
        True if successful, False otherwise
    """
    try:
        from rag.embeddings import get_embed_service
        from rag.vector_search import VectorSearchService

        # Build text for embedding (headline + summary + full_text snippet)
        headline = article_db.get('headline', '') or ''
        summary = article_db.get('summary', '') or ''
        text_snippet = (full_text[:2000] if full_text else '') or ''

        # Combine text for embedding
        combined_text = f"{headline}\n\n{summary}\n\n{text_snippet}".strip()

        if not combined_text:
            logging.warning(f"[ArticleInserter] No text content for embedding: {article_id}")
            return False

        # Generate embedding
        embed_service = get_embed_service()
        embedding = await embed_service.embed_document(combined_text)

        if not embedding:
            logging.warning(f"[ArticleInserter] Failed to generate embedding for article {article_id}")
            return False

        # Store embedding in database
        vector_search = VectorSearchService()
        success = await vector_search.index_article(article_id, embedding)

        if success:
            logging.info(f"[ArticleInserter] Generated and indexed embedding for article {article_id[:8]}...")
        else:
            logging.warning(f"[ArticleInserter] Failed to index embedding for article {article_id}")

        return success

    except Exception as e:
        logging.error(f"[ArticleInserter] Error generating embedding: {e}")
        return False


async def insert_article_without_sentiment(
    article_db: dict,
    text: str | None,
    status: str,
    error: str | None,
    http_status: int | None,
    meta: dict,
    generate_embedding: bool = False
):
    """Insert article without sentiment label (will be added by sentiment job later)."""
    return await insert_article(
        article_db=article_db,
        text=text,
        status=status,
        error=error,
        http_status=http_status,
        meta=meta,
        sentiment_label=None,
        generate_embedding=generate_embedding
    )


async def insert_article_with_embedding(
    article_db: dict,
    text: str | None,
    status: str,
    error: str | None,
    http_status: int | None,
    meta: dict,
    sentiment_label: str | None = None
):
    """Insert article and automatically generate embedding for RAG indexing."""
    return await insert_article(
        article_db=article_db,
        text=text,
        status=status,
        error=error,
        http_status=http_status,
        meta=meta,
        sentiment_label=sentiment_label,
        generate_embedding=True
    )


async def batch_generate_embeddings(article_ids: list[str], batch_size: int = 10) -> dict:
    """
    Generate embeddings for multiple articles in batches.

    Args:
        article_ids: List of article UUIDs to process
        batch_size: Number of articles to process at a time

    Returns:
        Dict with success count and failed count
    """
    from rag.embeddings import get_embed_service
    from rag.vector_search import VectorSearchService

    if not db.is_connected():
        await db.connect()

    embed_service = get_embed_service()
    vector_search = VectorSearchService()

    success_count = 0
    failed_count = 0

    # Process in batches
    for i in range(0, len(article_ids), batch_size):
        batch_ids = article_ids[i:i + batch_size]

        # Fetch articles
        articles = await db.article.find_many(
            where={'id': {'in': batch_ids}}
        )

        texts = []
        valid_articles = []

        for article in articles:
            # Build text for embedding
            headline = article.headline or ''
            summary = article.summary or ''
            full_text = (article.fullText[:2000] if article.fullText else '') or ''
            combined = f"{headline}\n\n{summary}\n\n{full_text}".strip()

            if combined:
                texts.append(combined)
                valid_articles.append(article)

        if not texts:
            continue

        # Generate embeddings in batch
        embeddings = await embed_service.generate_embeddings_batch(texts)

        # Store embeddings
        for article, embedding in zip(valid_articles, embeddings):
            if embedding:
                success = await vector_search.index_article(article.id, embedding)
                if success:
                    success_count += 1
                else:
                    failed_count += 1
            else:
                failed_count += 1

        logging.info(f"[ArticleInserter] Batch processed: {success_count} success, {failed_count} failed")

    return {'success': success_count, 'failed': failed_count}

