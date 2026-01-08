/**
 * Rate limiter for Yahoo Finance API calls
 * Implements token bucket algorithm with request queuing
 */

type QueuedRequest<T> = {
  resolve: (value: T) => void;
  reject: (error: Error) => void;
  fn: () => Promise<T>;
};

// Debug logging helper - set DEBUG_LOGS=true in .env to enable
const debugLog = (...args: unknown[]) => {
  if (process.env.DEBUG_LOGS === 'true') console.log(...args);
};

export class RateLimiter {
  private tokens: number;
  private maxTokens: number;
  private refillRate: number; // tokens per second
  private lastRefill: number;
  private queue: QueuedRequest<unknown>[] = [];
  private activeRequests = 0;
  private maxConcurrent: number;
  private backoffDelay = 0;
  private lastBackoffTime = 0;
  private circuitBreakerOpen = false;
  private circuitBreakerOpenUntil = 0;
  private consecutiveFailures = 0;

  constructor(
    maxTokens: number = 10, // 10 requests per minute (very conservative)
    refillRate: number = 0.16, // 0.16 tokens per second = ~10 per minute
    maxConcurrent: number = 1, // Only 1 concurrent request
  ) {
    this.maxTokens = maxTokens;
    this.tokens = maxTokens;
    this.refillRate = refillRate;
    this.maxConcurrent = maxConcurrent;
    this.lastRefill = Date.now();

    // Start with reduced tokens to avoid immediate burst
    this.tokens = Math.min(3, maxTokens);
  }

  private refillTokens(): void {
    const now = Date.now();
    const elapsed = (now - this.lastRefill) / 1000; // seconds
    this.tokens = Math.min(this.maxTokens, this.tokens + elapsed * this.refillRate);
    this.lastRefill = now;
  }

  private async processQueue(): Promise<void> {
    // Check if we can process more requests
    if (this.activeRequests >= this.maxConcurrent) {
      return;
    }

    // Check backoff delay
    const now = Date.now();
    if (this.backoffDelay > 0) {
      const timeSinceBackoff = now - this.lastBackoffTime;
      if (timeSinceBackoff < this.backoffDelay) {
        const remainingDelay = this.backoffDelay - timeSinceBackoff;
        setTimeout(() => this.processQueue(), remainingDelay);
        return;
      }
      // Backoff period expired, reset
      this.backoffDelay = 0;
    }

    // Refill tokens
    this.refillTokens();

    // Process requests from queue
    while (this.queue.length > 0 && this.tokens >= 1 && this.activeRequests < this.maxConcurrent) {
      const request = this.queue.shift();
      if (!request) break;

      this.tokens -= 1;
      this.activeRequests += 1;

      // Execute request
      request
        .fn()
        .then((result) => {
          this.activeRequests -= 1;
          request.resolve(result);
          // Continue processing queue
          setImmediate(() => this.processQueue());
        })
        .catch((error) => {
          this.activeRequests -= 1;
          request.reject(error);
          // Continue processing queue
          setImmediate(() => this.processQueue());
        });
    }

    // Schedule next check if queue is not empty
    if (this.queue.length > 0) {
      const delay = this.tokens < 1 ? (1 / this.refillRate) * 1000 : 100;
      setTimeout(() => this.processQueue(), delay);
    }
  }

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    // Check circuit breaker
    const now = Date.now();
    if (this.circuitBreakerOpen && now < this.circuitBreakerOpenUntil) {
      const waitTime = Math.ceil((this.circuitBreakerOpenUntil - now) / 1000);
      throw new Error(
        `Circuit breaker is open due to repeated failures. Please wait ${waitTime} seconds before trying again.`,
      );
    } else if (this.circuitBreakerOpen && now >= this.circuitBreakerOpenUntil) {
      // Reset circuit breaker
      debugLog('🔄 Circuit breaker reset, attempting requests again...');
      this.circuitBreakerOpen = false;
      this.consecutiveFailures = 0;
    }

    return new Promise<T>((resolve, reject) => {
      // Cast to unknown queue type for storage
      this.queue.push({
        resolve: resolve as (value: unknown) => void,
        reject,
        fn: fn as () => Promise<unknown>
      });
      this.processQueue();
    });
  }

  /**
   * Apply exponential backoff after rate limit error
   */
  applyBackoff(attempt: number = 1): void {
    // Exponential backoff: 1s, 2s, 4s, 8s, 16s, 32s (max)
    const maxDelay = 32000;
    const delay = Math.min(1000 * Math.pow(2, attempt - 1), maxDelay);
    this.backoffDelay = delay;
    this.lastBackoffTime = Date.now();
    debugLog(`⏳ Rate limiter applying backoff: ${delay}ms (attempt ${attempt})`);

    // Track consecutive failures for circuit breaker
    this.consecutiveFailures++;
    if (this.consecutiveFailures >= 3) {
      this.openCircuitBreaker();
    }
  }

  /**
   * Open circuit breaker to stop requests temporarily
   */
  private openCircuitBreaker(): void {
    const breakerDuration = 60000; // 1 minute
    this.circuitBreakerOpen = true;
    this.circuitBreakerOpenUntil = Date.now() + breakerDuration;
    debugLog(
      `🚫 Circuit breaker OPENED due to ${this.consecutiveFailures} consecutive failures. ` +
      `Blocking requests for ${breakerDuration / 1000} seconds.`,
    );
  }

  /**
   * Reset failure count after successful request
   */
  resetFailures(): void {
    if (this.consecutiveFailures > 0) {
      debugLog('✅ Request successful, resetting failure counter');
      this.consecutiveFailures = 0;
    }
  }

  /**
   * Reset backoff delay
   */
  resetBackoff(): void {
    this.backoffDelay = 0;
  }

  /**
   * Get current queue length
   */
  getQueueLength(): number {
    return this.queue.length;
  }

  /**
   * Get active request count
   */
  getActiveRequests(): number {
    return this.activeRequests;
  }
}

// Singleton instance - very conservative limits to avoid rate limiting
export const rateLimiter = new RateLimiter(10, 0.16, 1);

