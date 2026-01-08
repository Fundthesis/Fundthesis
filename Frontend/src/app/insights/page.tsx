"use client";

import React, { useEffect, useState } from "react";
import NewsArticleModal from "@/components/news/NewsArticleModal";
import MarkdownContent from "@/components/MarkdownContent";
import { fetchArticles, NewsArticle } from "@/lib/api";

// Cache configuration
const CACHE_KEY = "fundthesis_insights_cache";
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

// Cache helper functions
const getCachedInsights = () => {
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (!cached) return null;

    const { marketSummary, aiRecommendations, timestamp } = JSON.parse(cached);
    const now = Date.now();
    const age = now - timestamp;

    // Check if cache is still valid (less than 24 hours old)
    if (age < CACHE_DURATION) {
      console.log(
        "Using cached insights (age:",
        Math.round(age / 1000 / 60),
        "minutes)"
      );
      return { marketSummary, aiRecommendations };
    } else {
      // Cache expired, remove it
      localStorage.removeItem(CACHE_KEY);
      console.log("Cache expired, fetching new insights");
      return null;
    }
  } catch (error) {
    console.error("Error reading cache:", error);
    localStorage.removeItem(CACHE_KEY);
    return null;
  }
};

const setCachedInsights = (
  marketSummary: string,
  aiRecommendations: string
) => {
  try {
    const cacheData = {
      marketSummary,
      aiRecommendations,
      timestamp: Date.now(),
    };
    localStorage.setItem(CACHE_KEY, JSON.stringify(cacheData));
    console.log("Insights cached successfully");
  } catch (error) {
    console.error("Error caching insights:", error);
  }
};

// Mover type for market movers
interface Mover {
  symbol: string;
  company?: string;
  price: number;
  change: number;
  changePercent: number;
}

export default function InsightsPage() {
  const [articles, setArticles] = useState<NewsArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedArticle, setSelectedArticle] = useState<NewsArticle | null>(
    null
  );
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [marketSummary, setMarketSummary] = useState<string>("");
  const [aiRecommendations, setAiRecommendations] = useState<string>("");
  const [insightsLoading, setInsightsLoading] = useState(true);

  // State for movers
  const [movers, setMovers] = useState<Mover[]>([]);

  useEffect(() => {
    const loadNews = async () => {
      try {
        setLoading(true);
        setError(null);
        console.log("Fetching articles...");
        const response = await fetchArticles({
          limit: 50,
          offset: 0,
          orderBy: "published_at",
          orderDirection: "desc",
        });
        console.log("Articles response:", response);

        if (response.articles.length === 0) {
          setError(null); // No error, just no articles
          console.log("No articles found in response");
        }

        setArticles(response.articles || []);
      } catch (err) {
        const errorMessage =
          err instanceof Error
            ? err.message
            : "Failed to load news articles. Please try again later.";
        setError(errorMessage);
        console.error("Error loading news:", err);
        setArticles([]); // Set empty array on error
      } finally {
        setLoading(false);
      }
    };

    // Fetch market movers
    const fetchMovers = async () => {
      try {
        const res = await fetch('/api/stocks?limit=6&orderBy=changePercent&orderDirection=desc');
        const data = await res.json();
        if (data.stocks) setMovers(data.stocks);
      } catch (e) {
        console.error("Failed to fetch movers", e);
      }
    };

    loadNews();
    fetchMovers();
  }, []);

  useEffect(() => {
    const loadInsights = async () => {
      try {
        setInsightsLoading(true);

        // Check cache first
        const cached = getCachedInsights();
        if (cached) {
          setMarketSummary(cached.marketSummary);
          setAiRecommendations(cached.aiRecommendations);
          setInsightsLoading(false);
          return;
        }

        // Cache miss or expired, fetch new data
        console.log("Fetching insights from API...");
        const response = await fetch("/api/insights?type=both", {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        });

        if (!response.ok) {
          throw new Error(`Failed to fetch insights: ${response.status}`);
        }

        const data = await response.json();
        console.log("Insights response:", data);

        const summary =
          data.market_summary ||
          "Markets showed positive momentum today with tech stocks leading the gains. AI and semiconductor sectors continue to attract investor attention.";
        const recommendations =
          data.ai_recommendations ||
          "Based on your portfolio and risk profile, consider diversifying into emerging markets and renewable energy sectors.";

        setMarketSummary(summary);
        setAiRecommendations(recommendations);

        // Cache the new data
        setCachedInsights(summary, recommendations);
      } catch (err) {
        console.error("Error loading insights:", err);
        // Use fallback content on error
        const fallbackSummary =
          "Markets showed positive momentum today with tech stocks leading the gains. AI and semiconductor sectors continue to attract investor attention.";
        const fallbackRecommendations =
          "Based on your portfolio and risk profile, consider diversifying into emerging markets and renewable energy sectors.";

        setMarketSummary(fallbackSummary);
        setAiRecommendations(fallbackRecommendations);
      } finally {
        setInsightsLoading(false);
      }
    };

    loadInsights();
  }, []);

  const handleArticleClick = (article: NewsArticle) => {
    setSelectedArticle(article);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedArticle(null);
  };

  // formatDate helper available if needed for future use
  // const formatDate = (dateString: string) => {
  //   const date = new Date(dateString);
  //   return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  // };

  return (
    <div className="min-h-screen bg-[#fcfbf9] dark:bg-stone-900 text-[#1a1a1a] dark:text-stone-100 font-serif">
      <main className="max-w-7xl mx-auto px-4 py-8">

        {/* Newspaper Header */}
        <div className="border-b-4 border-black dark:border-stone-700 pb-4 mb-8">
          <div className="flex justify-between items-end mb-2">
            <h1 className="text-6xl md:text-8xl font-black tracking-tighter text-black dark:text-stone-100 uppercase leading-none">
              Market Insights
            </h1>
            <div className="text-right hidden md:block">
              <p className="italic text-lg text-gray-500 dark:text-stone-400">AI-Powered Analysis & RAG Engine</p>
              <p className="font-bold text-xs uppercase tracking-widest mt-1 text-black dark:text-stone-300">Vol. 1 • Section C</p>
            </div>
          </div>
          <div className="border-t border-black/20 dark:border-stone-700 pt-2 flex justify-between items-center text-sm font-bold uppercase tracking-widest text-gray-400 dark:text-stone-500">
            <span>Daily Briefing</span>
            <span>{new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
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
              {insightsLoading ? (
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
              <h3 className="text-xl font-bold uppercase tracking-widest mb-6 border-b border-black dark:border-stone-700 pb-2 text-black dark:text-stone-100">
                Headlines & Sentiment
              </h3>

              {loading ? (
                <div className="py-12 text-center text-gray-500 dark:text-stone-400 italic">Loading headlines...</div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {articles.slice(0, 6).map((article) => (
                    <div key={article.id} className="group cursor-pointer" onClick={() => handleArticleClick(article)}>
                      <div className="mb-2 flex items-center gap-2">
                        <span className={`px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider border ${(article.sentiment_label || "").toLowerCase() === 'positive' ? 'border-green-600 dark:border-green-500 text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-950' :
                          (article.sentiment_label || "").toLowerCase() === 'negative' ? 'border-red-600 dark:border-red-500 text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-950' : 'border-gray-400 dark:border-stone-600 text-gray-600 dark:text-stone-400 bg-gray-50 dark:bg-stone-800'
                          }`}>
                          {article.sentiment_label || "Neutral"}
                        </span>
                        <span className="text-xs text-gray-400 dark:text-stone-500 uppercase">{article.source}</span>
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
              )}
              {!loading && error && (
                <p className="py-8 text-center text-red-600 dark:text-red-400">{error}</p>
              )}
              {!loading && !error && articles.length === 0 && (
                <p className="py-8 text-center italic text-gray-500 dark:text-stone-400">No headlines available at this moment.</p>
              )}
            </div>
          </div>

          {/* Sidebar (Right 4 cols) */}
          <div className="lg:col-span-4 flex flex-col gap-8">

            {/* AI Stratagem Panel */}
            <div className="bg-stone-100 dark:bg-stone-800 p-6 border-t-8 border-black dark:border-stone-700">
              <h3 className="text-2xl font-bold mb-4 uppercase tracking-tighter text-black dark:text-stone-100">
                AI Stratagem
              </h3>
              {insightsLoading ? (
                <div className="py-4 text-center italic text-gray-500 dark:text-stone-400">Analyzing market data...</div>
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
                  {movers.length > 0 ? movers.map((mover, idx) => (
                    <div key={idx} className="flex justify-between items-center bg-white dark:bg-stone-800 p-3 border border-black/5 dark:border-stone-700">
                      <div>
                        <div className="text-xs text-gray-500 dark:text-stone-400 uppercase">{mover.company || mover.symbol}</div>
                        <div className="font-bold text-lg text-black dark:text-stone-100">{mover.symbol}</div>
                      </div>
                      <div className={`text-right font-bold ${mover.change >= 0 ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400'}`}>
                        {mover.change >= 0 ? '+' : ''}{mover.changePercent?.toFixed(2)}%
                        <div className="text-xs text-gray-400 dark:text-stone-500 font-normal">${mover.price?.toFixed(2)}</div>
                      </div>
                    </div>
                  )) : (
                    <p className="text-sm italic text-gray-500 dark:text-stone-400">Loading movers...</p>
                  )}
                </div>
              </div>
            </div>

            {/* Quote of the Day */}
            <div className="border-l-4 border-black dark:border-stone-700 pl-4 py-2">
              <p className="italic text-lg text-gray-800 dark:text-stone-300 font-serif leading-relaxed">
                &quot;In the short run, the market is a voting machine but in the long run, it is a weighing machine.&quot;
              </p>
              <p className="text-sm font-bold mt-2 uppercase tracking-wide text-black dark:text-stone-400">— Benjamin Graham</p>
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
