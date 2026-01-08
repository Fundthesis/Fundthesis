import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/apiAuth";
import { backendFetch } from "@/lib/backendApi";

// Cache for 300 seconds (5 minutes) - metadata changes less frequently
export const revalidate = 300;

export async function GET() {
  try {
    const { error } = await requireAuth();
    if (error) return error;

    const data = await backendFetch("/api/stocks/metadata");
    return NextResponse.json(data, {
      headers: {
        "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
      },
    });
  } catch (err) {
    console.error("Error fetching stock metadata:", err);
    return NextResponse.json(
      { sectors: [], industries: [], priceRange: { min: 0, max: 0 } },
      { status: 500 }
    );
  }
}
