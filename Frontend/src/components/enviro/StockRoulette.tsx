'use client';

import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Dice6 } from 'lucide-react';

const POPULAR_STOCKS = [
  'SPY', 'QQQ', 'VTI', 'AAPL', 'MSFT', 'GOOGL', 'AMZN', 'NVDA', 'META', 'TSLA',
  'JPM', 'V', 'JNJ', 'WMT', 'PG', 'MA', 'UNH', 'HD', 'DIS', 'NFLX',
];

interface StockRouletteProps {
  onSelect: (symbol: string) => void;
  disabled?: boolean;
}

export function StockRoulette({ onSelect, disabled }: StockRouletteProps) {
  const [isSpinning, setIsSpinning] = useState(false);
  const [selectedStock, setSelectedStock] = useState<string | null>(null);

  const spinRoulette = useCallback(() => {
    if (isSpinning || disabled) return;

    setIsSpinning(true);
    setSelectedStock(null);

    // Simulate spinning animation
    const spinDuration = 2000; // 2 seconds
    const spinSteps = 20;
    const stepDuration = spinDuration / spinSteps;

    let currentStep = 0;
    const interval = setInterval(() => {
      currentStep++;
      // Show random stock during spin
      const randomIndex = Math.floor(Math.random() * POPULAR_STOCKS.length);
      setSelectedStock(POPULAR_STOCKS[randomIndex]);

      if (currentStep >= spinSteps) {
        clearInterval(interval);
        // Final selection
        const finalIndex = Math.floor(Math.random() * POPULAR_STOCKS.length);
        const finalStock = POPULAR_STOCKS[finalIndex];
        setSelectedStock(finalStock);
        setIsSpinning(false);
        onSelect(finalStock);
      }
    }, stepDuration);
  }, [isSpinning, disabled, onSelect]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Dice6 className="w-5 h-5" />
          Stock Roulette
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col items-center gap-4">
          <div className="w-32 h-32 rounded-full border-4 border-black dark:border-stone-600 flex items-center justify-center bg-gradient-to-br from-stone-50 to-stone-200 dark:from-stone-800 dark:to-stone-900 relative overflow-hidden shadow-lg transition-all duration-300 hover:scale-105">
            {selectedStock ? (
              <div
                className={`text-2xl font-black transition-all duration-200 ${
                  isSpinning
                    ? 'animate-pulse text-gray-400 blur-sm'
                    : 'text-black dark:text-stone-100'
                }`}
              >
                {selectedStock}
              </div>
            ) : (
              <div className="flex flex-col items-center gap-1">
                <Dice6 className="w-10 h-10 text-gray-400 dark:text-stone-500" />
                <span className="text-xs text-gray-500 dark:text-stone-400 font-semibold">?</span>
              </div>
            )}
            {isSpinning && (
              <>
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/60 to-transparent animate-[spin_0.3s_linear_infinite]" />
                <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 via-transparent to-green-500/10 animate-pulse" />
              </>
            )}
          </div>
          <Button
            onClick={spinRoulette}
            disabled={isSpinning || disabled}
            className="w-full"
            variant="outline"
          >
            {isSpinning ? 'Spinning...' : 'Spin for Random Stock'}
          </Button>
          <p className="text-xs text-gray-500 dark:text-stone-400 text-center">
            Get a random popular stock
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

