"use client";

import { useState } from "react";
import { useSentimentHeatmap, type HeatMapItem } from "@/lib/hooks/useSentiment";
import { RefreshCw } from "lucide-react";
import Link from "next/link";

interface CompactHeatmapProps {
  className?: string;
}

export function CompactHeatmap({ className = "" }: CompactHeatmapProps) {
  const [timeframe, setTimeframe] = useState<"1d" | "1w" | "1m">("1w");
  const { data, isLoading, error, refetch, isFetching } = useSentimentHeatmap(
    timeframe,
    15 * 60 * 1000
  );

  const heatmapData = data?.data || [];

  const getSentimentColor = (sentiment: number): string => {
    if (sentiment >= 0.3) return "bg-green-500";
    if (sentiment >= 0.1) return "bg-green-400/70";
    if (sentiment >= 0.02) return "bg-green-300/50";
    if (sentiment >= -0.02) return "bg-stone-400";
    if (sentiment >= -0.1) return "bg-red-300/50";
    if (sentiment >= -0.3) return "bg-red-400/70";
    return "bg-red-500";
  };

  const getSentimentTextColor = (sentiment: number): string => {
    if (Math.abs(sentiment) >= 0.1) return "text-white";
    return "text-stone-900 dark:text-stone-100";
  };

  return (
    <div className={`${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-serif font-bold text-sm uppercase tracking-wide text-stone-800 dark:text-stone-200">
          Sentiment Heatmap
        </h3>
        <div className="flex items-center gap-2">
          <div className="flex text-[10px]">
            {(["1d", "1w", "1m"] as const).map((tf) => (
              <button
                key={tf}
                onClick={() => setTimeframe(tf)}
                className={`px-2 py-1 transition-colors ${
                  timeframe === tf
                    ? "bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900"
                    : "bg-stone-200 dark:bg-stone-700 text-stone-600 dark:text-stone-400 hover:bg-stone-300 dark:hover:bg-stone-600"
                } ${tf === "1d" ? "rounded-l" : tf === "1m" ? "rounded-r" : ""}`}
              >
                {tf === "1d" ? "1D" : tf === "1w" ? "1W" : "1M"}
              </button>
            ))}
          </div>
          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="p-1 text-stone-500 hover:text-stone-800 dark:hover:text-stone-200 transition-colors disabled:opacity-50"
            title="Refresh"
          >
            <RefreshCw className={`w-3 h-3 ${isFetching ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* Heatmap Grid */}
      {isLoading ? (
        <div className="grid grid-cols-6 gap-1">
          {[...Array(18)].map((_, i) => (
            <div
              key={i}
              className="aspect-square animate-pulse bg-stone-200 dark:bg-stone-700 rounded-sm"
            />
          ))}
        </div>
      ) : error ? (
        <div className="text-center py-4">
          <p className="text-xs text-stone-500 italic font-serif">
            Failed to load sentiment data
          </p>
        </div>
      ) : heatmapData.length === 0 ? (
        <div className="text-center py-4">
          <p className="text-xs text-stone-500 italic font-serif">
            No sentiment data available
          </p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-6 gap-1">
            {heatmapData.slice(0, 18).map((item: HeatMapItem) => (
              <Link
                key={item.ticker}
                href={`/discover?symbol=${item.ticker}`}
                className={`aspect-square ${getSentimentColor(
                  item.sentiment
                )} rounded-sm flex flex-col items-center justify-center transition-transform hover:scale-105 hover:z-10 hover:shadow-lg cursor-pointer relative group`}
                title={`${item.ticker}: ${item.sentimentLabel} (${item.articleCount} articles)`}
              >
                <span
                  className={`font-mono font-bold text-[10px] ${getSentimentTextColor(
                    item.sentiment
                  )} drop-shadow-sm`}
                >
                  {item.ticker}
                </span>
                <span
                  className={`font-mono text-[8px] ${getSentimentTextColor(
                    item.sentiment
                  )} opacity-80`}
                >
                  {item.sentiment >= 0 ? "+" : ""}
                  {(item.sentiment * 100).toFixed(0)}%
                </span>
              </Link>
            ))}
          </div>

          {/* Legend */}
          <div className="flex items-center justify-between mt-3 text-[9px] text-stone-500 dark:text-stone-400">
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-red-500 rounded-sm" />
              <span>Bearish</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-stone-400 rounded-sm" />
              <span>Neutral</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-green-500 rounded-sm" />
              <span>Bullish</span>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
