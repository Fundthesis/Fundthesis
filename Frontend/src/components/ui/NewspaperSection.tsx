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
    <section className={`border border-stone-200 bg-white/80 backdrop-blur-md p-5 shadow-sm ${className}`}>
      <header className={`border-b-2 border-black pb-2 mb-4 ${headerClassName}`}>
        <h2 className="font-serif text-xl font-bold text-black uppercase tracking-tight">
          {title}
        </h2>
      </header>
      <div className="max-h-[calc(100vh-280px)] overflow-y-auto">{children}</div>
    </section>
  );
}

