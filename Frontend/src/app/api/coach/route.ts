import { NextRequest, NextResponse } from 'next/server';

/**
 * Learning module content for RAG context
 */
const LEARNING_MODULES = [
    { id: '1', title: 'Introduction to FundThesis', topics: ['platform overview', 'getting started', 'goals'] },
    { id: '2', title: 'What is a Stock and ETF', topics: ['stocks', 'ETFs', 'ownership', 'shares', 'funds'] },
    { id: '3', title: 'Buying vs Selling', topics: ['buy', 'sell', 'bid', 'ask', 'orders', 'trading'] },
    { id: '4', title: 'Portfolio Basics', topics: ['portfolio', 'diversification', 'allocation', 'risk'] },
    { id: '5', title: 'Market Movement & Risk', topics: ['volatility', 'risk', 'beta', 'market', 'movement'] },
    { id: '6', title: 'Company Research Basics', topics: ['research', 'fundamentals', 'financial statements', 'analysis'] },
    { id: '7', title: 'Long-Term vs Short-Term', topics: ['long-term', 'short-term', 'investing', 'trading', 'horizon'] },
    { id: '8', title: 'Reading a Graph', topics: ['charts', 'graphs', 'technical', 'patterns', 'candlestick'] },
    { id: '9', title: 'Sustainability Factors', topics: ['ESG', 'sustainability', 'environmental', 'social', 'governance'] },
];

function findRelevantModules(query: string): string[] {
    const lowerQuery = query.toLowerCase();
    const matches: string[] = [];

    for (const module of LEARNING_MODULES) {
        const hasMatch = module.topics.some((topic) => lowerQuery.includes(topic.toLowerCase()));
        if (hasMatch) {
            matches.push(`Module ${module.id}: ${module.title}`);
        }
    }

    return matches.slice(0, 3);
}

function buildSystemPrompt(context: { archetype?: string; rank?: string; currentModule?: string }): string {
    return `You are "The Editor" - an AI investment coach for FundThesis, an educational platform teaching retail investors.

Your teaching method:
- Use the Socratic method: guide users to discover answers themselves through questions
- Never give direct investment advice or stock picks
- Reference learning modules when relevant
- Keep responses concise (2-3 paragraphs max)
- Use a gentle, encouraging newspaper-editor tone
- Ask follow-up questions to deepen understanding

User context:
- Current archetype: ${context.archetype || 'Not yet determined'}
- Knowledge rank: ${context.rank || 'Beginner'}
- Recent focus: ${context.currentModule || 'General learning'}

Remember: Your goal is education, not financial advice. Guide them to think critically about investments.`;
}

function getSuggestedActions(query: string): string[] {
    const lowerQuery = query.toLowerCase();

    if (lowerQuery.includes('buy') || lowerQuery.includes('sell') || lowerQuery.includes('trade')) {
        return ['Practice in the Sandbox', 'Review Module 3: Buying vs Selling'];
    }
    if (lowerQuery.includes('chart') || lowerQuery.includes('graph') || lowerQuery.includes('pattern')) {
        return ['Study chart patterns', 'Review Module 8: Reading a Graph'];
    }
    if (lowerQuery.includes('research') || lowerQuery.includes('analys')) {
        return ['Research a company', 'Review Module 6: Company Research'];
    }
    if (lowerQuery.includes('volatil') || lowerQuery.includes('risk')) {
        return ['Review the volatility section', 'Try a practice trade'];
    }
    if (lowerQuery.includes('portfolio') || lowerQuery.includes('diversif')) {
        return ['Explore the Portfolio mission', 'Add different sectors to your sandbox'];
    }

    return ['Explore a mission', 'Continue learning'];
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { message, context = {}, conversationHistory = [] } = body;

        if (!message) {
            return NextResponse.json({ error: 'Message is required' }, { status: 400 });
        }

        const endpoint = process.env.AZURE_OPENAI_ENDPOINT;
        const apiKey = process.env.AZURE_OPENAI_API_KEY;

        // Find relevant modules for citations
        const relevantModules = findRelevantModules(message);

        // Build conversation for API
        const apiMessages = conversationHistory.slice(-6).map((msg: { role: string; content: string }) => ({
            role: msg.role === 'coach' ? 'assistant' : 'user',
            content: msg.content,
        }));
        apiMessages.push({ role: 'user', content: message });

        let aiResponse = '';

        if (endpoint && apiKey) {
            try {
                console.log('[AI Coach API] Calling Azure OpenAI...');

                const response = await fetch(endpoint, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'api-key': apiKey,
                    },
                    body: JSON.stringify({
                        messages: [
                            { role: 'system', content: buildSystemPrompt(context) },
                            ...apiMessages,
                        ],
                        max_tokens: 500,
                        temperature: 0.7,
                    }),
                });

                if (response.ok) {
                    const data = await response.json();
                    aiResponse = data.choices?.[0]?.message?.content || '';
                    console.log('[AI Coach API] Got response from Azure OpenAI');
                } else {
                    const errorText = await response.text();
                    console.error('[AI Coach API] Azure error:', response.status, errorText);
                }
            } catch (error) {
                console.error('[AI Coach API] Failed to call Azure OpenAI:', error);
            }
        } else {
            console.warn('[AI Coach API] Azure credentials not configured');
        }

        // Fallback if API fails
        if (!aiResponse) {
            const lowerMessage = message.toLowerCase();
            if (lowerMessage.includes('volatil') || lowerMessage.includes('risk')) {
                aiResponse =
                    "Volatility is a fascinating topic. Think about how a stock's price moves up and down over time. What do you think causes some stocks to swing more wildly than others? And more importantly, how might that affect your investment decisions?";
            } else if (lowerMessage.includes('portfolio') || lowerMessage.includes('diversif')) {
                aiResponse =
                    "Building a strong portfolio is about balance. Consider this: if you put all your savings into one company and it fails, what happens? Now, what if you spread it across many? This is the essence of diversification. What sectors are you most drawn to, and why?";
            } else {
                aiResponse =
                    "That's a thoughtful question to explore. Before I share my perspective, what's your initial thinking on this? Sometimes the best insights come from reflecting on what we already know and building from there.";
            }
        }

        return NextResponse.json({
            message: aiResponse,
            citations: relevantModules.length ? relevantModules : ['Module 1: Introduction to FundThesis'],
            suggestedActions: getSuggestedActions(message),
            relatedModules: relevantModules.map((m) => m.split(':')[0].replace('Module ', '')),
        });
    } catch (error) {
        console.error('[AI Coach API] Error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
