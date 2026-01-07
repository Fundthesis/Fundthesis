import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import { fetchHistorical } from '@/lib/yahooFinanceService';

const DEFAULT_LOOKBACK_DAYS = 90;
const TICKER_REGEX = /^[A-Z]{1,5}$/;

interface PriceRow {
  ticker: string;
  date: string;
  close: number;
}

interface PerformancePoint {
  date: string;
  percentChange: number;
}

interface OHLCVEntry {
  Date: string;
  Open: number;
  High: number;
  Low: number;
  Close: number;
  Volume: number;
}

interface StockDataEntry {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
}

interface PortfolioSummary {
  latestPercent: number;
  latestValue: number;
  dailyChange: number;
  weeklyChange: number;
  monthlyChange: number;
}

interface UserAccountRow {
  stockTicker: string | null;
}

interface HistoricalItem {
  date: Date | string;
  open?: number;
  high?: number;
  low?: number;
  close: number;
  volume?: number;
}

export async function GET(): Promise<NextResponse> {
  try {
    const session = await auth.api.getSession({
      headers: await headers()
    });

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = session.user;

    const userAccountRows = await prisma.userAccount.findMany({
      where: {
        userId: user.id
      }
    });

    if (!userAccountRows || userAccountRows.length === 0) {
      return NextResponse.json({ tickers: [], performance: [] });
    }

    const tickers = extractTickers(userAccountRows as UserAccountRow[]);

    if (tickers.length === 0) {
      return NextResponse.json({ tickers: [], performance: [] });
    }

    const histories = await loadHistories(tickers);
    const performance = computePortfolioPerformance(histories);
    const summary = buildSummary(performance);
    const stockData = buildStockData(histories);

    return NextResponse.json({
      tickers,
      performance,
      summary,
      stockData,
    });
  } catch (error) {
    console.error('Unexpected error loading portfolio performance:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const session = await auth.api.getSession({
      headers: await headers()
    });

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = session.user;

    const body = await request.json();
    const rawTicker = typeof body?.ticker === 'string' ? body.ticker : '';
    const ticker = rawTicker.trim().toUpperCase();

    if (ticker.length === 0) {
      return NextResponse.json({ error: 'Ticker is required' }, { status: 400 });
    }

    if (!TICKER_REGEX.test(ticker)) {
      return NextResponse.json({ error: 'Invalid ticker format. Must be 1-5 uppercase letters.' }, { status: 400 });
    }

    const existingRow = await prisma.userAccount.findFirst({
      where: {
        userId: user.id,
        stockTicker: ticker
      }
    });

    if (existingRow) {
      return NextResponse.json(
        { success: true, ticker, message: 'Ticker already exists in portfolio' },
        { status: 200 },
      );
    }

    await prisma.userAccount.create({
      data: {
        userId: user.id,
        stockTicker: ticker
      }
    });

    return NextResponse.json({ success: true, ticker });
  } catch (error) {
    console.error('Unexpected error adding ticker:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest): Promise<NextResponse> {
  try {
    const session = await auth.api.getSession({
      headers: await headers()
    });

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = session.user;

    const body = await request.json();
    const rawTicker = typeof body?.ticker === 'string' ? body.ticker : '';
    const ticker = rawTicker.trim().toUpperCase();

    if (ticker.length === 0) {
      return NextResponse.json({ error: 'Ticker is required' }, { status: 400 });
    }

    await prisma.userAccount.deleteMany({
      where: {
        userId: user.id,
        stockTicker: ticker
      }
    });

    return NextResponse.json({ success: true, ticker });
  } catch (error) {
    console.error('Unexpected error deleting ticker:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

function extractTickers(rows: UserAccountRow[]): string[] {
  const tickerSet = new Set<string>();

  rows.forEach((row) => {
    if (typeof row.stockTicker === 'string' && row.stockTicker.trim().length > 0) {
      tickerSet.add(row.stockTicker.trim().toUpperCase());
    }
  });

  return Array.from(tickerSet.values());
}

async function loadHistories(tickers: string[]): Promise<Record<string, PriceRow[]>> {
  const results = await Promise.all(
    tickers.map(async (ticker): Promise<[string, PriceRow[]]> => {
      const cached = await fetchCachedPrices(ticker);

      if (cached.length > 0) {
        return [ticker, cached.sort((a, b) => a.date.localeCompare(b.date))];
      }

      const downloaded = await downloadAndCachePrices(ticker);
      return [ticker, downloaded];
    }),
  );

  return Object.fromEntries(results);
}

async function fetchCachedPrices(ticker: string): Promise<PriceRow[]> {
  const data = await prisma.stockPriceSeries.findUnique({
    where: {
      symbol: ticker
    },
    select: {
      price_series: true
    }
  });

  if (!data || !data.price_series || !Array.isArray(data.price_series)) {
    return [];
  }

  return (data.price_series as unknown as OHLCVEntry[])
    .map((entry): PriceRow | null => {
      let dateStr: string | null = null;
      if (entry.Date) {
        const dateObj = new Date(entry.Date);
        dateStr = dateObj.toISOString().split('T')[0];
      } else {
        return null;
      }

      const close = typeof entry.Close === 'number' ? entry.Close : Number(entry.Close ?? 0);

      if (!dateStr || Number.isNaN(close)) {
        return null;
      }

      return {
        ticker,
        date: dateStr,
        close,
      };
    })
    .filter((row): row is PriceRow => row !== null)
    .sort((a, b) => a.date.localeCompare(b.date));
}

async function downloadAndCachePrices(ticker: string): Promise<PriceRow[]> {
  try {
    const historical = await fetchHistorical(
      ticker,
      new Date(Date.now() - DEFAULT_LOOKBACK_DAYS * 24 * 60 * 60 * 1000),
      new Date(),
      '1d',
    );

    if (!Array.isArray(historical) || historical.length === 0) {
      console.warn(`No historical data returned for ${ticker}`);
      return [];
    }

    const priceRows = (historical as HistoricalItem[])
      .map((item): PriceRow | null => {
        if (typeof item.close !== 'number' || Number.isNaN(item.close)) {
          return null;
        }

        const date = normaliseDate(item.date);
        if (!date) {
          return null;
        }

        return {
          ticker,
          date,
          close: Number(item.close),
        };
      })
      .filter((row): row is PriceRow => row !== null)
      .sort((a, b) => a.date.localeCompare(b.date));

    if (priceRows.length === 0) {
      return [];
    }

    const ohlcvData = (historical as HistoricalItem[])
      .map((item): OHLCVEntry | null => {
        const date = normaliseDate(item.date);
        if (!date) return null;

        return {
          Date: new Date(date).toISOString(),
          Open: item.open || 0,
          High: item.high || 0,
          Low: item.low || 0,
          Close: item.close || 0,
          Volume: item.volume || 0,
        };
      })
      .filter((row): row is OHLCVEntry => row !== null);

    // Cast to Prisma JSON input type
    const priceSeriesData = JSON.parse(JSON.stringify(ohlcvData));

    await prisma.stockPriceSeries.upsert({
      where: {
        symbol: ticker
      },
      update: {
        price_series: priceSeriesData
      },
      create: {
        symbol: ticker,
        price_series: priceSeriesData
      }
    });

    console.log(`Cached ${ohlcvData.length} price points for ${ticker}`);

    return priceRows;
  } catch (error) {
    console.error(`Error downloading price data for ${ticker}:`, error);
    return [];
  }
}

function computePortfolioPerformance(histories: Record<string, PriceRow[]>): PerformancePoint[] {
  const dateMap = new Map<string, { totalPercent: number; count: number }>();

  Object.values(histories).forEach((rows) => {
    if (!rows || rows.length === 0) {
      return;
    }

    const baseline = rows[0]?.close ?? 0;

    if (!baseline || baseline <= 0) {
      return;
    }

    rows.forEach((row) => {
      const percentChange = ((row.close - baseline) / baseline) * 100;
      const entry = dateMap.get(row.date);

      if (entry) {
        entry.totalPercent += percentChange;
        entry.count += 1;
      } else {
        dateMap.set(row.date, {
          totalPercent: percentChange,
          count: 1,
        });
      }
    });
  });

  return Array.from(dateMap.entries())
    .map(([date, { totalPercent, count }]) => ({
      date,
      percentChange: count > 0 ? totalPercent / count : 0,
    }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

function buildSummary(performance: PerformancePoint[]): PortfolioSummary | null {
  if (performance.length === 0) {
    return null;
  }

  const lastPoint = performance[performance.length - 1];
  const latestPercent = lastPoint.percentChange;
  const latestValue = 100 * (1 + latestPercent / 100);

  const dailyChange = deltaFromOffset(performance, 1);
  const weeklyChange = deltaFromOffset(performance, 5);
  const monthlyChange = deltaFromOffset(performance, 21);

  return {
    latestPercent,
    latestValue,
    dailyChange,
    weeklyChange,
    monthlyChange,
  };
}

function buildStockData(histories: Record<string, PriceRow[]>): Record<string, StockDataEntry> {
  const stockData: Record<string, StockDataEntry> = {};

  Object.entries(histories).forEach(([ticker, rows]) => {
    if (!rows || rows.length === 0) {
      stockData[ticker] = {
        symbol: ticker,
        price: 0,
        change: 0,
        changePercent: 0,
      };
      return;
    }

    const sortedRows = [...rows].sort((a, b) => a.date.localeCompare(b.date));

    const latestRow = sortedRows[sortedRows.length - 1];
    const previousRow = sortedRows.length > 1 ? sortedRows[sortedRows.length - 2] : latestRow;

    const currentPrice = latestRow.close;
    const previousPrice = previousRow.close;
    const change = currentPrice - previousPrice;
    const changePercent = previousPrice !== 0 ? (change / previousPrice) * 100 : 0;

    stockData[ticker] = {
      symbol: ticker,
      price: Math.round(currentPrice * 100) / 100,
      change: Math.round(change * 100) / 100,
      changePercent: Math.round(changePercent * 100) / 100,
    };
  });

  return stockData;
}

function deltaFromOffset(performance: PerformancePoint[], offset: number): number {
  if (performance.length <= offset) {
    return 0;
  }

  const latest = performance[performance.length - 1]?.percentChange ?? 0;
  const previous = performance[performance.length - 1 - offset]?.percentChange ?? latest;
  return latest - previous;
}

function normaliseDate(input: Date | string | null | undefined): string | null {
  if (!input) {
    return null;
  }

  if (input instanceof Date) {
    return input.toISOString().split('T')[0];
  }

  if (typeof input === 'string') {
    const parsed = new Date(input);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed.toISOString().split('T')[0];
    }
  }

  return null;
}
