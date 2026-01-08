'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Mission, getUnlockedMissions } from '@/data/missions';

const STORAGE_KEY = 'ft_completed_missions';

function getDifficultyLabel(difficulty: Mission['difficulty']): string {
    const labels = {
        beginner: 'ENTRY LEVEL',
        intermediate: 'INTERMEDIATE',
        advanced: 'ADVANCED',
        expert: 'EXPERT CLASS',
    };
    return labels[difficulty];
}

function getCategoryLabel(category: Mission['category']): string {
    const labels = {
        fundamentals: 'FUNDAMENTALS',
        macro: 'MACROECONOMICS',
        events: 'MARKET EVENTS',
        psychology: 'INVESTOR PSYCHOLOGY',
    };
    return labels[category];
}

export default function MissionsPage() {
    const router = useRouter();
    const [completedMissions, setCompletedMissions] = useState<string[]>([]);
    const [selectedCategory, setSelectedCategory] = useState<string>('all');

    useEffect(() => {
        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            if (stored) {
                setCompletedMissions(JSON.parse(stored));
            }
        } catch (e) {
            console.error('Failed to load mission progress', e);
        }
    }, []);

    const missionList = getUnlockedMissions(completedMissions);

    const filteredMissions =
        selectedCategory === 'all'
            ? missionList
            : missionList.filter((m) => m.category === selectedCategory);

    const categories = ['all', 'fundamentals', 'macro', 'events', 'psychology'];

    const launchMission = (mission: Mission) => {
        if (!mission.isUnlocked) return;
        router.push(
            `/enviro/enviro-dashboard?missionId=${encodeURIComponent(mission.id)}`
        );
    };

    const completedCount = missionList.filter((m) => m.isCompleted).length;
    const totalCount = missionList.length;

    // Get today's date formatted like a newspaper
    const today = new Date();
    const dateString = today.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
    });

    // Featured mission (first unlocked, not completed)
    const featuredMission = missionList.find((m) => m.isUnlocked && !m.isCompleted);

    return (
        <div className="min-h-screen bg-stone-50">
            <main className="max-w-6xl mx-auto px-4 py-8">
                {/* Newspaper Masthead */}
                <header className="text-center border-b-4 border-double border-black pb-4 mb-6">
                    <p className="text-xs tracking-widest text-stone-500 uppercase mb-2">
                        {dateString}
                    </p>
                    <h1 className="font-serif text-5xl md:text-6xl font-black tracking-tight text-black">
                        The Mission Chronicle
                    </h1>
                    <p className="text-sm font-serif italic text-stone-600 mt-2">
                        &ldquo;All the Scenarios Fit to Trade&rdquo;
                    </p>
                    <div className="flex justify-center gap-8 mt-4 text-xs uppercase tracking-wide text-stone-500">
                        <span>Vol. I, No. {totalCount}</span>
                        <span>|</span>
                        <span>{completedCount} Completed</span>
                        <span>|</span>
                        <span>{totalCount - completedCount} Remaining</span>
                    </div>
                </header>

                {/* Section Navigation */}
                <nav className="border-b border-stone-300 mb-8">
                    <div className="flex justify-center gap-6 py-3">
                        {categories.map((cat) => (
                            <button
                                key={cat}
                                onClick={() => setSelectedCategory(cat)}
                                className={`text-xs uppercase tracking-widest font-medium transition-colors ${selectedCategory === cat
                                    ? 'text-black border-b-2 border-black pb-1'
                                    : 'text-stone-400 hover:text-stone-600'
                                    }`}
                            >
                                {cat === 'all' ? 'All Sections' : cat}
                            </button>
                        ))}
                    </div>
                </nav>

                {/* Featured Story */}
                {featuredMission && selectedCategory === 'all' && (
                    <article className="mb-10 pb-8 border-b border-stone-200">
                        <div className="grid md:grid-cols-2 gap-8">
                            <div>
                                <p className="text-xs uppercase tracking-widest text-stone-500 mb-2">
                                    Featured Story
                                </p>
                                <h2 className="font-serif text-4xl font-bold text-black leading-tight mb-3">
                                    {featuredMission.title}
                                </h2>
                                <p className="font-serif text-lg text-stone-600 italic mb-4">
                                    {featuredMission.subtitle}
                                </p>
                                <p className="text-stone-700 leading-relaxed mb-4">
                                    {featuredMission.description}
                                </p>
                                <div className="flex items-center gap-4 text-xs text-stone-500 mb-4">
                                    <span className="uppercase tracking-wide">
                                        {getCategoryLabel(featuredMission.category)}
                                    </span>
                                    <span>|</span>
                                    <span>{getDifficultyLabel(featuredMission.difficulty)}</span>
                                    <span>|</span>
                                    <span>{featuredMission.estimatedTime}</span>
                                </div>
                                <button
                                    onClick={() => launchMission(featuredMission)}
                                    className="bg-black text-white px-6 py-3 text-sm uppercase tracking-widest font-medium hover:bg-stone-800 transition-colors"
                                >
                                    Begin This Mission
                                </button>
                            </div>
                            <div className="bg-stone-100 p-6">
                                <h4 className="text-xs uppercase tracking-widest text-stone-500 mb-3">
                                    Mission Objectives
                                </h4>
                                <ul className="space-y-2">
                                    {featuredMission.objectives.map((obj, i) => (
                                        <li key={i} className="flex items-start gap-2 text-sm text-stone-700">
                                            <span className="text-stone-400 font-serif">{i + 1}.</span>
                                            <span>{obj}</span>
                                        </li>
                                    ))}
                                </ul>
                                <h4 className="text-xs uppercase tracking-widest text-stone-500 mt-6 mb-3">
                                    What You Will Learn
                                </h4>
                                <ul className="space-y-1">
                                    {featuredMission.learningOutcomes.map((outcome, i) => (
                                        <li key={i} className="text-sm text-stone-600">
                                            — {outcome}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                    </article>
                )}

                {/* Mission Articles Grid */}
                <section>
                    <div className="grid md:grid-cols-3 gap-6">
                        {filteredMissions
                            .filter((m) => selectedCategory !== 'all' || m.id !== featuredMission?.id)
                            .map((mission) => (
                                <article
                                    key={mission.id}
                                    className={`border-b border-stone-200 pb-6 ${!mission.isUnlocked ? 'opacity-50' : ''
                                        }`}
                                >
                                    <p className="text-xs uppercase tracking-widest text-stone-400 mb-2">
                                        {getCategoryLabel(mission.category)}
                                    </p>
                                    <h3 className="font-serif text-xl font-bold text-black mb-2 leading-snug">
                                        {mission.title}
                                    </h3>
                                    <p className="font-serif text-sm text-stone-500 italic mb-3">
                                        {mission.subtitle}
                                    </p>
                                    <p className="text-sm text-stone-600 line-clamp-3 mb-4">
                                        {mission.description}
                                    </p>
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs text-stone-400">
                                            {getDifficultyLabel(mission.difficulty)}
                                        </span>
                                        {mission.isCompleted ? (
                                            <span className="text-xs uppercase tracking-wide text-stone-500">
                                                Completed
                                            </span>
                                        ) : mission.isUnlocked ? (
                                            <button
                                                onClick={() => launchMission(mission)}
                                                className="text-xs uppercase tracking-widest font-medium text-black hover:underline"
                                            >
                                                Read & Begin →
                                            </button>
                                        ) : (
                                            <span className="text-xs text-stone-400 italic">
                                                Prerequisites Required
                                            </span>
                                        )}
                                    </div>
                                </article>
                            ))}
                    </div>
                </section>

                {filteredMissions.length === 0 && (
                    <div className="text-center py-12">
                        <p className="font-serif text-stone-500 italic">
                            No articles found in this section.
                        </p>
                    </div>
                )}
            </main>
        </div>
    );
}
