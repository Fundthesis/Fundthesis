"""
Shared utilities for fetching and processing stock data using yfinance.
"""

import yfinance as yf
from typing import Optional, Dict, List
import pandas as pd
import json
from pathlib import Path


def get_stock_info(ticker_symbol: str) -> Optional[Dict]:
    """
    Get basic stock information for a ticker symbol.
    
    Args:
        ticker_symbol: Stock ticker symbol (e.g., 'AAPL')
    
    Returns:
        Dictionary with stock info or None if error
    """
    try:
        ticker = yf.Ticker(ticker_symbol)
        info = ticker.info
        return info
    except Exception as e:
        print(f"Error fetching info for {ticker_symbol}: {e}")
        return None


def get_stock_history(ticker_symbol: str, period: str = "1y", interval: str = "1d") -> Optional[pd.DataFrame]:
    """
    Get historical stock data.
    
    Args:
        ticker_symbol: Stock ticker symbol
        period: Period to fetch (1d, 5d, 1mo, 3mo, 6mo, 1y, 2y, 5y, 10y, ytd, max)
        interval: Data interval (1m, 2m, 5m, 15m, 30m, 60m, 90m, 1h, 1d, 5d, 1wk, 1mo, 3mo)
    
    Returns:
        DataFrame with historical data or None if error
    """
    try:
        ticker = yf.Ticker(ticker_symbol)
        history = ticker.history(period=period, interval=interval)
        return history
    except Exception as e:
        print(f"Error fetching history for {ticker_symbol}: {e}")
        return None


def get_current_price(ticker_symbol: str) -> Optional[float]:
    """
    Get current stock price.
    
    Args:
        ticker_symbol: Stock ticker symbol
    
    Returns:
        Current price or None if error
    """
    try:
        ticker = yf.Ticker(ticker_symbol)
        history = ticker.history(period='1d')
        
        if history.empty:
            return None
        
        return float(history['Close'].iloc[-1])
    except Exception as e:
        print(f"Error fetching current price for {ticker_symbol}: {e}")
        return None


def get_price_change(ticker_symbol: str) -> Optional[Dict[str, float]]:
    """
    Get price change for today.
    
    Args:
        ticker_symbol: Stock ticker symbol
    
    Returns:
        Dictionary with 'change' and 'changePercent' or None if error
    """
    try:
        ticker = yf.Ticker(ticker_symbol)
        history = ticker.history(period='1d')
        
        if history.empty:
            return None
        
        current_price = float(history['Close'].iloc[-1])
        open_price = float(history['Open'].iloc[0])
        change = current_price - open_price
        change_percent = (change / open_price) * 100
        
        return {
            'change': round(change, 2),
            'changePercent': round(change_percent, 2)
        }
    except Exception as e:
        print(f"Error fetching price change for {ticker_symbol}: {e}")
        return None


def format_history_for_chart(history: pd.DataFrame) -> List[Dict]:
    """
    Format historical data for chart display.
    
    Args:
        history: DataFrame with historical stock data
    
    Returns:
        List of dictionaries with 'date', 'price', 'volume'
    """
    chart_data = []
    for index, row in history.iterrows():
        chart_data.append({
            'date': index.strftime('%Y-%m-%d'),
            'price': round(float(row['Close']), 2),
            'volume': int(row['Volume'])
        })
    return chart_data


def get_stock_symbols() -> List[str]:
    """
    Get list of stock symbols to track.
    
    Returns:
        List of stock ticker symbols
    """
    symbols_file = Path(__file__).parent / "stock_symbols.json"
    try:
        with open(symbols_file, 'r') as f:
            data = json.load(f)
            return data.get('symbols', [])
    except Exception as e:
        print(f"Error loading stock symbols: {e}")
        # Fallback to major stocks
        return ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'NVDA', 'META', 'TSLA']

