import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get or create user stats
    let userStats = await prisma.userStats.findUnique({
      where: { userId },
    });

    if (!userStats) {
      // Create default stats for new user
      userStats = await prisma.userStats.create({
        data: {
          userId,
          totalPractices: 0,
          averageScore: 0,
          currentStreak: 0,
          longestStreak: 0,
          totalTimeMs: 0,
        },
      });
    }

    return NextResponse.json(userStats);
  } catch (error) {
    console.error('Error fetching user stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch user stats' },
      { status: 500 }
    );
  }
}
