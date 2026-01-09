/**
 * Mission Results API
 * Handles saving and retrieving mission completion results
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import { 
  SaveMissionResultRequest, 
  MissionResultResponse, 
  MissionHistoryResponse,
  GRADE_ORDER,
  MissionGrade 
} from '@/lib/types/mission';

// GET - Fetch user's mission results
export async function GET(req: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const missionId = searchParams.get('missionId');
    const limit = parseInt(searchParams.get('limit') || '50');

    // Build query
    const whereClause: { userId: string; missionId?: string } = {
      userId: session.user.id,
    };

    if (missionId) {
      whereClause.missionId = missionId;
    }

    // Use dynamic access for newly generated model
    // Note: db is typed but we use direct prisma access with 'missionResult' check
    
    let results: Array<{
      id: string;
      missionId: string;
      grade: string;
      difficulty: string;
      returnPercent: number;
      maxDrawdown: number;
      initialBalance: number;
      finalBalance: number;
      durationDays: number;
      totalTrades: number;
      completedAt: Date;
    }> = [];
    
    try {
      if ('missionResult' in prisma) {
        results = await (prisma as unknown as { missionResult: { findMany: (args: unknown) => Promise<typeof results> } }).missionResult.findMany({
          where: whereClause,
          orderBy: { completedAt: 'desc' },
          take: limit,
          select: {
            id: true,
            missionId: true,
            grade: true,
            difficulty: true,
            returnPercent: true,
            maxDrawdown: true,
            initialBalance: true,
            finalBalance: true,
            durationDays: true,
            totalTrades: true,
            completedAt: true,
          },
        });
      }
    } catch (dbError) {
      console.warn('MissionResult table may not exist yet:', dbError);
      // Return empty results if table doesn't exist
    }

    // Calculate stats
    const totalCompleted = results.length;
    const grades = results.map((r) => r.grade as MissionGrade);
    const gradeSum = grades.reduce((sum: number, g: MissionGrade) => sum + (GRADE_ORDER[g] || 0), 0);
    const avgGradeValue = totalCompleted > 0 ? gradeSum / totalCompleted : 0;
    
    // Convert average back to letter
    let averageGrade = 'N/A';
    if (avgGradeValue >= 4.5) averageGrade = 'S';
    else if (avgGradeValue >= 3.5) averageGrade = 'A';
    else if (avgGradeValue >= 2.5) averageGrade = 'B';
    else if (avgGradeValue >= 1.5) averageGrade = 'C';
    else if (totalCompleted > 0) averageGrade = 'F';

    const bestGrade = grades.length > 0 
      ? grades.reduce((best: MissionGrade, g: MissionGrade) => (GRADE_ORDER[g] > GRADE_ORDER[best] ? g : best))
      : null;

    const totalReturn = results.reduce((sum: number, r) => sum + r.returnPercent, 0);

    const response: MissionHistoryResponse = {
      results: results.map((r) => ({
        id: r.id,
        missionId: r.missionId,
        grade: r.grade as MissionGrade,
        difficulty: r.difficulty as 'easy' | 'medium' | 'hard',
        returnPercent: r.returnPercent,
        maxDrawdown: r.maxDrawdown,
        initialBalance: r.initialBalance,
        finalBalance: r.finalBalance,
        durationDays: r.durationDays,
        totalTrades: r.totalTrades,
        completedAt: r.completedAt.toISOString(),
      })),
      stats: {
        totalCompleted,
        averageGrade,
        bestGrade,
        totalReturn,
      },
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error fetching mission results:', error);
    return NextResponse.json({ error: 'Failed to fetch results' }, { status: 500 });
  }
}

// POST - Save a new mission result
export async function POST(req: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body: SaveMissionResultRequest = await req.json();

    // Validate required fields
    if (!body.missionId || !body.grade) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Validate grade
    const validGrades: MissionGrade[] = ['S', 'A', 'B', 'C', 'F'];
    if (!validGrades.includes(body.grade)) {
      return NextResponse.json({ error: 'Invalid grade' }, { status: 400 });
    }

    // Try to create the mission result
    let result: {
      id: string;
      missionId: string;
      grade: string;
      difficulty: string;
      returnPercent: number;
      maxDrawdown: number;
      initialBalance: number;
      finalBalance: number;
      durationDays: number;
      totalTrades: number;
      completedAt: Date;
    } | null = null;

    try {
      if ('missionResult' in prisma) {
        result = await (prisma as unknown as { missionResult: { create: (args: unknown) => Promise<typeof result> } }).missionResult.create({
          data: {
            userId: session.user.id,
            missionId: body.missionId,
            grade: body.grade,
            difficulty: body.difficulty || 'medium',
            returnPercent: body.returnPercent || 0,
            maxDrawdown: body.maxDrawdown || 0,
            initialBalance: body.initialBalance || 10000,
            finalBalance: body.finalBalance || 10000,
            durationDays: body.durationDays || 60,
            totalTrades: body.totalTrades || 0,
            trades: body.trades || [],
            portfolioHistory: body.portfolioHistory || [],
          },
        });
      }
    } catch (dbError) {
      console.warn('Failed to save to MissionResult table:', dbError);
      // Table might not exist yet, return success anyway since localStorage is the backup
    }

    const response: MissionResultResponse = {
      id: result?.id || `local-${Date.now()}`,
      missionId: body.missionId,
      grade: body.grade,
      difficulty: body.difficulty || 'medium',
      returnPercent: body.returnPercent || 0,
      maxDrawdown: body.maxDrawdown || 0,
      initialBalance: body.initialBalance || 10000,
      finalBalance: body.finalBalance || 10000,
      durationDays: body.durationDays || 60,
      totalTrades: body.totalTrades || 0,
      completedAt: result?.completedAt?.toISOString() || new Date().toISOString(),
    };

    return NextResponse.json(response, { status: 201 });
  } catch (error) {
    console.error('Error saving mission result:', error);
    return NextResponse.json({ error: 'Failed to save result' }, { status: 500 });
  }
}
