"use client";

import React, { useState, useEffect } from "react";

interface StockData {
  symbol: string;
  price?: number;
  change?: number;
  changePercent?: number;
}

const formatNumber = (value?: number, decimals = 2) =>
  typeof value === "number" ? value.toFixed(decimals) : "-";

interface StockTickerProps {
  symbols?: string[];
  isStatic?: boolean;
}

const StockTicker: React.FC<StockTickerProps> = ({ symbols = [], isStatic = false }) => {
  const [stocks, setStocks] = useState<StockData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const fetchStocks = async () => {
      try {
        const query = symbols.length > 0
          ? `?symbols=${symbols.join(',')}`
          : `?limit=30&offset=0`;

        const response = await fetch(`/api/stocks${query}`);
        if (!response.ok) throw new Error(`HTTP error: ${response.status}`);
        const data = await response.json();
        if (!isMounted) return;

        const stocksArray: StockData[] = data.stocks || data;
        setStocks(stocksArray);
        setLoading(false);
        setError(null);
      } catch (err) {
        if (!isMounted) return;
        const message = err instanceof Error ? err.message : String(err);
        // Silently fail for ticker to avoid ugliness in header, or just log
        console.error(`Failed to load stock data: ${message}`);
        setLoading(false);
      }
    };

    fetchStocks();
    const interval = setInterval(fetchStocks, 60000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [symbols]);

  if (loading) {
    return (
      <div className={`ticker-bg text-black py-0.5 overflow-hidden ${isStatic ? 'flex justify-center' : ''}`}>
        <div className={`text-center ${isStatic ? 'text-xs' : 'text-sm'} h-8`}></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`ticker-bg text-black py-0.5 overflow-hidden ${isStatic ? 'flex justify-center' : ''}`}>
        <div className={`text-center ${isStatic ? 'text-xs' : 'text-sm'} text-red-600`}></div>
      </div>
    );
  }

  return (
    <div className={`ticker-bg text-black py-0.5 overflow-hidden ${isStatic ? 'flex justify-center items-center w-full h-full' : ''}`}>
      <div className={isStatic ? "flex justify-evenly w-full items-center px-4" : "animate-marquee-fast whitespace-nowrap"}>
        <div className={isStatic ? "contents" : "inline-flex space-x-8"}>
          {(isStatic ? stocks : stocks.concat(stocks)).map((stock, index) => {
            const displaySymbol = stock.symbol === 'GLD' ? 'GOLD' : stock.symbol === 'USO' ? 'OIL' : stock.symbol;
            return (
              <div
                key={`${stock.symbol}-${index}`}
                className={`inline-flex items-center space-x-2 ${isStatic ? 'text-xs' : 'text-sm'}`}
              >
                <span className="font-bold">{displaySymbol}</span>
                <span>${formatNumber(stock.price)}</span>
                <span
                  className={
                    stock.change && stock.change >= 0
                      ? "text-green-600 font-bold"
                      : "text-red-600 font-bold"
                  }
                >
                  {stock.changePercent
                    ? (stock.changePercent >= 0 ? "+" : "") +
                    formatNumber(stock.changePercent) +
                    "%"
                    : "-"}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default StockTicker;
