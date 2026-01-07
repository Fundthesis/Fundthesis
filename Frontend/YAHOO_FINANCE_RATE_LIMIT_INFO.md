# Stock Data API System - Multi-Provider with Fallback

## ⚠️ UPDATE: Multi-API System Implemented

The application now uses a **multi-API system** with automatic fallback. If Yahoo Finance is rate-limited, the system automatically tries:
1. Alpha Vantage
2. Finnhub  
3. Twelve Data
4. Financial Modeling Prep

See `MULTI_API_SYSTEM.md` for complete documentation.

---

## Previous Yahoo Finance Rate Limiting Issue

**Note**: This section describes the old single-provider system. The new system handles rate limiting automatically.

Your Yahoo Finance API access was previously **rate-limited (HTTP 429)**. This is Yahoo's way of protecting their servers from excessive requests.

## What We've Implemented

### 1. Conservative Rate Limiting

- **10 requests per minute** (was 30)
- **1 concurrent request** (was 3)
- **5-symbol batches** (was 15)
- **5-second delays between batches** (was 500ms)
- **Initial token reduction**: Starts with only 3 tokens to prevent burst

### 2. Circuit Breaker Pattern

After 3 consecutive failures, the system will:

- **Stop making requests for 1 minute**
- Show a clear error message: "Circuit breaker is open"
- Automatically resume after the cooldown period

### 3. Database Caching

- **5-minute fresh cache**
- **30-minute stale cache fallback**
- Persistent across server restarts
- Batched cache queries (1 query for N symbols)

### 4. Exponential Backoff

- Retry delays: 1s → 2s → 4s → 8s → 16s
- Maximum 5 retries before giving up
- Automatic failure tracking

## What You Need to Do

### Option 1: Wait for Rate Limit to Expire (Recommended)

Yahoo Finance rate limits typically expire after:

- **1-6 hours** for temporary blocks
- **24 hours** for severe violations

**Steps:**

1. Stop the development server
2. Wait at least 1-2 hours
3. Restart and test with a single stock request first
4. Gradually increase usage

### Option 2: Use a Different IP Address

- Connect through a different network
- Use a VPN
- Restart your router to get a new IP (may not work)

### Option 3: Seed Cache with Mock Data (Development)

For development, you can manually insert mock data:

```sql
INSERT INTO stock_quote_cache (symbol, quote_data, last_fetched, fetch_attempts, last_error)
VALUES
  ('AAPL', '{"symbol":"AAPL","regularMarketPrice":150.00,"regularMarketOpen":148.00,"longName":"Apple Inc."}', NOW(), 0, NULL),
  ('GOOGL', '{"symbol":"GOOGL","regularMarketPrice":140.00,"regularMarketOpen":138.00,"longName":"Alphabet Inc."}', NOW(), 0, NULL);
```

## Signs That Rate Limit Has Expired

✅ First request succeeds without 429 error
✅ Circuit breaker stays closed
✅ Console shows: "✅ Request successful, resetting failure counter"
✅ Cache starts populating with real data

## Monitoring

Watch the console logs for these indicators:

- `🔄 Circuit breaker reset` - Good! System recovering
- `🚫 Circuit breaker OPENED` - System blocked requests to prevent further issues
- `✅ Request successful` - Yahoo Finance is responding
- `⚠️ Rate limit error (attempt X/5)` - Still rate limited

## Best Practices Going Forward

1. **Don't refresh the page repeatedly** - Uses cache instead
2. **Limit simultaneous page loads** - Wait for one to finish
3. **Use cache-first strategy** - Only fetch when truly needed
4. **Consider upgrading** - Yahoo Finance has paid tiers with higher limits
5. **Alternative APIs** - Consider Alpha Vantage, Finnhub, or Polygon.io

## Current System Limits

| Setting                  | Value      |
| ------------------------ | ---------- |
| Requests/minute          | 10         |
| Concurrent requests      | 1          |
| Batch size               | 5 symbols  |
| Batch delay              | 5 seconds  |
| Cache TTL (fresh)        | 5 minutes  |
| Cache TTL (stale)        | 30 minutes |
| Circuit breaker cooldown | 60 seconds |

## Checking Cache Status

```bash
cd Frontend && export PGPASSWORD=$(grep DATABASE_URL .env | sed 's/.*:\/\/[^:]*:\([^@]*\)@.*/\1/') && \
psql -h fundthesis.postgres.database.azure.com -p 5432 -U AliBenramiFundthesis -d postgres \
-c "SELECT symbol, last_fetched, fetch_attempts, last_error IS NOT NULL as has_error FROM stock_quote_cache ORDER BY last_fetched DESC LIMIT 10;"
```
