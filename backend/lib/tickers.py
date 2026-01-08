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

