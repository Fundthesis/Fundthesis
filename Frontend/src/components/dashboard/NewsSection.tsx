import React from 'react'
import { Card, CardContent } from '@/components/ui/Card'
import { NewsCard } from '@/components/ui/NewsCard'

interface Stock {
  symbol: string
  change: string
  positive: boolean
}

interface NewsItem {
  title: string
  source: string
  text: string
  stocks: Stock[]
}

interface NewsSectionProps {
  newsItems: NewsItem[]
  className?: string
}

export function NewsSection({ newsItems, className = "" }: NewsSectionProps) {
  return (
    <div className={className}>
      {newsItems.map((news, index) => (
        <NewsCard
          key={index}
          title={news.title}
          source={news.source}
          text={news.text}
          stocks={news.stocks}
          className="bg-white p-6 border border-black/10 shadow-sm"
        />
      ))}
    </div>
  )
}

