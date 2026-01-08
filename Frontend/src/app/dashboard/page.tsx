'use client';

import React, { useState, useEffect } from 'react';
import { NewsSection } from '@/components/dashboard/NewsSection';
import { PerformersSection } from '@/components/dashboard/PerformersSection';
import { EditorsDesk } from '@/components/dashboard/EditorsDesk';
import { SentimentHeatMap } from '@/components/dashboard/SentimentHeatMap';
import { WatchlistSection } from '@/components/dashboard/WatchlistSection';
import { useAuth } from '@/providers/AuthProvider';
import { useRouter } from 'next/navigation';
import { BookOpen, Newspaper } from 'lucide-react';
import Link from 'next/link';
import { fetchArticles } from '@/lib/api';

// Curated list to simulate "Market Movers" until backend has a dedicated mover endpoint
const MARKET_MOVERS_SYMBOLS = ['NVDA', 'TSLA', 'AAPL', 'MSFT', 'AMD', 'AMZN', 'GOOGL', 'META', 'NFLX'];

interface Performer {
    rank: number;
    symbol: string;
    name: string;
    price: string;
    change: string;
    percent: string;
}

// News item type for NewsSection
interface NewsItemStock {
    symbol: string;
    change: string;
    positive: boolean;
}

interface NewsItem {
    title: string;
    source: string;
    text: string;
    stocks: NewsItemStock[];
}

// Stock data from API
interface StockData {
    symbol: string;
    company: string;
    price: number;
    change: number;
    changePercent: number;
}

export default function DashboardPage() {
    const { user, isLoading: isAuthLoading } = useAuth();
    const router = useRouter();
    // Note: displayName will be used later for personalization
    // const displayName = user?.email?.split('@')[0] || 'Investor';

    const [newsItems, setNewsItems] = useState<NewsItem[]>([]);
    const [performers, setPerformers] = useState<Performer[]>([]);
    const [loadingNews, setLoadingNews] = useState(true);
    const [loadingStocks, setLoadingStocks] = useState(true);

    useEffect(() => {
        if (!isAuthLoading && !user) {
            router.replace('/auth');
        }
    }, [isAuthLoading, user, router]);

    // Fetch News
    useEffect(() => {
        const loadNews = async () => {
            try {
                const data = await fetchArticles({ limit: 5 });
                const formattedNews = data.articles.map(article => ({
                    title: article.headline,
                    source: `${article.source} • ${new Date(article.published_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
                    text: article.summary,
                    stocks: article.tickers.map(t => ({ symbol: t, change: '', positive: true })) // Change mock
                }));
                setNewsItems(formattedNews);
            } catch (err) {
                console.error("Failed to fetch news", err);
            } finally {
                setLoadingNews(false);
            }
        };
        loadNews();
    }, []);

    // Fetch Market Movers
    useEffect(() => {
        const loadMovers = async () => {
            try {
                // Fetch stocks using the batch API
                const symbolsParam = MARKET_MOVERS_SYMBOLS.join(',');
                const res = await fetch(`/api/stocks?symbols=${symbolsParam}`);
                if (!res.ok) throw new Error('Failed to fetch stocks');
                const data = await res.json();

                // Sort by absolute change percent to find biggest movers (active market)
                const stocks: StockData[] = data.stocks || [];
                const sorted = [...stocks].sort((a, b) =>
                    Math.abs(b.changePercent) - Math.abs(a.changePercent)
                ).slice(0, 5); // Top 5

                const formatted: Performer[] = sorted.map((s: StockData, index: number) => ({
                    rank: index + 1,
                    symbol: s.symbol,
                    name: s.company,
                    price: `$${s.price.toFixed(2)}`,
                    change: (s.change > 0 ? '+' : '') + s.change.toFixed(2),
                    percent: (s.changePercent > 0 ? '+' : '') + s.changePercent.toFixed(2) + '%'
                }));

                setPerformers(formatted);
            } catch (err) {
                console.error("Failed to fetch movers", err);
            } finally {
                setLoadingStocks(false);
            }
        };
        loadMovers();
    }, []);

    // Layout: Newspaper Grid
    return (
        <main className="min-h-screen bg-[#fcfbf9] text-[#1a1a1a]">
            <div className="max-w-7xl mx-auto px-4 py-8">

                {/* Newspaper Grid Layout */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

                    {/* Left Column: Quick Stats & Education Focus (3 columns) */}
                    <div className="lg:col-span-3 space-y-8">
                        {/* Education / Learning Corner */}
                        <div className="border-t-4 border-black pt-2 bg-stone-100 p-4">
                            <h3 className="font-serif text-lg font-bold uppercase tracking-wider mb-2 flex items-center">
                                <BookOpen className="w-4 h-4 mr-2" />
                                Learning Corner
                            </h3>
                            <p className="font-serif text-sm italic mb-4">&quot;Volatility is the price of admission for long-term growth.&quot;</p>
                            <Link href="/learn" className="block text-center bg-black text-white px-4 py-2 font-serif text-sm font-bold hover:bg-gray-800 transition-colors">
                                RESUME LEARNING
                            </Link>
                        </div>

                        {/* Daily Wisdom */}
                        <div className="border-t-4 border-black pt-2">
                            <h3 className="font-serif text-lg font-bold uppercase tracking-wider mb-2">Daily Wisdom</h3>
                            <blockquote className="font-serif text-xl italic leading-relaxed text-gray-800">
                                &quot;The individual investor should act consistently as an investor and not as a speculator.&quot;
                            </blockquote>
                            <p className="mt-2 text-xs font-bold uppercase tracking-widest text-gray-500">— Benjamin Graham</p>
                        </div>

                        <div className="border-t-4 border-black pt-2">
                            <h3 className="font-serif text-lg font-bold uppercase tracking-wider mb-4">Market Movers</h3>
                            <PerformersSection />
                        </div>
                    </div>

                    {/* Center Column: Main News / Portfolio (6 columns) */}
                    <div className="lg:col-span-6 border-x border-black/10 px-0 lg:px-8 space-y-12">

                        {/* Main Headline Section (Portfolio) */}
                        <section>
                            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 mb-8 border-b border-black/10 pb-8">
                                <div>
                                    <h1 className="font-serif text-4xl font-black mb-2">
                                        Welcome back.
                                    </h1>
                                    <p className="font-serif text-lg italic text-gray-600">
                                        Stay consistent. The market rewards patience.
                                    </p>
                                </div>

                                {/* Mission Progress Widget */}
                                <div className="bg-stone-50 border border-black/5 p-4 min-w-[200px] w-full md:w-auto">
                                    <div className="flex justify-between items-center mb-2">
                                        <span className="text-xs font-bold uppercase tracking-widest text-gray-500">Mission Progress</span>
                                        <span className="text-xs font-serif font-bold text-[#9DB38A]">On Track</span>
                                    </div>
                                    <div className="flex items-end gap-2 mb-2">
                                        <span className="text-3xl font-black font-serif leading-none">Lvl 3</span>
                                        <span className="text-xs font-serif italic text-gray-500 mb-1">Scholar</span>
                                    </div>
                                    <div className="w-full bg-gray-200 h-2">
                                        <div className="bg-black h-full w-[65%]" />
                                    </div>
                                    <p className="text-[10px] uppercase tracking-wide text-gray-400 mt-2 text-right">65% to Analyst</p>
                                </div>
                            </div>

                            {/* Portfolio Chart Removed as per user request */}
                        </section>

                        {/* Market Sentiment Heat Map */}
                        <section className="border-t border-black/10 pt-8">
                            <SentimentHeatMap />
                        </section>

                    </div>

                    {/* Right Column: AI Coach (3 columns) */}
                    <div className="lg:col-span-3 space-y-8">
                        <div className="sticky top-6">
                            <EditorsDesk />

                            {/* Watchlist Section */}
                            <div className="mt-6">
                                <WatchlistSection />
                            </div>

                            <div className="mt-8 border-t border-black/20 pt-4 text-center">
                                <p className="font-serif text-xs text-gray-400 italic">
                                    Powered by FundThesis AI
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Bottom Full-Width Section: Real News */}
                <div className="mt-12 pt-8 border-t-4 border-black">
                    <section>
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="font-serif text-3xl font-black flex items-center">
                                <Newspaper className="w-6 h-6 mr-3" />
                                Top Stories
                            </h2>
                            <span className="text-xs uppercase font-serif tracking-widest text-gray-500">Real-time Feed</span>
                        </div>

                        {loadingNews ? (
                            <div className="py-12 text-center font-serif text-gray-500 animate-pulse">
                                Fetching latest headlines...
                            </div>
                        ) : newsItems.length > 0 ? (
                            <NewsSection newsItems={newsItems} className="shadow-none grid md:grid-cols-2 gap-8" />
                        ) : (
                            <div className="py-8 text-center font-serif italic text-gray-500">
                                No major headlines at the moment.
                            </div>
                        )}
                    </section>
                </div>

            </div>
        </main>
    );
}
