#This is the newscraper functions that Im testing out to see if I can get more optimal scraping 

import os
import time
import sqlite3
from urllib.parse import urlparse, urljoin
#This is the newscraper functions that Im testing out to see if I can get more optimal scraping 

import os
import time
import sqlite3
from urllib.parse import urlparse, urljoin
from pathlib import Path
from datetime import datetime, timezone
from dotenv import load_dotenv
from bs4 import BeautifulSoup
from readability import Document
import re
import asyncio


import requests
from requests.adapters import HTTPAdapter, Retry

# Fallback extractors
import trafilatura
from newspaper import Article
from readability import Document

import finnhub

#FinBERT setup
# Use a pipeline as a high-level helper
from transformers import pipeline
pipe = pipeline("text-classification", model="ProsusAI/finbert")



MIN_WORDS = 150

load_dotenv()
API_KEY = os.getenv("FINNHUB_KEY")

# Common stock tickers for major exchanges (NYSE, NASDAQ)
# This is a simplified list - in production, you'd want a comprehensive ticker database
MAJOR_TICKERS = {
    'AAPL', 'MSFT', 'GOOGL', 'AMZN', 'NVDA', 'META', 'TSLA', 'BRK.B', 'V', 'JNJ',
    'WMT', 'JPM', 'MA', 'PG', 'UNH', 'HD', 'DIS', 'BAC', 'VZ', 'ADBE', 'NFLX',
    'PYPL', 'CMCSA', 'KO', 'PFE', 'NKE', 'INTC', 'T', 'CSCO', 'XOM', 'AVGO',
    'COST', 'PEP', 'TMO', 'ABBV', 'MRK', 'CVX', 'WFC', 'ACN', 'DHR', 'MCD',
    'NEE', 'LIN', 'BMY', 'QCOM', 'HON', 'AMGN', 'LOW', 'UPS', 'RTX', 'AMT',
    'UBER', 'LYFT', 'SNAP', 'TWTR', 'SQ', 'SHOP', 'SPOT', 'ZM', 'DOCU', 'CRM',
    'ORCL', 'IBM', 'AMD', 'MU', 'QRVO', 'LRCX', 'KLAC', 'AMAT', 'ASML', 'TSM'
}

# Extended list of common ticker patterns (1-5 letters)
TICKER_PATTERN = re.compile(r'\b([A-Z]{1,5})\b')

# PRISMA setup - add parent directory to path for db_client
import sys
sys.path.insert(0, str(Path(__file__).parent.parent))
from db_client import db


# ---------- HTTP session with headers & retries ----------
def make_session():
    s = requests.Session()
    s.headers.update({
        # A common current desktop UA string
        "User-Agent": ("Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                       "AppleWebKit/537.36 (KHTML, like Gecko) "
                       "Chrome/120.0.0.0 Safari/537.36"),
        "Accept-Language": "en-US,en;q=0.9",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Connection": "keep-alive",
    })
    retries = Retry(
        total=3,
        backoff_factor=0.6,
        status_forcelist=(429, 500, 502, 503, 504),
        allowed_methods=frozenset(["GET", "HEAD"])
    )
    s.mount("https://", HTTPAdapter(max_retries=retries))
    s.mount("http://", HTTPAdapter(max_retries=retries))
    return s

SESSION = make_session()

# ---------- Finnhub ----------
def finn_client():
    if not API_KEY:
        raise RuntimeError("FINNHUB_KEY not set in env")
    return finnhub.Client(api_key=API_KEY)

#Helper for converting epoch to timestamptz string
def epoch_to_iso(epoch_val):
    """Convert UNIX seconds -> ISO string with UTC tzinfo, or None."""
    if epoch_val is None:
        return None
    try:
        ts = int(epoch_val)
        dt = datetime.fromtimestamp(ts, timezone.utc)
        return dt.isoformat()
    except Exception:
        return None


def extract_tickers_from_text(text: str) -> list[str]:
    """Extract potential stock tickers from text."""
    if not text:
        return []
    
    # Find all uppercase letter sequences (potential tickers)
    potential_tickers = TICKER_PATTERN.findall(text.upper())
    
    # Filter to only known major tickers
    found_tickers = [ticker for ticker in potential_tickers if ticker in MAJOR_TICKERS]
    
    # Also check if any tickers are mentioned explicitly in the text
    text_upper = text.upper()
    for ticker in MAJOR_TICKERS:
        if ticker in text_upper and ticker not in found_tickers:
            found_tickers.append(ticker)
    
    return list(set(found_tickers))  # Remove duplicates




# ---------- Extractors ----------
def extract_trafilatura(html: str) -> str | None:
    # Trafilatura ignores robots by default; yields clean text
    txt = trafilatura.extract(html, include_tables=False, include_formatting=False)
    return txt.strip() if txt else None

def extract_newspaper(url: str, html: str | None) -> str | None:
    try:
        art = Article(url)
        if html:
            art.download(html=html)
        else:
            art.download()
        art.parse()
        return art.text.strip() if art.text else None
    except Exception:
        return None

def extract_readability(html: str) -> str | None:
    try:
        doc = Document(html)
        text = doc.summary(html_partial=True)
        # crude text-only strip; you can keep HTML if you want
        import re
        plain = re.sub("<[^<]+?>", "", text or "").strip()
        return plain or None
    except Exception:
        return None

def fetch_html(url: str) -> tuple[int|None, str|None]:
    try:
        resp = SESSION.get(url, timeout=10)
        return resp.status_code, (resp.text if resp.ok else None)
    except requests.RequestException:
        return None, None

def _canonical_and_amp(html: str, base_url: str) -> tuple[str|None, str|None]:
    """Return (canonical_url, amp_url) if present."""
    try:
        soup = BeautifulSoup(html, "lxml")
        can = soup.find("link", rel=lambda v: v and "canonical" in v.lower())
        amp = soup.find("link", rel=lambda v: v and "amphtml" in v.lower())
        can_url = urljoin(base_url, can["href"]) if can and can.get("href") else None
        amp_url = urljoin(base_url, amp["href"]) if amp and amp.get("href") else None
        return can_url, amp_url
    except Exception:
        return None, None

def _extract_trafilatura(html: str) -> str|None:
    cfg = trafilatura.settings.use_config()
    # Favor recall; allow fallback heuristics
    cfg.set("DEFAULT", "EXTRACTION_TIMEOUT", "0")
    cfg.set("DEFAULT", "MIN_EXTRACTED_SIZE", "0")
    txt = trafilatura.extract(html, config=cfg, include_tables=False, include_formatting=False)
    return txt.strip() if txt else None

def _extract_newspaper(url: str, html: str|None) -> str|None:
    try:
        art = Article(url)
        if html:
            art.download(html=html)
        else:
            art.download()
        art.parse()
        return art.text.strip() if art.text else None
    except Exception:
        return None
    
def _extract_readability(html: str) -> str|None:
    try:
        doc = Document(html)
        # full article HTML, then strip tags but keep paragraph breaks
        html_out = doc.summary()
        text = re.sub(r"<\s*br\s*/?>", "\n", html_out, flags=re.I)
        text = re.sub(r"</p\s*>", "\n\n", text, flags=re.I)
        text = re.sub(r"<[^>]+>", "", text)
        text = re.sub(r"\n{3,}", "\n\n", text)
        return text.strip() or None
    except Exception:
        return None

def _extract_article_tag(html: str) -> str|None:
    """Last-resort: concatenate all <article> <p> tags."""
    try:
        soup = BeautifulSoup(html, "lxml")
        art = soup.find("article")
        if not art:
            # some sites wrap in role=article or main content div
            art = soup.find(attrs={"role": "article"}) or soup.find("main")
        if not art:
            return None
        parts = [p.get_text(" ", strip=True) for p in art.find_all("p")]
        text = "\n\n".join([p for p in parts if p])
        return text.strip() or None
    except Exception:
        return None

def _fetch_html_following_better_url(url: str) -> tuple[str, str, int|None]:
    """
    Returns (final_url, html, http_status). Tries AMP/canonical if they look better.
    """
    # 1) fetch original
    status, html = fetch_html(url)
    final_url = url
    if not html:
        return final_url, "", status

    # 2) see if there is a better target (prefer AMP first; it’s usually static/full)
    can_url, amp_url = _canonical_and_amp(html, final_url)

    # Pick AMP if same domain and not obviously truncated aggregators
    def _same_domain(u1, u2):
        try:
            return urlparse(u1).netloc.split(":")[0] == urlparse(u2).netloc.split(":")[0]
        except Exception:
            return False

    candidate = None
    if amp_url and (_same_domain(final_url, amp_url) or ("amp." in amp_url)):
        candidate = amp_url
    elif can_url:
        candidate = can_url

    if candidate and candidate != final_url:
        st2, html2 = fetch_html(candidate)
        if html2 and len(html2) > max(len(html)*0.6, 4000):  # crude heuristic: bigger page likely has full text
            return candidate, html2, st2 or status

    return final_url, html, status

def get_fulltext(url: str) -> tuple[str|None, str|None, str|None, int|None, dict]:
    """
    Returns (text, status, error, http_status, meta)
    status: 'ok' | 'empty' | 'blocked' | 'error' | 'short'
    meta: dict with used_extractor, best_url, html_len
    """
    best_url, html, http_status = _fetch_html_following_better_url(url)
    if not html:
        return None, ('blocked' if (http_status and http_status in (401,403)) else 'error'), "no_html", http_status, {"best_url": best_url, "used_extractor": None, "html_len": 0}

    html_len = len(html)

    # Try extractors in order; require a reasonable length
    for name, fn in [
        ("trafilatura", _extract_trafilatura),
        ("newspaper3k", lambda h: _extract_newspaper(best_url, h)),
        ("readability", _extract_readability),
        ("article-tag", _extract_article_tag),
    ]:
        try:
            text = fn(html)
            if text and len(text.split()) >= MIN_WORDS:
                return text, "ok", None, http_status, {"best_url": best_url, "used_extractor": name, "html_len": html_len}
            # If we got something but short, keep it as a candidate; try next method first
            short_candidate = text
        except Exception:
            short_candidate = None
        # keep trying next extractor

    # If all methods “short”, return the longest short candidate
    best = max(
        [(_extract_trafilatura(html) or ""),
         (_extract_newspaper(best_url, html) or ""),
         (_extract_readability(html) or ""),
         (_extract_article_tag(html) or "")],
        key=lambda t: len(t)
    )
    if best:
        status = "short" if len(best.split()) < MIN_WORDS else "ok"
        return best, status, None, http_status, {"best_url": best_url, "used_extractor": "fallback-longest", "html_len": html_len}

    return None, "empty", "extract_failed", http_status, {"best_url": best_url, "used_extractor": None, "html_len": html_len}


# ---------- Insert ----------
#Inserting articles into Prisma
async def insert_into_db(article_db: dict,
                         text: str | None,
                         status: str,
                         error: str | None,
                         http_status: int | None,
                         meta: dict):
    """
    article_db: generic "news item"
    We'll gracefully handle different shapes (Finnhub, SEC, etc.)
    """

    # --- 1. Sentiment source ---
    finb_input = (
        article_db.get('summary')
        or article_db.get('headline')
        or ""
    )
    into_label = run_finbert(finb_input) if finb_input else None

    # --- 2. Domain extraction ---
    try:
        domain = urlparse(article_db.get('url', '')).netloc or None
    except Exception:
        domain = None

    # --- 3. Normalize published_at ---
    published_raw = article_db.get('datetime')
    published_iso = None

    # Case 1: it's epoch-like (e.g. 1698432000)
    if isinstance(published_raw, (int, float)) or (isinstance(published_raw, str) and published_raw.isdigit()):
        # Convert to datetime object, not ISO string yet for Prisma
        try:
            ts = int(published_raw)
            published_iso = datetime.fromtimestamp(ts, timezone.utc)
        except:
            published_iso = None

    # Case 2: it's already ISO-ish string like "2025-10-27T13:12:00+00:00" or "...Z"
    elif isinstance(published_raw, str):
        try:
            published_iso = datetime.fromisoformat(published_raw.replace("Z", "+00:00"))
        except Exception:
            published_iso = None

    # --- 4. Extract tickers from article content ---
    headline = article_db.get('headline', '') or ''
    summary = article_db.get('summary', '') or ''
    full_text_snippet = (text[:500] if text else '') or ''
    combined_text = f"{headline} {summary} {full_text_snippet}"
    tickers = extract_tickers_from_text(combined_text)
    
    # Convert tickers list to comma-separated string for storage
    tickers_str = ','.join(tickers) if tickers else None

    # --- 5. Build payload base ---
    # Prisma create/update data
    data = {
        "category": article_db.get('category'),
        "published_at": published_iso,
        "headline": article_db.get('headline'),
        "related": article_db.get('related'),
        "source": article_db.get('source'),
        "summary": article_db.get('summary'),
        "full_text": text,
        "url": meta.get("best_url") or article_db.get('url'),
        "label": into_label,
        "inserted_at": datetime.now(timezone.utc),
        "fetch_status": f"{status}:{http_status}|{meta.get('used_extractor')}|html={meta.get('html_len')}",
        "fetch_error": error,
        "source_domain": domain,
        "tickers": tickers_str
    }

    # --- 5. ONLY add sqlite_id/article_id if they look numeric ---
    art_id = article_db.get('id')
    if isinstance(art_id, (int, float)) or (isinstance(art_id, str) and art_id.isdigit()):
        data["sqlite_id"] = str(art_id)
        data["article_id"] = str(art_id)
    # else: skip those fields so Postgres doesn't try to coerce

    # --- 6. Upsert ---
    if not db.is_connected():
        await db.connect()

    try:
        # Upsert based on URL
        res = await db.article.upsert(
            where={
                'url': data['url']
            },
            data={
                'create': data,
                'update': data
            }
        )
        return res
    except Exception as e:
        print(f"Error inserting article: {e}")
        return None


# ---------- Pipeline ----------
async def articleToSupabase(): # Renaming this might be good, but keeping for now
    finc = finn_client()
    news = finc.general_news('general', min_id=0)

    inserted = 0
    for art in news:
        # get article body by scraping the URL
        text, status, error, http_status, meta = get_fulltext(art['url'])

        # push 1 row into DB
        await insert_into_db(
            article_db=art,
            text=text,
            status=status,
            error=error,
            http_status=http_status,
            meta=meta
        )

        inserted += 1

    print(f"Inserted {inserted} articles into DB")


#-------------FinBert-------------
def run_finbert(summ_of_article):
    result = pipe(summ_of_article)
    label = result[0]['label']
    return label


async def quick_dbcheck():
    if not db.is_connected():
        await db.connect()
        
    # total rows
    total_rows = await db.article.count()

    # rows with missing/blank full_text
    # Prisma doesn't have direct OR for null/empty string in one go easily like supabase .or_
    # But we can do count with OR
    empty_rows = await db.article.count(
        where={
            'OR': [
                {'full_text': None},
                {'full_text': ''}
            ]
        }
    )

    print(f"Total rows in DB: {total_rows} | Empty full_text: {empty_rows}")

if __name__ == "__main__":
    # If run as script
    asyncio.run(articleToSupabase())
