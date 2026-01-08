/**
 * AI Coach Service
 * Stub for Azure OpenAI integration
 * Uses the Socratic method to guide students to their own conclusions
 */

export interface CoachMessage {
    role: 'user' | 'coach';
    content: string;
    timestamp: Date;
    citations?: string[];
}

export interface CoachContext {
    userId?: string;
    currentModule?: string;
    recentTrades?: string[];
    portfolio?: string[];
    archetype?: string;
    rank?: string;
}

export interface CoachResponse {
    message: string;
    citations: string[];
    suggestedActions?: string[];
    relatedModules?: string[];
}

/**
 * Socratic prompts to avoid giving direct answers
 */
const SOCRATIC_PROMPTS = [
    "What do you think would happen if...",
    "Based on what we discussed in the module about {topic}, how might that apply here?",
    "Let's think about this together. What patterns do you notice?",
    "That's an interesting question. Before I share my thoughts, what's your initial instinct?",
    "Remember when we looked at {concept}? How might that relate to your current situation?",
    "What evidence from the market would help you answer this?",
    "If you were explaining this to a friend, what would you say?",
];

/**
 * Coach's Next Move prompts based on user behavior
 */
export function getCoachNextMove(context: CoachContext): string {
    // This would be powered by Azure AI Personalizer in production
    const prompts = [
        {
            condition: 'high_risk_browsing',
            prompt: "I noticed you were looking at some volatile stocks. Want to explore how to measure risk in a quick 5-minute mission?",
        },
        {
            condition: 'impulsive_trade',
            prompt: "Your last trade in the sandbox was quick! Let's head to the Debrief to see what happened and learn from it.",
        },
        {
            condition: 'module_incomplete',
            prompt: "You're almost done with the Portfolio Basics module. Just one more section to go!",
        },
        {
            condition: 'mission_ready',
            prompt: "You've unlocked a new mission: The Inflation Spike. Ready to put your knowledge to the test?",
        },
        {
            condition: 'streak_building',
            prompt: "You're on a 3-day learning streak! Keep it going for bonus XP.",
        },
    ];

    // Default prompt
    return "What would you like to explore today? I'm here to guide your learning journey.";
}

/**
 * Generate a coach response using the Socratic method
 * In production, this would call Azure OpenAI with our custom system prompt
 */
export async function getCoachResponse(
    userMessage: string,
    context: CoachContext,
    conversationHistory: CoachMessage[]
): Promise<CoachResponse> {
    // Stub implementation - would call Azure OpenAI in production
    console.log('[AI Coach] Processing message:', userMessage);
    console.log('[AI Coach] Context:', context);

    // Simulate API delay
    await new Promise((resolve) => setTimeout(resolve, 500));

    // Mock Socratic response
    const responses: Record<string, CoachResponse> = {
        default: {
            message: "That's a great question to explore. Before I share my perspective, what's your initial thinking on this? What have you observed in the market that might give us clues?",
            citations: ['Module 5: Market Movement & Risk'],
            suggestedActions: ['Review the volatility section', 'Try a practice trade in the sandbox'],
            relatedModules: ['5', '8'],
        },
        volatility: {
            message: "Volatility is a fascinating topic. Think about Apple's stock yesterday - it moved 2% in a single hour. What do you think caused that? And more importantly, how would that affect someone who just invested their savings?",
            citations: ['Module 5: Market Movement & Risk', 'Module 8: Reading a Graph'],
            suggestedActions: ['Look at AAPL chart in Discover', 'Try the Inflation Spike mission'],
            relatedModules: ['5'],
        },
        portfolio: {
            message: "Building a strong portfolio is like constructing a house - you need a solid foundation. What sectors are you most familiar with? Let's start there and think about diversification.",
            citations: ['Module 4: Portfolio Basics'],
            suggestedActions: ['Complete the Building the Portfolio mission', 'Add 3 different sector ETFs'],
            relatedModules: ['4'],
        },
    };

    // Simple keyword matching for the stub
    const lowerMessage = userMessage.toLowerCase();
    if (lowerMessage.includes('volatil') || lowerMessage.includes('risk')) {
        return responses.volatility;
    }
    if (lowerMessage.includes('portfolio') || lowerMessage.includes('diversif')) {
        return responses.portfolio;
    }

    return responses.default;
}

/**
 * Generate a post-trade debrief analysis
 * Would use Azure ML for pattern detection in production
 */
export async function generateTradeDebrief(
    tradeData: {
        symbol: string;
        action: 'buy' | 'sell';
        price: number;
        quantity: number;
        timestamp: Date;
        priceAtTime: number;
        currentPrice: number;
    }
): Promise<{
    analysis: string;
    psychologyTag?: string;
    improvement: string;
    alternateOutcome?: string;
}> {
    // Stub implementation
    const priceDiff = tradeData.currentPrice - tradeData.priceAtTime;
    const percentChange = ((priceDiff / tradeData.priceAtTime) * 100).toFixed(2);

    const wasProfitable =
        (tradeData.action === 'buy' && priceDiff > 0) ||
        (tradeData.action === 'sell' && priceDiff < 0);

    return {
        analysis: `Your ${tradeData.action} of ${tradeData.symbol} at $${tradeData.price.toFixed(2)} has ${wasProfitable ? 'gained' : 'lost'} ${Math.abs(parseFloat(percentChange))}% since execution.`,
        psychologyTag: wasProfitable ? undefined : 'Timing Challenge',
        improvement: wasProfitable
            ? "Great timing! Consider setting a trailing stop to lock in gains."
            : "Consider using limit orders to get better entry prices. The market doesn't always cooperate with our timing.",
        alternateOutcome: `If you had waited 24 hours, the price would have been $${(tradeData.currentPrice * 1.02).toFixed(2)}.`,
    };
}
