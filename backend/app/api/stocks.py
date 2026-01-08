"""Stock API endpoints - consolidated from Flask server."""
import sys
from pathlib import Path
from fastapi import APIRouter, HTTPException, Query
from typing import Optional
import yfinance as yf
import json
import traceback

# Add backend to path
backend_path = Path(__file__).parent.parent.parent
if str(backend_path) not in sys.path:
    sys.path.insert(0, str(backend_path))

from jobs.forecasting.xgboost_model import get_next_30_day_predictions
from lib.stock_data import get_stock_symbols

router = APIRouter()


@router.get("/stocks")
async def get_stocks(
    limit: int = Query(default=20, ge=1, le=100),
    offset: int = Query(default=0, ge=0)
):
    """Get paginated list of stocks with current prices."""
    symbols = get_stock_symbols()
    
    # Paginate symbols
    paginated_symbols = symbols[offset:offset + limit]
    
    stock_data = []
    
    for symbol in paginated_symbols:
        try:
            ticker = yf.Ticker(symbol)
            history = ticker.history(period='1d')
            
            if not history.empty:
                current_price = history['Close'].iloc[-1]
                open_price = history['Open'].iloc[0]
                change = current_price - open_price
                change_percent = (change / open_price) * 100
                
                stock_data.append({
                    'symbol': symbol,
                    'price': round(current_price, 2),
                    'change': round(change, 2),
                    'changePercent': round(change_percent, 2)
                })
        except Exception as e:
            print(f"Error fetching {symbol}: {e}")
    
    return {
        'stocks': stock_data,
        'total': len(symbols),
        'offset': offset,
        'limit': limit,
        'hasMore': (offset + limit) < len(symbols)
    }


@router.get("/stock/{symbol}")
async def get_stock_detail(
    symbol: str,
    days: int = Query(default=30, ge=1, le=3650)
):
    """Get detailed stock information including forecast."""
    try:
        print(f"📊 Fetching stock detail for {symbol}...")
        
        ticker = yf.Ticker(symbol)
        info = ticker.info
        
        # Get historical data based on timeframe
        if days <= 7:
            period = '5d'
            interval = '1h'
        elif days <= 30:
            period = '1mo'
            interval = '1d'
        elif days <= 90:
            period = '3mo'
            interval = '1d'
        elif days <= 365:
            period = '1y'
            interval = '1d'
        else:
            period = 'max'
            interval = '1wk'
        
        history = ticker.history(period=period, interval=interval)
        
        # Get current day data
        today_history = ticker.history(period='1d')
        
        if today_history.empty:
            raise HTTPException(status_code=404, detail="No data available for this symbol")
        
        current_price = today_history['Close'].iloc[-1]
        open_price = today_history['Open'].iloc[0]
        change = current_price - open_price
        change_percent = (change / open_price) * 100
        
        # Format historical data for chart
        chart_data = []
        for index, row in history.iterrows():
            chart_data.append({
                'date': index.strftime('%Y-%m-%d'),
                'price': round(float(row['Close']), 2),
                'volume': int(row['Volume'])
            })
        
        print(f"✅ Historical data: {len(chart_data)} points")
        
        # Get forecast data
        print(f"🔮 Starting forecast for {symbol}... (this may take a while)")
        forecast_data = []
        
        try:
            predict_df, mse, r2 = get_next_30_day_predictions(symbol)
            
            if predict_df is not None and not predict_df.empty:
                print(f"✅ Forecast successful: {len(predict_df)} points")
                
                # Convert pandas DataFrame to list of dictionaries
                forecast_data_raw = json.loads(predict_df.to_json(orient='records', date_format='iso'))
                
                # Format each forecast point
                for item in forecast_data_raw:
                    date_val = item.get('Date', item.get('date', ''))
                    price_val = item.get('Predicted_Close', item.get('predicted_price', item.get('price', 0)))
                    
                    # Convert timestamp to date string if needed
                    if isinstance(date_val, (int, float)):
                        from datetime import datetime
                        date_val = datetime.fromtimestamp(date_val / 1000).strftime('%Y-%m-%d')
                    
                    forecast_data.append({
                        'date': date_val,
                        'price': round(float(price_val), 2)
                    })
                
                print(f"📈 Forecast formatted: {len(forecast_data)} points")
        except Exception as e:
            print(f"⚠️ Error generating forecast: {e}")
            traceback.print_exc()
            forecast_data = []
        
        return {
            'symbol': symbol,
            'company': info.get('longName', symbol),
            'price': round(current_price, 2),
            'change': round(change, 2),
            'changePercent': round(change_percent, 2),
            'open': round(float(today_history['Open'].iloc[0]), 2) if not today_history.empty else 0,
            'high': round(float(today_history['High'].max()), 2) if not today_history.empty else 0,
            'low': round(float(today_history['Low'].min()), 2) if not today_history.empty else 0,
            'volume': int(today_history['Volume'].iloc[-1]) if not today_history.empty else 0,
            'avgVolume': int(info.get('averageVolume', 0)),
            'fiftyTwoWeekHigh': round(float(info.get('fiftyTwoWeekHigh', 0)), 2),
            'fiftyTwoWeekLow': round(float(info.get('fiftyTwoWeekLow', 0)), 2),
            'marketCap': info.get('marketCap', 0),
            'peRatio': round(float(info.get('trailingPE', 0)), 2) if info.get('trailingPE') else 0,
            'dividendYield': info.get('dividendYield', 0),
            'sector': info.get('sector', 'N/A'),
            'industry': info.get('industry', 'N/A'),
            'chartData': chart_data,
            'forecastData': forecast_data
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Error fetching {symbol}: {e}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/health")
async def health_check():
    """Health check endpoint."""
    return {'status': 'healthy', 'message': 'API is running'}

