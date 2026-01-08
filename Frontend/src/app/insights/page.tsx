"use client";

import { NewspaperLayout } from "@/components/ui/NewspaperLayout";
import { ArticleGrid } from "@/components/insights/ArticleGrid";
import { MarketSummarySidebar } from "@/components/insights/MarketSummarySidebar";
import { AIRecommendationsSidebar } from "@/components/insights/AIRecommendationsSidebar";
import { useArticles } from "@/lib/hooks/useArticles";
import { useInsights } from "@/lib/hooks/useInsights";

// Mover type for market movers
interface Mover {
  symbol: string;
  company?: string;
  price: number;
  change: number;
  changePercent: number;
}

export default function InsightsPage() {
  // Fetch articles and insights using React Query
  const { data: articlesData, isLoading: articlesLoading } = useArticles({
    limit: 30,
    offset: 0,
    orderBy: "published_at",
    orderDirection: "desc",
  });

  const { data: insightsData, isLoading: insightsLoading } = useInsights("both");

  const articles = articlesData?.articles || [];
  const marketSummary = insightsData?.market_summary || "";
  const aiRecommendations = insightsData?.ai_recommendations || "";

  return (
    <NewspaperLayout
      title="The Market Intelligence"
      subtitle="All the Analysis Fit to Print"
      maxWidth="max-w-6xl"
    >
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Main Content - Article Grid */}
        <div className="lg:col-span-3">
          <ArticleGrid articles={articles} isLoading={articlesLoading} />
        </div>

        {/* Sidebar */}
        <div className="lg:col-span-1">
          <MarketSummarySidebar summary={marketSummary} isLoading={insightsLoading} />
          <AIRecommendationsSidebar
            recommendations={aiRecommendations}
            isLoading={insightsLoading}
          />
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
    <div className="min-h-screen bg-[#fcfbf9] text-[#1a1a1a] font-serif">
      <main className="max-w-7xl mx-auto px-4 py-8">

        {/* Newspaper Header */}
        <div className="border-b-4 border-black pb-4 mb-8">
          <div className="flex justify-between items-end mb-2">
            <h1 className="text-6xl md:text-8xl font-black tracking-tighter text-black uppercase leading-none">
              Market Insights
            </h1>
            <div className="text-right hidden md:block">
              <p className="italic text-lg text-gray-500">AI-Powered Analysis & RAG Engine</p>
              <p className="font-bold text-xs uppercase tracking-widest mt-1">Vol. 1 • Section C</p>
            </div>
          </div>
          <div className="border-t border-black/20 pt-2 flex justify-between items-center text-sm font-bold uppercase tracking-widest text-gray-400">
            <span>Daily Briefing</span>
            <span>{new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
            <span>Est. 2025</span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-x-12 gap-y-8">
          {/* Main Content (Left 8 cols) */}
          <div className="lg:col-span-8 flex flex-col gap-8">

            {/* Lead Story / Market Summary */}
            <div className="pb-8 border-b-2 border-black/10">
              <h2 className="text-4xl font-bold mb-4 leading-tight">
                Market Pulse: Today&apos;s AI Synthesis
              </h2>
              {insightsLoading ? (
                <div className="py-12 flex justify-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black"></div>
                </div>
              ) : (
                <div className="text-xl leading-relaxed text-gray-800 columns-1 md:columns-2 gap-8">
                  <MarkdownContent content={marketSummary} />
                </div>
              )}
            </div>

            {/* News Grid (Dynamic Panels) */}
            <div>
              <h3 className="text-xl font-bold uppercase tracking-widest mb-6 border-b border-black pb-2">
                Headlines & Sentiment
              </h3>

              {loading ? (
                <div className="py-12 text-center text-gray-500 italic">Loading headlines...</div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {articles.slice(0, 6).map((article) => (
                    <div key={article.id} className="group cursor-pointer" onClick={() => handleArticleClick(article)}>
                      <div className="mb-2 flex items-center gap-2">
                        <span className={`px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider border ${(article.sentiment_label || "").toLowerCase() === 'positive' ? 'border-green-600 text-green-700 bg-green-50' :
                          (article.sentiment_label || "").toLowerCase() === 'negative' ? 'border-red-600 text-red-700 bg-red-50' : 'border-gray-400 text-gray-600 bg-gray-50'
                          }`}>
                          {article.sentiment_label || "Neutral"}
                        </span>
                        <span className="text-xs text-gray-400 uppercase">{article.source}</span>
                      </div>
                      <h4 className="text-2xl font-bold leading-tight mb-2 group-hover:underline decoration-2 underline-offset-4">
                        {article.headline}
                      </h4>
                      <p className="text-gray-600 text-sm leading-relaxed line-clamp-3">
                        {article.summary}
                      </p>
                    </div>
                  ))}
                </div>
              )}
              {!loading && error && (
                <p className="py-8 text-center text-red-600">{error}</p>
              )}
              {!loading && !error && articles.length === 0 && (
                <p className="py-8 text-center italic text-gray-500">No headlines available at this moment.</p>
              )}
            </div>
          </div>

          {/* Sidebar (Right 4 cols) */}
          <div className="lg:col-span-4 flex flex-col gap-8">

            {/* AI Stratagem Panel */}
            <div className="bg-stone-100 p-6 border-t-8 border-black">
              <h3 className="text-2xl font-bold mb-4 uppercase tracking-tighter">
                AI Stratagem
              </h3>
              {insightsLoading ? (
                <div className="py-4 text-center italic text-gray-500">Analyzing market data...</div>
              ) : (
                <div className="text-base leading-relaxed text-gray-700 space-y-4">
                  <MarkdownContent content={aiRecommendations} />
                </div>
              )}
            </div>

            {/* Top Movers Panel (Dynamic) */}
            <div className="border border-black/10 p-6">
              <h3 className="text-lg font-bold uppercase tracking-widest mb-4 border-b border-black/20 pb-2">
                Market Movers
              </h3>
              <div className="space-y-4">
                <div className="grid grid-cols-1 gap-4">
                  {movers.length > 0 ? movers.map((mover, idx) => (
                    <div key={idx} className="flex justify-between items-center bg-white p-3 border border-black/5">
                      <div>
                        <div className="text-xs text-gray-500 uppercase">{mover.company || mover.symbol}</div>
                        <div className="font-bold text-lg">{mover.symbol}</div>
                      </div>
                      <div className={`text-right font-bold ${mover.change >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                        {mover.change >= 0 ? '+' : ''}{mover.changePercent?.toFixed(2)}%
                        <div className="text-xs text-gray-400 font-normal">${mover.price?.toFixed(2)}</div>
                      </div>
                    </div>
                  )) : (
                    <p className="text-sm italic text-gray-500">Loading movers...</p>
                  )}
                </div>
              </div>
            </div>

            {/* Quote of the Day */}
            <div className="border-l-4 border-black pl-4 py-2">
              <p className="italic text-lg text-gray-800 font-serif leading-relaxed">
                &quot;In the short run, the market is a voting machine but in the long run, it is a weighing machine.&quot;
              </p>
              <p className="text-sm font-bold mt-2 uppercase tracking-wide">— Benjamin Graham</p>
            </div>

          </div>
        </div>
      </div>
    </NewspaperLayout>
  );
}
