import { useQuery } from "@tanstack/react-query";

export interface InsightsResponse {
  market_summary?: string;
  ai_recommendations?: string;
  articles_analyzed: number;
  generated_at: string;
}

type InsightsType = "summary" | "recommendations" | "both";

/**
 * Hook to fetch market insights (AI-generated summary and recommendations)
 */
export function useInsights(type: InsightsType = "both") {
  return useQuery<InsightsResponse>({
    queryKey: ["insights", type],
    queryFn: async () => {
      const response = await fetch(`/api/insights?type=${type}`);
      if (!response.ok) {
        throw new Error("Failed to fetch insights");
      }
      return response.json();
    },
    staleTime: 5 * 60 * 1000, // 5 minutes - AI generation is expensive
  });
}
