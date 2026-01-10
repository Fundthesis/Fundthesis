import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/apiAuth';
import { backendFetch } from '@/lib/backendApi';

export const revalidate = 0;

/**
 * Proxy route for sandbox list and creation.
 */
export async function GET(request: NextRequest) {
  try {
    const { error } = await requireAuth();
    if (error) return error;

    const data = await backendFetch<Array<{
      id: string;
      name: string;
      balance: number;
      settings?: { watchedStocks?: string[] };
      createdAt: string;
      positions: Array<{
        id: string;
        ticker: string;
        quantity: number;
        avgPrice: number;
        createdAt?: string;
      }>;
      trades: Array<{
        id: string;
        ticker: string;
        side: string;
        price: number;
        quantity: number;
        executedAt?: string;
      }>;
    }>>('/api/sandboxes');

    return NextResponse.json(data);
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : String(error);
    console.error('❌ Error proxying sandboxes request:', errorMessage);

    if (
      error &&
      typeof error === 'object' &&
      'status' in error
    ) {
      const status = (error as { status: number }).status;
      return NextResponse.json(
        { error: errorMessage || 'Backend request failed' },
        { status }
      );
    }

    return NextResponse.json(
      { error: 'Failed to fetch sandboxes' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { error } = await requireAuth();
    if (error) return error;

    const body = await request.json();
    const { name, balance } = body;

    if (!name || balance === undefined) {
      return NextResponse.json(
        { error: 'Name and balance are required' },
        { status: 400 }
      );
    }

    const data = await backendFetch<{
      id: string;
      name: string;
      balance: number;
      settings?: { watchedStocks?: string[] };
      createdAt: string;
      positions: Array<{
        id: string;
        ticker: string;
        quantity: number;
        avgPrice: number;
        createdAt?: string;
      }>;
      trades: Array<{
        id: string;
        ticker: string;
        side: string;
        price: number;
        quantity: number;
        executedAt?: string;
      }>;
    }>('/api/sandboxes', {
      method: 'POST',
      body: { name, balance },
    });

    return NextResponse.json(data);
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : String(error);
    console.error('❌ Error creating sandbox:', errorMessage);

    if (
      error &&
      typeof error === 'object' &&
      'status' in error
    ) {
      const status = (error as { status: number }).status;
      return NextResponse.json(
        { error: errorMessage || 'Backend request failed' },
        { status }
      );
    }

    return NextResponse.json(
      { error: 'Failed to create sandbox' },
      { status: 500 }
    );
  }
}

