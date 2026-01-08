"use client";

import { NewspaperSection } from "@/components/cards/NewspaperSection";

export function WatchlistSection() {
  return (
    <NewspaperSection title="Watchlist">
      <div className="text-center py-12 text-stone-500 dark:text-stone-400">
        <p className="font-serif italic text-base text-stone-600 dark:text-stone-300">
          Watchlist coming soon
        </p>
        <p className="text-sm text-stone-500 dark:text-stone-400 mt-3">
          Add stocks to track their performance
        </p>
      </div>
    </NewspaperSection>
  );
}

