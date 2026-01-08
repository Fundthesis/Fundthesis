import { useQuery } from '@tanstack/react-query'

export interface NewsArticle {
  id: string
  headline: string
  summary: string | null
  published_at: string
  url: string | null
  source: string
  label: string | null
  related: string | null
  full_text: string | null
  tickers: string | null
  category?: string | null
}

export interface ArticlesResponse {
  articles: NewsArticle[]
  total: number
  offset: number
  limit: number
  hasMore: boolean
}

interface UseArticlesParams {
  limit?: number
  offset?: number
  category?: string
  source?: string
  tickers?: string
  search?: string
  orderBy?: string
  orderDirection?: 'asc' | 'desc'
  refetchInterval?: number
}

/**
 * Hook to fetch articles with optional server-side filtering
 * For simple filters (category, source), consider fetching all and filtering client-side
 * For complex search queries, use server-side filtering
 */
export function useArticles(params: UseArticlesParams = {}) {
  const {
    limit = 20,
    offset = 0,
    category,
    source,
    tickers,
    search,
    orderBy = 'published_at',
    orderDirection = 'desc',
    refetchInterval,
  } = params

  return useQuery<ArticlesResponse>({
    queryKey: ['articles', limit, offset, category, source, tickers, search, orderBy, orderDirection],
    queryFn: async () => {
      const queryParams = new URLSearchParams({
        limit: limit.toString(),
        offset: offset.toString(),
        orderBy,
        orderDirection,
      })
      if (category) queryParams.append('category', category)
      if (source) queryParams.append('source', source)
      if (tickers) queryParams.append('tickers', tickers)
      if (search) queryParams.append('search', search)

      const response = await fetch(`/api/articles?${queryParams.toString()}`)
      if (!response.ok) {
        throw new Error('Failed to fetch articles')
      }
      return response.json()
    },
    staleTime: 60 * 1000, // 1 minute
    refetchInterval: refetchInterval,
  })
}

/**
 * Hook to fetch a single article detail
 */
export function useArticleDetail(articleId: string | null) {
  return useQuery<NewsArticle>({
    queryKey: ['article', articleId],
    queryFn: async () => {
      if (!articleId) {
        throw new Error('Article ID is required')
      }
      const response = await fetch(`/api/articles/${articleId}`)
      if (!response.ok) {
        throw new Error('Failed to fetch article detail')
      }
      return response.json()
    },
    enabled: !!articleId,
    staleTime: 5 * 60 * 1000, // 5 minutes - articles don't change frequently
  })
}

