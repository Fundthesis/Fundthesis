/**
 * Yahoo Finance provider implementation
 */

import YahooFinance from 'yahoo-finance2';
import { BaseProvider } from '@/lib/providers/baseProvider';
import { QuoteData, RateLimitInfo } from '@/lib/types/stockData';
import { rateLimiter } from '@/lib/rateLimiter';

const yahooFinance = new YahooFinance();

export class YahooFinanceProvider extends BaseProvider {
  name = 'yahoo';

  isRateLimitError(error: unknown): boolean {
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

  getRateLimitInfo(): RateLimitInfo {
    // Yahoo Finance has unofficial limits, estimate based on rate limiter state
    return {
      remaining: rateLimiter.getQueueLength() > 0 ? 0 : 10, // Rough estimate
      limit: 10,
      window: 'minute',
    };
  }

  async fetchQuote(symbol: string): Promise<QuoteData | null> {
    if (!this.isAvailable()) {
      throw new Error('Yahoo Finance circuit breaker is open');
    }

    try {
      const quote = await rateLimiter.execute(async () => {
        return await yahooFinance.quote(symbol.toUpperCase());
      });

      if (!quote) {
        return null;
      }

      const quoteData: QuoteData = {
        symbol: symbol.toUpperCase(),
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

      this.recordSuccess();
      rateLimiter.resetFailures();
      return quoteData;
    } catch (error) {
      if (this.isRateLimitError(error)) {
        rateLimiter.applyBackoff(1);
      }
      this.recordFailure(error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  async fetchQuotes(symbols: string[]): Promise<QuoteData[]> {
    if (!this.isAvailable()) {
      throw new Error('Yahoo Finance circuit breaker is open');
    }

    const upperSymbols = symbols.map((s) => s.toUpperCase());
    const results: QuoteData[] = [];

    try {
      // Yahoo Finance supports batch quotes
      const quotes = await rateLimiter.execute(async () => {
        return await yahooFinance.quote(upperSymbols);
      });

      if (!quotes || !Array.isArray(quotes)) {
        return results;
      }

      for (const quote of quotes) {
        if (!quote) continue;

        const quoteData: QuoteData = {
          symbol: quote.symbol?.toUpperCase() || '',
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

        if (quoteData.symbol) {
          results.push(quoteData);
        }
      }

      this.recordSuccess();
      rateLimiter.resetFailures();
      return results;
    } catch (error) {
      if (this.isRateLimitError(error)) {
        rateLimiter.applyBackoff(1);
      }
      this.recordFailure(error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }
}

