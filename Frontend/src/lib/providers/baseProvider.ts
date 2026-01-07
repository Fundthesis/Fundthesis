/**
 * Base interface and utilities for stock data providers
 */

import { QuoteData, RateLimitInfo, ProviderHealth } from '../types/stockData';

export interface StockDataProvider {
  /** Provider name (e.g., 'yahoo', 'alphavantage') */
  name: string;

  /** Fetch a single quote */
  fetchQuote(symbol: string): Promise<QuoteData | null>;

  /** Fetch multiple quotes (batch) */
  fetchQuotes(symbols: string[]): Promise<QuoteData[]>;

  /** Check if provider is available (not rate-limited, circuit breaker closed, etc.) */
  isAvailable(): boolean;

  /** Get current rate limit information */
  getRateLimitInfo(): RateLimitInfo;

  /** Get provider health status */
  getHealth(): ProviderHealth;

  /** Check if error is a rate limit error for this provider */
  isRateLimitError(error: unknown): boolean;
}

export abstract class BaseProvider implements StockDataProvider {
  abstract name: string;
  protected lastError?: string;
  protected successCount = 0;
  protected failureCount = 0;
  protected circuitBreakerOpen = false;
  protected circuitBreakerOpenUntil = 0;
  protected consecutiveFailures = 0;

  abstract fetchQuote(symbol: string): Promise<QuoteData | null>;
  abstract fetchQuotes(symbols: string[]): Promise<QuoteData[]>;
  abstract getRateLimitInfo(): RateLimitInfo;

  isAvailable(): boolean {
    const now = Date.now();
    if (this.circuitBreakerOpen && now < this.circuitBreakerOpenUntil) {
      return false;
    }
    // Reset circuit breaker if cooldown expired
    if (this.circuitBreakerOpen && now >= this.circuitBreakerOpenUntil) {
      this.circuitBreakerOpen = false;
      this.consecutiveFailures = 0;
    }
    return true;
  }

  getHealth(): ProviderHealth {
    const totalRequests = this.successCount + this.failureCount;
    const successRate = totalRequests > 0 ? this.successCount / totalRequests : 1.0;

    return {
      available: this.isAvailable(),
      rateLimitInfo: this.getRateLimitInfo(),
      lastError: this.lastError,
      successRate,
      circuitBreakerOpen: this.circuitBreakerOpen && Date.now() < this.circuitBreakerOpenUntil,
    };
  }

  protected recordSuccess(): void {
    this.successCount++;
    this.consecutiveFailures = 0;
    this.lastError = undefined;
  }

  protected recordFailure(error: Error): void {
    this.failureCount++;
    this.lastError = error.message;
    this.consecutiveFailures++;

    // Open circuit breaker after 3 consecutive failures
    if (this.consecutiveFailures >= 3) {
      this.openCircuitBreaker(60000); // 1 minute
    }
  }

  protected openCircuitBreaker(durationMs: number): void {
    this.circuitBreakerOpen = true;
    this.circuitBreakerOpenUntil = Date.now() + durationMs;
  }

  abstract isRateLimitError(error: unknown): boolean;
}

