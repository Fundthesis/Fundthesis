/**
 * API Health Endpoint
 * Returns health status of all stock data providers
 */

import { NextResponse } from 'next/server';
import { multiApiService } from '@/lib/multiApiService';
import { cacheManager } from '@/lib/cacheManager';

export async function GET() {
  try {
    const providerHealth = multiApiService.getProviderHealth();
    const cacheStats = cacheManager.getCacheStats();

    const health = {
      timestamp: new Date().toISOString(),
      providers: providerHealth.map(({ name, health: providerHealth }) => ({
        name,
        available: providerHealth.available,
        rateLimitInfo: {
          remaining: providerHealth.rateLimitInfo.remaining,
          limit: providerHealth.rateLimitInfo.limit,
          window: providerHealth.rateLimitInfo.window,
        },
        lastError: providerHealth.lastError,
        successRate: Math.round(providerHealth.successRate * 100) / 100,
        circuitBreakerOpen: providerHealth.circuitBreakerOpen,
      })),
      cache: {
        memoryCacheSize: cacheStats.memoryCacheSize,
        memoryCacheEntries: cacheStats.memoryCacheEntries.slice(0, 10), // First 10 for brevity
      },
    };

    return NextResponse.json(health);
  } catch (error) {
    console.error('Error fetching API health:', error);
    return NextResponse.json(
      { error: 'Failed to fetch health status' },
      { status: 500 },
    );
  }
}

