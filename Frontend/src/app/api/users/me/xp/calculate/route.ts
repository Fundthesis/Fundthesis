import { NextRequest, NextResponse } from 'next/server';
import { backendFetch } from '@/lib/backendApi';
import { requireAuth } from '@/lib/apiAuth';

/**
 * Proxy route that forwards XP calculation requests to Python backend.
 * Forces recalculation of XP and returns breakdown.
 */
export async function POST(request: NextRequest) {
  try {
    // Require authentication
    const { error } = await requireAuth();
    if (error) return error;

    console.log('Proxying XP calculation request to Python backend');

    // Forward request to Python backend
    try {
      const data = await backendFetch<{
        xp: number;
        breakdown: {
          modules: number;
          missions: number;
          mission_grades: number;
          trades: number;
          streaks: number;
          total: number;
        };
      }>('/api/users/me/xp/calculate', {
        method: 'POST',
      });

      console.log('✅ Received XP calculation from Python backend');

      return NextResponse.json(data);
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
        { error: 'Failed to calculate XP' },
        { status: 500 }
      );
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('❌ Error in XP calculation proxy:', errorMessage);

    return NextResponse.json(
      { error: errorMessage || 'Unknown error' },
      { status: 500 }
    );
  }
}

