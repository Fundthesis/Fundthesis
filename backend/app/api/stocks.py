"""Stock API endpoints - consolidated from Flask server."""
import sys
from pathlib import Path
from fastapi import APIRouter, HTTPException, Query
from typing import Optional, Dict, List, Any, Tuple
import yfinance as yf
import json
import traceback
import time
import asyncio

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


async def async_batch_fetch_stocks(symbols: List[str]) -> List[Dict]:
    """Fetch multiple stocks efficiently using batch operations (async wrapper)."""
    return await asyncio.to_thread(batch_fetch_stocks_sync, symbols)


def batch_fetch_stocks_sync(symbols: List[str]) -> List[Dict]:
    """Fetch multiple stocks efficiently using batch operations (synchronous implementation)."""
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


# Keep original function name for backward compatibility
def batch_fetch_stocks(symbols: List[str]) -> List[Dict]:
    """Synchronous wrapper - use async_batch_fetch_stocks in async contexts."""
    return batch_fetch_stocks_sync(symbols)


async def fetch_ticker_info(symbol: str) -> Optional[Dict]:
    """Fetch ticker info asynchronously."""
    try:
        def _fetch():
            ticker = yf.Ticker(symbol)
            return ticker.info
        return await asyncio.to_thread(_fetch)
    except Exception as e:
        print(f"Error fetching metadata for {symbol}: {e}")
        return None


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
        
        # Fetch all ticker info in parallel
        tasks = [fetch_ticker_info(symbol) for symbol in sample_symbols]
        results = await asyncio.gather(*tasks, return_exceptions=True)
        
        for info in results:
            if isinstance(info, Exception):
                continue
            if not info:
                continue
            
            if info.get('sector'):
                sectors.add(info['sector'])
            if info.get('industry'):
                industries.add(info['industry'])
            if info.get('currentPrice'):
                prices.append(float(info['currentPrice']))
        
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
    search: Optional[str] = Query(default=None, description="Search by symbol or company name"),
    sector: Optional[str] = Query(default=None, description="Filter by sector"),
    industry: Optional[str] = Query(default=None, description="Filter by industry"),
    min_price: Optional[float] = Query(default=None, description="Minimum price"),
    max_price: Optional[float] = Query(default=None, description="Maximum price"),
    min_market_cap: Optional[int] = Query(default=None, description="Minimum market cap"),
    max_market_cap: Optional[int] = Query(default=None, description="Maximum market cap"),
):
    """Get paginated list of stocks with current prices. Supports caching and batch operations."""
    # Check cache first
    cache_key = f"stocks_{limit}_{offset}_{symbols or ''}_{search or ''}_{sector or ''}_{industry or ''}_{min_price or ''}_{max_price or ''}_{min_market_cap or ''}_{max_market_cap or ''}"
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
    
    # Use async batch fetching for better performance (non-blocking)
    stock_data = await async_batch_fetch_stocks(paginated_symbols)
    
    # Apply filters
    filtered_data = []
    search_lower = search.lower() if search else None
    
    for stock in stock_data:
        # Search filter (by symbol or company name)
        if search_lower:
            stock_symbol = stock.get('symbol', '').lower()
            stock_company = stock.get('company', '').lower() if stock.get('company') else ''
            if search_lower not in stock_symbol and search_lower not in stock_company:
                continue
        
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
        'total': len(filtered_data) if (search or sector or industry or min_price or max_price or min_market_cap or max_market_cap) else total_symbols,
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
        
        # Fetch info, history, and today_history in parallel
        async def fetch_info():
            return await asyncio.to_thread(lambda: ticker.info)
        
        async def fetch_history():
            return await asyncio.to_thread(lambda: ticker.history(period=period, interval=interval))
        
        async def fetch_today():
            return await asyncio.to_thread(lambda: ticker.history(period='1d'))
        
        info, history, today_history = await asyncio.gather(
            fetch_info(),
            fetch_history(),
            fetch_today()
        )
        
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


@router.get("/stock/{symbol}/chart")
async def get_stock_chart(
    symbol: str,
    days: int = Query(default=30, ge=1, le=3650)
):
    """Get chart data only for a stock. Optimized for timeframe switching."""
    symbol_upper = symbol.upper().strip()
    
    # Check cache first
    cache_key = f"stock_chart_{symbol_upper}_{days}"
    cached_result = get_cached(cache_key, DETAIL_CACHE_TTL_SECONDS)
    if cached_result:
        print(f"✅ Cache hit for stock chart: {symbol_upper} ({days} days)")
        return cached_result
    
    try:
        print(f"📊 Fetching chart data for {symbol_upper} ({days} days)...")
        
        ticker = yf.Ticker(symbol_upper)
        
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
        
        # Fetch history in thread pool
        history = await asyncio.to_thread(lambda: ticker.history(period=period, interval=interval))
        
        # Format historical data for chart
        chart_data = []
        for index, row in history.iterrows():
            chart_data.append({
                'date': index.strftime('%Y-%m-%d'),
                'price': round(float(row['Close']), 2),
                'volume': int(row['Volume'])
            })
        
        print(f"✅ Chart data: {len(chart_data)} points")
        
        # Get forecast data (forecast doesn't change with timeframe, but include it for consistency)
        forecast_data = []
        try:
            predict_df, mse, r2 = get_next_30_day_predictions(symbol_upper)
            
            if predict_df is not None and not predict_df.empty:
                forecast_data_raw = json.loads(predict_df.to_json(orient='records', date_format='iso'))
                
                for item in forecast_data_raw:
                    date_val = item.get('Date', item.get('date', ''))
                    price_val = item.get('Predicted_Close', item.get('predicted_price', item.get('price', 0)))
                    
                    if isinstance(date_val, (int, float)):
                        from datetime import datetime
                        date_val = datetime.fromtimestamp(date_val / 1000).strftime('%Y-%m-%d')
                    
                    forecast_data.append({
                        'date': date_val,
                        'price': round(float(price_val), 2)
                    })
        except Exception as e:
            print(f"⚠️ Error generating forecast: {e}")
            forecast_data = []
        
        result = {
            'chartData': chart_data,
            'forecastData': forecast_data
        }
        
        # Cache the result
        set_cached(cache_key, result)
        
        return result
        
    except Exception as e:
        print(f"❌ Error fetching chart for {symbol_upper}: {e}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/health")
async def health_check():
    """Health check endpoint."""
    return {'status': 'healthy', 'message': 'API is running'}

