"use client";

import React from "react";
import { useStocks } from "@/lib/hooks/useStocks";

interface StockData {
  symbol: string;
  price?: number;
  change?: number;
  changePercent?: number;
}

const formatNumber = (value?: number, decimals = 2) =>
  typeof value === "number" ? value.toFixed(decimals) : "-";

const StockTicker = () => {
  // Fetch stocks with auto-refresh every 60 seconds
  const {
    data,
    isLoading: loading,
    error,
  } = useStocks({
    limit: 30,
    offset: 0,
    refetchInterval: 60000, // 60 seconds
  });

  const stocks: StockData[] = data?.stocks || [];

  if (loading) {
    return (
      <div className="ticker-bg text-black dark:text-stone-100 py-0.5 overflow-hidden">
        <div className="text-center text-sm h-8"></div>
      </div>
    );
  }

  if (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return (
      <div className="ticker-bg text-black dark:text-stone-100 py-0.5 overflow-hidden">
        <div className="text-center text-sm text-red-600 dark:text-red-400"></div>
      </div>
    );
  }

  const StockItem = ({ stock }: { stock: StockData }) => (
    <div className="inline-flex items-center space-x-2 text-sm shrink-0">
      <span className="font-semibold">{stock.symbol}</span>
      <span>${formatNumber(stock.price)}</span>
      <span
        className={
          stock.change && stock.change >= 0 ? "text-green-600" : "text-red-600"
        }
      >
        {stock.change
          ? (stock.change >= 0 ? "+" : "") + formatNumber(stock.change)
          : "-"}
      </span>
      <span
        className={
          stock.changePercent && stock.changePercent >= 0
            ? "text-green-600"
            : "text-red-600"
        }
      >
        (
        {stock.changePercent
          ? (stock.changePercent >= 0 ? "+" : "") +
            formatNumber(stock.changePercent) +
            "%"
          : "-"}
        )
      </span>
    </div>
  );

  return (
    <div className="ticker-bg text-black dark:text-stone-100 py-0.5 overflow-hidden w-full">
      <div className="flex animate-ticker whitespace-nowrap">
        <div className="flex shrink-0 gap-8 pr-8">
          {stocks.map((stock) => (
            <StockItem key={stock.symbol} stock={stock} />
          ))}
        </div>
        <div className="flex shrink-0 gap-8 pr-8">
          {stocks.map((stock) => (
            <StockItem key={`dup-${stock.symbol}`} stock={stock} />
          ))}
        </div>
      </div>
    </div>
  );
};

export default StockTicker;
