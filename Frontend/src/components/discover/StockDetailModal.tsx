"use client";

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
  onClose: () => void;
  timeframe: "day" | "month" | "year";
  onTimeframeChange: (timeframe: "day" | "month" | "year") => void;
}

export function StockDetailModal({
  stock,
  isOpen,
  onClose,
  timeframe,
  onTimeframeChange,
}: StockDetailModalProps) {
  if (!isOpen || !stock) return null;

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
    if (cap >= 1_000_000_000_000) return "$" + (cap / 1_000_000_000_000).toFixed(2) + "T";
    if (cap >= 1_000_000_000) return "$" + (cap / 1_000_000_000).toFixed(2) + "B";
    if (cap >= 1_000_000) return "$" + (cap / 1_000_000).toFixed(2) + "M";
    return "$" + cap.toString();
  };

  const combinedChartData = [
    ...stock.chartData.map((d) => ({ ...d, type: "historical" })),
    ...(stock.forecastData || []).map((d) => ({ ...d, type: "forecast" })),
  ];

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">{stock.symbol}</h2>
            <p className="text-gray-600">{stock.company}</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Price and Change */}
          <div className="flex items-baseline gap-4">
            <div className="text-4xl font-bold text-gray-900">
              ${formatNumber(stock.price)}
            </div>
            <div
              className={`text-xl font-semibold ${
                stock.changePercent >= 0 ? "text-green-600" : "text-red-600"
              }`}
            >
              {stock.changePercent >= 0 ? "+" : ""}
              {formatNumber(stock.changePercent)}%
            </div>
          </div>

          {/* Timeframe Selector */}
          <div className="flex gap-2">
            {(["day", "month", "year"] as const).map((tf) => (
              <button
                key={tf}
                onClick={() => onTimeframeChange(tf)}
                className={`px-4 py-2 rounded-lg transition-colors ${
                  timeframe === tf
                    ? "bg-[#9DB38A] text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                {tf.charAt(0).toUpperCase() + tf.slice(1)}
              </button>
            ))}
          </div>

          {/* Chart */}
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={combinedChartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Line
                  type="monotone"
                  dataKey="price"
                  stroke="#9DB38A"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <div className="text-sm text-gray-600">Open</div>
              <div className="font-semibold">${formatNumber(stock.open)}</div>
            </div>
            <div>
              <div className="text-sm text-gray-600">High</div>
              <div className="font-semibold">${formatNumber(stock.high)}</div>
            </div>
            <div>
              <div className="text-sm text-gray-600">Low</div>
              <div className="font-semibold">${formatNumber(stock.low)}</div>
            </div>
            <div>
              <div className="text-sm text-gray-600">Volume</div>
              <div className="font-semibold">{formatVolume(stock.volume)}</div>
            </div>
            <div>
              <div className="text-sm text-gray-600">Market Cap</div>
              <div className="font-semibold">{formatMarketCap(stock.marketCap)}</div>
            </div>
            <div>
              <div className="text-sm text-gray-600">P/E Ratio</div>
              <div className="font-semibold">{formatNumber(stock.peRatio)}</div>
            </div>
            <div>
              <div className="text-sm text-gray-600">Sector</div>
              <div className="font-semibold">{stock.sector}</div>
            </div>
            <div>
              <div className="text-sm text-gray-600">Industry</div>
              <div className="font-semibold">{stock.industry}</div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4 border-t">
            <button className="px-4 py-2 bg-[#9DB38A] text-white rounded-lg hover:bg-[#8ca279] transition-colors">
              Add to Watchlist
            </button>
            <a
              href={`/discover?symbol=${stock.symbol}`}
              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2"
            >
              View Full Details
              <ExternalLink className="w-4 h-4" />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

