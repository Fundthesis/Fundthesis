import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get("limit") || "20", 10);
    const offset = parseInt(searchParams.get("offset") || "0", 10);
    const category = searchParams.get("category");
    const source = searchParams.get("source");
    const tickers = searchParams.get("tickers");
    const search = searchParams.get("search");
    const orderBy = searchParams.get("orderBy") || "published_at";
    const orderDirection = searchParams.get("orderDirection") || "desc";

    const where: Prisma.ArticleWhereInput = {};

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
        { full_text: { contains: search, mode: 'insensitive' } }
      ];
    }

    const validOrderBy = ["published_at", "inserted_at", "headline", "source"];
    const orderByField = validOrderBy.includes(orderBy) ? orderBy : "published_at";
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

    return NextResponse.json({
      articles,
      total: count,
      offset,
      limit,
      hasMore: offset + limit < count,
    });
  } catch (error) {
    console.error("Error in /api/articles:", error);
    return NextResponse.json(
      { error: "Failed to fetch articles" },
      { status: 500 }
    );
  }
}
