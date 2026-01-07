/**
 * Finnhub provider implementation
 * Free tier: 60 requests/minute
 */

import { BaseProvider } from '@/lib/providers/baseProvider';
import { QuoteData, RateLimitInfo } from '@/lib/types/stockData';

const API_KEY = process.env.FINNHUB_API_KEY;
const BASE_URL = 'https://finnhub.io/api/v1';

interface FinnhubQuoteResponse {
  c: number; // Current price
  h: number; // High price
  l: number; // Low price
  o: number; // Open price
  pc: number; // Previous close
  t: number; // Timestamp
  d?: number; // Change
  dp?: number; // Change percent
}

interface FinnhubCompanyProfile {
  name: string;
  finnhubIndustry?: string;
  marketCapitalization?: number;
  shareOutstanding?: number;
}

export class FinnhubProvider extends BaseProvider {
  name = 'finnhub';
  private minuteRequestCount = 0;
  private lastMinuteReset = Date.now();
  private readonly RATE_LIMIT_PER_MINUTE = 60;

  isRateLimitError(error: unknown): boolean {
    if (error instanceof Error) {
      const message = error.message.toLowerCase();
      return (
        message.includes('429') ||
        message.includes('rate limit') ||
        message.includes('too many requests')
      );
    }
    return false;
  }

  getRateLimitInfo(): RateLimitInfo {
    // Reset counter if minute passed
    const now = Date.now();
    if (now - this.lastMinuteReset > 60000) {
      this.minuteRequestCount = 0;
      this.lastMinuteReset = now;
    }

    return {
      remaining: Math.max(0, this.RATE_LIMIT_PER_MINUTE - this.minuteRequestCount),
      limit: this.RATE_LIMIT_PER_MINUTE,
      window: 'minute',
    };
  }

  isAvailable(): boolean {
    if (!API_KEY) {
      return false;
    }

    // Check minute limit
    const now = Date.now();
    if (now - this.lastMinuteReset > 60000) {
      this.minuteRequestCount = 0;
      this.lastMinuteReset = now;
    }

    if (this.minuteRequestCount >= this.RATE_LIMIT_PER_MINUTE) {
      return false;
    }

    return super.isAvailable();
  }

  async fetchQuote(symbol: string): Promise<QuoteData | null> {
    if (!API_KEY) {
      throw new Error('FINNHUB_API_KEY not configured');
    }

    if (!this.isAvailable()) {
      throw new Error('Finnhub rate limit reached or circuit breaker open');
    }

    try {
      const upperSymbol = symbol.toUpperCase();

      // Fetch quote and company profile in parallel
      const [quoteResponse, profileResponse] = await Promise.all([
        fetch(`${BASE_URL}/quote?symbol=${upperSymbol}&token=${API_KEY}`),
        fetch(`${BASE_URL}/stock/profile2?symbol=${upperSymbol}&token=${API_KEY}`),
      ]);

      this.minuteRequestCount += 2; // Count both requests

      if (!quoteResponse.ok) {
        if (quoteResponse.status === 429) {
          this.recordFailure(new Error('Finnhub rate limit exceeded'));
          throw new Error('Rate limit exceeded');
        }
        throw new Error(`HTTP ${quoteResponse.status}: ${quoteResponse.statusText}`);
      }

      const quoteData: FinnhubQuoteResponse = await quoteResponse.json();
      const profile: FinnhubCompanyProfile = profileResponse.ok
        ? await profileResponse.json()
        : { name: '' };

      if (!quoteData.c) {
        return null; // Invalid quote data
      }

      const quote: QuoteData = {
        symbol: upperSymbol,
        regularMarketPrice: quoteData.c,
        regularMarketOpen: quoteData.o,
        regularMarketDayHigh: quoteData.h,
        regularMarketDayLow: quoteData.l,
        longName: profile.name,
        industry: profile.finnhubIndustry,
        marketCap: profile.marketCapitalization,
      };

      this.recordSuccess();
      return quote;
    } catch (error) {
      this.recordFailure(error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  async fetchQuotes(symbols: string[]): Promise<QuoteData[]> {
    // Finnhub doesn't support batch quotes, fetch sequentially
    const results: QuoteData[] = [];

    for (const symbol of symbols) {
      if (!this.isAvailable()) {
        console.warn(`Finnhub rate limit reached, stopping batch at ${symbol}`);
        break;
      }

      try {
        const quote = await this.fetchQuote(symbol);
        if (quote) {
          results.push(quote);
        }
        // Small delay to respect rate limits
        await new Promise((resolve) => setTimeout(resolve, 100));
      } catch (error) {
        console.warn(`Failed to fetch ${symbol} from Finnhub:`, error);
        // Continue with next symbol
      }
    }

    return results;
  }
}

