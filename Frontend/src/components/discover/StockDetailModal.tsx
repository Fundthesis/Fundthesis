"use client";

import { useMemo } from "react";
import { X, ExternalLink } from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

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

interface StockDetailModalProps {
  stock: StockDetail | null;
  isOpen: boolean;
  isLoading?: boolean;
  isLoadingChart?: boolean;
  onClose: () => void;
  timeframe: "day" | "month" | "year";
  onTimeframeChange: (timeframe: "day" | "month" | "year") => void;
}

export function StockDetailModal({
  stock,
  isOpen,
  isLoading = false,
  isLoadingChart = false,
  onClose,
  timeframe,
  onTimeframeChange,
}: StockDetailModalProps) {
  // Show loading skeleton if loading stock info or no stock data
  const showSkeleton = isLoading || !stock;
  // Chart loading is separate - only chart area shows loading when switching timeframes

  const formatNumber = (num: number | undefined | null, decimals = 2) => {
    if (num == null) return "-";
    return num.toFixed(decimals);
  };

  const formatVolume = (vol: number | undefined | null) => {
    if (vol == null) return "-";
    if (vol >= 1_000_000) return (vol / 1_000_000).toFixed(1) + "M";
    if (vol >= 1_000) return (vol / 1_000).toFixed(1) + "K";
    return vol.toString();
  };

  const formatMarketCap = (cap: number | undefined | null) => {
    if (!cap) return "-";
    if (cap >= 1_000_000_000_000)
      return "$" + (cap / 1_000_000_000_000).toFixed(2) + "T";
    if (cap >= 1_000_000_000)
      return "$" + (cap / 1_000_000_000).toFixed(2) + "B";
    if (cap >= 1_000_000) return "$" + (cap / 1_000_000).toFixed(2) + "M";
    return "$" + cap.toString();
  };

  // Hooks must be called before any early returns
  const combinedChartData = useMemo(() => {
    if (!stock) return [];
    return [
      ...stock.chartData.map((d) => ({ ...d, type: "historical" as const })),
      ...(stock.forecastData || []).map((d) => ({
        ...d,
        type: "forecast" as const,
      })),
    ];
  }, [stock]);

  // Calculate Y-axis domain with padding for better visualization
  const yAxisDomain = useMemo(() => {
    if (combinedChartData.length === 0) return [0, 100];
    const prices = combinedChartData
      .map((d) => d.price)
      .filter((p) => p != null) as number[];
    if (prices.length === 0) return [0, 100];
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    const range = maxPrice - minPrice;
    const padding = range * 0.1; // 10% padding on each side
    return [Math.max(0, minPrice - padding), maxPrice + padding];
  }, [combinedChartData]);

  const forecastPoints = useMemo(
    () => combinedChartData.filter((point) => point.type === "forecast"),
    [combinedChartData]
  );

  const hasForecastData = forecastPoints.length > 0;

  // Early return after all hooks
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-white/30 dark:bg-stone-900/30 backdrop-blur-md flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-stone-800 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-white dark:bg-stone-800 border-b border-gray-200 dark:border-stone-700 px-6 py-4 flex items-center justify-between">
          {showSkeleton ? (
            <div className="flex-1">
              <div className="h-8 bg-gray-200 dark:bg-stone-700 rounded w-32 mb-2 animate-pulse"></div>
              <div className="h-5 bg-gray-200 dark:bg-stone-700 rounded w-48 animate-pulse"></div>
            </div>
          ) : (
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-stone-100">
                {stock!.symbol}
              </h2>
              <p className="text-gray-600 dark:text-stone-400">{stock!.company}</p>
            </div>
          )}
          <button
            onClick={onClose}
            className="text-gray-400 dark:text-stone-500 hover:text-gray-600 dark:hover:text-stone-300 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Price and Change */}
          {showSkeleton ? (
            <div className="flex items-baseline gap-4">
              <div className="h-12 bg-gray-200 dark:bg-stone-700 rounded w-32 animate-pulse"></div>
              <div className="h-8 bg-gray-200 dark:bg-stone-700 rounded w-24 animate-pulse"></div>
            </div>
          ) : (
            <div className="flex items-baseline gap-4">
              <div className="text-4xl font-bold text-gray-900 dark:text-stone-100">
                ${formatNumber(stock!.price)}
              </div>
              <div
                className={`text-xl font-semibold ${
                  stock!.changePercent >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
                }`}
              >
                {stock!.changePercent >= 0 ? "+" : ""}
                {formatNumber(stock!.changePercent)}%
              </div>
            </div>
          )}

          {/* Timeframe Selector */}
          <div className="flex gap-2">
            {(["day", "month", "year"] as const).map((tf) => (
              <button
                key={tf}
                onClick={() => onTimeframeChange(tf)}
                className={`px-4 py-2 rounded-lg transition-colors ${
                  timeframe === tf
                    ? "bg-[#9DB38A] text-white"
                    : "bg-gray-100 dark:bg-stone-700 text-gray-700 dark:text-stone-300 hover:bg-gray-200 dark:hover:bg-stone-600"
                }`}
              >
                {tf.charAt(0).toUpperCase() + tf.slice(1)}
              </button>
            ))}
          </div>

          {/* Chart */}
          {showSkeleton ? (
            <div className="h-72 bg-gray-100 dark:bg-stone-700 rounded-lg animate-pulse"></div>
          ) : isLoadingChart ? (
            <div className="h-72 bg-gray-100 dark:bg-stone-700 rounded-lg animate-pulse flex items-center justify-center">
              <p className="text-gray-500 dark:text-stone-400">Loading chart data...</p>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="h-72 bg-gray-50 dark:bg-stone-900 rounded-lg p-2">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={combinedChartData}
                    margin={{ top: 10, right: 10, left: 10, bottom: 10 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis
                      dataKey="date"
                      tickFormatter={(date) =>
                        new Date(date).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                        })
                      }
                      tick={{ fontSize: 11, fill: "#6b7280" }}
                      axisLine={{ stroke: "#d1d5db" }}
                      tickLine={{ stroke: "#d1d5db" }}
                    />
                    <YAxis
                      domain={yAxisDomain}
                      tickFormatter={(value) => `$${value.toFixed(0)}`}
                      tick={{ fontSize: 11, fill: "#6b7280" }}
                      axisLine={{ stroke: "#d1d5db" }}
                      tickLine={{ stroke: "#d1d5db" }}
                      width={60}
                    />
                    <Tooltip
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const data = payload[0].payload;
                          return (
                            <div className="bg-white dark:bg-stone-800 border border-gray-200 dark:border-stone-700 rounded-lg shadow-lg p-3 text-sm">
                              <p className="font-bold text-lg text-gray-900 dark:text-stone-100">
                                ${data.price?.toFixed(2) || "-"}
                              </p>
                              <p className="text-gray-500 dark:text-stone-400 text-xs">
                                {new Date(data.date).toLocaleDateString(
                                  "en-US",
                                  {
                                    weekday: "short",
                                    month: "short",
                                    day: "numeric",
                                    year: "numeric",
                                  }
                                )}
                              </p>
                              {data.type === "forecast" && (
                                <p className="text-blue-600 text-xs font-medium mt-1">
                                  📈 Predicted
                                </p>
                              )}
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    {/* Single line that changes style at the forecast boundary */}
                    <Line
                      type="monotone"
                      dataKey="price"
                      stroke={stock!.changePercent >= 0 ? "#9DB38A" : "#c17b7b"}
                      strokeWidth={2.5}
                      dot={false}
                      connectNulls={true}
                      activeDot={{ r: 6, stroke: "#fff", strokeWidth: 2 }}
                    />
                    {/* Forecast overlay line (dashed) */}
                    {hasForecastData && (
                      <Line
                        type="monotone"
                        dataKey={(d: { type: string; price: number }) =>
                          d.type === "forecast" ? d.price : null
                        }
                        stroke="#3b82f6"
                        strokeWidth={3}
                        strokeDasharray="6 4"
                        dot={false}
                        connectNulls={true}
                        activeDot={{
                          r: 6,
                          stroke: "#fff",
                          strokeWidth: 2,
                          fill: "#3b82f6",
                        }}
                      />
                    )}
                  </LineChart>
                </ResponsiveContainer>
              </div>
              {/* Legend */}
              <div className="flex items-center justify-center gap-6 text-sm">
                <div className="flex items-center gap-2">
                  <div
                    className="w-6 h-0.5 rounded"
                    style={{
                      backgroundColor:
                        stock!.changePercent >= 0 ? "#9DB38A" : "#c17b7b",
                    }}
                  />
                  <span className="text-gray-600 dark:text-stone-400">Historical Price</span>
                </div>
                {hasForecastData && (
                  <div className="flex items-center gap-2">
                    <svg width="24" height="2" className="text-blue-500">
                      <line
                        x1="0"
                        y1="1"
                        x2="24"
                        y2="1"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeDasharray="6 4"
                      />
                    </svg>
                    <span className="text-blue-600 font-medium">
                      Predicted Price
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Stats Grid */}
          {showSkeleton ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[...Array(8)].map((_, i) => (
                <div key={i}>
                  <div className="h-4 bg-gray-200 rounded w-16 mb-2 animate-pulse"></div>
                  <div className="h-6 bg-gray-200 rounded w-24 animate-pulse"></div>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <div className="text-sm text-gray-600 dark:text-stone-400">Open</div>
                <div className="font-semibold text-gray-900 dark:text-stone-100">
                  ${formatNumber(stock!.open)}
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-600 dark:text-stone-400">High</div>
                <div className="font-semibold text-gray-900 dark:text-stone-100">
                  ${formatNumber(stock!.high)}
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-600 dark:text-stone-400">Low</div>
                <div className="font-semibold text-gray-900 dark:text-stone-100">${formatNumber(stock!.low)}</div>
              </div>
              <div>
                <div className="text-sm text-gray-600 dark:text-stone-400">Volume</div>
                <div className="font-semibold text-gray-900 dark:text-stone-100">
                  {formatVolume(stock!.volume)}
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-600 dark:text-stone-400">Market Cap</div>
                <div className="font-semibold text-gray-900 dark:text-stone-100">
                  {formatMarketCap(stock!.marketCap)}
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-600 dark:text-stone-400">P/E Ratio</div>
                <div className="font-semibold text-gray-900 dark:text-stone-100">
                  {formatNumber(stock!.peRatio)}
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-600 dark:text-stone-400">Sector</div>
                <div className="font-semibold text-gray-900 dark:text-stone-100">{stock!.sector}</div>
              </div>
              <div>
                <div className="text-sm text-gray-600 dark:text-stone-400">Industry</div>
                <div className="font-semibold text-gray-900 dark:text-stone-100">{stock!.industry}</div>
              </div>
            </div>
          )}

          {/* Actions */}
          {!showSkeleton && (
            <div className="flex gap-3 pt-4 border-t border-gray-200 dark:border-stone-700">
              <button className="px-4 py-2 bg-[#9DB38A] text-white rounded-lg hover:bg-[#8ca279] transition-colors">
                Add to Watchlist
              </button>
              <a
                href={`/discover?symbol=${stock!.symbol}`}
                className="px-4 py-2 border border-gray-300 dark:border-stone-600 rounded-lg hover:bg-gray-50 dark:hover:bg-stone-700 transition-colors flex items-center gap-2 text-gray-700 dark:text-stone-300"
              >
                View Full Details
                <ExternalLink className="w-4 h-4" />
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
