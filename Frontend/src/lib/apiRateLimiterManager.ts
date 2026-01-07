/**
 * Per-API Rate Limiter Manager
 * Coordinates rate limiting across multiple stock data providers
 */

import { RateLimiter } from './rateLimiter';
import { StockDataProvider } from './providers/baseProvider';

interface ApiLimiterConfig {
  maxTokens: number;
  refillRate: number; // tokens per second
  maxConcurrent: number;
}

class ApiRateLimiterManager {
  private limiters = new Map<string, RateLimiter>();
  private providerLimiters = new Map<string, StockDataProvider>();

  constructor() {
    // Initialize rate limiters for each API
    // Note: Individual providers also track their own limits
    // This manager provides additional coordination if needed
    
    // Yahoo Finance - very conservative
    this.limiters.set('yahoo', new RateLimiter(10, 0.16, 1)); // 10/min, 1 concurrent
    
    // Alpha Vantage - 5/min
    this.limiters.set('alphavantage', new RateLimiter(5, 0.083, 1)); // 5/min, 1 concurrent
    
    // Finnhub - 60/min
    this.limiters.set('finnhub', new RateLimiter(60, 1.0, 2)); // 60/min, 2 concurrent
    
    // Twelve Data - daily limit handled by provider, but we can add minute-level limiting
    this.limiters.set('twelvedata', new RateLimiter(50, 0.83, 1)); // ~50/min as safety
    
    // FMP - daily limit handled by provider, but we can add minute-level limiting
    this.limiters.set('fmp', new RateLimiter(20, 0.33, 1)); // ~20/min as safety
  }

  /**
   * Register a provider with its rate limiter
   */
  registerProvider(provider: StockDataProvider): void {
    this.providerLimiters.set(provider.name, provider);
  }

  /**
   * Execute a function with rate limiting for a specific API
   */
  async execute<T>(api: string, fn: () => Promise<T>): Promise<T> {
    const limiter = this.limiters.get(api);
    if (!limiter) {
      // No limiter configured, execute directly
      return fn();
    }

    return limiter.execute(fn);
  }

  /**
   * Handle API response and update rate limiter state
   */
  handleApiResponse(api: string, response: Response): void {
    const limiter = this.limiters.get(api);
    if (!limiter) return;

    if (response.status === 429) {
      // Rate limit exceeded - apply backoff
      limiter.applyBackoff(1);
    } else if (response.ok) {
      // Success - reset failures
      limiter.resetFailures();
    }
  }

  /**
   * Get rate limiter info for an API
   */
  getLimiterInfo(api: string) {
    const limiter = this.limiters.get(api);
    if (!limiter) {
      return null;
    }

    return {
      queueLength: limiter.getQueueLength(),
      activeRequests: limiter.getActiveRequests(),
    };
  }

  /**
   * Get rate limiter for an API (for direct access if needed)
   */
  getLimiter(api: string): RateLimiter | undefined {
    return this.limiters.get(api);
  }

  /**
   * Get all limiter statuses
   */
  getAllLimiterStatuses() {
    const statuses: Record<string, { queueLength: number; activeRequests: number }> = {};
    
    for (const [api, limiter] of this.limiters.entries()) {
      statuses[api] = {
        queueLength: limiter.getQueueLength(),
        activeRequests: limiter.getActiveRequests(),
      };
    }

    return statuses;
  }
}

// Singleton instance
export const apiRateLimiterManager = new ApiRateLimiterManager();

