"use client";

import React from "react";
import { NewsArticle } from "@/lib/api";
import { trackArticleView } from "@/lib/tracking";

interface NewsArticleModalProps {
  article: NewsArticle | null;
  isOpen: boolean;
  onClose: () => void;
}

export default function NewsArticleModal({
  article,
  isOpen,
  onClose,
}: NewsArticleModalProps) {
  // Wrapper to ensure scroll is restored when closing
  const handleClose = React.useCallback(() => {
    document.body.style.removeProperty("overflow");
    onClose();
  }, [onClose]);

  // Track article view when modal opens
  React.useEffect(() => {
    if (isOpen && article) {
      trackArticleView(article.id, article.headline, article.source).catch(
        (error) => console.error("Failed to track article view:", error)
      );
    }
  }, [isOpen, article]);

  // Close modal on Escape key and manage body scroll
  React.useEffect(() => {
    if (!isOpen) {
      // Ensure scroll is restored when modal is closed
      document.body.style.removeProperty("overflow");
      return;
    }

    // Store the original overflow value before changing it
    const originalOverflow = document.body.style.overflow || "";

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        handleClose();
      }
    };

    document.addEventListener("keydown", handleEscape);
    document.body.style.overflow = "hidden"; // Prevent background scrolling

    return () => {
      document.removeEventListener("keydown", handleEscape);
      // Always restore scroll when effect cleans up - remove the style property
      if (originalOverflow) {
        document.body.style.overflow = originalOverflow;
      } else {
        document.body.style.removeProperty("overflow");
      }
    };
  }, [isOpen, handleClose]);

  if (!isOpen || !article) return null;

  const getRecommendationColor = (recommendation: string) => {
    switch (recommendation) {
      case "Buy":
        return "bg-green-100 dark:bg-green-950/30 text-green-800 dark:text-green-300 border-green-300 dark:border-green-700";
      case "Sell":
        return "bg-red-100 dark:bg-red-950/30 text-red-800 dark:text-red-300 border-red-300 dark:border-red-700";
      case "Hold":
        return "bg-yellow-100 dark:bg-yellow-950/30 text-yellow-800 dark:text-yellow-300 border-yellow-300 dark:border-yellow-700";
      default:
        return "bg-gray-100 dark:bg-stone-700 text-gray-800 dark:text-stone-300 border-gray-300 dark:border-stone-600";
    }
  };

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return dateString;
    }
  };

  // Close modal when clicking outside
  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      handleClose();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-transparent bg-opacity-50 backdrop-blur-sm"
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="news-modal-title"
    >
      <div
        className="bg-white dark:bg-stone-800 rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 bg-white dark:bg-stone-800 border-b border-gray-200 dark:border-stone-700 p-6 flex justify-between items-start">
          <div className="flex-1">
            <h2
              id="news-modal-title"
              className="text-2xl font-bold text-gray-900 dark:text-stone-100 mb-2"
            >
              {article.headline}
            </h2>
            <div className="flex flex-wrap gap-2 items-center text-sm text-gray-600 dark:text-stone-400">
              <span>{article.source}</span>
              <span>•</span>
              <span>{formatDate(article.published_at)}</span>
              {article.tickers.length > 0 && (
                <>
                  <span>•</span>
                  <div className="flex gap-1 flex-wrap">
                    {article.tickers.map((ticker) => (
                      <span
                        key={ticker}
                        className="px-2 py-1 bg-blue-100 dark:bg-blue-950/30 text-blue-800 dark:text-blue-300 rounded text-xs font-medium"
                      >
                        {ticker}
                      </span>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
          <button
            onClick={handleClose}
            className="ml-4 text-gray-400 dark:text-stone-500 hover:text-gray-600 dark:hover:text-stone-300"
            aria-label="Close"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Summary */}
          {article.summary && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-stone-100 mb-2">
                Summary
              </h3>
              <p className="text-gray-700 dark:text-stone-300 leading-relaxed">{article.summary}</p>
            </div>
          )}

          {/* Full Text */}
          {article.full_text && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-stone-100 mb-2">
                Full Article
              </h3>
              <p className="text-gray-700 dark:text-stone-300 leading-relaxed whitespace-pre-wrap">
                {article.full_text.length > 2000
                  ? `${article.full_text.substring(0, 2000)}...`
                  : article.full_text}
              </p>
            </div>
          )}

          {/* Recommendation */}
          <div className="border-t border-gray-200 dark:border-stone-700 pt-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-stone-100 mb-2">
                  Actionable Recommendation
                </h3>
                <p className="text-sm text-gray-600 dark:text-stone-400">
                  Based on sentiment analysis and article content
                </p>
              </div>
              <div
                className={`px-6 py-3 rounded-lg border-2 font-bold text-lg ${getRecommendationColor(
                  article.recommendation
                )}`}
              >
                {article.recommendation}
              </div>
            </div>
          </div>

          {/* External Link */}
          {article.url && (
            <div className="border-t border-gray-200 dark:border-stone-700 pt-6">
              <a
                href={article.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 font-medium"
              >
                Read full article
                <svg
                  className="w-4 h-4 ml-2"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                  />
                </svg>
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
