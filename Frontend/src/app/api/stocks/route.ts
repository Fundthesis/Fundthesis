import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/apiAuth";
import { backendFetch } from "@/lib/backendApi";

// Debug logging helper - set DEBUG_LOGS=true in .env to enable
const debugLog = (...args: unknown[]) => {
  if (process.env.DEBUG_LOGS === "true") console.log(...args);
};

const MAX_SYMBOLS = 50;

// Cache for 60 seconds (1 minute) - stocks data changes frequently
export const revalidate = 60;

/**
 * Thin proxy route that forwards stock list requests to Python backend.
 * Handles authentication and forwards all requests to the backend.
 */
export async function GET(request: NextRequest) {
  try {
    // Require authentication
    const { error } = await requireAuth();
    if (error) return error;

    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get("limit") || "20", 10);
    const offset = parseInt(searchParams.get("offset") || "0", 10);
    const symbolsParam = searchParams.get("symbols");

    debugLog(
      `Proxying stocks request to Python backend: limit=${limit}, offset=${offset}, symbols=${
        symbolsParam || "none"
      }`
    );

    // Validate and limit custom symbols to prevent abuse
    let symbols: string | undefined = undefined;
    if (symbolsParam && symbolsParam !== "null") {
      const customSymbols = Array.from(
        new Set(
          symbolsParam
            .split(",")
            .map((symbol) => symbol.trim().toUpperCase())
            .filter((symbol) => symbol.length > 0)
        )
      );

      if (customSymbols.length > MAX_SYMBOLS) {
        return NextResponse.json(
          { error: `Maximum ${MAX_SYMBOLS} symbols allowed` },
          { status: 400 }
        );
      }

      if (customSymbols.length > 0) {
        symbols = customSymbols.join(",");
      }
    }

    // Forward request to Python backend
    const params: Record<string, string | number> = {
      limit,
      offset,
    };

    if (symbols) {
      params.symbols = symbols;
    }

    try {
      const data = await backendFetch<{
        stocks: Array<{
          symbol: string;
          price: number;
          change: number;
          changePercent: number;
        }>;
        total: number;
        offset: number;
        limit: number;
        hasMore: boolean;
      }>("/api/stocks", { params });

      debugLog(`✅ Received ${data.stocks.length} stocks from Python backend`);

      return NextResponse.json(data, {
        headers: {
          "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120",
        },
      });
    } catch (backendError: unknown) {
      const errorMessage =
        backendError instanceof Error
          ? backendError.message
          : String(backendError);
      console.error("❌ Error proxying to Python backend:", errorMessage);

      // Return appropriate error response
      if (
        backendError &&
        typeof backendError === "object" &&
        "status" in backendError
      ) {
        const status = (backendError as { status: number }).status;
        return NextResponse.json(
          { error: errorMessage || "Backend request failed" },
          { status }
        );
      }

      return NextResponse.json(
        { error: "Failed to fetch stocks from backend" },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Error in /api/stocks proxy:", error);
    return NextResponse.json(
      { error: "Failed to fetch stocks" },
      { status: 500 }
    );
  }
}
