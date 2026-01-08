import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/apiAuth";

// Type definition for Article where clause (needed when Prisma client isn't generated)
type ArticleWhereInput = {
  category?: string;
  source?: string;
  tickers?: { contains: string; mode?: 'insensitive' };
  OR?: Array<{ headline?: { contains: string; mode?: 'insensitive' }; summary?: { contains: string; mode?: 'insensitive' }; fullText?: { contains: string; mode?: 'insensitive' }; tickers?: { contains: string; mode?: 'insensitive' } }>;
};

const MAX_LIMIT = 100;

// Cache for 60 seconds (1 minute) - articles update frequently
export const revalidate = 60;

export async function GET(request: NextRequest) {
  try {
    // Require authentication
    const { error } = await requireAuth();
    if (error) return error;

    const searchParams = request.nextUrl.searchParams;
    const rawLimit = parseInt(searchParams.get("limit") || "20", 10);
    const rawOffset = parseInt(searchParams.get("offset") || "0", 10);

    // Validate and constrain pagination
    const limit = Math.min(Math.max(1, rawLimit), MAX_LIMIT);
    const offset = Math.max(0, rawOffset);
    const category = searchParams.get("category");
    const source = searchParams.get("source");
    const tickers = searchParams.get("tickers");
    const search = searchParams.get("search");
    const orderBy = searchParams.get("orderBy") || "publishedAt";
    const orderDirection = searchParams.get("orderDirection") || "desc";

    const where: ArticleWhereInput = {};

    if (category) {
      where.category = category;
    }

    if (source) {
      where.source = source;
    }

    if (tickers) {
      const tickerArray = tickers.split(",").map((t) => t.trim().toUpperCase());
      if (tickerArray.length === 1) {
        where.tickers = { contains: tickerArray[0], mode: 'insensitive' };
      } else {
        where.OR = tickerArray.map(t => ({ tickers: { contains: t, mode: 'insensitive' } }));
      }
    }

    if (search) {
      where.OR = [
        { headline: { contains: search, mode: 'insensitive' } },
        { summary: { contains: search, mode: 'insensitive' } },
        { fullText: { contains: search, mode: 'insensitive' } }
      ];
    }

    const validOrderBy = ["publishedAt", "insertedAt", "headline", "source"];
    const orderByField = validOrderBy.includes(orderBy) ? orderBy : "publishedAt";
    const orderDir = orderDirection.toLowerCase() === "asc" ? "asc" : "desc";

    const [articles, count] = await Promise.all([
      prisma.article.findMany({
        where,
        orderBy: { [orderByField]: orderDir },
        skip: offset,
        take: limit,
      }),
      prisma.article.count({ where }),
    ]);

    return NextResponse.json(
      {
        articles,
        total: count,
        offset,
        limit,
        hasMore: offset + limit < count,
      },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120',
        },
      }
    );
  } catch (error) {
    console.error("Error in /api/articles:", error);
    return NextResponse.json(
      { error: "Failed to fetch articles" },
      { status: 500 }
    );
  }
}
