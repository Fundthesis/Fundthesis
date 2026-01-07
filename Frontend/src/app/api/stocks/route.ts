import { NextRequest, NextResponse } from 'next/server';
import { fetchQuotes, quoteToStockSummary } from '@/lib/yahooFinanceService';

type PriceSeriesPoint = {
  date: string;
  price: number;
};

type StockSummary = {
  symbol: string;
  company: string;
  price: number;
  change: number;
  changePercent: number;
  forecastData: PriceSeriesPoint[];
};

// Extended list of symbols (matching the Python server)
const SYMBOLS = [
  'AAPL', 'GOOGL', 'MSFT', 'TSLA', 'AMZN', 'NVDA', 'META', 'NFLX',
  'JPM', 'BAC', 'GS', 'WFC', 'C', 'JNJ', 'UNH', 'PFE', 'ABBV', 'TMO',
  'WMT', 'HD', 'DIS', 'NKE', 'SBUX', 'XOM', 'CVX', 'COP', 'BA', 'CAT',
  'GE', 'T', 'VZ', 'CMCSA', 'INTC', 'AMD', 'QCOM', 'AVGO', 'TXN', 'MU',
  'V', 'MA', 'PYPL', 'AXP', 'SQ', 'BLK', 'SCHW', 'MS', 'SPGI', 'ICE',
  'KO', 'PEP', 'COST', 'MCD', 'MDLZ', 'PM', 'MO', 'CL', 'PG', 'UL',
  'ADBE', 'CRM', 'ORCL', 'NOW', 'INTU', 'SHOP', 'SNOW', 'DDOG', 'ZM', 'TEAM',
  'UPS', 'FDX', 'DAL', 'LUV', 'UAL', 'AAL', 'MAR', 'HLT', 'RCL', 'CCL',
  'HON', 'RTX', 'LMT', 'NOC', 'GD', 'BA', 'DE', 'EMR', 'ITW', 'MMM',
  'BMY', 'LLY', 'MRK', 'GILD', 'AMGN', 'BIIB', 'REGN', 'VRTX', 'ILMN', 'ALXN',
  'NEE', 'DUK', 'SO', 'D', 'AEP', 'EXC', 'SRE', 'PEG', 'XEL', 'ED',
  'LOW', 'TGT', 'TJX', 'ROST', 'DG', 'DLTR', 'BBY', 'EBAY', 'ETSY', 'W',
  'F', 'GM', 'TM', 'HMC', 'RACE', 'RIVN', 'LCID', 'NIO', 'XPEV', 'LI',
  'BABA', 'JD', 'PDD', 'BIDU', 'TCEHY', 'SE', 'MELI', 'GRAB', 'DIDI', 'CPNG',
  'UBER', 'LYFT', 'ABNB', 'DASH', 'SPOT', 'RBLX', 'U', 'PINS', 'SNAP', 'TWTR',
  'DHR', 'ABT', 'SYK', 'BSX', 'MDT', 'ISRG', 'EW', 'ZBH', 'BAX', 'BDX',
  'WBA', 'CVS', 'CI', 'HUM', 'ANTM', 'CNC', 'MOH', 'ELV', 'HCA', 'UHS',
  'NXPI', 'MRVL', 'LRCX', 'KLAC', 'AMAT', 'ADI', 'MCHP', 'SWKS', 'QRVO', 'SLAB',
  'CMG', 'YUM', 'QSR', 'DPZ', 'WING', 'DNUT', 'JACK', 'WEN', 'SONO', 'CAKE',
  'SLB', 'HAL', 'BKR', 'NOV', 'FTI', 'HP', 'RIG', 'VAL', 'MRO', 'DVN'
];

async function fetchYahooSummaries(symbols: string[]): Promise<StockSummary[]> {
  if (symbols.length === 0) {
    return [];
  }

  try {
    console.log(`🌐 Fetching quotes for ${symbols.length} symbols: ${symbols.join(', ')}...`);

    // Use the service wrapper which handles caching, rate limiting, and retries
    const quotes = await fetchQuotes(symbols, true);

    console.log(`✅ Received ${quotes.length} quotes from Yahoo Finance service`);

    const summaries: StockSummary[] = [];

    for (const quote of quotes) {
      const summary = quoteToStockSummary(quote);
      if (summary) {
        summaries.push({
          ...summary,
          forecastData: [], // Forecast data handled separately
        });
      }
    }

    return summaries;
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`❌ Error fetching bulk quotes from Yahoo Finance:`, errorMessage);
    return [];
  }
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);
    const symbolsParam = searchParams.get('symbols');

    console.log(`📥 Received symbols param: "${symbolsParam}"`);

    const customSymbols = symbolsParam && symbolsParam !== 'null'
      ? Array.from(
        new Set(
          symbolsParam
            .split(',')
            .map((symbol) => symbol.trim().toUpperCase())
            .filter((symbol) => symbol.length > 0),
        ),
      )
      : null;

    console.log(`📥 Parsed custom symbols: ${customSymbols ? customSymbols.join(', ') : 'none'}`);

    const paginatedSymbols =
      customSymbols && customSymbols.length > 0
        ? customSymbols
        : SYMBOLS.slice(offset, offset + limit);

    if (paginatedSymbols.length === 0) {
      return NextResponse.json({
        stocks: [],
        total: customSymbols ? 0 : SYMBOLS.length,
        offset: customSymbols ? 0 : offset,
        limit: customSymbols ? 0 : limit,
        hasMore: false,
      });
    }

    const responseOffset = customSymbols ? 0 : offset;
    const responseLimit = customSymbols ? paginatedSymbols.length : limit;
    const responseTotal = customSymbols ? customSymbols.length : SYMBOLS.length;
    const responseHasMore = customSymbols ? false : offset + limit < SYMBOLS.length;

    const symbolsToFetch = paginatedSymbols.map(s => s.toUpperCase());

    console.log(`🌐 Fetching live data for ${symbolsToFetch.length} symbols`);

    const stocks = await fetchYahooSummaries(symbolsToFetch);

    console.log(`📈 Total stocks to return: ${stocks.length}`);

    return NextResponse.json({
      stocks,
      total: responseTotal,
      offset: responseOffset,
      limit: responseLimit,
      hasMore: responseHasMore,
    });
  } catch (error) {
    console.error('Error in /api/stocks:', error);
    return NextResponse.json({ error: 'Failed to fetch stocks' }, { status: 500 });
  }
}
