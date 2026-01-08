"""Tests for utility functions."""
import pytest
from lib.tickers import extract_tickers_from_text, MAJOR_TICKERS
from lib.stock_data import get_stock_symbols, get_current_price, get_stock_info
from unittest.mock import patch, Mock
import pandas as pd


def test_extract_tickers_from_text():
    """Test ticker extraction from text."""
    text = "Apple (AAPL) and Microsoft (MSFT) stocks are rising."
    tickers = extract_tickers_from_text(text)
    assert 'AAPL' in tickers
    assert 'MSFT' in tickers


def test_extract_tickers_case_insensitive():
    """Test ticker extraction is case insensitive."""
    text = "apple aapl and microsoft msft"
    tickers = extract_tickers_from_text(text)
    assert 'AAPL' in tickers or 'aapl' in tickers
    assert 'MSFT' in tickers or 'msft' in tickers


def test_extract_tickers_no_matches():
    """Test ticker extraction with no matches."""
    text = "This is a regular sentence with no tickers."
    tickers = extract_tickers_from_text(text)
    assert isinstance(tickers, list)
    assert len(tickers) == 0


def test_extract_tickers_empty_text():
    """Test ticker extraction with empty text."""
    tickers = extract_tickers_from_text("")
    assert tickers == []
    
    tickers = extract_tickers_from_text(None)
    assert tickers == []


def test_get_stock_symbols():
    """Test loading stock symbols from JSON."""
    symbols = get_stock_symbols()
    assert isinstance(symbols, list)
    assert len(symbols) > 0
    assert 'AAPL' in symbols
    assert 'MSFT' in symbols


@patch('lib.stock_data.yf.Ticker')
def test_get_current_price(mock_ticker_class):
    """Test getting current stock price."""
    mock_ticker = Mock()
    mock_ticker.history.return_value = pd.DataFrame({
        'Close': [150.0]
    }, index=pd.date_range('2024-01-01', periods=1))
    
    mock_ticker_class.return_value = mock_ticker
    
    price = get_current_price('AAPL')
    assert price == 150.0


@patch('lib.stock_data.yf.Ticker')
def test_get_current_price_invalid_symbol(mock_ticker_class):
    """Test getting price for invalid symbol."""
    mock_ticker = Mock()
    mock_ticker.history.return_value = pd.DataFrame()  # Empty
    mock_ticker_class.return_value = mock_ticker
    
    price = get_current_price('INVALID')
    assert price is None


@patch('lib.stock_data.yf.Ticker')
def test_get_stock_info(mock_ticker_class):
    """Test getting stock info."""
    mock_ticker = Mock()
    mock_ticker.info = {
        'longName': 'Apple Inc.',
        'symbol': 'AAPL',
        'currentPrice': 150.0,
        'marketCap': 2500000000000
    }
    mock_ticker_class.return_value = mock_ticker
    
    info = get_stock_info('AAPL')
    assert info is not None
    assert info['longName'] == 'Apple Inc.'
    assert info['symbol'] == 'AAPL'


@patch('lib.stock_data.yf.Ticker')
def test_get_stock_info_invalid_symbol(mock_ticker_class):
    """Test getting info for invalid symbol."""
    mock_ticker = Mock()
    mock_ticker.info = None
    mock_ticker_class.return_value = mock_ticker
    
    info = get_stock_info('INVALID')
    assert info is None

