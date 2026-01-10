import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/apiAuth';
import { backendFetch } from '@/lib/backendApi';

export const revalidate = 0;

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { error } = await requireAuth();
    if (error) return error;

    const { id } = await params;
    const body = await request.json();
    const { ticker, side, price, quantity } = body;

    if (!ticker || !side || price === undefined || quantity === undefined) {
      return NextResponse.json(
        { error: 'Ticker, side, price, and quantity are required' },
        { status: 400 }
      );
    }

    if (side !== 'buy' && side !== 'sell') {
      return NextResponse.json(
        { error: "Side must be 'buy' or 'sell'" },
        { status: 400 }
      );
    }

    const data = await backendFetch<{
      id: string;
      ticker: string;
      side: string;
      price: number;
      quantity: number;
      executedAt?: string;
    }>(`/api/sandboxes/${id}/trades`, {
      method: 'POST',
      body: { ticker, side, price, quantity },
    });

    return NextResponse.json(data);
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : String(error);
    console.error('❌ Error executing trade:', errorMessage);

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
      { error: 'Failed to execute trade' },
      { status: 500 }
    );
  }
}

