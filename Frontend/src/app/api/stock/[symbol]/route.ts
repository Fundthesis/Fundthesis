import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/apiAuth';
import { backendFetch } from '@/lib/backendApi';

// Cache for 60 seconds (1 minute) - stock details change frequently
export const revalidate = 60;

/**
 * Thin proxy route that forwards stock detail requests to Python backend.
 * Handles authentication and forwards all requests to the backend.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ symbol: string }> },
) {
  try {
    // Require authentication
    const { error } = await requireAuth();
    if (error) return error;

    const { symbol: symbolParam } = await params;
    const symbol = symbolParam.trim().toUpperCase();
    const searchParams = request.nextUrl.searchParams;
    const days = parseInt(searchParams.get('days') || '30', 10);

    console.log(`Proxying stock detail request to Python backend: ${symbol}, days=${days}`);

    // Forward request to Python backend
    try {
      const data = await backendFetch<{
        symbol: string;
        company: string;
        price: number;
        change: number;
        changePercent: number;
        open: number;
        high: number;
        low: number;
        volume: number;
        avgVolume: number;
        fiftyTwoWeekHigh: number;
        fiftyTwoWeekLow: number;
        marketCap: number;
        peRatio: number;
        dividendYield: number;
        sector: string;
        industry: string;
        chartData: Array<{ date: string; price: number; volume?: number }>;
        forecastData: Array<{ date: string; price: number }>;
      }>(`/api/stock/${symbol}`, {
        params: { days },
      });

      console.log(`✅ Received stock detail for ${symbol} from Python backend`);

      return NextResponse.json(data, {
        headers: {
          'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120',
        },
      });
    } catch (backendError: unknown) {
      const errorMessage = backendError instanceof Error ? backendError.message : String(backendError);
      console.error(`❌ Error proxying to Python backend for ${symbol}:`, errorMessage);

      // Return appropriate error response
      if (backendError && typeof backendError === 'object' && 'status' in backendError) {
        const status = (backendError as { status: number }).status;
        return NextResponse.json(
          { error: errorMessage || 'Backend request failed' },
          { status }
        );
      }

      return NextResponse.json(
        { error: `Failed to fetch stock data for ${symbol}` },
        { status: 500 }
      );
    }
  } catch (error: unknown) {
    const { symbol: symbolParam } = await params;
    const symbol = symbolParam.toUpperCase();
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`❌ Error in stock detail proxy for ${symbol}:`, errorMessage);

    return NextResponse.json(
      { error: errorMessage || 'Unknown error' },
      { status: 500 },
    );
  }
}
