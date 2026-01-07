/**
 * Yahoo Finance service wrapper with rate limiting, retry logic, and caching
 */

import YahooFinance from 'yahoo-finance2';
import { rateLimiter } from './rateLimiter';
import { prisma } from './prisma';

const yahooFinance = new YahooFinance();

// Cache TTLs
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const STALE_CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes for stale fallback

// Batch size for bulk requests (very small to avoid rate limits)
const BATCH_SIZE = 5;

// Retry configuration
const MAX_RETRIES = 5;
const INITIAL_RETRY_DELAY = 1000; // 1 second

export interface QuoteData {
  symbol: string;
  regularMarketPrice?: number;
  regularMarketOpen?: number;
  regularMarketDayHigh?: number;
  regularMarketDayLow?: number;
  regularMarketVolume?: number;
  averageVolume?: number;
  fiftyTwoWeekHigh?: number;
  fiftyTwoWeekLow?: number;
  marketCap?: number;
  trailingPE?: number;
  dividendYield?: number;
  sector?: string;
  industry?: string;
  longName?: string;
  shortName?: string;
}

export interface StockSummary {
  symbol: string;
  company: string;
  price: number;
  change: number;
  changePercent: number;
}

/**
 * Check if error is a rate limit error
 */
function isRateLimitError(error: unknown): boolean {
  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    return (
      message.includes('429') ||
      message.includes('too many requests') ||
      message.includes('rate limit') ||
      message.includes('crumb')
    );
  }
  return false;
}

/**
 * Sleep utility
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Execute Yahoo Finance call with rate limiting and retry logic
 */
async function executeWithRetry<T>(
  fn: () => Promise<T>,
  retryCount = 0,
): Promise<T> {
  try {
    const result = await rateLimiter.execute(fn);
    // Reset failure counter on success
    rateLimiter.resetFailures();
    return result;
  } catch (error) {
    // Check if this is a circuit breaker error
    if (error instanceof Error && error.message.includes('Circuit breaker is open')) {
      console.log('🚫 Circuit breaker is open, skipping retries');
      throw error;
    }

    if (isRateLimitError(error) && retryCount < MAX_RETRIES) {
      const attempt = retryCount + 1;
      const delay = INITIAL_RETRY_DELAY * Math.pow(2, retryCount);
      
      console.log(
        `⚠️ Rate limit error (attempt ${attempt}/${MAX_RETRIES}), retrying in ${delay}ms...`,
      );
      
      rateLimiter.applyBackoff(attempt);
      await sleep(delay);
      
      return executeWithRetry(fn, retryCount + 1);
    }
    throw error;
  }
}

/**
 * Get cached quote from database
 */
async function getCachedQuote(symbol: string): Promise<QuoteData | null> {
  try {
    const cached = await prisma.stockQuoteCache.findUnique({
      where: { symbol: symbol.toUpperCase() },
    });

    if (!cached) {
      return null;
    }

    const age = Date.now() - cached.last_fetched.getTime();
    
    // Return fresh cache (< 5 min)
    if (age < CACHE_TTL_MS) {
      return cached.quote_data as unknown as QuoteData;
    }

    // Return stale cache (< 30 min) for fallback
    if (age < STALE_CACHE_TTL_MS) {
      console.log(`📦 Using stale cache for ${symbol} (${Math.round(age / 1000)}s old)`);
      return cached.quote_data as unknown as QuoteData;
    }

    return null;
  } catch (error) {
    console.error(`Error reading cache for ${symbol}:`, error);
    return null;
  }
}

/**
 * Batch get cached quotes from database (optimized for multiple symbols)
 */
async function getCachedQuotesBatch(symbols: string[]): Promise<Map<string, QuoteData>> {
  const cacheMap = new Map<string, QuoteData>();
  
  if (symbols.length === 0) {
    return cacheMap;
  }

  try {
    const upperSymbols = symbols.map(s => s.toUpperCase());
    const cached = await prisma.stockQuoteCache.findMany({
      where: {
        symbol: {
          in: upperSymbols,
        },
      },
    });

    const now = Date.now();
    
    for (const item of cached) {
      const age = now - item.last_fetched.getTime();
      
      // Return fresh cache (< 5 min) or stale cache (< 30 min)
      if (age < STALE_CACHE_TTL_MS) {
        if (age >= CACHE_TTL_MS) {
          console.log(`📦 Using stale cache for ${item.symbol} (${Math.round(age / 1000)}s old)`);
        }
        cacheMap.set(item.symbol, item.quote_data as unknown as QuoteData);
      }
    }
  } catch (error) {
    console.error(`Error batch reading cache:`, error);
  }

  return cacheMap;
}

/**
 * Save quote to database cache
 */
async function saveCachedQuote(symbol: string, quoteData: QuoteData, error?: string): Promise<void> {
  try {
    // Cast to Prisma JSON input type
    const quoteDataJson = JSON.parse(JSON.stringify(quoteData));

    await prisma.stockQuoteCache.upsert({
      where: { symbol: symbol.toUpperCase() },
      create: {
        symbol: symbol.toUpperCase(),
        quote_data: quoteDataJson,
        last_fetched: new Date(),
        fetch_attempts: error ? 1 : 0,
        last_error: error || null,
      },
      update: {
        quote_data: quoteDataJson,
        last_fetched: new Date(),
        fetch_attempts: error ? { increment: 1 } : 0,
        last_error: error || null,
      },
    });
  } catch (err) {
    console.error(`Error saving cache for ${symbol}:`, err);
  }
}

/**
 * Fetch single quote from Yahoo Finance
 */
export async function fetchQuote(symbol: string, useCache = true): Promise<QuoteData | null> {
  const upperSymbol = symbol.toUpperCase();

  // Check cache first
  if (useCache) {
    const cached = await getCachedQuote(upperSymbol);
    if (cached) {
      return cached;
    }
  }

  try {
    const quote = await executeWithRetry(async () => {
      return await yahooFinance.quote(upperSymbol);
    });

    if (!quote) {
      return null;
    }

    const quoteData: QuoteData = {
      symbol: upperSymbol,
      regularMarketPrice: quote.regularMarketPrice,
      regularMarketOpen: quote.regularMarketOpen,
      regularMarketDayHigh: quote.regularMarketDayHigh,
      regularMarketDayLow: quote.regularMarketDayLow,
      regularMarketVolume: quote.regularMarketVolume,
      averageVolume: quote.averageVolume,
      fiftyTwoWeekHigh: quote.fiftyTwoWeekHigh,
      fiftyTwoWeekLow: quote.fiftyTwoWeekLow,
      marketCap: quote.marketCap,
      trailingPE: quote.trailingPE,
      dividendYield: quote.dividendYield,
      sector: quote.sector,
      industry: quote.industry,
      longName: quote.longName,
      shortName: quote.shortName,
    };

    // Save to cache (non-blocking)
    saveCachedQuote(upperSymbol, quoteData).catch((err) => {
      console.error(`Failed to cache quote for ${upperSymbol}:`, err);
    });

    return quoteData;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`Error fetching quote for ${upperSymbol}:`, errorMessage);

    // Try to return stale cache on error
    if (useCache) {
      const staleCache = await getCachedQuote(upperSymbol);
      if (staleCache) {
        console.log(`📦 Returning stale cache for ${upperSymbol} due to error`);
        return staleCache;
      }
    }

    // Save error to cache
    await saveCachedQuote(upperSymbol, { symbol: upperSymbol }, errorMessage);

    return null;
  }
}

/**
 * Fetch multiple quotes with batching and rate limiting
 */
export async function fetchQuotes(
  symbols: string[],
  useCache = true,
): Promise<QuoteData[]> {
  if (symbols.length === 0) {
    return [];
  }

  const results: QuoteData[] = [];
  const symbolsToFetch: string[] = [];

  // Check cache for all symbols first (batched query)
  if (useCache) {
    const cacheMap = await getCachedQuotesBatch(symbols);
    for (const symbol of symbols) {
      const cached = cacheMap.get(symbol.toUpperCase());
      if (cached) {
        results.push(cached);
      } else {
        symbolsToFetch.push(symbol);
      }
    }
  } else {
    symbolsToFetch.push(...symbols);
  }

  if (symbolsToFetch.length === 0) {
    return results;
  }

  // Process in batches to avoid overwhelming the API
  const batches: string[][] = [];
  for (let i = 0; i < symbolsToFetch.length; i += BATCH_SIZE) {
    batches.push(symbolsToFetch.slice(i, i + BATCH_SIZE));
  }

  console.log(
    `📊 Fetching ${symbolsToFetch.length} quotes in ${batches.length} batches (cache hit: ${results.length})`,
  );

  for (let i = 0; i < batches.length; i++) {
    const batch = batches[i];
    
    try {
      const batchQuotes = await executeWithRetry(async () => {
        return await yahooFinance.quote(batch);
      });

      const quoteArray = Array.isArray(batchQuotes) ? batchQuotes : [batchQuotes];

      for (const quote of quoteArray) {
        if (!quote || !quote.symbol) {
          continue;
        }

        const quoteData: QuoteData = {
          symbol: quote.symbol,
          regularMarketPrice: quote.regularMarketPrice,
          regularMarketOpen: quote.regularMarketOpen,
          regularMarketDayHigh: quote.regularMarketDayHigh,
          regularMarketDayLow: quote.regularMarketDayLow,
          regularMarketVolume: quote.regularMarketVolume,
          averageVolume: quote.averageVolume,
          fiftyTwoWeekHigh: quote.fiftyTwoWeekHigh,
          fiftyTwoWeekLow: quote.fiftyTwoWeekLow,
          marketCap: quote.marketCap,
          trailingPE: quote.trailingPE,
          dividendYield: quote.dividendYield,
          sector: quote.sector,
          industry: quote.industry,
          longName: quote.longName,
          shortName: quote.shortName,
        };

        // Save to cache (non-blocking)
        saveCachedQuote(quote.symbol, quoteData).catch((err) => {
          console.error(`Failed to cache quote for ${quote.symbol}:`, err);
        });

        results.push(quoteData);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`Error fetching batch ${i + 1}/${batches.length}:`, errorMessage);

      // Try to get stale cache for failed symbols
      if (useCache) {
        for (const symbol of batch) {
          const staleCache = await getCachedQuote(symbol);
          if (staleCache) {
            console.log(`📦 Using stale cache for ${symbol} due to batch error`);
            results.push(staleCache);
          }
        }
      }
    }

    // Add delay between batches (except for the last one)
    if (i < batches.length - 1) {
      await sleep(5000); // 5 second delay between batches to avoid rate limits
    }
  }

  return results;
}

/**
 * Fetch historical data with rate limiting
 */
export async function fetchHistorical(
  symbol: string,
  period1: Date,
  period2: Date,
  interval: '1d' | '1wk' | '1mo' = '1d',
): Promise<Array<{ date?: Date | string; close?: number; volume?: number }>> {
  try {
    const historical = await executeWithRetry(async () => {
      return await yahooFinance.historical(symbol, {
        period1,
        period2,
        interval,
      });
    });

    return Array.isArray(historical) ? historical : [];
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`Error fetching historical data for ${symbol}:`, errorMessage);
    return [];
  }
}

/**
 * Convert QuoteData to StockSummary
 */
export function quoteToStockSummary(quote: QuoteData): StockSummary | null {
  if (quote.regularMarketPrice === undefined) {
    return null;
  }

  const currentPrice = quote.regularMarketPrice;
  const openPrice = quote.regularMarketOpen || currentPrice;
  const change = currentPrice - openPrice;
  const changePercent = openPrice !== 0 ? (change / openPrice) * 100 : 0;

  const companyName =
    (quote.longName && typeof quote.longName === 'string' && quote.longName.length > 0
      ? quote.longName
      : quote.shortName) || `${quote.symbol} Inc.`;

  return {
    symbol: quote.symbol,
    company: companyName,
    price: Math.round(currentPrice * 100) / 100,
    change: Math.round(change * 100) / 100,
    changePercent: Math.round(changePercent * 100) / 100,
  };
}

