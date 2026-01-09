import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/apiAuth';

export async function GET(request: NextRequest) {
  try {
    const { session, error } = await requireAuth();
    if (error || !session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const accountId = searchParams.get('accountId');

    if (!accountId) {
      return NextResponse.json({ error: 'accountId is required' }, { status: 400 });
    }

    // Get positions from the account
    const account = await prisma.simulationAccount.findUnique({
      where: { id: accountId },
      include: {
        positions: true,
      },
    });

    if (!account) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 });
    }

    // Fetch current prices for all positions from backend API
    const baseUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';
    const holdings = await Promise.all(
      account.positions.map(async (position) => {
        try {
          // Fetch current price from backend
          const response = await fetch(`${baseUrl}/api/stock/${position.ticker}?days=1`, {
            headers: {
              'Authorization': request.headers.get('Authorization') || '',
            },
          });
          
          let currentPrice = parseFloat(position.avgPrice.toString()); // Fallback to avgPrice
          if (response.ok) {
            const data = await response.json();
            currentPrice = data.price || currentPrice;
          }
          
          const quantity = parseFloat(position.quantity.toString());
          const avgPrice = parseFloat(position.avgPrice.toString());
          const totalValue = quantity * currentPrice;
          const gainLoss = (currentPrice - avgPrice) * quantity;
          const gainLossPercent = avgPrice > 0 ? ((currentPrice - avgPrice) / avgPrice) * 100 : 0;

          return {
            symbol: position.ticker,
            quantity,
            avgPrice,
            currentPrice,
            totalValue,
            gainLoss,
            gainLossPercent,
          };
        } catch (error) {
          console.error(`Error fetching price for ${position.ticker}:`, error);
          // Fallback to avgPrice if API call fails
          const quantity = parseFloat(position.quantity.toString());
          const avgPrice = parseFloat(position.avgPrice.toString());
          return {
            symbol: position.ticker,
            quantity,
            avgPrice,
            currentPrice: avgPrice,
            totalValue: quantity * avgPrice,
            gainLoss: 0,
            gainLossPercent: 0,
          };
        }
      })
    );

    return NextResponse.json({ holdings });
  } catch (error) {
    console.error('Error fetching holdings:', error);
    return NextResponse.json(
      { error: 'Failed to fetch holdings' },
      { status: 500 }
    );
  }
}
