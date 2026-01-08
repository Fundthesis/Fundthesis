"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { TrendingUp } from "lucide-react";
import MarkdownContent from "@/components/MarkdownContent";

interface MarketSummarySidebarProps {
  summary: string;
  isLoading?: boolean;
}

export function MarketSummarySidebar({ summary, isLoading }: MarketSummarySidebarProps) {
  return (
    <Card className="sticky top-4">
      <CardHeader>
        <CardTitle className="text-lg font-bold flex items-center gap-2">
          <TrendingUp className="w-5 h-5" />
          Market Summary
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-2">
            <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
            <div className="h-4 bg-gray-200 rounded animate-pulse w-5/6"></div>
            <div className="h-4 bg-gray-200 rounded animate-pulse w-4/6"></div>
          </div>
        ) : summary ? (
          <div className="prose prose-sm max-w-none">
            <MarkdownContent content={summary} />
          </div>
        ) : (
          <p className="text-gray-500 text-sm">No market summary available</p>
        )}
      </CardContent>
    </Card>
  );
}

