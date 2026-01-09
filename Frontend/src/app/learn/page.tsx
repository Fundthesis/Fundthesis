'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/providers/AuthProvider';
import { getProgress, resetAllProgress } from '@/app/lessonmodules/data/userProgress';

const moduleTitles = [
  'Introduction to FundThesis',
  'What is a Stock and ETF',
  'Buying vs Selling',
  'Portfolio Basics',
  'Market Movement & Risk',
  'Company Research Basics',
  'Long-Term vs Short-Term Thinking',
  'Reading a Graph',
  'Sustainability Factors',
  'Demo',
];

export default function LearnPage() {
  const { user, isLoading: isAuthLoading } = useAuth();
  const router = useRouter();
  const [progress, setProgress] = useState<number[]>(() =>
    Array(moduleTitles.length).fill(0)
  );
  const [isPreview, setIsPreview] = useState(false);

  useEffect(() => {
    // Check if this is a preview (from query param)
    const params = new URLSearchParams(window.location.search);
    if (params.get('preview') === 'true') {
      setIsPreview(true);
    } else if (!isAuthLoading && !user) {
      router.replace('/auth');
    }
  }, [isAuthLoading, user, router]);

  const reloadProgress = () => {
    try {
      const p = moduleTitles.map((_, i) => getProgress(i + 1, 4));
      setProgress(p);
    } catch {
      /* ignore */
    }
  };

  useEffect(() => {
    reloadProgress();
    const onChange = () => reloadProgress();
    window.addEventListener('ft-progress-changed', onChange);
    window.addEventListener('storage', onChange);
    return () => {
      window.removeEventListener('ft-progress-changed', onChange);
      window.removeEventListener('storage', onChange);
    };
  }, []);

  const handleReset = () => {
    if (typeof window !== 'undefined') {
      const confirmReset = window.confirm(
        'Reset all modules? This will clear all current progress.'
      );
      if (!confirmReset) return;
      try {
        resetAllProgress();
        reloadProgress();
      } catch {
        /* ignore */
      }
    }
  };

  // Get today's date
  const today = new Date();
  const dateString = today.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const completedCount = progress.filter((p) => p >= 100).length;
  const totalModules = moduleTitles.length;

  // Show preview overlay if not logged in
  if (isPreview || (!isAuthLoading && !user)) {
    return (
      <div className="min-h-screen bg-stone-50 dark:bg-stone-900 relative">
        {/* Overlay for preview mode */}
        <div className="absolute inset-0 bg-black/20 dark:bg-black/40 z-10 flex items-center justify-center">
          <div className="bg-white dark:bg-stone-800 border-4 border-black dark:border-stone-700 p-8 max-w-md mx-4 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] dark:shadow-[8px_8px_0px_0px_rgba(255,255,255,0.1)] text-center">
            <h2 className="text-2xl font-black text-black dark:text-stone-100 mb-4 uppercase">Preview Mode</h2>
            <p className="text-gray-700 dark:text-stone-300 mb-6 font-serif">
              Sign in to access the full Learning Ledger and track your progress through all modules.
            </p>
            <Link
              href="/auth"
              className="inline-block px-6 py-3 bg-black dark:bg-green-600 text-white font-bold uppercase tracking-widest hover:bg-gray-800 dark:hover:bg-green-700 transition-colors"
            >
              Sign In to Continue
            </Link>
          </div>
        </div>

        <main className="max-w-6xl mx-auto px-4 py-8 opacity-50 pointer-events-none">
          {/* Masthead */}
          <header className="text-center border-b-4 border-double border-black dark:border-stone-600 pb-4 mb-6">
            <p className="text-xs tracking-widest text-stone-500 dark:text-stone-400 uppercase mb-2">
              {dateString}
            </p>
            <h1 className="font-serif text-5xl font-black tracking-tight text-black dark:text-white">
              The Learning Ledger
            </h1>
            <p className="text-sm font-serif italic text-stone-600 dark:text-stone-400 mt-2">
              &ldquo;Ten Chapters to Financial Literacy&rdquo;
            </p>
            <div className="flex justify-center gap-8 mt-4 text-xs uppercase tracking-wide text-stone-500 dark:text-stone-400">
              <span>Vol. I</span>
              <span>|</span>
              <span>Preview Mode</span>
            </div>
          </header>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            {/* Module List */}
            <div className="lg:col-span-3">
              <div className="border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 divide-y divide-stone-100 dark:divide-stone-700">
                {moduleTitles.map((title, i) => {
                  const moduleNumber = i + 1;

                  return (
                    <div
                      key={i}
                      className="flex items-center justify-between p-6"
                    >
                    <div className="flex items-start gap-4">
                      <div className="text-center min-w-[40px]">
                        <span className="font-serif text-2xl font-bold text-stone-300 dark:text-stone-600">
                          {moduleNumber === 10 ? 'X' : moduleNumber}
                        </span>
                      </div>
                      <div>
                        <p className="text-xs uppercase tracking-widest text-stone-400 mb-1">
                          Chapter {moduleNumber === 10 ? 'X' : moduleNumber}
                        </p>
                        <h3 className="font-serif text-lg font-bold text-black dark:text-white">
                          {title}
                        </h3>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="w-24 hidden sm:block">
                          <div className="w-full bg-stone-200 dark:bg-stone-700 h-1">
                            <div className="bg-stone-400 dark:bg-stone-600 h-1" style={{ width: '0%' }} />
                          </div>
                          <p className="text-xs text-stone-400 mt-1 text-right">0%</p>
                        </div>
                        <span className="text-xs text-stone-400">Locked 🔒</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Sidebar */}
            <aside className="lg:col-span-1">
              <div className="border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 p-6 sticky top-8">
                <h3 className="text-xs uppercase tracking-widest text-stone-500 dark:text-stone-400 mb-4 border-b border-stone-200 dark:border-stone-700 pb-2">
                  Reading Progress
                </h3>

                <div className="mb-6">
                  <p className="font-serif text-4xl font-black text-black dark:text-white">0</p>
                  <p className="text-sm text-stone-500 dark:text-stone-400">of {totalModules} chapters complete</p>
                </div>
              </div>
            </aside>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-50 dark:bg-stone-900">
      <main className="max-w-6xl mx-auto px-4 py-8">
        {/* Masthead */}
        <header className="text-center border-b-4 border-double border-black dark:border-stone-600 pb-4 mb-6">
          <p className="text-xs tracking-widest text-stone-500 dark:text-stone-400 uppercase mb-2">
            {dateString}
          </p>
          <h1 className="font-serif text-5xl font-black tracking-tight text-black dark:text-white">
            The Learning Ledger
          </h1>
          <p className="text-sm font-serif italic text-stone-600 dark:text-stone-400 mt-2">
            &ldquo;Ten Chapters to Financial Literacy&rdquo;
          </p>
          <div className="flex justify-center gap-8 mt-4 text-xs uppercase tracking-wide text-stone-500 dark:text-stone-400">
            <span>Vol. I</span>
            <span>|</span>
            <span>{completedCount} of {totalModules} Complete</span>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Module List */}
          <div className="lg:col-span-3">
            <div className="border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 divide-y divide-stone-100 dark:divide-stone-700">
              {moduleTitles.map((title, i) => {
                const moduleNumber = i + 1;
                const isComplete = progress[i] >= 100;
                const progressPercent = progress[i] || 0;

                return (
                  <Link
                    key={i}
                    href={`/lessonmodules/${moduleNumber}`}
                    className="flex items-center justify-between p-6 hover:bg-stone-50 dark:hover:bg-stone-700 transition-colors"
                  >
                    <div className="flex items-start gap-4">
                      <div className="text-center min-w-[40px]">
                        <span className="font-serif text-2xl font-bold text-stone-300 dark:text-stone-600">
                          {moduleNumber === 10 ? 'X' : moduleNumber}
                        </span>
                      </div>
                      <div>
                        <p className="text-xs uppercase tracking-widest text-stone-400 mb-1">
                          Chapter {moduleNumber === 10 ? 'X' : moduleNumber}
                        </p>
                        <h3 className="font-serif text-lg font-bold text-black dark:text-white">
                          {title}
                        </h3>
                        {isComplete && (
                          <p className="text-xs text-stone-500 dark:text-stone-400 mt-1 uppercase tracking-wide">
                            Completed
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="w-24 hidden sm:block">
                        <div className="w-full bg-stone-200 dark:bg-stone-700 h-1">
                          <div
                            className="bg-black dark:bg-green-500 h-1 transition-all"
                            style={{ width: `${progressPercent}%` }}
                          />
                        </div>
                        <p className="text-xs text-stone-400 mt-1 text-right">
                          {progressPercent}%
                        </p>
                      </div>
                      <span className="text-xs text-stone-400">
                        Read →
                      </span>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Sidebar */}
          <aside className="lg:col-span-1">
            <div className="border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 p-6 sticky top-8">
              <h3 className="text-xs uppercase tracking-widest text-stone-500 dark:text-stone-400 mb-4 border-b border-stone-200 dark:border-stone-700 pb-2">
                Reading Progress
              </h3>

              <div className="mb-6">
                <p className="font-serif text-4xl font-black text-black dark:text-white">
                  {completedCount}
                </p>
                <p className="text-sm text-stone-500 dark:text-stone-400">
                  of {totalModules} chapters complete
                </p>
              </div>

              <div className="space-y-2 mb-6">
                {moduleTitles.map((_, i) => {
                  const pct = progress[i] || 0;
                  return (
                    <div key={i} className="flex items-center gap-2">
                      <span className="text-xs text-stone-400 w-4">
                        {i + 1 === 10 ? 'X' : i + 1}
                      </span>
                      <div className="flex-1 bg-stone-200 dark:bg-stone-700 h-1">
                        <div
                          className="bg-black dark:bg-green-500 h-1"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>

              <button
                onClick={handleReset}
                className="w-full text-xs uppercase tracking-widest text-stone-500 dark:text-stone-400 border border-stone-300 dark:border-stone-600 py-2 hover:bg-stone-50 dark:hover:bg-stone-700 transition-colors"
              >
                Reset All Progress
              </button>
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
}
