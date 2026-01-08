"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Sparkles } from "lucide-react";
import MarkdownContent from "@/components/MarkdownContent";

interface AIRecommendationsSidebarProps {
  recommendations: string;
  isLoading?: boolean;
}

export function AIRecommendationsSidebar({
  recommendations,
  isLoading,
}: AIRecommendationsSidebarProps) {
  return (
    <Card className="mt-4">
      <CardHeader>
        <CardTitle className="text-lg font-bold flex items-center gap-2">
          <Sparkles className="w-5 h-5" />
          AI Recommendations
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-2">
            <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
            <div className="h-4 bg-gray-200 rounded animate-pulse w-5/6"></div>
            <div className="h-4 bg-gray-200 rounded animate-pulse w-4/6"></div>
          </div>
        ) : recommendations ? (
          <div className="prose prose-sm max-w-none">
            <MarkdownContent content={recommendations} />
          </div>
        ) : (
          <p className="text-gray-500 text-sm">No recommendations available</p>
        )}
      </CardContent>
    </Card>
  );
}

