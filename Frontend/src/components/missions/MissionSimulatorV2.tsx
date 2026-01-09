'use client';

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { 
  ArrowLeft, 
  Play,
  Pause,
  FastForward,
  SkipForward,
  RotateCcw,
  TrendingUp,
  TrendingDown,
  Minus,
  AlertCircle,
  Newspaper,
  Calendar,
  DollarSign,
  BarChart2,
  Clock,
  Target,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Activity,
  Zap,
} from 'lucide-react';

import { Mission } from '@/data/missions';
import { 
  SimulatedStock, 
  MISSION_STOCKS, 
  SCENARIO_CONFIGS, 
  MissionScenario,
  calculateStockPrice,
  calculateDiversificationScore,
  getMissionGrade,
  NewsEvent,
} from '@/lib/missionSimulation';
import { 
  getNewsEventsForDifficulty, 
  getEventsOnDayForDifficulty, 
  getTriggeredEventsForDifficulty 
} from '@/lib/missionNewsEvents';
import { 
  MissionDifficultyLevel, 
  MissionTrade, 
  PortfolioSnapshot,
  MissionGrade,
  DIFFICULTY_CONFIGS 
} from '@/lib/types/mission';

interface Holding {
  symbol: string;
  quantity: number;
  avgPrice: number;
  currentPrice: number;
  totalValue: number;
  gainLoss: number;
  gainLossPercent: number;
  sector?: string;
}

interface SimulationCompletionData {
  grade: MissionGrade;
  returnPercent: number;
  maxDrawdown: number;
  trades: MissionTrade[];
  portfolioHistory: PortfolioSnapshot[];
  initialBalance: number;
  finalBalance: number;
  durationDays: number;
}

interface MissionSimulatorV2Props {
  mission: Mission;
  initialHoldings: Record<string, { quantity: number; avgPrice: number }>;
  initialCash: number;
  difficulty?: MissionDifficultyLevel;
  onComplete?: (data: SimulationCompletionData) => void;
  onExit?: () => void;
}

export function MissionSimulatorV2({ 
  mission, 
  initialHoldings, 
  initialCash,
  difficulty = 'medium',
  onComplete, 
  onExit 
}: MissionSimulatorV2Props) {
  // Difficulty configuration
  const difficultyConfig = DIFFICULTY_CONFIGS[difficulty];
  
  // Scenario configuration
  const scenarioConfig = SCENARIO_CONFIGS[mission.sandboxConfig.scenario] || SCENARIO_CONFIGS.neutral;
  const fullScenario: MissionScenario = {
    id: mission.id,
    name: mission.title,
    description: mission.description,
    durationDays: difficultyConfig.timePressure || scenarioConfig.durationDays || 60,
    startDate: new Date(),
    phases: scenarioConfig.phases || [],
    triggerEvents: getNewsEventsForDifficulty(mission.sandboxConfig.scenario, difficulty),
    winCondition: scenarioConfig.winCondition || { type: 'return', target: 5, description: 'Achieve 5% return' },
    failCondition: scenarioConfig.failCondition || { type: 'drawdown', threshold: 30, description: 'Avoid 30% loss' },
  };

  // Simulation state
  const [isRunning, setIsRunning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [currentDay, setCurrentDay] = useState(0);
  const [speed, setSpeed] = useState(1);
  const [isComplete, setIsComplete] = useState(false);
  const [grade, setGrade] = useState<MissionGrade | undefined>();

  // Portfolio state
  const [cashBalance, setCashBalance] = useState(initialCash);
  const [holdings, setHoldings] = useState(initialHoldings);
  const [portfolioHistory, setPortfolioHistory] = useState<PortfolioSnapshot[]>([]);
  const [maxDrawdown, setMaxDrawdown] = useState(0);
  const [peakValue, setPeakValue] = useState(mission.sandboxConfig.startingBalance);
  
  // Trade tracking
  const [trades, setTrades] = useState<MissionTrade[]>([]);

  // Market state
  const [stocks, setStocks] = useState<SimulatedStock[]>(() => 
    MISSION_STOCKS.map(s => ({ 
      ...s, 
      currentPrice: s.basePrice,
      priceHistory: [{ day: 0, price: s.basePrice, date: new Date() }] 
    }))
  );
  const [triggeredEvents, setTriggeredEvents] = useState<NewsEvent[]>([]);
  const [latestNews, setLatestNews] = useState<NewsEvent | null>(null);
  const [showTradePanel, setShowTradePanel] = useState(false);
  const [selectedStock, setSelectedStock] = useState<SimulatedStock | null>(null);

  // Refs
  const simulationRef = useRef<NodeJS.Timeout | null>(null);
  const newsContainerRef = useRef<HTMLDivElement>(null);

  // Calculate initial portfolio value
  const initialValue = useMemo(() => {
    let holdingsValue = 0;
    Object.entries(initialHoldings).forEach(([symbol, h]) => {
      const stock = MISSION_STOCKS.find(s => s.symbol === symbol);
      if (stock) {
        holdingsValue += stock.basePrice * h.quantity;
      }
    });
    return initialCash + holdingsValue;
  }, [initialHoldings, initialCash]);

  // Calculate current portfolio value
  const calculatePortfolioValue = useCallback(() => {
    let holdingsValue = 0;
    Object.entries(holdings).forEach(([symbol, holding]) => {
      const stock = stocks.find(s => s.symbol === symbol);
      if (stock && holding.quantity > 0) {
        holdingsValue += holding.quantity * stock.currentPrice;
      }
    });
    return cashBalance + holdingsValue;
  }, [holdings, stocks, cashBalance]);

  // Get current phase
  const getCurrentPhase = useCallback(() => {
    return fullScenario.phases.find(p => currentDay >= p.startDay && currentDay <= p.endDay) || fullScenario.phases[0];
  }, [currentDay, fullScenario.phases]);

  // Get holdings for display
  const getHoldingsForDisplay = useCallback((): Holding[] => {
    return Object.entries(holdings)
      .filter(([, h]) => h.quantity > 0)
      .map(([symbol, holding]) => {
        const stock = stocks.find(s => s.symbol === symbol);
        const currentPrice = stock?.currentPrice || holding.avgPrice;
        const totalValue = holding.quantity * currentPrice;
        const costBasis = holding.quantity * holding.avgPrice;
        const gainLoss = totalValue - costBasis;
        const gainLossPercent = costBasis > 0 ? (gainLoss / costBasis) * 100 : 0;
        return {
          symbol,
          quantity: holding.quantity,
          avgPrice: holding.avgPrice,
          currentPrice,
          totalValue,
          gainLoss,
          gainLossPercent,
          sector: stock?.sector,
        };
      });
  }, [holdings, stocks]);

  const portfolioValue = calculatePortfolioValue();
  const returnPercent = ((portfolioValue - initialValue) / initialValue) * 100;
  const currentPhase = getCurrentPhase();
  const holdingsForDisplay = getHoldingsForDisplay();

  // Advance simulation
  const advanceDay = useCallback(() => {
    if (currentDay >= fullScenario.durationDays) {
      setIsComplete(true);
      setIsRunning(false);
      return;
    }

    const newDay = currentDay + 1;
    
    // Update stock prices
    setStocks(prevStocks => {
      const events = getTriggeredEventsForDifficulty(mission.sandboxConfig.scenario, newDay, difficulty);
      
      return prevStocks.map(stock => {
        const newPrice = calculateStockPrice(
          stock,
          newDay,
          mission.sandboxConfig.scenario,
          fullScenario,
          events,
          newDay * 1000 + stock.symbol.charCodeAt(0)
        );
        
        return {
          ...stock,
          currentPrice: newPrice,
          priceHistory: [
            ...stock.priceHistory,
            { day: newDay, price: newPrice, date: new Date() }
          ],
        };
      });
    });

    // Check for new events - use difficulty-aware function
    const dayEvents = getEventsOnDayForDifficulty(mission.sandboxConfig.scenario, newDay, difficulty);
    if (dayEvents.length > 0) {
      setTriggeredEvents(prev => [...prev, ...dayEvents]);
      setLatestNews(dayEvents[dayEvents.length - 1]);
      
      // Auto-scroll news container
      setTimeout(() => {
        if (newsContainerRef.current) {
          newsContainerRef.current.scrollTop = 0;
        }
      }, 100);
    }

    setCurrentDay(newDay);
  }, [currentDay, fullScenario, mission.sandboxConfig.scenario]);

  // Update portfolio history and drawdown tracking
  useEffect(() => {
    const value = calculatePortfolioValue();
    const holdingsValue = value - cashBalance;
    
    setPortfolioHistory(prev => {
      if (prev.length === 0 || prev[prev.length - 1].day !== currentDay) {
        const newSnapshot: PortfolioSnapshot = {
          day: currentDay,
          value,
          cash: cashBalance,
          holdingsValue,
        };
        return [...prev, newSnapshot];
      }
      return prev;
    });

    if (value > peakValue) {
      setPeakValue(value);
    }
    const drawdown = ((peakValue - value) / peakValue) * 100;
    if (drawdown > maxDrawdown) {
      setMaxDrawdown(drawdown);
    }

    // Check fail condition
    if (drawdown >= fullScenario.failCondition.threshold && !isComplete) {
      setIsComplete(true);
      setIsRunning(false);
      setGrade('F');
    }
  }, [currentDay, calculatePortfolioValue, peakValue, maxDrawdown, fullScenario.failCondition.threshold, isComplete]);

  // Simulation loop
  useEffect(() => {
    if (isRunning && !isPaused && !isComplete) {
      const intervalMs = 1000 / speed;
      simulationRef.current = setInterval(advanceDay, intervalMs);
    }
    return () => {
      if (simulationRef.current) {
        clearInterval(simulationRef.current);
      }
    };
  }, [isRunning, isPaused, isComplete, speed, advanceDay]);

  // Check completion and trigger callback
  useEffect(() => {
    if (currentDay >= fullScenario.durationDays && !isComplete) {
      setIsComplete(true);
      setIsRunning(false);
      
      const diversificationScore = calculateDiversificationScore(
        holdingsForDisplay.map(h => ({ symbol: h.symbol, value: h.totalValue })),
        stocks
      );
      
      const finalGrade = getMissionGrade(
        returnPercent,
        maxDrawdown,
        diversificationScore,
        fullScenario.winCondition,
        fullScenario.failCondition
      );
      
      setGrade(finalGrade);
      
      // Calculate final values
      const finalValue = calculatePortfolioValue();
      const holdingsValue = finalValue - cashBalance;
      
      // Pass full completion data
      onComplete?.({
        grade: finalGrade,
        returnPercent,
        maxDrawdown,
        trades,
        portfolioHistory: portfolioHistory.map(p => ({
          day: p.day,
          value: p.value,
          cash: cashBalance,
          holdingsValue: p.value - cashBalance,
        })),
        initialBalance: initialValue,
        finalBalance: finalValue,
        durationDays: currentDay,
      });
    }
  }, [currentDay, fullScenario.durationDays, isComplete, holdingsForDisplay, stocks, returnPercent, maxDrawdown, fullScenario.winCondition, fullScenario.failCondition, onComplete, trades, portfolioHistory, calculatePortfolioValue, cashBalance, initialValue]);

  // Handlers
  const handleStart = () => {
    setIsRunning(true);
    setIsPaused(false);
  };

  const handlePause = () => {
    setIsPaused(true);
  };

  const handleResume = () => {
    setIsPaused(false);
  };

  const handleSell = (symbol: string, quantity: number) => {
    const stock = stocks.find(s => s.symbol === symbol);
    const holding = holdings[symbol];
    if (!stock || !holding || quantity <= 0 || quantity > holding.quantity) return;

    const total = stock.currentPrice * quantity;
    
    // Track the trade
    const newTrade: MissionTrade = {
      id: `trade-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      day: currentDay,
      symbol,
      action: 'sell',
      quantity,
      price: stock.currentPrice,
      total,
      timestamp: new Date(),
      triggerReason: latestNews?.headline,
    };
    setTrades(prev => [...prev, newTrade]);
    
    setCashBalance(prev => prev + total);
    setHoldings(prev => {
      const newQuantity = prev[symbol].quantity - quantity;
      if (newQuantity <= 0) {
        const { [symbol]: _, ...rest } = prev;
        return rest;
      }
      return { ...prev, [symbol]: { ...prev[symbol], quantity: newQuantity } };
    });
  };

  const handleReset = () => {
    setIsRunning(false);
    setIsPaused(false);
    setCurrentDay(0);
    setIsComplete(false);
    setGrade(undefined);
    setCashBalance(initialCash);
    setHoldings(initialHoldings);
    setTrades([]);
    setPortfolioHistory([]);
    setMaxDrawdown(0);
    setPeakValue(initialValue);
    setTriggeredEvents([]);
    setLatestNews(null);
    setStocks(MISSION_STOCKS.map(s => ({ 
      ...s, 
      currentPrice: s.basePrice,
      priceHistory: [{ day: 0, price: s.basePrice, date: new Date() }] 
    })));
  };

  // Calculate chart data
  const chartData = useMemo(() => {
    if (portfolioHistory.length < 2) return null;
    
    const minValue = Math.min(...portfolioHistory.map(p => p.value)) * 0.98;
    const maxValue = Math.max(...portfolioHistory.map(p => p.value)) * 1.02;
    const range = maxValue - minValue;
    
    const points = portfolioHistory.map((p, i) => {
      const x = (i / (portfolioHistory.length - 1)) * 100;
      const y = 100 - ((p.value - minValue) / range) * 100;
      return { x, y, value: p.value, day: p.day };
    });
    
    const pathD = points.map((p, i) => 
      `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`
    ).join(' ');
    
    const areaD = pathD + ` L ${points[points.length - 1].x} 100 L ${points[0].x} 100 Z`;
    
    return { points, pathD, areaD, minValue, maxValue };
  }, [portfolioHistory]);

  // Get top movers
  const topMovers = useMemo(() => {
    const heldSymbols = Object.keys(holdings);
    return stocks
      .filter(s => heldSymbols.includes(s.symbol))
      .map(s => ({
        ...s,
        change: ((s.currentPrice - s.basePrice) / s.basePrice) * 100
      }))
      .sort((a, b) => Math.abs(b.change) - Math.abs(a.change))
      .slice(0, 5);
  }, [stocks, holdings]);

  const progressPercent = (currentDay / fullScenario.durationDays) * 100;

  return (
    <div className="min-h-screen bg-stone-100 dark:bg-gradient-to-br dark:from-stone-950 dark:via-stone-900 dark:to-stone-950 text-stone-900 dark:text-white">
      {/* Breaking News Banner */}
      {latestNews && latestNews.isBreaking && (
        <div className="bg-red-600 text-white py-2 px-4 animate-pulse">
          <div className="max-w-7xl mx-auto flex items-center gap-3">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <span className="font-bold uppercase tracking-wide text-sm">Breaking News:</span>
            <span className="font-medium">{latestNews.headline}</span>
          </div>
        </div>
      )}

      {/* Header Bar */}
      <header className="border-b border-stone-300 dark:border-stone-800 bg-white/80 dark:bg-stone-900/50 backdrop-blur-sm sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={onExit}
                className="p-2 text-stone-500 dark:text-stone-400 hover:text-stone-900 dark:hover:text-white transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <h1 className="text-xl font-bold text-stone-900 dark:text-white">{mission.title}</h1>
                <p className="text-sm text-stone-600 dark:text-stone-400">{currentPhase?.name || 'Starting'}</p>
              </div>
            </div>

            <div className="flex items-center gap-6">
              {/* Day Counter */}
              <div className="text-center">
                <div className="text-2xl font-mono font-bold text-amber-400">
                  Day {currentDay}
                </div>
                <div className="text-xs text-stone-500">of {fullScenario.durationDays}</div>
              </div>

              {/* Control Buttons */}
              <div className="flex items-center gap-2">
                {!isRunning ? (
                  <button
                    onClick={handleStart}
                    disabled={isComplete}
                    className="px-4 py-2 bg-green-600 hover:bg-green-500 disabled:bg-stone-700 text-white font-bold flex items-center gap-2 transition-colors"
                  >
                    <Play className="w-4 h-4" />
                    Start
                  </button>
                ) : isPaused ? (
                  <button
                    onClick={handleResume}
                    className="px-4 py-2 bg-green-600 hover:bg-green-500 text-white font-bold flex items-center gap-2 transition-colors"
                  >
                    <Play className="w-4 h-4" />
                    Resume
                  </button>
                ) : (
                  <button
                    onClick={handlePause}
                    className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white font-bold flex items-center gap-2 transition-colors"
                  >
                    <Pause className="w-4 h-4" />
                    Pause
                  </button>
                )}

                <button
                  onClick={() => advanceDay()}
                  disabled={isComplete || (isRunning && !isPaused)}
                  className="p-2 bg-stone-700 hover:bg-stone-600 disabled:opacity-50 text-white transition-colors"
                  title="Skip one day"
                >
                  <SkipForward className="w-4 h-4" />
                </button>

                <button
                  onClick={handleReset}
                  className="p-2 bg-stone-700 hover:bg-stone-600 text-white transition-colors"
                  title="Reset simulation"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>

                {/* Speed Controls */}
                <div className="flex items-center gap-1 ml-2 bg-stone-800 rounded overflow-hidden">
                  {[1, 2, 5, 10].map(s => (
                    <button
                      key={s}
                      onClick={() => setSpeed(s)}
                      className={`px-2 py-1 text-xs font-mono transition-colors ${
                        speed === s 
                          ? 'bg-amber-600 text-white' 
                          : 'text-stone-400 hover:text-white hover:bg-stone-700'
                      }`}
                    >
                      {s}x
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="mt-4 relative">
            <div className="h-1 bg-stone-800 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-amber-600 to-amber-400 transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              ></div>
            </div>
            {/* Phase markers */}
            <div className="absolute top-2 left-0 right-0 flex justify-between text-[10px] text-stone-500">
              {fullScenario.phases.map((phase, i) => {
                const leftPercent = (phase.startDay / fullScenario.durationDays) * 100;
                return (
                  <div 
                    key={i} 
                    className={`absolute transform -translate-x-1/2 ${currentDay >= phase.startDay && currentDay <= phase.endDay ? 'text-amber-400' : ''}`}
                    style={{ left: `${leftPercent}%` }}
                  >
                    {phase.name}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-12 gap-6">
          {/* Left Column - Portfolio & Chart */}
          <div className="col-span-8 space-y-6">
            {/* Portfolio Value Card */}
            <div className="bg-white dark:bg-stone-900/50 border border-stone-300 dark:border-stone-800 p-6 shadow-lg dark:shadow-none">
              <div className="flex items-start justify-between mb-6">
                <div>
                  <div className="text-stone-600 dark:text-stone-400 text-sm mb-1">Portfolio Value</div>
                  <div className="text-4xl font-bold font-mono text-stone-900 dark:text-white">
                    ${portfolioValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                  <div className={`flex items-center gap-2 mt-2 ${returnPercent >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                    {returnPercent >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                    <span className="font-mono font-bold">{returnPercent >= 0 ? '+' : ''}{returnPercent.toFixed(2)}%</span>
                    <span className="text-stone-500 text-sm">
                      (${(portfolioValue - initialValue).toFixed(2)})
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-6 text-right">
                  <div>
                    <div className="text-stone-500 text-xs uppercase tracking-wider">Cash</div>
                    <div className="text-lg font-mono text-stone-900 dark:text-white">${cashBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
                  </div>
                  <div>
                    <div className="text-stone-500 text-xs uppercase tracking-wider">Max Drawdown</div>
                    <div className={`text-lg font-mono ${maxDrawdown > 20 ? 'text-red-600 dark:text-red-400' : maxDrawdown > 10 ? 'text-yellow-600 dark:text-yellow-400' : 'text-green-600 dark:text-green-400'}`}>
                      -{maxDrawdown.toFixed(1)}%
                    </div>
                  </div>
                  <div>
                    <div className="text-stone-500 text-xs uppercase tracking-wider">Win Target</div>
                    <div className={`text-lg font-mono ${returnPercent >= fullScenario.winCondition.target ? 'text-green-600 dark:text-green-400' : 'text-stone-600 dark:text-stone-400'}`}>
                      {fullScenario.winCondition.target}%
                    </div>
                  </div>
                </div>
              </div>

              {/* Portfolio Chart */}
              <div className="h-48 relative">
                {chartData ? (
                  <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="w-full h-full">
                    <defs>
                      <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={returnPercent >= 0 ? 'rgb(34, 197, 94)' : 'rgb(239, 68, 68)'} stopOpacity="0.3" />
                        <stop offset="100%" stopColor={returnPercent >= 0 ? 'rgb(34, 197, 94)' : 'rgb(239, 68, 68)'} stopOpacity="0" />
                      </linearGradient>
                    </defs>
                    <path d={chartData.areaD} fill="url(#chartGradient)" />
                    <path 
                      d={chartData.pathD} 
                      fill="none" 
                      stroke={returnPercent >= 0 ? 'rgb(34, 197, 94)' : 'rgb(239, 68, 68)'} 
                      strokeWidth="0.5"
                    />
                  </svg>
                ) : (
                  <div className="flex items-center justify-center h-full text-stone-400 dark:text-stone-600">
                    <Activity className="w-8 h-8 mr-2" />
                    <span>Chart will appear as simulation runs</span>
                  </div>
                )}
              </div>
            </div>

            {/* Holdings */}
            <div className="bg-white dark:bg-stone-900/50 border border-stone-300 dark:border-stone-800 p-6 shadow-lg dark:shadow-none">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold flex items-center gap-2 text-stone-900 dark:text-white">
                  <BarChart2 className="w-5 h-5 text-amber-600 dark:text-amber-500" />
                  Your Holdings
                </h3>
                <button
                  onClick={() => setShowTradePanel(!showTradePanel)}
                  className="text-sm text-amber-600 dark:text-amber-400 hover:text-amber-500 dark:hover:text-amber-300 flex items-center gap-1"
                >
                  {showTradePanel ? 'Hide' : 'Show'} Trade Panel
                  {showTradePanel ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>
              </div>

              {holdingsForDisplay.length === 0 ? (
                <p className="text-stone-500 italic">No holdings - simulation running on cash</p>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  {holdingsForDisplay.map(holding => (
                    <div 
                      key={holding.symbol}
                      className={`p-4 border transition-colors ${
                        holding.gainLossPercent >= 0 
                          ? 'border-green-300 dark:border-green-900/50 bg-green-50 dark:bg-green-900/10' 
                          : 'border-red-300 dark:border-red-900/50 bg-red-50 dark:bg-red-900/10'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="font-bold text-lg text-stone-900 dark:text-white">{holding.symbol}</div>
                          <div className="text-xs text-stone-500">{holding.quantity} shares</div>
                        </div>
                        <div className="text-right">
                          <div className="font-mono text-stone-900 dark:text-white">${holding.totalValue.toFixed(2)}</div>
                          <div className={`text-sm font-mono ${holding.gainLossPercent >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                            {holding.gainLossPercent >= 0 ? '+' : ''}{holding.gainLossPercent.toFixed(1)}%
                          </div>
                        </div>
                      </div>
                      
                      {showTradePanel && (isPaused || !isRunning) && (
                        <div className="mt-3 pt-3 border-t border-stone-200 dark:border-stone-700 flex gap-2">
                          <button
                            onClick={() => handleSell(holding.symbol, 1)}
                            className="flex-1 py-1 text-xs bg-red-100 dark:bg-red-600/20 text-red-600 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-600/30 transition-colors"
                          >
                            Sell 1
                          </button>
                          <button
                            onClick={() => handleSell(holding.symbol, Math.floor(holding.quantity / 2))}
                            className="flex-1 py-1 text-xs bg-red-100 dark:bg-red-600/20 text-red-600 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-600/30 transition-colors"
                          >
                            Sell Half
                          </button>
                          <button
                            onClick={() => handleSell(holding.symbol, holding.quantity)}
                            className="flex-1 py-1 text-xs bg-red-100 dark:bg-red-600/20 text-red-600 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-600/30 transition-colors"
                          >
                            Sell All
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Top Movers */}
            {topMovers.length > 0 && (
              <div className="bg-white dark:bg-stone-900/50 border border-stone-300 dark:border-stone-800 p-6 shadow-lg dark:shadow-none">
                <h3 className="text-sm font-bold uppercase tracking-wider text-stone-600 dark:text-stone-400 mb-4">
                  Your Stock Performance
                </h3>
                <div className="flex gap-4">
                  {topMovers.map(stock => (
                    <div 
                      key={stock.symbol}
                      className={`flex-1 p-3 border ${
                        stock.change >= 0 ? 'border-green-300 dark:border-green-900/50' : 'border-red-300 dark:border-red-900/50'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-stone-900 dark:text-white">{stock.symbol}</span>
                        <span className={`font-mono text-sm ${stock.change >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                          {stock.change >= 0 ? '+' : ''}{stock.change.toFixed(1)}%
                        </span>
                      </div>
                      <div className="text-stone-500 text-xs mt-1">${stock.currentPrice.toFixed(2)}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right Column - News Feed */}
          <div className="col-span-4">
            <div className="bg-white dark:bg-stone-900/50 border border-stone-300 dark:border-stone-800 p-6 sticky top-32 shadow-lg dark:shadow-none">
              <div className="flex items-center gap-2 mb-4">
                <Newspaper className="w-5 h-5 text-amber-600 dark:text-amber-500" />
                <h3 className="text-lg font-bold text-stone-900 dark:text-white">Market News</h3>
                {triggeredEvents.length > 0 && (
                  <span className="ml-auto text-xs text-stone-500">{triggeredEvents.length} stories</span>
                )}
              </div>

              <div 
                ref={newsContainerRef}
                className="space-y-4 max-h-[calc(100vh-300px)] overflow-y-auto pr-2"
              >
                {triggeredEvents.length === 0 ? (
                  <div className="text-center py-12">
                    <Clock className="w-12 h-12 text-stone-400 dark:text-stone-700 mx-auto mb-4" />
                    <p className="text-stone-500">News will appear as time passes...</p>
                    <p className="text-stone-400 dark:text-stone-600 text-sm mt-2">Start the simulation to see market events</p>
                  </div>
                ) : (
                  [...triggeredEvents].reverse().map((event, index) => (
                    <article 
                      key={event.id}
                      className={`p-4 border-l-4 transition-all ${
                        index === 0 && latestNews?.id === event.id ? 'animate-pulse' : ''
                      } ${
                        event.isBreaking 
                          ? 'border-red-500 bg-red-50 dark:bg-red-900/20' 
                          : event.impact === 'positive'
                            ? 'border-green-500 bg-green-50 dark:bg-green-900/10'
                            : event.impact === 'negative'
                              ? 'border-red-400 bg-red-50 dark:bg-red-900/10'
                              : 'border-stone-400 dark:border-stone-600 bg-stone-50 dark:bg-stone-800/30'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-xs font-mono text-stone-500">Day {event.day}</span>
                        {event.isBreaking && (
                          <span className="px-1.5 py-0.5 bg-red-600 text-white text-[10px] uppercase font-bold animate-pulse">
                            Breaking
                          </span>
                        )}
                        <span className={`text-xs ${
                          event.impact === 'positive' ? 'text-green-600 dark:text-green-400' :
                          event.impact === 'negative' ? 'text-red-600 dark:text-red-400' :
                          'text-stone-500'
                        }`}>
                          {event.impact === 'positive' ? '↑' : event.impact === 'negative' ? '↓' : '—'} {event.source}
                        </span>
                      </div>
                      <h4 className="font-bold text-stone-900 dark:text-white mb-1">{event.headline}</h4>
                      <p className="text-sm text-stone-600 dark:text-stone-400">{event.summary}</p>
                      {event.affectedSectors && event.affectedSectors.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {event.affectedSectors.slice(0, 3).map(sector => (
                            <span 
                              key={sector}
                              className="px-1.5 py-0.5 bg-stone-200 dark:bg-stone-800 text-stone-600 dark:text-stone-400 text-[10px] uppercase"
                            >
                              {sector}
                            </span>
                          ))}
                        </div>
                      )}
                    </article>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Mission Complete Modal */}
      {isComplete && (
        <div className="fixed inset-0 bg-black/60 dark:bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-stone-900 border border-stone-300 dark:border-stone-700 max-w-lg w-full p-8 text-center shadow-2xl">
            <div className={`text-6xl font-black mb-4 ${
              grade === 'S' ? 'text-amber-500 dark:text-amber-400' :
              grade === 'A' ? 'text-green-500 dark:text-green-400' :
              grade === 'B' ? 'text-blue-500 dark:text-blue-400' :
              grade === 'C' ? 'text-yellow-500 dark:text-yellow-400' :
              'text-red-500 dark:text-red-400'
            }`}>
              {grade}
            </div>
            <h2 className="text-2xl font-bold mb-2 text-stone-900 dark:text-white">Mission Complete</h2>
            <p className="text-stone-600 dark:text-stone-400 mb-6">
              {grade === 'F' 
                ? 'You hit the fail condition. Better luck next time!'
                : grade === 'S' || grade === 'A'
                  ? 'Excellent performance! You mastered this scenario.'
                  : 'You completed the mission. Review your performance to improve.'
              }
            </p>

            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="bg-stone-100 dark:bg-stone-800 p-4">
                <div className="text-stone-500 text-xs uppercase mb-1">Final Return</div>
                <div className={`text-2xl font-mono font-bold ${returnPercent >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                  {returnPercent >= 0 ? '+' : ''}{returnPercent.toFixed(2)}%
                </div>
              </div>
              <div className="bg-stone-100 dark:bg-stone-800 p-4">
                <div className="text-stone-500 text-xs uppercase mb-1">Max Drawdown</div>
                <div className="text-2xl font-mono font-bold text-orange-500 dark:text-orange-400">
                  -{maxDrawdown.toFixed(1)}%
                </div>
              </div>
            </div>

            <div className="flex gap-4">
              <button
                onClick={handleReset}
                className="flex-1 py-3 border border-stone-400 dark:border-stone-600 text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
              >
                Try Again
              </button>
              <button
                onClick={onExit}
                className="flex-1 py-3 bg-amber-600 hover:bg-amber-500 text-white font-bold transition-colors"
              >
                Back to Missions
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
