import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/apiAuth";
import {
  Article,
  formatArticlesForPrompt,
  generateMarketSummary,
  generateAIRecommendations,
} from "@/lib/insightsHelpers";

// Cache for 300 seconds (5 minutes) - AI generation is expensive
export const revalidate = 300;

export async function GET(request: NextRequest) {
  try {
    // Require authentication
    const { error } = await requireAuth();
    if (error) return error;

    const searchParams = request.nextUrl.searchParams;
    const type = searchParams.get("type") || "both";

    // Get articles from last 24 hours, with fallback to last 7 days if needed
    const twentyFourHoursAgo = new Date();
    twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    let articles = await prisma.article.findMany({
      where: {
        publishedAt: {
          gte: twentyFourHoursAgo,
        },
      },
      orderBy: {
        publishedAt: "desc",
      },
      take: 30,
      select: {
        headline: true,
        summary: true,
        label: true,
        source: true,
        publishedAt: true,
        tickers: true,
      },
    });

    // If no articles in last 24 hours, try last 7 days
    if (!articles || articles.length === 0) {
      console.log("No articles in last 24 hours, trying last 7 days...");
      articles = await prisma.article.findMany({
        where: {
          publishedAt: {
            gte: sevenDaysAgo,
          },
        },
        orderBy: {
          publishedAt: "desc",
        },
        take: 30,
        select: {
          headline: true,
          summary: true,
          label: true,
          source: true,
          publishedAt: true,
          tickers: true,
        },
      });
    }

    const articlesList = (articles || []) as Article[];
    const articlesText = formatArticlesForPrompt(articlesList);

    console.log(`Fetched ${articlesList.length} articles for insights generation`);

    // Generate insights based on type
    let marketSummary = "";
    let aiRecommendations = "";

    if (type === "summary" || type === "both") {
      marketSummary = await generateMarketSummary(articlesText);
    }

    if (type === "recommendations" || type === "both") {
      aiRecommendations = await generateAIRecommendations(articlesText);
    }

    return NextResponse.json(
      {
        market_summary: marketSummary || undefined,
        ai_recommendations: aiRecommendations || undefined,
        articles_analyzed: articlesList.length,
        generated_at: new Date().toISOString(),
      },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
        },
      }
    );
  } catch (error) {
    console.error("Error generating insights:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to generate insights",
      },
      { status: 500 }
    );
  }
}
