"use client";

import { NewspaperSection } from "@/components/ui/NewspaperSection";
import MarkdownContent from "@/components/MarkdownContent";

interface AIRecommendationsSidebarProps {
  recommendations: string;
  isLoading?: boolean;
}

export function AIRecommendationsSidebar({
  recommendations,
  isLoading,
}: AIRecommendationsSidebarProps) {
  return (
    <NewspaperSection title="AI Recommendations" className="mt-4">
      {isLoading ? (
        <div className="space-y-2">
          <div className="h-4 bg-stone-200 animate-pulse"></div>
          <div className="h-4 bg-stone-200 animate-pulse w-5/6"></div>
          <div className="h-4 bg-stone-200 animate-pulse w-4/6"></div>
        </div>
      ) : recommendations ? (
        <div className="prose prose-sm max-w-none prose-stone">
          <MarkdownContent content={recommendations} />
        </div>
      ) : (
        <p className="font-serif italic text-stone-600 text-sm">No recommendations available</p>
      )}
    </NewspaperSection>
  );
}

