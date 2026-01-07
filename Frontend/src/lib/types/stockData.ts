/**
 * Shared types for stock data across all providers
 */

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

export interface RateLimitInfo {
  remaining: number;
  resetAt?: Date;
  limit: number;
  window: 'minute' | 'hour' | 'day';
}

export interface ProviderHealth {
  available: boolean;
  rateLimitInfo: RateLimitInfo;
  lastError?: string;
  successRate: number;
  circuitBreakerOpen: boolean;
}

