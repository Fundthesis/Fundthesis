import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import YahooFinance from 'yahoo-finance2';

const yahooFinance = new YahooFinance();
const DEFAULT_LOOKBACK_DAYS = 90;

export async function GET() {
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

    const tickers = extractTickers(userAccountRows);

    if (tickers.length === 0) {
      return NextResponse.json({ tickers: [], performance: [] });
    }

    const histories = await loadHistories(tickers);
    const performance = computePortfolioPerformance(histories);
    const summary = buildSummary(performance);

    // Build per-ticker stock data with current prices and changes
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

export async function POST(request) {
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

export async function DELETE(request) {
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

function extractTickers(rows) {
  const tickerSet = new Set();

  rows.forEach((row) => {
    if (typeof row.stockTicker === 'string' && row.stockTicker.trim().length > 0) {
      tickerSet.add(row.stockTicker.trim().toUpperCase());
    }
  });

  return Array.from(tickerSet.values());
}

async function loadHistories(tickers) {
  const results = await Promise.all(
    tickers.map(async (ticker) => {
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

async function fetchCachedPrices(ticker) {
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

  // Transform the OHLCV data to match expected format
  return data.price_series
    .map((entry) => {
      // Handle both ISO date strings and regular date strings
      let dateStr;
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
    .filter((row) => row !== null)
    .sort((a, b) => a.date.localeCompare(b.date));
}

async function downloadAndCachePrices(ticker) {
  try {
    const historical = await yahooFinance.historical(ticker, {
      period1: new Date(Date.now() - DEFAULT_LOOKBACK_DAYS * 24 * 60 * 60 * 1000),
      period2: new Date(),
      interval: '1d',
    });

    if (!Array.isArray(historical) || historical.length === 0) {
      console.warn(`No historical data returned for ${ticker}`);
      return [];
    }

    const priceRows = historical
      .map((item) => {
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
      .filter((row) => row !== null)
      .sort((a, b) => a.date.localeCompare(b.date));

    if (priceRows.length === 0) {
      return [];
    }

    // Format data to match your Python script's format (OHLCV with capital letters and ISO dates)
    const ohlcvData = historical
      .map((item) => {
        const date = normaliseDate(item.date);
        if (!date) return null;

        return {
          Date: new Date(date).toISOString(), // ISO format to match Python script
          Open: item.open || 0,
          High: item.high || 0,
          Low: item.low || 0,
          Close: item.close || 0,
          Volume: item.volume || 0,
        };
      })
      .filter((row) => row !== null);

    // Save to stock_price_series table with UPSERT (matching Python script behavior)
    await prisma.stockPriceSeries.upsert({
      where: {
        symbol: ticker
      },
      update: {
        price_series: ohlcvData
      },
      create: {
        symbol: ticker,
        price_series: ohlcvData
      }
    });

    console.log(`✅ Cached ${ohlcvData.length} price points for ${ticker}`);

    return priceRows;
  } catch (error) {
    console.error(`Error downloading price data for ${ticker}:`, error);
    return [];
  }
}

function computePortfolioPerformance(histories) {
  const dateMap = new Map();

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

function buildSummary(performance) {
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

function buildStockData(histories) {
  const stockData = {};

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

    // Sort by date to ensure we have the latest data
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

function deltaFromOffset(performance, offset) {
  if (performance.length <= offset) {
    return 0;
  }

  const latest = performance[performance.length - 1]?.percentChange ?? 0;
  const previous = performance[performance.length - 1 - offset]?.percentChange ?? latest;
  return latest - previous;
}

function normaliseDate(input) {
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
