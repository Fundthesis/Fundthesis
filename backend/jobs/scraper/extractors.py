"""Text extraction utilities for scraping articles."""
import re
from urllib.parse import urlparse, urljoin
from bs4 import BeautifulSoup
import requests
from requests.adapters import HTTPAdapter, Retry
import trafilatura
from newspaper import Article
from readability import Document

MIN_WORDS = 150


def make_session():
    """Create a requests session with proper headers and retries."""
    s = requests.Session()
    s.headers.update({
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


def fetch_html(url: str) -> tuple[int | None, str | None]:
    """Fetch HTML from URL. Returns (status_code, html)."""
    try:
        resp = SESSION.get(url, timeout=10)
        return resp.status_code, (resp.text if resp.ok else None)
    except requests.RequestException:
        return None, None


def _canonical_and_amp(html: str, base_url: str) -> tuple[str | None, str | None]:
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


def _extract_trafilatura(html: str) -> str | None:
    """Extract text using trafilatura."""
    cfg = trafilatura.settings.use_config()
    cfg.set("DEFAULT", "EXTRACTION_TIMEOUT", "0")
    cfg.set("DEFAULT", "MIN_EXTRACTED_SIZE", "0")
    txt = trafilatura.extract(html, config=cfg, include_tables=False, include_formatting=False)
    return txt.strip() if txt else None


def _extract_newspaper(url: str, html: str | None) -> str | None:
    """Extract text using newspaper3k."""
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


def _extract_readability(html: str) -> str | None:
    """Extract text using readability."""
    try:
        doc = Document(html)
        html_out = doc.summary()
        text = re.sub(r"<\s*br\s*/?>", "\n", html_out, flags=re.I)
        text = re.sub(r"</p\s*>", "\n\n", text, flags=re.I)
        text = re.sub(r"<[^>]+>", "", text)
        text = re.sub(r"\n{3,}", "\n\n", text)
        return text.strip() or None
    except Exception:
        return None


def _extract_article_tag(html: str) -> str | None:
    """Last-resort: concatenate all <article> <p> tags."""
    try:
        soup = BeautifulSoup(html, "lxml")
        art = soup.find("article")
        if not art:
            art = soup.find(attrs={"role": "article"}) or soup.find("main")
        if not art:
            return None
        parts = [p.get_text(" ", strip=True) for p in art.find_all("p")]
        text = "\n\n".join([p for p in parts if p])
        return text.strip() or None
    except Exception:
        return None


def _fetch_html_following_better_url(url: str) -> tuple[str, str, int | None]:
    """
    Returns (final_url, html, http_status). Tries AMP/canonical if they look better.
    """
    status, html = fetch_html(url)
    final_url = url
    if not html:
        return final_url, "", status

    can_url, amp_url = _canonical_and_amp(html, final_url)

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
        if html2 and len(html2) > max(len(html) * 0.6, 4000):
            return candidate, html2, st2 or status

    return final_url, html, status


def get_fulltext(url: str) -> tuple[str | None, str | None, str | None, int | None, dict]:
    """
    Extract full text from article URL.
    Returns (text, status, error, http_status, meta)
    status: 'ok' | 'empty' | 'blocked' | 'error' | 'short'
    meta: dict with used_extractor, best_url, html_len
    """
    best_url, html, http_status = _fetch_html_following_better_url(url)
    if not html:
        return None, ('blocked' if (http_status and http_status in (401, 403)) else 'error'), "no_html", http_status, {"best_url": best_url, "used_extractor": None, "html_len": 0}

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
        except Exception:
            pass

    # If all methods "short", return the longest short candidate
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

