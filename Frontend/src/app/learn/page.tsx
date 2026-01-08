"use client";
import React, { useState, useEffect } from "react";
import Link from "next/link";
import ProgressRing from "@/app/lessonmodules/components/ProgressRing";
import { getProgress, resetAllProgress } from "@/app/lessonmodules/data/userProgress";

const moduleTitles = [
  "Introduction to FundThesis",
  "What is a Stock and ETF",
  "Buying vs Selling",
  "Portfolio Basics",
  "Market Movement & Risk",
  "Company Research Basics",
  "Long-Term vs Short-Term Thinking",
  "Reading a graph",
  "Sustainability Factors",
  "Demo",
];



const LearnPage: React.FC = () => {
  const [progress, setProgress] = useState<number[]>(() => Array(moduleTitles.length).fill(0));

  const reloadProgress = () => {
    try {
      const p = moduleTitles.map((_, i) => getProgress(i + 1, 4));
      setProgress(p);
    } catch {/* ignore */ }
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
      const confirmReset = window.confirm('Reset all modules? This will lose all current progress.');
      if (!confirmReset) return;
      try {
        resetAllProgress(); // triggers ft-progress-changed
        reloadProgress();
      } catch {/* ignore */ }
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* StockTicker is rendered globally in RootLayout */}

      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-4xl font-bold text-gray-900 mb-1">LearnThesis</h1>
          <p className="text-lg text-gray-600">Learn and master the fundamentals of investing step-by-step through interactive modules</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-9">
            <div className="bg-white rounded-lg shadow divide-y">
              {moduleTitles.map((title, i) => {
                const moduleNumber = i + 1; // 1-based
                const label =
                  moduleNumber === moduleTitles.length
                    ? "X"
                    : String(moduleNumber);
                return (
                  <Link
                    key={i}
                    href={`/lessonmodules/${moduleNumber}`}
                    className="flex p-6 hover:bg-gray-50 items-center justify-between"
                  >
                    <div>
                      <div className="text-sm text-gray-500">
                        Module {label}
                      </div>
                      <div className="text-lg font-semibold text-gray-900">
                        {title}
                      </div>
                    </div>
                    <div className="text-sm text-gray-500">Open →</div>
                  </Link>
                );
              })}
            </div>
          </div>

          <aside className="lg:col-span-3 flex flex-col items-center">
            <div className="w-full bg-white rounded-lg shadow p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-gray-700">Progress</h3>
                <button
                  onClick={handleReset}
                  aria-label="Reset all progress"
                  className="p-1 text-gray-700 hover:text-gray-900 rounded focus:outline-none focus:ring-2 focus:ring-gray-300"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="1 4 1 10 7 10" />
                    <path d="M3.51 15a9 9 0 1 0 .49-9.36" />
                  </svg>
                </button>
              </div>
              <div className="flex flex-col items-center gap-4">
                {moduleTitles.map((_, i) => {
                  const moduleNumber = i + 1;
                  const label =
                    moduleNumber === moduleTitles.length
                      ? "X"
                      : String(moduleNumber);
                  return (
                    <div
                      key={i}
                      className="flex items-center gap-4 w-full justify-between"
                    >
                      <div className="text-sm text-gray-600">
                        Module {label}
                      </div>
                      <div className="w-12 h-12">
                        <ProgressRing
                          percent={progress[i] || 0}
                          size={44}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
};

export default LearnPage;
