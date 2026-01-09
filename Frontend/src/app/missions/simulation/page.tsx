'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useAuth } from '@/providers/AuthProvider';
import { getMissionById, Mission } from '@/data/missions';
import { MissionPreBuild } from '@/components/missions/MissionPreBuild';
import { MissionSimulatorV2 } from '@/components/missions/MissionSimulatorV2';
import { Loader2 } from 'lucide-react';

type Phase = 'prebuild' | 'simulation' | 'complete';

function MissionSimulationContent() {
  const { user, isLoading: isAuthLoading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [mission, setMission] = useState<Mission | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [phase, setPhase] = useState<Phase>('prebuild');
  
  // Portfolio state that carries between phases
  const [holdings, setHoldings] = useState<Record<string, { quantity: number; avgPrice: number }>>({});
  const [cashBalance, setCashBalance] = useState(0);

  useEffect(() => {
    // Redirect if not authenticated
    if (!isAuthLoading && !user) {
      router.replace('/auth?redirect=/missions/simulation');
      return;
    }

    // Load mission from query params
    const missionId = searchParams?.get('missionId');
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

  const handleComplete = (
    grade: 'S' | 'A' | 'B' | 'C' | 'F', 
    stats: { returnPercent: number; maxDrawdown: number }
  ) => {
    // Save completion to localStorage
    if (mission) {
      try {
        const storageKey = 'ft_completed_missions';
        const completedMissions = JSON.parse(localStorage.getItem(storageKey) || '[]');
        if (!completedMissions.includes(mission.id)) {
          completedMissions.push(mission.id);
          localStorage.setItem(storageKey, JSON.stringify(completedMissions));
        }

        // Save grade
        const gradesKey = 'ft_mission_grades';
        const grades = JSON.parse(localStorage.getItem(gradesKey) || '{}');
        
        // Only update if new grade is better or first attempt
        const existingGrade = grades[mission.id];
        const gradeOrder = { 'S': 5, 'A': 4, 'B': 3, 'C': 2, 'F': 1 };
        if (!existingGrade || gradeOrder[grade] > gradeOrder[existingGrade.grade as keyof typeof gradeOrder]) {
          grades[mission.id] = { 
            grade, 
            ...stats, 
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
      } catch (e) {
        console.error('Failed to save mission completion', e);
      }
    }
    setPhase('complete');
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
        onStartSimulation={handleStartSimulation}
        onExit={handleExit}
      />
    );
  }

  return (
    <MissionSimulatorV2
      mission={mission}
      initialHoldings={holdings}
      initialCash={cashBalance}
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
