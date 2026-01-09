'use client';

import React, { useState, useMemo } from 'react';
import { 
  Briefcase, 
  TrendingUp, 
  TrendingDown, 
  Target, 
  AlertTriangle,
  Search,
  Plus,
  Minus,
  Play,
  BarChart3,
  Shield,
  Zap,
  Info,
  ChevronRight,
  Building2,
  Cpu,
  Heart,
  DollarSign,
  Fuel,
  Factory,
  Gem,
  Landmark,
  Radio,
  Newspaper,
  Calendar,
  Eye,
  EyeOff,
} from 'lucide-react';

import { Mission } from '@/data/missions';
import { 
  SimulatedStock, 
  MISSION_STOCKS,
  SCENARIO_CONFIGS,
  calculateDiversificationScore,
} from '@/lib/missionSimulation';
import { getMissionNewsEvents } from '@/lib/missionNewsEvents';

// Sector icons mapping
const SECTOR_ICONS: Record<string, React.ElementType> = {
  'Technology': Cpu,
  'Healthcare': Heart,
  'Finance': DollarSign,
  'Consumer': Building2,
  'Energy': Fuel,
  'Industrial': Factory,
  'Materials': Gem,
  'Utilities': Zap,
  'Real Estate': Landmark,
  'Communications': Radio,
};

// Pre-built portfolios for certain scenarios
const PRE_BUILT_PORTFOLIOS: Record<string, { symbol: string; quantity: number }[]> = {
  'inflation': [
    { symbol: 'SPY', quantity: 50 },
    { symbol: 'QQQ', quantity: 30 },
    { symbol: 'AAPL', quantity: 20 },
    { symbol: 'MSFT', quantity: 15 },
  ],
  'crash-2008': [
    { symbol: 'BAC', quantity: 200 },
    { symbol: 'JPM', quantity: 80 },
    { symbol: 'XOM', quantity: 50 },
    { symbol: 'SPY', quantity: 40 },
  ],
  'tariff': [
    { symbol: 'AAPL', quantity: 30 },
    { symbol: 'NVDA', quantity: 15 },
    { symbol: 'AMZN', quantity: 25 },
    { symbol: 'WMT', quantity: 40 },
  ],
  'pandemic': [
    { symbol: 'NVDA', quantity: 20 },
    { symbol: 'AAPL', quantity: 30 },
    { symbol: 'MSFT', quantity: 20 },
    { symbol: 'SPY', quantity: 30 },
  ],
};

// Scenarios that provide a pre-built portfolio
const SCENARIOS_WITH_PREBUILT = ['inflation', 'crash-2008', 'tariff', 'pandemic'];

interface MissionPreBuildProps {
  mission: Mission;
  onStartSimulation: (holdings: Record<string, { quantity: number; avgPrice: number }>, cashBalance: number) => void;
  onExit: () => void;
}

export function MissionPreBuild({ mission, onStartSimulation, onExit }: MissionPreBuildProps) {
  const scenario = mission.sandboxConfig.scenario;
  const hasPreBuiltPortfolio = SCENARIOS_WITH_PREBUILT.includes(scenario);
  const scenarioConfig = SCENARIO_CONFIGS[scenario] || SCENARIO_CONFIGS.neutral;
  
  // Initialize holdings from pre-built portfolio if applicable
  const [holdings, setHoldings] = useState<Record<string, { quantity: number; avgPrice: number }>>(() => {
    if (hasPreBuiltPortfolio) {
      const preBuilt = PRE_BUILT_PORTFOLIOS[scenario] || [];
      const result: Record<string, { quantity: number; avgPrice: number }> = {};
      preBuilt.forEach(item => {
        const stock = MISSION_STOCKS.find(s => s.symbol === item.symbol);
        if (stock) {
          result[item.symbol] = { quantity: item.quantity, avgPrice: stock.basePrice };
        }
      });
      return result;
    }
    return {};
  });

  // Calculate initial cash based on pre-built portfolio
  const initialCashUsed = useMemo(() => {
    if (hasPreBuiltPortfolio) {
      return Object.entries(holdings).reduce((sum, [symbol, h]) => {
        const stock = MISSION_STOCKS.find(s => s.symbol === symbol);
        return sum + (stock ? stock.basePrice * h.quantity : 0);
      }, 0);
    }
    return 0;
  }, [holdings, hasPreBuiltPortfolio]);

  const [cashBalance, setCashBalance] = useState(
    mission.sandboxConfig.startingBalance - initialCashUsed
  );

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSector, setSelectedSector] = useState<string | null>(null);
  const [showBriefing, setShowBriefing] = useState(true);

  // Get stocks to display
  const stocks = MISSION_STOCKS;
  const sectors = [...new Set(stocks.map(s => s.sector))];

  const filteredStocks = useMemo(() => {
    return stocks.filter(stock => {
      const matchesSearch = 
        stock.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
        stock.company.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesSector = !selectedSector || stock.sector === selectedSector;
      return matchesSearch && matchesSector;
    });
  }, [stocks, searchQuery, selectedSector]);

  // Calculate portfolio metrics
  const portfolioValue = useMemo(() => {
    let holdingsValue = 0;
    Object.entries(holdings).forEach(([symbol, h]) => {
      const stock = stocks.find(s => s.symbol === symbol);
      if (stock) {
        holdingsValue += stock.basePrice * h.quantity;
      }
    });
    return cashBalance + holdingsValue;
  }, [holdings, stocks, cashBalance]);

  const holdingsForDiversification = useMemo(() => {
    return Object.entries(holdings)
      .filter(([, h]) => h.quantity > 0)
      .map(([symbol, h]) => {
        const stock = stocks.find(s => s.symbol === symbol);
        return { symbol, value: stock ? stock.basePrice * h.quantity : 0 };
      });
  }, [holdings, stocks]);

  const diversificationScore = useMemo(() => {
    return calculateDiversificationScore(holdingsForDiversification, stocks);
  }, [holdingsForDiversification, stocks]);

  // Get sector allocation
  const sectorAllocation = useMemo(() => {
    const allocation: Record<string, number> = {};
    Object.entries(holdings).forEach(([symbol, h]) => {
      if (h.quantity > 0) {
        const stock = stocks.find(s => s.symbol === symbol);
        if (stock) {
          const value = stock.basePrice * h.quantity;
          allocation[stock.sector] = (allocation[stock.sector] || 0) + value;
        }
      }
    });
    return allocation;
  }, [holdings, stocks]);

  const totalHoldingsValue = portfolioValue - cashBalance;

  // Handlers
  const handleBuy = (symbol: string, quantity: number = 1) => {
    const stock = stocks.find(s => s.symbol === symbol);
    if (!stock || quantity <= 0) return;

    const cost = stock.basePrice * quantity;
    if (cost > cashBalance) return;

    setCashBalance(prev => prev - cost);
    setHoldings(prev => {
      const existing = prev[symbol] || { quantity: 0, avgPrice: 0 };
      const newQuantity = existing.quantity + quantity;
      return { ...prev, [symbol]: { quantity: newQuantity, avgPrice: stock.basePrice } };
    });
  };

  const handleSell = (symbol: string, quantity: number = 1) => {
    const stock = stocks.find(s => s.symbol === symbol);
    const holding = holdings[symbol];
    if (!stock || !holding || quantity <= 0 || quantity > holding.quantity) return;

    const revenue = stock.basePrice * quantity;
    setCashBalance(prev => prev + revenue);
    setHoldings(prev => {
      const newQuantity = prev[symbol].quantity - quantity;
      if (newQuantity <= 0) {
        const { [symbol]: _, ...rest } = prev;
        return rest;
      }
      return { ...prev, [symbol]: { ...prev[symbol], quantity: newQuantity } };
    });
  };

  const handleStartSimulation = () => {
    onStartSimulation(holdings, cashBalance);
  };

  const canStart = Object.keys(holdings).length > 0 || hasPreBuiltPortfolio;

  // Get news events for this scenario (for preview)
  const newsEvents = useMemo(() => {
    return getMissionNewsEvents(scenario);
  }, [scenario]);

  const [showNewsPreview, setShowNewsPreview] = useState(true);

  return (
    <div className="min-h-screen bg-stone-100 dark:bg-gradient-to-br dark:from-stone-900 dark:via-stone-800 dark:to-stone-900">
      {/* Mission Briefing Modal */}
      {showBriefing && (
        <div className="fixed inset-0 bg-black/60 dark:bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-stone-900 border border-stone-300 dark:border-stone-700 max-w-2xl w-full p-8 relative shadow-2xl">
            {/* Decorative corners */}
            <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-amber-500"></div>
            <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-amber-500"></div>
            <div className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-amber-500"></div>
            <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-amber-500"></div>

            <div className="text-center mb-6">
              <div className="text-amber-600 dark:text-amber-500 uppercase tracking-[0.3em] text-xs mb-2">Mission Briefing</div>
              <h1 className="text-3xl font-bold text-stone-900 dark:text-white mb-2">{mission.title}</h1>
              <p className="text-stone-600 dark:text-stone-400">{mission.subtitle}</p>
            </div>

            <div className="space-y-6">
              <p className="text-stone-700 dark:text-stone-300 leading-relaxed">{mission.description}</p>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-stone-100 dark:bg-stone-800/50 p-4 border border-stone-300 dark:border-stone-700">
                  <div className="flex items-center gap-2 text-amber-600 dark:text-amber-500 mb-2">
                    <Target className="w-4 h-4" />
                    <span className="text-xs uppercase tracking-wider">Objectives</span>
                  </div>
                  <ul className="space-y-1">
                    {mission.objectives.map((obj, i) => (
                      <li key={i} className="text-sm text-stone-700 dark:text-stone-300 flex items-start gap-2">
                        <ChevronRight className="w-3 h-3 mt-1 text-amber-500 flex-shrink-0" />
                        {obj}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="bg-stone-100 dark:bg-stone-800/50 p-4 border border-stone-300 dark:border-stone-700">
                  <div className="flex items-center gap-2 text-green-600 dark:text-green-500 mb-2">
                    <BarChart3 className="w-4 h-4" />
                    <span className="text-xs uppercase tracking-wider">Win Condition</span>
                  </div>
                  <p className="text-sm text-stone-700 dark:text-stone-300">{scenarioConfig.winCondition?.description}</p>
                  
                  <div className="flex items-center gap-2 text-red-600 dark:text-red-500 mb-2 mt-4">
                    <AlertTriangle className="w-4 h-4" />
                    <span className="text-xs uppercase tracking-wider">Fail Condition</span>
                  </div>
                  <p className="text-sm text-stone-700 dark:text-stone-300">{scenarioConfig.failCondition?.description}</p>
                </div>
              </div>

              <div className="flex items-center gap-4 text-sm text-stone-600 dark:text-stone-400">
                <div className="flex items-center gap-2">
                  <Briefcase className="w-4 h-4" />
                  <span>${mission.sandboxConfig.startingBalance.toLocaleString()} Budget</span>
                </div>
                <div className="flex items-center gap-2">
                  <Zap className="w-4 h-4" />
                  <span>{scenarioConfig.durationDays} Days</span>
                </div>
                <div className={`flex items-center gap-2 ${
                  mission.difficulty === 'beginner' ? 'text-green-600 dark:text-green-400' :
                  mission.difficulty === 'intermediate' ? 'text-yellow-600 dark:text-yellow-400' :
                  mission.difficulty === 'advanced' ? 'text-orange-600 dark:text-orange-400' :
                  'text-red-600 dark:text-red-400'
                }`}>
                  <Shield className="w-4 h-4" />
                  <span className="capitalize">{mission.difficulty}</span>
                </div>
              </div>

              {hasPreBuiltPortfolio && (
                <div className="bg-amber-100 dark:bg-amber-900/20 border border-amber-300 dark:border-amber-700/50 p-4 rounded">
                  <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400 mb-2">
                    <Info className="w-4 h-4" />
                    <span className="text-sm font-medium">Pre-Built Portfolio Provided</span>
                  </div>
                  <p className="text-sm text-stone-600 dark:text-stone-400">
                    This scenario starts you with an existing portfolio. Your goal is to manage it through the upcoming market event.
                    You can modify it before starting the simulation.
                  </p>
                </div>
              )}
            </div>

            <div className="mt-8 flex gap-4">
              <button
                onClick={onExit}
                className="flex-1 py-3 border border-stone-400 dark:border-stone-600 text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
              >
                Back to Missions
              </button>
              <button
                onClick={() => setShowBriefing(false)}
                className="flex-1 py-3 bg-amber-600 hover:bg-amber-500 text-white font-bold transition-colors flex items-center justify-center gap-2"
              >
                Build Portfolio
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Portfolio Builder */}
      <div className="max-w-7xl mx-auto p-6">
        {/* Header */}
        <header className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-amber-600 dark:text-amber-500 uppercase tracking-[0.2em] text-xs mb-1">Pre-Mission Setup</div>
              <h1 className="text-2xl font-bold text-stone-900 dark:text-white">{mission.title}</h1>
            </div>
            <div className="flex items-center gap-4">
              <button
                onClick={() => setShowBriefing(true)}
                className="p-2 border border-stone-400 dark:border-stone-600 text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-white hover:border-stone-500 transition-colors"
              >
                <Info className="w-5 h-5" />
              </button>
              <button
                onClick={handleStartSimulation}
                disabled={!canStart}
                className="px-6 py-3 bg-green-600 hover:bg-green-500 disabled:bg-stone-400 dark:disabled:bg-stone-700 disabled:text-stone-200 dark:disabled:text-stone-500 text-white font-bold transition-colors flex items-center gap-2"
              >
                <Play className="w-5 h-5" />
                Start Simulation
              </button>
            </div>
          </div>
        </header>

        <div className="grid grid-cols-12 gap-6">
          {/* Left Column - News Preview & Portfolio */}
          <div className="col-span-4 space-y-6">
            {/* News Preview - IMPORTANT for stock selection */}
            <div className="bg-white dark:bg-stone-800/50 border border-stone-300 dark:border-stone-700 p-6 shadow-lg dark:shadow-none">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-stone-900 dark:text-white flex items-center gap-2">
                  <Newspaper className="w-5 h-5 text-amber-600 dark:text-amber-500" />
                  Upcoming News Events
                </h2>
                <button
                  onClick={() => setShowNewsPreview(!showNewsPreview)}
                  className="text-stone-500 hover:text-stone-700 dark:hover:text-stone-300"
                >
                  {showNewsPreview ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              
              {showNewsPreview && (
                <div className="space-y-3 max-h-80 overflow-y-auto">
                  {newsEvents.length === 0 ? (
                    <p className="text-stone-500 dark:text-stone-400 italic text-sm">No specific news events for this scenario.</p>
                  ) : (
                    newsEvents.map((event, index) => (
                      <article 
                        key={event.id}
                        className={`p-3 border-l-4 transition-all ${
                          event.isBreaking 
                            ? 'border-red-500 bg-red-50 dark:bg-red-900/20' 
                            : event.impact === 'positive'
                              ? 'border-green-500 bg-green-50 dark:bg-green-900/10'
                              : event.impact === 'negative'
                                ? 'border-red-400 bg-red-50 dark:bg-red-900/10'
                                : 'border-stone-400 dark:border-stone-600 bg-stone-50 dark:bg-stone-800/30'
                        }`}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <Calendar className="w-3 h-3 text-stone-500 dark:text-stone-400" />
                          <span className="text-xs font-mono text-stone-600 dark:text-stone-400">Day {event.day}</span>
                          {event.isBreaking && (
                            <span className="px-1.5 py-0.5 bg-red-600 text-white text-[10px] uppercase font-bold">
                              Breaking
                            </span>
                          )}
                          <span className={`text-xs ml-auto ${
                            event.impact === 'positive' ? 'text-green-600 dark:text-green-400' :
                            event.impact === 'negative' ? 'text-red-600 dark:text-red-400' :
                            'text-stone-500'
                          }`}>
                            {event.impact === 'positive' ? '↑ Bullish' : event.impact === 'negative' ? '↓ Bearish' : '— Neutral'}
                          </span>
                        </div>
                        <h4 className="font-bold text-stone-900 dark:text-white text-sm mb-1">{event.headline}</h4>
                        <p className="text-xs text-stone-600 dark:text-stone-400">{event.summary}</p>
                        {event.affectedSectors && event.affectedSectors.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {event.affectedSectors.map(sector => (
                              <span 
                                key={sector}
                                className="px-1.5 py-0.5 bg-stone-200 dark:bg-stone-700 text-stone-700 dark:text-stone-300 text-[10px] uppercase"
                              >
                                {sector}
                              </span>
                            ))}
                          </div>
                        )}
                      </article>
                    ))
                  )}
                </div>
              )}
              
              <p className="text-xs text-stone-500 dark:text-stone-400 mt-3 italic">
                💡 Use these upcoming events to decide which stocks to buy or avoid.
              </p>
            </div>

            {/* Portfolio Summary */}
            <div className="bg-white dark:bg-stone-800/50 border border-stone-300 dark:border-stone-700 p-6 shadow-lg dark:shadow-none">
              <h2 className="text-lg font-bold text-stone-900 dark:text-white mb-4 flex items-center gap-2">
                <Briefcase className="w-5 h-5 text-amber-600 dark:text-amber-500" />
                Your Portfolio
              </h2>

              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-stone-600 dark:text-stone-400">Cash Available</span>
                  <span className="text-stone-900 dark:text-white font-mono text-lg">${cashBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-stone-600 dark:text-stone-400">Holdings Value</span>
                  <span className="text-stone-900 dark:text-white font-mono text-lg">${totalHoldingsValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="h-px bg-stone-300 dark:bg-stone-700"></div>
                <div className="flex justify-between items-center">
                  <span className="text-stone-700 dark:text-stone-300 font-medium">Total Portfolio</span>
                  <span className="text-amber-600 dark:text-amber-400 font-mono text-xl font-bold">${portfolioValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                </div>
              </div>

              {/* Diversification Score */}
              <div className="mt-6 pt-4 border-t border-stone-300 dark:border-stone-700">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-stone-600 dark:text-stone-400 text-sm">Diversification Score</span>
                  <span className={`font-bold ${
                    diversificationScore >= 70 ? 'text-green-600 dark:text-green-400' :
                    diversificationScore >= 50 ? 'text-yellow-600 dark:text-yellow-400' :
                    'text-red-600 dark:text-red-400'
                  }`}>{diversificationScore}/100</span>
                </div>
                <div className="h-2 bg-stone-200 dark:bg-stone-700 rounded-full overflow-hidden">
                  <div 
                    className={`h-full transition-all duration-500 ${
                      diversificationScore >= 70 ? 'bg-green-500' :
                      diversificationScore >= 50 ? 'bg-yellow-500' :
                      'bg-red-500'
                    }`}
                    style={{ width: `${diversificationScore}%` }}
                  ></div>
                </div>
              </div>
            </div>

            {/* Sector Allocation */}
            <div className="bg-white dark:bg-stone-800/50 border border-stone-300 dark:border-stone-700 p-6 shadow-lg dark:shadow-none">
              <h3 className="text-sm font-bold text-stone-900 dark:text-white mb-4 uppercase tracking-wider">Sector Allocation</h3>
              {Object.keys(sectorAllocation).length === 0 ? (
                <p className="text-stone-500 dark:text-stone-500 text-sm italic">No holdings yet</p>
              ) : (
                <div className="space-y-3">
                  {Object.entries(sectorAllocation)
                    .sort((a, b) => b[1] - a[1])
                    .map(([sector, value]) => {
                      const percent = (value / totalHoldingsValue) * 100;
                      const Icon = SECTOR_ICONS[sector] || Building2;
                      return (
                        <div key={sector}>
                          <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center gap-2">
                              <Icon className="w-4 h-4 text-stone-500 dark:text-stone-400" />
                              <span className="text-stone-700 dark:text-stone-300 text-sm">{sector}</span>
                            </div>
                            <span className="text-stone-500 dark:text-stone-400 text-sm">{percent.toFixed(1)}%</span>
                          </div>
                          <div className="h-1.5 bg-stone-200 dark:bg-stone-700 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-amber-500 transition-all duration-300"
                              style={{ width: `${percent}%` }}
                            ></div>
                          </div>
                        </div>
                      );
                    })}
                </div>
              )}
            </div>

            {/* Current Holdings */}
            <div className="bg-white dark:bg-stone-800/50 border border-stone-300 dark:border-stone-700 p-6 shadow-lg dark:shadow-none">
              <h3 className="text-sm font-bold text-stone-900 dark:text-white mb-4 uppercase tracking-wider">Holdings</h3>
              {Object.keys(holdings).length === 0 ? (
                <p className="text-stone-500 dark:text-stone-500 text-sm italic">Select stocks to build your portfolio</p>
              ) : (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {Object.entries(holdings)
                    .filter(([, h]) => h.quantity > 0)
                    .map(([symbol, h]) => {
                      const stock = stocks.find(s => s.symbol === symbol);
                      if (!stock) return null;
                      const value = stock.basePrice * h.quantity;
                      return (
                        <div key={symbol} className="flex items-center justify-between p-2 bg-stone-100 dark:bg-stone-900/50 border border-stone-300 dark:border-stone-700">
                          <div>
                            <div className="text-stone-900 dark:text-white font-medium">{symbol}</div>
                            <div className="text-stone-500 dark:text-stone-500 text-xs">{h.quantity} shares @ ${stock.basePrice.toFixed(2)}</div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-stone-700 dark:text-stone-300 font-mono">${value.toFixed(2)}</span>
                            <button
                              onClick={() => handleSell(symbol, 1)}
                              className="p-1 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
                            >
                              <Minus className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                </div>
              )}
            </div>
          </div>

          {/* Stock Picker - Right Side */}
          <div className="col-span-8">
            <div className="bg-white dark:bg-stone-800/50 border border-stone-300 dark:border-stone-700 p-6 shadow-lg dark:shadow-none">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-bold text-stone-900 dark:text-white">Available Stocks</h2>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400 dark:text-stone-500" />
                  <input
                    type="text"
                    placeholder="Search stocks..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 pr-4 py-2 bg-stone-100 dark:bg-stone-900 border border-stone-300 dark:border-stone-700 text-stone-900 dark:text-white placeholder-stone-400 dark:placeholder-stone-500 focus:outline-none focus:border-amber-500 w-64"
                  />
                </div>
              </div>

              {/* Sector Filter */}
              <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
                <button
                  onClick={() => setSelectedSector(null)}
                  className={`px-3 py-1.5 text-xs uppercase tracking-wider whitespace-nowrap transition-colors ${
                    !selectedSector 
                      ? 'bg-amber-600 text-white' 
                      : 'bg-stone-200 dark:bg-stone-700 text-stone-700 dark:text-stone-300 hover:bg-stone-300 dark:hover:bg-stone-600'
                  }`}
                >
                  All Sectors
                </button>
                {sectors.map(sector => {
                  const Icon = SECTOR_ICONS[sector] || Building2;
                  return (
                    <button
                      key={sector}
                      onClick={() => setSelectedSector(selectedSector === sector ? null : sector)}
                      className={`px-3 py-1.5 text-xs uppercase tracking-wider whitespace-nowrap transition-colors flex items-center gap-1.5 ${
                        selectedSector === sector 
                          ? 'bg-amber-600 text-white' 
                          : 'bg-stone-200 dark:bg-stone-700 text-stone-700 dark:text-stone-300 hover:bg-stone-300 dark:hover:bg-stone-600'
                      }`}
                    >
                      <Icon className="w-3 h-3" />
                      {sector}
                    </button>
                  );
                })}
              </div>

              {/* Stock Grid */}
              <div className="grid grid-cols-3 gap-3 max-h-[500px] overflow-y-auto">
                {filteredStocks.map(stock => {
                  const owned = holdings[stock.symbol]?.quantity || 0;
                  const canAfford = cashBalance >= stock.basePrice;
                  const Icon = SECTOR_ICONS[stock.sector] || Building2;
                  
                  return (
                    <div 
                      key={stock.symbol}
                      className={`p-4 border transition-all ${
                        owned > 0 
                          ? 'border-amber-400 dark:border-amber-500/50 bg-amber-50 dark:bg-amber-900/10' 
                          : 'border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-900/50 hover:border-stone-400 dark:hover:border-stone-600'
                      }`}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-stone-900 dark:text-white font-bold">{stock.symbol}</span>
                            {stock.isETF && (
                              <span className="px-1.5 py-0.5 bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-400 text-[10px] uppercase">ETF</span>
                            )}
                          </div>
                          <div className="text-stone-500 dark:text-stone-500 text-xs truncate max-w-[120px]">{stock.company}</div>
                        </div>
                        <div className="text-right">
                          <div className="text-amber-600 dark:text-amber-400 font-mono font-bold">${stock.basePrice.toFixed(2)}</div>
                          <div className="flex items-center gap-1 text-stone-500 dark:text-stone-500 text-xs">
                            <Icon className="w-3 h-3" />
                            {stock.sector}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between mt-3 pt-3 border-t border-stone-200 dark:border-stone-700">
                        {owned > 0 ? (
                          <>
                            <span className="text-stone-600 dark:text-stone-400 text-sm">Owned: {owned}</span>
                            <div className="flex gap-1">
                              <button
                                onClick={() => handleSell(stock.symbol, 1)}
                                className="p-1.5 bg-red-100 dark:bg-red-600/20 text-red-600 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-600/30 transition-colors"
                              >
                                <Minus className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleBuy(stock.symbol, 1)}
                                disabled={!canAfford}
                                className="p-1.5 bg-green-100 dark:bg-green-600/20 text-green-600 dark:text-green-400 hover:bg-green-200 dark:hover:bg-green-600/30 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                              >
                                <Plus className="w-4 h-4" />
                              </button>
                            </div>
                          </>
                        ) : (
                          <button
                            onClick={() => handleBuy(stock.symbol, 1)}
                            disabled={!canAfford}
                            className="w-full py-2 bg-stone-200 dark:bg-stone-700 hover:bg-stone-300 dark:hover:bg-stone-600 disabled:opacity-50 disabled:cursor-not-allowed text-stone-800 dark:text-white text-sm font-medium transition-colors flex items-center justify-center gap-2"
                          >
                            <Plus className="w-4 h-4" />
                            Add to Portfolio
                          </button>
                        )}
                      </div>

                      {/* Stock sensitivity indicators */}
                      <div className="flex gap-1 mt-2">
                        {stock.scenarioSensitivity.inflation > 0.3 && (
                          <span className="px-1 py-0.5 bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 text-[9px] uppercase">Inflation+</span>
                        )}
                        {stock.scenarioSensitivity.techHype > 0.5 && (
                          <span className="px-1 py-0.5 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 text-[9px] uppercase">AI/Tech</span>
                        )}
                        {stock.dividendYield && stock.dividendYield > 0.02 && (
                          <span className="px-1 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-[9px] uppercase">Dividend</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
