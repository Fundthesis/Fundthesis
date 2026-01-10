import { NextRequest, NextResponse } from 'next/server';
import { backendFetch } from '@/lib/backendApi';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ moduleNumber: string }> }
) {
  try {
    const { moduleNumber } = await params;
    const moduleNum = parseInt(moduleNumber, 10);
    
    if (isNaN(moduleNum)) {
      return NextResponse.json(
        { error: 'Invalid module number' },
        { status: 400 }
      );
    }

    const data = await backendFetch<{
      message: string;
      moduleNumber: number;
      xpEarned: number;
      totalXP: number;
    }>(`/api/users/me/modules/${moduleNum}/complete`, {
      method: 'POST',
    });

    return NextResponse.json({
      message: data.message || 'Module marked as completed',
      moduleNumber: moduleNum,
      totalXP: data.totalXP,
    });
  } catch (error) {
    console.error('Error completing module:', error);
    return NextResponse.json(
      { error: 'Failed to complete module' },
      { status: 500 }
    );
  }
}

