'use client';

import React, { useState, useEffect } from 'react';
import { Mission } from '@/data/missions';
import { fetchArticles, type NewsArticle } from '@/lib/api';
import { Newspaper, ExternalLink, Loader2 } from 'lucide-react';

interface MissionNewsFeedProps {
  mission: Mission;
}

// Map mission scenarios to search keywords
const getMissionKeywords = (mission: Mission): string[] => {
  const scenario = mission.sandboxConfig.scenario;
  const keywords: string[] = [];

  switch (scenario) {
    case 'inflation':
      keywords.push('inflation', 'CPI', 'consumer price', 'federal reserve', 'monetary policy');
      break;
    case 'rate-cut':
      keywords.push('interest rate', 'federal reserve', 'fed rate', 'monetary policy', 'bond yield');
      break;
    case 'currency-weak':
      keywords.push('dollar', 'USD', 'currency', 'forex', 'exchange rate', 'multinational');
      break;
    case 'tariff':
      keywords.push('tariff', 'trade war', 'china', 'import', 'supply chain', 'manufacturing');
      break;
    case 'merger':
      keywords.push('merger', 'acquisition', 'M&A', 'takeover', 'arbitrage');
      break;
    case 'bubble':
      keywords.push('AI', 'artificial intelligence', 'hype', 'valuation', 'bubble', 'tech stock');
      break;
    case 'pandemic':
      keywords.push('semiconductor', 'supply chain', 'taiwan', 'chip', 'manufacturing', 'lockdown');
      break;
    case 'crash-2008':
      keywords.push('financial crisis', 'recession', 'market crash', 'liquidity', 'banking');
      break;
    case 'live-news':
      keywords.push('breaking', 'market', 'stock', 'earnings', 'economic');
      break;
    default:
      keywords.push('market', 'stock', 'investment', 'portfolio');
  }

  // Add category-specific keywords
  if (mission.category === 'macro') {
    keywords.push('economy', 'GDP', 'unemployment', 'inflation');
  } else if (mission.category === 'events') {
    keywords.push('breaking news', 'market event', 'corporate action');
  } else if (mission.category === 'psychology') {
    keywords.push('investor sentiment', 'market psychology', 'behavioral finance');
  }

  return keywords;
};

export function MissionNewsFeed({ mission }: MissionNewsFeedProps) {
  const [articles, setArticles] = useState<NewsArticle[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadNews = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const keywords = getMissionKeywords(mission);
        // Search for articles matching mission keywords
        const searchQuery = keywords.slice(0, 3).join(' OR ');
        
        const response = await fetchArticles({
          search: searchQuery,
          limit: 10,
          orderBy: 'publishedAt',
          orderDirection: 'desc',
        });

        setArticles(response.articles);
      } catch (err) {
        console.error('Failed to load mission news:', err);
        // If it's a 401, show a helpful message
        if (err instanceof Error && err.message.includes('401')) {
          setError('Authentication required to load news articles. Please sign in to see relevant news for this mission.');
        } else {
          setError('Failed to load relevant news articles. News will be available once you sign in.');
        }
        // Don't try fallback if it's an auth error
        setArticles([]);
      } finally {
        setIsLoading(false);
      }
    };

    loadNews();
  }, [mission]);

  if (isLoading) {
    return (
      <div className="bg-white dark:bg-stone-800 border-2 border-black dark:border-stone-700 p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] dark:shadow-[8px_8px_0px_0px_rgba(0,0,0,0.5)]">
        <div className="flex items-center gap-2 mb-4">
          <Newspaper className="w-5 h-5 text-black dark:text-stone-400" />
          <h3 className="text-lg font-black font-serif text-black dark:text-stone-100 uppercase tracking-wide">
            Scenario News Feed
          </h3>
        </div>
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-gray-400 dark:text-stone-500" />
        </div>
      </div>
    );
  }

  if (error && articles.length === 0) {
    return (
      <div className="bg-white dark:bg-stone-800 border-2 border-black dark:border-stone-700 p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] dark:shadow-[8px_8px_0px_0px_rgba(0,0,0,0.5)]">
        <div className="flex items-center gap-2 mb-4">
          <Newspaper className="w-5 h-5 text-black dark:text-stone-400" />
          <h3 className="text-lg font-black font-serif text-black dark:text-stone-100 uppercase tracking-wide">
            Scenario News Feed
          </h3>
        </div>
        <p className="text-sm text-gray-600 dark:text-stone-400">{error}</p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-stone-800 border-2 border-black dark:border-stone-700 p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] dark:shadow-[8px_8px_0px_0px_rgba(0,0,0,0.5)]">
      <div className="flex items-center gap-2 mb-4 border-b-2 border-black dark:border-stone-700 pb-2">
        <Newspaper className="w-5 h-5 text-black dark:text-stone-400" />
        <h3 className="text-lg font-black font-serif text-black dark:text-stone-100 uppercase tracking-wide">
          Scenario News Feed
        </h3>
      </div>

      <p className="text-xs text-gray-600 dark:text-stone-400 mb-4 italic">
        News relevant to: {mission.sandboxConfig.marketCondition || mission.title}
      </p>

      <div className="space-y-4 max-h-[600px] overflow-y-auto">
        {articles.length === 0 ? (
          <p className="text-sm text-gray-600 dark:text-stone-400 italic text-center py-4">
            No relevant news articles found for this scenario.
          </p>
        ) : (
          articles.map((article) => (
            <article
              key={article.id}
              className="border-b border-stone-200 dark:border-stone-700 pb-4 last:border-b-0 last:pb-0"
            >
              <div className="flex items-start justify-between gap-2 mb-2">
                <h4 className="text-sm font-bold text-black dark:text-stone-100 leading-snug flex-1">
                  {article.headline}
                </h4>
                {article.url && (
                  <a
                    href={article.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-shrink-0 text-gray-400 hover:text-black dark:hover:text-stone-300 transition-colors"
                    title="Read full article"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </a>
                )}
              </div>
              {article.summary && (
                <p className="text-xs text-gray-600 dark:text-stone-400 line-clamp-2 mb-2">
                  {article.summary}
                </p>
              )}
              <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-stone-500">
                {article.source && (
                  <span className="font-semibold uppercase tracking-wide">{article.source}</span>
                )}
                {article.publishedAt && (
                  <span>
                    {new Date(article.publishedAt).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </span>
                )}
                {article.tickers && article.tickers.length > 0 && (
                  <span className="text-green-600 dark:text-green-400">
                    {article.tickers.slice(0, 3).join(', ')}
                  </span>
                )}
              </div>
            </article>
          ))
        )}
      </div>
    </div>
  );
}
