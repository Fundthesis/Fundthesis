"use client";

import { useMemo } from "react";
import { TrendingUp, TrendingDown } from "lucide-react";
import Link from "next/link";
import { useStocks } from "@/lib/hooks/useStocks";

interface MarketMoversWidgetProps {
  type: "gainers" | "losers";
  limit?: number;
  className?: string;
}

export function MarketMoversWidget({
  type,
  limit = 5,
  className = "",
}: MarketMoversWidgetProps) {
  const { data, isLoading, error } = useStocks({
    limit: 50,
    offset: 0,
    refetchInterval: 60000,
  });

  const stocks = useMemo(() => {
    const list = data?.stocks || [];
    if (type === "gainers") {
      return list
        .filter((s) => s.changePercent > 0)
        .sort((a, b) => b.changePercent - a.changePercent)
        .slice(0, limit);
    } else {
      return list
        .filter((s) => s.changePercent < 0)
        .sort((a, b) => a.changePercent - b.changePercent)
        .slice(0, limit);
    }
  }, [data?.stocks, type, limit]);

  const title = type === "gainers" ? "Top Gainers" : "Top Losers";
  const Icon = type === "gainers" ? TrendingUp : TrendingDown;
  const accentColor = type === "gainers" ? "text-green-500" : "text-red-500";
  const bgAccent = type === "gainers" ? "bg-green-500/10" : "bg-red-500/10";

  if (isLoading) {
    return (
      <div className={`${className}`}>
        <div className="flex items-center gap-2 mb-3">
          <Icon className={`w-4 h-4 ${accentColor}`} />
          <h3 className="font-serif font-bold text-sm uppercase tracking-wide text-stone-800 dark:text-stone-200">
            {title}
          </h3>
        </div>
        <div className="space-y-2">
          {[...Array(limit)].map((_, i) => (
            <div key={i} className="h-10 bg-stone-200 dark:bg-stone-700 animate-pulse rounded" />
          ))}
        </div>
      </div>
    );
  }

  if (error || stocks.length === 0) {
    return (
      <div className={`${className}`}>
        <div className="flex items-center gap-2 mb-3">
          <Icon className={`w-4 h-4 ${accentColor}`} />
          <h3 className="font-serif font-bold text-sm uppercase tracking-wide text-stone-800 dark:text-stone-200">
            {title}
          </h3>
        </div>
        <p className="text-xs text-stone-500 dark:text-stone-400 italic font-serif">
          No data available
        </p>
      </div>
    );
  }

  return (
    <div className={`${className}`}>
      <div className="flex items-center gap-2 mb-3">
        <Icon className={`w-4 h-4 ${accentColor}`} />
        <h3 className="font-serif font-bold text-sm uppercase tracking-wide text-stone-800 dark:text-stone-200">
          {title}
        </h3>
      </div>
      <div className="space-y-1">
        {stocks.map((stock, index) => (
          <Link
            key={stock.symbol}
            href={`/discover?symbol=${stock.symbol}`}
            className={`flex items-center justify-between p-2 ${bgAccent} hover:bg-stone-100 dark:hover:bg-stone-700 transition-colors rounded-sm group`}
          >
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono text-stone-400 w-4">
                {index + 1}
              </span>
              <span className="font-mono font-bold text-sm text-stone-900 dark:text-stone-100 group-hover:underline">
                {stock.symbol}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <span className="font-mono text-xs text-stone-600 dark:text-stone-400">
                ${stock.price.toFixed(2)}
              </span>
              <span className={`font-mono text-xs font-bold ${accentColor}`}>
                {stock.changePercent >= 0 ? "+" : ""}
                {stock.changePercent.toFixed(2)}%
              </span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
