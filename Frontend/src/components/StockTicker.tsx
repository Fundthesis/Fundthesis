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
  const { data, isLoading: loading, error } = useStocks({
    limit: 30,
    offset: 0,
    refetchInterval: 60000, // 60 seconds
  });

  const stocks: StockData[] = data?.stocks || [];
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
    const errorMessage = error instanceof Error ? error.message : String(error);
    return (
      <div className="ticker-bg text-black py-0.5 overflow-hidden">
        <div className="text-center text-sm text-red-600">Failed to load stock data: {errorMessage}</div>
      </div>
    );
  }

  const StockItem = ({ stock }: { stock: StockData }) => (
    <div className="inline-flex items-center space-x-2 text-sm shrink-0">
      <span className="font-semibold">{stock.symbol}</span>
      <span>${formatNumber(stock.price)}</span>
      <span
        className={
          stock.change && stock.change >= 0
            ? "text-green-600"
            : "text-red-600"
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
    <div className="ticker-bg text-black py-0.5 overflow-hidden">
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
