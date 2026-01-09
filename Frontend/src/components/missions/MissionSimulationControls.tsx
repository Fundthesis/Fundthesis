'use client';

import React from 'react';
import { 
  Play, 
  Pause, 
  SkipForward, 
  FastForward, 
  Rewind,
  Calendar,
  Clock,
  Target,
  AlertTriangle,
  Trophy
} from 'lucide-react';

interface MissionSimulationControlsProps {
  isRunning: boolean;
  isPaused: boolean;
  currentDay: number;
  totalDays: number;
  speed: number;
  currentPhase: string;
  portfolioValue: number;
  initialValue: number;
  maxDrawdown: number;
  failThreshold: number;
  winTarget: number;
  winConditionType: string;
  onPlay: () => void;
  onPause: () => void;
  onResume: () => void;
  onSpeedChange: (speed: number) => void;
  onSkipDay: () => void;
  onReset: () => void;
  isComplete: boolean;
  grade?: 'S' | 'A' | 'B' | 'C' | 'F';
}

export function MissionSimulationControls({
  isRunning,
  isPaused,
  currentDay,
  totalDays,
  speed,
  currentPhase,
  portfolioValue,
  initialValue,
  maxDrawdown,
  failThreshold,
  winTarget,
  winConditionType,
  onPlay,
  onPause,
  onResume,
  onSpeedChange,
  onSkipDay,
  onReset,
  isComplete,
  grade,
}: MissionSimulationControlsProps) {
  const returnPercent = initialValue > 0 ? ((portfolioValue - initialValue) / initialValue) * 100 : 0;
  const drawdownPercent = maxDrawdown;
  const isInDanger = drawdownPercent >= failThreshold * 0.7;
  const hasFailed = drawdownPercent >= failThreshold;

  // Calculate progress towards win condition
  const getWinProgress = () => {
    switch (winConditionType) {
      case 'return':
        return Math.min((returnPercent / winTarget) * 100, 100);
      case 'survive':
        return returnPercent >= winTarget ? 100 : 0;
      case 'diversification':
        return 0; // Handled separately
      default:
        return 0;
    }
  };

  const winProgress = getWinProgress();

  const getGradeColor = (g?: string) => {
    switch (g) {
      case 'S': return 'bg-gradient-to-r from-yellow-400 to-yellow-600 text-black';
      case 'A': return 'bg-green-500 text-white';
      case 'B': return 'bg-blue-500 text-white';
      case 'C': return 'bg-yellow-500 text-black';
      case 'F': return 'bg-red-500 text-white';
      default: return 'bg-gray-500 text-white';
    }
  };

  return (
    <div className="bg-white dark:bg-stone-800 border-4 border-black dark:border-stone-700 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] dark:shadow-[8px_8px_0px_0px_rgba(0,0,0,0.5)]">
      {/* Top Bar - Mission Status */}
      <div className="flex items-center justify-between p-4 border-b-4 border-black dark:border-stone-700 bg-stone-50 dark:bg-stone-900">
        {/* Day Counter */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-black dark:text-stone-400" />
            <div>
              <p className="text-xs uppercase tracking-widest text-gray-500 dark:text-stone-400">Simulation Day</p>
              <p className="text-3xl font-black text-black dark:text-stone-100">
                {currentDay}<span className="text-lg text-gray-500 dark:text-stone-400">/{totalDays}</span>
              </p>
            </div>
          </div>
          <div className="h-12 w-0.5 bg-gray-300 dark:bg-stone-600" />
          <div>
            <p className="text-xs uppercase tracking-widest text-gray-500 dark:text-stone-400">Current Phase</p>
            <p className="text-lg font-bold text-black dark:text-stone-100">{currentPhase}</p>
          </div>
        </div>

        {/* Win/Fail Indicators */}
        <div className="flex items-center gap-6">
          {/* Win Condition Progress */}
          <div className="text-center">
            <div className="flex items-center gap-2 mb-1">
              <Target className="w-4 h-4 text-green-600 dark:text-green-400" />
              <span className="text-xs uppercase tracking-widest text-gray-500 dark:text-stone-400">
                {winConditionType === 'return' ? 'Target Return' : winConditionType === 'survive' ? 'Survival' : 'Objective'}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-24 h-3 bg-gray-200 dark:bg-stone-700 border border-black dark:border-stone-600 overflow-hidden">
                <div
                  className="h-full bg-green-500 transition-all duration-300"
                  style={{ width: `${winProgress}%` }}
                />
              </div>
              <span className={`text-sm font-bold ${returnPercent >= winTarget ? 'text-green-600 dark:text-green-400' : 'text-gray-600 dark:text-stone-400'}`}>
                {returnPercent.toFixed(1)}% / {winTarget}%
              </span>
            </div>
          </div>

          {/* Margin Call Warning */}
          <div className="text-center">
            <div className="flex items-center gap-2 mb-1">
              <AlertTriangle className={`w-4 h-4 ${isInDanger ? 'text-red-500 animate-pulse' : 'text-gray-400 dark:text-stone-500'}`} />
              <span className="text-xs uppercase tracking-widest text-gray-500 dark:text-stone-400">
                Max Drawdown
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-24 h-3 bg-gray-200 dark:bg-stone-700 border border-black dark:border-stone-600 overflow-hidden">
                <div
                  className={`h-full transition-all duration-300 ${
                    hasFailed ? 'bg-red-600' : isInDanger ? 'bg-yellow-500' : 'bg-gray-400'
                  }`}
                  style={{ width: `${Math.min((drawdownPercent / failThreshold) * 100, 100)}%` }}
                />
              </div>
              <span className={`text-sm font-bold ${
                hasFailed ? 'text-red-600 dark:text-red-400' : 
                isInDanger ? 'text-yellow-600 dark:text-yellow-400' : 
                'text-gray-600 dark:text-stone-400'
              }`}>
                {drawdownPercent.toFixed(1)}% / {failThreshold}%
              </span>
            </div>
          </div>
        </div>

        {/* Grade Display (when complete) */}
        {isComplete && grade && (
          <div className="flex items-center gap-3">
            <Trophy className="w-8 h-8 text-yellow-500" />
            <div className={`w-16 h-16 flex items-center justify-center border-4 border-black dark:border-stone-600 ${getGradeColor(grade)} font-black text-4xl`}>
              {grade}
            </div>
          </div>
        )}
      </div>

      {/* Control Bar */}
      <div className="flex items-center justify-between p-4">
        {/* Playback Controls */}
        <div className="flex items-center gap-2">
          {!isRunning || isPaused ? (
            <button
              onClick={isRunning ? onResume : onPlay}
              disabled={isComplete || hasFailed}
              className={`p-4 border-4 border-black dark:border-stone-700 font-black transition-all ${
                isComplete || hasFailed
                  ? 'bg-gray-300 dark:bg-stone-700 text-gray-500 cursor-not-allowed'
                  : 'bg-green-500 dark:bg-green-600 text-white hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:hover:shadow-[4px_4px_0px_0px_rgba(255,255,255,0.2)]'
              }`}
            >
              <Play className="w-6 h-6" />
            </button>
          ) : (
            <button
              onClick={onPause}
              className="p-4 border-4 border-black dark:border-stone-700 bg-yellow-500 dark:bg-yellow-600 text-white font-black transition-all hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:hover:shadow-[4px_4px_0px_0px_rgba(255,255,255,0.2)]"
            >
              <Pause className="w-6 h-6" />
            </button>
          )}

          <button
            onClick={onSkipDay}
            disabled={isComplete || hasFailed || (!isPaused && isRunning)}
            className={`p-3 border-4 border-black dark:border-stone-700 font-black transition-all ${
              isComplete || hasFailed || (!isPaused && isRunning)
                ? 'bg-gray-300 dark:bg-stone-700 text-gray-500 cursor-not-allowed'
                : 'bg-blue-500 dark:bg-blue-600 text-white hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:hover:shadow-[4px_4px_0px_0px_rgba(255,255,255,0.2)]'
            }`}
            title="Skip to next day"
          >
            <SkipForward className="w-5 h-5" />
          </button>

          <button
            onClick={onReset}
            className="p-3 border-4 border-black dark:border-stone-700 bg-red-500 dark:bg-red-600 text-white font-black transition-all hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:hover:shadow-[4px_4px_0px_0px_rgba(255,255,255,0.2)]"
            title="Reset mission"
          >
            <Rewind className="w-5 h-5" />
          </button>
        </div>

        {/* Speed Controls */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-gray-500 dark:text-stone-400" />
            <span className="text-xs uppercase tracking-widest text-gray-500 dark:text-stone-400">Speed</span>
          </div>
          <div className="flex gap-1">
            {[0.5, 1, 2, 5, 10].map((s) => (
              <button
                key={s}
                onClick={() => onSpeedChange(s)}
                className={`px-3 py-2 border-2 font-bold text-sm transition-all ${
                  speed === s
                    ? 'border-black dark:border-stone-500 bg-black dark:bg-stone-700 text-white'
                    : 'border-gray-300 dark:border-stone-600 bg-white dark:bg-stone-800 text-black dark:text-stone-100 hover:border-black dark:hover:border-stone-500'
                }`}
              >
                {s}x
              </button>
            ))}
          </div>
          <FastForward className={`w-4 h-4 ${speed >= 5 ? 'text-blue-500 animate-pulse' : 'text-gray-400 dark:text-stone-500'}`} />
        </div>

        {/* Portfolio Value */}
        <div className="text-right">
          <p className="text-xs uppercase tracking-widest text-gray-500 dark:text-stone-400">Portfolio Value</p>
          <p className="text-3xl font-black text-black dark:text-stone-100">
            ${portfolioValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
          <p className={`text-sm font-bold ${returnPercent >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
            {returnPercent >= 0 ? '+' : ''}{returnPercent.toFixed(2)}% from start
          </p>
        </div>
      </div>

      {/* Status Messages */}
      {(isComplete || hasFailed) && (
        <div className={`p-4 border-t-4 border-black dark:border-stone-700 ${
          hasFailed ? 'bg-red-100 dark:bg-red-900/30' : 'bg-green-100 dark:bg-green-900/30'
        }`}>
          <p className={`text-center font-bold text-lg ${
            hasFailed ? 'text-red-800 dark:text-red-300' : 'text-green-800 dark:text-green-300'
          }`}>
            {hasFailed 
              ? '💥 MARGIN CALL - Mission Failed! Your losses exceeded the threshold.'
              : `🎉 Mission Complete! Final Grade: ${grade}`
            }
          </p>
          <p className="text-center text-sm text-gray-600 dark:text-stone-400 mt-1">
            {hasFailed 
              ? 'Review your trades and try again to improve your strategy.'
              : 'Proceed to the Debrief to review your performance and learn from this experience.'
            }
          </p>
        </div>
      )}
    </div>
  );
}
