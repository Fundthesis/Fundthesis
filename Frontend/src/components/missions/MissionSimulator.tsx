'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { ArrowLeft, Newspaper, AlertCircle } from 'lucide-react';
import Link from 'next/link';

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
import { getMissionNewsEvents, getEventsOnDay, getTriggeredEvents } from '@/lib/missionNewsEvents';

import { MissionSimulationControls } from './MissionSimulationControls';
import { MissionTimeline } from './MissionTimeline';
import { MissionHoldingsEnhanced } from './MissionHoldingsEnhanced';
import { MissionMarketChart } from './MissionMarketChart';
import { MissionAICoach } from './MissionAICoach';

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

interface Trade {
  id: string;
  day: number;
  symbol: string;
  action: 'buy' | 'sell';
  quantity: number;
  price: number;
  total: number;
  timestamp: Date;
}

interface MissionSimulatorProps {
  mission: Mission;
  onComplete?: (grade: 'S' | 'A' | 'B' | 'C' | 'F', stats: { returnPercent: number; maxDrawdown: number }) => void;
  onExit?: () => void;
}

export function MissionSimulator({ mission, onComplete, onExit }: MissionSimulatorProps) {
  // Initialize scenario configuration
  const scenarioConfig = SCENARIO_CONFIGS[mission.sandboxConfig.scenario] || SCENARIO_CONFIGS.neutral;
  const fullScenario: MissionScenario = {
    id: mission.id,
    name: mission.title,
    description: mission.description,
    durationDays: scenarioConfig.durationDays || 60,
    startDate: new Date(),
    phases: scenarioConfig.phases || [],
    triggerEvents: getMissionNewsEvents(mission.sandboxConfig.scenario),
    winCondition: scenarioConfig.winCondition || { type: 'return', target: 5, description: 'Achieve 5% return' },
    failCondition: scenarioConfig.failCondition || { type: 'drawdown', threshold: 30, description: 'Avoid 30% loss' },
  };

  // Simulation state
  const [isRunning, setIsRunning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [currentDay, setCurrentDay] = useState(0);
  const [speed, setSpeed] = useState(1);
  const [isComplete, setIsComplete] = useState(false);
  const [grade, setGrade] = useState<'S' | 'A' | 'B' | 'C' | 'F' | undefined>();

  // Portfolio state
  const [cashBalance, setCashBalance] = useState(mission.sandboxConfig.startingBalance);
  const [holdings, setHoldings] = useState<Record<string, { quantity: number; avgPrice: number }>>({});
  const [trades, setTrades] = useState<Trade[]>([]);
  const [portfolioHistory, setPortfolioHistory] = useState<{ day: number; value: number }[]>([]);
  const [maxDrawdown, setMaxDrawdown] = useState(0);
  const [peakValue, setPeakValue] = useState(mission.sandboxConfig.startingBalance);

  // Market state
  const [stocks, setStocks] = useState<SimulatedStock[]>(() => 
    MISSION_STOCKS.map(s => ({ ...s, priceHistory: [{ day: 0, price: s.basePrice, date: new Date() }] }))
  );
  const [selectedStock, setSelectedStock] = useState<SimulatedStock | null>(null);
  const [triggeredEvents, setTriggeredEvents] = useState<NewsEvent[]>([]);
  const [latestNews, setLatestNews] = useState<NewsEvent | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [tradeQuantity, setTradeQuantity] = useState('10');

  // Refs for simulation loop
  const simulationRef = useRef<NodeJS.Timeout | null>(null);

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

  // Calculate holdings for display
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

  // Advance simulation by one day
  const advanceDay = useCallback(() => {
    if (currentDay >= fullScenario.durationDays) {
      setIsComplete(true);
      setIsRunning(false);
      return;
    }

    const newDay = currentDay + 1;
    
    // Update stock prices
    setStocks(prevStocks => {
      const events = getTriggeredEvents(mission.sandboxConfig.scenario, newDay);
      
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

    // Check for new events
    const dayEvents = getEventsOnDay(mission.sandboxConfig.scenario, newDay);
    if (dayEvents.length > 0) {
      setTriggeredEvents(prev => [...prev, ...dayEvents]);
      setLatestNews(dayEvents[dayEvents.length - 1]);
    }

    // Update portfolio history
    const currentValue = calculatePortfolioValue();
    setPortfolioHistory(prev => [...prev, { day: newDay, value: currentValue }]);

    // Track peak and drawdown
    if (currentValue > peakValue) {
      setPeakValue(currentValue);
    }
    const drawdown = ((peakValue - currentValue) / peakValue) * 100;
    if (drawdown > maxDrawdown) {
      setMaxDrawdown(drawdown);
    }

    // Check fail condition
    if (drawdown >= fullScenario.failCondition.threshold) {
      setIsComplete(true);
      setIsRunning(false);
      setGrade('F');
    }

    setCurrentDay(newDay);
  }, [currentDay, fullScenario, mission.sandboxConfig.scenario, calculatePortfolioValue, peakValue, maxDrawdown]);

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

  // Check completion
  useEffect(() => {
    if (currentDay >= fullScenario.durationDays && !isComplete) {
      setIsComplete(true);
      setIsRunning(false);
      
      // Calculate final grade
      const portfolioValue = calculatePortfolioValue();
      const returnPercent = ((portfolioValue - mission.sandboxConfig.startingBalance) / mission.sandboxConfig.startingBalance) * 100;
      const diversificationScore = calculateDiversificationScore(
        getHoldingsForDisplay().map(h => ({ symbol: h.symbol, value: h.totalValue })),
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
      onComplete?.(finalGrade, { returnPercent, maxDrawdown });
    }
  }, [currentDay, fullScenario.durationDays, isComplete, calculatePortfolioValue, mission.sandboxConfig.startingBalance, getHoldingsForDisplay, stocks, maxDrawdown, fullScenario.winCondition, fullScenario.failCondition, onComplete]);

  // Handlers
  const handlePlay = () => {
    setIsRunning(true);
    setIsPaused(false);
  };

  const handlePause = () => {
    setIsPaused(true);
  };

  const handleResume = () => {
    setIsPaused(false);
  };

  const handleSpeedChange = (newSpeed: number) => {
    setSpeed(newSpeed);
  };

  const handleSkipDay = () => {
    advanceDay();
  };

  const handleReset = () => {
    setIsRunning(false);
    setIsPaused(false);
    setCurrentDay(0);
    setIsComplete(false);
    setGrade(undefined);
    setCashBalance(mission.sandboxConfig.startingBalance);
    setHoldings({});
    setTrades([]);
    setPortfolioHistory([{ day: 0, value: mission.sandboxConfig.startingBalance }]);
    setMaxDrawdown(0);
    setPeakValue(mission.sandboxConfig.startingBalance);
    setTriggeredEvents([]);
    setLatestNews(null);
    setStocks(MISSION_STOCKS.map(s => ({ ...s, priceHistory: [{ day: 0, price: s.basePrice, date: new Date() }] })));
  };

  const handleBuy = (symbol: string, quantity: number) => {
    const stock = stocks.find(s => s.symbol === symbol);
    if (!stock || quantity <= 0) return;

    const total = stock.currentPrice * quantity;
    if (total > cashBalance) return;

    setCashBalance(prev => prev - total);
    setHoldings(prev => {
      const existing = prev[symbol] || { quantity: 0, avgPrice: 0 };
      const newQuantity = existing.quantity + quantity;
      const newAvgPrice = (existing.quantity * existing.avgPrice + quantity * stock.currentPrice) / newQuantity;
      return { ...prev, [symbol]: { quantity: newQuantity, avgPrice: newAvgPrice } };
    });
    setTrades(prev => [...prev, {
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      day: currentDay,
      symbol,
      action: 'buy',
      quantity,
      price: stock.currentPrice,
      total,
      timestamp: new Date(),
    }]);
  };

  const handleSell = (symbol: string, quantity: number) => {
    const stock = stocks.find(s => s.symbol === symbol);
    const holding = holdings[symbol];
    if (!stock || !holding || quantity <= 0 || quantity > holding.quantity) return;

    const total = stock.currentPrice * quantity;
    setCashBalance(prev => prev + total);
    setHoldings(prev => {
      const newQuantity = prev[symbol].quantity - quantity;
      if (newQuantity <= 0) {
        const { [symbol]: removed, ...rest } = prev;
        return rest;
      }
      return { ...prev, [symbol]: { ...prev[symbol], quantity: newQuantity } };
    });
    setTrades(prev => [...prev, {
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      day: currentDay,
      symbol,
      action: 'sell',
      quantity,
      price: stock.currentPrice,
      total,
      timestamp: new Date(),
    }]);
  };

  const handleSelectStock = (symbol: string) => {
    const stock = stocks.find(s => s.symbol === symbol);
    setSelectedStock(stock || null);
  };

  // Filter stocks by search
  const filteredStocks = stocks.filter(s => 
    s.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.company.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const portfolioValue = calculatePortfolioValue();
  const returnPercent = ((portfolioValue - mission.sandboxConfig.startingBalance) / mission.sandboxConfig.startingBalance) * 100;
  const currentPhase = getCurrentPhase();
  const holdingsForDisplay = getHoldingsForDisplay();

  // Build timeline events from triggered news
  const timelineEvents = triggeredEvents.map(e => ({
    day: e.day,
    type: 'news' as const,
    title: e.headline,
    description: e.summary,
    impact: e.impact,
    isBreaking: e.isBreaking,
  }));

  return (
    <div className="min-h-screen bg-stone-100 dark:bg-stone-900">
      {/* Header */}
      <header className="bg-white dark:bg-stone-800 border-b-4 border-black dark:border-stone-700 p-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={onExit}
              className="p-2 border-2 border-black dark:border-stone-600 hover:bg-stone-100 dark:hover:bg-stone-700 transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-black dark:text-stone-100" />
            </button>
            <div>
              <h1 className="text-2xl font-black text-black dark:text-stone-100 uppercase tracking-tight">
                {mission.title}
              </h1>
              <p className="text-sm text-gray-600 dark:text-stone-400">{mission.subtitle}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className={`px-3 py-1 text-xs font-bold uppercase tracking-widest border-2 ${
              mission.difficulty === 'beginner' ? 'border-green-500 text-green-600 dark:text-green-400' :
              mission.difficulty === 'intermediate' ? 'border-yellow-500 text-yellow-600 dark:text-yellow-400' :
              mission.difficulty === 'advanced' ? 'border-orange-500 text-orange-600 dark:text-orange-400' :
              'border-red-500 text-red-600 dark:text-red-400'
            }`}>
              {mission.difficulty}
            </span>
          </div>
        </div>
      </header>

      {/* Breaking News Banner */}
      {latestNews && latestNews.isBreaking && (
        <div className="bg-red-600 text-white p-3 animate-pulse">
          <div className="max-w-7xl mx-auto flex items-center gap-3">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <div>
              <span className="font-black uppercase tracking-wide">Breaking:</span>{' '}
              <span className="font-bold">{latestNews.headline}</span>
            </div>
          </div>
        </div>
      )}

      {/* Main Simulation Controls */}
      <div className="max-w-7xl mx-auto px-4 py-4">
        <MissionSimulationControls
          isRunning={isRunning}
          isPaused={isPaused}
          currentDay={currentDay}
          totalDays={fullScenario.durationDays}
          speed={speed}
          currentPhase={currentPhase?.name || 'Starting'}
          portfolioValue={portfolioValue}
          initialValue={mission.sandboxConfig.startingBalance}
          maxDrawdown={maxDrawdown}
          failThreshold={fullScenario.failCondition.threshold}
          winTarget={fullScenario.winCondition.target}
          winConditionType={fullScenario.winCondition.type}
          onPlay={handlePlay}
          onPause={handlePause}
          onResume={handleResume}
          onSpeedChange={handleSpeedChange}
          onSkipDay={handleSkipDay}
          onReset={handleReset}
          isComplete={isComplete}
          grade={grade}
        />
      </div>

      {/* Main Content Grid */}
      <div className="max-w-7xl mx-auto px-4 pb-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column - Timeline & Holdings */}
          <div className="lg:col-span-3 space-y-6">
            <MissionTimeline
              currentDay={currentDay}
              totalDays={fullScenario.durationDays}
              events={timelineEvents}
              phases={fullScenario.phases}
              portfolioHistory={portfolioHistory}
            />
            <MissionHoldingsEnhanced
              holdings={holdingsForDisplay}
              stocks={stocks}
              cashBalance={cashBalance}
              initialBalance={mission.sandboxConfig.startingBalance}
              onSellStock={(symbol) => {
                const holding = holdings[symbol];
                if (holding) {
                  handleSell(symbol, 1);
                }
              }}
            />
          </div>

          {/* Center Column - Trading */}
          <div className="lg:col-span-6 space-y-6">
            {/* Market Chart */}
            <MissionMarketChart
              stock={selectedStock}
              currentDay={currentDay}
              onSelectStock={handleSelectStock}
              selectedSymbol={selectedStock?.symbol}
              allStocks={stocks}
              scenario={mission.sandboxConfig.scenario}
            />

            {/* Stock Search & Trading Panel */}
            <div className="bg-white dark:bg-stone-800 border-4 border-black dark:border-stone-700 p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] dark:shadow-[8px_8px_0px_0px_rgba(0,0,0,0.5)]">
              <h3 className="text-lg font-black uppercase tracking-wide text-black dark:text-stone-100 mb-4 border-b-2 border-black dark:border-stone-700 pb-2">
                Trade Stocks
              </h3>
              
              {/* Search */}
              <input
                type="text"
                placeholder="Search stocks..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-4 py-3 border-4 border-black dark:border-stone-700 bg-white dark:bg-stone-900 text-black dark:text-stone-100 mb-4 focus:outline-none"
              />

              {/* Stock List */}
              <div className="grid grid-cols-2 gap-3 max-h-64 overflow-y-auto mb-4">
                {filteredStocks.slice(0, 12).map((stock) => (
                  <button
                    key={stock.symbol}
                    onClick={() => setSelectedStock(stock)}
                    className={`p-3 border-2 text-left transition-all ${
                      selectedStock?.symbol === stock.symbol
                        ? 'border-black dark:border-stone-500 bg-black dark:bg-stone-700 text-white'
                        : 'border-gray-300 dark:border-stone-600 hover:border-black dark:hover:border-stone-500'
                    }`}
                  >
                    <p className={`font-bold ${selectedStock?.symbol === stock.symbol ? 'text-white' : 'text-black dark:text-stone-100'}`}>
                      {stock.symbol}
                    </p>
                    <p className={`text-xs ${selectedStock?.symbol === stock.symbol ? 'text-gray-300' : 'text-gray-500 dark:text-stone-400'}`}>
                      ${stock.currentPrice.toFixed(2)}
                    </p>
                  </button>
                ))}
              </div>

              {/* Trade Form */}
              {selectedStock && (
                <div className="border-t-2 border-black dark:border-stone-700 pt-4">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="flex-1">
                      <p className="text-xs uppercase tracking-widest text-gray-500 dark:text-stone-400">Selected</p>
                      <p className="text-xl font-black text-black dark:text-stone-100">{selectedStock.symbol}</p>
                    </div>
                    <div className="flex-1">
                      <p className="text-xs uppercase tracking-widest text-gray-500 dark:text-stone-400">Price</p>
                      <p className="text-xl font-black text-black dark:text-stone-100">${selectedStock.currentPrice.toFixed(2)}</p>
                    </div>
                    <div className="flex-1">
                      <p className="text-xs uppercase tracking-widest text-gray-500 dark:text-stone-400">Owned</p>
                      <p className="text-xl font-black text-black dark:text-stone-100">
                        {holdings[selectedStock.symbol]?.quantity || 0}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <input
                      type="number"
                      min="1"
                      value={tradeQuantity}
                      onChange={(e) => setTradeQuantity(e.target.value)}
                      className="w-24 px-3 py-2 border-4 border-black dark:border-stone-700 bg-white dark:bg-stone-900 text-black dark:text-stone-100 font-bold focus:outline-none"
                    />
                    <button
                      onClick={() => handleBuy(selectedStock.symbol, parseInt(tradeQuantity) || 0)}
                      disabled={!selectedStock || (parseInt(tradeQuantity) || 0) * selectedStock.currentPrice > cashBalance}
                      className="flex-1 py-3 border-4 border-black dark:border-stone-700 bg-green-500 text-white font-black uppercase disabled:bg-gray-300 disabled:text-gray-500 disabled:cursor-not-allowed hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
                    >
                      Buy
                    </button>
                    <button
                      onClick={() => handleSell(selectedStock.symbol, parseInt(tradeQuantity) || 0)}
                      disabled={!selectedStock || !holdings[selectedStock.symbol] || (parseInt(tradeQuantity) || 0) > (holdings[selectedStock.symbol]?.quantity || 0)}
                      className="flex-1 py-3 border-4 border-black dark:border-stone-700 bg-red-500 text-white font-black uppercase disabled:bg-gray-300 disabled:text-gray-500 disabled:cursor-not-allowed hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
                    >
                      Sell
                    </button>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-stone-400 mt-2">
                    Total: ${((parseInt(tradeQuantity) || 0) * selectedStock.currentPrice).toFixed(2)} • Cash: ${cashBalance.toFixed(2)}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Right Column - News & AI Coach */}
          <div className="lg:col-span-3 space-y-6">
            {/* News Feed */}
            <div className="bg-white dark:bg-stone-800 border-4 border-black dark:border-stone-700 p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] dark:shadow-[8px_8px_0px_0px_rgba(0,0,0,0.5)]">
              <div className="flex items-center gap-2 mb-4 border-b-2 border-black dark:border-stone-700 pb-2">
                <Newspaper className="w-5 h-5 text-black dark:text-stone-400" />
                <h3 className="text-lg font-black uppercase tracking-wide text-black dark:text-stone-100">
                  Market News
                </h3>
              </div>
              <div className="space-y-4 max-h-96 overflow-y-auto">
                {triggeredEvents.length === 0 ? (
                  <p className="text-gray-500 dark:text-stone-400 italic text-sm">
                    News will appear as the simulation progresses...
                  </p>
                ) : (
                  triggeredEvents.slice().reverse().map((event) => (
                    <div
                      key={event.id}
                      className={`p-3 border-l-4 ${
                        event.isBreaking ? 'border-red-500 bg-red-50 dark:bg-red-900/20' :
                        event.impact === 'positive' ? 'border-green-500 bg-green-50 dark:bg-green-900/20' :
                        event.impact === 'negative' ? 'border-red-400 bg-red-50 dark:bg-red-900/20' :
                        'border-gray-300 bg-gray-50 dark:bg-stone-800'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        {event.isBreaking && (
                          <span className="text-xs font-bold text-red-600 uppercase animate-pulse">Breaking</span>
                        )}
                        <span className="text-xs text-gray-500 dark:text-stone-400">Day {event.day}</span>
                      </div>
                      <p className="font-bold text-black dark:text-stone-100 text-sm">{event.headline}</p>
                      <p className="text-xs text-gray-600 dark:text-stone-400 mt-1">{event.summary}</p>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* AI Coach */}
            <MissionAICoach
              mission={mission}
              portfolioContext={{
                cashBalance,
                holdings: Object.fromEntries(
                  Object.entries(holdings).map(([k, v]) => [k, v.quantity])
                ),
                transactions: trades.map(t => ({
                  id: t.id,
                  ticker: t.symbol,
                  side: t.action,
                  price: t.price,
                  quantity: t.quantity,
                  executedAt: t.timestamp,
                })),
                totalValue: portfolioValue,
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
