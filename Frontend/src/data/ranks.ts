/**
 * Knowledge Rank progression system
 * Players level up by completing modules and missions
 */

export interface KnowledgeRank {
    id: string;
    level: number;
    title: string;
    description: string;
    requiredXP: number;
    icon: string;
    color: string;
    perks: string[];
}

export const ranks: KnowledgeRank[] = [
    {
        id: 'novice',
        level: 1,
        title: 'Novice',
        description: 'Just starting your investment journey. Every expert was once a beginner.',
        requiredXP: 0,
        icon: '🌱',
        color: '#6b7280',
        perks: ['Access to beginner missions', 'AI Coach guidance'],
    },
    {
        id: 'apprentice',
        level: 2,
        title: 'Apprentice',
        description: 'You understand the basics and are ready to learn more advanced concepts.',
        requiredXP: 500,
        icon: '📚',
        color: '#22c55e',
        perks: ['Unlock intermediate missions', 'Portfolio analysis tools'],
    },
    {
        id: 'analyst',
        level: 3,
        title: 'Analyst',
        description: 'You can analyze markets and make informed decisions. Keep growing!',
        requiredXP: 1500,
        icon: '📊',
        color: '#3b82f6',
        perks: ['Unlock advanced missions', 'Deeper market insights'],
    },
    {
        id: 'strategist',
        level: 4,
        title: 'Strategist',
        description: 'You think in systems and can build sophisticated investment strategies.',
        requiredXP: 3500,
        icon: '🎯',
        color: '#8b5cf6',
        perks: ['Unlock expert missions', 'Strategy backtesting'],
    },
    {
        id: 'manager',
        level: 5,
        title: 'Portfolio Manager',
        description: 'You could manage money professionally. Your skills are institutional grade.',
        requiredXP: 7000,
        icon: '💼',
        color: '#f59e0b',
        perks: ['All missions unlocked', 'Advanced simulations'],
    },
    {
        id: 'master',
        level: 6,
        title: 'Market Master',
        description: 'Like Jamie Dimon, you understand markets at the deepest level. Legendary status.',
        requiredXP: 15000,
        icon: '👑',
        color: '#eab308',
        perks: ['Custom mission creation', 'Mentor mode access'],
    },
];

export interface XPEvent {
    type: 'module_complete' | 'mission_complete' | 'trade_success' | 'streak_bonus';
    xpAmount: number;
}

export const XP_VALUES: Record<string, number> = {
    module_complete: 100,
    mission_complete_beginner: 150,
    mission_complete_intermediate: 250,
    mission_complete_advanced: 400,
    mission_complete_expert: 600,
    mission_grade_S: 100, // bonus
    mission_grade_A: 50,  // bonus
    trade_profitable: 10,
    streak_3day: 50,
    streak_7day: 150,
    streak_30day: 500,
};

export function getRankForXP(xp: number): KnowledgeRank {
    const sortedRanks = [...ranks].sort((a, b) => b.requiredXP - a.requiredXP);
    for (const rank of sortedRanks) {
        if (xp >= rank.requiredXP) {
            return rank;
        }
    }
    return ranks[0];
}

export function getNextRank(currentRank: KnowledgeRank): KnowledgeRank | null {
    const nextLevel = currentRank.level + 1;
    return ranks.find((r) => r.level === nextLevel) || null;
}

export function getXPProgress(xp: number): { current: KnowledgeRank; next: KnowledgeRank | null; progress: number } {
    const current = getRankForXP(xp);
    const next = getNextRank(current);

    if (!next) {
        return { current, next: null, progress: 100 };
    }

    const xpInCurrentLevel = xp - current.requiredXP;
    const xpNeededForNext = next.requiredXP - current.requiredXP;
    const progress = Math.min(100, Math.round((xpInCurrentLevel / xpNeededForNext) * 100));

    return { current, next, progress };
}
