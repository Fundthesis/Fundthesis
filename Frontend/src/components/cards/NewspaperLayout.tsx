"use client";

import { ReactNode } from "react";

interface NewspaperLayoutProps {
  title: string;
  subtitle?: string;
  date?: string;
  children: ReactNode;
  maxWidth?: string;
}

export function NewspaperLayout({
  title,
  subtitle,
  date,
  children,
  maxWidth = "max-w-6xl",
}: NewspaperLayoutProps) {
  const today = date || new Date().toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="min-h-screen bg-stone-50 dark:bg-stone-900">
      <main className={`${maxWidth} mx-auto px-4 py-8`}>
        {/* Newspaper Masthead */}
        <header className="text-center border-b-4 border-double border-black dark:border-stone-100 pb-3 mb-4">
          <p className="text-xs tracking-widest text-stone-500 dark:text-stone-400 uppercase mb-2">
            {today}
          </p>
          <h1 className="font-serif text-5xl md:text-6xl font-black tracking-tight text-black dark:text-stone-100">
            {title}
          </h1>
          {subtitle && (
            <p className="text-sm font-serif italic text-stone-600 dark:text-stone-300 mt-2">
              &ldquo;{subtitle}&rdquo;
            </p>
          )}
        </header>

        {children}
      </main>
    </div>
  );
}

