'use client';

import React, { useState, useEffect, Suspense, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useAuth } from '@/providers/AuthProvider';
import { getMissionById, Mission } from '@/data/missions';
import { MissionPreBuild } from '@/components/missions/MissionPreBuild';
import { MissionSimulatorV2 } from '@/components/missions/MissionSimulatorV2';
import { MissionDebrief } from '@/components/missions/MissionDebrief';
import { Loader2 } from 'lucide-react';
import { 
  MissionDifficultyLevel,
  MissionTrade,
  PortfolioSnapshot,
  MissionGrade,
} from '@/lib/types/mission';

type Phase = 'prebuild' | 'simulation' | 'debrief';

interface SimulationCompletionData {
  grade: MissionGrade;
  returnPercent: number;
  maxDrawdown: number;
  trades: MissionTrade[];
  portfolioHistory: PortfolioSnapshot[];
  initialBalance: number;
  finalBalance: number;
  durationDays: number;
}

function MissionSimulationContent() {
  const { user, isLoading: isAuthLoading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [mission, setMission] = useState<Mission | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [phase, setPhase] = useState<Phase>('prebuild');
  const [difficulty, setDifficulty] = useState<MissionDifficultyLevel>('medium');
  
  // Portfolio state that carries between phases
  const [holdings, setHoldings] = useState<Record<string, { quantity: number; avgPrice: number }>>({});
  const [cashBalance, setCashBalance] = useState(0);
  
  // Completion data for debrief
  const [completionData, setCompletionData] = useState<SimulationCompletionData | null>(null);

  useEffect(() => {
    // Redirect if not authenticated
    if (!isAuthLoading && !user) {
      router.replace('/auth?redirect=/missions/simulation');
      return;
    }

    // Load mission from query params
    const missionId = searchParams?.get('missionId');
    const difficultyParam = searchParams?.get('difficulty') as MissionDifficultyLevel;
    
    if (difficultyParam && ['easy', 'medium', 'hard'].includes(difficultyParam)) {
      setDifficulty(difficultyParam);
    }
    
    if (missionId) {
      const foundMission = getMissionById(missionId);
      if (foundMission) {
        setMission(foundMission);
        setCashBalance(foundMission.sandboxConfig.startingBalance);
      } else {
        router.replace('/missions');
      }
    } else {
      router.replace('/missions');
    }
    setIsLoading(false);
  }, [isAuthLoading, user, router, searchParams]);

  const handleStartSimulation = (
    portfolioHoldings: Record<string, { quantity: number; avgPrice: number }>,
    cash: number
  ) => {
    setHoldings(portfolioHoldings);
    setCashBalance(cash);
    setPhase('simulation');
  };

  const handleComplete = useCallback(async (data: SimulationCompletionData) => {
    setCompletionData(data);
    
    // Calculate XP earned (matching backend/app/api/biography.py)
    const XP_VALUES: Record<string, number> = {
      mission_complete_beginner: 150,
      mission_complete_intermediate: 250,
      mission_complete_advanced: 400,
      mission_complete_expert: 600,
      mission_grade_S: 100,
      mission_grade_A: 50,
    };
    
    // Map frontend difficulty to backend XP keys
    const DIFFICULTY_XP_MAP: Record<string, string> = {
      easy: 'mission_complete_beginner',
      medium: 'mission_complete_intermediate',
      hard: 'mission_complete_advanced',
      expert: 'mission_complete_expert',
    };
    
    const difficultyKey = DIFFICULTY_XP_MAP[difficulty] || 'mission_complete_intermediate';
    const baseXP = XP_VALUES[difficultyKey] || 250;
    const gradeBonus = data.grade === 'S' ? XP_VALUES.mission_grade_S : 
                      data.grade === 'A' ? XP_VALUES.mission_grade_A : 0;
    
    // Save to database
    if (mission && user) {
      try {
        const response = await fetch('/api/mission/results', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            missionId: mission.id,
            grade: data.grade,
            difficulty,
            returnPercent: data.returnPercent,
            maxDrawdown: data.maxDrawdown,
            initialBalance: data.initialBalance,
            finalBalance: data.finalBalance,
            durationDays: data.durationDays,
            totalTrades: data.trades.length,
            trades: data.trades,
            portfolioHistory: data.portfolioHistory,
          }),
        });

        if (response.ok) {
          // Calculate updated total XP (with small delay to ensure DB transaction is committed)
          try {
            // Wait a bit to ensure the database transaction is committed
            await new Promise(resolve => setTimeout(resolve, 300));
            
            const xpResponse = await fetch('/api/users/me/xp/calculate', {
              method: 'POST',
            });
            if (xpResponse.ok) {
              const xpData = await xpResponse.json();
              
              // Show XP notification
              const { showMissionXPNotification } = await import('@/lib/xpNotifications');
              showMissionXPNotification(
                difficulty,
                data.grade,
                baseXP,
                gradeBonus,
                xpData.xp
              );
              
              // Dispatch event to invalidate biography cache
              window.dispatchEvent(new CustomEvent('xp-earned', { detail: { source: 'mission' } }));
            } else {
              // If XP calculation fails, show notification without total
              const { showMissionXPNotification } = await import('@/lib/xpNotifications');
              showMissionXPNotification(difficulty, data.grade, baseXP, gradeBonus);
              window.dispatchEvent(new CustomEvent('xp-earned', { detail: { source: 'mission' } }));
            }
          } catch (xpError) {
            console.warn('Failed to calculate XP:', xpError);
            // Still show notification with calculated values
            const { showMissionXPNotification } = await import('@/lib/xpNotifications');
            showMissionXPNotification(difficulty, data.grade, baseXP, gradeBonus);
            window.dispatchEvent(new CustomEvent('xp-earned', { detail: { source: 'mission' } }));
          }
        } else {
          console.error('Failed to save mission result to database');
        }
      } catch (e) {
        console.error('Failed to save mission result:', e);
      }
    }

    // Also save to localStorage for offline access
    if (mission) {
      try {
        const storageKey = 'ft_completed_missions';
        const completedMissions = JSON.parse(localStorage.getItem(storageKey) || '[]');
        if (!completedMissions.includes(mission.id)) {
          completedMissions.push(mission.id);
          localStorage.setItem(storageKey, JSON.stringify(completedMissions));
        }

        const gradesKey = 'ft_mission_grades';
        const grades = JSON.parse(localStorage.getItem(gradesKey) || '{}');
        const gradeOrder = { 'S': 5, 'A': 4, 'B': 3, 'C': 2, 'F': 1 };
        const existingGrade = grades[mission.id];
        
        if (!existingGrade || gradeOrder[data.grade] > gradeOrder[existingGrade.grade as keyof typeof gradeOrder]) {
          grades[mission.id] = { 
            grade: data.grade, 
            returnPercent: data.returnPercent,
            maxDrawdown: data.maxDrawdown,
            difficulty,
            completedAt: new Date().toISOString(),
            attempts: (existingGrade?.attempts || 0) + 1
          };
        } else {
          grades[mission.id] = { 
            ...existingGrade,
            attempts: (existingGrade?.attempts || 0) + 1
          };
        }
        localStorage.setItem(gradesKey, JSON.stringify(grades));
        
        // Also save trades to localStorage for the debrief page
        const tradesKey = 'ft_mission_trades';
        const existingTrades = JSON.parse(localStorage.getItem(tradesKey) || '[]');
        const newTrades = data.trades.map((trade, index) => ({
          id: `${mission.id}-${Date.now()}-${index}`,
          symbol: trade.symbol,
          action: trade.action,
          price: trade.price,
          quantity: trade.quantity,
          timestamp: trade.timestamp || new Date().toISOString(),
          missionId: mission.id,
          missionTitle: mission.title,
          day: trade.day,
        }));
        const allTrades = [...newTrades, ...existingTrades].slice(0, 100); // Keep last 100 trades
        localStorage.setItem(tradesKey, JSON.stringify(allTrades));
      } catch (e) {
        console.error('Failed to save mission completion to localStorage', e);
      }
    }
    
    setPhase('debrief');
  }, [mission, user, difficulty]);

  const handlePlayAgain = () => {
    setCompletionData(null);
    setPhase('prebuild');
    if (mission) {
      setCashBalance(mission.sandboxConfig.startingBalance);
    }
    setHoldings({});
  };

  const handleMissionChange = (missionId: string) => {
    const newMission = getMissionById(missionId);
    if (newMission) {
      setMission(newMission);
      setCashBalance(newMission.sandboxConfig.startingBalance);
      setHoldings({});
      // Update URL without full page reload
      router.replace(`/missions/simulation?missionId=${missionId}&difficulty=${difficulty}`);
    }
  };

  const handleNextMission = () => {
    // TODO: Navigate to next mission in sequence
    router.push('/missions');
  };

  const handleExit = () => {
    router.push('/missions');
  };

  if (isLoading || isAuthLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-stone-950 via-stone-900 to-stone-950">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-amber-500" />
          <p className="text-stone-400">Loading mission...</p>
        </div>
      </div>
    );
  }

  if (!mission) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-stone-950 via-stone-900 to-stone-950">
        <div className="text-center">
          <p className="text-stone-400">Mission not found</p>
          <button 
            onClick={() => router.push('/missions')}
            className="mt-4 px-4 py-2 bg-amber-600 text-white hover:bg-amber-500 transition-colors"
          >
            Back to Missions
          </button>
        </div>
      </div>
    );
  }

  // Render based on current phase
  if (phase === 'prebuild') {
    return (
      <MissionPreBuild
        mission={mission}
        difficulty={difficulty}
        onDifficultyChange={setDifficulty}
        onMissionChange={handleMissionChange}
        onStartSimulation={handleStartSimulation}
        onExit={handleExit}
      />
    );
  }

  if (phase === 'debrief' && completionData) {
    return (
      <MissionDebrief
        mission={mission}
        grade={completionData.grade}
        returnPercent={completionData.returnPercent}
        maxDrawdown={completionData.maxDrawdown}
        trades={completionData.trades}
        portfolioHistory={completionData.portfolioHistory}
        initialBalance={completionData.initialBalance}
        finalBalance={completionData.finalBalance}
        durationDays={completionData.durationDays}
        onPlayAgain={handlePlayAgain}
        onNextMission={completionData.grade !== 'F' ? handleNextMission : undefined}
      />
    );
  }

  return (
    <MissionSimulatorV2
      mission={mission}
      initialHoldings={holdings}
      initialCash={cashBalance}
      difficulty={difficulty}
      onComplete={handleComplete}
      onExit={handleExit}
    />
  );
}

export default function MissionSimulationPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-stone-950 via-stone-900 to-stone-950">
        <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
      </div>
    }>
      <MissionSimulationContent />
    </Suspense>
  );
}
