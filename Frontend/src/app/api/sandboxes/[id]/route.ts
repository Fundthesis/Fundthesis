import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/apiAuth';
import { backendFetch } from '@/lib/backendApi';

export const revalidate = 0;

interface RouteParams {
  params: Promise<{ id: string }>;
}

const SandboxResponse = {
  id: '',
  name: '',
  balance: 0,
  settings: {} as { watchedStocks?: string[] },
  createdAt: '',
  positions: [] as Array<{
    id: string;
    ticker: string;
    quantity: number;
    avgPrice: number;
    createdAt?: string;
  }>,
  trades: [] as Array<{
    id: string;
    ticker: string;
    side: string;
    price: number;
    quantity: number;
    executedAt?: string;
  }>,
};

export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { error } = await requireAuth();
    if (error) return error;

    const { id } = await params;

    const data = await backendFetch<typeof SandboxResponse>(
      `/api/sandboxes/${id}`
    );

    return NextResponse.json(data);
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : String(error);
    console.error('❌ Error fetching sandbox:', errorMessage);

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
      { error: 'Failed to fetch sandbox' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { error } = await requireAuth();
    if (error) return error;

    const { id } = await params;
    const body = await request.json();

    const data = await backendFetch<typeof SandboxResponse>(
      `/api/sandboxes/${id}`,
      {
        method: 'PUT',
        body,
      }
    );

    return NextResponse.json(data);
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : String(error);
    console.error('❌ Error updating sandbox:', errorMessage);

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
      { error: 'Failed to update sandbox' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { error } = await requireAuth();
    if (error) return error;

    const { id } = await params;

    await backendFetch(`/api/sandboxes/${id}`, {
      method: 'DELETE',
    });

    return NextResponse.json({ message: 'Sandbox deleted successfully' });
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : String(error);
    console.error('❌ Error deleting sandbox:', errorMessage);

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
      { error: 'Failed to delete sandbox' },
      { status: 500 }
    );
  }
}

