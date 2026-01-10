"use client";

import { useEffect, useState } from "react";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

interface TickerItem {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
}

interface TickerTapeProps {
  className?: string;
}

export function TickerTape({ className = "" }: TickerTapeProps) {
  const [stocks, setStocks] = useState<TickerItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStocks = async () => {
      try {
        const response = await fetch("/api/stocks?limit=30&offset=0");
        if (!response.ok) throw new Error("Failed to fetch");
        const data = await response.json();
        setStocks(data.stocks || []);
      } catch (err) {
        console.error("Ticker fetch error:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchStocks();
    const interval = setInterval(fetchStocks, 60000);
    return () => clearInterval(interval);
  }, []);

  if (loading || stocks.length === 0) {
    return (
      <div className={`bg-stone-900 dark:bg-black py-2 overflow-hidden ${className}`}>
        <div className="h-6 animate-pulse bg-stone-800" />
      </div>
    );
  }

  const doubledStocks = [...stocks, ...stocks];

  return (
    <div className={`bg-stone-900 dark:bg-black py-2 overflow-hidden border-y border-stone-700 ${className}`}>
      <div className="animate-marquee whitespace-nowrap inline-flex">
        {doubledStocks.map((stock, index) => (
          <div
            key={`${stock.symbol}-${index}`}
            className="inline-flex items-center mx-4 text-sm"
          >
            <span className="font-mono font-bold text-stone-100 mr-2">
              {stock.symbol}
            </span>
            <span className="font-mono text-stone-300 mr-2">
              ${stock.price.toFixed(2)}
            </span>
            <span
              className={`inline-flex items-center font-mono text-xs ${
                stock.change > 0
                  ? "text-green-400"
                  : stock.change < 0
                  ? "text-red-400"
                  : "text-stone-400"
              }`}
            >
              {stock.change > 0 ? (
                <TrendingUp className="w-3 h-3 mr-0.5" />
              ) : stock.change < 0 ? (
                <TrendingDown className="w-3 h-3 mr-0.5" />
              ) : (
                <Minus className="w-3 h-3 mr-0.5" />
              )}
              {stock.change >= 0 ? "+" : ""}
              {stock.changePercent.toFixed(2)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
