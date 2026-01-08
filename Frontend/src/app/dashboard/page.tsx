"use client";

import React from "react";
import { NewspaperLayout } from "@/components/ui/NewspaperLayout";
import { RecentNewsSection } from "@/components/dashboard/RecentNewsSection";
import { PerformersSection } from "@/components/dashboard/PerformersSection";
import { SentimentHeatMap } from "@/components/dashboard/SentimentHeatMap";
import { WatchlistSection } from "@/components/dashboard/WatchlistSection";

export default function DashboardPage() {
  return (
    <NewspaperLayout
      title="The Market Chronicle"
      subtitle="All the News Fit to Trade"
      maxWidth="max-w-7xl"
    >
      {/* Three-column layout: News sidebar (360px) | Main content (fluid) | Watchlist sidebar (380px) */}
      <div className="grid grid-cols-1 lg:grid-cols-[360px_1fr_380px] gap-6">
        {/* Left Sidebar - News */}
        <aside className="hidden lg:block">
          <RecentNewsSection />
        </aside>

        {/* Main Content - Heat Map and Performers */}
        <main className="space-y-6">
          <SentimentHeatMap />
          <PerformersSection />
        </main>

        {/* Right Sidebar - Watchlist */}
        <aside className="hidden lg:block">
          <WatchlistSection />
        </aside>
      </div>

      {/* Mobile/Tablet: Stack layout */}
      <div className="lg:hidden space-y-6">
        <RecentNewsSection />
        <SentimentHeatMap />
        <PerformersSection />
      </div>
    </NewspaperLayout>
  );
}
