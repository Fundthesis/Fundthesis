"""Tests for news API endpoints."""
import pytest
from datetime import datetime, timedelta, timezone


@pytest.mark.asyncio
async def test_get_recent_news(async_client, db_session):
    """Test GET /api/news/recent endpoint."""
    # Create a test article
    test_article = await db_session.article.create(
        data={
            'id': 'test-news-1',
            'url': 'https://test.com/news1',
            'headline': 'Test News Article',
            'summary': 'This is a test news article',
            'publishedAt': datetime.now(timezone.utc),
            'source': 'Test Source',
            'insertedAt': datetime.now(timezone.utc)
        }
    )
    
    response = await async_client.get("/api/news/recent?limit=10")
    assert response.status_code == 200
    data = response.json()
    assert "articles" in data
    assert isinstance(data["articles"], list)
    
    # Cleanup
    await db_session.article.delete(where={'id': test_article.id})


@pytest.mark.asyncio
async def test_get_recent_news_limit(async_client, db_session):
    """Test limit parameter for recent news."""
    # Create multiple test articles
    articles = []
    for i in range(5):
        article = await db_session.article.create(
            data={
                'id': f'test-news-limit-{i}',
                'url': f'https://test.com/news{i}',
                'headline': f'Test News {i}',
                'summary': f'Test summary {i}',
                'publishedAt': datetime.now(timezone.utc),
                'source': 'Test Source',
                'insertedAt': datetime.now(timezone.utc)
            }
        )
        articles.append(article)
    
    response = await async_client.get("/api/news/recent?limit=3")
    assert response.status_code == 200
    data = response.json()
    assert len(data["articles"]) <= 3
    
    # Cleanup
    for article in articles:
        await db_session.article.delete(where={'id': article.id})


@pytest.mark.asyncio
async def test_get_article_detail(async_client, db_session):
    """Test GET /api/news/{article_id} endpoint."""
    # Create a test article
    test_article = await db_session.article.create(
        data={
            'id': 'test-article-detail',
            'url': 'https://test.com/detail',
            'headline': 'Test Article Detail',
            'summary': 'Test summary',
            'fullText': 'Full text content here',
            'publishedAt': datetime.now(timezone.utc),
            'source': 'Test Source',
            'insertedAt': datetime.now(timezone.utc)
        }
    )
    
    response = await async_client.get(f"/api/news/{test_article.id}")
    assert response.status_code == 200
    data = response.json()
    assert data["id"] == test_article.id
    assert "headline" in data
    assert "summary" in data
    
    # Cleanup
    await db_session.article.delete(where={'id': test_article.id})


@pytest.mark.asyncio
async def test_get_article_detail_not_found(async_client):
    """Test GET /api/news/{article_id} with non-existent ID."""
    response = await async_client.get("/api/news/non-existent-id")
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_get_articles_by_ticker(async_client, db_session):
    """Test GET /api/news/ticker/{ticker} endpoint."""
    test_article1 = None
    test_article2 = None
    try:
        # Create test articles with tickers
        test_article1 = await db_session.article.create(
            data={
                'id': 'test-ticker-1',
                'url': 'https://test.com/ticker1',
                'headline': 'AAPL Stock News',
                'summary': 'Apple Inc. announces new product',
                'tickers': 'AAPL',
                'publishedAt': datetime.now(timezone.utc),
                'source': 'Test Source',
                'insertedAt': datetime.now(timezone.utc)
            }
        )

        test_article2 = await db_session.article.create(
            data={
                'id': 'test-ticker-2',
                'url': 'https://test.com/ticker2',
                'headline': 'More AAPL News',
                'summary': 'Apple stock rises',
                'tickers': 'AAPL,MSFT',
                'publishedAt': datetime.now(timezone.utc),
                'source': 'Test Source',
                'insertedAt': datetime.now(timezone.utc)
            }
        )

        response = await async_client.get("/api/news/ticker/AAPL?hours=24&limit=10")
        assert response.status_code == 200
        data = response.json()
        assert "articles" in data
        assert isinstance(data["articles"], list)
    finally:
        # Cleanup
        if test_article1:
            await db_session.article.delete(where={'id': test_article1.id})
        if test_article2:
            await db_session.article.delete(where={'id': test_article2.id})

