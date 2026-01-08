/**
 * Mission definitions for the Education Track
 * Each mission simulates a market scenario for hands-on learning
 */

export type MissionDifficulty = 'beginner' | 'intermediate' | 'advanced' | 'expert';
export type MissionCategory = 'fundamentals' | 'macro' | 'events' | 'psychology';

export interface Mission {
    id: string;
    title: string;
    subtitle: string;
    description: string;
    difficulty: MissionDifficulty;
    category: MissionCategory;
    objectives: string[];
    learningOutcomes: string[];
    estimatedTime: string;
    prerequisiteIds: string[];
    sandboxConfig: {
        startingBalance: number;
        scenario: string;
        marketCondition?: string;
    };
    isUnlocked?: boolean;
    isCompleted?: boolean;
    completionGrade?: 'S' | 'A' | 'B' | 'C' | 'F';
}

export const missions: Mission[] = [
    {
        id: 'building-portfolio',
        title: 'Building the Portfolio',
        subtitle: 'Your first steps as an investor',
        description: 'Construct a diversified portfolio from scratch. Focus on spreading risk across sectors and asset classes using ETFs for broad market exposure.',
        difficulty: 'beginner',
        category: 'fundamentals',
        objectives: [
            'Allocate virtual capital across at least 3 different sectors',
            'Include at least one ETF in your portfolio',
            'Achieve diversification score of 70% or higher',
        ],
        learningOutcomes: [
            'Understand diversification and its importance',
            'Learn the difference between stocks and ETFs',
            'Practice portfolio construction fundamentals',
        ],
        estimatedTime: '15-20 min',
        prerequisiteIds: [],
        sandboxConfig: {
            startingBalance: 50000,
            scenario: 'neutral',
        },
    },
    {
        id: 'inflation-spike',
        title: 'The Inflation Spike',
        subtitle: 'Protect your purchasing power',
        description: 'A 2% rise in inflation hits the economy. Restructure your portfolio to earn returns above the inflation rate and protect your virtual cash.',
        difficulty: 'intermediate',
        category: 'macro',
        objectives: [
            'Achieve portfolio returns above 2% (the inflation rate)',
            'Identify inflation-resistant assets',
            'Avoid assets that underperform during inflation',
        ],
        learningOutcomes: [
            'Understand how inflation affects investments',
            'Learn about TIPS, commodities, and real assets',
            'Practice defensive portfolio positioning',
        ],
        estimatedTime: '20-25 min',
        prerequisiteIds: ['building-portfolio'],
        sandboxConfig: {
            startingBalance: 50000,
            scenario: 'inflation',
            marketCondition: '+2% inflation spike',
        },
    },
    {
        id: 'interest-rate-cuts',
        title: 'Interest Rate Cuts',
        subtitle: 'The Fed makes a move',
        description: 'The Federal Reserve cuts rates by 25-50 basis points. Rebalance your portfolio to account for the inverse relationship between rates and bond prices.',
        difficulty: 'intermediate',
        category: 'macro',
        objectives: [
            'Reposition to benefit from rate cuts',
            'Understand bond price movements',
            'Balance equity and debt exposure',
        ],
        learningOutcomes: [
            'Learn the inverse relationship between rates and prices',
            'Understand Fed policy effects on markets',
            'Practice rate-sensitive portfolio management',
        ],
        estimatedTime: '20-25 min',
        prerequisiteIds: ['building-portfolio'],
        sandboxConfig: {
            startingBalance: 50000,
            scenario: 'rate-cut',
            marketCondition: '-25bps rate cut',
        },
    },
    {
        id: 'currency-devaluation',
        title: 'The Currency Devaluation',
        subtitle: 'When the dollar weakens',
        description: 'The US Dollar weakens significantly against foreign currencies. Evaluate how this benefits multinational corporations and international securities.',
        difficulty: 'advanced',
        category: 'macro',
        objectives: [
            'Identify stocks that benefit from weak dollar',
            'Increase international exposure strategically',
            'Hedge currency risk where appropriate',
        ],
        learningOutcomes: [
            'Understand currency effects on equities',
            'Learn about multinationals and forex exposure',
            'Practice global portfolio diversification',
        ],
        estimatedTime: '25-30 min',
        prerequisiteIds: ['inflation-spike', 'interest-rate-cuts'],
        sandboxConfig: {
            startingBalance: 75000,
            scenario: 'currency-weak',
            marketCondition: 'USD -10% vs basket',
        },
    },
    {
        id: 'tariff-wars',
        title: 'Tariff Wars',
        subtitle: 'Trade tensions escalate',
        description: 'The U.S. imposes a 50% tariff on Chinese electronics and components. Analyze your supply chain exposure and divest from companies heavily reliant on Chinese imports.',
        difficulty: 'advanced',
        category: 'events',
        objectives: [
            'Identify portfolio exposure to Chinese supply chains',
            'Divest from high-risk import-dependent stocks',
            'Reposition toward domestic manufacturers',
        ],
        learningOutcomes: [
            'Understand supply chain analysis',
            'Learn about trade policy effects',
            'Practice geopolitical risk management',
        ],
        estimatedTime: '25-30 min',
        prerequisiteIds: ['currency-devaluation'],
        sandboxConfig: {
            startingBalance: 75000,
            scenario: 'tariff',
            marketCondition: '50% China tariff',
        },
    },
    {
        id: 'merger-acquisition',
        title: 'Merger & Acquisition',
        subtitle: 'A surprise announcement',
        description: 'A large-cap company offers a 30% premium to acquire a mid-cap stock on your watchlist. Analyze the arbitrage potential and decide how to position.',
        difficulty: 'advanced',
        category: 'events',
        objectives: [
            'Calculate the merger arbitrage spread',
            'Assess deal completion probability',
            'Execute appropriate trade strategy',
        ],
        learningOutcomes: [
            'Understand M&A mechanics',
            'Learn about merger arbitrage',
            'Practice event-driven investing',
        ],
        estimatedTime: '20-25 min',
        prerequisiteIds: ['building-portfolio'],
        sandboxConfig: {
            startingBalance: 50000,
            scenario: 'merger',
            marketCondition: '30% premium offer',
        },
    },
    {
        id: 'hype-bubble',
        title: 'Hype Bubble?',
        subtitle: 'When FOMO meets fundamentals',
        description: 'Stocks mentioning "AI" see immediate 20% price jumps. Differentiate between companies with real cash flow and unsustainable business models before the bubble pops.',
        difficulty: 'advanced',
        category: 'psychology',
        objectives: [
            'Identify overvalued "hype" stocks',
            'Find companies with real fundamentals',
            'Position defensively before the correction',
        ],
        learningOutcomes: [
            'Recognize bubble characteristics',
            'Learn fundamental vs. speculative analysis',
            'Practice contrarian thinking',
        ],
        estimatedTime: '25-30 min',
        prerequisiteIds: ['building-portfolio'],
        sandboxConfig: {
            startingBalance: 50000,
            scenario: 'bubble',
            marketCondition: 'AI hype cycle',
        },
    },
    {
        id: 'pandemic-panicking',
        title: 'Pandemic Panicking',
        subtitle: 'Supply chain shock',
        description: 'A pandemic resurgence forces a 30-day lockdown in Taiwan semiconductor hubs. Analyze supply chain exposure and identify companies positioned to rebound.',
        difficulty: 'expert',
        category: 'events',
        objectives: [
            'Map semiconductor supply chain exposure',
            'Identify resilient and vulnerable positions',
            'Position for the recovery',
        ],
        learningOutcomes: [
            'Deep supply chain analysis',
            'Crisis response strategies',
            'Recovery positioning',
        ],
        estimatedTime: '30-35 min',
        prerequisiteIds: ['tariff-wars'],
        sandboxConfig: {
            startingBalance: 100000,
            scenario: 'pandemic',
            marketCondition: 'Taiwan fab lockdown',
        },
    },
    {
        id: 'market-crash-2008',
        title: 'Market Crash (2008 Sim)',
        subtitle: 'Surviving the financial crisis',
        description: 'Backtest your portfolio against the 2008 financial crisis. Navigate a 40-50% drawdown and identify opportunities in the wake of systemic collapse.',
        difficulty: 'expert',
        category: 'events',
        objectives: [
            'Minimize drawdown during the crash',
            'Identify buying opportunities at the bottom',
            'Avoid panic selling',
        ],
        learningOutcomes: [
            'Understand systemic risk',
            'Practice crisis management',
            'Learn to find opportunity in panic',
        ],
        estimatedTime: '35-40 min',
        prerequisiteIds: ['pandemic-panicking', 'hype-bubble'],
        sandboxConfig: {
            startingBalance: 100000,
            scenario: 'crash-2008',
            marketCondition: 'Financial crisis replay',
        },
    },
    {
        id: 'news-whirlwind',
        title: 'The News Whirlwind',
        subtitle: 'Real-time decision making',
        description: 'Real-time news headlines create a "What would you do?" scenario. React to breaking news and make investment decisions under time pressure.',
        difficulty: 'expert',
        category: 'psychology',
        objectives: [
            'React appropriately to breaking news',
            'Avoid knee-jerk reactions',
            'Make informed decisions under pressure',
        ],
        learningOutcomes: [
            'Real-time decision making',
            'News analysis skills',
            'Emotional discipline',
        ],
        estimatedTime: '15-20 min',
        prerequisiteIds: ['market-crash-2008'],
        sandboxConfig: {
            startingBalance: 100000,
            scenario: 'live-news',
            marketCondition: 'Breaking headlines',
        },
    },
];

export function getMissionById(id: string): Mission | undefined {
    return missions.find((m) => m.id === id);
}

export function getUnlockedMissions(completedIds: string[]): Mission[] {
    return missions.map((mission) => ({
        ...mission,
        isUnlocked:
            mission.prerequisiteIds.length === 0 ||
            mission.prerequisiteIds.every((prereq) => completedIds.includes(prereq)),
        isCompleted: completedIds.includes(mission.id),
    }));
}
