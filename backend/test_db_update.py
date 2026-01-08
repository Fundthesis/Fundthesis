#!/usr/bin/env python3
"""
Test script to verify database forecast update functionality.
"""
import sys
import asyncio
from pathlib import Path
from datetime import datetime

# Add backend to path
backend_dir = Path(__file__).parent
sys.path.insert(0, str(backend_dir))

from app.core.database import db, insert_cached_forecast, get_cached_forecast


async def test_forecast_update():
    """Test inserting and updating forecasts."""
    print("=" * 80)
    print("Testing Database Forecast Update Functionality")
    print("=" * 80)
    
    # Connect to database
    if not db.is_connected():
        await db.connect()
    
    test_symbol = "TEST"
    
    try:
        # Test data
        price_series_1 = [
            {"date": "2024-01-01", "close": 100.0},
            {"date": "2024-01-02", "close": 101.0},
            {"date": "2024-01-03", "close": 102.0},
        ]
        
        forecast_results_1 = {
            "forecast": [
                {"date": "2024-01-04", "price": 103.0},
                {"date": "2024-01-05", "price": 104.0},
            ],
            "mse": 0.5,
            "r2": 0.95
        }
        
        # Test 1: Insert new forecast
        print(f"\n[Test 1] Inserting new forecast for {test_symbol}...")
        result1 = await insert_cached_forecast(
            symbol=test_symbol,
            price_series=price_series_1,
            forecast_results=forecast_results_1
        )
        
        if result1:
            print(f"✅ Test 1 PASSED: Successfully inserted forecast")
            print(f"   Forecast ID: {result1.id}")
            print(f"   Run Date: {result1.runDate}")
        else:
            print(f"❌ Test 1 FAILED: Failed to insert forecast")
            await db.disconnect()
            return
        
        # Test 2: Verify we can retrieve it
        print(f"\n[Test 2] Retrieving cached forecast for {test_symbol}...")
        cached = await get_cached_forecast(test_symbol)
        if cached:
            print(f"✅ Test 2 PASSED: Successfully retrieved cached forecast")
            print(f"   Forecast ID: {cached.get('id', 'N/A')}")
            print(f"   Run Date: {cached.get('runDate', 'N/A')}")
        else:
            print(f"⚠️ Test 2 WARNING: Could not retrieve cached forecast (may be outside 24h window)")
        
        # Test 3: Update existing forecast (same day)
        print(f"\n[Test 3] Updating existing forecast for {test_symbol}...")
        price_series_2 = [
            {"date": "2024-01-01", "close": 100.5},
            {"date": "2024-01-02", "close": 101.5},
            {"date": "2024-01-03", "close": 102.5},
        ]
        
        forecast_results_2 = {
            "forecast": [
                {"date": "2024-01-04", "price": 103.5},
                {"date": "2024-01-05", "price": 104.5},
            ],
            "mse": 0.4,
            "r2": 0.96
        }
        
        result2 = await insert_cached_forecast(
            symbol=test_symbol,
            price_series=price_series_2,
            forecast_results=forecast_results_2
        )
        
        if result2:
            print(f"✅ Test 3 PASSED: Successfully updated forecast")
            print(f"   Forecast ID: {result2.id}")
            print(f"   Run Date: {result2.runDate}")
            
            # Verify it's the same record (same ID)
            if result2.id == result1.id:
                print(f"   ✅ Confirmed: Same record updated (ID matches)")
            else:
                print(f"   ⚠️ Warning: Different record created (ID changed)")
        else:
            print(f"❌ Test 3 FAILED: Failed to update forecast")
        
        # Test 4: Verify updated data
        print(f"\n[Test 4] Verifying updated forecast data...")
        updated_forecast = await db.stockforecast.find_first(
            where={'symbol': test_symbol},
            order={'runDate': 'desc'}
        )
        
        if updated_forecast:
            print(f"✅ Test 4 PASSED: Retrieved updated forecast")
            print(f"   Latest MSE: {updated_forecast.forecastResults.get('mse') if isinstance(updated_forecast.forecastResults, dict) else 'N/A'}")
            print(f"   Latest R2: {updated_forecast.forecastResults.get('r2') if isinstance(updated_forecast.forecastResults, dict) else 'N/A'}")
            
            # Check if data was actually updated
            if isinstance(updated_forecast.forecastResults, dict):
                if updated_forecast.forecastResults.get('mse') == 0.4:
                    print(f"   ✅ Confirmed: Forecast data was updated correctly")
                else:
                    print(f"   ⚠️ Warning: Forecast data may not have updated correctly")
        
        # Cleanup: Delete test record
        print(f"\n[Cleanup] Deleting test forecast for {test_symbol}...")
        try:
            await db.stockforecast.delete_many(where={'symbol': test_symbol})
            print(f"✅ Cleanup complete: Test records deleted")
        except Exception as e:
            print(f"⚠️ Cleanup warning: {e}")
        
        print("\n" + "=" * 80)
        print("All tests completed!")
        print("=" * 80)
        
    except Exception as e:
        print(f"\n❌ Test failed with error: {e}")
        import traceback
        traceback.print_exc()
    finally:
        await db.disconnect()


if __name__ == "__main__":
    asyncio.run(test_forecast_update())

