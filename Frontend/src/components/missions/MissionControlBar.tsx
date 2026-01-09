'use client';

import React from 'react';
import { Play, Pause, TrendingUp, TrendingDown, Clock } from 'lucide-react';

interface MissionControlBarProps {
  isPaused: boolean;
  onPause: () => void;
  onResume: () => void;
  simulatedDate: Date;
  elapsedSeconds: number;
  timeSpeed: number;
  onTimeSpeedChange: (speed: number) => void;
  cashBalance: number;
  portfolioValue: number;
  selectedStock: { symbol: string; price: number } | null;
  onQuickBuy: () => void;
  onQuickSell: () => void;
  canBuy: boolean;
  canSell: boolean;
}

export function MissionControlBar({
  isPaused,
  onPause,
  onResume,
  simulatedDate,
  elapsedSeconds,
  timeSpeed,
  onTimeSpeedChange,
  cashBalance,
  portfolioValue,
  selectedStock,
  onQuickBuy,
  onQuickSell,
  canBuy,
  canSell,
}: MissionControlBarProps) {
  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="border-b-4 border-black dark:border-stone-700 bg-white dark:bg-stone-800 p-4 shadow-lg">
      <div className="flex items-center justify-between flex-wrap gap-4">
        {/* Left: Timer & Date */}
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-gray-600 dark:text-stone-400" />
            <div>
              <p className="text-xs uppercase tracking-widest text-gray-500 dark:text-stone-400">Elapsed Time</p>
              <p className="text-xl font-black text-black dark:text-stone-100 font-mono">
                {formatTime(elapsedSeconds)}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="w-1 h-8 bg-gray-300 dark:bg-stone-600"></div>
            <div>
              <p className="text-xs uppercase tracking-widest text-gray-500 dark:text-stone-400">Simulated Date</p>
              <p className="text-sm font-bold text-black dark:text-stone-100">
                {formatDate(simulatedDate)}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="w-1 h-8 bg-gray-300 dark:bg-stone-600"></div>
            <div className="flex items-center gap-2">
              <label className="text-xs uppercase tracking-widest text-gray-500 dark:text-stone-400">Speed:</label>
              <select
                value={timeSpeed}
                onChange={(e) => onTimeSpeedChange(parseFloat(e.target.value))}
                className="border-2 border-black dark:border-stone-600 bg-white dark:bg-stone-900 text-black dark:text-stone-100 px-2 py-1 font-bold text-sm focus:outline-none"
              >
                <option value="0.5">0.5x</option>
                <option value="1">1x</option>
                <option value="2">2x</option>
                <option value="5">5x</option>
                <option value="10">10x</option>
              </select>
            </div>
          </div>
        </div>

        {/* Center: Play/Pause */}
        <div className="flex items-center gap-2">
          <button
            onClick={isPaused ? onResume : onPause}
            className={`p-3 border-4 border-black dark:border-stone-700 font-black transition-all ${
              isPaused
                ? 'bg-green-500 dark:bg-green-600 text-white hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:hover:shadow-[4px_4px_0px_0px_rgba(255,255,255,0.2)]'
                : 'bg-red-500 dark:bg-red-600 text-white hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:hover:shadow-[4px_4px_0px_0px_rgba(255,255,255,0.2)]'
            }`}
          >
            {isPaused ? <Play className="w-5 h-5" /> : <Pause className="w-5 h-5" />}
          </button>
        </div>

        {/* Right: Portfolio & Quick Trade */}
        <div className="flex items-center gap-6">
          <div className="text-right">
            <p className="text-xs uppercase tracking-widest text-gray-500 dark:text-stone-400">Portfolio Value</p>
            <p className="text-xl font-black text-black dark:text-stone-100">
              ${portfolioValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
            <p className="text-xs text-gray-600 dark:text-stone-400">Cash: ${cashBalance.toLocaleString()}</p>
          </div>

          {selectedStock && (
            <>
              <div className="w-1 h-8 bg-gray-300 dark:bg-stone-600"></div>
              <div className="flex items-center gap-2">
                <div className="text-right mr-2">
                  <p className="text-xs uppercase tracking-widest text-gray-500 dark:text-stone-400">
                    {selectedStock.symbol}
                  </p>
                  <p className="text-sm font-bold text-black dark:text-stone-100">
                    ${selectedStock.price.toFixed(2)}
                  </p>
                </div>
                <button
                  onClick={onQuickBuy}
                  disabled={!canBuy}
                  className={`p-2 border-2 border-black dark:border-stone-700 font-black text-xs uppercase transition-all ${
                    canBuy
                      ? 'bg-green-500 dark:bg-green-600 text-white hover:shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] dark:hover:shadow-[3px_3px_0px_0px_rgba(255,255,255,0.2)]'
                      : 'bg-gray-300 dark:bg-stone-700 text-gray-500 dark:text-stone-500 cursor-not-allowed'
                  }`}
                >
                  <TrendingUp className="w-4 h-4" />
                </button>
                <button
                  onClick={onQuickSell}
                  disabled={!canSell}
                  className={`p-2 border-2 border-black dark:border-stone-700 font-black text-xs uppercase transition-all ${
                    canSell
                      ? 'bg-red-500 dark:bg-red-600 text-white hover:shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] dark:hover:shadow-[3px_3px_0px_0px_rgba(255,255,255,0.2)]'
                      : 'bg-gray-300 dark:bg-stone-700 text-gray-500 dark:text-stone-500 cursor-not-allowed'
                  }`}
                >
                  <TrendingDown className="w-4 h-4" />
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
