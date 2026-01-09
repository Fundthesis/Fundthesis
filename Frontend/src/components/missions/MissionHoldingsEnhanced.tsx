'use client';

import React, { useMemo } from 'react';
import { TrendingUp, TrendingDown, PieChart, Shield, AlertTriangle } from 'lucide-react';
import { SimulatedStock, calculateDiversificationScore } from '@/lib/missionSimulation';

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

interface MissionHoldingsEnhancedProps {
  holdings: Holding[];
  stocks: SimulatedStock[];
  cashBalance: number;
  initialBalance: number;
  isLoading?: boolean;
  onSellStock?: (symbol: string) => void;
}

export function MissionHoldingsEnhanced({
  holdings,
  stocks,
  cashBalance,
  initialBalance,
  isLoading,
  onSellStock,
}: MissionHoldingsEnhancedProps) {
  // Calculate sector allocation
  const sectorAllocation = useMemo(() => {
    const sectors: Record<string, { value: number; color: string }> = {};
    const sectorColors: Record<string, string> = {
      'Technology': '#3b82f6',
      'Healthcare': '#10b981',
      'Finance': '#f59e0b',
      'Consumer': '#8b5cf6',
      'Energy': '#ef4444',
      'Industrial': '#6b7280',
      'Materials': '#f97316',
      'Utilities': '#06b6d4',
      'Real Estate': '#ec4899',
      'Communications': '#84cc16',
    };

    holdings.forEach(holding => {
      const stock = stocks.find(s => s.symbol === holding.symbol);
      const sector = stock?.sector || 'Other';
      if (!sectors[sector]) {
        sectors[sector] = { value: 0, color: sectorColors[sector] || '#9ca3af' };
      }
      sectors[sector].value += holding.totalValue;
    });

    return sectors;
  }, [holdings, stocks]);

  // Calculate total portfolio value
  const totalHoldingsValue = holdings.reduce((sum, h) => sum + h.totalValue, 0);
  const totalPortfolioValue = totalHoldingsValue + cashBalance;
  const totalGainLoss = totalPortfolioValue - initialBalance;
  const totalGainLossPercent = initialBalance > 0 ? (totalGainLoss / initialBalance) * 100 : 0;

  // Calculate diversification score
  const diversificationScore = useMemo(() => {
    const holdingsForScore = holdings.map(h => ({
      symbol: h.symbol,
      value: h.totalValue,
    }));
    return calculateDiversificationScore(holdingsForScore, stocks);
  }, [holdings, stocks]);

  // Get diversification status
  const getDiversificationStatus = (score: number) => {
    if (score >= 80) return { label: 'Excellent', color: 'text-green-600 dark:text-green-400', bg: 'bg-green-500' };
    if (score >= 60) return { label: 'Good', color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-500' };
    if (score >= 40) return { label: 'Fair', color: 'text-yellow-600 dark:text-yellow-400', bg: 'bg-yellow-500' };
    return { label: 'Poor', color: 'text-red-600 dark:text-red-400', bg: 'bg-red-500' };
  };

  const divStatus = getDiversificationStatus(diversificationScore);

  // Calculate max drawdown potential
  const maxDrawdownPercent = initialBalance > 0 
    ? ((initialBalance - totalPortfolioValue) / initialBalance) * 100 
    : 0;
  const isInDanger = maxDrawdownPercent >= 20;

  if (isLoading) {
    return (
      <div className="border-4 border-black dark:border-stone-700 bg-white dark:bg-stone-800 p-6">
        <h3 className="text-2xl font-black text-black dark:text-stone-100 mb-4 uppercase tracking-wide border-b-2 border-black dark:border-stone-700 pb-2">
          Portfolio Holdings
        </h3>
        <p className="text-gray-500 dark:text-stone-400 italic">Loading positions...</p>
      </div>
    );
  }

  return (
    <div className="border-4 border-black dark:border-stone-700 bg-white dark:bg-stone-800 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] dark:shadow-[8px_8px_0px_0px_rgba(0,0,0,0.5)]">
      {/* Header with Total Value */}
      <div className="p-6 border-b-4 border-black dark:border-stone-700 bg-stone-50 dark:bg-stone-900">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-black text-black dark:text-stone-100 uppercase tracking-wide">
            Portfolio Holdings
          </h3>
          {isInDanger && (
            <div className="flex items-center gap-1 px-2 py-1 bg-red-500 text-white text-xs font-bold uppercase animate-pulse">
              <AlertTriangle className="w-3 h-3" />
              Margin Risk
            </div>
          )}
        </div>
        
        <div className="grid grid-cols-3 gap-4">
          <div>
            <p className="text-xs uppercase tracking-widest text-gray-500 dark:text-stone-400">Total Value</p>
            <p className="text-2xl font-black text-black dark:text-stone-100">
              ${totalPortfolioValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-widest text-gray-500 dark:text-stone-400">Cash</p>
            <p className="text-2xl font-black text-black dark:text-stone-100">
              ${cashBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-widest text-gray-500 dark:text-stone-400">P&L</p>
            <p className={`text-2xl font-black ${totalGainLoss >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
              {totalGainLoss >= 0 ? '+' : ''}{totalGainLossPercent.toFixed(2)}%
            </p>
          </div>
        </div>
      </div>

      {/* Diversification Score */}
      <div className="p-4 border-b-2 border-black dark:border-stone-700">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-black dark:text-stone-400" />
            <span className="text-sm font-bold uppercase tracking-wide text-black dark:text-stone-100">
              Diversification Score
            </span>
          </div>
          <span className={`text-sm font-bold ${divStatus.color}`}>
            {diversificationScore}/100 - {divStatus.label}
          </span>
        </div>
        <div className="h-3 bg-stone-200 dark:bg-stone-700 border border-black dark:border-stone-600 overflow-hidden">
          <div
            className={`h-full ${divStatus.bg} transition-all duration-500`}
            style={{ width: `${diversificationScore}%` }}
          />
        </div>
        <p className="text-xs text-gray-500 dark:text-stone-400 mt-1">
          {diversificationScore < 60 && 'Consider diversifying across more sectors'}
          {diversificationScore >= 60 && diversificationScore < 80 && 'Good balance, room for improvement'}
          {diversificationScore >= 80 && 'Excellent diversification!'}
        </p>
      </div>

      {/* Sector Allocation Mini Chart */}
      {Object.keys(sectorAllocation).length > 0 && (
        <div className="p-4 border-b-2 border-black dark:border-stone-700">
          <div className="flex items-center gap-2 mb-3">
            <PieChart className="w-4 h-4 text-black dark:text-stone-400" />
            <span className="text-sm font-bold uppercase tracking-wide text-black dark:text-stone-100">
              Sector Allocation
            </span>
          </div>
          <div className="flex h-4 border border-black dark:border-stone-600 overflow-hidden mb-2">
            {Object.entries(sectorAllocation).map(([sector, data]) => {
              const percent = totalHoldingsValue > 0 ? (data.value / totalHoldingsValue) * 100 : 0;
              return (
                <div
                  key={sector}
                  className="h-full transition-all duration-300"
                  style={{ width: `${percent}%`, backgroundColor: data.color }}
                  title={`${sector}: ${percent.toFixed(1)}%`}
                />
              );
            })}
          </div>
          <div className="flex flex-wrap gap-2">
            {Object.entries(sectorAllocation).map(([sector, data]) => {
              const percent = totalHoldingsValue > 0 ? (data.value / totalHoldingsValue) * 100 : 0;
              return (
                <div key={sector} className="flex items-center gap-1 text-xs">
                  <div
                    className="w-2 h-2 border border-black dark:border-stone-600"
                    style={{ backgroundColor: data.color }}
                  />
                  <span className="text-gray-600 dark:text-stone-400">
                    {sector}: {percent.toFixed(0)}%
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Holdings List */}
      <div className="p-4">
        {holdings.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-500 dark:text-stone-400 italic">
              No positions yet. Start trading to build your portfolio!
            </p>
          </div>
        ) : (
          <div className="space-y-3 max-h-80 overflow-y-auto">
            {holdings.map((holding) => {
              const stock = stocks.find(s => s.symbol === holding.symbol);
              return (
                <div
                  key={holding.symbol}
                  className="border-2 border-black/20 dark:border-stone-700 bg-stone-50 dark:bg-stone-900 p-4 hover:border-black dark:hover:border-stone-500 transition-all group"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="text-lg font-black text-black dark:text-stone-100">{holding.symbol}</h4>
                        {stock?.isETF && (
                          <span className="text-xs px-1 py-0.5 bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 font-bold uppercase">
                            ETF
                          </span>
                        )}
                        {holding.gainLoss >= 0 ? (
                          <TrendingUp className="w-4 h-4 text-green-600 dark:text-green-400" />
                        ) : (
                          <TrendingDown className="w-4 h-4 text-red-600 dark:text-red-400" />
                        )}
                      </div>
                      <p className="text-xs text-gray-500 dark:text-stone-400">
                        {stock?.sector || 'Unknown'} • {holding.quantity} shares @ ${holding.avgPrice.toFixed(2)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-black dark:text-stone-100">
                        ${holding.totalValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </p>
                      <p className={`text-sm font-semibold ${holding.gainLoss >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                        {holding.gainLoss >= 0 ? '+' : ''}${holding.gainLoss.toFixed(2)} ({holding.gainLossPercent >= 0 ? '+' : ''}{holding.gainLossPercent.toFixed(2)}%)
                      </p>
                    </div>
                    {onSellStock && (
                      <button
                        onClick={() => onSellStock(holding.symbol)}
                        className="ml-4 opacity-0 group-hover:opacity-100 px-3 py-1 text-xs font-bold uppercase bg-red-500 text-white border-2 border-black dark:border-stone-600 hover:bg-red-600 transition-all"
                      >
                        Sell
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
