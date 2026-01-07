/**
 * Multi-tier cache manager
 * Layer 1: In-memory cache (30-60s TTL)
 * Layer 2: Database cache (5min TTL)
 * Layer 3: Stale cache fallback (30min TTL)
 */

import { prisma } from './prisma';
import { QuoteData } from './types/stockData';

interface CacheEntry {
  data: QuoteData;
  timestamp: number;
  isStale?: boolean;
}

// Cache TTLs
const MEMORY_CACHE_TTL_MS = 30 * 1000; // 30 seconds
const DB_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const STALE_CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes

class CacheManager {
  // Layer 1: In-memory cache
  private memoryCache = new Map<string, CacheEntry>();

  /**
   * Get quote from cache (checks all layers)
   */
  async getQuote(symbol: string, allowStale = false): Promise<QuoteData | null> {
    const upperSymbol = symbol.toUpperCase();

    // Layer 1: Check memory cache
    const memoryEntry = this.memoryCache.get(upperSymbol);
    if (memoryEntry) {
      const age = Date.now() - memoryEntry.timestamp;
      if (age < MEMORY_CACHE_TTL_MS) {
        return memoryEntry.data;
      }
      // Memory cache expired, remove it
      this.memoryCache.delete(upperSymbol);
    }

    // Layer 2: Check database cache
    try {
      const dbEntry = await prisma.stockQuoteCache.findUnique({
        where: { symbol: upperSymbol },
      });

      if (dbEntry) {
        const age = Date.now() - dbEntry.last_fetched.getTime();

        // Fresh cache (< 5 min)
        if (age < DB_CACHE_TTL_MS) {
          // Update memory cache
          this.memoryCache.set(upperSymbol, {
            data: dbEntry.quote_data as unknown as QuoteData,
            timestamp: Date.now(),
          });
          return dbEntry.quote_data as unknown as QuoteData;
        }

        // Stale cache (< 30 min) - only return if allowStale is true
        if (allowStale && age < STALE_CACHE_TTL_MS) {
          console.log(`📦 Using stale cache for ${upperSymbol} (${Math.round(age / 1000)}s old)`);
          return dbEntry.quote_data as unknown as QuoteData;
        }
      }
    } catch (error) {
      console.error(`Error reading DB cache for ${upperSymbol}:`, error);
    }

    return null;
  }

  /**
   * Batch get quotes from cache
   */
  async getQuotes(symbols: string[], allowStale = false): Promise<Map<string, QuoteData>> {
    const cacheMap = new Map<string, QuoteData>();
    const symbolsToCheckDb: string[] = [];

    // Check memory cache first
    for (const symbol of symbols) {
      const upperSymbol = symbol.toUpperCase();
      const memoryEntry = this.memoryCache.get(upperSymbol);
      
      if (memoryEntry) {
        const age = Date.now() - memoryEntry.timestamp;
        if (age < MEMORY_CACHE_TTL_MS) {
          cacheMap.set(upperSymbol, memoryEntry.data);
          continue;
        }
        // Expired, remove from memory
        this.memoryCache.delete(upperSymbol);
      }
      
      symbolsToCheckDb.push(upperSymbol);
    }

    // Check database cache for remaining symbols
    if (symbolsToCheckDb.length > 0) {
      try {
        const dbEntries = await prisma.stockQuoteCache.findMany({
          where: {
            symbol: {
              in: symbolsToCheckDb,
            },
          },
        });

        const now = Date.now();

        for (const dbEntry of dbEntries) {
          const age = now - dbEntry.last_fetched.getTime();
          const quoteData = dbEntry.quote_data as unknown as QuoteData;

          // Fresh cache
          if (age < DB_CACHE_TTL_MS) {
            cacheMap.set(dbEntry.symbol, quoteData);
            // Update memory cache
            this.memoryCache.set(dbEntry.symbol, {
              data: quoteData,
              timestamp: now,
            });
          }
          // Stale cache (if allowed)
          else if (allowStale && age < STALE_CACHE_TTL_MS) {
            console.log(`📦 Using stale cache for ${dbEntry.symbol} (${Math.round(age / 1000)}s old)`);
            cacheMap.set(dbEntry.symbol, quoteData);
          }
        }
      } catch (error) {
        console.error('Error batch reading DB cache:', error);
      }
    }

    return cacheMap;
  }

  /**
   * Set quote in all cache layers
   */
  async setQuote(symbol: string, data: QuoteData, error?: string): Promise<void> {
    const upperSymbol = symbol.toUpperCase();
    const now = Date.now();

    // Layer 1: Update memory cache
    this.memoryCache.set(upperSymbol, {
      data,
      timestamp: now,
    });

    // Layer 2: Update database cache (non-blocking)
    try {
      const quoteDataJson = JSON.parse(JSON.stringify(data));

      await prisma.stockQuoteCache.upsert({
        where: { symbol: upperSymbol },
        create: {
          symbol: upperSymbol,
          quote_data: quoteDataJson,
          last_fetched: new Date(now),
          fetch_attempts: error ? 1 : 0,
          last_error: error || null,
        },
        update: {
          quote_data: quoteDataJson,
          last_fetched: new Date(now),
          fetch_attempts: error ? { increment: 1 } : 0,
          last_error: error || null,
        },
      });
    } catch (err) {
      console.error(`Error saving DB cache for ${upperSymbol}:`, err);
    }
  }

  /**
   * Check if cache entry should be refreshed
   */
  shouldRefresh(symbol: string): boolean {
    const upperSymbol = symbol.toUpperCase();

    // Check memory cache
    const memoryEntry = this.memoryCache.get(upperSymbol);
    if (memoryEntry) {
      const age = Date.now() - memoryEntry.timestamp;
      return age >= MEMORY_CACHE_TTL_MS;
    }

    // If not in memory, should refresh
    return true;
  }

  /**
   * Clear memory cache (useful for testing or memory management)
   */
  clearMemoryCache(): void {
    this.memoryCache.clear();
  }

  /**
   * Get cache statistics
   */
  getCacheStats() {
    return {
      memoryCacheSize: this.memoryCache.size,
      memoryCacheEntries: Array.from(this.memoryCache.keys()),
    };
  }
}

// Singleton instance
export const cacheManager = new CacheManager();

