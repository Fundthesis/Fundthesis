'use client';

import React, { useMemo } from 'react';
import { TrendingUp, TrendingDown, BarChart2, Minus } from 'lucide-react';
import { SimulatedStock } from '@/lib/missionSimulation';

interface MissionMarketChartProps {
  stock: SimulatedStock | null;
  currentDay: number;
  onSelectStock?: (symbol: string) => void;
  selectedSymbol?: string;
  allStocks: SimulatedStock[];
  scenario: string;
}

export function MissionMarketChart({
  stock,
  currentDay,
  onSelectStock,
  selectedSymbol,
  allStocks,
  scenario: _scenario,
}: MissionMarketChartProps) {
  // Calculate chart dimensions
  const chartWidth = 400;
  const chartHeight = 200;
  const padding = { top: 20, right: 20, bottom: 30, left: 50 };
  const innerWidth = chartWidth - padding.left - padding.right;
  const innerHeight = chartHeight - padding.top - padding.bottom;

  // Generate price path for the selected stock
  const { pathD, minPrice, maxPrice, currentPrice, priceChange, priceChangePercent, dataPoints } = useMemo(() => {
    if (!stock || stock.priceHistory.length === 0) {
      return { pathD: '', minPrice: 0, maxPrice: 0, currentPrice: 0, priceChange: 0, priceChangePercent: 0, dataPoints: [] };
    }

    const history = stock.priceHistory.slice(0, currentDay + 1);
    if (history.length === 0) {
      return { pathD: '', minPrice: stock.basePrice, maxPrice: stock.basePrice, currentPrice: stock.basePrice, priceChange: 0, priceChangePercent: 0, dataPoints: [] };
    }

    const prices = history.map(h => h.price);
    const min = Math.min(...prices) * 0.98;
    const max = Math.max(...prices) * 1.02;
    const current = history[history.length - 1].price;
    const initial = stock.basePrice;
    const change = current - initial;
    const changePercent = (change / initial) * 100;

    // Create SVG path
    const xScale = innerWidth / Math.max(history.length - 1, 1);
    const yScale = innerHeight / (max - min || 1);

    const points = history.map((h, i) => ({
      x: padding.left + i * xScale,
      y: padding.top + (max - h.price) * yScale,
      price: h.price,
      day: h.day,
    }));

    const pathData = points.map((p, i) => 
      `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`
    ).join(' ');

    return {
      pathD: pathData,
      minPrice: min,
      maxPrice: max,
      currentPrice: current,
      priceChange: change,
      priceChangePercent: changePercent,
      dataPoints: points,
    };
  }, [stock, currentDay, innerWidth, innerHeight, padding.left, padding.top]);

  // Generate area fill path
  const areaPath = useMemo(() => {
    if (!pathD || dataPoints.length === 0) return '';
    const lastPoint = dataPoints[dataPoints.length - 1];
    const firstPoint = dataPoints[0];
    return `${pathD} L ${lastPoint.x} ${padding.top + innerHeight} L ${firstPoint.x} ${padding.top + innerHeight} Z`;
  }, [pathD, dataPoints, padding.top, innerHeight]);

  // Generate Y-axis labels
  const yAxisLabels = useMemo(() => {
    if (maxPrice === minPrice) return [];
    const labels = [];
    const steps = 4;
    for (let i = 0; i <= steps; i++) {
      const price = minPrice + (maxPrice - minPrice) * (1 - i / steps);
      labels.push({
        y: padding.top + (i / steps) * innerHeight,
        label: `$${price.toFixed(0)}`,
      });
    }
    return labels;
  }, [minPrice, maxPrice, innerHeight, padding.top]);

  // Top movers calculation
  const topMovers = useMemo(() => {
    return allStocks
      .filter(s => s.priceHistory.length > 0)
      .map(s => {
        const history = s.priceHistory.slice(0, currentDay + 1);
        if (history.length === 0) return null;
        const current = history[history.length - 1].price;
        const change = current - s.basePrice;
        const changePercent = (change / s.basePrice) * 100;
        return { symbol: s.symbol, change, changePercent, current };
      })
      .filter(Boolean)
      .sort((a, b) => Math.abs(b!.changePercent) - Math.abs(a!.changePercent))
      .slice(0, 5) as { symbol: string; change: number; changePercent: number; current: number }[];
  }, [allStocks, currentDay]);

  const isPositive = priceChange >= 0;

  return (
    <div className="border-4 border-black dark:border-stone-700 bg-white dark:bg-stone-800 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] dark:shadow-[8px_8px_0px_0px_rgba(0,0,0,0.5)]">
      {/* Header */}
      <div className="p-4 border-b-2 border-black dark:border-stone-700 bg-stone-50 dark:bg-stone-900">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BarChart2 className="w-5 h-5 text-black dark:text-stone-400" />
            <h3 className="text-lg font-black uppercase tracking-wide text-black dark:text-stone-100">
              Market View
            </h3>
          </div>
          {stock && (
            <div className="text-right">
              <p className="text-2xl font-black text-black dark:text-stone-100">
                {stock.symbol}
              </p>
              <p className="text-xs text-gray-500 dark:text-stone-400">
                {stock.company}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Price Display */}
      {stock && (
        <div className="p-4 border-b-2 border-black dark:border-stone-700">
          <div className="flex items-baseline gap-4">
            <p className="text-4xl font-black text-black dark:text-stone-100">
              ${currentPrice.toFixed(2)}
            </p>
            <div className={`flex items-center gap-1 ${isPositive ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
              {isPositive ? <TrendingUp className="w-5 h-5" /> : <TrendingDown className="w-5 h-5" />}
              <span className="text-lg font-bold">
                {isPositive ? '+' : ''}{priceChange.toFixed(2)} ({isPositive ? '+' : ''}{priceChangePercent.toFixed(2)}%)
              </span>
            </div>
          </div>
          <p className="text-xs text-gray-500 dark:text-stone-400 mt-1">
            Since Day 1 • Base: ${stock.basePrice.toFixed(2)}
          </p>
        </div>
      )}

      {/* Chart */}
      <div className="p-4">
        {!stock ? (
          <div className="h-52 flex items-center justify-center text-gray-500 dark:text-stone-400">
            Select a stock to view its chart
          </div>
        ) : stock.priceHistory.length === 0 ? (
          <div className="h-52 flex items-center justify-center text-gray-500 dark:text-stone-400">
            Price data will appear as the simulation runs
          </div>
        ) : (
          <svg width="100%" viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="overflow-visible">
            {/* Grid lines */}
            {yAxisLabels.map((label, i) => (
              <g key={i}>
                <line
                  x1={padding.left}
                  y1={label.y}
                  x2={chartWidth - padding.right}
                  y2={label.y}
                  stroke="currentColor"
                  strokeOpacity={0.1}
                  strokeDasharray="4,4"
                  className="text-gray-400 dark:text-stone-600"
                />
                <text
                  x={padding.left - 8}
                  y={label.y}
                  textAnchor="end"
                  alignmentBaseline="middle"
                  className="text-xs fill-gray-500 dark:fill-stone-400"
                >
                  {label.label}
                </text>
              </g>
            ))}

            {/* Area fill */}
            <path
              d={areaPath}
              fill={isPositive ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)'}
            />

            {/* Price line */}
            <path
              d={pathD}
              fill="none"
              stroke={isPositive ? '#22c55e' : '#ef4444'}
              strokeWidth={3}
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {/* Current price dot */}
            {dataPoints.length > 0 && (
              <circle
                cx={dataPoints[dataPoints.length - 1].x}
                cy={dataPoints[dataPoints.length - 1].y}
                r={6}
                fill={isPositive ? '#22c55e' : '#ef4444'}
                stroke="white"
                strokeWidth={2}
              />
            )}

            {/* X-axis labels */}
            <text
              x={padding.left}
              y={chartHeight - 5}
              className="text-xs fill-gray-500 dark:fill-stone-400"
            >
              Day 1
            </text>
            <text
              x={chartWidth - padding.right}
              y={chartHeight - 5}
              textAnchor="end"
              className="text-xs fill-gray-500 dark:fill-stone-400"
            >
              Day {currentDay}
            </text>
          </svg>
        )}
      </div>

      {/* Stock Info */}
      {stock && (
        <div className="p-4 border-t-2 border-black dark:border-stone-700 bg-stone-50 dark:bg-stone-900">
          <div className="grid grid-cols-4 gap-4 text-center">
            <div>
              <p className="text-xs uppercase tracking-widest text-gray-500 dark:text-stone-400">Sector</p>
              <p className="text-sm font-bold text-black dark:text-stone-100">{stock.sector}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-widest text-gray-500 dark:text-stone-400">Volatility</p>
              <p className="text-sm font-bold text-black dark:text-stone-100">{(stock.volatility * 100).toFixed(0)}%</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-widest text-gray-500 dark:text-stone-400">Type</p>
              <p className="text-sm font-bold text-black dark:text-stone-100">{stock.isETF ? 'ETF' : 'Stock'}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-widest text-gray-500 dark:text-stone-400">Yield</p>
              <p className="text-sm font-bold text-black dark:text-stone-100">
                {stock.dividendYield ? `${(stock.dividendYield * 100).toFixed(1)}%` : '-'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Top Movers */}
      <div className="p-4 border-t-2 border-black dark:border-stone-700">
        <h4 className="text-sm font-bold uppercase tracking-widest text-gray-500 dark:text-stone-400 mb-3">
          Top Movers Today
        </h4>
        <div className="space-y-2">
          {topMovers.map((mover) => (
            <button
              key={mover.symbol}
              onClick={() => onSelectStock?.(mover.symbol)}
              className={`w-full flex items-center justify-between p-2 border-2 transition-all ${
                selectedSymbol === mover.symbol
                  ? 'border-black dark:border-stone-500 bg-black dark:bg-stone-700 text-white'
                  : 'border-transparent hover:border-black dark:hover:border-stone-600 bg-stone-100 dark:bg-stone-900'
              }`}
            >
              <span className={`font-bold ${selectedSymbol === mover.symbol ? 'text-white' : 'text-black dark:text-stone-100'}`}>
                {mover.symbol}
              </span>
              <div className="flex items-center gap-1">
                {mover.changePercent > 0 ? (
                  <TrendingUp className={`w-3 h-3 ${selectedSymbol === mover.symbol ? 'text-green-300' : 'text-green-600 dark:text-green-400'}`} />
                ) : mover.changePercent < 0 ? (
                  <TrendingDown className={`w-3 h-3 ${selectedSymbol === mover.symbol ? 'text-red-300' : 'text-red-600 dark:text-red-400'}`} />
                ) : (
                  <Minus className="w-3 h-3 text-gray-400" />
                )}
                <span className={`text-sm font-bold ${
                  mover.changePercent > 0 
                    ? selectedSymbol === mover.symbol ? 'text-green-300' : 'text-green-600 dark:text-green-400'
                    : mover.changePercent < 0 
                      ? selectedSymbol === mover.symbol ? 'text-red-300' : 'text-red-600 dark:text-red-400'
                      : 'text-gray-500'
                }`}>
                  {mover.changePercent > 0 ? '+' : ''}{mover.changePercent.toFixed(2)}%
                </span>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
