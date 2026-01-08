"""Stock API endpoints - consolidated from Flask server."""
import sys
from pathlib import Path
from fastapi import APIRouter, HTTPException, Query
from typing import Optional, Dict, List, Any, Tuple
import yfinance as yf
import json
import traceback
import time

# Add backend to path
backend_path = Path(__file__).parent.parent.parent
if str(backend_path) not in sys.path:
    sys.path.insert(0, str(backend_path))

from jobs.forecasting.xgboost_model import get_next_30_day_predictions
from lib.stock_data import get_stock_symbols

router = APIRouter()

# Simple in-memory cache with TTL
_cache: Dict[str, Tuple[float, Any]] = {}
CACHE_TTL_SECONDS = 60  # Cache for 60 seconds for ticker data
DETAIL_CACHE_TTL_SECONDS = 300  # Cache for 5 minutes for detailed stock data


def get_cached(key: str, ttl: int) -> Optional[Any]:
    """Get cached value if not expired."""
    if key in _cache:
        timestamp, value = _cache[key]
        if time.time() - timestamp < ttl:
            return value
        else:
            del _cache[key]
    return None


def set_cached(key: str, value: Any):
    """Set cached value with current timestamp."""
    _cache[key] = (time.time(), value)


def batch_fetch_stocks(symbols: List[str]) -> List[Dict]:
    """Fetch multiple stocks efficiently using batch operations."""
    stock_data = []
    
    # Use yfinance's download for batch fetching (more efficient)
    try:
        # Download data for all symbols at once
        tickers = yf.download(symbols, period='1d', group_by='ticker', progress=False, threads=True)
        
        for symbol in symbols:
            try:
                if symbol in tickers.columns.levels[0] if hasattr(tickers.columns, 'levels') else False:
                    # Multi-index DataFrame structure
                    symbol_data = tickers[symbol]
                    if not symbol_data.empty:
                        current_price = float(symbol_data['Close'].iloc[-1])
                        open_price = float(symbol_data['Open'].iloc[0])
                        change = current_price - open_price
                        change_percent = (change / open_price) * 100 if open_price != 0 else 0
                        
                        # Get additional info for filtering
                        try:
                            ticker = yf.Ticker(symbol)
                            info = ticker.info
                            stock_data.append({
                                'symbol': symbol,
                                'company': info.get('longName', symbol),
                                'price': round(current_price, 2),
                                'change': round(change, 2),
                                'changePercent': round(change_percent, 2),
                                'sector': info.get('sector'),
                                'industry': info.get('industry'),
                                'marketCap': info.get('marketCap', 0)
                            })
                        except:
                            stock_data.append({
                                'symbol': symbol,
                                'price': round(current_price, 2),
                                'change': round(change, 2),
                                'changePercent': round(change_percent, 2)
                            })
                else:
                    # Fallback to individual fetch if batch didn't work
                    ticker = yf.Ticker(symbol)
                    history = ticker.history(period='1d')
                    
                    if not history.empty:
                        current_price = history['Close'].iloc[-1]
                        open_price = history['Open'].iloc[0]
                        change = current_price - open_price
                        change_percent = (change / open_price) * 100 if open_price != 0 else 0
                        
                        # Get additional info for filtering
                        try:
                            ticker = yf.Ticker(symbol)
                            info = ticker.info
                            stock_data.append({
                                'symbol': symbol,
                                'company': info.get('longName', symbol),
                                'price': round(current_price, 2),
                                'change': round(change, 2),
                                'changePercent': round(change_percent, 2),
                                'sector': info.get('sector'),
                                'industry': info.get('industry'),
                                'marketCap': info.get('marketCap', 0)
                            })
                        except:
                            stock_data.append({
                                'symbol': symbol,
                                'price': round(current_price, 2),
                                'change': round(change, 2),
                                'changePercent': round(change_percent, 2)
                            })
            except Exception as e:
                print(f"Error fetching {symbol} in batch: {e}")
                continue
    except Exception as e:
        print(f"Batch fetch failed, falling back to individual fetches: {e}")
        # Fallback to individual fetches
        for symbol in symbols:
            try:
                ticker = yf.Ticker(symbol)
                history = ticker.history(period='1d')
                
                if not history.empty:
                    current_price = history['Close'].iloc[-1]
                    open_price = history['Open'].iloc[0]
                    change = current_price - open_price
                    change_percent = (change / open_price) * 100 if open_price != 0 else 0
                    
                    stock_data.append({
                        'symbol': symbol,
                        'price': round(current_price, 2),
                        'change': round(change, 2),
                        'changePercent': round(change_percent, 2)
                    })
            except Exception as e:
                print(f"Error fetching {symbol}: {e}")
                continue
    
    return stock_data


@router.get("/stocks/metadata")
async def get_stock_metadata():
    """Get unique sectors, industries, and price ranges for filtering."""
    try:
        symbols = get_stock_symbols()
        
        # Fetch metadata for all symbols (can be optimized with caching)
        sectors = set()
        industries = set()
        prices = []
        
        # Sample a subset for performance (or use cached data)
        sample_symbols = symbols[:100]  # Sample first 100 for metadata
        
        for symbol in sample_symbols:
            try:
                ticker = yf.Ticker(symbol)
                info = ticker.info
                
                if info.get('sector'):
                    sectors.add(info['sector'])
                if info.get('industry'):
                    industries.add(info['industry'])
                if info.get('currentPrice'):
                    prices.append(float(info['currentPrice']))
            except Exception as e:
                print(f"Error fetching metadata for {symbol}: {e}")
                continue
        
        return {
            'sectors': sorted(list(sectors)),
            'industries': sorted(list(industries)),
            'priceRange': {
                'min': min(prices) if prices else 0,
                'max': max(prices) if prices else 0,
            }
        }
    except Exception as e:
        print(f"❌ Error fetching stock metadata: {e}")
        traceback.print_exc()
        return {
            'sectors': [],
            'industries': [],
            'priceRange': {'min': 0, 'max': 0}
        }


@router.get("/stocks")
async def get_stocks(
    limit: int = Query(default=20, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    symbols: Optional[str] = Query(default=None, description="Comma-separated list of custom symbols"),
    sector: Optional[str] = Query(default=None, description="Filter by sector"),
    industry: Optional[str] = Query(default=None, description="Filter by industry"),
    min_price: Optional[float] = Query(default=None, description="Minimum price"),
    max_price: Optional[float] = Query(default=None, description="Maximum price"),
    min_market_cap: Optional[int] = Query(default=None, description="Minimum market cap"),
    max_market_cap: Optional[int] = Query(default=None, description="Maximum market cap"),
):
    """Get paginated list of stocks with current prices. Supports caching and batch operations."""
    # Check cache first
    cache_key = f"stocks_{limit}_{offset}_{symbols or ''}"
    cached_result = get_cached(cache_key, CACHE_TTL_SECONDS)
    if cached_result:
        print(f"✅ Cache hit for stocks list")
        return cached_result
    
    # Get symbols list
    if symbols:
        # Parse custom symbols
        custom_symbols = [s.strip().upper() for s in symbols.split(',') if s.strip()]
        paginated_symbols = custom_symbols[:limit]
        total_symbols = len(custom_symbols)
    else:
        all_symbols = get_stock_symbols()
        paginated_symbols = all_symbols[offset:offset + limit]
        total_symbols = len(all_symbols)
    
    if not paginated_symbols:
        result = {
            'stocks': [],
            'total': total_symbols,
            'offset': offset,
            'limit': limit,
            'hasMore': False
        }
        set_cached(cache_key, result)
        return result
    
    # Use batch fetching for better performance
    stock_data = batch_fetch_stocks(paginated_symbols)
    
    # Apply filters
    filtered_data = []
    for stock in stock_data:
        # Sector filter
        if sector and stock.get('sector') != sector:
            continue
        
        # Industry filter
        if industry and stock.get('industry') != industry:
            continue
        
        # Price filters
        if min_price is not None and stock.get('price', 0) < min_price:
            continue
        if max_price is not None and stock.get('price', 0) > max_price:
            continue
        
        # Market cap filters
        stock_market_cap = stock.get('marketCap', 0) or 0
        if min_market_cap is not None and stock_market_cap < min_market_cap:
            continue
        if max_market_cap is not None and stock_market_cap > max_market_cap:
            continue
        
        filtered_data.append(stock)
    
    result = {
        'stocks': filtered_data,
        'total': len(filtered_data) if (sector or industry or min_price or max_price) else total_symbols,
        'offset': offset,
        'limit': limit,
        'hasMore': (offset + limit) < total_symbols if not symbols else False
    }
    
    # Cache the result
    set_cached(cache_key, result)
    
    return result


@router.get("/stock/{symbol}")
async def get_stock_detail(
    symbol: str,
    days: int = Query(default=30, ge=1, le=3650)
):
    """Get detailed stock information including forecast. Supports caching."""
    symbol_upper = symbol.upper().strip()
    
    # Check cache first
    cache_key = f"stock_detail_{symbol_upper}_{days}"
    cached_result = get_cached(cache_key, DETAIL_CACHE_TTL_SECONDS)
    if cached_result:
        print(f"✅ Cache hit for stock detail: {symbol_upper}")
        return cached_result
    
    try:
        print(f"📊 Fetching stock detail for {symbol_upper}...")
        
        ticker = yf.Ticker(symbol_upper)
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
        change_percent = (change / open_price) * 100 if open_price != 0 else 0
        
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
        print(f"🔮 Starting forecast for {symbol_upper}... (this may take a while)")
        forecast_data = []
        
        try:
            predict_df, mse, r2 = get_next_30_day_predictions(symbol_upper)
            
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
        
        result = {
            'symbol': symbol_upper,
            'company': info.get('longName', symbol_upper),
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
        
        # Cache the result
        set_cached(cache_key, result)
        
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Error fetching {symbol_upper}: {e}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/health")
async def health_check():
    """Health check endpoint."""
    return {'status': 'healthy', 'message': 'API is running'}

