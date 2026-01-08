"use client";

import { useState } from "react";
import { NewspaperSection } from "@/components/ui/NewspaperSection";
import {
  useSentimentHeatmap,
  type HeatMapItem,
} from "@/lib/hooks/useSentiment";

export function SentimentHeatMap() {
  const [timeframe, setTimeframe] = useState<"1d" | "1w" | "1m">("1m");

  // Fetch sentiment heatmap with auto-refresh every 15 minutes
  const { data, isLoading, error, refetch } = useSentimentHeatmap(
    timeframe,
    15 * 60 * 1000
  );

  const heatmapData = data?.data || [];
  
  // Calculate data freshness
  const dataAge = data?.timestamp 
    ? Math.floor((Date.now() - new Date(data.timestamp).getTime()) / (1000 * 60))
    : 0;

  const getSentimentColor = (sentiment: number): string => {
    // 7-level color gradient system based on sentiment score
    if (sentiment >= 0.5) {
      return "#22c55e"; // Green - Strong positive
    } else if (sentiment >= 0.2) {
      return "rgba(34, 197, 94, 0.6)"; // Medium positive
    } else if (sentiment >= 0.05) {
      return "rgba(34, 197, 94, 0.3)"; // Low positive
    } else if (sentiment >= -0.05) {
      return "#71717a"; // Gray - Neutral
    } else if (sentiment >= -0.2) {
      return "rgba(239, 68, 68, 0.3)"; // Low negative
    } else if (sentiment >= -0.5) {
      return "rgba(239, 68, 68, 0.6)"; // Medium negative
    } else {
      return "#ef4444"; // Red - Strong negative
    }
  };

  const getSentimentPercentage = (sentiment: number): string => {
    const percentage = (sentiment * 100).toFixed(1);
    return sentiment >= 0 ? `+${percentage}%` : `${percentage}%`;
  };

  const getBlockOpacity = (articleCount: number): number => {
    const maxArticles = Math.max(
      ...heatmapData.map((item: HeatMapItem) => item.articleCount),
      1
    );
    return 0.7 + (articleCount / maxArticles) * 0.3;
  };

  return (
    <NewspaperSection title="Market Sentiment Heat Map">
      <div className="flex items-center justify-between mb-4">
        <div className="flex gap-2">
          {(["1d", "1w", "1m"] as const).map((tf) => (
            <button
              key={tf}
              onClick={() => setTimeframe(tf)}
              className={`px-3 py-1.5 text-xs uppercase tracking-widest transition-colors border ${
                timeframe === tf
                  ? "bg-black dark:bg-stone-100 text-white dark:text-stone-900 border-black dark:border-stone-100"
                  : "bg-white dark:bg-stone-800 text-stone-700 dark:text-stone-300 border-stone-300 dark:border-stone-600 hover:border-black dark:hover:border-stone-100"
              }`}
            >
              {tf === "1d" ? "Today" : tf === "1w" ? "Week" : "Month"}
            </button>
          ))}
        </div>
        <button
          onClick={() => refetch()}
          className="text-xs px-2 py-1 border border-gray-300 dark:border-stone-600 hover:bg-gray-100 dark:hover:bg-stone-700 rounded transition-colors text-stone-700 dark:text-stone-300"
          title="Refresh data"
        >
          ↻ Refresh
        </button>
      </div>
      {dataAge > 120 && (
        <div className="text-xs text-amber-600 dark:text-amber-500 mb-2 flex items-center gap-1">
          <span>⚠️</span>
          <span>Data is {Math.floor(dataAge / 60)} hours old. Next update in progress.</span>
        </div>
      )}
      {isLoading ? (
        <div className="grid grid-cols-8 gap-1">
          {[...Array(24)].map((_, i) => (
            <div
              key={i}
              className="animate-pulse bg-stone-200 dark:bg-stone-700 rounded-sm"
              style={{ aspectRatio: "1.5" }}
            />
          ))}
        </div>
      ) : error ? (
        <div className="text-center py-6 text-stone-500 dark:text-stone-400">
          <p className="font-serif text-sm text-stone-600 dark:text-stone-300">
            {error instanceof Error
              ? error.message
              : "Failed to load sentiment heatmap"}
          </p>
          <button
            onClick={() => window.location.reload()}
            className="mt-3 text-xs uppercase tracking-widest text-black dark:text-stone-100 hover:underline"
          >
            Try again
          </button>
        </div>
      ) : heatmapData.length === 0 ? (
        <div className="text-center py-6 text-stone-500 dark:text-stone-400">
          <p className="font-serif italic text-sm text-stone-600 dark:text-stone-300">
            No sentiment data available
          </p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-8 gap-1 mb-4">
            {heatmapData.slice(0, 24).map((item: HeatMapItem) => (
              <div
                key={item.ticker}
                className="cursor-pointer transition-all relative group border border-stone-300 dark:border-stone-600 hover:border-black dark:hover:border-stone-100 hover:z-10 hover:shadow-md rounded-sm"
                style={{
                  backgroundColor: getSentimentColor(item.sentiment),
                  opacity: getBlockOpacity(item.articleCount),
                  aspectRatio: "1.5",
                }}
                title={`${item.ticker}: ${item.sentimentLabel} (${
                  item.articleCount
                } articles, ${getSentimentPercentage(item.sentiment)})`}
              >
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <div className="font-mono font-bold text-white text-xs leading-tight drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">
                    {item.ticker}
                  </div>
                  <div className="font-mono text-white text-[10px] mt-0.5 drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">
                    {getSentimentPercentage(item.sentiment)}
                  </div>
                </div>
                <div className="absolute bottom-0 left-0 right-0 bg-black/80 text-white text-[9px] px-1 py-0.5 opacity-0 group-hover:opacity-100 transition-opacity uppercase tracking-wide text-center truncate">
                  {item.sentimentLabel}
                </div>
              </div>
            ))}
          </div>
          <div className="flex items-center justify-between text-xs text-stone-600 dark:text-stone-400 pt-3 border-t border-stone-200 dark:border-stone-700 uppercase tracking-wide">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 bg-red-600" />
                <span>Loss</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 bg-stone-500" />
                <span>Neutral</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 bg-green-600" />
                <span>Gain</span>
              </div>
            </div>
            <span className="text-stone-500 dark:text-stone-400 font-semibold">
              {heatmapData.length} companies
            </span>
          </div>
        </>
      )}
    </NewspaperSection>
  );
}
