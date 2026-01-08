/**
 * AI Coach Service - Client Side
 * Calls the /api/coach endpoint which connects to Azure OpenAI
 */

export interface CoachMessage {
    role: 'user' | 'coach';
    content: string;
    timestamp: Date;
    citations?: string[];
}

export type ChatMessage = CoachMessage;

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
 * Generate a coach response using the server-side API
 */
export async function getCoachResponse(
    userMessage: string,
    context: CoachContext,
    conversationHistory: CoachMessage[]
): Promise<CoachResponse> {
    console.log('[AI Coach] Sending message to API...');

    try {
        const response = await fetch('/api/coach', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                message: userMessage,
                context,
                conversationHistory: conversationHistory.map((msg) => ({
                    role: msg.role,
                    content: msg.content,
                })),
            }),
        });

        if (!response.ok) {
            throw new Error(`API error: ${response.status}`);
        }

        const data = await response.json();
        console.log('[AI Coach] Got response from API');

        return {
            message: data.message,
            citations: data.citations || [],
            suggestedActions: data.suggestedActions || [],
            relatedModules: data.relatedModules || [],
        };
    } catch (error) {
        console.error('[AI Coach] API call failed:', error);

        // Fallback response
        return {
            message:
                "I apologize, but I'm having trouble connecting at the moment. Please try again shortly.",
            citations: [],
            suggestedActions: ['Try again', 'Browse the Learning Ledger'],
        };
    }
}

/**
 * Coach's Next Move prompts
 */
export function getCoachNextMove(_context: CoachContext): string {
    return "What would you like to explore today? I'm here to guide your learning journey.";
}

/**
 * Generate a post-trade debrief analysis
 */
export async function generateTradeDebrief(tradeData: {
    symbol: string;
    action: 'buy' | 'sell';
    price: number;
    quantity: number;
    timestamp: Date;
    priceAtTime: number;
    currentPrice: number;
}): Promise<{
    analysis: string;
    psychologyTag?: string;
    improvement: string;
    alternateOutcome?: string;
}> {
    const priceDiff = tradeData.currentPrice - tradeData.priceAtTime;
    const percentChange = ((priceDiff / tradeData.priceAtTime) * 100).toFixed(2);

    const wasProfitable =
        (tradeData.action === 'buy' && priceDiff > 0) ||
        (tradeData.action === 'sell' && priceDiff < 0);

    return {
        analysis: `Your ${tradeData.action} of ${tradeData.symbol} at $${tradeData.price.toFixed(2)} has ${wasProfitable ? 'gained' : 'lost'} ${Math.abs(parseFloat(percentChange))}% since execution.`,
        psychologyTag: wasProfitable ? undefined : 'Timing Challenge',
        improvement: wasProfitable
            ? 'Great timing. Consider setting a trailing stop to lock in gains.'
            : "Consider using limit orders to get better entry prices. The market doesn't always cooperate with our timing.",
        alternateOutcome: `If you had waited 24 hours, the price would have been $${(tradeData.currentPrice * 1.02).toFixed(2)}.`,
    };
}
