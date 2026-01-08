"use client";

import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { TrendingUp, ArrowUpRight, ArrowDownRight } from "lucide-react";
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
    <Card>
      <CardHeader>
        <CardTitle className="text-xl font-bold flex items-center gap-2">
          <TrendingUp className="w-5 h-5" />
          Best Performers
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="h-16 bg-gray-200 rounded"></div>
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="text-center py-8 text-gray-500">
            <p>{error instanceof Error ? error.message : "Failed to load top performers"}</p>
            <button
              onClick={() => window.location.reload()}
              className="mt-2 text-[#9DB38A] hover:underline"
            >
              Try again
            </button>
          </div>
        ) : stocks.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            No top performers available
          </div>
        ) : (
          <div className="space-y-3">
            {stocks.map((stock) => (
              <Link
                key={stock.symbol}
                href={`/discover?symbol=${stock.symbol}`}
                className="block p-3 rounded-lg border border-gray-200 hover:border-[#9DB38A] hover:bg-gray-50 transition-all group"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-bold text-gray-900">{stock.symbol}</span>
                      <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                        #{stock.rank}
                      </span>
                    </div>
                    {stock.company && (
                      <p className="text-sm text-gray-600 truncate">{stock.company}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-4 ml-4">
                    <div className="text-right">
                      <div className="font-semibold text-gray-900">
                        {formatPrice(stock.price)}
                      </div>
                      <div className="text-sm text-green-600 font-medium flex items-center gap-1">
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
      </CardContent>
    </Card>
  );
}

