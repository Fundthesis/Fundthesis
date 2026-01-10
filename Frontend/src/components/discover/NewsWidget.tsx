"use client";

import { useState, useEffect, useCallback } from "react";
import { Clock, ExternalLink } from "lucide-react";
import Link from "next/link";

interface NewsArticle {
  id: string;
  headline: string;
  summary?: string;
  source?: string;
  publishedAt?: string;
  tickers?: string;
  url?: string;
}

interface NewsWidgetProps {
  className?: string;
  limit?: number;
}

export function NewsWidget({ className = "", limit = 5 }: NewsWidgetProps) {
  const [articles, setArticles] = useState<NewsArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchNews = useCallback(async () => {
    try {
      const response = await fetch(`/api/articles?limit=${limit}`);
      if (!response.ok) throw new Error("Failed to fetch news");
      const data = await response.json();
      setArticles(data.articles || []);
      setError(null);
    } catch (err) {
      console.error("News fetch error:", err);
      setError("Failed to load news");
    } finally {
      setLoading(false);
    }
  }, [limit]);

  useEffect(() => {
    fetchNews();
    const interval = setInterval(fetchNews, 5 * 60 * 1000); // Refresh every 5 minutes
    return () => clearInterval(interval);
  }, [fetchNews]);

  const formatTimeAgo = (dateString?: string) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffDays > 0) return `${diffDays}d ago`;
    if (diffHours > 0) return `${diffHours}h ago`;
    if (diffMins > 0) return `${diffMins}m ago`;
    return "Just now";
  };

  const parseTickers = (tickers?: string): string[] => {
    if (!tickers) return [];
    return tickers.split(",").map((t) => t.trim()).filter(Boolean).slice(0, 3);
  };

  if (loading) {
    return (
      <div className={`${className}`}>
        <div className="flex items-center gap-2 mb-3">
          <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
          <h3 className="font-serif font-bold text-sm uppercase tracking-wide text-stone-800 dark:text-stone-200">
            Latest News
          </h3>
        </div>
        <div className="space-y-3">
          {[...Array(limit)].map((_, i) => (
            <div key={i} className="space-y-2 animate-pulse">
              <div className="h-4 bg-stone-200 dark:bg-stone-700 rounded w-3/4" />
              <div className="h-3 bg-stone-200 dark:bg-stone-700 rounded w-1/2" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error || articles.length === 0) {
    return (
      <div className={`${className}`}>
        <div className="flex items-center gap-2 mb-3">
          <div className="w-2 h-2 bg-red-500 rounded-full" />
          <h3 className="font-serif font-bold text-sm uppercase tracking-wide text-stone-800 dark:text-stone-200">
            Latest News
          </h3>
        </div>
        <p className="text-xs text-stone-500 dark:text-stone-400 italic font-serif">
          {error || "No news available"}
        </p>
      </div>
    );
  }

  return (
    <div className={`${className}`}>
      {/* Header */}
      <div className="flex items-center gap-2 mb-3">
        <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
        <h3 className="font-serif font-bold text-sm uppercase tracking-wide text-stone-800 dark:text-stone-200">
          Latest News
        </h3>
      </div>

      {/* News List */}
      <div className="space-y-3">
        {articles.map((article, index) => (
          <article
            key={article.id || index}
            className="group pb-3 border-b border-stone-200 dark:border-stone-700 last:border-b-0 last:pb-0"
          >
            {/* Headline */}
            {article.url ? (
              <a
                href={article.url}
                target="_blank"
                rel="noopener noreferrer"
                className="font-serif text-sm font-medium text-stone-900 dark:text-stone-100 leading-snug hover:underline line-clamp-2 flex items-start gap-1"
              >
                <span className="flex-1">{article.headline}</span>
                <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-50 mt-0.5 flex-shrink-0" />
              </a>
            ) : (
              <p className="font-serif text-sm font-medium text-stone-900 dark:text-stone-100 leading-snug line-clamp-2">
                {article.headline}
              </p>
            )}

            {/* Meta */}
            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
              {article.source && (
                <span className="text-[10px] text-stone-500 dark:text-stone-400">
                  {article.source}
                </span>
              )}
              {article.publishedAt && (
                <span className="flex items-center gap-0.5 text-[10px] text-stone-400">
                  <Clock className="w-2.5 h-2.5" />
                  {formatTimeAgo(article.publishedAt)}
                </span>
              )}
            </div>

            {/* Tickers */}
            {parseTickers(article.tickers).length > 0 && (
              <div className="flex gap-1 mt-1.5">
                {parseTickers(article.tickers).map((ticker) => (
                  <Link
                    key={ticker}
                    href={`/discover?symbol=${ticker}`}
                    className="text-[9px] font-mono font-bold px-1.5 py-0.5 bg-stone-100 dark:bg-stone-700 text-stone-600 dark:text-stone-300 hover:bg-blue-100 dark:hover:bg-blue-900 hover:text-blue-700 dark:hover:text-blue-300 transition-colors rounded"
                  >
                    ${ticker}
                  </Link>
                ))}
              </div>
            )}
          </article>
        ))}
      </div>

      {/* View All Link */}
      <Link
        href="/news"
        className="block mt-4 text-xs text-center font-serif uppercase tracking-widest text-stone-500 hover:text-stone-800 dark:hover:text-stone-200 transition-colors"
      >
        View All News →
      </Link>
    </div>
  );
}
