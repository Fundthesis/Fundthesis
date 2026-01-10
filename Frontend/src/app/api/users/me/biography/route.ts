import { NextRequest, NextResponse } from 'next/server';
import { backendFetch } from '@/lib/backendApi';
import { requireAuth } from '@/lib/apiAuth';

export const revalidate = 30; // Revalidate every 30 seconds

/**
 * Proxy route that forwards biography requests to Python backend.
 * Handles authentication and forwards all requests to the backend.
 */
export async function GET(request: NextRequest) {
  try {
    // Require authentication
    const { error } = await requireAuth();
    if (error) return error;

    console.log('Proxying biography request to Python backend');

    // Forward request to Python backend
    try {
      const data = await backendFetch<{
        xp: number;
        archetype: string;
        achievements: string[];
        rank: {
          level: number;
          title: string;
          requiredXP: number;
        };
        nextRank: {
          level: number;
          title: string;
          requiredXP: number;
        } | null;
        progress: number;
      }>('/api/users/me/biography');

      console.log('✅ Received biography data from Python backend');

      return NextResponse.json(data, {
        headers: {
          'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60',
        },
      });
    } catch (backendError: unknown) {
      const errorMessage =
        backendError instanceof Error
          ? backendError.message
          : String(backendError);
      console.error('❌ Error proxying to Python backend:', errorMessage);

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
        { error: 'Failed to fetch biography data' },
        { status: 500 }
      );
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('❌ Error in biography proxy:', errorMessage);

    return NextResponse.json(
      { error: errorMessage || 'Unknown error' },
      { status: 500 }
    );
  }
}

