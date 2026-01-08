/**
 * Investor Archetypes for gamification
 * Based on trading behavior patterns in the sandbox
 */

export interface InvestorArchetype {
    id: string;
    name: string;
    title: string;
    description: string;
    traits: string[];
    strengths: string[];
    watchOuts: string[];
    icon: string;
    color: string;
}

export const archetypes: InvestorArchetype[] = [
    {
        id: 'value-veronica',
        name: 'Value Veronica',
        title: 'The Patient Investor',
        description: 'You seek undervalued gems and wait for the market to recognize their worth. Your patience is your superpower.',
        traits: ['Long holding periods', 'Focuses on fundamentals', 'Low trading frequency'],
        strengths: ['Avoids FOMO', 'Strong analytical skills', 'Emotional discipline'],
        watchOuts: ['May miss momentum plays', 'Could hold losers too long'],
        icon: '📊',
        color: '#2563eb',
    },
    {
        id: 'risky-randy',
        name: 'Risky Randy',
        title: 'The Bold Trader',
        description: 'You chase high returns and embrace volatility. Big risks can mean big rewards—or big lessons.',
        traits: ['High volatility tolerance', 'Frequent trading', 'Concentrates positions'],
        strengths: ['Captures momentum', 'Quick decision making', 'High upside potential'],
        watchOuts: ['Prone to overtrading', 'May ignore fundamentals', 'Risk of large drawdowns'],
        icon: '🎲',
        color: '#dc2626',
    },
    {
        id: 'saver-steve',
        name: 'Saver Steve',
        title: 'The Steady Builder',
        description: 'You prioritize capital preservation and steady growth. Slow and steady wins the race.',
        traits: ['Low risk tolerance', 'Prefers dividends', 'Highly diversified'],
        strengths: ['Capital preservation', 'Consistent returns', 'Low stress'],
        watchOuts: ['May underperform in bull markets', 'Could be too conservative'],
        icon: '🏦',
        color: '#16a34a',
    },
    {
        id: 'trend-tina',
        name: 'Trend Tina',
        title: 'The Momentum Rider',
        description: 'You follow market trends and let winners run. Technical analysis is your compass.',
        traits: ['Follows momentum', 'Uses technical indicators', 'Medium trading frequency'],
        strengths: ['Catches big moves', 'Good timing skills', 'Flexible approach'],
        watchOuts: ['Late entries in crowded trades', 'Whipsawed in choppy markets'],
        icon: '📈',
        color: '#9333ea',
    },
    {
        id: 'news-nina',
        name: 'News Nina',
        title: 'The Information Seeker',
        description: 'You trade on news and events. Information is your edge in the market.',
        traits: ['Event-driven trading', 'Monitors headlines constantly', 'Quick reaction time'],
        strengths: ['First-mover advantage', 'Current awareness', 'Opportunistic'],
        watchOuts: ['May overreact to noise', 'Information overload risk'],
        icon: '📰',
        color: '#ea580c',
    },
];

export interface ArchetypeScore {
    archetypeId: string;
    score: number;
}

/**
 * Determine the dominant archetype based on trading behavior
 */
export function determineArchetype(
    avgHoldingDays: number,
    tradeFrequency: number,
    volatilityTolerance: number,
    diversificationScore: number,
    newsReactivity: number
): InvestorArchetype {
    const scores: ArchetypeScore[] = [
        {
            archetypeId: 'value-veronica',
            score: avgHoldingDays * 2 + (100 - tradeFrequency) + diversificationScore,
        },
        {
            archetypeId: 'risky-randy',
            score: volatilityTolerance * 2 + tradeFrequency + (100 - diversificationScore),
        },
        {
            archetypeId: 'saver-steve',
            score: (100 - volatilityTolerance) * 2 + diversificationScore + (100 - tradeFrequency),
        },
        {
            archetypeId: 'trend-tina',
            score: tradeFrequency + volatilityTolerance + (100 - avgHoldingDays),
        },
        {
            archetypeId: 'news-nina',
            score: newsReactivity * 3 + tradeFrequency,
        },
    ];

    scores.sort((a, b) => b.score - a.score);
    const winner = archetypes.find((a) => a.id === scores[0].archetypeId);
    return winner || archetypes[0];
}

export function getArchetypeById(id: string): InvestorArchetype | undefined {
    return archetypes.find((a) => a.id === id);
}
