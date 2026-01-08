"""Database client and utilities using Prisma."""
import json
from datetime import datetime, timedelta
from prisma import Prisma
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
    """Insert a new cached forecast row. Returns response or None on failure."""
    try:
        # price_series and forecast_results are likely dicts or lists.
        # Prisma Json type handles them.
        # Use camelCase field names for Prisma Python client
        
        payload = {
            'id': str(uuid.uuid4()),
            'symbol': symbol,
            'priceSeries': json.dumps(price_series) if not isinstance(price_series, (dict, list)) else price_series,
            'forecastResults': json.dumps(forecast_results) if not isinstance(forecast_results, (dict, list)) else forecast_results,
            'runDate': datetime.utcnow(),
        }

        resp = await db.stockforecast.create(data=payload)
        return resp
    except Exception as e:
        print(f"⚠️ Prisma insert error for {symbol}: {e}")
        return None

