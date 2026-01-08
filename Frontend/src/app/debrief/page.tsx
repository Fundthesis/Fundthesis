'use client';

import React, { useState, useEffect } from 'react';
import { generateTradeDebrief } from '@/lib/aiCoach';

interface TradeRecord {
    id: string;
    symbol: string;
    action: 'buy' | 'sell';
    price: number;
    quantity: number;
    timestamp: string;
    sandboxId: string;
}

interface DebriefAnalysis {
    tradeId: string;
    analysis: string;
    psychologyTag?: string;
    improvement: string;
    alternateOutcome?: string;
}

const PSYCHOLOGY_TAGS: Record<string, { label: string; description: string }> = {
    'FOMO': { label: 'Fear of Missing Out', description: 'Trading driven by anxiety about missing gains' },
    'Panic Selling': { label: 'Panic Response', description: 'Selling driven by fear rather than analysis' },
    'Confirmation Bias': { label: 'Confirmation Bias', description: 'Seeking information that confirms existing beliefs' },
    'Overconfidence': { label: 'Overconfidence', description: 'Excessive belief in one\'s predictions' },
    'Timing Challenge': { label: 'Timing Issue', description: 'Suboptimal entry or exit timing' },
    'Revenge Trading': { label: 'Revenge Trading', description: 'Attempting to recover losses through aggressive trades' },
};

export default function DebriefPage() {
    const [trades, setTrades] = useState<TradeRecord[]>([]);
    const [analyses, setAnalyses] = useState<Record<string, DebriefAnalysis>>({});
    const [selectedTrade, setSelectedTrade] = useState<TradeRecord | null>(null);
    const [isAnalyzing, setIsAnalyzing] = useState(false);

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
            const portfolios = localStorage.getItem('enviro_sandbox_portfolios');
            if (portfolios) {
                const parsed = JSON.parse(portfolios);
                const allTrades: TradeRecord[] = [];

                Object.entries(parsed).forEach(([sandboxId, data]: [string, unknown]) => {
                    const portfolioData = data as { history?: TradeRecord[] };
                    if (portfolioData.history) {
                        portfolioData.history.forEach((trade: TradeRecord) => {
                            allTrades.push({ ...trade, sandboxId });
                        });
                    }
                });

                allTrades.sort(
                    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
                );

                setTrades(allTrades.slice(0, 20));
            }
        } catch (e) {
            console.error('Failed to load trade history', e);
        }
    }, []);

    const analyzeTrade = async (trade: TradeRecord) => {
        if (analyses[trade.id]) {
            setSelectedTrade(trade);
            return;
        }

        setIsAnalyzing(true);
        setSelectedTrade(trade);

        try {
            const debrief = await generateTradeDebrief({
                symbol: trade.symbol,
                action: trade.action,
                price: trade.price,
                quantity: trade.quantity,
                timestamp: new Date(trade.timestamp),
                priceAtTime: trade.price,
                currentPrice: trade.price * (1 + (Math.random() * 0.1 - 0.05)),
            });

            setAnalyses((prev) => ({
                ...prev,
                [trade.id]: {
                    tradeId: trade.id,
                    ...debrief,
                },
            }));
        } catch (e) {
            console.error('Failed to analyze trade', e);
        } finally {
            setIsAnalyzing(false);
        }
    };

    const selectedAnalysis = selectedTrade ? analyses[selectedTrade.id] : null;

    return (
        <div className="min-h-screen bg-stone-50 dark:bg-stone-900">
            <main className="max-w-6xl mx-auto px-4 py-8">
                {/* Masthead */}
                <header className="text-center border-b-4 border-double border-black dark:border-stone-600 pb-4 mb-6">
                    <p className="text-xs tracking-widest text-stone-500 dark:text-stone-400 uppercase mb-2">
                        {dateString}
                    </p>
                    <h1 className="font-serif text-5xl font-black tracking-tight text-black dark:text-white">
                        The Trading Post-Mortem
                    </h1>
                    <p className="text-sm font-serif italic text-stone-600 dark:text-stone-400 mt-2">
                        &ldquo;Study Your Moves, Master Your Mind&rdquo;
                    </p>
                </header>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Trade Ledger - Left Column */}
                    <div className="lg:col-span-1">
                        <div className="border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800">
                            <div className="border-b border-stone-200 dark:border-stone-700 p-4">
                                <h2 className="text-xs uppercase tracking-widest text-stone-500 dark:text-stone-400">
                                    Recent Transactions
                                </h2>
                            </div>

                            <div className="divide-y divide-stone-100 dark:divide-stone-700 max-h-[600px] overflow-y-auto">
                                {trades.length === 0 ? (
                                    <div className="p-8 text-center">
                                        <p className="font-serif text-stone-500 dark:text-stone-400 italic">
                                            No transactions recorded.
                                        </p>
                                        <p className="text-sm text-stone-400 mt-2">
                                            Complete a mission to populate this ledger.
                                        </p>
                                    </div>
                                ) : (
                                    trades.map((trade) => (
                                        <button
                                            key={trade.id}
                                            onClick={() => analyzeTrade(trade)}
                                            className={`w-full p-4 text-left hover:bg-stone-50 dark:hover:bg-stone-700 transition-colors ${selectedTrade?.id === trade.id ? 'bg-stone-100 dark:bg-stone-700' : ''
                                                }`}
                                        >
                                            <div className="flex items-center justify-between mb-1">
                                                <span className="font-serif font-bold text-black dark:text-white">
                                                    {trade.symbol}
                                                </span>
                                                <span
                                                    className={`text-xs uppercase tracking-wide ${trade.action === 'buy'
                                                            ? 'text-stone-600 dark:text-stone-300'
                                                            : 'text-stone-500 dark:text-stone-400'
                                                        }`}
                                                >
                                                    {trade.action}
                                                </span>
                                            </div>
                                            <div className="flex items-center justify-between text-sm text-stone-500 dark:text-stone-400">
                                                <span>${trade.price.toFixed(2)}</span>
                                                <span>{trade.quantity} shares</span>
                                            </div>
                                            <div className="text-xs text-stone-400 mt-1">
                                                {new Date(trade.timestamp).toLocaleDateString()}
                                            </div>
                                            {analyses[trade.id]?.psychologyTag && (
                                                <div className="mt-2 text-xs uppercase tracking-wide text-stone-500 dark:text-stone-400 border-l-2 border-stone-300 dark:border-stone-600 pl-2">
                                                    {analyses[trade.id].psychologyTag}
                                                </div>
                                            )}
                                        </button>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Analysis - Right Column */}
                    <div className="lg:col-span-2">
                        {selectedTrade ? (
                            <article className="border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 p-8">
                                {isAnalyzing ? (
                                    <div className="text-center py-12">
                                        <p className="font-serif text-stone-500 dark:text-stone-400 italic">
                                            Reviewing transaction records...
                                        </p>
                                    </div>
                                ) : selectedAnalysis ? (
                                    <div className="space-y-8">
                                        {/* Article Header */}
                                        <header className="border-b border-stone-200 dark:border-stone-700 pb-6">
                                            <p className="text-xs uppercase tracking-widest text-stone-400 mb-2">
                                                Transaction Analysis
                                            </p>
                                            <h2 className="font-serif text-3xl font-bold text-black dark:text-white mb-2">
                                                {selectedTrade.symbol}: {selectedTrade.action.toUpperCase()} Order Review
                                            </h2>
                                            <p className="text-sm text-stone-500 dark:text-stone-400">
                                                {selectedTrade.quantity} shares at ${selectedTrade.price.toFixed(2)} —{' '}
                                                {new Date(selectedTrade.timestamp).toLocaleDateString('en-US', {
                                                    weekday: 'long',
                                                    year: 'numeric',
                                                    month: 'long',
                                                    day: 'numeric',
                                                })}
                                            </p>
                                        </header>

                                        {/* Main Analysis */}
                                        <section>
                                            <p className="font-serif text-lg leading-relaxed text-stone-700 dark:text-stone-300">
                                                {selectedAnalysis.analysis}
                                            </p>
                                        </section>

                                        {/* Psychology Tag */}
                                        {selectedAnalysis.psychologyTag && (
                                            <section className="border-l-4 border-stone-300 dark:border-stone-600 pl-6 py-4 bg-stone-50 dark:bg-stone-900">
                                                <h3 className="text-xs uppercase tracking-widest text-stone-500 dark:text-stone-400 mb-2">
                                                    Behavioral Pattern Detected
                                                </h3>
                                                <p className="font-serif text-xl font-bold text-black dark:text-white mb-1">
                                                    {PSYCHOLOGY_TAGS[selectedAnalysis.psychologyTag]?.label ||
                                                        selectedAnalysis.psychologyTag}
                                                </p>
                                                <p className="text-sm text-stone-600 dark:text-stone-400">
                                                    {PSYCHOLOGY_TAGS[selectedAnalysis.psychologyTag]?.description}
                                                </p>
                                            </section>
                                        )}

                                        {/* The Path Not Taken */}
                                        {selectedAnalysis.alternateOutcome && (
                                            <section className="border border-stone-200 dark:border-stone-700 p-6">
                                                <h3 className="text-xs uppercase tracking-widest text-stone-500 dark:text-stone-400 mb-3">
                                                    The Road Not Taken
                                                </h3>
                                                <p className="font-serif text-stone-700 dark:text-stone-300 italic">
                                                    {selectedAnalysis.alternateOutcome}
                                                </p>
                                            </section>
                                        )}

                                        {/* Editorial Recommendation */}
                                        <section className="bg-stone-100 dark:bg-stone-900 p-6">
                                            <h3 className="text-xs uppercase tracking-widest text-stone-500 dark:text-stone-400 mb-3">
                                                Editor&apos;s Recommendation
                                            </h3>
                                            <p className="font-serif text-stone-800 dark:text-stone-200 leading-relaxed">
                                                {selectedAnalysis.improvement}
                                            </p>
                                        </section>
                                    </div>
                                ) : (
                                    <div className="text-center py-12">
                                        <p className="font-serif text-stone-500 dark:text-stone-400">
                                            Select &ldquo;Analyze&rdquo; to review this transaction.
                                        </p>
                                    </div>
                                )}
                            </article>
                        ) : (
                            <div className="border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 p-12 text-center">
                                <h3 className="font-serif text-2xl font-bold text-black dark:text-white mb-3">
                                    Select a Transaction
                                </h3>
                                <p className="font-serif text-stone-500 dark:text-stone-400 italic max-w-md mx-auto">
                                    Choose any transaction from your ledger to receive a detailed
                                    psychological and strategic analysis of your trading decision.
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            </main>
        </div>
    );
}
