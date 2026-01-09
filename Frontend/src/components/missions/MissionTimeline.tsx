'use client';

import React from 'react';
import { Calendar, AlertCircle, TrendingUp, TrendingDown, Clock, Flag, Zap } from 'lucide-react';
import { NewsEvent } from '@/lib/missionSimulation';

interface TimelineEvent {
  day: number;
  type: 'news' | 'phase' | 'trade' | 'milestone';
  title: string;
  description?: string;
  impact?: 'positive' | 'negative' | 'neutral';
  isBreaking?: boolean;
}

interface MissionTimelineProps {
  currentDay: number;
  totalDays: number;
  events: TimelineEvent[];
  phases: {
    startDay: number;
    endDay: number;
    name: string;
    description: string;
    marketTrend: 'bullish' | 'bearish' | 'volatile' | 'stable';
  }[];
  portfolioHistory: { day: number; value: number }[];
  onDayClick?: (day: number) => void;
}

export function MissionTimeline({
  currentDay,
  totalDays,
  events,
  phases,
  portfolioHistory,
  onDayClick,
}: MissionTimelineProps) {
  // Calculate progress percentage
  const progressPercent = (currentDay / totalDays) * 100;
  
  // Get current phase
  const currentPhase = phases.find(p => currentDay >= p.startDay && currentDay <= p.endDay);
  
  // Get visible events (past and current)
  const visibleEvents = events.filter(e => e.day <= currentDay).slice(-5);
  
  // Get upcoming milestones (next 3 phase transitions or events)
  const upcomingMilestones = [
    ...phases.filter(p => p.startDay > currentDay).map(p => ({
      day: p.startDay,
      name: p.name,
      type: 'phase' as const,
    })),
    ...events.filter(e => e.day > currentDay).map(e => ({
      day: e.day,
      name: e.title,
      type: e.type,
    })),
  ].sort((a, b) => a.day - b.day).slice(0, 3);

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'bullish':
        return <TrendingUp className="w-4 h-4 text-green-500" />;
      case 'bearish':
        return <TrendingDown className="w-4 h-4 text-red-500" />;
      case 'volatile':
        return <Zap className="w-4 h-4 text-yellow-500" />;
      default:
        return <Clock className="w-4 h-4 text-gray-500" />;
    }
  };

  const getImpactColor = (impact?: string) => {
    switch (impact) {
      case 'positive':
        return 'border-green-500 bg-green-50 dark:bg-green-900/20';
      case 'negative':
        return 'border-red-500 bg-red-50 dark:bg-red-900/20';
      default:
        return 'border-gray-300 dark:border-stone-600 bg-gray-50 dark:bg-stone-800';
    }
  };

  return (
    <div className="bg-white dark:bg-stone-800 border-4 border-black dark:border-stone-700 p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] dark:shadow-[8px_8px_0px_0px_rgba(0,0,0,0.5)]">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 border-b-2 border-black dark:border-stone-700 pb-3">
        <div className="flex items-center gap-2">
          <Calendar className="w-5 h-5 text-black dark:text-stone-400" />
          <h3 className="text-lg font-black uppercase tracking-wide text-black dark:text-stone-100">
            Mission Timeline
          </h3>
        </div>
        <div className="text-right">
          <p className="text-2xl font-black text-black dark:text-stone-100">
            Day {currentDay}
          </p>
          <p className="text-xs text-gray-500 dark:text-stone-400">
            of {totalDays} days
          </p>
        </div>
      </div>

      {/* Progress Bar with Phase Markers */}
      <div className="mb-6">
        <div className="relative h-8 bg-stone-200 dark:bg-stone-700 border-2 border-black dark:border-stone-600 overflow-hidden">
          {/* Phase backgrounds */}
          {phases.map((phase, idx) => {
            const startPercent = (phase.startDay / totalDays) * 100;
            const widthPercent = ((phase.endDay - phase.startDay) / totalDays) * 100;
            const phaseColors = {
              bullish: 'bg-green-200/50 dark:bg-green-900/30',
              bearish: 'bg-red-200/50 dark:bg-red-900/30',
              volatile: 'bg-yellow-200/50 dark:bg-yellow-900/30',
              stable: 'bg-blue-200/50 dark:bg-blue-900/30',
            };
            return (
              <div
                key={idx}
                className={`absolute top-0 h-full ${phaseColors[phase.marketTrend]}`}
                style={{ left: `${startPercent}%`, width: `${widthPercent}%` }}
                title={phase.name}
              />
            );
          })}

          {/* Progress fill */}
          <div
            className="absolute top-0 left-0 h-full bg-black dark:bg-green-600 transition-all duration-500 ease-out"
            style={{ width: `${progressPercent}%` }}
          />

          {/* Event markers */}
          {events.map((event, idx) => {
            const position = (event.day / totalDays) * 100;
            if (event.day > currentDay) return null;
            return (
              <div
                key={idx}
                className={`absolute top-0 w-1 h-full ${
                  event.isBreaking ? 'bg-red-500' : 
                  event.impact === 'positive' ? 'bg-green-500' :
                  event.impact === 'negative' ? 'bg-red-400' : 'bg-yellow-500'
                }`}
                style={{ left: `${position}%` }}
                title={event.title}
              />
            );
          })}

          {/* Current day marker */}
          <div
            className="absolute top-0 w-2 h-full bg-yellow-400 border-x border-black dark:border-yellow-600 z-10"
            style={{ left: `${progressPercent}%`, transform: 'translateX(-50%)' }}
          />
        </div>

        {/* Phase labels */}
        <div className="flex mt-2">
          {phases.map((phase, idx) => {
            const startPercent = (phase.startDay / totalDays) * 100;
            const widthPercent = ((phase.endDay - phase.startDay) / totalDays) * 100;
            const isCurrent = currentDay >= phase.startDay && currentDay <= phase.endDay;
            return (
              <div
                key={idx}
                className={`text-center px-1 ${isCurrent ? 'font-bold' : ''}`}
                style={{ width: `${widthPercent}%`, marginLeft: idx === 0 ? `${startPercent}%` : 0 }}
              >
                <p className={`text-xs truncate ${isCurrent ? 'text-black dark:text-stone-100' : 'text-gray-500 dark:text-stone-500'}`}>
                  {phase.name}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Current Phase Info */}
      {currentPhase && (
        <div className="mb-6 p-4 bg-stone-100 dark:bg-stone-900 border-2 border-black dark:border-stone-700">
          <div className="flex items-center gap-2 mb-2">
            {getTrendIcon(currentPhase.marketTrend)}
            <h4 className="font-bold text-black dark:text-stone-100 uppercase tracking-wide">
              Current Phase: {currentPhase.name}
            </h4>
          </div>
          <p className="text-sm text-gray-700 dark:text-stone-300">
            {currentPhase.description}
          </p>
          <div className="mt-2 flex items-center gap-4 text-xs text-gray-500 dark:text-stone-400">
            <span>Days {currentPhase.startDay} - {currentPhase.endDay}</span>
            <span className={`px-2 py-0.5 rounded uppercase font-bold ${
              currentPhase.marketTrend === 'bullish' ? 'bg-green-200 text-green-800 dark:bg-green-900/50 dark:text-green-300' :
              currentPhase.marketTrend === 'bearish' ? 'bg-red-200 text-red-800 dark:bg-red-900/50 dark:text-red-300' :
              currentPhase.marketTrend === 'volatile' ? 'bg-yellow-200 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300' :
              'bg-blue-200 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300'
            }`}>
              {currentPhase.marketTrend}
            </span>
          </div>
        </div>
      )}

      {/* Recent Events */}
      {visibleEvents.length > 0 && (
        <div className="mb-6">
          <h4 className="text-sm font-bold uppercase tracking-widest text-gray-500 dark:text-stone-400 mb-3">
            Recent Events
          </h4>
          <div className="space-y-2">
            {visibleEvents.map((event, idx) => (
              <div
                key={idx}
                className={`p-3 border-l-4 ${getImpactColor(event.impact)} transition-all`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      {event.isBreaking && (
                        <span className="text-xs font-bold text-red-600 dark:text-red-400 uppercase animate-pulse">
                          Breaking
                        </span>
                      )}
                      <span className="text-xs text-gray-500 dark:text-stone-400">
                        Day {event.day}
                      </span>
                    </div>
                    <p className="font-bold text-black dark:text-stone-100 text-sm">
                      {event.title}
                    </p>
                    {event.description && (
                      <p className="text-xs text-gray-600 dark:text-stone-400 mt-1">
                        {event.description}
                      </p>
                    )}
                  </div>
                  <div>
                    {event.impact === 'positive' && <TrendingUp className="w-4 h-4 text-green-500" />}
                    {event.impact === 'negative' && <TrendingDown className="w-4 h-4 text-red-500" />}
                    {event.impact === 'neutral' && <AlertCircle className="w-4 h-4 text-yellow-500" />}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Upcoming Milestones */}
      {upcomingMilestones.length > 0 && (
        <div>
          <h4 className="text-sm font-bold uppercase tracking-widest text-gray-500 dark:text-stone-400 mb-3">
            Upcoming
          </h4>
          <div className="flex gap-4">
            {upcomingMilestones.map((milestone, idx) => (
              <div
                key={idx}
                className="flex-1 p-3 bg-stone-50 dark:bg-stone-900 border border-dashed border-gray-300 dark:border-stone-600 text-center"
              >
                <Flag className="w-4 h-4 mx-auto mb-1 text-gray-400 dark:text-stone-500" />
                <p className="text-xs font-bold text-gray-600 dark:text-stone-300">
                  Day {milestone.day}
                </p>
                <p className="text-xs text-gray-500 dark:text-stone-400 truncate">
                  {milestone.name}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
