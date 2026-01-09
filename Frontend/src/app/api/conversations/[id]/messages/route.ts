import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/apiAuth';
import { Prisma } from '@prisma/client';

interface RouteParams {
  params: Promise<{ id: string }>;
}

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8000';

// POST /api/conversations/[id]/messages - Send message and get AI response
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { session, error } = await requireAuth();
    if (error || !session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: conversationId } = await params;
    const body = await request.json();
    const { content } = body;

    if (!content || typeof content !== 'string') {
      return NextResponse.json(
        { error: 'Message content is required' },
        { status: 400 }
      );
    }

    // Verify conversation exists and belongs to user
    const conversation = await prisma.conversation.findFirst({
      where: {
        id: conversationId,
        userId: session.user.id,
      },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
          take: 20, // Last 20 messages for context
        },
      },
    });

    if (!conversation) {
      return NextResponse.json(
        { error: 'Conversation not found' },
        { status: 404 }
      );
    }

    // Save user message
    const userMessage = await prisma.message.create({
      data: {
        conversationId,
        role: 'user',
        content,
      },
    });

    // Build conversation history for AI
    const conversationHistory = conversation.messages.map((m) => ({
      role: m.role,
      content: m.content,
    }));

    // Get AI response
    let aiResponse = {
      message: "I apologize, but I'm having trouble connecting at the moment. Please try again shortly.",
      citations: [] as string[],
      sources: [] as Record<string, unknown>[],
      suggestedActions: [] as string[],
    };

    try {
      // Try backend RAG pipeline first
      const ragResponse = await fetch(`${BACKEND_URL}/api/coach`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: content,
          context: {},
          conversation_history: conversationHistory,
          userId: session.user.id,
        }),
      });

      if (ragResponse.ok) {
        const ragData = await ragResponse.json();
        aiResponse = {
          message: ragData.message,
          citations: ragData.citations || [],
          sources: ragData.sources || [],
          suggestedActions: ragData.suggested_actions || [],
        };
      }
    } catch (ragError) {
      console.error('[Messages API] Backend RAG unavailable:', ragError);
      // Fallback to Azure OpenAI directly
      const endpoint = process.env.AZURE_OPENAI_ENDPOINT;
      const apiKey = process.env.AZURE_OPENAI_API_KEY;

      if (endpoint && apiKey) {
        try {
          const systemPrompt = `You are "The Editor" - an AI investment coach for FundThesis, an educational platform teaching retail investors.

Your teaching method:
- Use the Socratic method: guide users to discover answers themselves through questions
- Never give direct investment advice or stock picks
- Keep responses concise (2-3 paragraphs max)
- Use a gentle, encouraging newspaper-editor tone
- Ask follow-up questions to deepen understanding

Remember: Your goal is education, not financial advice. Guide them to think critically about investments.`;

          const apiMessages = conversationHistory.slice(-6).map((msg) => ({
            role: msg.role === 'coach' ? 'assistant' : 'user',
            content: msg.content,
          }));
          apiMessages.push({ role: 'user', content });

          const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'api-key': apiKey,
            },
            body: JSON.stringify({
              messages: [{ role: 'system', content: systemPrompt }, ...apiMessages],
              max_tokens: 500,
              temperature: 0.7,
            }),
          });

          if (response.ok) {
            const data = await response.json();
            aiResponse.message = data.choices?.[0]?.message?.content || aiResponse.message;
          }
        } catch (openaiError) {
          console.error('[Messages API] Azure OpenAI error:', openaiError);
        }
      }
    }

    // Save coach message with retry logic for connection issues
    let coachMessage;
    let retries = 3;
    while (retries > 0) {
      try {
        coachMessage = await prisma.message.create({
          data: {
            conversationId,
            role: 'coach',
            content: aiResponse.message,
            citations: aiResponse.citations as Prisma.InputJsonValue,
            sources: aiResponse.sources as Prisma.InputJsonValue,
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
            console.warn(`[Messages API] Database connection error, retrying... (${retries} attempts left)`);
            // Wait a bit before retrying
            await new Promise(resolve => setTimeout(resolve, 1000));
            continue;
          }
        }
        // If it's not a connection error or we're out of retries, throw
        throw dbError;
      }
    }

    if (!coachMessage) {
      throw new Error('Failed to save coach message after retries');
    }

    // Update conversation's updatedAt and possibly generate title
    const messageCount = conversation.messages.length;
    const shouldGenerateTitle =
      messageCount === 0 && conversation.title === 'New conversation';

    // Update conversation with retry logic
    retries = 3;
    while (retries > 0) {
      try {
        if (shouldGenerateTitle) {
          // Generate title from first message (simple truncation for now, can be AI-generated)
          const generatedTitle = content.length > 50
            ? content.substring(0, 47) + '...'
            : content;

          await prisma.conversation.update({
            where: { id: conversationId },
            data: { title: generatedTitle },
          });
        } else {
          // Just touch updatedAt
          await prisma.conversation.update({
            where: { id: conversationId },
            data: { updatedAt: new Date() },
          });
        }
        break; // Success, exit retry loop
      } catch (dbError: unknown) {
        retries--;
        const errorMessage = dbError instanceof Error ? dbError.message : String(dbError);
        
        // Check if it's a connection error
        if (errorMessage.includes('Connection terminated') || 
            errorMessage.includes('Connection closed') ||
            errorMessage.includes('ECONNRESET')) {
          if (retries > 0) {
            console.warn(`[Messages API] Database connection error on update, retrying... (${retries} attempts left)`);
            await new Promise(resolve => setTimeout(resolve, 1000));
            continue;
          }
        }
        // If it's not a connection error or we're out of retries, log but don't fail the request
        console.error('[Messages API] Failed to update conversation:', dbError);
        break; // Don't throw, the message was already saved
      }
    }

    return NextResponse.json({
      userMessage: {
        id: userMessage.id,
        role: userMessage.role,
        content: userMessage.content,
        createdAt: userMessage.createdAt,
      },
      coachMessage: {
        id: coachMessage.id,
        role: coachMessage.role,
        content: coachMessage.content,
        citations: coachMessage.citations,
        sources: coachMessage.sources,
        createdAt: coachMessage.createdAt,
      },
      suggestedActions: aiResponse.suggestedActions,
    });
  } catch (error) {
    console.error('Error sending message:', error);
    return NextResponse.json(
      { error: 'Failed to send message' },
      { status: 500 }
    );
  }
}
