/**
 * Alpha Vantage provider implementation
 * Free tier: 25 requests/day or 5 requests/minute
 */

import { BaseProvider } from './baseProvider';
import { QuoteData, RateLimitInfo } from '../types/stockData';

const API_KEY = process.env.ALPHA_VANTAGE_API_KEY;
const BASE_URL = 'https://www.alphavantage.co/query';

interface AlphaVantageQuoteResponse {
  'Global Quote'?: {
    '01. symbol': string;
    '02. open': string;
    '03. high': string;
    '04. low': string;
    '05. price': string;
    '06. volume': string;
    '07. latest trading day': string;
    '08. previous close': string;
    '09. change': string;
    '10. change percent': string;
  };
  'Note'?: string; // Rate limit message
  'Error Message'?: string;
}

export class AlphaVantageProvider extends BaseProvider {
  name = 'alphavantage';
  private dailyRequestCount = 0;
  private lastResetDate = new Date().toDateString();
  private minuteRequestCount = 0;
  private lastMinuteReset = Date.now();

  isRateLimitError(error: unknown): boolean {
    if (error instanceof Error) {
      const message = error.message.toLowerCase();
      return (
        message.includes('429') ||
        message.includes('rate limit') ||
        message.includes('api call frequency') ||
        message.includes('thank you for using alpha vantage')
      );
    }
    return false;
  }

  getRateLimitInfo(): RateLimitInfo {
    // Reset daily counter if new day
    const today = new Date().toDateString();
    if (today !== this.lastResetDate) {
      this.dailyRequestCount = 0;
      this.lastResetDate = today;
    }

    // Reset minute counter if minute passed
    const now = Date.now();
    if (now - this.lastMinuteReset > 60000) {
      this.minuteRequestCount = 0;
      this.lastMinuteReset = now;
    }

    // Use the stricter limit (5/min or 25/day)
    const dailyRemaining = Math.max(0, 25 - this.dailyRequestCount);
    const minuteRemaining = Math.max(0, 5 - this.minuteRequestCount);
    const remaining = Math.min(dailyRemaining, minuteRemaining);

    return {
      remaining,
      limit: 5, // Per minute limit is stricter
      window: 'minute',
    };
  }

  isAvailable(): boolean {
    if (!API_KEY) {
      return false;
    }

    // Check daily limit
    const today = new Date().toDateString();
    if (today !== this.lastResetDate) {
      this.dailyRequestCount = 0;
      this.lastResetDate = today;
    }

    if (this.dailyRequestCount >= 25) {
      return false; // Daily limit reached
    }

    // Check minute limit
    const now = Date.now();
    if (now - this.lastMinuteReset > 60000) {
      this.minuteRequestCount = 0;
      this.lastMinuteReset = now;
    }

    if (this.minuteRequestCount >= 5) {
      return false; // Minute limit reached
    }

    return super.isAvailable();
  }

  async fetchQuote(symbol: string): Promise<QuoteData | null> {
    if (!API_KEY) {
      throw new Error('ALPHA_VANTAGE_API_KEY not configured');
    }

    if (!this.isAvailable()) {
      throw new Error('Alpha Vantage rate limit reached or circuit breaker open');
    }

    try {
      const url = new URL(BASE_URL);
      url.searchParams.set('function', 'GLOBAL_QUOTE');
      url.searchParams.set('symbol', symbol.toUpperCase());
      url.searchParams.set('apikey', API_KEY);

      const response = await fetch(url.toString());

      if (!response.ok) {
        if (response.status === 429) {
          this.recordFailure(new Error('Alpha Vantage rate limit exceeded'));
          throw new Error('Rate limit exceeded');
        }
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data: AlphaVantageQuoteResponse = await response.json();

      // Check for rate limit message
      if (data.Note) {
        this.recordFailure(new Error(data.Note));
        throw new Error('Rate limit: ' + data.Note);
      }

      if (data['Error Message']) {
        throw new Error(data['Error Message']);
      }

      const quote = data['Global Quote'];
      if (!quote) {
        return null;
      }

      // Increment request counters
      this.dailyRequestCount++;
      this.minuteRequestCount++;

      const quoteData: QuoteData = {
        symbol: quote['01. symbol'],
        regularMarketPrice: parseFloat(quote['05. price']) || undefined,
        regularMarketOpen: parseFloat(quote['02. open']) || undefined,
        regularMarketDayHigh: parseFloat(quote['03. high']) || undefined,
        regularMarketDayLow: parseFloat(quote['04. low']) || undefined,
        regularMarketVolume: parseFloat(quote['06. volume']) || undefined,
      };

      this.recordSuccess();
      return quoteData;
    } catch (error) {
      if (this.isRateLimitError(error)) {
        this.dailyRequestCount = 25; // Mark as exhausted
      }
      this.recordFailure(error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  async fetchQuotes(symbols: string[]): Promise<QuoteData[]> {
    // Alpha Vantage doesn't support batch quotes efficiently
    // Fetch sequentially with rate limiting
    const results: QuoteData[] = [];

    for (const symbol of symbols) {
      if (!this.isAvailable()) {
        console.warn(`Alpha Vantage rate limit reached, stopping batch at ${symbol}`);
        break;
      }

      try {
        const quote = await this.fetchQuote(symbol);
        if (quote) {
          results.push(quote);
        }
        // Small delay between requests to respect rate limits
        await new Promise((resolve) => setTimeout(resolve, 200));
      } catch (error) {
        console.warn(`Failed to fetch ${symbol} from Alpha Vantage:`, error);
        // Continue with next symbol
      }
    }

    return results;
  }
}

