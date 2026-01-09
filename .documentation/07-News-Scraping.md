# News Scraping System

This document describes the automated news scraping system that collects financial news articles from multiple sources for FundThesis.

## Table of Contents

- [Overview](#overview)
- [Data Sources](#data-sources)
- [Scraping Process](#scraping-process)
- [Article Processing](#article-processing)
- [Scheduled Execution](#scheduled-execution)
- [Data Quality](#data-quality)
- [Limitations](#limitations)

---

## Overview

FundThesis automatically collects financial news articles from multiple sources to provide users with comprehensive market coverage. The scraping system runs on a schedule and stores articles in the database for sentiment analysis and user access.

### Purpose

- **Comprehensive Coverage:** Collect news from multiple sources
- **Real-Time Updates:** Keep news feed current
- **Stock-Specific News:** Identify articles mentioning specific stocks
- **Automated Collection:** Reduce manual curation effort

### Key Characteristics

- **Update Frequency:** Every 4 hours
- **Sources:** Finnhub API + RSS feeds (BusinessWire, PR Newswire)
- **Coverage:** General financial news + company-specific announcements
- **Processing:** Automatic text extraction and ticker identification

---

## Data Sources

### 1. Finnhub API

**Provider:** Finnhub.io

**What It Provides:**
- Real-time financial news
- Company-specific news
- Market news
- Press releases

**API Endpoint:** `/v1/news`

**Rate Limits:**
- Free tier: 60 calls/minute
- Paid tiers: Higher limits

**Data Format:**
- JSON response
- Includes headline, summary, source, URL, published date
- Associated ticker symbols

### 2. RSS Feeds

**Sources:**
- **BusinessWire:** Corporate news and press releases
- **PR Newswire:** Public relations announcements

**Why RSS?**
- **Free:** No API costs
- **Reliable:** Standardized format
- **Comprehensive:** Covers many companies
- **Real-Time:** Updates frequently

**Feed URLs:**
- BusinessWire: Financial news RSS feed
- PR Newswire: Financial news RSS feed

---

## Scraping Process

### High-Level Flow

```
Scheduled Trigger (GitHub Actions)
    │
    ▼
Scraper Job Runner
    │
    ├─→ Finnhub Scraper
    │   └─→ Fetch News from API
    │
    └─→ RSS Feed Scraper
        └─→ Parse RSS Feeds
    │
    ▼
Article Processing
    │
    ├─→ Text Extraction
    ├─→ Ticker Identification
    └─→ Duplicate Detection
    │
    ▼
Database Storage
    │
    ▼
Ready for Sentiment Analysis
```

### Finnhub Scraping (`finnhub.py`)

**Process:**
1. Initialize Finnhub API client
2. Fetch general market news
3. Fetch company-specific news for tracked stocks
4. Process each article:
   - Extract headline, summary, URL
   - Identify associated tickers
   - Check for duplicates
   - Store in database

**Example:**
```python
async def scrape_finnhub_news():
    client = finnhub.Client(api_key=api_key)
    
    # Fetch general news
    general_news = client.general_news('general', min_id=0)
    
    # Fetch company news
    for symbol in tracked_stocks:
        company_news = client.company_news(symbol, _from, to)
        # Process and store
```

### RSS Feed Scraping (`rss_feeds.py`)

**Process:**
1. Fetch RSS feed XML
2. Parse XML using feedparser
3. Extract article metadata:
   - Title (headline)
   - Description (summary)
   - Link (URL)
   - Published date
4. Extract full article text (if needed)
5. Identify ticker symbols
6. Check for duplicates
7. Store in database

**Example:**
```python
async def ingest_all_feeds():
    feeds = [
        'https://www.businesswire.com/portal/site/home/news/rss',
        'https://www.prnewswire.com/rss/financial-services/'
    ]
    
    for feed_url in feeds:
        feed = feedparser.parse(feed_url)
        for entry in feed.entries:
            # Process and store article
```

---

## Article Processing

### Text Extraction

**Sources (in order of preference):**
1. **API Summary:** Provided summary from source
2. **RSS Description:** Description from RSS feed
3. **Full Text Extraction:** Extract from article URL

**Extraction Methods:**
- **Trafilatura:** Primary extraction library
- **Newspaper3k:** Fallback extraction
- **BeautifulSoup:** HTML parsing

**Process:**
```python
def extract_article_text(url):
    # Try trafilatura first
    text = trafilatura.extract(url)
    if text:
        return text
    
    # Fallback to newspaper3k
    article = Article(url)
    article.download()
    article.parse()
    return article.text
```

### Ticker Identification

**Purpose:** Identify which stocks are mentioned in articles

**Methods:**
1. **API-Provided:** Finnhub provides tickers
2. **Pattern Matching:** Search for stock symbols in text
3. **Ticker Database:** Match against known tickers

**Implementation:**
```python
def extract_tickers(text):
    # Pattern: $AAPL, AAPL, or "Apple Inc. (AAPL)"
    ticker_pattern = r'\$?([A-Z]{1,5})\b'
    found_tickers = re.findall(ticker_pattern, text)
    
    # Filter against known tickers
    valid_tickers = [t for t in found_tickers if t in known_tickers]
    return valid_tickers
```

### Duplicate Detection

**Method:** URL-based deduplication

**Process:**
1. Check if article URL exists in database
2. If exists, skip (don't insert duplicate)
3. If new, insert article

**Database Constraint:**
```prisma
model Article {
  url String @unique  // Prevents duplicates
}
```

---

## Scheduled Execution

### GitHub Actions Workflow

**File:** `.github/workflows/scraper-job.yml`

**Schedule:** Every 4 hours

**Cron Expression:** `0 */4 * * *`

**Process:**
1. Checkout code
2. Set up Python 3.11
3. Install dependencies
4. Generate Prisma client
5. Run scraper: `python jobs/scraper/runner.py`

### Manual Execution

```bash
cd backend
python -m jobs.scraper.runner
```

### Job Runner (`runner.py`)

**Responsibilities:**
- Coordinate Finnhub and RSS scraping
- Handle errors gracefully
- Log progress and results
- Report total articles inserted

**Error Handling:**
- Continues if one source fails
- Logs errors for debugging
- Returns total count of inserted articles

---

## Data Quality

### Article Metadata

**Stored Fields:**
- `headline`: Article title
- `summary`: Article summary/description
- `fullText`: Full article text (if extracted)
- `url`: Article URL (unique)
- `source`: Source name (Finnhub, BusinessWire, etc.)
- `publishedAt`: Publication date
- `tickers`: Associated stock symbols (comma-separated)
- `category`: Article category (if available)

### Quality Assurance

**Text Quality:**
- **Headline:** Usually high quality (from source)
- **Summary:** Varies by source (Finnhub good, RSS variable)
- **Full Text:** May have extraction errors

**Completeness:**
- **Headline:** ~95% of articles
- **Summary:** ~80% of articles
- **Full Text:** ~60% of articles (extraction not always successful)
- **Tickers:** ~70% of articles (not all mention specific stocks)

### Data Issues

**Common Problems:**
1. **Missing Full Text:** Extraction may fail
2. **Incorrect Tickers:** Pattern matching may find false positives
3. **Duplicate Articles:** Different sources may cover same news
4. **Broken Links:** URLs may become invalid
5. **Encoding Issues:** Special characters may not display correctly

---

## Limitations

### Source Limitations

1. **Finnhub API:**
   - Rate limits on free tier
   - May miss some sources
   - Limited historical data

2. **RSS Feeds:**
   - May not include full article text
   - Limited metadata
   - Feed availability depends on source

### Extraction Limitations

1. **Full Text Extraction:**
   - Not always successful
   - May extract ads/navigation
   - Paywall-protected articles inaccessible

2. **Ticker Identification:**
   - Pattern matching may miss tickers
   - False positives possible
   - Doesn't understand context

### Coverage Limitations

1. **Geographic:** Primarily US-focused
2. **Language:** English only
3. **Sources:** Limited to configured sources
4. **Real-Time:** 4-hour delay (not truly real-time)

---

## Future Improvements

### Source Expansion

1. **More RSS Feeds:**
   - SEC EDGAR filings
   - Financial news aggregators
   - Company investor relations pages

2. **Additional APIs:**
   - NewsAPI
   - Alpha Vantage news
   - Marketaux

3. **Social Media:**
   - Twitter/X for market sentiment
   - Reddit r/wallstreetbets
   - StockTwits

### Processing Improvements

1. **Better Extraction:**
   - Improved full-text extraction
   - Handle paywalls (if possible)
   - Extract images and charts

2. **Smarter Ticker Detection:**
   - Use NLP for context-aware detection
   - Company name to ticker mapping
   - Reduce false positives

3. **Deduplication:**
   - Content-based deduplication (not just URL)
   - Similarity matching
   - Merge duplicate articles

### Quality Enhancements

1. **Article Classification:**
   - Categorize by type (earnings, M&A, product launch)
   - Identify breaking news
   - Filter low-quality articles

2. **Relevance Scoring:**
   - Score articles by relevance
   - Prioritize important news
   - Filter noise

---

## Technical Details

**Dependencies:**
- `finnhub-python` - Finnhub API client
- `feedparser` - RSS feed parsing
- `trafilatura` - Text extraction
- `newspaper3k` - Alternative text extraction
- `beautifulsoup4` - HTML parsing

**File Locations:**
- Finnhub scraper: `backend/jobs/scraper/finnhub.py`
- RSS scraper: `backend/jobs/scraper/rss_feeds.py`
- Text extractors: `backend/jobs/scraper/extractors.py`
- Article inserter: `backend/jobs/scraper/article_inserter.py`
- Runner: `backend/jobs/scraper/runner.py`
- Workflow: `.github/workflows/scraper-job.yml`

---

## Usage

### Database Access

Articles are accessible via API:

```http
GET /api/news/recent
GET /api/news/{article_id}
GET /api/news/ticker/{ticker}
```

### Frontend Display

- **News Feed:** Chronological list of articles
- **Stock-Specific:** Filter by ticker symbol
- **Sentiment Filter:** Filter by sentiment (after analysis)
- **Search:** Full-text search across articles

---

## Conclusion

The news scraping system provides comprehensive financial news coverage by collecting articles from multiple sources. The system runs automatically every 4 hours, processes articles, and stores them for sentiment analysis and user access.

**Status:** ✅ Production Ready  
**Update Frequency:** Every 4 hours  
**Coverage:** Multiple sources (Finnhub + RSS feeds)

---

## Statistics

**Typical Run:**
- **Finnhub:** 50-100 articles per run
- **RSS Feeds:** 20-50 articles per run
- **Total:** 70-150 new articles every 4 hours
- **Daily:** ~500-1000 articles per day

**Database Growth:**
- Articles accumulate over time
- No automatic deletion
- Can archive old articles if needed
