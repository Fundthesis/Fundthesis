"use client";

import { NewspaperSection } from "@/components/ui/NewspaperSection";
import MarkdownContent from "@/components/MarkdownContent";

interface MarketSummarySidebarProps {
  summary: string;
  isLoading?: boolean;
}

export function MarketSummarySidebar({ summary, isLoading }: MarketSummarySidebarProps) {
  return (
    <NewspaperSection title="Market Summary" className="sticky top-4">
      {isLoading ? (
        <div className="space-y-2">
          <div className="h-4 bg-stone-200 animate-pulse"></div>
          <div className="h-4 bg-stone-200 animate-pulse w-5/6"></div>
          <div className="h-4 bg-stone-200 animate-pulse w-4/6"></div>
        </div>
      ) : summary ? (
        <div className="prose prose-sm max-w-none prose-stone">
          <MarkdownContent content={summary} />
        </div>
      ) : (
        <p className="font-serif italic text-stone-600 text-sm">No market summary available</p>
      )}
    </NewspaperSection>
  );
}

