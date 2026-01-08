'use client';

import React, { useState, useEffect } from 'react';
import { archetypes, getArchetypeById, InvestorArchetype } from '@/data/archetypes';
import { ranks, getXPProgress } from '@/data/ranks';

const STORAGE_KEY_XP = 'ft_user_xp';
const STORAGE_KEY_ARCHETYPE = 'ft_user_archetype';
const STORAGE_KEY_ACHIEVEMENTS = 'ft_user_achievements';

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

export default function AchievementsPage() {
    const [xp, setXP] = useState(0);
    const [archetype, setArchetype] = useState<InvestorArchetype | null>(null);
    const [earnedAchievements, setEarnedAchievements] = useState<string[]>([]);

    // Get today's date
    const today = new Date();
    const dateString = today.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
    });

    useEffect(() => {
        try {
            const storedXP = localStorage.getItem(STORAGE_KEY_XP);
            if (storedXP) setXP(parseInt(storedXP, 10));

            const storedArchetype = localStorage.getItem(STORAGE_KEY_ARCHETYPE);
            if (storedArchetype) {
                const found = getArchetypeById(storedArchetype);
                if (found) setArchetype(found);
            }

            const storedAchievements = localStorage.getItem(STORAGE_KEY_ACHIEVEMENTS);
            if (storedAchievements) {
                setEarnedAchievements(JSON.parse(storedAchievements));
            }
        } catch (e) {
            console.error('Failed to load achievements data', e);
        }
    }, []);

    const { current: currentRank, next: nextRank, progress } = getXPProgress(xp);
    const displayArchetype = archetype || archetypes[0];

    return (
        <div className="min-h-screen bg-stone-50 dark:bg-stone-900">
            <main className="max-w-6xl mx-auto px-4 py-8">
                {/* Masthead */}
                <header className="text-center border-b-4 border-double border-black dark:border-stone-600 pb-4 mb-8">
                    <p className="text-xs tracking-widest text-stone-500 dark:text-stone-400 uppercase mb-2">
                        {dateString}
                    </p>
                    <h1 className="font-serif text-5xl font-black tracking-tight text-black dark:text-white">
                        The Investor&apos;s Record
                    </h1>
                    <p className="text-sm font-serif italic text-stone-600 dark:text-stone-400 mt-2">
                        &ldquo;A Chronicle of Progress & Achievement&rdquo;
                    </p>
                </header>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Profile Column */}
                    <div className="lg:col-span-1 space-y-6">
                        {/* Investor Profile Card */}
                        <article className="border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 p-6">
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
                        <article className="border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 p-6">
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
                        <article className="border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 p-6">
                            <div className="flex items-start justify-between mb-6">
                                <div>
                                    <h2 className="text-xs uppercase tracking-widest text-stone-500 dark:text-stone-400 mb-2">
                                        Current Standing
                                    </h2>
                                    <p className="font-serif text-3xl font-black text-black dark:text-white">
                                        {currentRank.title}
                                    </p>
                                    <p className="text-sm text-stone-500 dark:text-stone-400">Level {currentRank.level}</p>
                                </div>
                                <div className="text-right">
                                    <p className="font-serif text-2xl font-bold text-black dark:text-white">
                                        {xp.toLocaleString()}
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
                                        <span>{progress}%</span>
                                    </div>
                                    <div className="w-full bg-stone-200 dark:bg-stone-700 h-2">
                                        <div
                                            className="bg-black dark:bg-green-500 h-2 transition-all"
                                            style={{ width: `${progress}%` }}
                                        />
                                    </div>
                                    <p className="text-xs text-stone-400 mt-2">
                                        {(nextRank.requiredXP - xp).toLocaleString()} XP required for advancement
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
                        <article className="border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 p-6">
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
                        <article className="border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 p-6">
                            <div className="flex items-center justify-between mb-4 border-b border-stone-200 dark:border-stone-700 pb-2">
                                <h2 className="text-xs uppercase tracking-widest text-stone-500 dark:text-stone-400">
                                    Distinctions & Honors
                                </h2>
                                <span className="text-xs text-stone-400">
                                    {earnedAchievements.length} of {AVAILABLE_ACHIEVEMENTS.length}
                                </span>
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                {AVAILABLE_ACHIEVEMENTS.map((achievement) => {
                                    const isEarned = earnedAchievements.includes(achievement.id);
                                    return (
                                        <div
                                            key={achievement.id}
                                            className={`p-4 border ${isEarned
                                                ? 'border-stone-400 dark:border-stone-500 bg-stone-50 dark:bg-stone-700'
                                                : 'border-stone-200 dark:border-stone-700 opacity-50'
                                                }`}
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
