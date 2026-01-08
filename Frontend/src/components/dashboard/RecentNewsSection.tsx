"use client";

import { NewspaperSection } from "@/components/ui/NewspaperSection";
import { ExternalLink } from "lucide-react";
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

  return (
    <NewspaperSection title="Recent Market News">
      {isLoading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="h-4 bg-stone-200 w-3/4 mb-2"></div>
              <div className="h-3 bg-stone-200 w-2/3"></div>
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="text-center py-6 text-stone-500">
          <p className="font-serif text-sm text-stone-600">
            {error instanceof Error ? error.message : "Failed to load news articles"}
          </p>
          <button
            onClick={() => window.location.reload()}
            className="mt-3 text-xs uppercase tracking-widest text-black hover:underline"
          >
            Try again
          </button>
        </div>
      ) : articles.length === 0 ? (
        <div className="text-center py-6 text-stone-500">
          <p className="font-serif italic text-sm text-stone-600">No news articles available</p>
        </div>
      ) : (
        <div className="space-y-3">
          {articles.slice(0, 8).map((article) => (
            <article
              key={article.id}
              className="border-b border-stone-200 pb-3 last:border-b-0 last:pb-0 bg-white/60 backdrop-blur-sm hover:bg-white/80 transition-all cursor-pointer rounded-sm px-2 py-2 -mx-2"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <h3 className="font-serif text-base font-bold text-black mb-1 leading-normal line-clamp-2">
                    {article.headline}
                  </h3>
                  <div className="flex items-center gap-2 text-xs text-stone-500 uppercase tracking-wide">
                    <span className="font-medium">{article.source}</span>
                    <span>|</span>
                    <span>{formatTimeAgo(article.published_at)}</span>
                    {article.tickers && (
                      <>
                        <span>|</span>
                        <span className="text-black font-semibold">
                          {article.tickers.split(",").slice(0, 1).join("")}
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
                    className="shrink-0 text-black hover:text-stone-600 transition-colors"
                    aria-label="Read full article"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </a>
                )}
              </div>
            </article>
          ))}
        </div>
      )}
    </NewspaperSection>
  );
}

