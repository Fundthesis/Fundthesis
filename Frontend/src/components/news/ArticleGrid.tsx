"use client";

import { useState } from "react";
import { ExternalLink, Clock } from "lucide-react";
import NewsArticleModal from "@/components/news/NewsArticleModal";

interface Article {
  id: string;
  headline: string;
  summary: string | null;
  source: string;
  published_at: string;
  url: string | null;
  tickers: string | null;
  label?: string | null;
}

interface ArticleGridProps {
  articles: Article[];
  isLoading?: boolean;
}

export function ArticleGrid({ articles, isLoading }: ArticleGridProps) {
  const [selectedArticle, setSelectedArticle] = useState<Article | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) return "Just now";
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400)
      return `${Math.floor(diffInSeconds / 3600)}h ago`;
    return `${Math.floor(diffInSeconds / 86400)}d ago`;
  };

  const getSentimentColor = (label: string | null | undefined) => {
    if (!label) return "bg-stone-100 dark:bg-stone-700 text-stone-600 dark:text-stone-300 border-stone-300 dark:border-stone-600";
    const labelLower = label.toLowerCase();
    if (labelLower === "positive")
      return "bg-green-50 dark:bg-green-950/30 text-green-800 dark:text-green-300 border-green-300 dark:border-green-700";
    if (labelLower === "negative")
      return "bg-red-50 dark:bg-red-950/30 text-red-800 dark:text-red-300 border-red-300 dark:border-red-700";
    return "bg-stone-100 dark:bg-stone-700 text-stone-600 dark:text-stone-300 border-stone-300 dark:border-stone-600";
  };

  const truncateText = (text: string | null, maxLength: number) => {
    if (!text) return "";
    return text.length > maxLength
      ? text.substring(0, maxLength) + "..."
      : text;
  };

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[...Array(9)].map((_, i) => (
          <div
            key={i}
            className="bg-white dark:bg-stone-800 border border-stone-300 dark:border-stone-700 p-5 animate-pulse rounded-sm"
          >
            <div className="h-5 bg-stone-200 dark:bg-stone-700 w-3/4 mb-3 rounded"></div>
            <div className="h-3 bg-stone-200 dark:bg-stone-700 w-full mb-2 rounded"></div>
            <div className="h-3 bg-stone-200 dark:bg-stone-700 w-2/3 mb-4 rounded"></div>
            <div className="h-3 bg-stone-200 dark:bg-stone-700 w-1/2 rounded"></div>
          </div>
        ))}
      </div>
    );
  }

  if (articles.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="font-serif italic text-stone-600 dark:text-stone-300">
          No articles available
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {articles.map((article) => (
          <article
            key={article.id}
            className="bg-white dark:bg-stone-800 border border-stone-300 dark:border-stone-700 p-5 hover:border-black dark:hover:border-stone-100 hover:shadow-md transition-all cursor-pointer group rounded-sm flex flex-col"
            onClick={() => {
              setSelectedArticle(article);
              setIsModalOpen(true);
            }}
          >
            {/* Header with headline and external link */}
            <div className="flex items-start justify-between gap-3 mb-3">
              <h3 className="font-serif font-bold text-lg text-black dark:text-stone-100 line-clamp-3 group-hover:text-stone-700 dark:group-hover:text-stone-200 transition-colors flex-1 leading-snug">
                {article.headline}
              </h3>
              {article.url && (
                <ExternalLink className="w-4 h-4 text-stone-400 dark:text-stone-500 shrink-0 mt-1 group-hover:text-black dark:group-hover:text-stone-100 transition-colors" />
              )}
            </div>

            {/* Summary */}
            {article.summary && (
              <p className="text-sm text-stone-600 dark:text-stone-300 mb-4 line-clamp-3 font-serif leading-relaxed grow">
                {truncateText(article.summary, 150)}
              </p>
            )}

            {/* Footer with metadata */}
            <div className="mt-auto space-y-2">
              {/* Source and time */}
              <div className="flex items-center gap-2 text-xs text-stone-500 dark:text-stone-400 uppercase tracking-wide">
                <span className="font-semibold">{article.source}</span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {formatTimeAgo(article.published_at)}
                </span>
              </div>

              {/* Tickers and sentiment badge */}
              <div className="flex items-center justify-between gap-2">
                {article.tickers && (
                  <div className="flex flex-wrap gap-1.5">
                    {article.tickers
                      .split(",")
                      .slice(0, 3)
                      .map((ticker, idx) => (
                        <span
                          key={idx}
                          className="px-2 py-0.5 text-xs font-semibold text-black dark:text-stone-100 bg-stone-100 dark:bg-stone-700 rounded uppercase tracking-wide"
                        >
                          {ticker.trim()}
                        </span>
                      ))}
                  </div>
                )}
                {article.label && (
                  <span
                    className={`px-2 py-0.5 text-xs uppercase tracking-wide border rounded ${getSentimentColor(
                      article.label
                    )}`}
                  >
                    {article.label}
                  </span>
                )}
              </div>
            </div>
          </article>
        ))}
      </div>

      {selectedArticle && (
        <NewsArticleModal
          article={{
            id: selectedArticle.id,
            headline: selectedArticle.headline,
            summary: selectedArticle.summary || "",
            published_at: selectedArticle.published_at,
            url: selectedArticle.url || "",
            source: selectedArticle.source,
            label: selectedArticle.label || null,
            related: null,
            full_text: null,
            tickers: selectedArticle.tickers
              ? selectedArticle.tickers.split(",").map((t) => t.trim())
              : [],
            recommendation: "Hold" as const,
          }}
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            setSelectedArticle(null);
          }}
        />
      )}
    </>
  );
}
