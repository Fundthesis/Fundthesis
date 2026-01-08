import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/apiAuth';
import { backendFetch } from '@/lib/backendApi';

// Cache for 60 seconds (1 minute) - chart data changes with timeframe
export const revalidate = 60;

/**
 * Thin proxy route that forwards stock chart requests to Python backend.
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

    console.log(`Proxying stock chart request to Python backend: ${symbol}, days=${days}`);

    // Forward request to Python backend
    try {
      const data = await backendFetch<{
        chartData: Array<{ date: string; price: number }>;
        forecastData?: Array<{ date: string; price: number }>;
      }>(`/api/stock/${symbol}/chart`, {
        params: { days },
      });

      console.log(`✅ Received chart data for ${symbol} from Python backend`);

      return NextResponse.json(data, {
        headers: {
          'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120',
        },
      });
    } catch (backendError: unknown) {
      const errorMessage =
        backendError instanceof Error
          ? backendError.message
          : String(backendError);
      console.error(`❌ Error proxying to Python backend for ${symbol}:`, errorMessage);

      // Return appropriate error response
      if (
        backendError &&
        typeof backendError === 'object' &&
        'status' in backendError
      ) {
        const status = (backendError as { status: number }).status;
        return NextResponse.json(
          { error: errorMessage || 'Backend request failed' },
          { status }
        );
      }

      return NextResponse.json(
        { error: `Failed to fetch chart data for ${symbol}` },
        { status: 500 }
      );
    }
  } catch (error: unknown) {
    const { symbol: symbolParam } = await params;
    const symbol = symbolParam.toUpperCase();
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`❌ Error in stock chart proxy for ${symbol}:`, errorMessage);

    return NextResponse.json(
      { error: errorMessage || 'Unknown error' },
      { status: 500 },
    );
  }
}

