"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { ExternalLink, Clock } from "lucide-react";
import { useArticles } from "@/lib/hooks/useArticles";

export function RecentNewsSection() {
  // Fetch articles with auto-refresh every 5 minutes
  const { data, isLoading, error } = useArticles({
    limit: 8,
    offset: 0,
    orderBy: "published_at",
    orderDirection: "desc",
    refetchInterval: 5 * 60 * 1000, // 5 minutes
  });

  const articles = data?.articles || [];

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) return "Just now";
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    return `${Math.floor(diffInSeconds / 86400)}d ago`;
  };

  const truncateText = (text: string | null, maxLength: number) => {
    if (!text) return "";
    return text.length > maxLength ? text.substring(0, maxLength) + "..." : text;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl font-bold flex items-center gap-2">
          <Clock className="w-5 h-5" />
          Recent Market News
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-full mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-2/3"></div>
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="text-center py-8 text-gray-500">
            <p>{error instanceof Error ? error.message : "Failed to load news articles"}</p>
            <button
              onClick={() => window.location.reload()}
              className="mt-2 text-[#9DB38A] hover:underline"
            >
              Try again
            </button>
          </div>
        ) : articles.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            No news articles available
          </div>
        ) : (
          <div className="space-y-4">
            {articles.map((article) => (
              <div
                key={article.id}
                className="border-b border-gray-200 pb-4 last:border-b-0 last:pb-0 hover:bg-gray-50 -mx-4 px-4 py-2 rounded-lg transition-colors"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-900 mb-1 line-clamp-2">
                      {article.headline}
                    </h3>
                    {article.summary && (
                      <p className="text-sm text-gray-600 mb-2 line-clamp-2">
                        {truncateText(article.summary, 150)}
                      </p>
                    )}
                    <div className="flex items-center gap-3 text-xs text-gray-500">
                      <span className="font-medium">{article.source}</span>
                      <span>•</span>
                      <span>{formatTimeAgo(article.published_at)}</span>
                      {article.tickers && (
                        <>
                          <span>•</span>
                          <span className="text-[#9DB38A] font-medium">
                            {article.tickers.split(",").slice(0, 3).join(", ")}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                  {article.url && (
                    <a
                      href={article.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-shrink-0 text-[#9DB38A] hover:text-[#8ca279] transition-colors"
                      aria-label="Read full article"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

