import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'

export interface BiographyData {
  xp: number
  xpBreakdown?: {
    modules: number
    missions: number
    mission_grades: number
    trades: number
    streaks: number
    total: number
  }
  archetype: string
  achievements: string[]
  rank: {
    level: number
    title: string
    requiredXP: number
  }
  nextRank: {
    level: number
    title: string
    requiredXP: number
  } | null
  progress: number
}

/**
 * Hook to fetch user biography data including XP, archetype, achievements, and rank
 */
export function useBiography() {
  const queryClient = useQueryClient()

  // Listen for XP earned events and invalidate cache
  useEffect(() => {
    const handleXPEarned = () => {
      queryClient.invalidateQueries({ queryKey: ['biography'] })
    }

    window.addEventListener('xp-earned', handleXPEarned)
    return () => {
      window.removeEventListener('xp-earned', handleXPEarned)
    }
  }, [queryClient])

  return useQuery<BiographyData>({
    queryKey: ['biography'],
    queryFn: async () => {
      const response = await fetch('/api/users/me/biography')
      if (!response.ok) {
        throw new Error('Failed to fetch biography data')
      }
      return response.json()
    },
    staleTime: 30 * 1000, // 30 seconds - biography data can change frequently
    refetchOnWindowFocus: true,
  })
}

