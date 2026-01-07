/**
 * Twelve Data provider implementation
 * Free tier: 800 requests/day
 */

import { BaseProvider } from './baseProvider';
import { QuoteData, RateLimitInfo } from '../types/stockData';

const API_KEY = process.env.TWELVE_DATA_API_KEY;
const BASE_URL = 'https://api.twelvedata.com';

interface TwelveDataQuoteResponse {
  symbol: string;
  name?: string;
  exchange?: string;
  currency?: string;
  datetime?: string;
  timestamp?: number;
  open?: string;
  high?: string;
  low?: string;
  close?: string;
  volume?: string;
  previous_close?: string;
  change?: string;
  percent_change?: string;
  average_volume?: string;
  is_market_open?: boolean;
  fifty_two_week?: {
    low?: string;
    high?: string;
    low_change?: string;
    high_change?: string;
    low_change_percent?: string;
    high_change_percent?: string;
    range?: string;
  };
}

export class TwelveDataProvider extends BaseProvider {
  name = 'twelvedata';
  private dailyRequestCount = 0;
  private lastResetDate = new Date().toDateString();
  private readonly DAILY_LIMIT = 800;

  isRateLimitError(error: unknown): boolean {
    if (error instanceof Error) {
      const message = error.message.toLowerCase();
      return (
        message.includes('429') ||
        message.includes('rate limit') ||
        message.includes('quota exceeded') ||
        message.includes('too many requests')
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

    return {
      remaining: Math.max(0, this.DAILY_LIMIT - this.dailyRequestCount),
      limit: this.DAILY_LIMIT,
      window: 'day',
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

    if (this.dailyRequestCount >= this.DAILY_LIMIT) {
      return false; // Daily limit reached
    }

    return super.isAvailable();
  }

  async fetchQuote(symbol: string): Promise<QuoteData | null> {
    if (!API_KEY) {
      throw new Error('TWELVE_DATA_API_KEY not configured');
    }

    if (!this.isAvailable()) {
      throw new Error('Twelve Data daily limit reached or circuit breaker open');
    }

    try {
      const url = new URL(`${BASE_URL}/quote`);
      url.searchParams.set('symbol', symbol.toUpperCase());
      url.searchParams.set('apikey', API_KEY);

      const response = await fetch(url.toString());

      if (!response.ok) {
        if (response.status === 429) {
          this.dailyRequestCount = this.DAILY_LIMIT; // Mark as exhausted
          this.recordFailure(new Error('Twelve Data rate limit exceeded'));
          throw new Error('Rate limit exceeded');
        }
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data: TwelveDataQuoteResponse = await response.json();

      if (!data.close) {
        return null; // Invalid quote data
      }

      this.dailyRequestCount++;

      const quote: QuoteData = {
        symbol: data.symbol,
        regularMarketPrice: parseFloat(data.close) || undefined,
        regularMarketOpen: parseFloat(data.open || '0') || undefined,
        regularMarketDayHigh: parseFloat(data.high || '0') || undefined,
        regularMarketDayLow: parseFloat(data.low || '0') || undefined,
        regularMarketVolume: parseFloat(data.volume || '0') || undefined,
        averageVolume: parseFloat(data.average_volume || '0') || undefined,
        longName: data.name,
        fiftyTwoWeekHigh: data.fifty_two_week?.high
          ? parseFloat(data.fifty_two_week.high)
          : undefined,
        fiftyTwoWeekLow: data.fifty_two_week?.low
          ? parseFloat(data.fifty_two_week.low)
          : undefined,
      };

      this.recordSuccess();
      return quote;
    } catch (error) {
      if (this.isRateLimitError(error)) {
        this.dailyRequestCount = this.DAILY_LIMIT;
      }
      this.recordFailure(error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  async fetchQuotes(symbols: string[]): Promise<QuoteData[]> {
    // Twelve Data supports batch quotes via comma-separated symbols
    if (symbols.length === 0) {
      return [];
    }

    if (!API_KEY) {
      throw new Error('TWELVE_DATA_API_KEY not configured');
    }

    if (!this.isAvailable()) {
      throw new Error('Twelve Data daily limit reached or circuit breaker open');
    }

    try {
      const symbolList = symbols.map((s) => s.toUpperCase()).join(',');
      const url = new URL(`${BASE_URL}/quote`);
      url.searchParams.set('symbol', symbolList);
      url.searchParams.set('apikey', API_KEY);

      const response = await fetch(url.toString());

      if (!response.ok) {
        if (response.status === 429) {
          this.dailyRequestCount = this.DAILY_LIMIT;
          this.recordFailure(new Error('Twelve Data rate limit exceeded'));
          throw new Error('Rate limit exceeded');
        }
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      this.dailyRequestCount++;

      const results: QuoteData[] = [];

      // Handle both single object and array responses
      const quotes = Array.isArray(data) ? data : [data];

      for (const quoteData of quotes) {
        if (!quoteData || !quoteData.close) continue;

        const quote: QuoteData = {
          symbol: quoteData.symbol,
          regularMarketPrice: parseFloat(quoteData.close) || undefined,
          regularMarketOpen: parseFloat(quoteData.open || '0') || undefined,
          regularMarketDayHigh: parseFloat(quoteData.high || '0') || undefined,
          regularMarketDayLow: parseFloat(quoteData.low || '0') || undefined,
          regularMarketVolume: parseFloat(quoteData.volume || '0') || undefined,
          averageVolume: parseFloat(quoteData.average_volume || '0') || undefined,
          longName: quoteData.name,
          fiftyTwoWeekHigh: quoteData.fifty_two_week?.high
            ? parseFloat(quoteData.fifty_two_week.high)
            : undefined,
          fiftyTwoWeekLow: quoteData.fifty_two_week?.low
            ? parseFloat(quoteData.fifty_two_week.low)
            : undefined,
        };

        results.push(quote);
      }

      this.recordSuccess();
      return results;
    } catch (error) {
      if (this.isRateLimitError(error)) {
        this.dailyRequestCount = this.DAILY_LIMIT;
      }
      this.recordFailure(error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }
}

