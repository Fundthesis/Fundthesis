"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { StockCard } from "@/components/discover/StockCard";
import { StockDetailModal } from "@/components/discover/StockDetailModal";
import { StockFilters } from "@/components/discover/StockFilters";
import { PageHeader } from "@/components/ui/PageHeader";
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

export default function DiscoverPage() {
  const [filteredStocks, setFilteredStocks] = useState<Stock[]>([]);
  const [selectedStockSymbol, setSelectedStockSymbol] = useState<string | null>(
    null
  );
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [timeframe, setTimeframe] = useState<"day" | "month" | "year">("month");
  const [filters, setFilters] = useState<FilterOptions>(DEFAULT_FILTERS);

  // Fetch stocks list and metadata using React Query
  // Pass search to backend for server-side filtering
  const { data: stocksData, isLoading: isLoadingStocks } = useStocks({
    limit: 100,
    offset: 0,
    search: filters.search || undefined,
  });
  const { data: metadataData } = useStockMetadata();

  // Memoize stocks to prevent unnecessary re-renders
  const stocks = useMemo(() => stocksData?.stocks || [], [stocksData?.stocks]);
  const isLoading = isLoadingStocks;

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

  // Filter and sort stocks (search is now handled by backend)
  useEffect(() => {
    let filtered = [...stocks];

    // Note: Search filtering is now done on the backend via useStocks hook
    // Only apply client-side filters that aren't supported by backend yet

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
    if (filters.minMarketCap && filters.minMarketCap) {
      const minCap = parseFloat(filters.minMarketCap) * 1_000_000;
      if (!isNaN(minCap)) {
        filtered = filtered.filter((stock) => (stock.marketCap || 0) >= minCap);
      }
    }
    if (filters.maxMarketCap && filters.maxMarketCap) {
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

    setFilteredStocks(filtered);
  }, [stocks, filters]);

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
    <div className="min-h-screen bg-gray-50">
      <main className="max-w-7xl mx-auto px-4 py-8">
        <PageHeader title="Discover Stocks" />

        {/* Filters */}
        <div className="mt-6 mb-6">
          <StockFilters
            filters={filters}
            onFiltersChange={setFilters}
            sectors={sectors}
            industries={industries}
          />
        </div>

        {/* Stock Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {[...Array(12)].map((_, i) => (
              <div
                key={i}
                className="bg-white border border-gray-200 rounded-lg p-4 animate-pulse"
              >
                <div className="h-6 bg-gray-200 rounded w-1/2 mb-2"></div>
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
                <div className="h-8 bg-gray-200 rounded w-1/2"></div>
              </div>
            ))}
          </div>
        ) : filteredStocks.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500 text-lg">
              No stocks found matching your filters.
            </p>
            <button
              onClick={() => setFilters(DEFAULT_FILTERS)}
              className="mt-4 text-[#9DB38A] hover:underline"
            >
              Clear all filters
            </button>
          </div>
        ) : (
          <>
            <div className="mb-4 text-sm text-gray-600">
              Showing {filteredStocks.length} of {stocks.length} stocks
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredStocks.map((stock) => (
                <StockCard
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
