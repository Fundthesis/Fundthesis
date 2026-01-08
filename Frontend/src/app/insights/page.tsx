"use client";

import { NewspaperLayout } from "@/components/ui/NewspaperLayout";
import { ArticleGrid } from "@/components/insights/ArticleGrid";
import { MarketSummarySidebar } from "@/components/insights/MarketSummarySidebar";
import { AIRecommendationsSidebar } from "@/components/insights/AIRecommendationsSidebar";
import { useArticles } from "@/lib/hooks/useArticles";
import { useInsights } from "@/lib/hooks/useInsights";

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
        </div>
      </div>
    </NewspaperLayout>
  );
}
