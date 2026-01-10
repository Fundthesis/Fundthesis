"use client";

import { useState, useCallback, useMemo, useRef, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useStocks, type Stock } from "@/lib/hooks/useStocks";
import { useArticles } from "@/lib/hooks/useArticles";
import {
  useSandbox,
  useUpdateSandbox,
  useExecuteTrade,
} from "@/lib/hooks/useSandboxes";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableCell,
  TableHead,
} from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Search,
  Plus,
  X,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Newspaper,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { StockRoulette } from "./StockRoulette";
import { ReturnsGraph } from "./ReturnsGraph";

const POPULAR_STOCKS = [
  "SPY",
  "QQQ",
  "VTI",
  "AAPL",
  "MSFT",
  "GOOGL",
  "AMZN",
  "NVDA",
  "META",
  "TSLA",
];

interface SimpleStockSimulatorProps {
  sandboxId: string | null;
  initialBalance: number;
  sandboxName?: string;
  onDeleteSandbox?: () => void;
}

export function SimpleStockSimulator({
  sandboxId,
  initialBalance,
  sandboxName,
  onDeleteSandbox,
}: SimpleStockSimulatorProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [tradeQuantities, setTradeQuantities] = useState<
    Record<string, string>
  >({});
  const [selectedNewsTab, setSelectedNewsTab] = useState("watchlist");
  const [collapsedSectors, setCollapsedSectors] = useState<Set<string>>(
    new Set()
  );
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [showSearchResults, setShowSearchResults] = useState(false);

  // Load sandbox from API
  const { data: sandbox, isLoading: isLoadingSandbox } = useSandbox(sandboxId);
  const updateSandbox = useUpdateSandbox();
  const executeTrade = useExecuteTrade();

  // Use TanStack Query for stock search with debouncing
  const { data: stocksData, isLoading: isSearching } = useStocks({
    search: searchQuery || undefined,
    limit: 20,
    refetchInterval: searchQuery ? undefined : 30000,
  });

  // Extract data from sandbox
  const watchedStocks = useMemo(() => {
    return sandbox?.settings?.watchedStocks || [];
  }, [sandbox]);

  const cashBalance = useMemo(() => {
    return parseFloat(
      sandbox?.balance?.toString() || initialBalance.toString()
    );
  }, [sandbox, initialBalance]);

  const holdings = useMemo(() => {
    const holdingsMap: Record<
      string,
      { symbol: string; quantity: number; avgPrice: number }
    > = {};
    sandbox?.positions?.forEach((pos) => {
      holdingsMap[pos.ticker] = {
        symbol: pos.ticker,
        quantity: parseFloat(pos.quantity.toString()),
        avgPrice: parseFloat(pos.avgPrice.toString()),
      };
    });
    return holdingsMap;
  }, [sandbox]);

  const transactions = useMemo(() => {
    return (
      sandbox?.trades?.map((trade) => ({
        id: trade.id,
        date: trade.executedAt
          ? new Date(trade.executedAt).toLocaleString()
          : new Date().toLocaleString(),
        symbol: trade.ticker,
        action: (trade.side === "buy" ? "Buy" : "Sell") as "Buy" | "Sell",
        quantity: parseFloat(trade.quantity.toString()),
        price: parseFloat(trade.price.toString()),
        total:
          parseFloat(trade.quantity.toString()) *
          parseFloat(trade.price.toString()),
      })) || []
    );
  }, [sandbox]);

  // Fetch stock details for watched stocks - we'll fetch them in WatchedStockRow component
  // For sector grouping, we'll use a separate query
  const watchedStocksString = watchedStocks.join(",");
  const { data: stocksMetadata } = useQuery({
    queryKey: ["stocks", "metadata", watchedStocksString],
    queryFn: async () => {
      if (watchedStocks.length === 0) return {};
      const response = await fetch(
        `/api/stocks?symbols=${watchedStocksString}`
      );
      if (!response.ok) throw new Error("Failed to fetch stocks metadata");
      const data = await response.json();
      const metadata: Record<
        string,
        { sector?: string; industry?: string; price?: number }
      > = {};
      data.stocks?.forEach((stock: Stock) => {
        metadata[stock.symbol] = {
          sector: stock.sector,
          industry: stock.industry,
          price: stock.price,
        };
      });
      return metadata;
    },
    enabled: watchedStocks.length > 0,
    refetchInterval: 30000,
  });

  // Group watched stocks by sector
  const stocksBySector = useMemo(() => {
    const grouped: Record<string, string[]> = {};
    watchedStocks.forEach((symbol) => {
      const sector = stocksMetadata?.[symbol]?.sector || "Other";
      if (!grouped[sector]) {
        grouped[sector] = [];
      }
      grouped[sector].push(symbol);
    });
    return grouped;
  }, [watchedStocks, stocksMetadata]);

  // Get current prices for returns graph
  const currentPrices = useMemo(() => {
    const prices: Record<string, number> = {};
    watchedStocks.forEach((symbol) => {
      if (stocksMetadata?.[symbol]?.price) {
        prices[symbol] = stocksMetadata[symbol].price!;
      }
    });
    return prices;
  }, [watchedStocks, stocksMetadata]);

  // Search results
  const searchResults = useMemo(() => {
    return stocksData?.stocks || [];
  }, [stocksData]);

  // News for watched stocks
  const watchlistNews = useArticles({
    tickers: watchedStocks.length > 0 ? watchedStocks.join(",") : undefined,
    limit: 10,
    refetchInterval: 60000, // 1 minute
  });

  // General market news
  const generalNews = useArticles({
    limit: 10,
    refetchInterval: 60000, // 1 minute
  });

  // Add stock to watchlist
  const addToWatchlist = useCallback(
    async (symbol: string) => {
      if (!sandboxId || watchedStocks.includes(symbol)) return;

      const newWatchedStocks = [...watchedStocks, symbol];
      try {
        await updateSandbox.mutateAsync({
          id: sandboxId,
          watchedStocks: newWatchedStocks,
        });
        setSearchQuery("");
        setShowSearchResults(false);
      } catch (error) {
        console.error("Failed to add to watchlist:", error);
        alert("Failed to add stock to watchlist");
      }
    },
    [sandboxId, watchedStocks, updateSandbox]
  );

  // Remove stock from watchlist
  const removeFromWatchlist = useCallback(
    async (symbol: string) => {
      if (!sandboxId) return;

      const newWatchedStocks = watchedStocks.filter((s) => s !== symbol);
      try {
        await updateSandbox.mutateAsync({
          id: sandboxId,
          watchedStocks: newWatchedStocks,
        });
      } catch (error) {
        console.error("Failed to remove from watchlist:", error);
        alert("Failed to remove stock from watchlist");
      }
    },
    [sandboxId, watchedStocks, updateSandbox]
  );

  // Handle buy
  const handleBuy = useCallback(
    async (symbol: string, quantity: number, price: number) => {
      if (!sandboxId || !price || price <= 0) {
        alert("Invalid price");
        return;
      }

      try {
        await executeTrade.mutateAsync({
          sandboxId,
          trade: {
            ticker: symbol,
            side: "buy",
            price,
            quantity,
          },
        });
        setTradeQuantities((prev) => ({ ...prev, [symbol]: "" }));
      } catch (error) {
        console.error("Failed to execute buy:", error);
        const errorMessage =
          error instanceof Error ? error.message : "Failed to execute trade";
        alert(errorMessage);
      }
    },
    [sandboxId, executeTrade]
  );

  // Handle sell
  const handleSell = useCallback(
    async (symbol: string, quantity: number, price: number) => {
      if (!sandboxId || !price || price <= 0) {
        alert("Invalid price");
        return;
      }

      const holding = holdings[symbol];
      if (!holding || quantity > holding.quantity) {
        alert("Insufficient shares");
        return;
      }

      try {
        await executeTrade.mutateAsync({
          sandboxId,
          trade: {
            ticker: symbol,
            side: "sell",
            price,
            quantity,
          },
        });
        setTradeQuantities((prev) => ({ ...prev, [symbol]: "" }));
      } catch (error) {
        console.error("Failed to execute sell:", error);
        const errorMessage =
          error instanceof Error ? error.message : "Failed to execute trade";
        alert(errorMessage);
      }
    },
    [sandboxId, holdings, executeTrade]
  );

  // Calculate portfolio value
  const portfolioValue = useMemo(() => {
    let holdingsValue = 0;
    watchedStocks.forEach((symbol) => {
      const holding = holdings[symbol];
      const price = stocksMetadata?.[symbol]?.price || holding?.avgPrice || 0;
      if (holding && holding.quantity > 0 && price > 0) {
        holdingsValue += holding.quantity * price;
      }
    });
    return cashBalance + holdingsValue;
  }, [cashBalance, holdings, watchedStocks, stocksMetadata]);

  const totalGainLoss = portfolioValue - initialBalance;
  const totalGainLossPercent =
    initialBalance > 0 ? (totalGainLoss / initialBalance) * 100 : 0;

  // Toggle sector collapse
  const toggleSector = useCallback((sector: string) => {
    setCollapsedSectors((prev) => {
      const next = new Set(prev);
      if (next.has(sector)) {
        next.delete(sector);
      } else {
        next.add(sector);
      }
      return next;
    });
  }, []);

  // Handle search input focus
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        searchInputRef.current &&
        !searchInputRef.current.contains(event.target as Node) &&
        !(event.target as HTMLElement).closest(".search-results")
      ) {
        setShowSearchResults(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (isLoadingSandbox) {
    return (
      <div className="min-h-screen bg-stone-50 dark:bg-stone-900 flex items-center justify-center">
        <p className="text-gray-500 dark:text-stone-400">Loading sandbox...</p>
      </div>
    );
  }

  if (!sandbox && sandboxId) {
    return (
      <div className="min-h-screen bg-stone-50 dark:bg-stone-900 flex items-center justify-center">
        <p className="text-red-500 dark:text-red-400">Sandbox not found</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-50 dark:bg-stone-900">
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        {/* Header */}
        <div className="border-b-4 border-black dark:border-stone-600 pb-3 mb-6">
          <div className="flex justify-between items-end">
            <div>
              <h1 className="text-5xl md:text-6xl font-black font-serif tracking-tight text-black dark:text-white leading-none">
                {sandboxName || sandbox?.name || "Market Sandbox"}
              </h1>
              <p className="text-sm font-serif italic text-stone-600 dark:text-stone-400 mt-2">
                Practice trading with real market data
              </p>
            </div>
            {onDeleteSandbox && (
              <Button variant="destructive" size="sm" onClick={onDeleteSandbox}>
                Delete Sandbox
              </Button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-6 mb-6">
          {/* Left Column - Search, Roulette, Quick Add, Portfolio */}
          <div className="lg:col-span-2 space-y-4 lg:space-y-6">
            {/* Search Stocks */}
            <Card>
              <CardHeader>
                <CardTitle>Search Stocks</CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                <div className="relative" ref={searchInputRef}>
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 dark:text-stone-400 w-5 h-5" />
                  <Input
                    type="text"
                    placeholder="Search by symbol or company..."
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setShowSearchResults(true);
                    }}
                    onFocus={() => setShowSearchResults(true)}
                    className="pl-10"
                  />
                </div>

                {/* Quick Add Buttons */}
                <div className="mt-3">
                  <p className="text-xs text-gray-500 dark:text-stone-400 mb-2 font-medium">
                    Quick Add:
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {POPULAR_STOCKS.map((symbol) => (
                      <Button
                        key={symbol}
                        size="sm"
                        variant="outline"
                        onClick={() => addToWatchlist(symbol)}
                        disabled={
                          watchedStocks.includes(symbol) ||
                          updateSandbox.isPending
                        }
                        className="text-xs"
                      >
                        {symbol}
                      </Button>
                    ))}
                  </div>
                </div>

                {/* Search Results */}
                {showSearchResults && searchQuery && (
                  <div className="mt-3 space-y-1.5 max-h-80 overflow-y-auto search-results border border-stone-200 dark:border-stone-700 rounded p-2">
                    {isSearching ? (
                      <p className="text-sm text-gray-500 dark:text-stone-400">
                        Searching...
                      </p>
                    ) : searchResults.length === 0 ? (
                      <p className="text-sm text-gray-500 dark:text-stone-400">
                        No stocks found
                      </p>
                    ) : (
                      searchResults.map((stock) => (
                        <div
                          key={stock.symbol}
                          className="flex items-center justify-between p-2 border border-stone-200 dark:border-stone-700 rounded hover:bg-stone-50 dark:hover:bg-stone-800 cursor-pointer"
                          onClick={() => addToWatchlist(stock.symbol)}
                        >
                          <div className="flex-1">
                            <p className="font-bold text-black dark:text-stone-100">
                              {stock.symbol}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-stone-400">
                              {stock.company}
                            </p>
                            <p className="text-sm font-semibold text-black dark:text-stone-100">
                              ${stock.price.toFixed(2)}
                            </p>
                          </div>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={(e) => {
                              e.stopPropagation();
                              addToWatchlist(stock.symbol);
                            }}
                            disabled={
                              watchedStocks.includes(stock.symbol) ||
                              updateSandbox.isPending
                            }
                          >
                            <Plus className="w-4 h-4" />
                          </Button>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Stock Roulette */}
            <StockRoulette
              onSelect={addToWatchlist}
              disabled={updateSandbox.isPending}
            />

            {/* Portfolio Summary */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="w-5 h-5" />
                  Portfolio
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                <div className="space-y-4">
                  <div>
                    <p className="text-xs text-gray-500 dark:text-stone-400 uppercase tracking-widest">
                      Cash
                    </p>
                    <p className="text-2xl font-black text-black dark:text-stone-100">
                      ${cashBalance.toFixed(2)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 dark:text-stone-400 uppercase tracking-widest">
                      Total Value
                    </p>
                    <p className="text-2xl font-black text-black dark:text-stone-100">
                      ${portfolioValue.toFixed(2)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 dark:text-stone-400 uppercase tracking-widest">
                      Gain/Loss
                    </p>
                    <p
                      className={`text-xl font-black ${
                        totalGainLoss >= 0
                          ? "text-green-600 dark:text-green-400"
                          : "text-red-600 dark:text-red-400"
                      }`}
                    >
                      {totalGainLoss >= 0 ? "+" : ""}${totalGainLoss.toFixed(2)}{" "}
                      ({totalGainLossPercent >= 0 ? "+" : ""}
                      {totalGainLossPercent.toFixed(2)}%)
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Center Column - Watchlist & Returns Graph */}
          <div className="lg:col-span-8 space-y-4 lg:space-y-6">
            {/* Watchlist with Sector Grouping */}
            <Card>
              <CardHeader>
                <CardTitle>Watchlist</CardTitle>
              </CardHeader>
              <CardContent className="p-0 w-full">
                {watchedStocks.length === 0 ? (
                  <div className="py-12 px-4 text-center space-y-3">
                    <p className="text-gray-500 dark:text-stone-400 font-medium">
                      Your watchlist is empty
                    </p>
                    <p className="text-sm text-gray-400 dark:text-stone-500">
                      Use the search bar or quick-add buttons to add stocks
                    </p>
                    <div className="flex flex-wrap gap-2 justify-center mt-4">
                      {POPULAR_STOCKS.slice(0, 5).map((symbol) => (
                        <Button
                          key={symbol}
                          size="sm"
                          variant="outline"
                          onClick={() => addToWatchlist(symbol)}
                          disabled={updateSandbox.isPending}
                          className="text-xs"
                        >
                          <Plus className="w-3 h-3 mr-1" />
                          {symbol}
                        </Button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2 lg:space-y-3">
                    {Object.entries(stocksBySector).map(([sector, stocks]) => (
                      <div
                        key={sector}
                        className="border border-stone-200 dark:border-stone-700 rounded overflow-hidden"
                      >
                        <button
                          onClick={() => toggleSector(sector)}
                          className="w-full flex items-center justify-between p-2.5 bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 transition-colors"
                        >
                          <span className="font-bold text-black dark:text-stone-100">
                            {sector} ({stocks.length})
                          </span>
                          {collapsedSectors.has(sector) ? (
                            <ChevronDown className="w-4 h-4" />
                          ) : (
                            <ChevronUp className="w-4 h-4" />
                          )}
                        </button>
                        {!collapsedSectors.has(sector) && (
                          <div className="overflow-x-auto border-t border-stone-200 dark:border-stone-700 w-full">
                            <Table className="w-full">
                              <TableHeader>
                                <TableRow>
                                  <TableHead className="px-3">Symbol</TableHead>
                                  <TableHead className="px-3">Price</TableHead>
                                  <TableHead className="px-3">Change</TableHead>
                                  <TableHead className="px-3">Owned</TableHead>
                                  <TableHead className="px-3">Qty</TableHead>
                                  <TableHead className="px-3">
                                    Actions
                                  </TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody className="[&_tr]:border-b [&_tr:last-child]:border-0">
                                {stocks.map((symbol) => (
                                  <WatchedStockRow
                                    key={symbol}
                                    symbol={symbol}
                                    holding={holdings[symbol]}
                                    onRemove={() => removeFromWatchlist(symbol)}
                                    onBuy={(qty, price) =>
                                      handleBuy(symbol, qty, price)
                                    }
                                    onSell={(qty, price) =>
                                      handleSell(symbol, qty, price)
                                    }
                                    quantity={tradeQuantities[symbol] || ""}
                                    onQuantityChange={(qty) =>
                                      setTradeQuantities((prev) => ({
                                        ...prev,
                                        [symbol]: qty,
                                      }))
                                    }
                                    cashBalance={cashBalance}
                                    isTrading={executeTrade.isPending}
                                  />
                                ))}
                              </TableBody>
                            </Table>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Returns Graph */}
            <ReturnsGraph
              trades={sandbox?.trades || []}
              positions={sandbox?.positions || []}
              initialBalance={initialBalance}
              currentBalance={cashBalance}
              currentPrices={currentPrices}
            />
          </div>

          {/* Right Column - Transaction History & News Feed */}
          <div className="lg:col-span-2 space-y-4 lg:space-y-6">
            {/* Transaction History */}
            <Card>
              <CardHeader>
                <CardTitle>Transaction History</CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                {transactions.length === 0 ? (
                  <div className="py-8 text-center space-y-2">
                    <p className="text-gray-500 dark:text-stone-400 font-medium">
                      No transactions yet
                    </p>
                    <p className="text-sm text-gray-400 dark:text-stone-500">
                      Your buy and sell orders will appear here
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead>Symbol</TableHead>
                          <TableHead>Action</TableHead>
                          <TableHead>Qty</TableHead>
                          <TableHead>Price</TableHead>
                          <TableHead>Total</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody className="[&_tr]:border-b [&_tr:last-child]:border-0 [&_tr:hover]:bg-stone-50 [&_tr:hover]:dark:bg-stone-800/50">
                        {transactions.map((tx) => (
                          <TableRow key={tx.id} className="transition-colors">
                            <TableCell className="text-xs py-2">
                              {new Date(tx.date).toLocaleDateString()}
                            </TableCell>
                            <TableCell className="font-bold text-sm py-2">
                              {tx.symbol}
                            </TableCell>
                            <TableCell className="py-2">
                              <span
                                className={`font-semibold text-xs ${
                                  tx.action === "Buy"
                                    ? "text-green-600 dark:text-green-400"
                                    : "text-red-600 dark:text-red-400"
                                }`}
                              >
                                {tx.action}
                              </span>
                            </TableCell>
                            <TableCell className="text-sm py-2">
                              {tx.quantity}
                            </TableCell>
                            <TableCell className="text-sm py-2">
                              ${tx.price.toFixed(2)}
                            </TableCell>
                            <TableCell className="font-semibold text-sm py-2">
                              ${tx.total.toFixed(2)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* News Feed */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Newspaper className="w-5 h-5" />
                  News Feed
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                <Tabs
                  value={selectedNewsTab}
                  onValueChange={setSelectedNewsTab}
                >
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="watchlist">Watchlist</TabsTrigger>
                    <TabsTrigger value="general">Market</TabsTrigger>
                  </TabsList>
                  <TabsContent value="watchlist" className="mt-4">
                    {watchlistNews.isLoading ? (
                      <div className="py-8 text-center">
                        <p className="text-sm text-gray-500 dark:text-stone-400">
                          Loading news...
                        </p>
                      </div>
                    ) : watchlistNews.data?.articles.length === 0 ? (
                      <div className="py-8 text-center space-y-2">
                        <p className="text-sm text-gray-500 dark:text-stone-400 font-medium">
                          No news found for your watchlist
                        </p>
                        <p className="text-xs text-gray-400 dark:text-stone-500">
                          News will appear here when available for your watched
                          stocks
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-2 max-h-[500px] overflow-y-auto pr-2">
                        {watchlistNews.data?.articles.map((article) => (
                          <div
                            key={article.id}
                            className="p-3 border border-stone-200 dark:border-stone-700 rounded hover:bg-stone-50 dark:hover:bg-stone-800 transition-colors"
                          >
                            <h4 className="font-bold text-sm text-black dark:text-stone-100 mb-1">
                              {article.headline}
                            </h4>
                            {article.summary && (
                              <p className="text-xs text-gray-600 dark:text-stone-400 line-clamp-2">
                                {article.summary}
                              </p>
                            )}
                            <div className="flex items-center gap-2 mt-2">
                              <span className="text-xs text-gray-500 dark:text-stone-500">
                                {article.source}
                              </span>
                              <span className="text-xs text-gray-500 dark:text-stone-500">
                                {new Date(
                                  article.published_at
                                ).toLocaleDateString()}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </TabsContent>
                  <TabsContent value="general" className="mt-4">
                    {generalNews.isLoading ? (
                      <div className="py-8 text-center">
                        <p className="text-sm text-gray-500 dark:text-stone-400">
                          Loading news...
                        </p>
                      </div>
                    ) : generalNews.data?.articles.length === 0 ? (
                      <div className="py-8 text-center space-y-2">
                        <p className="text-sm text-gray-500 dark:text-stone-400 font-medium">
                          No market news available
                        </p>
                        <p className="text-xs text-gray-400 dark:text-stone-500">
                          Check back later for the latest market updates
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-2 max-h-[500px] overflow-y-auto pr-2">
                        {generalNews.data?.articles.map((article) => (
                          <div
                            key={article.id}
                            className="p-3 border border-stone-200 dark:border-stone-700 rounded hover:bg-stone-50 dark:hover:bg-stone-800 transition-colors"
                          >
                            <h4 className="font-bold text-sm text-black dark:text-stone-100 mb-1">
                              {article.headline}
                            </h4>
                            {article.summary && (
                              <p className="text-xs text-gray-600 dark:text-stone-400 line-clamp-2">
                                {article.summary}
                              </p>
                            )}
                            <div className="flex items-center gap-2 mt-2">
                              <span className="text-xs text-gray-500 dark:text-stone-500">
                                {article.source}
                              </span>
                              <span className="text-xs text-gray-500 dark:text-stone-500">
                                {new Date(
                                  article.published_at
                                ).toLocaleDateString()}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}

// Component for each watched stock row with real-time price updates
function WatchedStockRow({
  symbol,
  holding,
  onRemove,
  onBuy,
  onSell,
  quantity,
  onQuantityChange,
  cashBalance,
  isTrading,
}: {
  symbol: string;
  holding?: { symbol: string; quantity: number; avgPrice: number };
  onRemove: () => void;
  onBuy: (quantity: number, price: number) => void;
  onSell: (quantity: number, price: number) => void;
  quantity: string;
  onQuantityChange: (quantity: string) => void;
  cashBalance: number;
  isTrading: boolean;
}) {
  // Use useQuery directly for real-time price updates with refetchInterval
  const { data: stockDetail, isLoading } = useQuery({
    queryKey: ["stock", symbol],
    queryFn: async () => {
      if (!symbol) {
        throw new Error("Symbol is required");
      }
      const response = await fetch(`/api/stock/${symbol}?days=30`);
      if (!response.ok) {
        throw new Error("Failed to fetch stock details");
      }
      const data = await response.json();
      // Remove chart data - we only need price info
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { chartData, forecastData, ...rest } = data;
      return rest;
    },
    enabled: !!symbol,
    staleTime: 30 * 1000, // 30 seconds
    refetchInterval: 30 * 1000, // Refetch every 30 seconds for real-time updates
  });

  const currentPrice = stockDetail?.price || 0;
  const change = stockDetail?.change || 0;
  const changePercent = stockDetail?.changePercent || 0;
  const owned = holding?.quantity || 0;

  const handleBuyClick = () => {
    const qty = parseInt(quantity) || 0;
    if (qty > 0 && currentPrice > 0) {
      onBuy(qty, currentPrice);
    }
  };

  const handleSellClick = () => {
    const qty = parseInt(quantity) || 0;
    if (qty > 0 && qty <= owned && currentPrice > 0) {
      onSell(qty, currentPrice);
    }
  };

  return (
    <TableRow className="hover:bg-stone-50 dark:hover:bg-stone-800/50 transition-colors">
      <TableCell className="font-bold py-2 px-3">{symbol}</TableCell>
      <TableCell className="py-2 px-3">
        {isLoading ? (
          <span className="text-gray-400">Loading...</span>
        ) : (
          <span className="font-semibold">${currentPrice.toFixed(2)}</span>
        )}
      </TableCell>
      <TableCell className="py-2 px-3">
        {change !== 0 && (
          <div className="flex items-center gap-1">
            {change >= 0 ? (
              <TrendingUp className="w-4 h-4 text-green-600 dark:text-green-400" />
            ) : (
              <TrendingDown className="w-4 h-4 text-red-600 dark:text-red-400" />
            )}
            <span
              className={`text-sm font-semibold ${
                change >= 0
                  ? "text-green-600 dark:text-green-400"
                  : "text-red-600 dark:text-red-400"
              }`}
            >
              {change >= 0 ? "+" : ""}
              {change.toFixed(2)} ({changePercent >= 0 ? "+" : ""}
              {changePercent.toFixed(2)}%)
            </span>
          </div>
        )}
      </TableCell>
      <TableCell className="py-2 px-3">{owned}</TableCell>
      <TableCell className="py-2 px-3">
        <Input
          type="number"
          min="1"
          value={quantity}
          onChange={(e) => onQuantityChange(e.target.value)}
          placeholder="Qty"
          className="w-20 h-8 text-sm"
        />
      </TableCell>
      <TableCell className="py-2 px-3">
        <div className="flex items-center gap-1.5 flex-wrap">
          <Button
            size="sm"
            variant="default"
            onClick={handleBuyClick}
            disabled={
              !stockDetail ||
              (parseInt(quantity) || 0) * currentPrice > cashBalance ||
              !quantity ||
              isTrading
            }
            className="text-xs h-7 px-2"
          >
            Buy
          </Button>
          <Button
            size="sm"
            variant="destructive"
            onClick={handleSellClick}
            disabled={
              !stockDetail ||
              owned === 0 ||
              (parseInt(quantity) || 0) > owned ||
              !quantity ||
              isTrading
            }
            className="text-xs h-7 px-2"
          >
            Sell
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={onRemove}
            className="h-7 w-7 p-0"
          >
            <X className="w-3.5 h-3.5" />
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
}
