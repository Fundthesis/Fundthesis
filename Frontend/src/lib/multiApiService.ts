/**
 * Multi-API service coordinator
 * Routes requests through multiple stock data providers with intelligent fallback
 */

import { StockDataProvider } from './providers/baseProvider';
import { YahooFinanceProvider } from './providers/yahooFinanceProvider';
import { AlphaVantageProvider } from './providers/alphaVantageProvider';
import { FinnhubProvider } from './providers/finnhubProvider';
import { TwelveDataProvider } from './providers/twelveDataProvider';
import { FmpProvider } from './providers/fmpProvider';
import { QuoteData } from './types/stockData';
import { cacheManager } from './cacheManager';

class MultiApiService {
  private providers: StockDataProvider[] = [];

  constructor() {
    // Initialize providers in priority order
    this.providers = [
      new YahooFinanceProvider(),
      new AlphaVantageProvider(),
      new FinnhubProvider(),
      new TwelveDataProvider(),
      new FmpProvider(),
    ];
  }

  /**
   * Get available providers (circuit breaker closed, not rate-limited)
   */
  private getAvailableProviders(): StockDataProvider[] {
    return this.providers.filter((provider) => provider.isAvailable());
  }

  /**
   * Fetch a single quote, trying providers in priority order
   */
  async fetchQuote(symbol: string, useCache = true): Promise<QuoteData | null> {
    const upperSymbol = symbol.toUpperCase();

    // Check cache first
    if (useCache) {
      const cached = await cacheManager.getQuote(upperSymbol, false);
      if (cached) {
        return cached;
      }
    }

    const availableProviders = this.getAvailableProviders();

    if (availableProviders.length === 0) {
      console.error(`❌ No available providers for ${upperSymbol}`);
      // Try stale cache as last resort
      if (useCache) {
        const staleCache = await cacheManager.getQuote(upperSymbol, true);
        if (staleCache) {
          return staleCache;
        }
      }
      return null;
    }

    // Try each provider in priority order
    for (const provider of availableProviders) {
      try {
        console.log(`🔍 Trying ${provider.name} for ${upperSymbol}`);
        const quote = await provider.fetchQuote(upperSymbol);

        if (quote && quote.symbol) {
          console.log(`✅ Successfully fetched ${upperSymbol} from ${provider.name}`);
          // Cache the result
          await cacheManager.setQuote(upperSymbol, quote);
          return quote;
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.warn(`⚠️ ${provider.name} failed for ${upperSymbol}: ${errorMessage}`);

        // If this is a rate limit error, continue to next provider
        if (provider.isRateLimitError(error)) {
          console.log(`🔄 ${provider.name} rate-limited, trying next provider...`);
          continue;
        }

        // For other errors, also try next provider
        continue;
      }
    }

    console.error(`❌ All providers failed for ${upperSymbol}`);
    // Try stale cache as last resort
    if (useCache) {
      const staleCache = await cacheManager.getQuote(upperSymbol, true);
      if (staleCache) {
        return staleCache;
      }
    }
    return null;
  }

  /**
   * Fetch multiple quotes with intelligent batching and fallback
   */
  async fetchQuotes(symbols: string[], useCache = true): Promise<QuoteData[]> {
    if (symbols.length === 0) {
      return [];
    }

    const results: QuoteData[] = [];
    const symbolsToFetch: string[] = [];
    const upperSymbols = symbols.map((s) => s.toUpperCase());

    // Check cache first
    if (useCache) {
      const cacheMap = await cacheManager.getQuotes(upperSymbols, false);
      for (const symbol of upperSymbols) {
        const cached = cacheMap.get(symbol);
        if (cached) {
          results.push(cached);
        } else {
          symbolsToFetch.push(symbol);
        }
      }
    } else {
      symbolsToFetch.push(...upperSymbols);
    }

    if (symbolsToFetch.length === 0) {
      return results;
    }

    const availableProviders = this.getAvailableProviders();

    if (availableProviders.length === 0) {
      console.error('❌ No available providers');
      // Try stale cache for remaining symbols
      if (useCache) {
        const staleCacheMap = await cacheManager.getQuotes(symbolsToFetch, true);
        for (const symbol of symbolsToFetch) {
          const stale = staleCacheMap.get(symbol);
          if (stale) {
            results.push(stale);
          }
        }
      }
      return results;
    }

    // Try to fetch all symbols from the first available provider
    for (const provider of availableProviders) {
      try {
        console.log(`🔍 Trying ${provider.name} for ${symbolsToFetch.length} symbols`);
        const quotes = await provider.fetchQuotes(symbolsToFetch);

        if (quotes && quotes.length > 0) {
          console.log(`✅ Successfully fetched ${quotes.length} quotes from ${provider.name}`);
          // Cache all results
          for (const quote of quotes) {
            await cacheManager.setQuote(quote.symbol, quote);
            results.push(quote);
          }
          return results;
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.warn(`⚠️ ${provider.name} batch failed: ${errorMessage}`);

        // If rate-limited, try next provider
        if (provider.isRateLimitError(error)) {
          console.log(`🔄 ${provider.name} rate-limited, trying next provider...`);
          continue;
        }

        // For other errors, try next provider
        continue;
      }
    }

    // If batch failed, try individual symbols with fallback
    console.log(`📊 Batch fetch failed, trying individual symbols...`);
    for (const symbol of symbolsToFetch) {
      const quote = await this.fetchQuote(symbol, useCache);
      if (quote) {
        results.push(quote);
      }
    }

    return results;
  }

  /**
   * Get health status of all providers
   */
  getProviderHealth() {
    return this.providers.map((provider) => ({
      name: provider.name,
      health: provider.getHealth(),
    }));
  }

  /**
   * Get all providers
   */
  getProviders(): StockDataProvider[] {
    return [...this.providers];
  }
}

// Singleton instance
export const multiApiService = new MultiApiService();

// Export convenience functions matching the old API
export async function fetchQuote(symbol: string, useCache = true): Promise<QuoteData | null> {
  return multiApiService.fetchQuote(symbol, useCache);
}

export async function fetchQuotes(
  symbols: string[],
  useCache = true,
): Promise<QuoteData[]> {
  return multiApiService.fetchQuotes(symbols, useCache);
}

// Re-export types for backward compatibility
export type { QuoteData } from './types/stockData';

