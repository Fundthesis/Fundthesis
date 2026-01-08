"""
Centralized ticker constants and utilities.
Single source of truth for major stock tickers.
"""

# Common stock tickers for major exchanges (NYSE, NASDAQ)
MAJOR_TICKERS = {
    'AAPL', 'MSFT', 'GOOGL', 'AMZN', 'NVDA', 'META', 'TSLA', 'BRK.B', 'V', 'JNJ',
    'WMT', 'JPM', 'MA', 'PG', 'UNH', 'HD', 'DIS', 'BAC', 'VZ', 'ADBE', 'NFLX',
    'PYPL', 'CMCSA', 'KO', 'PFE', 'NKE', 'INTC', 'T', 'CSCO', 'XOM', 'AVGO',
    'COST', 'PEP', 'TMO', 'ABBV', 'MRK', 'CVX', 'WFC', 'ACN', 'DHR', 'MCD',
    'NEE', 'LIN', 'BMY', 'QCOM', 'HON', 'AMGN', 'LOW', 'UPS', 'RTX', 'AMT',
    'UBER', 'LYFT', 'SNAP', 'TWTR', 'SQ', 'SHOP', 'SPOT', 'ZM', 'DOCU', 'CRM',
    'ORCL', 'IBM', 'AMD', 'MU', 'QRVO', 'LRCX', 'KLAC', 'AMAT', 'ASML', 'TSM'
}

# Extended list for comprehensive coverage
EXTENDED_TICKERS = list(MAJOR_TICKERS) + [
    'GS', 'C', 'TMO', 'ABBV', 'MRK', 'CVX', 'WFC', 'ACN', 'DHR', 'MCD',
    'NEE', 'LIN', 'BMY', 'QCOM', 'HON', 'AMGN', 'LOW', 'UPS', 'RTX', 'AMT',
    'NXPI', 'MRVL', 'LRCX', 'KLAC', 'AMAT', 'ADI', 'MCHP', 'SWKS', 'QRVO', 'SLAB',
    'CMG', 'YUM', 'QSR', 'DPZ', 'WING', 'DNUT', 'JACK', 'WEN', 'SONO', 'CAKE',
    'SLB', 'HAL', 'BKR', 'NOV', 'FTI', 'HP', 'RIG', 'VAL', 'MRO', 'DVN',
    'BABA', 'JD', 'PDD', 'BIDU', 'TCEHY', 'SE', 'MELI', 'GRAB', 'DIDI', 'CPNG',
    'ABNB', 'DASH', 'RBLX', 'U', 'PINS', 'SNAP', 'TWTR',
    'DHR', 'ABT', 'SYK', 'BSX', 'MDT', 'ISRG', 'EW', 'ZBH', 'BAX', 'BDX',
    'WBA', 'CVS', 'CI', 'HUM', 'ANTM', 'CNC', 'MOH', 'ELV', 'HCA', 'UHS',
    'F', 'GM', 'TM', 'HMC', 'RACE', 'RIVN', 'LCID', 'NIO', 'XPEV', 'LI'
]

# Ticker pattern regex for extraction
TICKER_PATTERN = r'\b([A-Z]{1,5})\b'

import re


def extract_tickers_from_text(text: str) -> list[str]:
    """
    Extract stock ticker symbols from text.
    
    Uses regex pattern to find potential tickers and filters them against
    known ticker lists to return valid ticker symbols.
    
    Args:
        text: Text to search for ticker symbols
        
    Returns:
        List of unique ticker symbols found in the text (uppercase)
    """
    if not text:
        return []
    
    # Convert to uppercase for matching
    text_upper = text.upper()
    
    # Find all potential tickers using regex
    matches = re.findall(TICKER_PATTERN, text_upper)
    
    # Convert EXTENDED_TICKERS to a set for faster lookup
    valid_tickers = set(EXTENDED_TICKERS)
    
    # Filter matches to only include valid tickers
    found_tickers = []
    seen = set()
    
    for match in matches:
        ticker = match.upper()
        # Check if it's a valid ticker and not already seen
        if ticker in valid_tickers and ticker not in seen:
            found_tickers.append(ticker)
            seen.add(ticker)
    
    return found_tickers

