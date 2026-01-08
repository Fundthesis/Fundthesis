"use client";

import { useState } from "react";
import { ExternalLink, Clock } from "lucide-react";
import NewsArticleModal from "@/components/NewsArticleModal";
import { NewsArticle } from "@/lib/api";

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
    if (!label) return "bg-stone-100 text-stone-600 border-stone-300";
    const labelLower = label.toLowerCase();
    if (labelLower === "positive")
      return "bg-green-50 text-green-800 border-green-300";
    if (labelLower === "negative")
      return "bg-red-50 text-red-800 border-red-300";
    return "bg-stone-100 text-stone-600 border-stone-300";
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
            className="bg-white/60 backdrop-blur-sm border border-stone-200 p-4 animate-pulse rounded-sm"
          >
            <div className="h-4 bg-stone-200 w-3/4 mb-2"></div>
            <div className="h-3 bg-stone-200 w-full mb-2"></div>
            <div className="h-3 bg-stone-200 w-2/3"></div>
          </div>
        ))}
      </div>
    );
  }

  if (articles.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="font-serif italic text-stone-600">
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
            className="bg-white/60 backdrop-blur-sm border border-stone-200 p-4 hover:bg-white/80 hover:border-black transition-all cursor-pointer group rounded-sm"
            onClick={() => {
              setSelectedArticle(article);
              setIsModalOpen(true);
            }}
          >
            <div className="flex items-start justify-between mb-2">
              <h3 className="font-serif font-bold text-black line-clamp-2 group-hover:text-stone-700 transition-colors flex-1 leading-tight">
                {article.headline}
              </h3>
              {article.url && (
                <ExternalLink className="w-4 h-4 text-stone-400 shrink-0 ml-2 group-hover:text-black" />
              )}
            </div>

            {article.summary && (
              <p className="text-sm text-stone-600 mb-3 line-clamp-2 font-serif">
                {truncateText(article.summary, 120)}
              </p>
            )}

            <div className="flex items-center justify-between text-xs text-stone-500 uppercase tracking-wide">
              <div className="flex items-center gap-2">
                <span className="font-semibold">{article.source}</span>
                <span>|</span>
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {formatTimeAgo(article.published_at)}
                </span>
              </div>
              {article.label && (
                <span
                  className={`px-2 py-0.5 text-xs uppercase tracking-wide border ${getSentimentColor(
                    article.label
                  )}`}
                >
                  {article.label}
                </span>
              )}
            </div>

            {article.tickers && (
              <div className="mt-2 pt-2 border-t border-stone-200">
                <span className="text-xs text-black font-semibold uppercase tracking-wide">
                  {article.tickers.split(",").slice(0, 3).join(", ")}
                </span>
              </div>
            )}
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
