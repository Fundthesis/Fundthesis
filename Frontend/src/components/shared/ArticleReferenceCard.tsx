import React, { useState } from 'react';
import { ChevronDown, ChevronUp, ExternalLink } from 'lucide-react';
import { ArticleSource } from '@/lib/aiCoach';

interface ArticleReferenceCardProps {
  article: ArticleSource;
}

const ArticleReferenceCard: React.FC<ArticleReferenceCardProps> = ({ article }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const formatDate = (dateString?: string): string => {
    if (!dateString) return '';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    } catch {
      return '';
    }
  };

  const isModule = article.sourceType === 'module';
  const url = article.url || (isModule && article.moduleNumber ? `/lessonmodules/${article.moduleNumber}` : undefined);
  
  const headlineContent = url ? (
    <a
      href={url}
      target={isModule ? undefined : "_blank"}
      rel={isModule ? undefined : "noopener noreferrer"}
      onClick={(e) => e.stopPropagation()}
      className="font-serif font-semibold text-stone-900 dark:text-stone-100 hover:text-stone-700 dark:hover:text-stone-300 underline transition-colors inline-flex items-center gap-1"
    >
      {article.headline}
      {!isModule && <ExternalLink className="w-3 h-3" />}
    </a>
  ) : (
    <span className="font-serif font-semibold text-stone-900 dark:text-stone-100">
      {article.headline}
    </span>
  );

  return (
    <div 
      className="border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 rounded cursor-pointer hover:border-stone-300 dark:hover:border-stone-600 transition-colors"
      onClick={() => setIsExpanded(!isExpanded)}
    >
      {/* Compact Header - Always Visible */}
      <div className="p-2 flex items-center justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="font-serif text-sm">
            {headlineContent}
          </div>
          <div className="flex items-center gap-2 text-xs text-stone-500 dark:text-stone-400 mt-0.5">
            <span className="uppercase tracking-wider truncate">{article.source}</span>
            {isModule && article.sectionHeading && (
              <>
                <span className="text-stone-300 dark:text-stone-600">•</span>
                <span className="truncate">{article.sectionHeading}</span>
              </>
            )}
            {!isModule && article.publishedAt && (
              <>
                <span className="text-stone-300 dark:text-stone-600">•</span>
                <span className="whitespace-nowrap">{formatDate(article.publishedAt)}</span>
              </>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {isExpanded ? (
            <ChevronUp className="w-4 h-4 text-stone-400 dark:text-stone-500" />
          ) : (
            <ChevronDown className="w-4 h-4 text-stone-400 dark:text-stone-500" />
          )}
        </div>
      </div>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="px-2 pb-2 pt-0 space-y-2 border-t border-stone-200 dark:border-stone-700">
          {/* Content Snippet */}
          {article.snippet && (
            <p className="text-xs text-stone-600 dark:text-stone-300 leading-relaxed pt-2">
              {article.snippet}
            </p>
          )}

          {/* Metadata Tags */}
          {(article.tickers || article.sentiment || (isModule && article.chunkType)) && (
            <div className="flex flex-wrap gap-2 pt-1">
              {article.tickers && (
                <span className="text-xs text-stone-500 dark:text-stone-400 bg-stone-50 dark:bg-stone-900 px-2 py-1 rounded">
                  {article.tickers}
                </span>
              )}
              {article.sentiment && (
                <span className="text-xs text-stone-500 dark:text-stone-400 bg-stone-50 dark:bg-stone-900 px-2 py-1 rounded capitalize">
                  {article.sentiment}
                </span>
              )}
              {isModule && article.chunkType && (
                <span className="text-xs text-stone-500 dark:text-stone-400 bg-stone-50 dark:bg-stone-900 px-2 py-1 rounded capitalize">
                  {article.chunkType}
                </span>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ArticleReferenceCard;

