"use client";

import { useMemo } from "react";
import { useStocks } from "@/lib/hooks/useStocks";
import { Activity } from "lucide-react";

interface MarketOverviewWidgetProps {
  className?: string;
}

// Simulated market index data - in production this would come from an API
const MARKET_INDICES = [
  { symbol: "S&P 500", ticker: "SPY" },
  { symbol: "NASDAQ", ticker: "QQQ" },
  { symbol: "DOW", ticker: "DIA" },
];

export function MarketOverviewWidget({ className = "" }: MarketOverviewWidgetProps) {
  const { data, isLoading } = useStocks({
    symbols: MARKET_INDICES.map((i) => i.ticker).join(","),
    refetchInterval: 60000,
  });

  const indices = useMemo(() => {
    const stocks = data?.stocks || [];
    return MARKET_INDICES.map((index) => {
      const stock = stocks.find((s) => s.symbol === index.ticker);
      return {
        name: index.symbol,
        ticker: index.ticker,
        price: stock?.price || 0,
        change: stock?.change || 0,
        changePercent: stock?.changePercent || 0,
      };
    });
  }, [data?.stocks]);

  // Calculate overall market sentiment
  const marketSentiment = useMemo(() => {
    const avgChange = indices.reduce((sum, i) => sum + i.changePercent, 0) / indices.length;
    if (avgChange > 0.5) return { label: "Bullish", color: "text-green-500", bg: "bg-green-500/10" };
    if (avgChange < -0.5) return { label: "Bearish", color: "text-red-500", bg: "bg-red-500/10" };
    return { label: "Neutral", color: "text-stone-500", bg: "bg-stone-500/10" };
  }, [indices]);

  if (isLoading) {
    return (
      <div className={`${className}`}>
        <div className="flex items-center gap-2 mb-4">
          <Activity className="w-4 h-4 text-blue-500" />
          <h3 className="font-serif font-bold text-sm uppercase tracking-wide text-stone-800 dark:text-stone-200">
            Market Overview
          </h3>
        </div>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-12 bg-stone-200 dark:bg-stone-700 animate-pulse rounded" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={`${className}`}>
      {/* Header with sentiment indicator */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-blue-500" />
          <h3 className="font-serif font-bold text-sm uppercase tracking-wide text-stone-800 dark:text-stone-200">
            Market Overview
          </h3>
        </div>
        <div className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wide ${marketSentiment.bg} ${marketSentiment.color}`}>
          {marketSentiment.label}
        </div>
      </div>

      {/* Index Cards */}
      <div className="space-y-2">
        {indices.map((index) => (
          <div
            key={index.ticker}
            className="flex items-center justify-between p-3 bg-stone-50 dark:bg-stone-800 rounded border border-stone-200 dark:border-stone-700"
          >
            <div>
              <div className="font-serif font-bold text-sm text-stone-900 dark:text-stone-100">
                {index.name}
              </div>
              <div className="text-[10px] text-stone-500 font-mono">
                {index.ticker}
              </div>
            </div>
            <div className="text-right">
              <div className="font-mono font-bold text-sm text-stone-900 dark:text-stone-100">
                {index.price > 0 ? `$${index.price.toFixed(2)}` : "—"}
              </div>
              <div
                className={`font-mono text-xs ${
                  index.changePercent > 0
                    ? "text-green-500"
                    : index.changePercent < 0
                    ? "text-red-500"
                    : "text-stone-500"
                }`}
              >
                {index.changePercent >= 0 ? "+" : ""}
                {index.changePercent.toFixed(2)}%
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Market Hours Indicator */}
      <div className="mt-3 pt-3 border-t border-stone-200 dark:border-stone-700">
        <MarketHoursIndicator />
      </div>
    </div>
  );
}

function MarketHoursIndicator() {
  const now = new Date();
  const nyTime = new Date(now.toLocaleString("en-US", { timeZone: "America/New_York" }));
  const hours = nyTime.getHours();
  const minutes = nyTime.getMinutes();
  const day = nyTime.getDay();

  const isWeekend = day === 0 || day === 6;
  const isPreMarket = hours >= 4 && hours < 9.5;
  const isMarketOpen = hours >= 9.5 && hours < 16;
  const isAfterHours = hours >= 16 && hours < 20;

  let status = { label: "Closed", color: "bg-stone-400" };
  if (isWeekend) {
    status = { label: "Weekend", color: "bg-stone-400" };
  } else if (isMarketOpen || (hours === 9 && minutes >= 30)) {
    status = { label: "Market Open", color: "bg-green-500" };
  } else if (isPreMarket) {
    status = { label: "Pre-Market", color: "bg-amber-500" };
  } else if (isAfterHours) {
    status = { label: "After Hours", color: "bg-blue-500" };
  }

  return (
    <div className="flex items-center justify-between text-[10px]">
      <span className="text-stone-500 dark:text-stone-400">
        {nyTime.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true })} ET
      </span>
      <div className="flex items-center gap-1.5">
        <div className={`w-2 h-2 rounded-full ${status.color} animate-pulse`} />
        <span className="text-stone-600 dark:text-stone-300 font-medium">
          {status.label}
        </span>
      </div>
    </div>
  );
}
