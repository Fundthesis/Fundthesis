/**
 * Financial Modeling Prep (FMP) provider implementation
 * Free tier: 250 requests/day
 */

import { BaseProvider } from '@/lib/providers/baseProvider';
import { QuoteData, RateLimitInfo } from '@/lib/types/stockData';

const API_KEY = process.env.FMP_API_KEY;
const BASE_URL = 'https://financialmodelingprep.com/api/v3';

interface FmpQuoteResponse {
  symbol: string;
  name: string;
  price: number;
  changesPercentage: number;
  change: number;
  dayLow: number;
  dayHigh: number;
  yearHigh: number;
  yearLow: number;
  marketCap: number;
  priceAvg50: number;
  priceAvg200: number;
  volume: number;
  avgVolume: number;
  exchange: string;
  open: number;
  previousClose: number;
  eps?: number;
  pe?: number;
  earningsAnnouncement?: string;
  sharesOutstanding?: number;
  timestamp: number;
}

export class FmpProvider extends BaseProvider {
  name = 'fmp';
  private dailyRequestCount = 0;
  private lastResetDate = new Date().toDateString();
  private readonly DAILY_LIMIT = 250;

  isRateLimitError(error: unknown): boolean {
    if (error instanceof Error) {
      const message = error.message.toLowerCase();
      return (
        message.includes('429') ||
        message.includes('rate limit') ||
        message.includes('quota') ||
        message.includes('subscription') ||
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
      throw new Error('FMP_API_KEY not configured');
    }

    if (!this.isAvailable()) {
      throw new Error('FMP daily limit reached or circuit breaker open');
    }

    try {
      const url = new URL(`${BASE_URL}/quote/${symbol.toUpperCase()}`);
      url.searchParams.set('apikey', API_KEY);

      const response = await fetch(url.toString());

      if (!response.ok) {
        if (response.status === 429) {
          this.dailyRequestCount = this.DAILY_LIMIT;
          this.recordFailure(new Error('FMP rate limit exceeded'));
          throw new Error('Rate limit exceeded');
        }
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data: FmpQuoteResponse[] = await response.json();

      if (!data || data.length === 0 || !data[0]) {
        return null;
      }

      this.dailyRequestCount++;

      const quoteData = data[0];

      const quote: QuoteData = {
        symbol: quoteData.symbol,
        regularMarketPrice: quoteData.price,
        regularMarketOpen: quoteData.open,
        regularMarketDayHigh: quoteData.dayHigh,
        regularMarketDayLow: quoteData.dayLow,
        regularMarketVolume: quoteData.volume,
        averageVolume: quoteData.avgVolume,
        fiftyTwoWeekHigh: quoteData.yearHigh,
        fiftyTwoWeekLow: quoteData.yearLow,
        marketCap: quoteData.marketCap,
        trailingPE: quoteData.pe,
        longName: quoteData.name,
        sector: quoteData.exchange, // FMP doesn't provide sector directly
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
    if (symbols.length === 0) {
      return [];
    }

    if (!API_KEY) {
      throw new Error('FMP_API_KEY not configured');
    }

    if (!this.isAvailable()) {
      throw new Error('FMP daily limit reached or circuit breaker open');
    }

    try {
      const symbolList = symbols.map((s) => s.toUpperCase()).join(',');
      const url = new URL(`${BASE_URL}/quote/${symbolList}`);
      url.searchParams.set('apikey', API_KEY);

      const response = await fetch(url.toString());

      if (!response.ok) {
        if (response.status === 429) {
          this.dailyRequestCount = this.DAILY_LIMIT;
          this.recordFailure(new Error('FMP rate limit exceeded'));
          throw new Error('Rate limit exceeded');
        }
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data: FmpQuoteResponse[] = await response.json();
      this.dailyRequestCount++;

      if (!data || !Array.isArray(data)) {
        return [];
      }

      const results: QuoteData[] = [];

      for (const quoteData of data) {
        if (!quoteData || !quoteData.symbol) continue;

        const quote: QuoteData = {
          symbol: quoteData.symbol,
          regularMarketPrice: quoteData.price,
          regularMarketOpen: quoteData.open,
          regularMarketDayHigh: quoteData.dayHigh,
          regularMarketDayLow: quoteData.dayLow,
          regularMarketVolume: quoteData.volume,
          averageVolume: quoteData.avgVolume,
          fiftyTwoWeekHigh: quoteData.yearHigh,
          fiftyTwoWeekLow: quoteData.yearLow,
          marketCap: quoteData.marketCap,
          trailingPE: quoteData.pe,
          longName: quoteData.name,
          sector: quoteData.exchange,
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

