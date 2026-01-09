'use client';

import React, { useMemo } from 'react';
import { 
  Trophy, 
  TrendingUp, 
  TrendingDown, 
  Brain, 
  Target, 
  AlertTriangle,
  BarChart2,
  BookOpen,
  ArrowRight,
  Lightbulb
} from 'lucide-react';
import Link from 'next/link';
import { Mission } from '@/data/missions';

interface Trade {
  id: string;
  day: number;
  symbol: string;
  action: 'buy' | 'sell';
  quantity: number;
  price: number;
  total: number;
  timestamp: Date;
}

interface MissionDebriefProps {
  mission: Mission;
  grade: 'S' | 'A' | 'B' | 'C' | 'F';
  returnPercent: number;
  maxDrawdown: number;
  trades: Trade[];
  portfolioHistory: { day: number; value: number }[];
  initialBalance: number;
  finalBalance: number;
  durationDays: number;
  onPlayAgain?: () => void;
  onNextMission?: () => void;
}

export function MissionDebrief({
  mission,
  grade,
  returnPercent,
  maxDrawdown,
  trades,
  portfolioHistory,
  initialBalance,
  finalBalance,
  durationDays,
  onPlayAgain,
  onNextMission,
}: MissionDebriefProps) {
  // Analyze trading behavior
  const behaviorAnalysis = useMemo(() => {
    const patterns: { type: string; detected: boolean; description: string; severity: 'good' | 'warning' | 'bad' }[] = [];
    
    // Panic Selling - selling during drawdowns
    const sellsDuringDrawdown = trades.filter(t => {
      if (t.action !== 'sell') return false;
      const historyAtTrade = portfolioHistory.find(h => h.day === t.day);
      if (!historyAtTrade) return false;
      const peak = Math.max(...portfolioHistory.slice(0, t.day + 1).map(h => h.value));
      const drawdownAtTrade = ((peak - historyAtTrade.value) / peak) * 100;
      return drawdownAtTrade > 10;
    });
    patterns.push({
      type: 'Panic Selling',
      detected: sellsDuringDrawdown.length > 2,
      description: sellsDuringDrawdown.length > 2 
        ? `Detected ${sellsDuringDrawdown.length} sells during significant drawdowns. Consider holding through volatility or setting stop-losses in advance.`
        : 'You maintained composure during market dips.',
      severity: sellsDuringDrawdown.length > 2 ? 'warning' : 'good',
    });

    // FOMO Buying - buying after significant gains
    const buyAfterPump = trades.filter(t => {
      if (t.action !== 'buy' || t.day < 5) return false;
      const recentHistory = portfolioHistory.slice(Math.max(0, t.day - 5), t.day);
      if (recentHistory.length < 2) return false;
      const recentGain = ((recentHistory[recentHistory.length - 1].value - recentHistory[0].value) / recentHistory[0].value) * 100;
      return recentGain > 5;
    });
    patterns.push({
      type: 'FOMO Trading',
      detected: buyAfterPump.length > 2,
      description: buyAfterPump.length > 2 
        ? `You made ${buyAfterPump.length} purchases right after market surges. Try to buy the dips, not the peaks.`
        : 'You avoided chasing rallies.',
      severity: buyAfterPump.length > 2 ? 'warning' : 'good',
    });

    // Overtrading
    const avgTradesPerDay = trades.length / durationDays;
    patterns.push({
      type: 'Overtrading',
      detected: avgTradesPerDay > 0.5,
      description: avgTradesPerDay > 0.5 
        ? `You averaged ${avgTradesPerDay.toFixed(2)} trades per day. Consider a more patient approach.`
        : 'You maintained disciplined trade frequency.',
      severity: avgTradesPerDay > 0.5 ? 'warning' : 'good',
    });

    // Concentration Risk
    const symbolCounts: Record<string, number> = {};
    trades.forEach(t => {
      symbolCounts[t.symbol] = (symbolCounts[t.symbol] || 0) + 1;
    });
    const topSymbol = Object.entries(symbolCounts).sort((a, b) => b[1] - a[1])[0];
    const concentrationRisk = topSymbol ? (topSymbol[1] / trades.length) > 0.5 : false;
    patterns.push({
      type: 'Concentration Risk',
      detected: concentrationRisk,
      description: concentrationRisk 
        ? `Over 50% of trades were in ${topSymbol?.[0]}. Diversify your activity across more assets.`
        : 'You spread your trades across multiple assets.',
      severity: concentrationRisk ? 'warning' : 'good',
    });

    return patterns;
  }, [trades, portfolioHistory, durationDays]);

  // Best and worst trades
  const tradeAnalysis = useMemo(() => {
    // For simplicity, we'll just show trade count by symbol
    const symbolStats: Record<string, { buys: number; sells: number; netVolume: number }> = {};
    trades.forEach(t => {
      if (!symbolStats[t.symbol]) {
        symbolStats[t.symbol] = { buys: 0, sells: 0, netVolume: 0 };
      }
      if (t.action === 'buy') {
        symbolStats[t.symbol].buys += t.quantity;
        symbolStats[t.symbol].netVolume += t.quantity;
      } else {
        symbolStats[t.symbol].sells += t.quantity;
        symbolStats[t.symbol].netVolume -= t.quantity;
      }
    });
    return symbolStats;
  }, [trades]);

  // Coaching recommendations based on grade and behavior
  const recommendations = useMemo(() => {
    const recs: string[] = [];
    
    if (grade === 'F') {
      recs.push('Review the mission objectives and scenario description before attempting again.');
      recs.push('Consider starting with more defensive positions (ETFs, dividend stocks) before taking concentrated bets.');
    }
    if (maxDrawdown > 20) {
      recs.push('Use stop-loss orders to limit potential losses on individual positions.');
      recs.push('Consider position sizing - never risk more than 10% of your portfolio on a single trade.');
    }
    if (behaviorAnalysis.find(b => b.type === 'Panic Selling' && b.detected)) {
      recs.push('Review the module on Investor Psychology: Understanding how emotions affect trading decisions.');
    }
    if (behaviorAnalysis.find(b => b.type === 'FOMO Trading' && b.detected)) {
      recs.push('Study the "Buy Low, Sell High" principle in the Fundamentals section.');
    }
    if (returnPercent < 0) {
      recs.push('Analyze market phases and learn to recognize when to be defensive vs. aggressive.');
    }
    if (grade === 'S' || grade === 'A') {
      recs.push('Excellent work! Consider challenging yourself with a harder mission.');
    }

    return recs;
  }, [grade, maxDrawdown, behaviorAnalysis, returnPercent]);

  const getGradeColor = (g: string) => {
    switch (g) {
      case 'S': return 'from-yellow-400 via-yellow-500 to-yellow-600';
      case 'A': return 'from-green-400 to-green-600';
      case 'B': return 'from-blue-400 to-blue-600';
      case 'C': return 'from-yellow-500 to-yellow-700';
      case 'F': return 'from-red-500 to-red-700';
      default: return 'from-gray-400 to-gray-600';
    }
  };

  const getGradeTitle = (g: string) => {
    switch (g) {
      case 'S': return 'Outstanding Performance!';
      case 'A': return 'Excellent Work!';
      case 'B': return 'Good Job!';
      case 'C': return 'Passing Grade';
      case 'F': return 'Mission Failed';
      default: return 'Results';
    }
  };

  return (
    <div className="min-h-screen bg-stone-100 dark:bg-stone-900 py-8">
      <div className="max-w-4xl mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-black text-black dark:text-stone-100 uppercase tracking-tight mb-2">
            Mission Debrief
          </h1>
          <p className="text-gray-600 dark:text-stone-400">{mission.title}</p>
        </div>

        {/* Grade Card */}
        <div className={`bg-gradient-to-br ${getGradeColor(grade)} p-8 border-4 border-black dark:border-stone-700 shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] dark:shadow-[12px_12px_0px_0px_rgba(0,0,0,0.5)] mb-8`}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white/80 text-sm uppercase tracking-widest mb-2">Final Grade</p>
              <h2 className="text-6xl font-black text-white">{grade}</h2>
              <p className="text-white text-xl font-bold mt-2">{getGradeTitle(grade)}</p>
            </div>
            <Trophy className="w-24 h-24 text-white/30" />
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white dark:bg-stone-800 border-4 border-black dark:border-stone-700 p-4 text-center">
            <p className="text-xs uppercase tracking-widest text-gray-500 dark:text-stone-400 mb-1">Return</p>
            <p className={`text-2xl font-black ${returnPercent >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
              {returnPercent >= 0 ? '+' : ''}{returnPercent.toFixed(2)}%
            </p>
          </div>
          <div className="bg-white dark:bg-stone-800 border-4 border-black dark:border-stone-700 p-4 text-center">
            <p className="text-xs uppercase tracking-widest text-gray-500 dark:text-stone-400 mb-1">Max Drawdown</p>
            <p className="text-2xl font-black text-red-600 dark:text-red-400">
              -{maxDrawdown.toFixed(2)}%
            </p>
          </div>
          <div className="bg-white dark:bg-stone-800 border-4 border-black dark:border-stone-700 p-4 text-center">
            <p className="text-xs uppercase tracking-widest text-gray-500 dark:text-stone-400 mb-1">Total Trades</p>
            <p className="text-2xl font-black text-black dark:text-stone-100">
              {trades.length}
            </p>
          </div>
          <div className="bg-white dark:bg-stone-800 border-4 border-black dark:border-stone-700 p-4 text-center">
            <p className="text-xs uppercase tracking-widest text-gray-500 dark:text-stone-400 mb-1">Final Balance</p>
            <p className="text-2xl font-black text-black dark:text-stone-100">
              ${finalBalance.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
            </p>
          </div>
        </div>

        {/* Behavior Analysis */}
        <div className="bg-white dark:bg-stone-800 border-4 border-black dark:border-stone-700 p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] dark:shadow-[8px_8px_0px_0px_rgba(0,0,0,0.5)] mb-8">
          <div className="flex items-center gap-2 mb-4 border-b-2 border-black dark:border-stone-700 pb-3">
            <Brain className="w-5 h-5 text-black dark:text-stone-400" />
            <h3 className="text-lg font-black uppercase tracking-wide text-black dark:text-stone-100">
              Psychological Analysis
            </h3>
          </div>
          <div className="space-y-4">
            {behaviorAnalysis.map((behavior, idx) => (
              <div
                key={idx}
                className={`p-4 border-l-4 ${
                  behavior.severity === 'good' ? 'border-green-500 bg-green-50 dark:bg-green-900/20' :
                  behavior.severity === 'warning' ? 'border-yellow-500 bg-yellow-50 dark:bg-yellow-900/20' :
                  'border-red-500 bg-red-50 dark:bg-red-900/20'
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  {behavior.severity === 'good' ? (
                    <TrendingUp className="w-4 h-4 text-green-600" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-yellow-600" />
                  )}
                  <span className="font-bold text-black dark:text-stone-100">{behavior.type}</span>
                  <span className={`text-xs px-2 py-0.5 rounded uppercase font-bold ${
                    behavior.detected 
                      ? (behavior.severity === 'warning' ? 'bg-yellow-200 text-yellow-800' : 'bg-red-200 text-red-800')
                      : 'bg-green-200 text-green-800'
                  }`}>
                    {behavior.detected ? 'Detected' : 'Not Detected'}
                  </span>
                </div>
                <p className="text-sm text-gray-700 dark:text-stone-300">{behavior.description}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Coaching Recommendations */}
        <div className="bg-white dark:bg-stone-800 border-4 border-black dark:border-stone-700 p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] dark:shadow-[8px_8px_0px_0px_rgba(0,0,0,0.5)] mb-8">
          <div className="flex items-center gap-2 mb-4 border-b-2 border-black dark:border-stone-700 pb-3">
            <Lightbulb className="w-5 h-5 text-yellow-500" />
            <h3 className="text-lg font-black uppercase tracking-wide text-black dark:text-stone-100">
              Coach&apos;s Recommendations
            </h3>
          </div>
          <ul className="space-y-3">
            {recommendations.map((rec, idx) => (
              <li key={idx} className="flex items-start gap-3">
                <ArrowRight className="w-4 h-4 text-blue-500 flex-shrink-0 mt-1" />
                <span className="text-gray-700 dark:text-stone-300">{rec}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Actions */}
        <div className="flex gap-4">
          {onPlayAgain && (
            <button
              onClick={onPlayAgain}
              className="flex-1 py-4 border-4 border-black dark:border-stone-700 bg-white dark:bg-stone-800 text-black dark:text-stone-100 font-black uppercase tracking-wide hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
            >
              Try Again
            </button>
          )}
          {onNextMission && grade !== 'F' && (
            <button
              onClick={onNextMission}
              className="flex-1 py-4 border-4 border-black dark:border-stone-700 bg-green-500 text-white font-black uppercase tracking-wide hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
            >
              Next Mission
            </button>
          )}
          <Link
            href="/missions"
            className="flex-1 py-4 border-4 border-black dark:border-stone-700 bg-black dark:bg-stone-700 text-white text-center font-black uppercase tracking-wide hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,0.5)]"
          >
            Back to Missions
          </Link>
        </div>
      </div>
    </div>
  );
}
