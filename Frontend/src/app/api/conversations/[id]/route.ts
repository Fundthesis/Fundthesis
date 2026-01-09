import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/apiAuth';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/conversations/[id] - Get conversation with messages
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { session, error } = await requireAuth();
    if (error || !session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    // Fetch conversation with retry logic
    let conversation;
    let retries = 3;
    while (retries > 0) {
      try {
        conversation = await prisma.conversation.findFirst({
          where: {
            id,
            userId: session.user.id,
          },
          include: {
            messages: {
              orderBy: { createdAt: 'asc' },
            },
          },
        });
        break; // Success, exit retry loop
      } catch (dbError: unknown) {
        retries--;
        const errorMessage = dbError instanceof Error ? dbError.message : String(dbError);
        
        // Check if it's a connection error
        if (errorMessage.includes('Connection terminated') || 
            errorMessage.includes('Connection closed') ||
            errorMessage.includes('ECONNRESET')) {
          if (retries > 0) {
            console.warn(`[Conversations API] Database connection error, retrying... (${retries} attempts left)`);
            await new Promise(resolve => setTimeout(resolve, 1000));
            continue;
          }
        }
        // If it's not a connection error or we're out of retries, throw
        throw dbError;
      }
    }

    if (!conversation) {
      return NextResponse.json(
        { error: 'Conversation not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      conversation: {
        id: conversation.id,
        title: conversation.title,
        createdAt: conversation.createdAt,
        updatedAt: conversation.updatedAt,
        messages: conversation.messages.map((m) => ({
          id: m.id,
          role: m.role,
          content: m.content,
          citations: m.citations,
          sources: m.sources,
          createdAt: m.createdAt,
        })),
      },
    });
  } catch (error) {
    console.error('Error fetching conversation:', error);
    return NextResponse.json(
      { error: 'Failed to fetch conversation' },
      { status: 500 }
    );
  }
}

// PATCH /api/conversations/[id] - Update conversation (rename)
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { session, error } = await requireAuth();
    if (error || !session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { title } = body;

    if (!title || typeof title !== 'string') {
      return NextResponse.json(
        { error: 'Title is required' },
        { status: 400 }
      );
    }

    // Verify ownership and update with retry logic
    let conversation: { count: number } | undefined;
    let retries = 3;
    while (retries > 0) {
      try {
        conversation = await prisma.conversation.updateMany({
          where: {
            id,
            userId: session.user.id,
          },
          data: { title },
        });
        break; // Success, exit retry loop
      } catch (dbError: unknown) {
        retries--;
        const errorMessage = dbError instanceof Error ? dbError.message : String(dbError);
        
        // Check if it's a connection error
        if (errorMessage.includes('Connection terminated') || 
            errorMessage.includes('Connection closed') ||
            errorMessage.includes('ECONNRESET')) {
          if (retries > 0) {
            console.warn(`[Conversations API] Database connection error on update, retrying... (${retries} attempts left)`);
            await new Promise(resolve => setTimeout(resolve, 1000));
            continue;
          }
        }
        // If it's not a connection error or we're out of retries, throw
        throw dbError;
      }
    }

    if (!conversation || conversation.count === 0) {
      return NextResponse.json(
        { error: 'Conversation not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, title });
  } catch (error) {
    console.error('Error updating conversation:', error);
    return NextResponse.json(
      { error: 'Failed to update conversation' },
      { status: 500 }
    );
  }
}

// DELETE /api/conversations/[id] - Delete conversation
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { session, error } = await requireAuth();
    if (error || !session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    // Verify ownership and delete (cascade deletes messages) with retry logic
    let result: { count: number } | undefined;
    let retries = 3;
    while (retries > 0) {
      try {
        result = await prisma.conversation.deleteMany({
          where: {
            id,
            userId: session.user.id,
          },
        });
        break; // Success, exit retry loop
      } catch (dbError: unknown) {
        retries--;
        const errorMessage = dbError instanceof Error ? dbError.message : String(dbError);
        
        // Check if it's a connection error
        if (errorMessage.includes('Connection terminated') || 
            errorMessage.includes('Connection closed') ||
            errorMessage.includes('ECONNRESET')) {
          if (retries > 0) {
            console.warn(`[Conversations API] Database connection error on delete, retrying... (${retries} attempts left)`);
            await new Promise(resolve => setTimeout(resolve, 1000));
            continue;
          }
        }
        // If it's not a connection error or we're out of retries, throw
        throw dbError;
      }
    }

    if (!result || result.count === 0) {
      return NextResponse.json(
        { error: 'Conversation not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting conversation:', error);
    return NextResponse.json(
      { error: 'Failed to delete conversation' },
      { status: 500 }
    );
  }
}
