"""Tests for database operations."""
import pytest
from datetime import datetime, timedelta
from app.core.database import insert_cached_forecast, get_cached_forecast


@pytest.mark.asyncio
async def test_insert_new_forecast(db_session):
    """Test inserting a new forecast."""
    price_series = [
        {'date': '2024-01-01', 'close': 100.0},
        {'date': '2024-01-02', 'close': 101.0}
    ]
    forecast_results = {
        'forecast': [
            {'date': '2024-01-03', 'price': 102.0}
        ],
        'mse': 0.5,
        'r2': 0.95
    }
    
    result = await insert_cached_forecast(
        symbol='TEST',
        price_series=price_series,
        forecast_results=forecast_results
    )
    
    assert result is not None
    assert result.symbol == 'TEST'
    assert result.priceSeries is not None
    assert result.forecastResults is not None


@pytest.mark.asyncio
async def test_update_existing_forecast(db_session):
    """Test updating an existing forecast for the same day."""
    price_series1 = [
        {'date': '2024-01-01', 'close': 100.0}
    ]
    forecast_results1 = {
        'forecast': [{'date': '2024-01-02', 'price': 101.0}],
        'mse': 0.5,
        'r2': 0.95
    }
    
    # Insert first forecast
    result1 = await insert_cached_forecast(
        symbol='TEST',
        price_series=price_series1,
        forecast_results=forecast_results1
    )
    assert result1 is not None
    first_id = result1.id
    
    # Update with new data (same day)
    price_series2 = [
        {'date': '2024-01-01', 'close': 101.0}
    ]
    forecast_results2 = {
        'forecast': [{'date': '2024-01-02', 'price': 102.0}],
        'mse': 0.4,
        'r2': 0.96
    }
    
    result2 = await insert_cached_forecast(
        symbol='TEST',
        price_series=price_series2,
        forecast_results=forecast_results2
    )
    
    # Should update the same record
    assert result2 is not None
    assert result2.id == first_id


@pytest.mark.asyncio
async def test_get_cached_forecast_within_24h(db_session):
    """Test retrieving a cached forecast within 24 hours."""
    price_series = [
        {'date': '2024-01-01', 'close': 100.0}
    ]
    forecast_results = {
        'forecast': [{'date': '2024-01-02', 'price': 101.0}],
        'mse': 0.5,
        'r2': 0.95
    }
    
    # Insert forecast
    await insert_cached_forecast(
        symbol='TEST',
        price_series=price_series,
        forecast_results=forecast_results
    )
    
    # Retrieve it
    cached = await get_cached_forecast('TEST')
    assert cached is not None
    assert cached['symbol'] == 'TEST'
    assert 'forecastResults' in cached


@pytest.mark.asyncio
async def test_get_cached_forecast_stale(db_session):
    """Test that stale forecasts (>24h) return None."""
    from app.core.database import db
    from prisma import types
    
    # Create an old forecast manually
    old_date = datetime.utcnow() - timedelta(hours=25)
    await db.stockforecast.create(
        data={
            'id': 'test-stale-forecast',
            'symbol': 'TEST_STALE',
            'priceSeries': types.Json([{'date': '2024-01-01', 'close': 100.0}]),
            'forecastResults': types.Json({'forecast': []}),
            'runDate': old_date
        }
    )
    
    # Should return None for stale data
    cached = await get_cached_forecast('TEST_STALE')
    assert cached is None
    
    # Cleanup
    await db.stockforecast.delete(where={'id': 'test-stale-forecast'})


@pytest.mark.asyncio
async def test_get_cached_forecast_not_found(db_session):
    """Test retrieving forecast for non-existent symbol."""
    cached = await get_cached_forecast('NONEXISTENT')
    assert cached is None


@pytest.mark.asyncio
async def test_json_field_serialization(db_session):
    """Test that JSON fields are properly serialized."""
    complex_data = {
        'nested': {
            'array': [1, 2, 3],
            'object': {'key': 'value'}
        },
        'list': ['a', 'b', 'c']
    }
    
    result = await insert_cached_forecast(
        symbol='TEST_JSON',
        price_series=complex_data,
        forecast_results={'data': complex_data}
    )
    
    assert result is not None
    assert result.priceSeries is not None
    assert result.forecastResults is not None

