import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/apiAuth';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// POST /api/conversations/[id]/title - Generate title from first message using AI
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { session, error } = await requireAuth();
    if (error || !session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: conversationId } = await params;

    // Get conversation with first user message
    const conversation = await prisma.conversation.findFirst({
      where: {
        id: conversationId,
        userId: session.user.id,
      },
      include: {
        messages: {
          where: { role: 'user' },
          orderBy: { createdAt: 'asc' },
          take: 1,
        },
      },
    });

    if (!conversation) {
      return NextResponse.json(
        { error: 'Conversation not found' },
        { status: 404 }
      );
    }

    const firstUserMessage = conversation.messages[0]?.content;
    if (!firstUserMessage) {
      return NextResponse.json(
        { error: 'No user message to generate title from' },
        { status: 400 }
      );
    }

    let generatedTitle = firstUserMessage.substring(0, 50);

    // Try to generate a better title using AI
    const endpoint = process.env.AZURE_OPENAI_ENDPOINT;
    const apiKey = process.env.AZURE_OPENAI_API_KEY;

    if (endpoint && apiKey) {
      try {
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'api-key': apiKey,
          },
          body: JSON.stringify({
            messages: [
              {
                role: 'system',
                content:
                  'Generate a very short title (5-7 words max) that summarizes this question/message. Return ONLY the title, no quotes or punctuation at the end.',
              },
              { role: 'user', content: firstUserMessage },
            ],
            max_tokens: 30,
            temperature: 0.7,
          }),
        });

        if (response.ok) {
          const data = await response.json();
          const aiTitle = data.choices?.[0]?.message?.content?.trim();
          if (aiTitle && aiTitle.length > 0 && aiTitle.length < 100) {
            generatedTitle = aiTitle;
          }
        }
      } catch (aiError) {
        console.error('[Title API] AI generation failed:', aiError);
        // Fall back to truncated first message
      }
    }

    // Update conversation title
    await prisma.conversation.update({
      where: { id: conversationId },
      data: { title: generatedTitle },
    });

    return NextResponse.json({ title: generatedTitle });
  } catch (error) {
    console.error('Error generating title:', error);
    return NextResponse.json(
      { error: 'Failed to generate title' },
      { status: 500 }
    );
  }
}
