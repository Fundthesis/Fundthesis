"""Database client and utilities using Prisma."""
import json
from datetime import datetime, timedelta
from prisma import Prisma
from prisma import Json
import uuid

# Initialize Prisma client
db = Prisma()


async def get_cached_forecast(symbol: str):
    """Return the most recent cached forecast row for `symbol` if within last 24 hours, else None."""
    if not db.is_connected():
        await db.connect()

    try:
        # Find first matching symbol, ordered by runDate desc (camelCase for Prisma Python)
        forecast = await db.stockforecast.find_first(
            where={
                'symbol': symbol
            },
            order={
                'runDate': 'desc'
            }
        )

        if not forecast:
            return None

        run_date = forecast.runDate
        # Check if within 24 hours
        now = datetime.now(run_date.tzinfo) if run_date.tzinfo else datetime.utcnow()
        
        if now - run_date <= timedelta(hours=24):
            # Convert to dict to match previous behavior
            return forecast.model_dump()
        
        return None

    except Exception as e:
        print(f"⚠️ Prisma fetch error for {symbol}: {e}")
        return None


async def insert_cached_forecast(symbol: str, price_series, forecast_results):
    """
    Insert or update a cached forecast row.
    If a forecast exists for today, update it. Otherwise, insert a new one.
    Returns response or None on failure.
    """
    try:
        # Prisma Python's Json type expects Python objects (dict/list), not JSON strings
        # Pass the objects directly - Prisma will handle serialization internally
        # Use camelCase field names for Prisma Python client
        
        now = datetime.utcnow()
        today_start = datetime(now.year, now.month, now.day)
        today_end = today_start + timedelta(days=1)
        
        # Check if there's an existing forecast for today
        existing_forecast = await db.stockforecast.find_first(
            where={
                'symbol': symbol,
                'runDate': {
                    'gte': today_start,
                    'lt': today_end
                }
            },
            order={
                'runDate': 'desc'
            }
        )
        
        # Prisma Python requires Json wrapper for JSON fields
        update_data = {
            'priceSeries': Json(price_series) if price_series else None,
            'forecastResults': Json(forecast_results) if forecast_results else None,
            'runDate': now,
        }
        
        if existing_forecast:
            # Update existing forecast
            resp = await db.stockforecast.update(
                where={'id': existing_forecast.id},
                data=update_data
            )
            print(f"✅ Updated existing forecast for {symbol} (ID: {existing_forecast.id[:8]}...)")
        else:
            # Insert new forecast
            payload = {
                'id': str(uuid.uuid4()),
                'symbol': symbol,
                **update_data
            }
            resp = await db.stockforecast.create(data=payload)
            print(f"✅ Created new forecast for {symbol} (ID: {resp.id[:8]}...)")
        
        return resp
    except Exception as e:
        print(f"⚠️ Prisma insert/update error for {symbol}: {e}")
        import traceback
        traceback.print_exc()
        return None

