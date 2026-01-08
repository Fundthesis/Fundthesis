"use client";

import React from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { RecentNewsSection } from "@/components/dashboard/RecentNewsSection";
import { PerformersSection } from "@/components/dashboard/PerformersSection";
import { SentimentHeatMap } from "@/components/dashboard/SentimentHeatMap";

export default function DashboardPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <main className="max-w-7xl mx-auto px-4 py-8">
        <PageHeader title="Dashboard" />
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
          {/* Left Column - News */}
          <div className="lg:col-span-2 space-y-6">
            <RecentNewsSection />
            <SentimentHeatMap />
          </div>
          
          {/* Right Column - Best Performers */}
          <div className="lg:col-span-1">
            <PerformersSection />
          </div>
        </div>
      </main>
    </div>
  );
}

