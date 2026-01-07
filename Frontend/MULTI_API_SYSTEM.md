# Multi-API Stock Data System

## Overview

The application now uses a **multi-API system** with intelligent fallback to ensure reliable stock data fetching even when individual APIs are rate-limited or unavailable.

## Architecture

### Multi-Tier Caching

1. **Memory Cache** (30 seconds TTL) - Fastest, in-memory storage
2. **Database Cache** (5 minutes TTL) - Persistent PostgreSQL storage
3. **Stale Cache Fallback** (30 minutes TTL) - Used when all APIs fail

### Provider Priority Order

The system tries providers in this order:

1. **Yahoo Finance** - Primary source (~2,000/hour unofficial limit)
2. **Alpha Vantage** - Fallback (25/day or 5/min free tier)
3. **Finnhub** - Real-time quotes (60/min free tier)
4. **Twelve Data** - Historical/fallback (800/day free tier)
5. **Financial Modeling Prep** - Fundamentals/fallback (250/day free tier)

### Intelligent Fallback

- If a provider is rate-limited, the system automatically tries the next provider
- Circuit breakers prevent repeated failures from overwhelming providers
- Stale cache is used as a last resort before returning errors

## Configuration

### Required Environment Variables

Add these to your `.env` file:

```bash
# Database (Required)
DATABASE_URL=postgresql://user:password@host:port/database

# Better Auth (Required)
BETTER_AUTH_SECRET=your-secret-key-here
BETTER_AUTH_URL=http://localhost:3000

# API Keys (Optional - providers work without keys but with limited functionality)
ALPHA_VANTAGE_API_KEY=your_key_here
FINNHUB_API_KEY=your_key_here
TWELVE_DATA_API_KEY=your_key_here
FMP_API_KEY=your_key_here

# Optional Rate Limit Tuning
YAHOO_FINANCE_RATE_LIMIT=10
ALPHA_VANTAGE_RATE_LIMIT=5
FINNHUB_RATE_LIMIT=60
TWELVE_DATA_DAILY_LIMIT=800
```

### Getting API Keys

1. **Alpha Vantage**: https://www.alphavantage.co/support/#api-key (Free tier: 25/day)
2. **Finnhub**: https://finnhub.io/register (Free tier: 60/min)
3. **Twelve Data**: https://twelvedata.com/pricing (Free tier: 800/day)
4. **Financial Modeling Prep**: https://site.financialmodelingprep.com/developer/docs/ (Free tier: 250/day)

## Usage

### In API Routes

```typescript
import { fetchQuote, fetchQuotes } from '@/lib/multiApiService';

// Single quote
const quote = await fetchQuote('AAPL', true); // useCache = true

// Multiple quotes
const quotes = await fetchQuotes(['AAPL', 'GOOGL', 'MSFT'], true);
```

### Health Monitoring

Check provider health status:

```bash
curl http://localhost:3000/api/health/apis
```

Response includes:
- Provider availability
- Rate limit remaining
- Success rates
- Circuit breaker status
- Cache statistics

## Rate Limiting

Each provider has its own rate limiting:

| Provider | Free Tier Limit | Strategy |
|----------|----------------|----------|
| Yahoo Finance | ~2,000/hour (unofficial) | Very conservative (10/min) |
| Alpha Vantage | 25/day OR 5/min | Daily + per-minute tracking |
| Finnhub | 60/min | Per-minute tracking |
| Twelve Data | 800/day | Daily tracking |
| FMP | 250/day | Daily tracking |

## Circuit Breakers

- **Opens after**: 3 consecutive failures
- **Duration**: 60 seconds
- **Auto-reset**: After cooldown period
- **Per-provider**: Each API has its own circuit breaker

## Caching Strategy

### Cache Layers

1. **Memory Cache**: Checked first, 30-second TTL
2. **Database Cache**: Checked second, 5-minute TTL
3. **Stale Cache**: Used only when all providers fail, 30-minute TTL

### Cache Invalidation

- Fresh data (< 5 min): Returned immediately
- Stale data (5-30 min): Returned only if all providers fail
- Expired data (> 30 min): Ignored, fresh fetch attempted

## Troubleshooting

### All Providers Failing

1. Check API keys are set correctly
2. Verify database connection (`DATABASE_URL`)
3. Check health endpoint: `/api/health/apis`
4. Review console logs for specific errors

### Rate Limit Issues

- System automatically falls back to next provider
- Check health endpoint to see which providers are available
- Wait for circuit breaker to reset (60 seconds)

### Cache Not Working

1. Verify Prisma migrations ran: `npx prisma db push`
2. Check `stock_quote_cache` table exists
3. Verify `DATABASE_URL` is correct
4. Check database connection logs

## Monitoring

### Health Endpoint

```bash
GET /api/health/apis
```

Returns:
- Provider status (available, rate limits, errors)
- Cache statistics
- Circuit breaker states

### Console Logs

Watch for these indicators:
- `✅ Successfully fetched` - Provider working
- `🔄 rate-limited, trying next provider` - Automatic fallback
- `📦 Using stale cache` - Fallback to cached data
- `🚫 Circuit breaker OPENED` - Provider temporarily disabled

## Best Practices

1. **Use caching**: Always pass `useCache = true` unless you need fresh data
2. **Monitor health**: Regularly check `/api/health/apis`
3. **Set API keys**: More providers = better reliability
4. **Respect limits**: Don't disable rate limiting
5. **Watch logs**: Monitor console for provider issues

## Migration from Old System

The old `yahooFinanceService` is still available for historical data (`fetchHistorical`), but all quote fetching now uses the multi-API system.

### Old Code
```typescript
import { fetchQuote } from '@/lib/yahooFinanceService';
```

### New Code
```typescript
import { fetchQuote } from '@/lib/multiApiService';
```

The API is identical, so no code changes needed beyond the import!

