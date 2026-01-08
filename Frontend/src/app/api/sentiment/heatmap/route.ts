import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/apiAuth";
import { backendFetch } from "@/lib/backendApi";

// Cache for 300 seconds (5 minutes) - sentiment aggregation is expensive
export const revalidate = 300;

export async function GET(request: NextRequest) {
  try {
    const { error } = await requireAuth();
    if (error) return error;

    const searchParams = request.nextUrl.searchParams;
    const timeframe = searchParams.get("timeframe") || "1d";
    const sectors = searchParams.get("sectors") || undefined;

    const data = await backendFetch("/api/sentiment/heatmap", {
      params: { timeframe, sectors },
    });

    return NextResponse.json(data, {
      headers: {
        "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
      },
    });
  } catch (err) {
    console.error("Error fetching sentiment heatmap:", err);
    return NextResponse.json(
      { error: "Failed to fetch sentiment heatmap" },
      { status: 500 }
    );
  }
}
