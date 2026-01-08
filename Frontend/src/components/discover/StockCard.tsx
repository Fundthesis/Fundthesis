"use client";

import { ArrowUpRight, ArrowDownRight } from "lucide-react";

interface StockCardProps {
  symbol: string;
  company?: string;
  price: number;
  change: number;
  changePercent: number;
  sector?: string;
  onClick: () => void;
}

export function StockCard({
  symbol,
  company,
  price,
  changePercent,
  sector,
  onClick,
}: StockCardProps) {
  const isPositive = changePercent >= 0;

  return (
    <div
      onClick={onClick}
      className="bg-white border border-gray-200 rounded-lg p-4 hover:border-[#9DB38A] hover:shadow-md transition-all cursor-pointer group"
    >
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-lg text-gray-900 group-hover:text-[#9DB38A] transition-colors">
            {symbol}
          </h3>
          {company && (
            <p className="text-sm text-gray-600 truncate mt-0.5">{company}</p>
          )}
        </div>
        <div className="text-right">
          <div className="font-semibold text-gray-900">${price.toFixed(2)}</div>
          <div
            className={`text-sm font-medium flex items-center gap-1 justify-end ${
              isPositive ? "text-green-600" : "text-red-600"
            }`}
          >
            {isPositive ? (
              <ArrowUpRight className="w-3 h-3" />
            ) : (
              <ArrowDownRight className="w-3 h-3" />
            )}
            {isPositive ? "+" : ""}
            {changePercent.toFixed(2)}%
          </div>
        </div>
      </div>
      {sector && (
        <div className="mt-2">
          <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
            {sector}
          </span>
        </div>
      )}
    </div>
  );
}
