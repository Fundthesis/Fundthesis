"use client";
import React, { useState, useEffect, Suspense, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Search, X } from "lucide-react";
import {
  PortfolioChart,
  PortfolioHistoryPoint,
} from "@/components/enviro/Portfolio";
import { PortfolioSummary } from "@/components/enviro/PortfolioSummary";
import MarketTips from "@/components/enviro/MarketTips";
import { StockCardStack } from "@/components/stocks/StockCardStack";
import StockTradeModal from "@/components/stocks/StockTradeModal";
import {
  TransactionHistory,
  Transaction,
} from "@/components/enviro/TransactionHistory";
import { getMissionById, type Mission } from "@/data/missions";
import { NewspaperMissionLayout } from "@/components/missions/NewspaperMissionLayout";

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
  chartData: Array<{ date: string; price: number }>;
  forecastData?: Array<{ date: string; price: number }>;
}

// Sample stock data - ALL available stocks
const allStocks = [
  {
    symbol: "AAPL",
    company: "Apple Inc.",
    price: 150.25,
    change: 2.5,
    changePercent: 1.69,
  },
  {
    symbol: "GOOGL",
    company: "Alphabet Inc.",
    price: 2800.0,
    change: -15.0,
    changePercent: -0.53,
  },
  {
    symbol: "MSFT",
    company: "Microsoft Corp.",
    price: 310.5,
    change: 5.25,
    changePercent: 1.72,
  },
  {
    symbol: "TSLA",
    company: "Tesla Inc.",
    price: 700.0,
    change: -10.0,
    changePercent: -1.41,
  },
  {
    symbol: "AMZN",
    company: "Amazon.com Inc.",
    price: 3300.0,
    change: 25.0,
    changePercent: 0.76,
  },
];

const sampleTransactions: Transaction[] = [
  {
    id: "1",
    date: "2025-10-22 14:30",
    symbol: "AAPL",
    action: "Buy" as const,
    quantity: 10,
    price: 150.25,
    total: 1502.5,
  },
  {
    id: "2",
    date: "2025-10-23 10:15",
    symbol: "TSLA",
    action: "Sell" as const,
    quantity: 5,
    price: 700.0,
    total: 3500.0,
  },
];

// Function to compute portfolio history from transactions
const computePortfolioHistory = (
  transactions: Transaction[],
  initialBalance: number,
  currentCashBalance: number,
  currentHoldingsValue: number,
  stockDetails: { [key: string]: StockDetail }
): PortfolioHistoryPoint[] => {
  const history: PortfolioHistoryPoint[] = [];

  // Start with initial balance
  const startDate =
    transactions.length > 0
      ? new Date(transactions[transactions.length - 1].date)
      : new Date();
  startDate.setDate(startDate.getDate() - 1); // One day before first transaction

  history.push({
    timestamp: startDate,
    value: initialBalance,
  });

  // Process transactions chronologically (oldest first)
  const sortedTransactions = [...transactions].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  let runningCash = initialBalance;
  const holdings: { [symbol: string]: number } = {};

  // Add a point for each transaction
  sortedTransactions.forEach((tx) => {
    // Update holdings
    holdings[tx.symbol] =
      (holdings[tx.symbol] || 0) +
      (tx.action === "Buy" ? tx.quantity : -tx.quantity);

    // Update cash
    runningCash =
      tx.action === "Buy" ? runningCash - tx.total : runningCash + tx.total;

    // Calculate holdings value at transaction time (use transaction price)
    const holdingsValue = Object.keys(holdings).reduce((acc, sym) => {
      const qty = holdings[sym] || 0;
      if (qty <= 0) return acc;
      // Use transaction price for this symbol, or current price from details
      const price =
        sym === tx.symbol
          ? tx.price
          : stockDetails[sym]?.price ||
          allStocks.find((s) => s.symbol === sym)?.price ||
          0;
      return acc + qty * price;
    }, 0);

    history.push({
      timestamp: new Date(tx.date),
      value: runningCash + holdingsValue,
    });
  });

  // Add current point
  const currentValue = currentCashBalance + currentHoldingsValue;
  history.push({
    timestamp: new Date(),
    value: currentValue,
  });

  // Ensure we have at least 2 points for the graph to render
  if (history.length < 2) {
    history.push({
      timestamp: new Date(),
      value: initialBalance,
    });
  }

  return history;
};

function PortfolioDashboardPageContent() {
  // Search state
  const [searchQuery, setSearchQuery] = useState("");
  const [filteredStocks, setFilteredStocks] = useState(allStocks);

  const [stocks, setStocks] = useState(allStocks);
  const [stockDetails, setStockDetails] = useState<{
    [key: string]: StockDetail;
  }>({});
  const [currentIndex, setCurrentIndex] = useState(0);
  const [timeframe, setTimeframe] = useState<"day" | "month" | "year" | "all">(
    "day"
  );

  const searchParams = useSearchParams();

  type Difficulty = "easy" | "medium" | "hard";
  type Sandbox = {
    id: string;
    name: string;
    difficulty: Difficulty;
    balance: number;
    createdAt: string;
  };

  const [sandbox, setSandbox] = useState<Sandbox | null>(null);
  const [cashBalance, setCashBalance] = useState<number>(3000);
  
  // Mission state
  const [mission, setMission] = useState<Mission | null>(null);
  const [completedObjectives, setCompletedObjectives] = useState<string[]>([]);
  const [selectedStock, setSelectedStock] = useState<(typeof allStocks[0]) | null>(null);

  const router = useRouter();

  // Check mission objectives completion
  const checkMissionObjectives = (
    currentMission: Mission,
    currentTransactions: Transaction[],
    currentCash: number
  ) => {
    const newCompleted: string[] = [];
    
    // Compute holdings
    const holdings: { [symbol: string]: number } = {};
    currentTransactions.forEach((tx) => {
      holdings[tx.symbol] =
        (holdings[tx.symbol] || 0) +
        (tx.action === "Buy" ? tx.quantity : -tx.quantity);
    });
    
    // Check each objective
    currentMission.objectives.forEach((objective) => {
      if (completedObjectives.includes(objective)) {
        newCompleted.push(objective);
        return;
      }
      
      // Check diversification (3+ sectors)
      if (objective.toLowerCase().includes("sector") && objective.toLowerCase().includes("3")) {
        const sectors = new Set<string>();
        Object.keys(holdings).forEach((sym) => {
          const detail = stockDetails[sym] || allStocks.find((s) => s.symbol === sym);
          if (detail && 'sector' in detail) {
            sectors.add((detail as StockDetail).sector);
          }
        });
        if (sectors.size >= 3) {
          newCompleted.push(objective);
        }
      }
      
      // Check ETF inclusion
      if (objective.toLowerCase().includes("etf")) {
        // Simple check - in real implementation, you'd check if symbol is an ETF
        const hasETF = Object.keys(holdings).some((sym) => 
          sym.includes('ETF') || ['SPY', 'QQQ', 'VTI', 'IWM'].includes(sym)
        );
        if (hasETF) {
          newCompleted.push(objective);
        }
      }
      
      // Check inflation rate (for inflation mission)
      if (objective.toLowerCase().includes("inflation") && objective.toLowerCase().includes("2%")) {
        const startingBalance = currentMission.sandboxConfig.startingBalance;
        const totalValue = currentCash + Object.keys(holdings).reduce((acc, sym) => {
          const qty = holdings[sym] || 0;
          const detail = stockDetails[sym] || allStocks.find((s) => s.symbol === sym);
          const price = detail ? (detail as StockDetail | (typeof allStocks)[0]).price : 0;
          return acc + qty * price;
        }, 0);
        const returnPercent = startingBalance > 0 ? ((totalValue - startingBalance) / startingBalance) * 100 : 0;
        if (returnPercent >= 2) {
          newCompleted.push(objective);
        }
      }
    });
    
    if (newCompleted.length > completedObjectives.length) {
      setCompletedObjectives(newCompleted);
      // Save progress
      try {
        localStorage.setItem(
          `mission_progress_${currentMission.id}`,
          JSON.stringify({ completedObjectives: newCompleted })
        );
      } catch (e) {
        console.warn("Failed to save mission progress", e);
      }
    }
  };

  const deleteCurrentSandbox = () => {
    try {
      if (!sandbox) return;
      const raw = localStorage.getItem("enviro_sandboxes");
      if (!raw) {
        router.push("/enviro");
        return;
      }
      const items: Sandbox[] = JSON.parse(raw);
      const remaining = items.filter((s) => s.id !== sandbox.id);
      localStorage.setItem("enviro_sandboxes", JSON.stringify(remaining));
      // also remove persisted portfolio for this sandbox
      try {
        const portRaw = localStorage.getItem("enviro_sandbox_portfolios");
        if (portRaw) {
          const map = JSON.parse(portRaw);
          delete map[sandbox.id];
          localStorage.setItem(
            "enviro_sandbox_portfolios",
            JSON.stringify(map)
          );
        }
      } catch (e) {
        console.warn("failed to remove sandbox portfolio", e);
      }
      // navigate back to sandbox manager
      router.push("/enviro");
    } catch (e) {
      console.error("Failed to delete sandbox", e);
    }
  };

  const [showDeleteConfirm, setShowDeleteConfirm] = useState<boolean>(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState<string>("");

  // Handle search functionality
  useEffect(() => {
    if (searchQuery.trim() === "") {
      setFilteredStocks(allStocks);
    } else {
      const query = searchQuery.toLowerCase();
      const filtered = allStocks.filter(
        (stock) =>
          stock.symbol.toLowerCase().includes(query) ||
          stock.company.toLowerCase().includes(query)
      );
      setFilteredStocks(filtered);
    }
    // Reset to first card when search changes
    setCurrentIndex(0);
  }, [searchQuery]);

  // Update stocks when filtered stocks change
  useEffect(() => {
    setStocks(filteredStocks);
  }, [filteredStocks]);

  // Read missionId or sandboxId from query params
  useEffect(() => {
    // Check for mission first
    const missionId = searchParams?.get("missionId");
    if (missionId) {
      const foundMission = getMissionById(missionId);
      if (foundMission) {
        console.log('[Mission] Loading mission:', foundMission.id, foundMission.title);
        setMission(foundMission);
        
        // Initialize mission portfolio in localStorage first
        try {
          const portRaw = localStorage.getItem("enviro_mission_portfolios");
          const map = portRaw ? JSON.parse(portRaw) : {};
          if (!map[missionId]) {
            map[missionId] = {
              cashBalance: foundMission.sandboxConfig.startingBalance,
              transactions: [],
            };
            localStorage.setItem("enviro_mission_portfolios", JSON.stringify(map));
            setCashBalance(foundMission.sandboxConfig.startingBalance);
            setTransactions([]);
          } else {
            setCashBalance(map[missionId].cashBalance);
            setTransactions(map[missionId].transactions || []);
          }
        } catch (e) {
          console.warn("Failed to initialize mission portfolio", e);
          setCashBalance(foundMission.sandboxConfig.startingBalance);
          setTransactions([]);
        }
        
        // Load mission progress
        try {
          const progressRaw = localStorage.getItem(`mission_progress_${missionId}`);
          if (progressRaw) {
            const progress = JSON.parse(progressRaw);
            setCompletedObjectives(progress.completedObjectives || []);
          }
        } catch (e) {
          console.warn("Failed to load mission progress", e);
        }
      } else {
        console.warn('[Mission] Mission not found:', missionId);
      }
      return;
    }
    
    // Otherwise, try to load sandbox
    // Clear mission state if we're in sandbox mode
    if (mission) {
      setMission(null);
      setCompletedObjectives([]);
    }
    
    try {
      const id = searchParams?.get("sandboxId");
      if (!id) {
        // No mission and no sandbox - clear everything
        if (mission) {
          setMission(null);
          setCompletedObjectives([]);
        }
        return;
      }
      const raw = localStorage.getItem("enviro_sandboxes");
      if (!raw) return;
      const items: Sandbox[] = JSON.parse(raw);
      const found = items.find((s) => s.id === id);
      if (found) {
        setSandbox(found);

        // load portfolio persisted for this sandbox if available
        try {
          const portRaw = localStorage.getItem("enviro_sandbox_portfolios");
          if (portRaw) {
            const map: {
              [id: string]: {
                cashBalance: number;
                transactions: Transaction[];
              };
            } = JSON.parse(portRaw);
            const saved = map[found.id];
            if (saved) {
              setCashBalance(saved.cashBalance);
              setTransactions(saved.transactions || []);
            } else {
              // initialize portfolio with sandbox balance
              setCashBalance(found.balance);
              setTransactions([]);
              const newMap = map;
              newMap[found.id] = {
                cashBalance: found.balance,
                transactions: [],
              };
              localStorage.setItem(
                "enviro_sandbox_portfolios",
                JSON.stringify(newMap)
              );
            }
          } else {
            // create initial portfolios map
            setCashBalance(found.balance);
            setTransactions([]);
            const newMap: {
              [id: string]: {
                cashBalance: number;
                transactions: Transaction[];
              };
            } = {};
            newMap[found.id] = { cashBalance: found.balance, transactions: [] };
            localStorage.setItem(
              "enviro_sandbox_portfolios",
              JSON.stringify(newMap)
            );
          }
        } catch (e) {
          console.warn("Failed to load or initialize sandbox portfolio", e);
          setCashBalance(found.balance);
          setTransactions([]);
        }
      }
    } catch (e) {
      console.warn("Failed to load sandbox from localStorage", e);
    }
  }, [searchParams, mission]);

  // Function to generate mock chart data
  const generateChartData = useCallback((
    symbol: string,
    timeframe: "day" | "month" | "year" | "all"
  ) => {
    const stock = stocks.find((s) => s.symbol === symbol);
    if (!stock) return [];

    const points =
      timeframe === "day"
        ? 24
        : timeframe === "month"
          ? 30
          : timeframe === "year"
            ? 365
            : 730;
    const data = [];
    const basePrice = stock.price;

    for (let i = 0; i < points; i++) {
      const date = new Date();
      if (timeframe === "day") {
        date.setHours(date.getHours() - (points - i));
      } else if (timeframe === "month") {
        date.setDate(date.getDate() - (points - i));
      } else {
        date.setDate(date.getDate() - (points - i));
      }

      const randomVariation = (Math.random() - 0.5) * basePrice * 0.05;
      data.push({
        date: date.toISOString(),
        price: parseFloat((basePrice + randomVariation).toFixed(2)),
      });
    }

    return data;
  }, [stocks]);

  // Fetch stock details when needed
  const fetchStockDetail = useCallback(async (symbol: string) => {
    if (stockDetails[symbol]) return;

    const stock = stocks.find((s) => s.symbol === symbol);
    if (!stock) return;

    // Simulate API call delay
    await new Promise((resolve) => setTimeout(resolve, 500));

    setStockDetails((prev: { [key: string]: StockDetail }) => ({
      ...prev,
      [symbol]: {
        ...stock,
        open: stock.price - Math.random() * 5,
        high: stock.price + Math.random() * 10,
        low: stock.price - Math.random() * 10,
        volume: Math.floor(Math.random() * 50000000),
        avgVolume: Math.floor(Math.random() * 40000000),
        fiftyTwoWeekHigh: stock.price + Math.random() * 50,
        fiftyTwoWeekLow: stock.price - Math.random() * 50,
        peRatio: parseFloat((Math.random() * 50 + 10).toFixed(2)),
        sector: ["Technology", "Consumer", "Energy", "Finance"][
          Math.floor(Math.random() * 4)
        ],
        industry: ["Software", "Hardware", "E-commerce", "Banking"][
          Math.floor(Math.random() * 4)
        ],
        marketCap: Math.floor(Math.random() * 1000000000000) + 10000000000,
        chartData: generateChartData(symbol, timeframe),
      },
    }));
  }, [stockDetails, stocks, timeframe, generateChartData]);

  // Check if we need to load more stocks
  const checkAndLoadMore = () => {
    // Placeholder - implement if you want infinite loading
  };

  // Fetch details for current stock
  useEffect(() => {
    if (stocks[currentIndex]) {
      fetchStockDetail(stocks[currentIndex].symbol);
    }
  }, [currentIndex, stocks, fetchStockDetail]);

  const [transactions, setTransactions] =
    useState<Transaction[]>(sampleTransactions);

  // compute holdings per symbol from transactions
  const holdingsMap: { [symbol: string]: number } = {};
  transactions.forEach((tx) => {
    holdingsMap[tx.symbol] =
      (holdingsMap[tx.symbol] || 0) +
      (tx.action === "Buy" ? tx.quantity : -tx.quantity);
  });

  const handleExecuteTrade = (
    action: "Buy" | "Sell",
    symbol: string,
    price: number,
    quantity: number
  ) => {
    const total = price * quantity;
    const now = new Date();
    const tx: Transaction = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      date: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(
        2,
        "0"
      )}-${String(now.getDate()).padStart(2, "0")} ${String(
        now.getHours()
      ).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`,
      symbol,
      action,
      quantity,
      price,
      total,
    };

    // Compute new cash and transactions and persist immediately
    setTransactions((prev) => {
      const next = [tx, ...prev];
      try {
        if (mission) {
          // Save to mission portfolio
          const portRaw = localStorage.getItem("enviro_mission_portfolios");
          const map = portRaw ? JSON.parse(portRaw) : {};
          const prevCash =
            (map[mission.id] && map[mission.id].cashBalance) || cashBalance;
          const newCash =
            action === "Buy" ? prevCash - total : prevCash + total;
          map[mission.id] = { cashBalance: newCash, transactions: next };
          localStorage.setItem(
            "enviro_mission_portfolios",
            JSON.stringify(map)
          );
          setCashBalance(newCash);
          
          // Check mission objectives after trade
          checkMissionObjectives(mission, next, newCash);
        } else if (sandbox) {
          const portRaw = localStorage.getItem("enviro_sandbox_portfolios");
          const map = portRaw ? JSON.parse(portRaw) : {};
          const prevCash =
            (map[sandbox.id] && map[sandbox.id].cashBalance) || cashBalance;
          const newCash =
            action === "Buy" ? prevCash - total : prevCash + total;
          map[sandbox.id] = { cashBalance: newCash, transactions: next };
          localStorage.setItem(
            "enviro_sandbox_portfolios",
            JSON.stringify(map)
          );
          setCashBalance(newCash);
        } else {
          // no sandbox/mission selected: just update cash locally
          setCashBalance((prev) =>
            action === "Buy" ? prev - total : prev + total
          );
        }
      } catch (e) {
        console.warn("Failed to persist trade", e);
      }

      return next;
    });
  };

  // Clear search
  const clearSearch = () => {
    setSearchQuery("");
  };

  // wrapper to provide extra props to ExpandedModal
  // compute dynamic total value from cash + holdings
  const holdingsValue = Object.keys(holdingsMap).reduce((acc, sym) => {
    const qty = holdingsMap[sym] || 0;
    const detail = stockDetails[sym] || allStocks.find((s) => s.symbol === sym);
    const price = detail
      ? (detail as StockDetail | (typeof allStocks)[0]).price
      : 0;
    return acc + qty * price;
  }, 0);

  const totalValue = cashBalance + holdingsValue;

  // baseline for gain/loss: if mission exists use its starting balance, else if sandbox use its balance, otherwise use initial cash
  const baseline = mission ? mission.sandboxConfig.startingBalance : (sandbox ? sandbox.balance : cashBalance);
  const totalGainLoss = totalValue - baseline;
  const totalGainLossPercent = baseline ? (totalGainLoss / baseline) * 100 : 0;

  // Compute portfolio history from transactions
  const portfolioHistory = computePortfolioHistory(
    transactions,
    baseline,
    cashBalance,
    holdingsValue,
    stockDetails
  );

  const ExpandedModalWrapper = (props: {
    stock: StockDetail;
    onClose: () => void;
    timeframe: "day" | "month" | "year" | "all";
    setTimeframe: (timeframe: "day" | "month" | "year" | "all") => void;
    fetchStockDetail: (symbol: string) => Promise<void>;
    stockDetails: { [key: string]: StockDetail };
  }) => {
    const symbol = props.stock?.symbol;
    const holdings = symbol ? holdingsMap[symbol] || 0 : 0;
    return (
      <StockTradeModal
        {...props}
        cashBalance={cashBalance}
        holdings={holdings}
        onExecuteTrade={handleExecuteTrade}
      />
    );
  };

  // Debug: Log mission state
  console.log('[Render] Mission state:', mission ? mission.title : 'null', 'Cash balance:', cashBalance);

  // Handle buy/sell for newspaper layout
  const handleBuy = (symbol: string, quantity: number) => {
    const stock = stocks.find(s => s.symbol === symbol);
    if (stock) {
      handleExecuteTrade("Buy", symbol, stock.price, quantity);
    }
  };

  const handleSell = (symbol: string, quantity: number) => {
    const stock = stocks.find(s => s.symbol === symbol);
    if (stock) {
      handleExecuteTrade("Sell", symbol, stock.price, quantity);
    }
  };

  // If in mission mode, use the new newspaper layout
  if (mission) {
    return (
      <NewspaperMissionLayout
        mission={mission}
        stocks={filteredStocks}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onStockSelect={setSelectedStock}
        selectedStock={selectedStock}
        cashBalance={cashBalance}
        portfolioValue={totalValue}
        completedObjectives={completedObjectives}
        onBuy={handleBuy}
        onSell={handleSell}
        holdings={holdingsMap}
      />
    );
  }

  return (
    <div className="bg-[#fcfbf9] dark:bg-stone-900 min-h-screen">
      <main className="max-w-7xl mx-auto px-4 py-8 font-serif text-[#1a1a1a] dark:text-stone-100">

        {/* Newspaper Masthead */}
        <div className="border-b-4 border-black dark:border-stone-600 pb-4 mb-8">
          <div className="flex justify-between items-end mb-2">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-gray-500 dark:text-stone-400 mb-1">
                Interactive Environment
              </p>
              <h1 className="text-5xl md:text-6xl font-black font-serif tracking-tight text-black dark:text-white leading-none">
                {sandbox ? sandbox.name : "Market Sandbox"}
              </h1>
            </div>
            <div className="text-right hidden md:block">
              <p className="font-serif italic text-sm text-gray-500 dark:text-stone-400">
                Simulated Trading Floor
              </p>
              <p className="font-bold text-xs uppercase tracking-widest mt-1 dark:text-stone-300">Section E</p>
            </div>
          </div>
          <p className="text-lg font-serif italic text-gray-700 dark:text-stone-400 border-t border-black/10 dark:border-stone-700 pt-2">
            Test your thesis in a risk-free environment.
          </p>
        </div>

        <div className="flex flex-col lg:flex-row w-full gap-8 mb-12">
          {/* Stock Card Section - Newspaper Column */}
          <div className="w-full lg:w-1/2 border-2 border-black dark:border-stone-600 bg-stone-50 dark:bg-stone-800 p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] dark:shadow-[8px_8px_0px_0px_rgba(0,0,0,0.5)]">
            <h2 className="text-3xl font-black text-black dark:text-white mb-6 uppercase tracking-wide border-b-2 border-black dark:border-stone-600 pb-2">Market Scanner</h2>

            <div className="mb-6 relative">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 dark:text-stone-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Search stocks by symbol or company..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-10 py-3 border-2 border-black/20 dark:border-stone-600 focus:border-black dark:focus:border-stone-400 bg-white dark:bg-stone-900 dark:text-stone-100 rounded-none focus:outline-none transition-all font-serif placeholder:italic dark:placeholder:text-stone-500"
                />
                {searchQuery && (
                  <button
                    onClick={clearSearch}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-black dark:hover:text-white transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                )}
              </div>
              {searchQuery && (
                <p className="text-sm text-gray-500 dark:text-stone-400 mt-2 italic">
                  {filteredStocks.length} stock
                  {filteredStocks.length !== 1 ? "s" : ""} found
                </p>
              )}
            </div>

            <div className="flex justify-center">
              <div
                style={{
                  transform: "scale(0.9)",
                  transformOrigin: "top center",
                  width: "100%",
                  maxWidth: "650px",
                }}
              >
                <StockCardStack
                  stocks={stocks}
                  stockDetails={stockDetails}
                  currentIndex={currentIndex}
                  setCurrentIndex={setCurrentIndex}
                  timeframe={timeframe}
                  setTimeframe={setTimeframe}
                  checkAndLoadMore={checkAndLoadMore}
                  fetchStockDetail={fetchStockDetail}
                  ExpandedModal={ExpandedModalWrapper}
                />
              </div>
            </div>
          </div>

          {/* Portfolio Chart Section - Newspaper Column */}
          <div className="w-full lg:w-1/2 border-2 border-black dark:border-stone-600 bg-white dark:bg-stone-800 p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] dark:shadow-[8px_8px_0px_0px_rgba(0,0,0,0.5)]">
            <h2 className="text-3xl font-black text-black dark:text-white mb-6 uppercase tracking-wide border-b-2 border-black dark:border-stone-600 pb-2">Portfolio Analytics</h2>

            <PortfolioChart portfolioHistory={portfolioHistory} />
            <div className="mt-8 w-full border-t flex flex-col gap-4 pt-6 border-black/20 dark:border-stone-700">
              <PortfolioSummary
                totalValue={totalValue}
                cashBalance={cashBalance}
                totalGainLoss={totalGainLoss}
                totalGainLossPercent={totalGainLossPercent}
              />
            </div>
          </div>
        </div>

        {(
          /* Sandbox Mode Layout */
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
            <div className="border-t-4 border-black dark:border-stone-600 pt-6">
              <h3 className="text-xl font-bold uppercase tracking-widest mb-4 flex items-center gap-2 dark:text-white">
                <span className="w-3 h-3 bg-black dark:bg-green-500 inline-block"></span>
                Advisory Wire
              </h3>
              <div className="bg-white dark:bg-stone-800 border border-black dark:border-stone-600 p-4">
                <MarketTips />
              </div>
            </div>

            <div className="border-t-4 border-black dark:border-stone-600 pt-6">
              <h3 className="text-xl font-bold uppercase tracking-widest mb-4 flex items-center gap-2 dark:text-white">
                <span className="w-3 h-3 bg-black dark:bg-green-500 inline-block"></span>
                Transaction Ledger
              </h3>
              <div className="bg-white dark:bg-stone-800 border border-black dark:border-stone-600 p-4">
                <TransactionHistory transactions={transactions} />
              </div>
            </div>
          </div>
        )}

        {/* Transaction Ledger */}
        <div className="mb-12 border-t-4 border-black dark:border-stone-600 pt-6">
          <h3 className="text-xl font-bold uppercase tracking-widest mb-4 flex items-center gap-2 dark:text-white">
            <span className="w-3 h-3 bg-black dark:bg-green-500 inline-block"></span>
            Transaction Ledger
          </h3>
          <div className="bg-white dark:bg-stone-800 border border-black dark:border-stone-600 p-4">
            <TransactionHistory transactions={transactions} />
          </div>
        </div>

        {/* Sandbox actions (delete current sandbox) */}
        <div className="pt-6 flex justify-end border-t border-black dark:border-stone-600">
          {sandbox && (
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="bg-black dark:bg-red-600 text-white hover:bg-gray-800 dark:hover:bg-red-700 font-bold uppercase tracking-widest py-3 px-6 border-2 border-transparent hover:border-black dark:hover:border-red-500 transition-all"
              title="Delete this sandbox"
            >
              Delete Sandbox
            </button>
          )}
        </div>

        {showDeleteConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center font-serif">
            <div
              className="absolute inset-0 bg-black opacity-60 dark:opacity-70"
              onClick={() => {
                setShowDeleteConfirm(false);
                setDeleteConfirmText("");
              }}
            />
            <div className="relative bg-[#fcfbf9] dark:bg-stone-800 border-2 border-black dark:border-stone-600 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] dark:shadow-[8px_8px_0px_0px_rgba(0,0,0,0.5)] p-8 w-full max-w-md z-10">
              <h3 className="text-2xl font-black mb-4 dark:text-white">Confirm Termination</h3>
              <p className="text-lg text-gray-700 dark:text-stone-300 mb-6 leading-relaxed">
                To permanently delete the sandbox{" "}
                <span className="font-bold bg-yellow-200 dark:bg-yellow-700 dark:text-white px-1">{sandbox?.name}</span>, please type{" "}
                <span className="font-mono font-bold">delete</span> below.
              </p>
              <input
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                placeholder="Type 'delete' to confirm"
                className="w-full border-2 border-black dark:border-stone-600 bg-white dark:bg-stone-900 dark:text-stone-100 p-3 mb-6 focus:outline-none focus:bg-stone-50 dark:focus:bg-stone-800"
              />
              <div className="flex justify-end gap-4">
                <button
                  onClick={() => {
                    setShowDeleteConfirm(false);
                    setDeleteConfirmText("");
                  }}
                  className="px-6 py-2 border-2 border-black dark:border-stone-600 font-bold hover:bg-stone-100 dark:hover:bg-stone-700 dark:text-white"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    if (deleteConfirmText.trim().toLowerCase() === "delete") {
                      deleteCurrentSandbox();
                    }
                  }}
                  disabled={deleteConfirmText.trim().toLowerCase() !== "delete"}
                  className={`px-6 py-2 border-2 border-black dark:border-stone-600 font-bold text-white transition-all ${deleteConfirmText.trim().toLowerCase() === "delete"
                    ? "bg-red-600 hover:bg-red-700 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
                    : "bg-gray-400 dark:bg-stone-600 cursor-not-allowed border-gray-400 dark:border-stone-600"
                    }`}
                >
                  Confirm
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default function PortfolioDashboardPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <PortfolioDashboardPageContent />
    </Suspense>
  );
}
