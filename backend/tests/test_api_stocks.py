"""Tests for stock API endpoints."""
import pytest
from unittest.mock import patch, Mock
import pandas as pd
from datetime import datetime


@pytest.mark.asyncio
async def test_get_stocks_endpoint(async_client):
    """Test GET /api/stocks endpoint with pagination."""
    response = await async_client.get("/api/stocks?limit=5")
    assert response.status_code == 200
    data = response.json()
    assert "stocks" in data
    assert "total" in data
    assert "offset" in data
    assert "limit" in data
    assert "hasMore" in data
    assert len(data["stocks"]) <= 5


@pytest.mark.asyncio
async def test_get_stocks_pagination(async_client):
    """Test pagination logic."""
    # First page
    response1 = await async_client.get("/api/stocks?limit=5&offset=0")
    assert response1.status_code == 200
    data1 = response1.json()
    
    # Second page
    response2 = await async_client.get("/api/stocks?limit=5&offset=5")
    assert response2.status_code == 200
    data2 = response2.json()
    
    # Should have different stocks
    if len(data1["stocks"]) > 0 and len(data2["stocks"]) > 0:
        assert data1["stocks"][0]["symbol"] != data2["stocks"][0]["symbol"]


@pytest.mark.asyncio
async def test_get_stocks_invalid_limit(async_client):
    """Test invalid limit parameter."""
    response = await async_client.get("/api/stocks?limit=0")
    assert response.status_code == 422  # Validation error
    
    response = await async_client.get("/api/stocks?limit=101")
    assert response.status_code == 422  # Validation error


@pytest.mark.asyncio
@patch('lib.stock_data.yf.Ticker')
async def test_get_stock_detail(mock_ticker_class, async_client):
    """Test GET /api/stock/{symbol} endpoint."""
    # Mock yfinance Ticker
    mock_ticker = Mock()
    mock_ticker.info = {
        'longName': 'Apple Inc.',
        'symbol': 'AAPL',
        'currentPrice': 150.0,
        'marketCap': 2500000000000,
        'averageVolume': 50000000,
        'fiftyTwoWeekHigh': 200.0,
        'fiftyTwoWeekLow': 100.0,
        'trailingPE': 30.0,
        'dividendYield': 0.005,
        'sector': 'Technology',
        'industry': 'Consumer Electronics'
    }
    
    mock_history = pd.DataFrame({
        'Open': [145.0, 146.0],
        'High': [150.0, 151.0],
        'Low': [144.0, 145.0],
        'Close': [149.0, 150.0],
        'Volume': [50000000, 51000000]
    }, index=pd.date_range('2024-01-01', periods=2, freq='D'))
    
    mock_ticker.history.return_value = mock_history
    mock_ticker_class.return_value = mock_ticker
    
    response = await async_client.get("/api/stock/AAPL?days=30")
    assert response.status_code == 200
    data = response.json()
    assert "symbol" in data
    assert data["symbol"] == "AAPL"
    assert "price" in data
    assert "chartData" in data
    assert "forecastData" in data


@pytest.mark.asyncio
async def test_get_stock_detail_invalid_symbol(async_client):
    """Test GET /api/stock/{symbol} with invalid symbol."""
    response = await async_client.get("/api/stock/INVALID123")
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_health_check(async_client):
    """Test health check endpoint."""
    response = await async_client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert "status" in data
    assert data["status"] == "healthy"

