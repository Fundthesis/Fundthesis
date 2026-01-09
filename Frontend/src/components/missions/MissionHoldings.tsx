'use client';

import React from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface Holding {
  symbol: string;
  quantity: number;
  avgPrice: number;
  currentPrice: number;
  totalValue: number;
  gainLoss: number;
  gainLossPercent: number;
}

interface MissionHoldingsProps {
  holdings: Holding[];
  isLoading?: boolean;
}

export function MissionHoldings({ holdings, isLoading }: MissionHoldingsProps) {
  if (isLoading) {
    return (
      <div className="border-4 border-black dark:border-stone-700 bg-white dark:bg-stone-800 p-6">
        <h3 className="text-2xl font-black text-black dark:text-stone-100 mb-4 uppercase tracking-wide border-b-2 border-black dark:border-stone-700 pb-2">
          Your Holdings
        </h3>
        <p className="text-gray-500 dark:text-stone-400 italic">Loading positions...</p>
      </div>
    );
  }

  if (holdings.length === 0) {
    return (
      <div className="border-4 border-black dark:border-stone-700 bg-white dark:bg-stone-800 p-6">
        <h3 className="text-2xl font-black text-black dark:text-stone-100 mb-4 uppercase tracking-wide border-b-2 border-black dark:border-stone-700 pb-2">
          Your Holdings
        </h3>
        <p className="text-gray-500 dark:text-stone-400 italic">No positions yet. Start trading to build your portfolio!</p>
      </div>
    );
  }

  const totalValue = holdings.reduce((sum, h) => sum + h.totalValue, 0);
  const totalGainLoss = holdings.reduce((sum, h) => sum + h.gainLoss, 0);
  const totalGainLossPercent = totalValue > 0 ? (totalGainLoss / (totalValue - totalGainLoss)) * 100 : 0;

  return (
    <div className="border-4 border-black dark:border-stone-700 bg-white dark:bg-stone-800 p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] dark:shadow-[8px_8px_0px_0px_rgba(0,0,0,0.5)]">
      <div className="flex items-center justify-between mb-4 border-b-2 border-black dark:border-stone-700 pb-2">
        <h3 className="text-2xl font-black text-black dark:text-stone-100 uppercase tracking-wide">
          Your Holdings
        </h3>
        <div className="text-right">
          <p className="text-xs uppercase tracking-widest text-gray-500 dark:text-stone-400">Total Value</p>
          <p className="text-xl font-black text-black dark:text-stone-100">
            ${totalValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
          <p className={`text-sm font-bold ${totalGainLoss >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
            {totalGainLoss >= 0 ? '+' : ''}${totalGainLoss.toFixed(2)} ({totalGainLossPercent >= 0 ? '+' : ''}{totalGainLossPercent.toFixed(2)}%)
          </p>
        </div>
      </div>

      <div className="space-y-3 max-h-96 overflow-y-auto">
        {holdings.map((holding) => (
          <div
            key={holding.symbol}
            className="border-2 border-black/20 dark:border-stone-700 bg-stone-50 dark:bg-stone-900 p-4 hover:border-black dark:hover:border-stone-500 transition-all"
          >
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="text-xl font-black text-black dark:text-stone-100">{holding.symbol}</h4>
                  {holding.gainLoss >= 0 ? (
                    <TrendingUp className="w-4 h-4 text-green-600 dark:text-green-400" />
                  ) : (
                    <TrendingDown className="w-4 h-4 text-red-600 dark:text-red-400" />
                  )}
                </div>
                <p className="text-sm text-gray-600 dark:text-stone-400">
                  {holding.quantity} shares @ ${holding.avgPrice.toFixed(2)} avg
                </p>
              </div>
              <div className="text-right">
                <p className="text-lg font-bold text-black dark:text-stone-100">
                  ${holding.totalValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
                <p className={`text-sm font-semibold ${holding.gainLoss >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                  {holding.gainLoss >= 0 ? '+' : ''}${holding.gainLoss.toFixed(2)} ({holding.gainLossPercent >= 0 ? '+' : ''}{holding.gainLossPercent.toFixed(2)}%)
                </p>
                <p className="text-xs text-gray-500 dark:text-stone-400">
                  Current: ${holding.currentPrice.toFixed(2)}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
