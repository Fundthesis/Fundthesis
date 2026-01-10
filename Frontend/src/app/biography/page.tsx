'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/providers/AuthProvider';
import { archetypes, getArchetypeById } from '@/data/archetypes';
import { ranks } from '@/data/ranks';
import { useBiography } from '@/lib/hooks/useBiography';

interface Achievement {
    id: string;
    title: string;
    description: string;
    earnedAt?: string;
}

const AVAILABLE_ACHIEVEMENTS: Achievement[] = [
    { id: 'first-trade', title: 'First Trade', description: 'Complete your first trade in the sandbox' },
    { id: 'diversified', title: 'Diversified Portfolio', description: 'Hold stocks in 5+ different sectors' },
    { id: 'profit-100', title: 'Century Club', description: 'Earn $100 in virtual profits' },
    { id: 'module-master', title: 'Module Scholar', description: 'Complete all learning modules' },
    { id: 'mission-1', title: 'First Assignment', description: 'Complete your first mission' },
    { id: 'mission-5', title: 'Field Correspondent', description: 'Complete 5 missions' },
    { id: 'mission-all', title: 'Senior Editor', description: 'Complete all missions' },
    { id: 'streak-7', title: 'Weekly Subscriber', description: 'Learn for 7 consecutive days' },
    { id: 'streak-30', title: 'Monthly Reader', description: 'Learn for 30 consecutive days' },
    { id: 'no-loss', title: 'Clean Record', description: 'Complete a mission with no losses' },
    { id: 'grade-s', title: 'Exemplary Work', description: 'Earn top marks on any mission' },
    { id: 'mentor-chat', title: 'Inquisitive Mind', description: 'Submit 10 questions to the editor' },
];

// Easing function for smooth animations
function easeOutCubic(t: number): number {
    return 1 - Math.pow(1 - t, 3);
}

// Count-up animation hook
function useCountUp(targetValue: number, duration: number = 2000, enabled: boolean = true) {
    const [currentValue, setCurrentValue] = useState(0);
    const animationFrameRef = useRef<number | undefined>(undefined);
    const startTimeRef = useRef<number | undefined>(undefined);
    const startValueRef = useRef(0);

    useEffect(() => {
        if (!enabled || targetValue === 0) {
            setCurrentValue(0);
            return;
        }

        startValueRef.current = currentValue;
        startTimeRef.current = undefined;

        const animate = (timestamp: number) => {
            if (!startTimeRef.current) {
                startTimeRef.current = timestamp;
            }

            const elapsed = timestamp - startTimeRef.current;
            const progress = Math.min(elapsed / duration, 1);
            const easedProgress = easeOutCubic(progress);
            
            const newValue = Math.floor(startValueRef.current + (targetValue - startValueRef.current) * easedProgress);
            setCurrentValue(newValue);

            if (progress < 1) {
                animationFrameRef.current = requestAnimationFrame(animate);
            } else {
                setCurrentValue(targetValue);
            }
        };

        animationFrameRef.current = requestAnimationFrame(animate);

        return () => {
            if (animationFrameRef.current) {
                cancelAnimationFrame(animationFrameRef.current);
            }
        };
    }, [targetValue, duration, enabled]);

    return currentValue;
}

export default function BiographyPage() {
    const { user, isLoading: isAuthLoading } = useAuth();
    const router = useRouter();
    const { data: biographyData, isLoading: isBiographyLoading, error: biographyError } = useBiography();
    
    // Animation state
    const [isAnimating, setIsAnimating] = useState(false);
    const [animatedProgress, setAnimatedProgress] = useState(0);
    
    // Extract data from biography API response
    const xp = biographyData?.xp || 0;
    const archetypeId = biographyData?.archetype || 'value-veronica';
    const earnedAchievements = biographyData?.achievements || [];
    const currentRank = biographyData?.rank ? ranks.find(r => r.level === biographyData.rank.level) || ranks[0] : ranks[0];
    const nextRank = biographyData?.nextRank ? ranks.find(r => r.level === biographyData.nextRank!.level) || null : null;
    const progress = biographyData?.progress || 0;
    const displayArchetype = getArchetypeById(archetypeId) || archetypes[0];

    // Animated values
    const animatedXP = useCountUp(xp, 1800, isAnimating);
    const animatedProgressPercent = useCountUp(progress, 1800, isAnimating);

    React.useEffect(() => {
        if (!isAuthLoading && !user) {
            router.replace('/auth');
        }
    }, [isAuthLoading, user, router]);

    // Trigger animations when data loads
    useEffect(() => {
        if (biographyData && !isBiographyLoading) {
            setIsAnimating(false);
            setAnimatedProgress(0);
            
            // Small delay to ensure DOM is ready
            const timer = setTimeout(() => {
                setIsAnimating(true);
                setAnimatedProgress(progress);
            }, 100);

            return () => clearTimeout(timer);
        }
    }, [biographyData, isBiographyLoading, progress]);

    // Get today's date
    const today = new Date();
    const dateString = today.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
    });

    // Loading state
    if (isAuthLoading || isBiographyLoading) {
        return (
            <div className="min-h-screen bg-stone-50 dark:bg-stone-900 flex items-center justify-center">
                <p className="text-stone-600 dark:text-stone-400">Loading biography...</p>
            </div>
        );
    }

    // Error state
    if (biographyError) {
        return (
            <div className="min-h-screen bg-stone-50 dark:bg-stone-900 flex items-center justify-center">
                <p className="text-red-600 dark:text-red-400">Failed to load biography data. Please try again later.</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-stone-50 dark:bg-stone-900">
            <main className="max-w-6xl mx-auto px-4 py-8">
                {/* Masthead */}
                <header className="text-center border-b-4 border-double border-black dark:border-stone-600 pb-4 mb-8">
                    <p className="text-xs tracking-widest text-stone-500 dark:text-stone-400 uppercase mb-2">
                        {dateString}
                    </p>
                    <h1 className="font-serif text-5xl font-black tracking-tight text-black dark:text-white">
                        The Investor&apos;s Biography
                    </h1>
                    <p className="text-sm font-serif italic text-stone-600 dark:text-stone-400 mt-2">
                        &ldquo;A Chronicle of Your Investment Journey&rdquo;
                    </p>
                </header>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Profile Column */}
                    <div className="lg:col-span-1 space-y-6">
                        {/* Investor Profile Card */}
                        <article className="border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 p-6 opacity-0 translate-y-4 animate-fade-in-up" style={{ animationDelay: '100ms', animationFillMode: 'forwards' }}>
                            <h2 className="text-xs uppercase tracking-widest text-stone-500 dark:text-stone-400 mb-4 border-b border-stone-200 dark:border-stone-700 pb-2">
                                Investor Profile
                            </h2>
                            <div className="text-center mb-6">
                                <p className="font-serif text-3xl font-black text-black dark:text-white mb-1">
                                    {displayArchetype.name.replace(/[^\w\s]/g, '')}
                                </p>
                                <p className="text-sm text-stone-500 dark:text-stone-400 italic">
                                    {displayArchetype.title}
                                </p>
                            </div>
                            <p className="font-serif text-sm text-stone-600 dark:text-stone-400 leading-relaxed mb-6">
                                {displayArchetype.description}
                            </p>

                            <div className="space-y-4">
                                <div>
                                    <h4 className="text-xs uppercase tracking-widest text-stone-400 mb-2">
                                        Noted Strengths
                                    </h4>
                                    <ul className="space-y-1">
                                        {displayArchetype.strengths.map((s, i) => (
                                            <li key={i} className="text-sm text-stone-600 dark:text-stone-400">
                                                — {s}
                                            </li>
                                        ))}
                                    </ul>
                                </div>

                                <div>
                                    <h4 className="text-xs uppercase tracking-widest text-stone-400 mb-2">
                                        Areas of Caution
                                    </h4>
                                    <ul className="space-y-1">
                                        {displayArchetype.watchOuts.map((w, i) => (
                                            <li key={i} className="text-sm text-stone-500 dark:text-stone-500 italic">
                                                — {w}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            </div>
                        </article>

                        {/* Other Profiles */}
                        <article className="border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 p-6 opacity-0 translate-y-4 animate-fade-in-up" style={{ animationDelay: '200ms', animationFillMode: 'forwards' }}>
                            <h2 className="text-xs uppercase tracking-widest text-stone-500 dark:text-stone-400 mb-4 border-b border-stone-200 dark:border-stone-700 pb-2">
                                Investor Archetypes
                            </h2>
                            <div className="space-y-3">
                                {archetypes.map((a) => (
                                    <div
                                        key={a.id}
                                        className={`p-3 ${a.id === displayArchetype.id
                                            ? 'bg-stone-100 dark:bg-stone-700 border-l-2 border-black dark:border-green-500'
                                            : 'opacity-60'
                                            }`}
                                    >
                                        <p className="font-serif font-bold text-sm text-black dark:text-white">
                                            {a.name.replace(/[^\w\s]/g, '')}
                                        </p>
                                        <p className="text-xs text-stone-500 dark:text-stone-400">{a.title}</p>
                                    </div>
                                ))}
                            </div>
                        </article>
                    </div>

                    {/* Main Content */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* Rank Progress */}
                        <article className="border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 p-6 opacity-0 translate-y-4 animate-fade-in-up" style={{ animationDelay: '300ms', animationFillMode: 'forwards' }}>
                            <div className="flex items-start justify-between mb-6">
                                <div>
                                    <h2 className="text-xs uppercase tracking-widest text-stone-500 dark:text-stone-400 mb-2">
                                        Current Standing
                                    </h2>
                                    <p className="font-serif text-3xl font-black text-black dark:text-white opacity-0 animate-fade-in" style={{ animationDelay: '400ms', animationFillMode: 'forwards' }}>
                                        {currentRank.title}
                                    </p>
                                    <p className="text-sm text-stone-500 dark:text-stone-400">Level {currentRank.level}</p>
                                </div>
                                <div className="text-right">
                                    <p className="font-serif text-2xl font-bold text-black dark:text-white">
                                        {animatedXP.toLocaleString()}
                                    </p>
                                    <p className="text-xs uppercase tracking-widest text-stone-500 dark:text-stone-400">
                                        Total XP
                                    </p>
                                </div>
                            </div>

                            {nextRank && (
                                <div className="mb-6">
                                    <div className="flex items-center justify-between text-xs text-stone-500 dark:text-stone-400 mb-2">
                                        <span>Progress to {nextRank.title}</span>
                                        <span>{animatedProgressPercent}%</span>
                                    </div>
                                    <div className="w-full bg-stone-200 dark:bg-stone-700 h-2 overflow-hidden">
                                        <div
                                            className="bg-black dark:bg-green-500 h-2 transition-all duration-[1800ms] ease-out"
                                            style={{ width: `${animatedProgress}%`, willChange: 'width' }}
                                        />
                                    </div>
                                    <p className="text-xs text-stone-400 mt-2">
                                        {((nextRank.requiredXP || 0) - xp).toLocaleString()} XP required for advancement
                                    </p>
                                </div>
                            )}

                            <div>
                                <h4 className="text-xs uppercase tracking-widest text-stone-500 dark:text-stone-400 mb-3">
                                    Current Privileges
                                </h4>
                                <div className="flex flex-wrap gap-2">
                                    {currentRank.perks.map((perk, i) => (
                                        <span
                                            key={i}
                                            className="text-xs text-stone-600 dark:text-stone-300 border border-stone-300 dark:border-stone-600 px-3 py-1"
                                        >
                                            {perk}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        </article>

                        {/* Rank Ladder */}
                        <article className="border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 p-6 opacity-0 translate-y-4 animate-fade-in-up" style={{ animationDelay: '500ms', animationFillMode: 'forwards' }}>
                            <h2 className="text-xs uppercase tracking-widest text-stone-500 dark:text-stone-400 mb-4 border-b border-stone-200 dark:border-stone-700 pb-2">
                                The Advancement Ladder
                            </h2>
                            <div className="grid grid-cols-6 gap-2">
                                {ranks.map((rank) => (
                                    <div
                                        key={rank.id}
                                        className={`text-center p-3 ${rank.level <= currentRank.level
                                            ? 'bg-stone-100 dark:bg-stone-700'
                                            : 'opacity-40'
                                            }`}
                                    >
                                        <p className="font-serif text-xs font-bold text-black dark:text-white">
                                            {rank.title}
                                        </p>
                                        <p className="text-xs text-stone-400">Lvl {rank.level}</p>
                                    </div>
                                ))}
                            </div>
                        </article>

                        {/* Achievements */}
                        <article className="border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 p-6 opacity-0 translate-y-4 animate-fade-in-up" style={{ animationDelay: '700ms', animationFillMode: 'forwards' }}>
                            <div className="flex items-center justify-between mb-4 border-b border-stone-200 dark:border-stone-700 pb-2">
                                <h2 className="text-xs uppercase tracking-widest text-stone-500 dark:text-stone-400">
                                    Distinctions & Honors
                                </h2>
                                <span className="text-xs text-stone-400">
                                    {earnedAchievements.length} of {AVAILABLE_ACHIEVEMENTS.length}
                                </span>
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                {AVAILABLE_ACHIEVEMENTS.map((achievement, index) => {
                                    const isEarned = earnedAchievements.includes(achievement.id);
                                    return (
                                        <div
                                            key={achievement.id}
                                            className={`p-4 border opacity-0 scale-95 ${isEarned
                                                ? 'border-stone-400 dark:border-stone-500 bg-stone-50 dark:bg-stone-700 animate-fade-in-scale'
                                                : 'border-stone-200 dark:border-stone-700 animate-fade-in-scale-unearned'
                                                }`}
                                            style={{ 
                                                animationDelay: `${800 + index * 50}ms`, 
                                                animationFillMode: 'forwards'
                                            }}
                                        >
                                            <h4 className="font-serif font-bold text-sm text-black dark:text-white mb-1">
                                                {achievement.title}
                                            </h4>
                                            <p className="text-xs text-stone-500 dark:text-stone-400">
                                                {achievement.description}
                                            </p>
                                            {isEarned && (
                                                <p className="text-xs text-stone-400 mt-2 uppercase tracking-wide">
                                                    Earned
                                                </p>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </article>
                    </div>
                </div>
            </main>
        </div>
    );
}
