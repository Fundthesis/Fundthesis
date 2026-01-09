'use client';

import React, { useState, useEffect } from 'react';
import { Mission } from '@/data/missions';
import { Search, TrendingUp, TrendingDown, DollarSign, Target, Newspaper, MessageSquare } from 'lucide-react';
import { MissionContextPanel } from './MissionContextPanel';
import { MissionNewsFeed } from './MissionNewsFeed';
import { MissionAICoach } from './MissionAICoach';
import { MissionControlBar } from './MissionControlBar';
import { MissionHoldings } from './MissionHoldings';

interface Stock {
  symbol: string;
  company: string;
  price: number;
  change: number;
  changePercent: number;
}

interface Holding {
  symbol: string;
  quantity: number;
  avgPrice: number;
  currentPrice: number;
  totalValue: number;
  gainLoss: number;
  gainLossPercent: number;
}

interface NewspaperMissionLayoutProps {
  mission: Mission;
  stocks: Stock[];
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onStockSelect: (stock: Stock) => void;
  selectedStock: Stock | null;
  cashBalance: number;
  portfolioValue: number;
  completedObjectives: string[];
  onBuy: (symbol: string, quantity: number) => void;
  onSell: (symbol: string, quantity: number) => void;
  holdings: { [symbol: string]: number };
  // Mission session props
  isPaused: boolean;
  onPause: () => void;
  onResume: () => void;
  simulatedDate: Date;
  elapsedSeconds: number;
  timeSpeed: number;
  onTimeSpeedChange: (speed: number) => void;
  // Holdings data
  holdingsData: Holding[];
  isLoadingHoldings?: boolean;
  accountId?: string;
}

export function NewspaperMissionLayout({
  mission,
  stocks,
  searchQuery,
  onSearchChange,
  onStockSelect,
  selectedStock,
  cashBalance,
  portfolioValue,
  completedObjectives,
  onBuy,
  onSell,
  holdings,
  isPaused,
  onPause,
  onResume,
  simulatedDate,
  elapsedSeconds,
  timeSpeed,
  onTimeSpeedChange,
  holdingsData,
  isLoadingHoldings,
  accountId,
}: NewspaperMissionLayoutProps) {
  const [quantity, setQuantity] = useState<string>('1');
  const [showTradingPanel, setShowTradingPanel] = useState(false);
  
  // Auto-show trading panel when stock is selected
  useEffect(() => {
    if (selectedStock) {
      setShowTradingPanel(true);
    } else {
      setShowTradingPanel(false);
    }
  }, [selectedStock]);

  const selectedHoldings = selectedStock ? (holdings[selectedStock.symbol] || 0) : 0;
  const canBuy = selectedStock && cashBalance >= (selectedStock.price * parseFloat(quantity || '0'));
  const canSell = selectedStock && selectedHoldings >= parseFloat(quantity || '0');

  const handleTrade = (action: 'buy' | 'sell') => {
    if (!selectedStock || !quantity) return;
    const qty = parseInt(quantity);
    if (qty <= 0) return;
    
    if (action === 'buy' && canBuy) {
      onBuy(selectedStock.symbol, qty);
      setQuantity('1');
    } else if (action === 'sell' && canSell) {
      onSell(selectedStock.symbol, qty);
      setQuantity('1');
    }
  };

  // Format simulated date for newspaper
  const dateString = simulatedDate.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const handleQuickBuy = () => {
    if (selectedStock) {
      onBuy(selectedStock.symbol, 1);
    }
  };

  const handleQuickSell = () => {
    if (selectedStock) {
      onSell(selectedStock.symbol, 1);
    }
  };

  return (
    <div className="bg-[#fcfbf9] dark:bg-stone-900 min-h-screen">
      {/* Top Control Bar */}
      <MissionControlBar
        isPaused={isPaused}
        onPause={onPause}
        onResume={onResume}
        simulatedDate={simulatedDate}
        elapsedSeconds={elapsedSeconds}
        timeSpeed={timeSpeed}
        onTimeSpeedChange={onTimeSpeedChange}
        cashBalance={cashBalance}
        portfolioValue={portfolioValue}
        selectedStock={selectedStock}
        onQuickBuy={handleQuickBuy}
        onQuickSell={handleQuickSell}
        canBuy={canBuy}
        canSell={canSell}
      />
      
      <main className="max-w-7xl mx-auto px-4 py-6 font-serif">
        {/* Newspaper Masthead */}
        <header className="border-b-8 border-black dark:border-stone-700 pb-6 mb-8">
          <div className="flex justify-between items-start mb-4">
            <div className="flex-1">
              <div className="flex items-baseline gap-4 mb-2">
                <h1 className="text-7xl md:text-9xl font-black tracking-tighter text-black dark:text-stone-100 uppercase leading-none">
                  {mission.title.split(' ')[0]}
                </h1>
                <div className="flex-1 border-t-4 border-black dark:border-stone-700 pt-2">
                  <p className="text-xs uppercase tracking-widest text-gray-500 dark:text-stone-400 font-bold">
                    {dateString.toUpperCase()}
                  </p>
                </div>
              </div>
              <h2 className="text-4xl md:text-5xl font-bold text-black dark:text-stone-100 italic mb-2">
                {mission.title.split(' ').slice(1).join(' ')}
              </h2>
              <p className="text-lg text-gray-700 dark:text-stone-300 leading-relaxed max-w-3xl">
                {mission.description}
              </p>
            </div>
            <div className="text-right hidden lg:block ml-8">
              <div className="border-4 border-black dark:border-stone-700 p-4 bg-white dark:bg-stone-800">
                <p className="text-xs uppercase tracking-widest text-gray-500 dark:text-stone-400 mb-1">Portfolio Value</p>
                <p className="text-3xl font-black text-black dark:text-stone-100">
                  ${portfolioValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
                <p className="text-xs text-gray-600 dark:text-stone-400 mt-1">Cash: ${cashBalance.toLocaleString()}</p>
              </div>
            </div>
          </div>
        </header>

        {/* Main Newspaper Layout - 3 Column Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-8">
          {/* Left Column - Mission Context & Holdings */}
          <div className="lg:col-span-3 space-y-6">
            <MissionContextPanel
              mission={mission}
              completedObjectives={completedObjectives}
              portfolioValue={portfolioValue}
              startingBalance={mission.sandboxConfig.startingBalance}
            />
            <MissionHoldings holdings={holdingsData} isLoading={isLoadingHoldings} />
          </div>

          {/* Center Column - Main Trading Area (Where image would be in newspaper) */}
          <div className="lg:col-span-6 border-4 border-black dark:border-stone-700 bg-white dark:bg-stone-800 p-8 shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] dark:shadow-[12px_12px_0px_0px_rgba(255,255,255,0.1)]">
            {/* Stock Search */}
            <div className="mb-6">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-stone-500 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Search for a stock symbol or company..."
                  value={searchQuery}
                  onChange={(e) => onSearchChange(e.target.value)}
                  className="w-full pl-12 pr-4 py-4 border-4 border-black dark:border-stone-700 bg-white dark:bg-stone-900 text-black dark:text-stone-100 text-lg font-serif focus:outline-none focus:ring-4 focus:ring-black/20 dark:focus:ring-stone-500"
                />
              </div>
            </div>

            {/* Stock List */}
            <div className="space-y-3 mb-6 max-h-96 overflow-y-auto">
              {stocks.length === 0 ? (
                <p className="text-center text-gray-500 dark:text-stone-400 italic py-8">
                  No stocks found. Try a different search.
                </p>
              ) : (
                stocks.map((stock) => (
                  <button
                    key={stock.symbol}
                    onClick={() => {
                      onStockSelect(stock);
                      setShowTradingPanel(true);
                    }}
                    className={`w-full text-left p-4 border-2 transition-all ${
                      selectedStock?.symbol === stock.symbol
                        ? 'border-black dark:border-stone-500 bg-black dark:bg-stone-700 text-white dark:text-stone-100 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,0.2)]'
                        : 'border-black/20 dark:border-stone-700 bg-white dark:bg-stone-900 hover:border-black dark:hover:border-stone-500 hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] dark:hover:shadow-[2px_2px_0px_0px_rgba(255,255,255,0.1)]'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-2xl font-black text-black dark:text-stone-100">{stock.symbol}</h3>
                        <p className="text-sm text-gray-600 dark:text-stone-400">{stock.company}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold text-black dark:text-stone-100">
                          ${stock.price.toFixed(2)}
                        </p>
                        <div className={`flex items-center gap-1 text-sm font-bold ${
                          stock.change >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                        }`}>
                          {stock.change >= 0 ? (
                            <TrendingUp className="w-4 h-4" />
                          ) : (
                            <TrendingDown className="w-4 h-4" />
                          )}
                          <span>
                            {stock.change >= 0 ? '+' : ''}{stock.change.toFixed(2)} ({stock.changePercent >= 0 ? '+' : ''}{stock.changePercent.toFixed(2)}%)
                          </span>
                        </div>
                      </div>
                    </div>
                    {holdings[stock.symbol] > 0 && (
                      <p className="text-xs text-gray-500 dark:text-stone-400 mt-2">
                        You own {holdings[stock.symbol]} shares
                      </p>
                    )}
                  </button>
                ))
              )}
            </div>

            {/* Integrated Trading Panel - Main Feature (where image would be) */}
            {selectedStock && showTradingPanel && (
              <div className="border-4 border-black dark:border-stone-700 bg-stone-50 dark:bg-stone-900 p-6 mt-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-2xl font-black text-black dark:text-stone-100 uppercase">
                    Trade {selectedStock.symbol}
                  </h3>
                  <button
                    onClick={() => setShowTradingPanel(false)}
                    className="text-gray-500 hover:text-black dark:hover:text-stone-100"
                  >
                    ×
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="border-2 border-black dark:border-stone-700 p-4 bg-white dark:bg-stone-800">
                    <p className="text-xs uppercase tracking-widest text-gray-500 dark:text-stone-400 mb-1">Current Price</p>
                    <p className="text-3xl font-black text-black dark:text-stone-100">
                      ${selectedStock.price.toFixed(2)}
                    </p>
                  </div>
                  <div className="border-2 border-black dark:border-stone-700 p-4 bg-white dark:bg-stone-800">
                    <p className="text-xs uppercase tracking-widest text-gray-500 dark:text-stone-400 mb-1">Your Holdings</p>
                    <p className="text-3xl font-black text-black dark:text-stone-100">
                      {selectedHoldings}
                    </p>
                  </div>
                </div>

                <div className="mb-6">
                  <label className="block text-sm font-bold uppercase tracking-widest text-black dark:text-stone-100 mb-2">
                    Quantity
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    className="w-full px-4 py-3 border-4 border-black dark:border-stone-700 bg-white dark:bg-stone-900 text-black dark:text-stone-100 text-lg font-serif focus:outline-none"
                  />
                  <p className="text-xs text-gray-500 dark:text-stone-400 mt-1">
                    Total: ${(selectedStock.price * parseFloat(quantity || '0')).toFixed(2)}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <button
                    onClick={() => handleTrade('buy')}
                    disabled={!canBuy}
                    className={`py-4 px-6 border-4 border-black dark:border-stone-700 font-black text-lg uppercase transition-all ${
                      canBuy
                        ? 'bg-green-500 dark:bg-green-600 text-white hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] dark:hover:shadow-[6px_6px_0px_0px_rgba(255,255,255,0.2)]'
                        : 'bg-gray-300 dark:bg-stone-700 text-gray-500 dark:text-stone-500 cursor-not-allowed'
                    }`}
                  >
                    <div className="flex items-center justify-center gap-2">
                      <TrendingUp className="w-5 h-5" />
                      Buy
                    </div>
                  </button>
                  <button
                    onClick={() => handleTrade('sell')}
                    disabled={!canSell}
                    className={`py-4 px-6 border-4 border-black dark:border-stone-700 font-black text-lg uppercase transition-all ${
                      canSell
                        ? 'bg-red-500 dark:bg-red-600 text-white hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] dark:hover:shadow-[6px_6px_0px_0px_rgba(255,255,255,0.2)]'
                        : 'bg-gray-300 dark:bg-stone-700 text-gray-500 dark:text-stone-500 cursor-not-allowed'
                    }`}
                  >
                    <div className="flex items-center justify-center gap-2">
                      <TrendingDown className="w-5 h-5" />
                      Sell
                    </div>
                  </button>
                </div>

                {!canBuy && selectedStock && (
                  <p className="text-xs text-red-600 dark:text-red-400 mt-2 text-center">
                    Insufficient funds. You need ${(selectedStock.price * parseFloat(quantity || '0')).toFixed(2)} but only have ${cashBalance.toFixed(2)}
                  </p>
                )}
                {!canSell && selectedStock && (
                  <p className="text-xs text-red-600 dark:text-red-400 mt-2 text-center">
                    Insufficient shares. You own {selectedHoldings} but trying to sell {quantity}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Right Column - News & AI Coach */}
          <div className="lg:col-span-3 space-y-6">
            <MissionNewsFeed mission={mission} />
            <MissionAICoach
              mission={mission}
              portfolioContext={{
                cashBalance,
                holdings,
                transactions: [],
                totalValue: portfolioValue,
              }}
            />
          </div>
        </div>
      </main>
    </div>
  );
}
