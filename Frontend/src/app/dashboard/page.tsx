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

// Note: Market Movers are now handled by PerformersSection component

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

// Note: Stock data interfaces are now handled by PerformersSection component

export default function DashboardPage() {
    const { user, isLoading: isAuthLoading } = useAuth();
    const router = useRouter();
    // Note: displayName will be used later for personalization
    // const displayName = user?.email?.split('@')[0] || 'Investor';

    const [newsItems, setNewsItems] = useState<NewsItem[]>([]);
    const [loadingNews, setLoadingNews] = useState(true);

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

    // Note: Market Movers are now handled by PerformersSection component

    // Get today's date
    const today = new Date();
    const dateString = today.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
    });

    // Layout: Newspaper Grid
    return (
        <main className="min-h-screen bg-stone-50 dark:bg-stone-900 text-[#1a1a1a] dark:text-stone-100">
            <div className="max-w-7xl mx-auto px-4 py-8">
                {/* Masthead */}
                <header className="text-center border-b-4 border-double border-black dark:border-stone-600 pb-4 mb-8">
                    <p className="text-xs tracking-widest text-stone-500 dark:text-stone-400 uppercase mb-2">
                        {dateString}
                    </p>
                    <h1 className="font-serif text-5xl font-black tracking-tight text-black dark:text-white">
                        Market Chronicle
                    </h1>
                    <p className="text-sm font-serif italic text-stone-600 dark:text-stone-400 mt-2">
                        &ldquo;Your Daily Briefing on Markets, News & Insights&rdquo;
                    </p>
                </header>

                {/* Newspaper Grid Layout */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

                    {/* Left Column: Quick Stats & Education Focus (3 columns) */}
                    <div className="lg:col-span-3 space-y-8">
                        {/* Education / Learning Corner */}
                        <div className="border-t-4 border-black dark:border-stone-700 pt-2 bg-stone-100 dark:bg-stone-800 p-4">
                            <h3 className="font-serif text-lg font-bold uppercase tracking-wider mb-2 flex items-center text-black dark:text-stone-100">
                                <BookOpen className="w-4 h-4 mr-2" />
                                Learning Corner
                            </h3>
                            <p className="font-serif text-sm italic mb-4 text-black dark:text-stone-300">&quot;Volatility is the price of admission for long-term growth.&quot;</p>
                            <Link href="/learn" className="block text-center bg-black dark:bg-stone-700 text-white dark:text-stone-100 px-4 py-2 font-serif text-sm font-bold hover:bg-gray-800 dark:hover:bg-stone-600 transition-colors">
                                RESUME LEARNING
                            </Link>
                        </div>

                        {/* Daily Wisdom */}
                        <div className="border-t-4 border-black dark:border-stone-700 pt-2">
                            <h3 className="font-serif text-lg font-bold uppercase tracking-wider mb-2 text-black dark:text-stone-100">Daily Wisdom</h3>
                            <blockquote className="font-serif text-xl italic leading-relaxed text-gray-800 dark:text-stone-300">
                                &quot;The individual investor should act consistently as an investor and not as a speculator.&quot;
                            </blockquote>
                            <p className="mt-2 text-xs font-bold uppercase tracking-widest text-gray-500 dark:text-stone-400">— Benjamin Graham</p>
                        </div>

                        <div className="border-t-4 border-black dark:border-stone-700 pt-2">
                            <h3 className="font-serif text-lg font-bold uppercase tracking-wider mb-4 text-black dark:text-stone-100">Market Movers</h3>
                            <PerformersSection />
                        </div>
                    </div>

                    {/* Center Column: Main News / Portfolio (6 columns) */}
                    <div className="lg:col-span-6 border-x border-black/10 dark:border-stone-700 px-0 lg:px-8 space-y-12">

                        {/* Main Headline Section (Portfolio) */}
                        <section>
                            <div className="mb-6 pb-4 border-b-4 border-black dark:border-stone-700">
                                <h2 className="font-serif text-2xl font-black uppercase tracking-wider text-black dark:text-stone-100">
                                    Market Chronicle
                                </h2>
                            </div>
                            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 mb-8 border-b border-black/10 dark:border-stone-700 pb-8">
                                <div>
                                    <h1 className="font-serif text-4xl font-black mb-2 text-black dark:text-stone-100">
                                        Welcome back.
                                    </h1>
                                    <p className="font-serif text-lg italic text-gray-600 dark:text-stone-400">
                                        Stay consistent. The market rewards patience.
                                    </p>
                                </div>

                                {/* Mission Progress Widget */}
                                <div className="bg-stone-50 dark:bg-stone-800 border border-black/5 dark:border-stone-700 p-4 min-w-[200px] w-full md:w-auto">
                                    <div className="flex justify-between items-center mb-2">
                                        <span className="text-xs font-bold uppercase tracking-widest text-gray-500 dark:text-stone-400">Mission Progress</span>
                                        <span className="text-xs font-serif font-bold text-[#9DB38A] dark:text-[#9DB38A]">On Track</span>
                                    </div>
                                    <div className="flex items-end gap-2 mb-2">
                                        <span className="text-3xl font-black font-serif leading-none text-black dark:text-stone-100">Lvl 3</span>
                                        <span className="text-xs font-serif italic text-gray-500 dark:text-stone-400 mb-1">Scholar</span>
                                    </div>
                                    <div className="w-full bg-gray-200 dark:bg-stone-700 h-2">
                                        <div className="bg-black dark:bg-stone-500 h-full w-[65%]" />
                                    </div>
                                    <p className="text-[10px] uppercase tracking-wide text-gray-400 dark:text-stone-500 mt-2 text-right">65% to Analyst</p>
                                </div>
                            </div>

                            {/* Portfolio Chart Removed as per user request */}
                        </section>

                        {/* Market Sentiment Heat Map */}
                        <section className="border-t border-black/10 dark:border-stone-700 pt-8">
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

                            <div className="mt-8 border-t border-black/20 dark:border-stone-700 pt-4 text-center">
                                <p className="font-serif text-xs text-gray-400 dark:text-stone-500 italic">
                                    Powered by FundThesis AI
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Bottom Full-Width Section: Real News */}
                <div className="mt-12 pt-8 border-t-4 border-black dark:border-stone-700">
                    <section>
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="font-serif text-3xl font-black flex items-center text-black dark:text-stone-100">
                                <Newspaper className="w-6 h-6 mr-3" />
                                Top Stories
                            </h2>
                            <span className="text-xs uppercase font-serif tracking-widest text-gray-500 dark:text-stone-400">Real-time Feed</span>
                        </div>

                        {loadingNews ? (
                            <div className="py-12 text-center font-serif text-gray-500 dark:text-stone-400 animate-pulse">
                                Fetching latest headlines...
                            </div>
                        ) : newsItems.length > 0 ? (
                            <NewsSection newsItems={newsItems} className="shadow-none grid md:grid-cols-2 gap-8" />
                        ) : (
                            <div className="py-8 text-center font-serif italic text-gray-500 dark:text-stone-400">
                                No major headlines at the moment.
                            </div>
                        )}
                    </section>
                </div>

            </div>
        </main>
    );
}
