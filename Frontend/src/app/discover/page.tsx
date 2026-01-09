"use client";

import { useState, useMemo, useCallback } from "react";
import { StockListItem } from "@/components/stocks/StockListItem";
import { StockDetailModal } from "@/components/stocks/StockDetailModal";
import { StockFilters } from "@/components/stocks/StockFilters";
import { PageHeader } from "@/components/cards/PageHeader";
import {
  useStocks,
  useStockMetadata,
  useStockDetail,
  useStockChart,
  type Stock,
} from "@/lib/hooks/useStocks";

interface FilterOptions {
  search: string;
  sector: string;
  industry: string;
  minPrice: string;
  maxPrice: string;
  minMarketCap: string;
  maxMarketCap: string;
  sortBy: "price" | "change" | "volume" | "name";
  sortOrder: "asc" | "desc";
}

const DEFAULT_FILTERS: FilterOptions = {
  search: "",
  sector: "",
  industry: "",
  minPrice: "",
  maxPrice: "",
  minMarketCap: "",
  maxMarketCap: "",
  sortBy: "change",
  sortOrder: "desc",
};

const STOCKS_PER_PAGE = 50;

export default function DiscoverPage() {
  const [selectedStockSymbol, setSelectedStockSymbol] = useState<string | null>(
    null
  );
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [timeframe, setTimeframe] = useState<"day" | "month" | "year">("month");
  const [filters, setFilters] = useState<FilterOptions>(DEFAULT_FILTERS);
  const [currentPage, setCurrentPage] = useState(1);

  // Reset to page 1 when filters change
  const handleFiltersChange = useCallback((newFilters: FilterOptions) => {
    setFilters(newFilters);
    setCurrentPage(1);
  }, []);

  // Calculate offset for pagination
  const offset = (currentPage - 1) * STOCKS_PER_PAGE;

  // Fetch stocks with pagination
  const { data: stocksData, isLoading } = useStocks({
    limit: STOCKS_PER_PAGE,
    offset: offset,
    search: filters.search || undefined,
  });
  
  const { data: metadataData } = useStockMetadata();

  const stocks = useMemo(() => stocksData?.stocks || [], [stocksData?.stocks]);
  const totalStocks = stocksData?.total || 0;
  const totalPages = Math.ceil(totalStocks / STOCKS_PER_PAGE);

  // Apply client-side filters and sorting
  const filteredAndSortedStocks = useMemo(() => {
    let filtered = [...stocks];

    // Apply sector filter
    if (filters.sector) {
      filtered = filtered.filter((stock) => stock.sector === filters.sector);
    }

    // Apply industry filter
    if (filters.industry) {
      filtered = filtered.filter(
        (stock) => stock.industry === filters.industry
      );
    }

    // Apply price range filter
    if (filters.minPrice) {
      const minPrice = parseFloat(filters.minPrice);
      if (!isNaN(minPrice)) {
        filtered = filtered.filter((stock) => stock.price >= minPrice);
      }
    }
    if (filters.maxPrice) {
      const maxPrice = parseFloat(filters.maxPrice);
      if (!isNaN(maxPrice)) {
        filtered = filtered.filter((stock) => stock.price <= maxPrice);
      }
    }

    // Apply market cap filter
    if (filters.minMarketCap) {
      const minCap = parseFloat(filters.minMarketCap) * 1_000_000;
      if (!isNaN(minCap)) {
        filtered = filtered.filter((stock) => (stock.marketCap || 0) >= minCap);
      }
    }
    if (filters.maxMarketCap) {
      const maxCap = parseFloat(filters.maxMarketCap) * 1_000_000;
      if (!isNaN(maxCap)) {
        filtered = filtered.filter((stock) => (stock.marketCap || 0) <= maxCap);
      }
    }

    // Sort stocks
    filtered.sort((a, b) => {
      let comparison = 0;
      switch (filters.sortBy) {
        case "price":
          comparison = a.price - b.price;
          break;
        case "change":
          comparison = a.changePercent - b.changePercent;
          break;
        case "name":
          comparison = (a.symbol || "").localeCompare(b.symbol || "");
          break;
        default:
          comparison = a.changePercent - b.changePercent;
      }
      return filters.sortOrder === "asc" ? comparison : -comparison;
    });

    return filtered;
  }, [stocks, filters]);

  // Extract sectors and industries from metadata or stocks
  const sectors = useMemo(() => {
    if (metadataData?.sectors && metadataData.sectors.length > 0) {
      return metadataData.sectors;
    }
    const uniqueSectors = new Set<string>();
    stocks.forEach((stock: Stock) => {
      if (stock.sector) uniqueSectors.add(stock.sector);
    });
    return Array.from(uniqueSectors).sort();
  }, [metadataData?.sectors, stocks]);

  const industries = useMemo(() => {
    if (metadataData?.industries && metadataData.industries.length > 0) {
      return metadataData.industries;
    }
    const uniqueIndustries = new Set<string>();
    stocks.forEach((stock: Stock) => {
      if (stock.industry) uniqueIndustries.add(stock.industry);
    });
    return Array.from(uniqueIndustries).sort();
  }, [metadataData?.industries, stocks]);

  // Fetch stock detail (info only - cached, doesn't change with timeframe)
  const { data: stockInfo, isLoading: isLoadingStockInfo } = useStockDetail(selectedStockSymbol);
  
  // Fetch chart data separately (refetches when timeframe changes)
  const days = timeframe === "day" ? 7 : timeframe === "month" ? 30 : 365;
  const { data: chartData, isLoading: isLoadingChart } = useStockChart(selectedStockSymbol, days);
  
  // Combine stock info and chart data
  const selectedStock = useMemo(() => {
    if (!stockInfo) return null;
    return {
      ...stockInfo,
      chartData: chartData?.chartData || [],
      forecastData: chartData?.forecastData,
    } as typeof stockInfo & { chartData: Array<{ date: string; price: number }>; forecastData?: Array<{ date: string; price: number }> };
  }, [stockInfo, chartData]);
  
  const isLoadingDetail = isLoadingStockInfo;

  // Pagination handlers
  const handlePreviousPage = useCallback(() => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [currentPage]);

  const handleNextPage = useCallback(() => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [currentPage, totalPages]);

  const handlePageChange = useCallback((page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  // Handle stock click - open modal and set selected symbol
  const handleStockClick = useCallback((stock: Stock) => {
    setSelectedStockSymbol(stock.symbol);
    setIsModalOpen(true);
  }, []);

  // Handle timeframe change - React Query will automatically refetch with new days value
  const handleTimeframeChange = useCallback(
    (newTimeframe: "day" | "month" | "year") => {
      setTimeframe(newTimeframe);
    },
    []
  );

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-stone-900">
      <main className="max-w-7xl mx-auto px-4 py-8">
        <PageHeader title="Discover Stocks" />

        {/* Filters */}
        <div className="mt-6 mb-6">
          <StockFilters
            filters={filters}
            onFiltersChange={handleFiltersChange}
            sectors={sectors}
            industries={industries}
          />
        </div>

        {/* Stock Grid */}
        {isLoading && filteredAndSortedStocks.length === 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {[...Array(12)].map((_, i) => (
              <div
                key={i}
                className="bg-white dark:bg-stone-800 border border-gray-200 dark:border-stone-700 rounded-lg p-4 animate-pulse"
              >
                <div className="h-6 bg-gray-200 dark:bg-stone-700 rounded w-1/2 mb-2"></div>
                <div className="h-4 bg-gray-200 dark:bg-stone-700 rounded w-3/4 mb-4"></div>
                <div className="h-8 bg-gray-200 dark:bg-stone-700 rounded w-1/2"></div>
              </div>
            ))}
          </div>
        ) : filteredAndSortedStocks.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500 dark:text-stone-400 text-lg">
              No stocks found matching your filters.
            </p>
            <button
              onClick={() => {
                handleFiltersChange(DEFAULT_FILTERS);
                setCurrentPage(1);
              }}
              className="mt-4 text-accent hover:underline"
            >
              Clear all filters
            </button>
          </div>
        ) : (
          <>
            <div className="mb-4 text-sm text-gray-600 dark:text-stone-400">
              Showing {offset + 1}-{Math.min(offset + STOCKS_PER_PAGE, totalStocks)} of {totalStocks} stocks
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredAndSortedStocks.map((stock) => (
                <StockListItem
                  key={stock.symbol}
                  symbol={stock.symbol}
                  company={stock.company}
                  price={stock.price}
                  change={stock.change}
                  changePercent={stock.changePercent}
                  sector={stock.sector}
                  onClick={() => handleStockClick(stock)}
                />
              ))}
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="mt-8 flex items-center justify-center gap-2">
                <button
                  onClick={handlePreviousPage}
                  disabled={currentPage === 1}
                  className="px-4 py-2 border border-gray-300 dark:border-stone-600 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-stone-800 transition-colors text-gray-700 dark:text-stone-300"
                >
                  Previous
                </button>
                
                {/* Page Numbers */}
                <div className="flex gap-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum: number;
                    if (totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (currentPage <= 3) {
                      pageNum = i + 1;
                    } else if (currentPage >= totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    } else {
                      pageNum = currentPage - 2 + i;
                    }
                    
                    return (
                      <button
                        key={pageNum}
                        onClick={() => handlePageChange(pageNum)}
                        className={`px-3 py-2 border rounded-md transition-colors ${
                          currentPage === pageNum
                            ? "bg-black dark:bg-stone-100 text-white dark:text-stone-900 border-black dark:border-stone-100"
                            : "border-gray-300 dark:border-stone-600 hover:bg-gray-50 dark:hover:bg-stone-800 text-gray-700 dark:text-stone-300"
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                </div>

                <button
                  onClick={handleNextPage}
                  disabled={currentPage >= totalPages}
                  className="px-4 py-2 border border-gray-300 dark:border-stone-600 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-stone-800 transition-colors text-gray-700 dark:text-stone-300"
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}

        {/* Stock Detail Modal */}
        <StockDetailModal
          stock={selectedStock}
          isOpen={isModalOpen}
          isLoading={isLoadingDetail}
          isLoadingChart={isLoadingChart}
          onClose={() => {
            setIsModalOpen(false);
            setSelectedStockSymbol(null);
          }}
          timeframe={timeframe}
          onTimeframeChange={handleTimeframeChange}
        />
      </main>
    </div>
  );
}
