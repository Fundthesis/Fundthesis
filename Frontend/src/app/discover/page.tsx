"use client";

import {
  FormEvent,
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from "react";
import { Search, ChevronLeft, ChevronRight } from "lucide-react";
import { StockCard } from "@/components/stocks/StockCard";
import {
  TickerTape,
  MarketMoversWidget,
  CompactHeatmap,
  MarketOverviewWidget,
  NewsWidget,
} from "@/components/discover";

interface Stock {
  symbol: string;
  company: string;
  price: number;
  change: number;
  changePercent: number;
  forecastData?: StockDetailPoint[];
}

interface StockDetailPoint {
  date: string;
  price: number;
  type?: "historical" | "forecast";
}

interface StockDetail {
  symbol: string;
  company: string;
  price: number;
  change: number;
  changePercent: number;
  open: number;
  high: number;
  low: number;
  volume: number;
  avgVolume: number;
  fiftyTwoWeekHigh?: number;
  fiftyTwoWeekLow?: number;
  peRatio?: number;
  sector: string;
  industry: string;
  marketCap: number;
  chartData: StockDetailPoint[];
  forecastData?: StockDetailPoint[];
}

const getDaysForTimeframe = (tf: "day" | "month" | "year") => {
  switch (tf) {
    case "day":
      return 7;
    case "month":
      return 30;
    default:
      return 365;
  }
};

const DEFAULT_PAGE_SIZE = 20;

const toFiniteNumber = (value: unknown): number | null => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string" && value.trim().length > 0) {
    const parsed = Number(value);
    return Number.isNaN(parsed) ? null : parsed;
  }
  return null;
};

const normaliseSummaryForecast = (points: unknown): StockDetailPoint[] => {
  if (!Array.isArray(points)) return [];
  return points
    .map((entry) => {
      if (!entry || typeof entry !== "object") return null;
      const record = entry as Record<string, unknown>;
      const rawDate = record.date ?? record.Date;
      const rawPrice =
        record.price ?? record.Price ?? record.value ?? record.Predicted_Close ?? record.prediction;
      if (typeof rawDate !== "string" || rawDate.trim().length === 0) return null;
      const parsedDate = new Date(rawDate);
      if (Number.isNaN(parsedDate.getTime())) return null;
      let price: number | null = null;
      if (typeof rawPrice === "number") price = rawPrice;
      else if (typeof rawPrice === "string" && rawPrice.trim().length > 0) {
        const parsed = Number(rawPrice);
        price = Number.isNaN(parsed) ? null : parsed;
      }
      if (price === null) return null;
      return { date: parsedDate.toISOString().split("T")[0], price } satisfies StockDetailPoint;
    })
    .filter((point): point is StockDetailPoint => point !== null);
};

const mapApiStockSummary = (stock: unknown): Stock | null => {
  if (!stock || typeof stock !== "object") return null;
  const record = stock as Record<string, unknown>;
  const symbol =
    typeof record.symbol === "string" && record.symbol.trim().length > 0
      ? record.symbol.trim().toUpperCase()
      : null;
  const price = toFiniteNumber(record.price);
  const change = toFiniteNumber(record.change);
  const changePercent = toFiniteNumber(record.changePercent);
  if (!symbol || price === null || change === null || changePercent === null) return null;
  const forecastPoints = normaliseSummaryForecast(record.forecastData);
  return {
    symbol,
    company:
      typeof record.company === "string" && record.company.trim().length > 0
        ? record.company
        : `${symbol} Inc.`,
    price,
    change,
    changePercent,
    forecastData: forecastPoints,
  };
};

const createPlaceholderDetail = (stock: Stock, forecastPoints: StockDetailPoint[] = []): StockDetail => ({
  symbol: stock.symbol,
  company: stock.company,
  price: stock.price,
  change: stock.change,
  changePercent: stock.changePercent,
  open: stock.price,
  high: stock.price,
  low: stock.price,
  volume: 0,
  avgVolume: 0,
  fiftyTwoWeekHigh: undefined,
  fiftyTwoWeekLow: undefined,
  peRatio: undefined,
  sector: "—",
  industry: "—",
  marketCap: 0,
  chartData: [],
  forecastData: forecastPoints,
});

function DiscoverPage() {
  const [stocks, setStocks] = useState<Stock[]>([]);
  const [stockDetails, setStockDetails] = useState<{ [key: string]: StockDetail }>({});
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [timeframe, setTimeframe] = useState<"day" | "month" | "year">("month");
  const [searchQuery, setSearchQuery] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [searchFeedback, setSearchFeedback] = useState<string | null>(null);
  const defaultOffsetRef = useRef(0);
  const timeframeRef = useRef<"day" | "month" | "year">(timeframe);

  useEffect(() => {
    timeframeRef.current = timeframe;
  }, [timeframe]);

  const applyForecastToDetails = useCallback(
    (incomingStocks: Stock[], { reset = false }: { reset?: boolean } = {}) => {
      const entries = incomingStocks.filter(
        (stock) => Array.isArray(stock.forecastData) && stock.forecastData.length > 0
      );
      if (reset && entries.length === 0) {
        setStockDetails({});
        return;
      }
      if (entries.length === 0) return;
      setStockDetails((prev) => {
        const next = reset ? {} : { ...prev };
        entries.forEach((stock) => {
          const forecastPoints = stock.forecastData ?? [];
          const existing = reset ? undefined : next[stock.symbol];
          if (existing) {
            next[stock.symbol] = { ...existing, price: stock.price, change: stock.change, changePercent: stock.changePercent, forecastData: forecastPoints };
          } else {
            next[stock.symbol] = createPlaceholderDetail(stock, forecastPoints);
          }
        });
        return next;
      });
    },
    []
  );

  const filteredStocks = useMemo(() => {
    return stocks.filter((stock) => {
      if (!searchQuery) return true;
      const query = searchQuery.toLowerCase();
      return stock.symbol.toLowerCase().includes(query) || stock.company.toLowerCase().includes(query);
    });
  }, [stocks, searchQuery]);

  useEffect(() => {
    if (currentIndex >= filteredStocks.length && filteredStocks.length > 0) {
      setCurrentIndex(filteredStocks.length - 1);
    } else if (filteredStocks.length === 0) {
      setCurrentIndex(0);
    }
  }, [searchQuery, filteredStocks.length, currentIndex]);

  const fetchStockDetailData = useCallback(async (symbol: string, tf: "day" | "month" | "year") => {
    const normalisedSymbol = symbol.trim().toUpperCase();
    const days = getDaysForTimeframe(tf);
    const res = await fetch(`/api/stock/${encodeURIComponent(normalisedSymbol)}?days=${days}`, {
      method: "GET",
      credentials: "include",
    });
    if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
    const data: StockDetail = await res.json();
    const historical = (data.chartData ?? []).map((d) => ({ ...d, type: "historical" as const }));
    const forecast = (data.forecastData ?? []).map((d) => ({ ...d, type: "forecast" as const }));
    return { ...data, symbol: normalisedSymbol, chartData: historical, forecastData: forecast } satisfies StockDetail;
  }, []);

  const fetchStockDetail = useCallback(
    async (symbol: string, tf: "day" | "month" | "year") => {
      try {
        const detail = await fetchStockDetailData(symbol, tf);
        setStockDetails((prev) => ({ ...prev, [detail.symbol]: detail }));
        return detail;
      } catch (err) {
        console.error(`❌ Error fetching ${symbol}:`, err);
        return null;
      }
    },
    [fetchStockDetailData]
  );

  useEffect(() => {
    const currentSymbol = stocks[currentIndex]?.symbol;
    if (currentSymbol && !stockDetails[currentSymbol]) {
      void fetchStockDetail(currentSymbol, timeframe);
    }
  }, [currentIndex, stocks, stockDetails, fetchStockDetail, timeframe]);

  useEffect(() => {
    const currentSymbol = stocks[currentIndex]?.symbol;
    if (currentSymbol) {
      void fetchStockDetail(currentSymbol, timeframe);
    }
  }, [timeframe, stocks, currentIndex, fetchStockDetail]);

  const fetchDefaultStocks = useCallback(
    async ({ reset = false, mode = "more" as const }: { reset?: boolean; mode?: "initial" | "more" } = {}) => {
      const showInitialLoading = mode === "initial";
      const offset = reset ? 0 : defaultOffsetRef.current;
      if (reset) defaultOffsetRef.current = 0;
      try {
        if (showInitialLoading) setLoading(true);
        else setLoadingMore(true);
        const res = await fetch(`/api/stocks?limit=${DEFAULT_PAGE_SIZE}&offset=${offset}`, { method: "GET", credentials: "include" });
        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
        const data = await res.json();
        const mapped: Stock[] = Array.isArray(data.stocks)
          ? data.stocks.map((stock: unknown) => mapApiStockSummary(stock)).filter((stock: Stock | null): stock is Stock => stock !== null)
          : [];
        defaultOffsetRef.current = offset + mapped.length;
        setHasMore(Boolean(data.hasMore));
        setStocks((prev) => {
          const base = reset ? [] : prev;
          const existingSymbols = new Set(base.map((stock) => stock.symbol));
          const newStocks = mapped.filter((stock) => !existingSymbols.has(stock.symbol));
          return reset ? newStocks : [...base, ...newStocks];
        });
        applyForecastToDetails(mapped, { reset });
        setError(null);
      } catch (err) {
        console.error("❌ Error fetching stocks:", err);
        if (reset) setStocks([]);
        setError("Unable to fetch stock data. Please try again later.");
      } finally {
        if (showInitialLoading) setLoading(false);
        else setLoadingMore(false);
      }
    },
    [applyForecastToDetails]
  );

  const checkAndLoadMore = (idx: number) => {
    if (!loadingMore && hasMore && idx >= stocks.length - 5) {
      void fetchDefaultStocks();
    }
  };

  const handleSearchSubmit = useCallback(
    async (event?: FormEvent<HTMLFormElement>) => {
      event?.preventDefault();
      const rawQuery = searchQuery.trim();
      if (rawQuery.length === 0) {
        setSearchFeedback("Enter a stock symbol to search.");
        return;
      }
      const symbol = rawQuery.toUpperCase();
      setSearchFeedback(null);
      const existingIndex = stocks.findIndex((stock) => stock.symbol.toUpperCase() === symbol);
      if (existingIndex >= 0) {
        setCurrentIndex(existingIndex);
        if (!stockDetails[symbol]) await fetchStockDetail(symbol, timeframe);
        return;
      }
      setIsSearching(true);
      try {
        const detail = await fetchStockDetailData(symbol, timeframe);
        setStockDetails((prev) => ({ ...prev, [detail.symbol]: detail }));
        setStocks((prev) => {
          const summary: Stock = {
            symbol: detail.symbol,
            company: detail.company,
            price: detail.price,
            change: detail.change,
            changePercent: detail.changePercent,
            forecastData: detail.forecastData ?? [],
          };
          const filtered = prev.filter((stock) => stock.symbol.toUpperCase() !== detail.symbol.toUpperCase());
          return [summary, ...filtered];
        });
        setCurrentIndex(0);
      } catch (err) {
        console.error("❌ Search error:", err);
        setSearchFeedback("We couldn't load that symbol right now. Try a different one.");
      } finally {
        setIsSearching(false);
      }
    },
    [fetchStockDetail, fetchStockDetailData, searchQuery, stocks, stockDetails, timeframe]
  );

  const loadInitialStocks = useCallback(async () => {
    let loadedFromUserPortfolio = false;
    try {
      setLoading(true);
      const portfolioResponse = await fetch("/api/dashboard/portfolio", { method: "GET", credentials: "include" });
      if (portfolioResponse.ok) {
        const payload = await portfolioResponse.json();
        const userTickers = Array.isArray(payload.tickers)
          ? Array.from(new Set(payload.tickers.map((ticker: unknown) => (typeof ticker === "string" ? ticker.trim().toUpperCase() : "")).filter((ticker: string) => ticker.length > 0)))
          : [];
        if (userTickers.length > 0) {
          const symbolsParam = (userTickers as string[]).join(",");
          const stocksResponse = await fetch(`/api/stocks?symbols=${symbolsParam}`, { method: "GET", credentials: "include" });
          if (stocksResponse.ok) {
            const data = await stocksResponse.json();
            const mapped: Stock[] = Array.isArray(data.stocks)
              ? data.stocks.map((stock: unknown) => mapApiStockSummary(stock)).filter((stock: Stock | null): stock is Stock => stock !== null)
              : [];
            setStocks(mapped);
            applyForecastToDetails(mapped, { reset: true });
            setHasMore(Boolean(data.hasMore));
            defaultOffsetRef.current = 0;
            setError(null);
            loadedFromUserPortfolio = true;
            if (mapped.length > 0) await fetchStockDetail(mapped[0].symbol, timeframeRef.current);
          }
        }
      }
    } catch (err) {
      console.error("❌ Error loading portfolio stocks:", err);
    } finally {
      if (loadedFromUserPortfolio) setLoading(false);
    }
    if (!loadedFromUserPortfolio) await fetchDefaultStocks({ reset: true, mode: "initial" });
  }, [applyForecastToDetails, fetchDefaultStocks, fetchStockDetail]);

  useEffect(() => {
    loadInitialStocks();
  }, [loadInitialStocks]);

  const clearSearch = () => {
    setSearchQuery("");
    setCurrentIndex(0);
    setSearchFeedback(null);
  };

  const goToPrevious = () => {
    const newIndex = (currentIndex - 1 + filteredStocks.length) % filteredStocks.length;
    setCurrentIndex(newIndex);
    checkAndLoadMore(newIndex);
  };

  const goToNext = () => {
    const newIndex = (currentIndex + 1) % filteredStocks.length;
    setCurrentIndex(newIndex);
    checkAndLoadMore(newIndex);
  };

  const safeCurrentIndex = Math.min(currentIndex, Math.max(0, filteredStocks.length - 1));
  const currentStock = filteredStocks[safeCurrentIndex];
  const currentSymbol = currentStock?.symbol;
  const stockDetail = currentSymbol ? stockDetails[currentSymbol] : undefined;
  const chartData = stockDetail
    ? [
        ...(stockDetail.chartData?.map((d) => ({ ...d, type: "historical" as const })) || []),
        ...(stockDetail.forecastData?.map((d) => ({ ...d, type: "forecast" as const })) || []),
      ]
    : [];

  // Loading State
  if (loading) {
    return (
      <div className="min-h-screen bg-stone-50 dark:bg-stone-950">
        {/* Ticker Tape Skeleton */}
        <div className="bg-stone-900 dark:bg-black py-2 h-10 animate-pulse" />
        
        {/* Header */}
        <header className="max-w-[1600px] mx-auto px-4 pt-6 pb-4 border-b-4 border-double border-black dark:border-stone-600">
          <div className="text-center">
            <p className="text-[10px] tracking-[0.3em] text-stone-500 dark:text-stone-400 uppercase mb-1">
              {new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
            </p>
            <h1 className="font-serif text-5xl md:text-6xl font-black tracking-tight text-black dark:text-stone-100">
              Market Terminal
            </h1>
            <p className="font-serif italic text-stone-600 dark:text-stone-400 mt-1">
              &ldquo;Real-time Intelligence & Analysis&rdquo;
            </p>
          </div>
        </header>

        {/* Loading Content */}
        <main className="max-w-[1600px] mx-auto px-4 py-8">
          <div className="flex flex-col items-center justify-center py-20">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-black dark:border-stone-500 mb-4" />
            <p className="font-serif text-xl font-bold text-black dark:text-stone-100 mb-2 tracking-wide uppercase">
              Initializing Terminal...
            </p>
            <p className="text-sm text-stone-500 dark:text-stone-400 italic font-serif">
              Connecting to market data feeds
            </p>
          </div>
        </main>
      </div>
    );
  }

  // Error State
  if (error && stocks.length === 0) {
    return (
      <div className="min-h-screen bg-stone-50 dark:bg-stone-950">
        <header className="max-w-[1600px] mx-auto px-4 pt-6 pb-4 border-b-4 border-double border-black dark:border-stone-600">
          <div className="text-center">
            <h1 className="font-serif text-5xl font-black tracking-tight text-black dark:text-stone-100">
              Market Terminal
            </h1>
          </div>
        </header>
        <main className="max-w-[1600px] mx-auto px-4 py-8">
          <div className="flex flex-col items-center justify-center py-20">
            <p className="text-xl font-serif font-medium text-red-600 dark:text-red-400 mb-2">Connection Error</p>
            <p className="text-sm text-stone-600 dark:text-stone-400 mb-4">{error}</p>
            <button
              onClick={() => { setError(null); setLoading(true); void loadInitialStocks(); }}
              className="px-6 py-2 bg-black dark:bg-stone-100 text-white dark:text-stone-900 font-serif font-bold hover:bg-stone-800 dark:hover:bg-stone-200 transition-colors"
            >
              Retry Connection
            </button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-50 dark:bg-stone-950">
      {/* Live Ticker Tape */}
      <TickerTape />

      {/* Masthead Header */}
      <header className="max-w-[1600px] mx-auto px-4 pt-6 pb-4 border-b-4 border-double border-black dark:border-stone-600">
        <div className="flex items-end justify-between">
          <div>
            <p className="text-[10px] tracking-[0.3em] text-stone-500 dark:text-stone-400 uppercase mb-1">
              {new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
            </p>
            <h1 className="font-serif text-4xl md:text-5xl font-black tracking-tight text-black dark:text-stone-100">
              Market Terminal
            </h1>
          </div>
          <div className="hidden md:block text-right">
            <p className="font-serif italic text-sm text-stone-500 dark:text-stone-400">Real-time Intelligence</p>
            <p className="font-bold text-xs uppercase tracking-widest mt-1 text-black dark:text-stone-300">
              Section: Discover
            </p>
          </div>
        </div>
      </header>

      {/* Main Content - Bloomberg Terminal Layout */}
      <main className="max-w-[1600px] mx-auto px-4 py-6">
        <div className="grid grid-cols-12 gap-4">
          
          {/* Left Sidebar - Market Data Widgets */}
          <aside className="col-span-12 lg:col-span-3 space-y-4">
            {/* Market Overview */}
            <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 p-4 shadow-sm">
              <MarketOverviewWidget />
            </div>

            {/* Top Gainers */}
            <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 p-4 shadow-sm">
              <MarketMoversWidget type="gainers" limit={5} />
            </div>

            {/* Top Losers */}
            <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 p-4 shadow-sm">
              <MarketMoversWidget type="losers" limit={5} />
            </div>
          </aside>

          {/* Center - Main Stock Card Focus Area */}
          <section className="col-span-12 lg:col-span-6">
            {/* Search Bar */}
            <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 p-4 mb-4 shadow-sm">
              <form className="flex items-center gap-2" onSubmit={handleSearchSubmit}>
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-stone-400 w-4 h-4" />
                  <input
                    type="text"
                    placeholder="Search symbol or company..."
                    value={searchQuery}
                    onChange={(e) => { if (searchFeedback) setSearchFeedback(null); setSearchQuery(e.target.value); }}
                    className="w-full pl-9 pr-4 py-2.5 border border-stone-200 dark:border-stone-600 bg-stone-50 dark:bg-stone-800 text-black dark:text-stone-100 font-mono text-sm focus:outline-none focus:border-black dark:focus:border-stone-400 placeholder:text-stone-400"
                    disabled={isSearching}
                  />
                </div>
                <button
                  type="submit"
                  className="px-4 py-2.5 bg-black dark:bg-stone-100 text-white dark:text-stone-900 font-mono text-sm font-bold hover:bg-stone-800 dark:hover:bg-stone-200 transition-colors disabled:opacity-50"
                  disabled={isSearching}
                >
                  {isSearching ? "..." : "GO"}
                </button>
              </form>
              {searchFeedback && (
                <p className="text-xs text-red-600 dark:text-red-400 mt-2 font-serif italic">{searchFeedback}</p>
              )}
            </div>

            {/* Stock Card Display */}
            {filteredStocks.length > 0 ? (
              <div className="relative">
                {/* Navigation */}
                <div className="flex items-center justify-between mb-3">
                  <button
                    onClick={goToPrevious}
                    className="flex items-center gap-1 px-3 py-1.5 text-xs font-mono text-stone-600 dark:text-stone-400 hover:text-black dark:hover:text-stone-100 transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    PREV
                  </button>
                  <div className="text-center">
                    <span className="font-mono text-xs text-stone-500 dark:text-stone-400">
                      {safeCurrentIndex + 1} / {filteredStocks.length}
                    </span>
                  </div>
                  <button
                    onClick={goToNext}
                    className="flex items-center gap-1 px-3 py-1.5 text-xs font-mono text-stone-600 dark:text-stone-400 hover:text-black dark:hover:text-stone-100 transition-colors"
                  >
                    NEXT
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>

                {/* Stock Card */}
                <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 shadow-sm">
                  {currentStock && (
                    <StockCard
                      stock={currentStock}
                      detail={stockDetail}
                      isActive={true}
                      timeframe={timeframe}
                      setTimeframe={(tf) => { if (tf !== "all") setTimeframe(tf); }}
                      onClick={() => {}}
                      chartData={chartData}
                    />
                  )}
                </div>

                {/* Pagination Dots */}
                <div className="flex justify-center gap-1.5 mt-4">
                  {filteredStocks.slice(0, 10).map((_, index) => (
                    <button
                      key={index}
                      onClick={() => { setCurrentIndex(index); checkAndLoadMore(index); }}
                      className={`w-2 h-2 rounded-full transition-all ${
                        index === safeCurrentIndex
                          ? "bg-black dark:bg-stone-100 w-4"
                          : "bg-stone-300 dark:bg-stone-600 hover:bg-stone-400 dark:hover:bg-stone-500"
                      }`}
                    />
                  ))}
                  {filteredStocks.length > 10 && (
                    <span className="text-[10px] text-stone-400 ml-1">+{filteredStocks.length - 10}</span>
                  )}
                </div>
              </div>
            ) : (
              <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 p-8 text-center">
                <Search className="w-12 h-12 text-stone-300 dark:text-stone-600 mx-auto mb-4" />
                <p className="font-serif text-lg text-black dark:text-stone-100 mb-2">No stocks found</p>
                <p className="text-sm text-stone-500 dark:text-stone-400 italic font-serif mb-4">
                  Try searching for a different symbol
                </p>
                <button
                  onClick={clearSearch}
                  className="px-4 py-2 bg-black dark:bg-stone-100 text-white dark:text-stone-900 font-mono text-sm hover:bg-stone-800 dark:hover:bg-stone-200 transition-colors"
                >
                  Clear Search
                </button>
              </div>
            )}
          </section>

          {/* Right Sidebar - Sentiment & News */}
          <aside className="col-span-12 lg:col-span-3 space-y-4">
            {/* Sentiment Heatmap */}
            <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 p-4 shadow-sm">
              <CompactHeatmap />
            </div>

            {/* Latest News */}
            <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 p-4 shadow-sm">
              <NewsWidget limit={6} />
            </div>
          </aside>
        </div>
      </main>

      {/* Footer */}
      <footer className="max-w-[1600px] mx-auto px-4 py-4 border-t border-stone-200 dark:border-stone-700">
        <div className="flex items-center justify-between text-[10px] text-stone-500 dark:text-stone-400 font-mono">
          <span>Data refreshes automatically</span>
          <span>Market data may be delayed</span>
        </div>
      </footer>
    </div>
  );
}

export default DiscoverPage;
