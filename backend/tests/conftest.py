"""Pytest configuration and fixtures for backend tests."""
import pytest
import asyncio
import sys
from pathlib import Path
from httpx import AsyncClient
from unittest.mock import Mock, patch
import pandas as pd
from datetime import datetime, timedelta

# Add backend to path
backend_path = Path(__file__).parent.parent
if str(backend_path) not in sys.path:
    sys.path.insert(0, str(backend_path))

from main import app
from app.core.database import db


@pytest.fixture(scope="session")
def event_loop_policy():
    """Set event loop policy for async tests."""
    policy = asyncio.get_event_loop_policy()
    yield policy


@pytest.fixture(scope="function")
async def async_client():
    """Create a test client for FastAPI."""
    async with AsyncClient(app=app, base_url="http://test") as client:
        yield client


@pytest.fixture(scope="function")
async def db_session():
    """Database session fixture with cleanup."""
    if not db.is_connected():
        await db.connect()
    
    yield db
    
    # Cleanup: Delete test data
    try:
        # Clean up test forecasts
        await db.stockforecast.delete_many(where={'symbol': {'startsWith': 'TEST'}})
        # Clean up test articles
        await db.article.delete_many(where={'url': {'contains': 'test'}})
    except Exception as e:
        print(f"Cleanup error: {e}")
    
    await db.disconnect()


@pytest.fixture
def mock_stock_data():
    """Mock yfinance stock data."""
    mock_ticker = Mock()
    mock_info = {
        'longName': 'Test Company Inc.',
        'symbol': 'TEST',
        'currentPrice': 150.0,
        'marketCap': 1000000000,
        'averageVolume': 1000000,
        'fiftyTwoWeekHigh': 200.0,
        'fiftyTwoWeekLow': 100.0,
        'trailingPE': 25.0,
        'dividendYield': 0.02,
        'sector': 'Technology',
        'industry': 'Software'
    }
    
    mock_history = pd.DataFrame({
        'Open': [145.0, 146.0, 147.0],
        'High': [150.0, 151.0, 152.0],
        'Low': [144.0, 145.0, 146.0],
        'Close': [149.0, 150.0, 151.0],
        'Volume': [1000000, 1100000, 1200000]
    }, index=pd.date_range('2024-01-01', periods=3, freq='D'))
    
    mock_ticker.info = mock_info
    mock_ticker.history.return_value = mock_history
    
    return mock_ticker


@pytest.fixture
def sample_forecast_data():
    """Sample forecast data for testing."""
    return {
        'price_series': [
            {'date': '2024-01-01', 'close': 100.0},
            {'date': '2024-01-02', 'close': 101.0},
            {'date': '2024-01-03', 'close': 102.0}
        ],
        'forecast_results': {
            'forecast': [
                {'date': '2024-01-04', 'price': 103.0},
                {'date': '2024-01-05', 'price': 104.0}
            ],
            'mse': 0.5,
            'r2': 0.95
        }
    }


@pytest.fixture
def sample_article_data():
    """Sample article data for testing."""
    return {
        'id': 'test-article-1',
        'headline': 'Test Company Announces New Product',
        'summary': 'Test Company has announced a revolutionary new product.',
        'url': 'https://test.com/article1',
        'datetime': datetime.now().isoformat(),
        'category': 'Technology',
        'source': 'Test News',
        'related': 'TEST'
    }

