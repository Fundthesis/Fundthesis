'use client';

import React from 'react';
import { Mission } from '@/data/missions';
import { CheckCircle2, Circle, Target, BookOpen, Clock } from 'lucide-react';

interface MissionContextPanelProps {
  mission: Mission;
  completedObjectives: string[];
  portfolioValue: number;
  startingBalance: number;
}

export function MissionContextPanel({
  mission,
  completedObjectives,
  portfolioValue,
  startingBalance,
}: MissionContextPanelProps) {
  const progress = mission.objectives.length > 0
    ? (completedObjectives.length / mission.objectives.length) * 100
    : 0;

  const portfolioReturn = startingBalance > 0
    ? ((portfolioValue - startingBalance) / startingBalance) * 100
    : 0;

  const getDifficultyColor = (difficulty: Mission['difficulty']) => {
    switch (difficulty) {
      case 'beginner':
        return 'text-green-600 dark:text-green-400';
      case 'intermediate':
        return 'text-yellow-600 dark:text-yellow-400';
      case 'advanced':
        return 'text-orange-600 dark:text-orange-400';
      case 'expert':
        return 'text-red-600 dark:text-red-400';
      default:
        return 'text-gray-600 dark:text-gray-400';
    }
  };

  return (
    <div className="bg-white dark:bg-stone-800 border-2 border-black dark:border-stone-700 p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] dark:shadow-[8px_8px_0px_0px_rgba(0,0,0,0.5)]">
      {/* Mission Header */}
      <div className="border-b-2 border-black dark:border-stone-700 pb-4 mb-6">
        <div className="flex items-start justify-between mb-2">
          <div className="flex-1">
            <h2 className="text-2xl font-black font-serif text-black dark:text-stone-100 mb-1">
              {mission.title}
            </h2>
            <p className="text-sm font-serif italic text-gray-600 dark:text-stone-400">
              {mission.subtitle}
            </p>
          </div>
          <span className={`text-xs font-bold uppercase tracking-widest px-2 py-1 border border-black dark:border-stone-600 ${getDifficultyColor(mission.difficulty)}`}>
            {mission.difficulty}
          </span>
        </div>
        <p className="text-sm text-gray-700 dark:text-stone-300 leading-relaxed">
          {mission.description}
        </p>
      </div>

      {/* Scenario Info */}
      {mission.sandboxConfig.marketCondition && (
        <div className="bg-stone-100 dark:bg-stone-900 border border-black/10 dark:border-stone-700 p-4 mb-6">
          <div className="flex items-center gap-2 mb-2">
            <Target className="w-4 h-4 text-black dark:text-stone-400" />
            <h3 className="text-xs font-bold uppercase tracking-widest text-black dark:text-stone-400">
              Market Scenario
            </h3>
          </div>
          <p className="text-sm font-serif text-gray-800 dark:text-stone-200">
            {mission.sandboxConfig.marketCondition}
          </p>
        </div>
      )}

      {/* Objectives Progress */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold uppercase tracking-widest text-black dark:text-stone-400 flex items-center gap-2">
            <Target className="w-4 h-4" />
            Mission Objectives
          </h3>
          <span className="text-xs text-gray-600 dark:text-stone-400">
            {completedObjectives.length} / {mission.objectives.length}
          </span>
        </div>
        <div className="space-y-2">
          {mission.objectives.map((objective, index) => {
            const isCompleted = completedObjectives.includes(objective);
            return (
              <div
                key={index}
                className={`flex items-start gap-2 p-2 rounded border ${
                  isCompleted
                    ? 'bg-green-50 dark:bg-green-900/20 border-green-300 dark:border-green-700'
                    : 'bg-stone-50 dark:bg-stone-900 border-stone-200 dark:border-stone-700'
                }`}
              >
                {isCompleted ? (
                  <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
                ) : (
                  <Circle className="w-5 h-5 text-gray-400 dark:text-stone-600 flex-shrink-0 mt-0.5" />
                )}
                <span
                  className={`text-sm ${
                    isCompleted
                      ? 'text-green-800 dark:text-green-300 line-through'
                      : 'text-gray-700 dark:text-stone-300'
                  }`}
                >
                  {objective}
                </span>
              </div>
            );
          })}
        </div>
        <div className="mt-3">
          <div className="w-full bg-stone-200 dark:bg-stone-700 h-2 rounded-full overflow-hidden">
            <div
              className="h-full bg-green-600 dark:bg-green-500 transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-xs text-gray-600 dark:text-stone-400 mt-1 text-right">
            {Math.round(progress)}% Complete
          </p>
        </div>
      </div>

      {/* Learning Outcomes */}
      <div className="mb-6">
        <h3 className="text-sm font-bold uppercase tracking-widest text-black dark:text-stone-400 flex items-center gap-2 mb-3">
          <BookOpen className="w-4 h-4" />
          What You&apos;ll Learn
        </h3>
        <ul className="space-y-1">
          {mission.learningOutcomes.map((outcome, index) => (
            <li
              key={index}
              className="text-sm text-gray-700 dark:text-stone-300 flex items-start gap-2"
            >
              <span className="text-gray-400 dark:text-stone-600 font-serif">—</span>
              <span>{outcome}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Portfolio Performance */}
      <div className="border-t-2 border-black dark:border-stone-700 pt-4">
        <h3 className="text-sm font-bold uppercase tracking-widest text-black dark:text-stone-400 mb-3">
          Portfolio Performance
        </h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-gray-600 dark:text-stone-400 mb-1">Current Value</p>
            <p className="text-lg font-bold text-black dark:text-stone-100">
              ${portfolioValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-600 dark:text-stone-400 mb-1">Return</p>
            <p
              className={`text-lg font-bold ${
                portfolioReturn >= 0
                  ? 'text-green-600 dark:text-green-400'
                  : 'text-red-600 dark:text-red-400'
              }`}
            >
              {portfolioReturn >= 0 ? '+' : ''}
              {portfolioReturn.toFixed(2)}%
            </p>
          </div>
        </div>
      </div>

      {/* Estimated Time */}
      <div className="mt-4 flex items-center gap-2 text-xs text-gray-600 dark:text-stone-400">
        <Clock className="w-4 h-4" />
        <span>Estimated Time: {mission.estimatedTime}</span>
      </div>
    </div>
  );
}
