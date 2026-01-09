/**
 * Mission Simulation Engine
 * Handles day-by-day market simulation for educational missions
 * Simulates 60-180 day periods with scenario-specific price movements
 */

export interface SimulatedStock {
  symbol: string;
  company: string;
  sector: 'Technology' | 'Healthcare' | 'Finance' | 'Consumer' | 'Energy' | 'Industrial' | 'Materials' | 'Utilities' | 'Real Estate' | 'Communications';
  basePrice: number;
  currentPrice: number;
  priceHistory: { day: number; price: number; date: Date }[];
  volatility: number; // 0-1 scale
  scenarioSensitivity: {
    inflation: number;      // -1 to 1, how it reacts to inflation
    interestRate: number;   // -1 to 1, how it reacts to rate changes
    dollarWeakness: number; // -1 to 1, how it reacts to weak dollar
    tariff: number;         // -1 to 1, how it reacts to tariffs
    techHype: number;       // 0 to 1, exposure to AI/tech hype
    supplyChain: number;    // 0 to 1, supply chain exposure
  };
  isETF?: boolean;
  dividendYield?: number;
  supplyChainExposure?: 'china' | 'taiwan' | 'domestic' | 'diversified';
}

export interface NewsEvent {
  id: string;
  day: number;
  headline: string;
  summary: string;
  source: string;
  impact: 'positive' | 'negative' | 'neutral';
  affectedSectors: SimulatedStock['sector'][];
  affectedSymbols?: string[];
  priceMultiplier: number; // 0.8 = -20%, 1.2 = +20%
  isBreaking?: boolean;
  timestamp: Date;
}

export interface MissionScenario {
  id: string;
  name: string;
  description: string;
  durationDays: number;
  startDate: Date;
  phases: {
    startDay: number;
    endDay: number;
    name: string;
    description: string;
    marketTrend: 'bullish' | 'bearish' | 'volatile' | 'stable';
    volatilityMultiplier: number;
  }[];
  triggerEvents: NewsEvent[];
  winCondition: {
    type: 'return' | 'survive' | 'diversification' | 'custom';
    target: number;
    description: string;
  };
  failCondition: {
    type: 'drawdown' | 'margin_call' | 'time';
    threshold: number;
    description: string;
  };
}

export interface SimulationState {
  currentDay: number;
  currentDate: Date;
  isRunning: boolean;
  isPaused: boolean;
  speed: number; // 1 = 1 day/second, 2 = 2 days/second, etc.
  phase: string;
  portfolioValue: number;
  initialValue: number;
  returnPercent: number;
  maxDrawdown: number;
  peakValue: number;
  events: NewsEvent[];
  completedEvents: string[];
}

// Available stocks for missions with realistic sector distribution
export const MISSION_STOCKS: SimulatedStock[] = [
  // Technology
  {
    symbol: 'AAPL',
    company: 'Apple Inc.',
    sector: 'Technology',
    basePrice: 178.50,
    currentPrice: 178.50,
    priceHistory: [],
    volatility: 0.25,
    scenarioSensitivity: { inflation: -0.3, interestRate: -0.4, dollarWeakness: 0.5, tariff: -0.6, techHype: 0.3, supplyChain: 0.7 },
    supplyChainExposure: 'china',
  },
  {
    symbol: 'MSFT',
    company: 'Microsoft Corporation',
    sector: 'Technology',
    basePrice: 378.25,
    currentPrice: 378.25,
    priceHistory: [],
    volatility: 0.22,
    scenarioSensitivity: { inflation: -0.2, interestRate: -0.3, dollarWeakness: 0.4, tariff: -0.2, techHype: 0.7, supplyChain: 0.3 },
    supplyChainExposure: 'diversified',
  },
  {
    symbol: 'NVDA',
    company: 'NVIDIA Corporation',
    sector: 'Technology',
    basePrice: 495.00,
    currentPrice: 495.00,
    priceHistory: [],
    volatility: 0.45,
    scenarioSensitivity: { inflation: -0.2, interestRate: -0.4, dollarWeakness: 0.3, tariff: -0.5, techHype: 0.95, supplyChain: 0.8 },
    supplyChainExposure: 'taiwan',
  },
  {
    symbol: 'GOOGL',
    company: 'Alphabet Inc.',
    sector: 'Technology',
    basePrice: 141.80,
    currentPrice: 141.80,
    priceHistory: [],
    volatility: 0.28,
    scenarioSensitivity: { inflation: -0.2, interestRate: -0.3, dollarWeakness: 0.3, tariff: -0.1, techHype: 0.6, supplyChain: 0.2 },
    supplyChainExposure: 'diversified',
  },
  {
    symbol: 'META',
    company: 'Meta Platforms Inc.',
    sector: 'Technology',
    basePrice: 505.30,
    currentPrice: 505.30,
    priceHistory: [],
    volatility: 0.35,
    scenarioSensitivity: { inflation: -0.2, interestRate: -0.3, dollarWeakness: 0.2, tariff: -0.1, techHype: 0.7, supplyChain: 0.2 },
    supplyChainExposure: 'diversified',
  },
  // Healthcare
  {
    symbol: 'JNJ',
    company: 'Johnson & Johnson',
    sector: 'Healthcare',
    basePrice: 155.40,
    currentPrice: 155.40,
    priceHistory: [],
    volatility: 0.15,
    scenarioSensitivity: { inflation: 0.1, interestRate: -0.1, dollarWeakness: 0.3, tariff: -0.2, techHype: 0, supplyChain: 0.3 },
    dividendYield: 0.029,
    supplyChainExposure: 'diversified',
  },
  {
    symbol: 'UNH',
    company: 'UnitedHealth Group',
    sector: 'Healthcare',
    basePrice: 528.60,
    currentPrice: 528.60,
    priceHistory: [],
    volatility: 0.18,
    scenarioSensitivity: { inflation: 0.2, interestRate: -0.1, dollarWeakness: 0.1, tariff: 0, techHype: 0.1, supplyChain: 0.1 },
    dividendYield: 0.014,
    supplyChainExposure: 'domestic',
  },
  // Finance
  {
    symbol: 'JPM',
    company: 'JPMorgan Chase & Co.',
    sector: 'Finance',
    basePrice: 195.80,
    currentPrice: 195.80,
    priceHistory: [],
    volatility: 0.25,
    scenarioSensitivity: { inflation: 0.3, interestRate: 0.6, dollarWeakness: -0.2, tariff: -0.1, techHype: 0, supplyChain: 0 },
    dividendYield: 0.024,
    supplyChainExposure: 'domestic',
  },
  {
    symbol: 'BAC',
    company: 'Bank of America Corp.',
    sector: 'Finance',
    basePrice: 35.20,
    currentPrice: 35.20,
    priceHistory: [],
    volatility: 0.28,
    scenarioSensitivity: { inflation: 0.2, interestRate: 0.7, dollarWeakness: -0.2, tariff: -0.1, techHype: 0, supplyChain: 0 },
    dividendYield: 0.027,
    supplyChainExposure: 'domestic',
  },
  // Consumer
  {
    symbol: 'AMZN',
    company: 'Amazon.com Inc.',
    sector: 'Consumer',
    basePrice: 186.50,
    currentPrice: 186.50,
    priceHistory: [],
    volatility: 0.32,
    scenarioSensitivity: { inflation: -0.3, interestRate: -0.3, dollarWeakness: 0.2, tariff: -0.4, techHype: 0.4, supplyChain: 0.5 },
    supplyChainExposure: 'china',
  },
  {
    symbol: 'WMT',
    company: 'Walmart Inc.',
    sector: 'Consumer',
    basePrice: 165.30,
    currentPrice: 165.30,
    priceHistory: [],
    volatility: 0.18,
    scenarioSensitivity: { inflation: 0.1, interestRate: -0.1, dollarWeakness: -0.1, tariff: -0.5, techHype: 0, supplyChain: 0.6 },
    dividendYield: 0.013,
    supplyChainExposure: 'china',
  },
  {
    symbol: 'COST',
    company: 'Costco Wholesale Corp.',
    sector: 'Consumer',
    basePrice: 745.20,
    currentPrice: 745.20,
    priceHistory: [],
    volatility: 0.2,
    scenarioSensitivity: { inflation: 0.2, interestRate: -0.1, dollarWeakness: -0.1, tariff: -0.3, techHype: 0, supplyChain: 0.4 },
    dividendYield: 0.006,
    supplyChainExposure: 'diversified',
  },
  // Energy
  {
    symbol: 'XOM',
    company: 'Exxon Mobil Corporation',
    sector: 'Energy',
    basePrice: 104.50,
    currentPrice: 104.50,
    priceHistory: [],
    volatility: 0.22,
    scenarioSensitivity: { inflation: 0.6, interestRate: 0.1, dollarWeakness: 0.4, tariff: 0.1, techHype: -0.1, supplyChain: 0.2 },
    dividendYield: 0.034,
    supplyChainExposure: 'diversified',
  },
  {
    symbol: 'CVX',
    company: 'Chevron Corporation',
    sector: 'Energy',
    basePrice: 148.30,
    currentPrice: 148.30,
    priceHistory: [],
    volatility: 0.23,
    scenarioSensitivity: { inflation: 0.6, interestRate: 0.1, dollarWeakness: 0.5, tariff: 0.1, techHype: -0.1, supplyChain: 0.2 },
    dividendYield: 0.041,
    supplyChainExposure: 'diversified',
  },
  // Industrial
  {
    symbol: 'CAT',
    company: 'Caterpillar Inc.',
    sector: 'Industrial',
    basePrice: 310.40,
    currentPrice: 310.40,
    priceHistory: [],
    volatility: 0.25,
    scenarioSensitivity: { inflation: 0.3, interestRate: -0.2, dollarWeakness: 0.4, tariff: -0.3, techHype: 0, supplyChain: 0.4 },
    dividendYield: 0.017,
    supplyChainExposure: 'diversified',
  },
  {
    symbol: 'BA',
    company: 'Boeing Company',
    sector: 'Industrial',
    basePrice: 215.80,
    currentPrice: 215.80,
    priceHistory: [],
    volatility: 0.35,
    scenarioSensitivity: { inflation: -0.2, interestRate: -0.2, dollarWeakness: 0.5, tariff: -0.2, techHype: 0, supplyChain: 0.5 },
    supplyChainExposure: 'diversified',
  },
  // Materials
  {
    symbol: 'LIN',
    company: 'Linde plc',
    sector: 'Materials',
    basePrice: 425.60,
    currentPrice: 425.60,
    priceHistory: [],
    volatility: 0.18,
    scenarioSensitivity: { inflation: 0.3, interestRate: -0.1, dollarWeakness: 0.3, tariff: -0.1, techHype: 0, supplyChain: 0.3 },
    dividendYield: 0.013,
    supplyChainExposure: 'diversified',
  },
  // Real Estate
  {
    symbol: 'AMT',
    company: 'American Tower Corp.',
    sector: 'Real Estate',
    basePrice: 195.40,
    currentPrice: 195.40,
    priceHistory: [],
    volatility: 0.22,
    scenarioSensitivity: { inflation: -0.4, interestRate: -0.6, dollarWeakness: 0.2, tariff: 0, techHype: 0.2, supplyChain: 0.1 },
    dividendYield: 0.032,
    supplyChainExposure: 'domestic',
  },
  // ETFs
  {
    symbol: 'SPY',
    company: 'SPDR S&P 500 ETF Trust',
    sector: 'Finance',
    basePrice: 478.50,
    currentPrice: 478.50,
    priceHistory: [],
    volatility: 0.15,
    scenarioSensitivity: { inflation: -0.1, interestRate: -0.2, dollarWeakness: 0.2, tariff: -0.2, techHype: 0.2, supplyChain: 0.3 },
    isETF: true,
    dividendYield: 0.014,
  },
  {
    symbol: 'QQQ',
    company: 'Invesco QQQ Trust',
    sector: 'Technology',
    basePrice: 420.80,
    currentPrice: 420.80,
    priceHistory: [],
    volatility: 0.22,
    scenarioSensitivity: { inflation: -0.2, interestRate: -0.3, dollarWeakness: 0.3, tariff: -0.3, techHype: 0.5, supplyChain: 0.4 },
    isETF: true,
  },
  {
    symbol: 'VTI',
    company: 'Vanguard Total Stock Market ETF',
    sector: 'Finance',
    basePrice: 245.30,
    currentPrice: 245.30,
    priceHistory: [],
    volatility: 0.14,
    scenarioSensitivity: { inflation: -0.1, interestRate: -0.2, dollarWeakness: 0.2, tariff: -0.15, techHype: 0.15, supplyChain: 0.25 },
    isETF: true,
    dividendYield: 0.015,
  },
  {
    symbol: 'TIP',
    company: 'iShares TIPS Bond ETF',
    sector: 'Finance',
    basePrice: 108.40,
    currentPrice: 108.40,
    priceHistory: [],
    volatility: 0.08,
    scenarioSensitivity: { inflation: 0.7, interestRate: -0.3, dollarWeakness: 0, tariff: 0, techHype: 0, supplyChain: 0 },
    isETF: true,
    dividendYield: 0.045,
  },
  {
    symbol: 'GLD',
    company: 'SPDR Gold Shares',
    sector: 'Materials',
    basePrice: 192.30,
    currentPrice: 192.30,
    priceHistory: [],
    volatility: 0.12,
    scenarioSensitivity: { inflation: 0.6, interestRate: -0.4, dollarWeakness: 0.7, tariff: 0.2, techHype: -0.1, supplyChain: 0 },
    isETF: true,
  },
  {
    symbol: 'EFA',
    company: 'iShares MSCI EAFE ETF',
    sector: 'Finance',
    basePrice: 75.80,
    currentPrice: 75.80,
    priceHistory: [],
    volatility: 0.16,
    scenarioSensitivity: { inflation: -0.1, interestRate: -0.1, dollarWeakness: 0.6, tariff: -0.2, techHype: 0.1, supplyChain: 0.2 },
    isETF: true,
    dividendYield: 0.028,
  },
];

// Scenario-specific configurations
export const SCENARIO_CONFIGS: Record<string, Partial<MissionScenario>> = {
  neutral: {
    durationDays: 60,
    phases: [
      { startDay: 0, endDay: 60, name: 'Normal Market', description: 'Standard market conditions', marketTrend: 'stable', volatilityMultiplier: 1 },
    ],
    winCondition: { type: 'diversification', target: 70, description: 'Achieve 70% diversification score' },
    failCondition: { type: 'drawdown', threshold: 30, description: 'Avoid 30% portfolio loss' },
  },
  inflation: {
    durationDays: 90,
    phases: [
      { startDay: 0, endDay: 15, name: 'Pre-Announcement', description: 'Markets are calm before the storm', marketTrend: 'stable', volatilityMultiplier: 0.8 },
      { startDay: 16, endDay: 30, name: 'Inflation Spike', description: 'CPI data shows 2% jump', marketTrend: 'bearish', volatilityMultiplier: 1.5 },
      { startDay: 31, endDay: 60, name: 'Fed Response', description: 'Markets digest Fed commentary', marketTrend: 'volatile', volatilityMultiplier: 1.3 },
      { startDay: 61, endDay: 90, name: 'New Normal', description: 'Markets adapt to higher inflation', marketTrend: 'stable', volatilityMultiplier: 1 },
    ],
    winCondition: { type: 'return', target: 2, description: 'Beat inflation with 2%+ return' },
    failCondition: { type: 'drawdown', threshold: 30, description: 'Avoid margin call (30% loss)' },
  },
  'rate-cut': {
    durationDays: 90,
    phases: [
      { startDay: 0, endDay: 20, name: 'Speculation', description: 'Markets anticipate Fed decision', marketTrend: 'bullish', volatilityMultiplier: 1.2 },
      { startDay: 21, endDay: 25, name: 'FOMC Meeting', description: 'Fed announces 25-50bp cut', marketTrend: 'volatile', volatilityMultiplier: 2 },
      { startDay: 26, endDay: 60, name: 'Post-Cut Rally', description: 'Markets rally on lower rates', marketTrend: 'bullish', volatilityMultiplier: 1.3 },
      { startDay: 61, endDay: 90, name: 'Stabilization', description: 'New rate environment settles in', marketTrend: 'stable', volatilityMultiplier: 1 },
    ],
    winCondition: { type: 'return', target: 5, description: 'Capture 5%+ return from rate cut' },
    failCondition: { type: 'drawdown', threshold: 30, description: 'Avoid margin call (30% loss)' },
  },
  'currency-weak': {
    durationDays: 120,
    phases: [
      { startDay: 0, endDay: 30, name: 'Dollar Weakness', description: 'USD begins declining', marketTrend: 'volatile', volatilityMultiplier: 1.3 },
      { startDay: 31, endDay: 60, name: 'Currency Crisis', description: 'USD drops 10% vs basket', marketTrend: 'bearish', volatilityMultiplier: 1.5 },
      { startDay: 61, endDay: 90, name: 'Rebalancing', description: 'Multinationals benefit', marketTrend: 'stable', volatilityMultiplier: 1.2 },
      { startDay: 91, endDay: 120, name: 'New Equilibrium', description: 'Markets find new balance', marketTrend: 'bullish', volatilityMultiplier: 1 },
    ],
    winCondition: { type: 'return', target: 8, description: 'Achieve 8%+ return from currency plays' },
    failCondition: { type: 'drawdown', threshold: 30, description: 'Avoid margin call (30% loss)' },
  },
  tariff: {
    durationDays: 120,
    phases: [
      { startDay: 0, endDay: 20, name: 'Trade Tensions', description: 'Rumors of new tariffs emerge', marketTrend: 'volatile', volatilityMultiplier: 1.4 },
      { startDay: 21, endDay: 25, name: 'Tariff Announcement', description: '50% tariff on Chinese electronics', marketTrend: 'bearish', volatilityMultiplier: 2.5 },
      { startDay: 26, endDay: 60, name: 'Supply Chain Chaos', description: 'Companies scramble to adapt', marketTrend: 'bearish', volatilityMultiplier: 1.8 },
      { startDay: 61, endDay: 90, name: 'Reshoring Narrative', description: 'Domestic producers rally', marketTrend: 'volatile', volatilityMultiplier: 1.3 },
      { startDay: 91, endDay: 120, name: 'New Normal', description: 'Markets price in new reality', marketTrend: 'stable', volatilityMultiplier: 1.1 },
    ],
    winCondition: { type: 'return', target: 0, description: 'Avoid losses in trade war' },
    failCondition: { type: 'drawdown', threshold: 30, description: 'Avoid margin call (30% loss)' },
  },
  merger: {
    durationDays: 60,
    phases: [
      { startDay: 0, endDay: 10, name: 'Normal Trading', description: 'Markets are quiet', marketTrend: 'stable', volatilityMultiplier: 0.8 },
      { startDay: 11, endDay: 12, name: 'Merger Announcement', description: '30% premium offer announced', marketTrend: 'volatile', volatilityMultiplier: 3 },
      { startDay: 13, endDay: 40, name: 'Arbitrage Window', description: 'Spread exists between price and offer', marketTrend: 'stable', volatilityMultiplier: 1.5 },
      { startDay: 41, endDay: 60, name: 'Deal Closure', description: 'Regulatory approval pending', marketTrend: 'volatile', volatilityMultiplier: 1.8 },
    ],
    winCondition: { type: 'return', target: 10, description: 'Capture merger arbitrage profits' },
    failCondition: { type: 'drawdown', threshold: 30, description: 'Avoid margin call (30% loss)' },
  },
  bubble: {
    durationDays: 90,
    phases: [
      { startDay: 0, endDay: 30, name: 'Hype Builds', description: 'AI stocks surge on speculation', marketTrend: 'bullish', volatilityMultiplier: 1.5 },
      { startDay: 31, endDay: 50, name: 'Peak Euphoria', description: '+20% jumps on AI mentions', marketTrend: 'bullish', volatilityMultiplier: 2 },
      { startDay: 51, endDay: 60, name: 'First Cracks', description: 'Smart money starts exiting', marketTrend: 'volatile', volatilityMultiplier: 2.5 },
      { startDay: 61, endDay: 90, name: 'Bubble Bursts', description: 'Reality check hits markets', marketTrend: 'bearish', volatilityMultiplier: 3 },
    ],
    winCondition: { type: 'survive', target: 0, description: 'Preserve capital through bubble' },
    failCondition: { type: 'drawdown', threshold: 30, description: 'Avoid margin call (30% loss)' },
  },
  pandemic: {
    durationDays: 90,
    phases: [
      { startDay: 0, endDay: 10, name: 'First Reports', description: 'News of Taiwan lockdown emerges', marketTrend: 'volatile', volatilityMultiplier: 1.5 },
      { startDay: 11, endDay: 15, name: 'Lockdown Announced', description: '30-day fab shutdown begins', marketTrend: 'bearish', volatilityMultiplier: 3 },
      { startDay: 16, endDay: 45, name: 'Supply Shortage', description: 'Chip shortage intensifies', marketTrend: 'bearish', volatilityMultiplier: 2 },
      { startDay: 46, endDay: 60, name: 'Reopening', description: 'Fabs begin resuming production', marketTrend: 'volatile', volatilityMultiplier: 1.8 },
      { startDay: 61, endDay: 90, name: 'Recovery', description: 'Supply chains normalize', marketTrend: 'bullish', volatilityMultiplier: 1.3 },
    ],
    winCondition: { type: 'return', target: 5, description: 'Position for recovery (+5% return)' },
    failCondition: { type: 'drawdown', threshold: 30, description: 'Avoid margin call (30% loss)' },
  },
  'crash-2008': {
    durationDays: 180,
    phases: [
      { startDay: 0, endDay: 30, name: 'Lehman Falls', description: 'Banking crisis begins', marketTrend: 'bearish', volatilityMultiplier: 3 },
      { startDay: 31, endDay: 60, name: 'Credit Freeze', description: 'Liquidity crisis spreads', marketTrend: 'bearish', volatilityMultiplier: 4 },
      { startDay: 61, endDay: 90, name: 'Market Bottom', description: 'Panic selling peaks', marketTrend: 'bearish', volatilityMultiplier: 3.5 },
      { startDay: 91, endDay: 120, name: 'TARP & QE', description: 'Government intervention begins', marketTrend: 'volatile', volatilityMultiplier: 2.5 },
      { startDay: 121, endDay: 150, name: 'Tentative Recovery', description: 'First green shoots appear', marketTrend: 'volatile', volatilityMultiplier: 2 },
      { startDay: 151, endDay: 180, name: 'Stabilization', description: 'Markets find footing', marketTrend: 'bullish', volatilityMultiplier: 1.5 },
    ],
    winCondition: { type: 'survive', target: -20, description: 'Limit losses to 20% or less' },
    failCondition: { type: 'drawdown', threshold: 50, description: 'Avoid catastrophic 50% loss' },
  },
  'live-news': {
    durationDays: 30,
    phases: [
      { startDay: 0, endDay: 30, name: 'Live Trading', description: 'React to breaking news', marketTrend: 'volatile', volatilityMultiplier: 2 },
    ],
    winCondition: { type: 'return', target: 5, description: 'Achieve 5%+ return' },
    failCondition: { type: 'drawdown', threshold: 30, description: 'Avoid margin call (30% loss)' },
  },
};

/**
 * Calculate the price for a stock on a given day with scenario effects
 */
export function calculateStockPrice(
  stock: SimulatedStock,
  day: number,
  scenario: string,
  scenarioConfig: MissionScenario,
  triggeredEvents: NewsEvent[],
  randomSeed?: number
): number {
  const seed = randomSeed ?? day * 1000 + stock.symbol.charCodeAt(0);
  const random = seededRandom(seed);
  
  // Find current phase
  const currentPhase = scenarioConfig.phases.find(
    p => day >= p.startDay && day <= p.endDay
  ) || scenarioConfig.phases[0];
  
  // Base volatility adjusted for phase
  const phaseVolatility = stock.volatility * currentPhase.volatilityMultiplier;
  
  // Calculate scenario impact
  let scenarioMultiplier = 1;
  const sensitivity = stock.scenarioSensitivity;
  
  switch (scenario) {
    case 'inflation':
      scenarioMultiplier += sensitivity.inflation * 0.1 * (day > 15 ? 1 : 0);
      break;
    case 'rate-cut':
      scenarioMultiplier += sensitivity.interestRate * -0.15 * (day > 20 ? 1 : 0);
      break;
    case 'currency-weak':
      scenarioMultiplier += sensitivity.dollarWeakness * 0.12 * (day > 30 ? 1 : 0);
      break;
    case 'tariff':
      scenarioMultiplier += sensitivity.tariff * 0.15 * (day > 20 ? 1 : 0);
      break;
    case 'bubble':
      const bubblePhase = day < 50 ? 1 : -1;
      scenarioMultiplier += sensitivity.techHype * 0.25 * bubblePhase * (day > 10 ? 1 : 0);
      break;
    case 'pandemic':
      scenarioMultiplier += sensitivity.supplyChain * -0.2 * (day > 10 && day < 60 ? 1 : 0);
      if (stock.supplyChainExposure === 'taiwan') {
        scenarioMultiplier -= 0.15 * (day > 10 && day < 60 ? 1 : 0);
      }
      break;
    case 'crash-2008':
      const crashMultiplier = day < 90 ? -0.4 : (day < 150 ? -0.2 : 0.1);
      scenarioMultiplier += crashMultiplier;
      if (stock.sector === 'Finance') {
        scenarioMultiplier -= 0.25 * (day < 90 ? 1 : 0);
      }
      break;
  }
  
  // Apply news event impacts
  triggeredEvents.forEach(event => {
    if (
      event.affectedSectors.includes(stock.sector) ||
      event.affectedSymbols?.includes(stock.symbol)
    ) {
      // Decay effect over time (stronger on day of event, weaker later)
      const daysSinceEvent = day - event.day;
      const decay = Math.exp(-daysSinceEvent * 0.1);
      scenarioMultiplier *= (event.priceMultiplier - 1) * decay + 1;
    }
  });
  
  // Market trend effect
  let trendEffect = 0;
  switch (currentPhase.marketTrend) {
    case 'bullish':
      trendEffect = 0.002;
      break;
    case 'bearish':
      trendEffect = -0.003;
      break;
    case 'volatile':
      trendEffect = (random() - 0.5) * 0.004;
      break;
    case 'stable':
      trendEffect = 0;
      break;
  }
  
  // Random daily movement
  const dailyRandom = (random() - 0.5) * phaseVolatility * 0.1;
  
  // Calculate cumulative price change
  const previousPrice = stock.priceHistory.length > 0 
    ? stock.priceHistory[stock.priceHistory.length - 1].price 
    : stock.basePrice;
  
  const priceChange = previousPrice * (trendEffect + dailyRandom) * scenarioMultiplier;
  const newPrice = Math.max(previousPrice + priceChange, stock.basePrice * 0.1); // Floor at 10% of base
  
  return parseFloat(newPrice.toFixed(2));
}

/**
 * Seeded random number generator for reproducible simulations
 */
function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = Math.sin(s) * 10000;
    return s - Math.floor(s);
  };
}

/**
 * Calculate diversification score based on holdings
 */
export function calculateDiversificationScore(
  holdings: { symbol: string; value: number }[],
  stocks: SimulatedStock[]
): number {
  if (holdings.length === 0) return 0;
  
  const totalValue = holdings.reduce((sum, h) => sum + h.value, 0);
  if (totalValue === 0) return 0;
  
  // Count sectors
  const sectorWeights: Record<string, number> = {};
  holdings.forEach(holding => {
    const stock = stocks.find(s => s.symbol === holding.symbol);
    if (stock) {
      const sector = stock.sector;
      sectorWeights[sector] = (sectorWeights[sector] || 0) + holding.value;
    }
  });
  
  const sectorCount = Object.keys(sectorWeights).length;
  const hasETF = holdings.some(h => stocks.find(s => s.symbol === h.symbol)?.isETF);
  
  // Calculate concentration (Herfindahl index)
  const sectorShares = Object.values(sectorWeights).map(w => w / totalValue);
  const hhi = sectorShares.reduce((sum, share) => sum + share * share, 0);
  
  // Score components
  const sectorScore = Math.min(sectorCount / 5, 1) * 40; // Up to 40 points for 5+ sectors
  const concentrationScore = (1 - hhi) * 40; // Up to 40 points for low concentration
  const etfBonus = hasETF ? 20 : 0; // 20 points for including ETFs
  
  return Math.round(sectorScore + concentrationScore + etfBonus);
}

/**
 * Get mission grade based on performance
 */
export function getMissionGrade(
  returnPercent: number,
  maxDrawdown: number,
  diversificationScore: number,
  winCondition: MissionScenario['winCondition'],
  failCondition: MissionScenario['failCondition']
): 'S' | 'A' | 'B' | 'C' | 'F' {
  // Check fail condition first
  if (failCondition.type === 'drawdown' && maxDrawdown >= failCondition.threshold) {
    return 'F';
  }
  
  // Check win condition
  let metTarget = false;
  switch (winCondition.type) {
    case 'return':
      metTarget = returnPercent >= winCondition.target;
      break;
    case 'survive':
      metTarget = returnPercent >= winCondition.target;
      break;
    case 'diversification':
      metTarget = diversificationScore >= winCondition.target;
      break;
  }
  
  if (!metTarget) {
    return maxDrawdown < failCondition.threshold * 0.5 ? 'C' : 'F';
  }
  
  // Grade based on how well they exceeded targets
  const excessReturn = returnPercent - winCondition.target;
  if (excessReturn >= 10 && diversificationScore >= 80 && maxDrawdown < 10) {
    return 'S';
  } else if (excessReturn >= 5 || (diversificationScore >= 70 && maxDrawdown < 15)) {
    return 'A';
  } else if (excessReturn >= 0 || diversificationScore >= 60) {
    return 'B';
  }
  
  return 'C';
}
