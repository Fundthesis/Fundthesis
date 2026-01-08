# Daily Data Hydration Guide

## Overview
This guide explains how to hydrate stock and news data for the Fundthesis application.

---

## Stock Data

Stock data is fetched **live from Yahoo Finance** when users access the app. No manual hydration needed.

**Cache behavior:**
- In-memory cache with 1-minute TTL
- Bulk requests to reduce rate limiting
- If Yahoo blocks you (429 error), wait 15-30 minutes or restart router

---

## News Data

News is scraped from RSS feeds and stored in the database.

### Setup (one-time)

1. **Create `.env` file** at `backend/.env`:
```env
SUPABASE_URL=your_supabase_url
SUPABASE_KEY=your_supabase_anon_key
```

2. **Install dependencies:**
```bash
cd backend/webScraper
pip install -r requirements.txt
```

### Daily Hydration Command

Run this once daily (or schedule with Task Scheduler/cron):

```bash
cd backend/webScraper
python news_feeds.py
```

**What it does:**
- Fetches articles from BusinessWire and PR Newswire RSS feeds
- Filters for financial/stock-related news only
- Filters for English articles from last 24 hours
- Inserts into Supabase `articles` table with sentiment analysis

---

## Scheduling (Windows Task Scheduler)

1. Open Task Scheduler
2. Create Basic Task → Name: "Fundthesis News Hydration"
3. Trigger: Daily at 6:00 AM
4. Action: Start a program
   - Program: `python`
   - Arguments: `news_feeds.py`
   - Start in: `C:\Users\Hasnain Niazi\Documents\Fundthesis\backend\webScraper`

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| No news showing | Run `python news_feeds.py` manually |
| Stock data shows errors | Yahoo rate limit - wait 15-30 min |
| "Cannot connect to Supabase" | Check `.env` file has correct keys |
