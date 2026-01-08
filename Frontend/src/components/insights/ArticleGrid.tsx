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
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    return `${Math.floor(diffInSeconds / 86400)}d ago`;
  };

  const getSentimentColor = (label: string | null | undefined) => {
    if (!label) return "bg-gray-100 text-gray-600";
    const labelLower = label.toLowerCase();
    if (labelLower === "positive") return "bg-green-100 text-green-700";
    if (labelLower === "negative") return "bg-red-100 text-red-700";
    return "bg-gray-100 text-gray-600";
  };

  const truncateText = (text: string | null, maxLength: number) => {
    if (!text) return "";
    return text.length > maxLength ? text.substring(0, maxLength) + "..." : text;
  };

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[...Array(9)].map((_, i) => (
          <div key={i} className="bg-white border border-gray-200 rounded-lg p-4 animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
            <div className="h-3 bg-gray-200 rounded w-full mb-2"></div>
            <div className="h-3 bg-gray-200 rounded w-2/3"></div>
          </div>
        ))}
      </div>
    );
  }

  if (articles.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">No articles available</p>
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {articles.map((article) => (
          <div
            key={article.id}
            className="bg-white border border-gray-200 rounded-lg p-4 hover:border-[#9DB38A] hover:shadow-md transition-all cursor-pointer group"
            onClick={() => {
              setSelectedArticle(article);
              setIsModalOpen(true);
            }}
          >
            <div className="flex items-start justify-between mb-2">
              <h3 className="font-semibold text-gray-900 line-clamp-2 group-hover:text-[#9DB38A] transition-colors flex-1">
                {article.headline}
              </h3>
              {article.url && (
                <ExternalLink className="w-4 h-4 text-gray-400 flex-shrink-0 ml-2" />
              )}
            </div>
            
            {article.summary && (
              <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                {truncateText(article.summary, 120)}
              </p>
            )}

            <div className="flex items-center justify-between text-xs text-gray-500">
              <div className="flex items-center gap-2">
                <span className="font-medium">{article.source}</span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {formatTimeAgo(article.published_at)}
                </span>
              </div>
              {article.label && (
                <span className={`px-2 py-0.5 rounded text-xs ${getSentimentColor(article.label)}`}>
                  {article.label}
                </span>
              )}
            </div>

            {article.tickers && (
              <div className="mt-2 pt-2 border-t border-gray-100">
                <span className="text-xs text-[#9DB38A] font-medium">
                  {article.tickers.split(",").slice(0, 3).join(", ")}
                </span>
              </div>
            )}
          </div>
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
            tickers: selectedArticle.tickers ? selectedArticle.tickers.split(",").map(t => t.trim()) : [],
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

