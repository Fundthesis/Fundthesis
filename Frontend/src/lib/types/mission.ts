/**
 * Mission Types - Centralized type definitions for the mission system
 * This file contains all shared types used across mission components
 */

// ============= Difficulty System =============

export type MissionDifficultyLevel = 'easy' | 'medium' | 'hard';

export interface DifficultyConfig {
  level: MissionDifficultyLevel;
  label: string;
  description: string;
  newsClarity: 'obvious' | 'mixed' | 'conflicting';
  conflictingNewsChance: number; // 0-1, chance of adding conflicting news
  fakeOutChance: number; // 0-1, chance of news having opposite effect
  volatilityMultiplier: number;
  timePressure: number; // Days to complete (fewer = harder)
  gradeBonus: number; // Bonus points for completing on harder difficulty
}

export const DIFFICULTY_CONFIGS: Record<MissionDifficultyLevel, DifficultyConfig> = {
  easy: {
    level: 'easy',
    label: 'Beginner',
    description: 'Clear news signals, obvious market reactions',
    newsClarity: 'obvious',
    conflictingNewsChance: 0,
    fakeOutChance: 0,
    volatilityMultiplier: 0.7,
    timePressure: 90,
    gradeBonus: 0,
  },
  medium: {
    level: 'medium',
    label: 'Intermediate',
    description: 'Some conflicting signals, requires analysis',
    newsClarity: 'mixed',
    conflictingNewsChance: 0.2,
    fakeOutChance: 0.1,
    volatilityMultiplier: 1.0,
    timePressure: 60,
    gradeBonus: 5,
  },
  hard: {
    level: 'hard',
    label: 'Expert',
    description: 'Conflicting news, fake-outs, high volatility',
    newsClarity: 'conflicting',
    conflictingNewsChance: 0.4,
    fakeOutChance: 0.25,
    volatilityMultiplier: 1.5,
    timePressure: 45,
    gradeBonus: 15,
  },
};

// ============= Trade Types =============

export interface MissionTrade {
  id: string;
  day: number;
  symbol: string;
  action: 'buy' | 'sell';
  quantity: number;
  price: number;
  total: number;
  timestamp: Date;
  triggerReason?: string; // What news/event triggered this trade
}

// ============= Portfolio Types =============

export interface PortfolioSnapshot {
  day: number;
  value: number;
  cash: number;
  holdingsValue: number;
}

export interface Holding {
  symbol: string;
  quantity: number;
  avgPrice: number;
  currentPrice: number;
  totalValue: number;
  gainLoss: number;
  gainLossPercent: number;
  sector?: string;
}

// ============= Debrief Types =============

export interface MissionCompletionData {
  missionId: string;
  grade: MissionGrade;
  difficulty: MissionDifficultyLevel;
  returnPercent: number;
  maxDrawdown: number;
  initialBalance: number;
  finalBalance: number;
  durationDays: number;
  trades: MissionTrade[];
  portfolioHistory: PortfolioSnapshot[];
}

export type MissionGrade = 'S' | 'A' | 'B' | 'C' | 'F';

export const GRADE_ORDER: Record<MissionGrade, number> = {
  'S': 5,
  'A': 4,
  'B': 3,
  'C': 2,
  'F': 1,
};

export interface BehaviorPattern {
  type: 'Panic Selling' | 'FOMO Trading' | 'Overtrading' | 'Concentration Risk' | 'Diamond Hands' | 'Diversification';
  detected: boolean;
  description: string;
  severity: 'good' | 'warning' | 'bad';
}

// ============= News Types (Extended) =============

export interface NewsEventWithDifficulty {
  id: string;
  day: number;
  headline: string;
  summary: string;
  source: string;
  impact: 'positive' | 'negative' | 'neutral';
  affectedSectors: string[];
  affectedSymbols?: string[];
  priceMultiplier: number;
  isBreaking?: boolean;
  timestamp: Date;
  // Difficulty-related fields
  isFakeOut?: boolean; // If true, actual effect is opposite of apparent
  conflictingNewsId?: string; // ID of conflicting news that appears same day
  difficultyLevel?: MissionDifficultyLevel; // Minimum difficulty to show this
  analysisHint?: string; // Hint for players on how to interpret
}

// ============= API Request/Response Types =============

export interface SaveMissionResultRequest {
  missionId: string;
  grade: MissionGrade;
  difficulty: MissionDifficultyLevel;
  returnPercent: number;
  maxDrawdown: number;
  initialBalance: number;
  finalBalance: number;
  durationDays: number;
  totalTrades: number;
  trades: MissionTrade[];
  portfolioHistory: PortfolioSnapshot[];
}

export interface MissionResultResponse {
  id: string;
  missionId: string;
  grade: MissionGrade;
  difficulty: MissionDifficultyLevel;
  returnPercent: number;
  maxDrawdown: number;
  initialBalance: number;
  finalBalance: number;
  durationDays: number;
  totalTrades: number;
  completedAt: string;
}

export interface MissionHistoryResponse {
  results: MissionResultResponse[];
  stats: {
    totalCompleted: number;
    averageGrade: string;
    bestGrade: MissionGrade | null;
    totalReturn: number;
  };
}

// ============= Simulation State Types =============

export interface SimulationPhase {
  startDay: number;
  endDay: number;
  name: string;
  description: string;
  marketTrend: 'bullish' | 'bearish' | 'volatile' | 'stable';
  volatilityMultiplier: number;
}

export type SimulationSpeed = 1 | 2 | 4 | 8;

export interface SimulationControls {
  isRunning: boolean;
  isPaused: boolean;
  speed: SimulationSpeed;
  currentDay: number;
  isComplete: boolean;
}
