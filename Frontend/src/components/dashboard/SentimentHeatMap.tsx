"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { TrendingUp } from "lucide-react";
import {
  useSentimentHeatmap,
  type HeatMapItem,
} from "@/lib/hooks/useSentiment";

export function SentimentHeatMap() {
  const [timeframe, setTimeframe] = useState<"1d" | "1w" | "1m">("1d");

  // Fetch sentiment heatmap with auto-refresh every 15 minutes
  const { data, isLoading, error } = useSentimentHeatmap(
    timeframe,
    15 * 60 * 1000
  );

  const heatmapData = data?.data || [];

  const getSentimentColor = (sentiment: number): string => {
    // Map sentiment from -1 to 1 to color gradient
    // Red (negative) -> Gray (neutral) -> Green (positive)
    if (sentiment >= 0.1) {
      // Positive - green gradient
      const intensity = Math.min(sentiment, 1.0);
      const green = Math.floor(100 + intensity * 155);
      return `rgb(34, ${green}, 76)`;
    } else if (sentiment <= -0.1) {
      // Negative - red gradient
      const intensity = Math.min(Math.abs(sentiment), 1.0);
      const red = Math.floor(100 + intensity * 155);
      return `rgb(${red}, 34, 34)`;
    } else {
      // Neutral - gray
      return `rgb(128, 128, 128)`;
    }
  };

  const getBlockSize = (articleCount: number): string => {
    // Scale block size based on article count (min 40px, max 80px)
    const minSize = 40;
    const maxSize = 80;
    const maxArticles = Math.max(
      ...heatmapData.map((item: HeatMapItem) => item.articleCount),
      1
    );
    const ratio = articleCount / maxArticles;
    const size = minSize + (maxSize - minSize) * ratio;
    return `${size}px`;
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-xl font-bold flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            Market Sentiment Heat Map
          </CardTitle>
          <div className="flex gap-2">
            {(["1d", "1w", "1m"] as const).map((tf) => (
              <button
                key={tf}
                onClick={() => setTimeframe(tf)}
                className={`px-3 py-1 text-sm rounded-lg transition-colors ${
                  timeframe === tf
                    ? "bg-[#9DB38A] text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                {tf === "1d" ? "Today" : tf === "1w" ? "Week" : "Month"}
              </button>
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="grid grid-cols-8 gap-2">
            {[...Array(24)].map((_, i) => (
              <div
                key={i}
                className="animate-pulse bg-gray-200 rounded aspect-square"
              ></div>
            ))}
          </div>
        ) : error ? (
          <div className="text-center py-8 text-gray-500">
            <p>
              {error instanceof Error
                ? error.message
                : "Failed to load sentiment heatmap"}
            </p>
            <button
              onClick={() => window.location.reload()}
              className="mt-2 text-[#9DB38A] hover:underline"
            >
              Try again
            </button>
          </div>
        ) : heatmapData.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            No sentiment data available
          </div>
        ) : (
          <>
            <div className="grid grid-cols-8 gap-2 mb-4">
              {heatmapData.slice(0, 32).map((item: HeatMapItem) => (
                <div
                  key={item.ticker}
                  className="rounded-lg cursor-pointer hover:scale-105 transition-transform relative group"
                  style={{
                    backgroundColor: getSentimentColor(item.sentiment),
                    minHeight: getBlockSize(item.articleCount),
                    aspectRatio: "1",
                  }}
                  title={`${item.ticker}: ${item.sentimentLabel} (${item.articleCount} articles)`}
                >
                  <div className="absolute inset-0 flex items-center justify-center text-white font-semibold text-xs opacity-90">
                    {item.ticker}
                  </div>
                  <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 text-white text-[10px] px-1 py-0.5 rounded-b-lg opacity-0 group-hover:opacity-100 transition-opacity">
                    {item.sentimentLabel}
                  </div>
                </div>
              ))}
            </div>
            <div className="flex items-center justify-between text-xs text-gray-600 pt-4 border-t">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded bg-red-600"></div>
                  <span>Negative</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded bg-gray-500"></div>
                  <span>Neutral</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded bg-green-600"></div>
                  <span>Positive</span>
                </div>
              </div>
              <span className="text-gray-500">
                {heatmapData.length} companies
              </span>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
