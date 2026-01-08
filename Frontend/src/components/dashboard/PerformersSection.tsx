"use client";

import { useMemo } from "react";
import { NewspaperSection } from "@/components/cards/NewspaperSection";
import { ArrowUpRight } from "lucide-react";
import Link from "next/link";
import { useStocks } from "@/lib/hooks/useStocks";

interface StockWithRank {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  company?: string;
  rank: number;
}

export function PerformersSection() {
  // Fetch stocks with auto-refresh every 60 seconds
  const { data, isLoading, error } = useStocks({
    limit: 50,
    offset: 0,
    refetchInterval: 60000, // 60 seconds
  });

  // Sort by changePercent descending and take top 10
  const stocks: StockWithRank[] = useMemo(() => {
    const stocksList = data?.stocks || [];
    return stocksList
      .filter((stock) => stock.changePercent > 0)
      .sort((a, b) => b.changePercent - a.changePercent)
      .slice(0, 10)
      .map((stock, index) => ({
        ...stock,
        rank: index + 1,
      }));
  }, [data?.stocks]);

  const formatPrice = (price: number) => {
    return `$${price.toFixed(2)}`;
  };

  const formatChange = (change: number, changePercent: number) => {
    const sign = change >= 0 ? "+" : "";
    return `${sign}${change.toFixed(2)} (${sign}${changePercent.toFixed(2)}%)`;
  };

  return (
    <NewspaperSection title="Best Performers">
      {isLoading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="h-14 bg-stone-200 dark:bg-stone-700"></div>
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="text-center py-6 text-stone-500 dark:text-stone-400">
          <p className="font-serif text-sm text-stone-600 dark:text-stone-300">
            {error instanceof Error ? error.message : "Failed to load top performers"}
          </p>
          <button
            onClick={() => window.location.reload()}
            className="mt-3 text-xs uppercase tracking-widest text-black dark:text-stone-100 hover:underline"
          >
            Try again
          </button>
        </div>
      ) : stocks.length === 0 ? (
        <div className="text-center py-6 text-stone-500 dark:text-stone-400">
          <p className="font-serif italic text-sm text-stone-600 dark:text-stone-300">No top performers available</p>
        </div>
      ) : (
        <div className="space-y-3">
          {stocks.slice(0, 5).map((stock) => (
            <Link
              key={stock.symbol}
              href={`/discover?symbol=${stock.symbol}`}
              className="block p-3 border border-stone-200 dark:border-stone-700 hover:border-black dark:hover:border-stone-100 hover:bg-stone-50 dark:hover:bg-stone-800 transition-all group rounded-sm"
            >
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-serif font-bold text-sm text-black dark:text-stone-100">{stock.symbol}</span>
                    <span className="text-xs text-stone-500 dark:text-stone-400 bg-stone-100 dark:bg-stone-700 px-2 py-1 uppercase tracking-wide">
                      #{stock.rank}
                    </span>
                  </div>
                  {stock.company && (
                    <p className="text-xs text-stone-600 dark:text-stone-400 truncate font-serif italic">
                      {stock.company}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-3 ml-3">
                  <div className="text-right">
                    <div className="font-serif font-bold text-sm text-black dark:text-stone-100">
                      {formatPrice(stock.price)}
                    </div>
                    <div className="text-xs text-green-700 dark:text-green-400 font-bold flex items-center gap-1">
                      <ArrowUpRight className="w-3 h-3" />
                      {formatChange(stock.change, stock.changePercent)}
                    </div>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </NewspaperSection>
  );
}

