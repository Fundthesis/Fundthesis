/**
 * Stock data utility functions
 */

import { QuoteData } from './types/stockData';

export interface StockSummary {
  symbol: string;
  company: string;
  price: number;
  change: number;
  changePercent: number;
}

export function quoteToStockSummary(quote: QuoteData): StockSummary | null {
  if (quote.regularMarketPrice === undefined) {
    return null;
  }

  const currentPrice = quote.regularMarketPrice;
  const openPrice = quote.regularMarketOpen || currentPrice;
  const change = currentPrice - openPrice;
  const changePercent = openPrice !== 0 ? (change / openPrice) * 100 : 0;

  const companyName =
    (quote.longName && typeof quote.longName === 'string' && quote.longName.length > 0
      ? quote.longName
      : quote.shortName) || `${quote.symbol} Inc.`;

  return {
    symbol: quote.symbol,
    company: companyName,
    price: Math.round(currentPrice * 100) / 100,
    change: Math.round(change * 100) / 100,
    changePercent: Math.round(changePercent * 100) / 100,
  };
}

