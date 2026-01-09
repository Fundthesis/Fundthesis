"use client";

import { NewspaperSection } from "@/components/cards/NewspaperSection";
import MarkdownContent from "@/components/shared/MarkdownContent";

interface MarketSummarySidebarProps {
  summary: string;
  isLoading?: boolean;
}

export function MarketSummarySidebar({
  summary,
  isLoading,
}: MarketSummarySidebarProps) {
  return (
    <NewspaperSection
      title="Market Summary"
      className="sticky top-4 hidden lg:block z-10"
    >
      {isLoading ? (
        <div className="space-y-2">
          <div className="h-4 bg-stone-200 dark:bg-stone-700 animate-pulse"></div>
          <div className="h-4 bg-stone-200 dark:bg-stone-700 animate-pulse w-5/6"></div>
          <div className="h-4 bg-stone-200 dark:bg-stone-700 animate-pulse w-4/6"></div>
        </div>
      ) : summary ? (
        <div className="prose prose-sm max-w-none prose-stone dark:prose-invert">
          <MarkdownContent content={summary} />
        </div>
      ) : (
        <p className="font-serif italic text-stone-600 dark:text-stone-400 text-sm">
          No market summary available
        </p>
      )}
    </NewspaperSection>
  );
}
