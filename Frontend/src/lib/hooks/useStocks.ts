import { useQuery } from '@tanstack/react-query'

export interface Stock {
  symbol: string
  company?: string
  price: number
  change: number
  changePercent: number
  sector?: string
  industry?: string
  marketCap?: number
}

export interface StockDetail {
  symbol: string
  company: string
  price: number
  change: number
  changePercent: number
  open: number
  high: number
  low: number
  volume: number
  avgVolume: number
  fiftyTwoWeekHigh?: number
  fiftyTwoWeekLow?: number
  peRatio?: number
  sector: string
  industry: string
  marketCap: number
  chartData: Array<{ date: string; price: number }>
  forecastData?: Array<{ date: string; price: number }>
}

export interface StockMetadata {
  sectors: string[]
  industries: string[]
  priceRange: { min: number; max: number }
}

export interface StocksResponse {
  stocks: Stock[]
  total: number
  offset: number
  limit: number
  hasMore: boolean
}

interface UseStocksParams {
  limit?: number
  offset?: number
  symbols?: string
  refetchInterval?: number
}

/**
 * Hook to fetch stocks list with caching
 */
export function useStocks(params: UseStocksParams = {}) {
  const { limit = 20, offset = 0, symbols, refetchInterval } = params

  return useQuery<StocksResponse>({
    queryKey: ['stocks', limit, offset, symbols],
    queryFn: async () => {
      const queryParams = new URLSearchParams({
        limit: limit.toString(),
        offset: offset.toString(),
      })
      if (symbols) {
        queryParams.append('symbols', symbols)
      }

      const response = await fetch(`/api/stocks?${queryParams.toString()}`)
      if (!response.ok) {
        throw new Error('Failed to fetch stocks')
      }
      return response.json()
    },
    staleTime: 60 * 1000, // 1 minute
    refetchInterval: refetchInterval,
  })
}

/**
 * Hook to fetch individual stock details (without chart data - use useStockChart for that)
 */
export function useStockDetail(symbol: string | null) {
  return useQuery<Omit<StockDetail, 'chartData' | 'forecastData'>>({
    queryKey: ['stock', symbol],
    queryFn: async () => {
      if (!symbol) {
        throw new Error('Symbol is required')
      }
      // Fetch with default days=30, but we'll only use the non-chart data
      const response = await fetch(`/api/stock/${symbol}?days=30`)
      if (!response.ok) {
        throw new Error('Failed to fetch stock details')
      }
      const data = await response.json()
      // Remove chart data - that's fetched separately
      const { chartData, forecastData, ...rest } = data
      return rest
    },
    enabled: !!symbol,
    staleTime: 60 * 1000, // 1 minute
  })
}

/**
 * Hook to fetch chart data only (refetches when timeframe changes)
 */
export function useStockChart(symbol: string | null, days: number = 30) {
  return useQuery<{
    chartData: Array<{ date: string; price: number }>
    forecastData?: Array<{ date: string; price: number }>
  }>({
    queryKey: ['stock', symbol, 'chart', days],
    queryFn: async () => {
      if (!symbol) {
        throw new Error('Symbol is required')
      }
      const response = await fetch(`/api/stock/${symbol}/chart?days=${days}`)
      if (!response.ok) {
        throw new Error('Failed to fetch chart data')
      }
      return response.json()
    },
    enabled: !!symbol,
    staleTime: 60 * 1000, // 1 minute
  })
}

/**
 * Hook to fetch stock metadata (sectors, industries, price range)
 */
export function useStockMetadata() {
  return useQuery<StockMetadata>({
    queryKey: ['stocks', 'metadata'],
    queryFn: async () => {
      const response = await fetch('/api/stocks/metadata')
      if (!response.ok) {
        throw new Error('Failed to fetch stock metadata')
      }
      return response.json()
    },
    staleTime: 5 * 60 * 1000, // 5 minutes - metadata changes less frequently
  })
}

