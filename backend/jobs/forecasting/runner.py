#!/usr/bin/env python3
"""
Forecasting job runner for cron execution.
Generates forecasts for all tracked stocks and saves to database.
"""
import sys
import os
import asyncio
from pathlib import Path

# Add backend to path
backend_dir = Path(__file__).parent.parent.parent
sys.path.insert(0, str(backend_dir))

from jobs.forecasting.xgboost_model import get_next_30_day_predictions
from app.core.database import db, insert_cached_forecast
import json

# Load stock symbols
SYMBOLS_FILE = backend_dir / "lib" / "stock_symbols.json"

async def run_forecast_job():
    """Main entry point for forecasting cron job."""
    print("🚀 Starting forecasting job...")
    
    # Connect to database
    if not db.is_connected():
        await db.connect()
    
    # Load symbols
    try:
        with open(SYMBOLS_FILE, 'r') as f:
            symbols_data = json.load(f)
            symbols = symbols_data.get('symbols', [])
    except Exception as e:
        print(f"⚠️ Error loading symbols file: {e}")
        # Fallback to a small set of major stocks
        symbols = ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'NVDA', 'META', 'TSLA']
    
    print(f"📊 Processing {len(symbols)} symbols...")
    
    successful = 0
    failed = 0
    
    for symbol in symbols:
        try:
            print(f"\n{'='*60}")
            print(f"Processing {symbol}...")
            print(f"{'='*60}")
            
            # Generate forecast
            forecast_df, mse, r2 = get_next_30_day_predictions(symbol, forecast_days=30)
            
            if forecast_df is None or forecast_df.empty:
                print(f"⚠️ No forecast generated for {symbol}")
                failed += 1
                continue
            
            # Convert forecast to dict format for storage
            forecast_records = []
            for _, row in forecast_df.iterrows():
                forecast_records.append({
                    'date': str(row['Date']),
                    'price': float(row['Predicted_Close'])
                })
            
            # Get historical price series (last 30 days for context)
            import yfinance as yf
            ticker = yf.Ticker(symbol)
            hist = ticker.history(period='1mo')
            price_series = []
            for date_idx, row in hist.iterrows():
                price_series.append({
                    'date': str(date_idx),
                    'close': float(row['Close'])
                })
            
            # Save to database
            forecast_results = {
                'forecast': forecast_records,
                'mse': float(mse) if mse else None,
                'r2': float(r2) if r2 else None
            }
            
            result = await insert_cached_forecast(
                symbol=symbol,
                price_series=price_series,
                forecast_results=forecast_results
            )
            
            if result:
                print(f"✅ Successfully saved forecast for {symbol}")
                successful += 1
            else:
                print(f"⚠️ Failed to save forecast for {symbol}")
                failed += 1
                
        except Exception as e:
            print(f"❌ Error processing {symbol}: {e}")
            import traceback
            traceback.print_exc()
            failed += 1
    
    print(f"\n{'='*60}")
    print(f"📊 Job Summary:")
    print(f"   Successful: {successful}")
    print(f"   Failed: {failed}")
    print(f"   Total: {len(symbols)}")
    print(f"{'='*60}")
    
    # Disconnect from database
    await db.disconnect()

if __name__ == "__main__":
    asyncio.run(run_forecast_job())

