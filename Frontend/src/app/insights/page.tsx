"use client";

import React, { useState, useMemo, useCallback, useEffect } from "react";
import NewsArticleModal from "@/components/news/NewsArticleModal";
import MarkdownContent from "@/components/MarkdownContent";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import { useArticles } from "@/lib/hooks/useArticles";
import { useInsights } from "@/lib/hooks/useInsights";
import { useStocks } from "@/lib/hooks/useStocks";
import { type NewsArticle } from "@/lib/api";

// Cache configuration for insights (keeping localStorage cache for insights since it's expensive to generate)
const CACHE_KEY = "fundthesis_insights_cache";
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

// Cache helper functions
const getCachedInsights = () => {
  // Check if we're in the browser
  if (typeof window === "undefined") return null;

  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (!cached) return null;

    const { marketSummary, aiRecommendations, timestamp } = JSON.parse(cached);
    const now = Date.now();
    const age = now - timestamp;

    // Check if cache is still valid (less than 24 hours old)
    if (age < CACHE_DURATION) {
      return { marketSummary, aiRecommendations };
    } else {
      localStorage.removeItem(CACHE_KEY);
      return null;
    }
  } catch (error) {
    console.error("Error reading cache:", error);
    if (typeof window !== "undefined") {
      localStorage.removeItem(CACHE_KEY);
    }
    return null;
  }
};

const setCachedInsights = (
  marketSummary: string,
  aiRecommendations: string
) => {
  // Check if we're in the browser
  if (typeof window === "undefined") return;

  try {
    const cacheData = {
      marketSummary,
      aiRecommendations,
      timestamp: Date.now(),
    };
    localStorage.setItem(CACHE_KEY, JSON.stringify(cacheData));
  } catch (error) {
    console.error("Error caching insights:", error);
  }
};

const ARTICLES_PER_PAGE = 20;

export default function InsightsPage() {
  const [selectedArticle, setSelectedArticle] = useState<NewsArticle | null>(
    null
  );
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [currentPage, setCurrentPage] = useState<number>(1);

  // Fetch articles using TanStack Query
  const {
    data: articlesData,
    isLoading: articlesLoading,
    error: articlesError,
  } = useArticles({
    limit: 100,
    offset: 0,
    orderBy: "published_at",
    orderDirection: "desc",
    search: searchQuery || undefined,
  });

  // Fetch insights using TanStack Query
  const { data: insightsData, isLoading: insightsLoading } =
    useInsights("both");

  // Fetch stocks for market movers
  const { data: stocksData, isLoading: moversLoading } = useStocks({
    limit: 50, // Fetch more to sort and get top movers
    offset: 0,
  });

  // Transform articles from hook format to component format
  const articles = useMemo(() => {
    if (!articlesData?.articles) return [];

    return articlesData.articles.map((article) => {
      // Derive sentiment from label
      const label = article.label?.toLowerCase() || "neutral";
      const sentimentLabel =
        label === "positive" || label === "negative" || label === "neutral"
          ? label.charAt(0).toUpperCase() + label.slice(1)
          : "Neutral";

      // Parse tickers
      let tickersArray: string[] = [];
      if (article.tickers) {
        if (typeof article.tickers === "string") {
          try {
            const parsed = JSON.parse(article.tickers);
            tickersArray = Array.isArray(parsed) ? parsed : [parsed];
          } catch {
            tickersArray = article.tickers
              .split(",")
              .map((t: string) => t.trim())
              .filter((t: string) => t.length > 0);
          }
        } else if (Array.isArray(article.tickers)) {
          tickersArray = article.tickers;
        }
      }

      return {
        id: article.id,
        headline: article.headline || "No headline",
        summary: article.summary || "",
        published_at: article.published_at || new Date().toISOString(),
        url: article.url || "#",
        source: article.source || "Unknown",
        label: article.label || null,
        related: article.related || null,
        full_text: article.full_text || null,
        tickers: tickersArray,
        recommendation:
          label === "positive" ? "Buy" : label === "negative" ? "Sell" : "Hold",
        sentiment_label: sentimentLabel,
        sentiment_percentage:
          label === "positive" ? 75 : label === "negative" ? 75 : 50,
      } as NewsArticle;
    });
  }, [articlesData]);

  // Get market movers (top 6 by changePercent)
  const movers = useMemo(() => {
    if (!stocksData?.stocks) return [];

    return [...stocksData.stocks]
      .sort((a, b) => (b.changePercent || 0) - (a.changePercent || 0))
      .slice(0, 6)
      .map((stock) => ({
        symbol: stock.symbol,
        company: stock.company,
        price: stock.price,
        change: stock.change,
        changePercent: stock.changePercent,
      }));
  }, [stocksData]);

  // Get insights with localStorage cache fallback
  const {
    marketSummary,
    aiRecommendations,
    insightsLoading: finalInsightsLoading,
  } = useMemo(() => {
    // Check cache first
    const cached = getCachedInsights();
    if (cached) {
      return {
        marketSummary: cached.marketSummary,
        aiRecommendations: cached.aiRecommendations,
        insightsLoading: false,
      };
    }

    // Use API data if available
    if (insightsData) {
      const summary =
        insightsData.market_summary ||
        "Markets showed positive momentum today with tech stocks leading the gains. AI and semiconductor sectors continue to attract investor attention.";
      const recommendations =
        insightsData.ai_recommendations ||
        "Based on your portfolio and risk profile, consider diversifying into emerging markets and renewable energy sectors.";

      // Cache the new data
      setCachedInsights(summary, recommendations);

      return {
        marketSummary: summary,
        aiRecommendations: recommendations,
        insightsLoading: insightsLoading,
      };
    }

    // Fallback content
    return {
      marketSummary:
        "Markets showed positive momentum today with tech stocks leading the gains. AI and semiconductor sectors continue to attract investor attention.",
      aiRecommendations:
        "Based on your portfolio and risk profile, consider diversifying into emerging markets and renewable energy sectors.",
      insightsLoading: insightsLoading,
    };
  }, [insightsData, insightsLoading]);

  const handleArticleClick = useCallback((article: NewsArticle) => {
    setSelectedArticle(article);
    setIsModalOpen(true);
  }, []);

  const handleCloseModal = useCallback(() => {
    setIsModalOpen(false);
    setSelectedArticle(null);
  }, []);

  // Calculate pagination
  const totalArticles = articles.length;
  const totalPages = Math.ceil(totalArticles / ARTICLES_PER_PAGE);
  const startIndex = (currentPage - 1) * ARTICLES_PER_PAGE;
  const endIndex = startIndex + ARTICLES_PER_PAGE;
  const paginatedArticles = articles.slice(startIndex, endIndex);

  // Reset to page 1 when search query changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  // Pagination handlers
  const handlePreviousPage = useCallback(() => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, [currentPage]);

  const handleNextPage = useCallback(() => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, [currentPage, totalPages]);

  const handlePageChange = useCallback((page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  // formatDate helper available if needed for future use
  // const formatDate = (dateString: string) => {
  //   const date = new Date(dateString);
  //   return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  // };

  return (
    <div className="min-h-screen bg-[#fcfbf9] dark:bg-stone-900 text-[#1a1a1a] dark:text-stone-100 font-serif">
      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Newspaper Header */}
        <div className="border-b-4 border-black dark:border-stone-700 mb-8">
          <div className="flex justify-between items-end mb-2">
            <h1 className="text-6xl md:text-8xl font-black tracking-tighter text-black dark:text-stone-100 uppercase leading-none">
              Market Insights
            </h1>
            <div className="text-right hidden md:block">
              <p className="italic text-lg text-gray-500 dark:text-stone-400">
                AI-Powered Analysis & RAG Engine
              </p>
              <p className="font-bold text-xs uppercase tracking-widest mt-1 text-black dark:text-stone-300">
                Vol. 1 • Section C
              </p>
            </div>
          </div>
          <div className="border-t border-black/20 dark:border-stone-700 pt-2 flex justify-between items-center text-sm font-bold uppercase tracking-widest text-gray-400 dark:text-stone-500">
            <span>Daily Briefing</span>
            <span>
              {new Date().toLocaleDateString("en-US", {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </span>
            <span>Est. 2025</span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-x-12 gap-y-8">
          {/* Main Content (Left 8 cols) */}
          <div className="lg:col-span-8 flex flex-col gap-8">
            {/* Lead Story / Market Summary */}
            <div className="pb-8 border-b-2 border-black/10 dark:border-stone-700">
              <h2 className="text-4xl font-bold mb-4 leading-tight text-black dark:text-stone-100">
                Market Pulse: Today&apos;s AI Synthesis
              </h2>
              {finalInsightsLoading ? (
                <div className="py-12 flex justify-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black dark:border-stone-500"></div>
                </div>
              ) : (
                <div className="text-xl leading-relaxed text-gray-800 dark:text-stone-100 columns-1 md:columns-2 gap-8">
                  <MarkdownContent content={marketSummary} />
                </div>
              )}
            </div>

            {/* News Grid (Dynamic Panels) */}
            <div>
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
                <h3 className="text-xl font-bold uppercase tracking-widest border-b border-black dark:border-stone-700 pb-2 text-black dark:text-stone-100">
                  Headlines & Sentiment
                </h3>

                {/* Search Input */}
                <div className="w-full sm:w-auto">
                  <div className="relative">
                    <Input
                      type="text"
                      placeholder="Search articles..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full sm:w-64 pr-10"
                    />
                    {searchQuery && (
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => setSearchQuery("")}
                        className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                        aria-label="Clear search"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </div>

              {articlesLoading ? (
                <div className="py-12 text-center text-gray-500 dark:text-stone-400 italic">
                  Loading headlines...
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {paginatedArticles.map((article) => (
                      <div
                        key={article.id}
                        className="group cursor-pointer"
                        onClick={() => handleArticleClick(article)}
                      >
                        <div className="mb-2 flex items-center gap-2">
                          <span
                            className={`px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider border ${
                              (article.sentiment_label || "").toLowerCase() ===
                              "positive"
                                ? "border-green-600 dark:border-green-500 text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-950"
                                : (
                                    article.sentiment_label || ""
                                  ).toLowerCase() === "negative"
                                ? "border-red-600 dark:border-red-500 text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-950"
                                : "border-gray-400 dark:border-stone-600 text-gray-600 dark:text-stone-400 bg-gray-50 dark:bg-stone-800"
                            }`}
                          >
                            {article.sentiment_label || "Neutral"}
                          </span>
                          <span className="text-xs text-gray-400 dark:text-stone-500 uppercase">
                            {article.source}
                          </span>
                        </div>
                        <h4 className="text-2xl font-bold leading-tight mb-2 group-hover:underline decoration-2 underline-offset-4 text-black dark:text-stone-100">
                          {article.headline}
                        </h4>
                        <p className="text-gray-600 dark:text-stone-400 text-sm leading-relaxed line-clamp-3">
                          {article.summary}
                        </p>
                      </div>
                    ))}
                  </div>

                  {/* Pagination Controls */}
                  {totalPages > 1 && (
                    <div className="mt-8 flex items-center justify-center gap-2 flex-wrap">
                      <Button
                        variant="outline"
                        onClick={handlePreviousPage}
                        disabled={currentPage === 1}
                        className="uppercase tracking-wider disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Previous
                      </Button>

                      {/* Page Numbers */}
                      <div className="flex gap-1">
                        {Array.from(
                          { length: Math.min(5, totalPages) },
                          (_, i) => {
                            let pageNum: number;
                            if (totalPages <= 5) {
                              pageNum = i + 1;
                            } else if (currentPage <= 3) {
                              pageNum = i + 1;
                            } else if (currentPage >= totalPages - 2) {
                              pageNum = totalPages - 4 + i;
                            } else {
                              pageNum = currentPage - 2 + i;
                            }

                            return (
                              <Button
                                key={pageNum}
                                variant={
                                  currentPage === pageNum
                                    ? "default"
                                    : "outline"
                                }
                                onClick={() => handlePageChange(pageNum)}
                                className="uppercase tracking-wider min-w-10"
                              >
                                {pageNum}
                              </Button>
                            );
                          }
                        )}
                      </div>

                      <Button
                        variant="outline"
                        onClick={handleNextPage}
                        disabled={currentPage === totalPages}
                        className="uppercase tracking-wider disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Next
                      </Button>
                    </div>
                  )}

                  {/* Page Info */}
                  {totalPages > 1 && (
                    <div className="mt-4 text-center text-sm text-gray-500 dark:text-stone-400">
                      Page {currentPage} of {totalPages} • Showing{" "}
                      {startIndex + 1}-{Math.min(endIndex, totalArticles)} of{" "}
                      {totalArticles} articles
                    </div>
                  )}
                </>
              )}
              {!articlesLoading && articlesError && (
                <p className="py-8 text-center text-red-600 dark:text-red-400">
                  {articlesError instanceof Error
                    ? articlesError.message
                    : "Failed to load articles"}
                </p>
              )}
              {!articlesLoading && !articlesError && articles.length === 0 && (
                <p className="py-8 text-center italic text-gray-500 dark:text-stone-400">
                  {searchQuery
                    ? `No articles found matching "${searchQuery}".`
                    : "No headlines available at this moment."}
                </p>
              )}
            </div>
          </div>

          {/* Sidebar (Right 4 cols) - Sticky */}
          <div className="lg:col-span-4 flex flex-col gap-8 lg:sticky lg:top-32 lg:self-start lg:max-h-[calc(100vh-8rem)] lg:overflow-y-auto lg:overflow-x-hidden">
            <div className="flex flex-col gap-8 pb-4">
              {/* AI Stratagem Panel */}
              <div className="bg-stone-100 dark:bg-stone-800 p-6 border-t-8 border-black dark:border-stone-700 ">
                <h3 className="text-2xl font-bold mb-4  uppercase tracking-tighter text-black dark:text-stone-100">
                  AI Stratagem
                </h3>
                {finalInsightsLoading ? (
                  <div className="py-4 text-center italic text-gray-500 dark:text-stone-400">
                    Analyzing market data...
                  </div>
                ) : (
                  <div className="text-base leading-relaxed text-gray-700 dark:text-stone-100 space-y-4">
                    <MarkdownContent content={aiRecommendations} />
                  </div>
                )}
              </div>

              {/* Top Movers Panel (Dynamic) */}
              <div className="border border-black/10 dark:border-stone-700 p-6">
                <h3 className="text-lg font-bold uppercase tracking-widest mb-4 border-b border-black/20 dark:border-stone-700 pb-2 text-black dark:text-stone-100">
                  Market Movers
                </h3>
                <div className="space-y-4">
                  <div className="grid grid-cols-1 gap-4">
                    {moversLoading ? (
                      <p className="text-sm italic text-gray-500 dark:text-stone-400">
                        Loading movers...
                      </p>
                    ) : movers.length > 0 ? (
                      movers.map((mover, idx) => (
                        <div
                          key={idx}
                          className="flex justify-between items-center bg-white dark:bg-stone-800 p-3 border border-black/5 dark:border-stone-700"
                        >
                          <div>
                            <div className="text-xs text-gray-500 dark:text-stone-400 uppercase">
                              {mover.company || mover.symbol}
                            </div>
                            <div className="font-bold text-lg text-black dark:text-stone-100">
                              {mover.symbol}
                            </div>
                          </div>
                          <div
                            className={`text-right font-bold ${
                              mover.change >= 0
                                ? "text-green-700 dark:text-green-400"
                                : "text-red-700 dark:text-red-400"
                            }`}
                          >
                            {mover.change >= 0 ? "+" : ""}
                            {mover.changePercent?.toFixed(2)}%
                            <div className="text-xs text-gray-400 dark:text-stone-500 font-normal">
                              ${mover.price?.toFixed(2)}
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm italic text-gray-500 dark:text-stone-400">
                        No movers available
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Quote of the Day */}
              {/* <div className="border-l-4 border-black dark:border-stone-700 pl-4 py-2">
                <p className="italic text-lg text-gray-800 dark:text-stone-300 font-serif leading-relaxed">
                  &quot;In the short run, the market is a voting machine but in
                  the long run, it is a weighing machine.&quot;
                </p>
                <p className="text-sm font-bold mt-2 uppercase tracking-wide text-black dark:text-stone-400">
                  — Benjamin Graham
                </p>
              </div> */}
            </div>
          </div>
        </div>
      </main>

      <NewsArticleModal
        article={selectedArticle}
        isOpen={isModalOpen}
        onClose={handleCloseModal}
      />
    </div>
  );
}
