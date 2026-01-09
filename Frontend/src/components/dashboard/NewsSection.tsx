import React from 'react'
import { Clock, TrendingUp, TrendingDown } from 'lucide-react'

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
}

export function NewsSection({ newsItems }: NewsSectionProps) {
  if (newsItems.length === 0) return null

  const [featured, ...rest] = newsItems

  return (
    <div className="space-y-0">
      {/* Featured Article */}
      <article className="pb-6 mb-6 border-b border-black/10 dark:border-stone-700">
        <div className="flex items-center gap-2 mb-3">
          <span className="bg-black dark:bg-stone-200 text-white dark:text-stone-900 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5">
            Featured
          </span>
          <span className="flex items-center gap-1 text-[11px] text-gray-500 dark:text-stone-400">
            <Clock className="w-3 h-3" />
            {featured.source}
          </span>
        </div>
        <h3 className="font-serif text-xl font-bold leading-tight mb-3 text-black dark:text-stone-100 hover:underline cursor-pointer">
          {featured.title}
        </h3>
        <p className="font-serif text-sm text-gray-600 dark:text-stone-400 leading-relaxed mb-4 line-clamp-3">
          {featured.text}
        </p>
        {featured.stocks.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {featured.stocks.map((stock, idx) => (
              <span
                key={idx}
                className="inline-flex items-center gap-1 text-xs font-medium bg-gray-100 dark:bg-stone-800 px-2 py-1 border border-gray-200 dark:border-stone-700"
              >
                <span className="text-black dark:text-stone-200">{stock.symbol}</span>
                {stock.change && (
                  <>
                    {stock.positive ? (
                      <TrendingUp className="w-3 h-3 text-green-600 dark:text-green-400" />
                    ) : (
                      <TrendingDown className="w-3 h-3 text-red-600 dark:text-red-400" />
                    )}
                    <span className={stock.positive ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}>
                      {stock.change}
                    </span>
                  </>
                )}
              </span>
            ))}
          </div>
        )}
      </article>

      {/* Rest of Articles */}
      {rest.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">
          {rest.map((news, index) => (
            <article
              key={index}
              className="group pb-5 border-b border-black/5 dark:border-stone-800 last:border-b-0"
            >
              <div className="flex items-center gap-2 mb-2">
                <span className="text-[10px] font-medium text-gray-500 dark:text-stone-500 uppercase tracking-wide">
                  {news.source}
                </span>
              </div>
              <h4 className="font-serif text-sm font-semibold leading-snug mb-2 text-black dark:text-stone-200 group-hover:underline cursor-pointer line-clamp-2">
                {news.title}
              </h4>
              <p className="text-xs text-gray-500 dark:text-stone-500 leading-relaxed line-clamp-2 mb-2">
                {news.text}
              </p>
              {news.stocks.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {news.stocks.slice(0, 3).map((stock, idx) => (
                    <span
                      key={idx}
                      className="text-[10px] font-medium text-gray-600 dark:text-stone-400 bg-gray-50 dark:bg-stone-800/50 px-1.5 py-0.5"
                    >
                      {stock.symbol}
                    </span>
                  ))}
                  {news.stocks.length > 3 && (
                    <span className="text-[10px] text-gray-400 dark:text-stone-500">
                      +{news.stocks.length - 3}
                    </span>
                  )}
                </div>
              )}
            </article>
          ))}
        </div>
      )}
    </div>
  )
}

