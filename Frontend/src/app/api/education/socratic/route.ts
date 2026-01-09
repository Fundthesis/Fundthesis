import { NextRequest, NextResponse } from 'next/server';

/**
 * Education Socratic API Route
 * 
 * Calls the backend education/socratic endpoint for Socratic method guidance.
 */

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8000';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { question, student_context } = body;

    if (!question) {
      return NextResponse.json({ error: 'Question is required' }, { status: 400 });
    }

    try {
      const response = await fetch(`${BACKEND_URL}/api/education/socratic`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question,
          student_context: student_context || {},
        }),
      });

      if (response.ok) {
        const data = await response.json();
        return NextResponse.json({
          guidance: data.guidance || data.message,
          hints: data.hints || [],
          related_concepts: data.related_concepts || [],
        });
      }

      // If backend returns error, return a helpful fallback
      const errorText = await response.text();
      console.error('[Education Socratic] Backend error:', errorText);
      
      return NextResponse.json({
        guidance: "I'm here to help you think through this. Let me ask you a question: What specific aspect of this mission are you trying to understand?",
        hints: [],
        related_concepts: [],
      });
    } catch (error) {
      console.error('[Education Socratic] Backend unavailable:', error);
      
      // Fallback response when backend is unavailable
      return NextResponse.json({
        guidance: "I'm here to guide you through this mission using the Socratic method. Instead of giving you direct answers, I'll ask questions to help you discover insights yourself. What would you like to explore about this mission?",
        hints: ['Review the mission objectives', 'Consider how your portfolio decisions relate to the scenario'],
        related_concepts: [],
      });
    }
  } catch (error) {
    console.error('[Education Socratic] Request error:', error);
    return NextResponse.json(
      { error: 'Failed to process request' },
      { status: 500 }
    );
  }
}
