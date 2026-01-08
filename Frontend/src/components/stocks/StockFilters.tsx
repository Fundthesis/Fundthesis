"use client";

import { Search, X } from "lucide-react";
import { useState } from "react";

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

interface StockFiltersProps {
  filters: FilterOptions;
  onFiltersChange: (filters: FilterOptions) => void;
  sectors?: string[];
  industries?: string[];
}

export function StockFilters({
  filters,
  onFiltersChange,
  sectors = [],
  industries = [],
}: StockFiltersProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const updateFilter = (key: keyof FilterOptions, value: string) => {
    onFiltersChange({ ...filters, [key]: value });
  };

  const clearFilters = () => {
    onFiltersChange({
      search: "",
      sector: "",
      industry: "",
      minPrice: "",
      maxPrice: "",
      minMarketCap: "",
      maxMarketCap: "",
      sortBy: "change",
      sortOrder: "desc",
    });
  };

  const hasActiveFilters =
    filters.search ||
    filters.sector ||
    filters.industry ||
    filters.minPrice ||
    filters.maxPrice ||
    filters.minMarketCap ||
    filters.maxMarketCap;

  return (
    <div className="bg-white dark:bg-stone-800 border border-gray-200 dark:border-stone-700 rounded-lg p-4">
      {/* Search Bar */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-stone-500 w-5 h-5" />
        <input
          type="text"
          placeholder="Search by symbol or company name..."
          value={filters.search}
          onChange={(e) => updateFilter("search", e.target.value)}
          className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-stone-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#9DB38A] bg-white dark:bg-stone-900 text-gray-900 dark:text-stone-100 placeholder-gray-400 dark:placeholder-stone-500"
        />
      </div>

      {/* Sort Controls */}
      <div className="flex items-center gap-4 mb-4">
        <select
          value={filters.sortBy}
          onChange={(e) => updateFilter("sortBy", e.target.value)}
          className="px-3 py-2 border border-gray-300 dark:border-stone-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#9DB38A] bg-white dark:bg-stone-900 text-gray-900 dark:text-stone-100"
        >
          <option value="change">Sort by Change</option>
          <option value="price">Sort by Price</option>
          <option value="volume">Sort by Volume</option>
          <option value="name">Sort by Name</option>
        </select>
        <button
          onClick={() =>
            updateFilter("sortOrder", filters.sortOrder === "asc" ? "desc" : "asc")
          }
          className="px-3 py-2 border border-gray-300 dark:border-stone-600 rounded-lg hover:bg-gray-50 dark:hover:bg-stone-700 transition-colors text-gray-700 dark:text-stone-300"
        >
          {filters.sortOrder === "asc" ? "↑ Ascending" : "↓ Descending"}
        </button>
        {hasActiveFilters && (
          <button
            onClick={clearFilters}
            className="ml-auto px-3 py-2 text-sm text-gray-600 dark:text-stone-400 hover:text-gray-900 dark:hover:text-stone-100 flex items-center gap-1"
          >
            <X className="w-4 h-4" />
            Clear Filters
          </button>
        )}
      </div>

      {/* Expandable Advanced Filters */}
      <div>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="text-sm text-[#9DB38A] hover:underline mb-2"
        >
          {isExpanded ? "Hide" : "Show"} Advanced Filters
        </button>

        {isExpanded && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-4 pt-4 border-t border-gray-200 dark:border-stone-700">
            {/* Sector Filter */}
            {sectors.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-stone-300 mb-1">
                  Sector
                </label>
                <select
                  value={filters.sector}
                  onChange={(e) => updateFilter("sector", e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-stone-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#9DB38A] bg-white dark:bg-stone-900 text-gray-900 dark:text-stone-100"
                >
                  <option value="">All Sectors</option>
                  {sectors.map((sector) => (
                    <option key={sector} value={sector}>
                      {sector}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Industry Filter */}
            {industries.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-stone-300 mb-1">
                  Industry
                </label>
                <select
                  value={filters.industry}
                  onChange={(e) => updateFilter("industry", e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-stone-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#9DB38A] bg-white dark:bg-stone-900 text-gray-900 dark:text-stone-100"
                >
                  <option value="">All Industries</option>
                  {industries.map((industry) => (
                    <option key={industry} value={industry}>
                      {industry}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Price Range */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-stone-300 mb-1">
                Price Range
              </label>
              <div className="flex gap-2">
                <input
                  type="number"
                  placeholder="Min"
                  value={filters.minPrice}
                  onChange={(e) => updateFilter("minPrice", e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-stone-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#9DB38A] bg-white dark:bg-stone-900 text-gray-900 dark:text-stone-100 placeholder-gray-400 dark:placeholder-stone-500"
                />
                <input
                  type="number"
                  placeholder="Max"
                  value={filters.maxPrice}
                  onChange={(e) => updateFilter("maxPrice", e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-stone-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#9DB38A] bg-white dark:bg-stone-900 text-gray-900 dark:text-stone-100 placeholder-gray-400 dark:placeholder-stone-500"
                />
              </div>
            </div>

            {/* Market Cap Range */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-stone-300 mb-1">
                Market Cap (M)
              </label>
              <div className="flex gap-2">
                <input
                  type="number"
                  placeholder="Min"
                  value={filters.minMarketCap}
                  onChange={(e) => updateFilter("minMarketCap", e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-stone-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#9DB38A] bg-white dark:bg-stone-900 text-gray-900 dark:text-stone-100 placeholder-gray-400 dark:placeholder-stone-500"
                />
                <input
                  type="number"
                  placeholder="Max"
                  value={filters.maxMarketCap}
                  onChange={(e) => updateFilter("maxMarketCap", e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-stone-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#9DB38A] bg-white dark:bg-stone-900 text-gray-900 dark:text-stone-100 placeholder-gray-400 dark:placeholder-stone-500"
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

