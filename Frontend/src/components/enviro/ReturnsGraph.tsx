"use client";

import { useMemo } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { ChartLine } from "lucide-react";

interface Trade {
  id: string;
  ticker: string;
  side: string;
  price: number | string;
  quantity: number | string;
  executedAt?: string | null;
}

interface Position {
  id: string;
  ticker: string;
  quantity: number | string;
  avgPrice: number | string;
}

interface ReturnsGraphProps {
  trades: Trade[];
  positions: Position[];
  initialBalance: number;
  currentBalance: number;
  currentPrices: Record<string, number>; // symbol -> current price
}

export function ReturnsGraph({
  trades,
  positions,
  initialBalance,
  currentBalance,
  currentPrices,
}: ReturnsGraphProps) {
  // Calculate portfolio value over time from trades
  const chartData = useMemo(() => {
    if (trades.length === 0) {
      // If no trades, just show initial balance
      return [
        {
          date: new Date().toISOString().split("T")[0],
          value: initialBalance,
          returnPercent: 0,
        },
      ];
    }

    // Sort trades by execution time
    const sortedTrades = [...trades].sort((a, b) => {
      const dateA = a.executedAt ? new Date(a.executedAt).getTime() : 0;
      const dateB = b.executedAt ? new Date(b.executedAt).getTime() : 0;
      return dateA - dateB;
    });

    // Build portfolio value history
    const dataPoints: Array<{
      date: string;
      value: number;
      returnPercent: number;
    }> = [];
    let runningBalance = initialBalance;
    const holdings: Record<string, { quantity: number; avgPrice: number }> = {};

    // Add initial point
    dataPoints.push({
      date: sortedTrades[0]?.executedAt
        ? new Date(sortedTrades[0].executedAt).toISOString().split("T")[0]
        : new Date().toISOString().split("T")[0],
      value: initialBalance,
      returnPercent: 0,
    });

    // Process each trade
    sortedTrades.forEach((trade) => {
      const tradePrice = parseFloat(trade.price.toString());
      const tradeQuantity = parseFloat(trade.quantity.toString());

      if (trade.side === "buy") {
        // Update holdings
        const existing = holdings[trade.ticker] || { quantity: 0, avgPrice: 0 };
        const newQuantity = existing.quantity + tradeQuantity;
        const newAvgPrice =
          newQuantity > 0
            ? (existing.quantity * existing.avgPrice +
                tradeQuantity * tradePrice) /
              newQuantity
            : tradePrice;
        holdings[trade.ticker] = {
          quantity: newQuantity,
          avgPrice: newAvgPrice,
        };
        runningBalance -= tradePrice * tradeQuantity;
      } else {
        // Sell
        const holding = holdings[trade.ticker];
        if (holding) {
          holding.quantity -= tradeQuantity;
          if (holding.quantity <= 0) {
            delete holdings[trade.ticker];
          }
          runningBalance += tradePrice * tradeQuantity;
        }
      }

      // Calculate current portfolio value
      let holdingsValue = 0;
      Object.entries(holdings).forEach(([ticker, holding]) => {
        // Use trade price if available, otherwise use current price, otherwise use avg price
        const price = currentPrices[ticker] || holding.avgPrice;
        holdingsValue += holding.quantity * price;
      });

      const totalValue = runningBalance + holdingsValue;
      const returnPercent =
        initialBalance > 0
          ? ((totalValue - initialBalance) / initialBalance) * 100
          : 0;

      const tradeDate = trade.executedAt
        ? new Date(trade.executedAt).toISOString().split("T")[0]
        : new Date().toISOString().split("T")[0];

      dataPoints.push({
        date: tradeDate,
        value: totalValue,
        returnPercent,
      });
    });

    // Add current point
    let currentHoldingsValue = 0;
    positions.forEach((pos) => {
      const price =
        currentPrices[pos.ticker] || parseFloat(pos.avgPrice.toString());
      currentHoldingsValue += parseFloat(pos.quantity.toString()) * price;
    });
    const currentTotalValue = currentBalance + currentHoldingsValue;
    const currentReturnPercent =
      initialBalance > 0
        ? ((currentTotalValue - initialBalance) / initialBalance) * 100
        : 0;

    dataPoints.push({
      date: new Date().toISOString().split("T")[0],
      value: currentTotalValue,
      returnPercent: currentReturnPercent,
    });

    return dataPoints;
  }, [trades, positions, initialBalance, currentBalance, currentPrices]);

  const CustomTooltip = ({
    active,
    payload,
  }: {
    active?: boolean;
    payload?: Array<{
      payload: { date: string; value: number; returnPercent: number };
    }>;
  }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white dark:bg-stone-800 border-2 border-black dark:border-stone-600 p-3 shadow-lg">
          <p className="font-bold text-black dark:text-stone-100">
            {data.date}
          </p>
          <p className="text-sm text-black dark:text-stone-100">
            Value: ${data.value.toFixed(2)}
          </p>
          <p
            className={`text-sm font-semibold ${
              data.returnPercent >= 0
                ? "text-green-600 dark:text-green-400"
                : "text-red-600 dark:text-red-400"
            }`}
          >
            Return: {data.returnPercent >= 0 ? "+" : ""}
            {data.returnPercent.toFixed(2)}%
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ChartLine className="w-5 h-5" />
          Portfolio Returns
        </CardTitle>
      </CardHeader>
      <CardContent>
        {chartData.length === 0 ||
        (chartData.length === 1 && chartData[0].value === initialBalance) ? (
          <div className="h-64 flex flex-col items-center justify-center text-gray-500 dark:text-stone-400 space-y-2 p-4">
            <ChartLine className="w-8 h-8 text-gray-400 dark:text-stone-500" />
            <p className="text-sm font-medium">No trading activity yet</p>
            <p className="text-xs text-gray-400 dark:text-stone-500 text-center">
              Start trading to see your portfolio returns over time
            </p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart
              data={chartData}
              margin={{ top: 5, right: 10, left: 0, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 12, fill: "#6b7280" }}
                tickFormatter={(date) => {
                  const d = new Date(date);
                  return `${d.getMonth() + 1}/${d.getDate()}`;
                }}
              />
              <YAxis
                tick={{ fontSize: 12, fill: "#6b7280" }}
                tickFormatter={(value) => `$${value.toFixed(0)}`}
                width={70}
              />
              <Tooltip content={<CustomTooltip />} />
              <Line
                type="monotone"
                dataKey="value"
                stroke="#2563eb"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
