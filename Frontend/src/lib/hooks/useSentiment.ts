import { useQuery } from '@tanstack/react-query'

export interface HeatMapItem {
  ticker: string
  sentiment: number
  sentimentLabel: string
  articleCount: number
  score: number
}

export interface HeatMapData {
  timeframe: string
  data: HeatMapItem[]
  total: number
  timestamp: string
}

/**
 * Hook to fetch sentiment heatmap data
 */
export function useSentimentHeatmap(timeframe: '1d' | '1w' | '1m' = '1d', refetchInterval?: number) {
  return useQuery<HeatMapData>({
    queryKey: ['sentiment', 'heatmap', timeframe],
    queryFn: async () => {
      const response = await fetch(`/api/sentiment/heatmap?timeframe=${timeframe}`)
      if (!response.ok) {
        throw new Error('Failed to fetch sentiment heatmap')
      }
      return response.json()
    },
    staleTime: 5 * 60 * 1000, // 5 minutes - sentiment aggregation is expensive
    refetchInterval: refetchInterval,
  })
}

