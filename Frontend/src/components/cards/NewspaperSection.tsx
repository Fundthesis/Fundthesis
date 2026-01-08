"use client";

import { ReactNode } from "react";

interface NewspaperSectionProps {
  title: string;
  children: ReactNode;
  className?: string;
  headerClassName?: string;
}

export function NewspaperSection({
  title,
  children,
  className = "",
  headerClassName = "",
}: NewspaperSectionProps) {
  return (
    <section className={`border border-stone-200 dark:border-stone-700 bg-white/80 dark:bg-stone-800/80 backdrop-blur-md p-5 shadow-sm ${className}`}>
      <header className={`border-b-2 border-black dark:border-stone-100 pb-2 mb-4 ${headerClassName}`}>
        <h2 className="font-serif text-xl font-bold text-black dark:text-stone-100 uppercase tracking-tight">
          {title}
        </h2>
      </header>
      <div className="max-h-[calc(100vh-280px)] overflow-y-auto">{children}</div>
    </section>
  );
}

