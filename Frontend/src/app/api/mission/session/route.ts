import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const missionId = searchParams.get('missionId');

    if (!missionId) {
      return NextResponse.json({ error: 'missionId is required' }, { status: 400 });
    }

    const session = await prisma.missionSession.findUnique({
      where: {
        userId_missionId: {
          userId: user.id,
          missionId,
        },
      },
      include: {
        account: {
          include: {
            positions: true,
            trades: {
              orderBy: {
                executedAt: 'desc',
              },
              take: 50,
            },
          },
        },
      },
    });

    if (!session) {
      return NextResponse.json({ session: null });
    }

    return NextResponse.json({
      session: {
        id: session.id,
        missionId: session.missionId,
        accountId: session.accountId,
        simulatedDate: session.simulatedDate,
        isPaused: session.isPaused,
        timeSpeed: session.timeSpeed,
        elapsedSeconds: session.elapsedSeconds,
        account: {
          id: session.account.id,
          balance: session.account.balance.toString(),
          positions: session.account.positions.map((p) => ({
            id: p.id,
            ticker: p.ticker,
            quantity: p.quantity.toString(),
            avgPrice: p.avgPrice.toString(),
          })),
          trades: session.account.trades.map((t) => ({
            id: t.id,
            ticker: t.ticker,
            side: t.side,
            price: t.price.toString(),
            quantity: t.quantity.toString(),
            executedAt: t.executedAt,
          })),
        },
      },
    });
  } catch (error) {
    console.error('Error fetching mission session:', error);
    return NextResponse.json(
      { error: 'Failed to fetch mission session' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { missionId, accountId, simulatedDate, isPaused, timeSpeed, elapsedSeconds } = body;

    if (!missionId || !accountId) {
      return NextResponse.json(
        { error: 'missionId and accountId are required' },
        { status: 400 }
      );
    }

    const session = await prisma.missionSession.upsert({
      where: {
        userId_missionId: {
          userId: user.id,
          missionId,
        },
      },
      create: {
        userId: user.id,
        missionId,
        accountId,
        simulatedDate: simulatedDate ? new Date(simulatedDate) : new Date(),
        isPaused: isPaused ?? false,
        timeSpeed: timeSpeed ?? 1.0,
        elapsedSeconds: elapsedSeconds ?? 0,
      },
      update: {
        simulatedDate: simulatedDate ? new Date(simulatedDate) : undefined,
        isPaused: isPaused !== undefined ? isPaused : undefined,
        timeSpeed: timeSpeed !== undefined ? timeSpeed : undefined,
        elapsedSeconds: elapsedSeconds !== undefined ? elapsedSeconds : undefined,
      },
      include: {
        account: {
          include: {
            positions: true,
          },
        },
      },
    });

    return NextResponse.json({
      session: {
        id: session.id,
        missionId: session.missionId,
        accountId: session.accountId,
        simulatedDate: session.simulatedDate,
        isPaused: session.isPaused,
        timeSpeed: session.timeSpeed,
        elapsedSeconds: session.elapsedSeconds,
      },
    });
  } catch (error) {
    console.error('Error creating/updating mission session:', error);
    return NextResponse.json(
      { error: 'Failed to create/update mission session' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const user = await requireAuth(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { missionId, simulatedDate, isPaused, timeSpeed, elapsedSeconds } = body;

    if (!missionId) {
      return NextResponse.json(
        { error: 'missionId is required' },
        { status: 400 }
      );
    }

    const session = await prisma.missionSession.update({
      where: {
        userId_missionId: {
          userId: user.id,
          missionId,
        },
      },
      data: {
        ...(simulatedDate && { simulatedDate: new Date(simulatedDate) }),
        ...(isPaused !== undefined && { isPaused }),
        ...(timeSpeed !== undefined && { timeSpeed }),
        ...(elapsedSeconds !== undefined && { elapsedSeconds }),
      },
    });

    return NextResponse.json({
      session: {
        id: session.id,
        missionId: session.missionId,
        simulatedDate: session.simulatedDate,
        isPaused: session.isPaused,
        timeSpeed: session.timeSpeed,
        elapsedSeconds: session.elapsedSeconds,
      },
    });
  } catch (error) {
    console.error('Error updating mission session:', error);
    return NextResponse.json(
      { error: 'Failed to update mission session' },
      { status: 500 }
    );
  }
}
