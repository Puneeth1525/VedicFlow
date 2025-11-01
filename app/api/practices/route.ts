import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET all practices for the current user
export async function GET(request: Request) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const mantraId = searchParams.get('mantraId');

    const practices = await prisma.practice.findMany({
      where: {
        userId,
        ...(mantraId && { mantraId }),
      },
      include: {
        mantra: true,
        recordings: {
          orderBy: { createdAt: 'desc' },
        },
      },
      orderBy: {
        date: 'desc',
      },
    });

    return NextResponse.json(practices);
  } catch (error) {
    console.error('Error fetching practices:', error);
    return NextResponse.json(
      { error: 'Failed to fetch practices' },
      { status: 500 }
    );
  }
}

// POST create a new practice session
export async function POST(request: Request) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { mantraId, durationMs } = body;

    if (!mantraId || !durationMs) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const practice = await prisma.practice.create({
      data: {
        userId,
        mantraId,
        durationMs,
      },
      include: {
        mantra: true,
      },
    });

    // Update user stats
    await updateUserStats(userId);

    return NextResponse.json(practice);
  } catch (error) {
    console.error('Error creating practice:', error);
    return NextResponse.json(
      { error: 'Failed to create practice' },
      { status: 500 }
    );
  }
}

// Helper function to update user stats
async function updateUserStats(userId: string) {
  const practices = await prisma.practice.findMany({
    where: { userId },
    include: { recordings: true },
  });

  const totalPractices = practices.length;
  const totalTimeMs = practices.reduce((sum, p) => sum + p.durationMs, 0);

  // Calculate average score from all recordings
  const allRecordings = practices.flatMap((p) => p.recordings);
  const averageScore =
    allRecordings.length > 0
      ? allRecordings.reduce((sum, r) => sum + r.score, 0) / allRecordings.length
      : 0;

  // Calculate streak
  const sortedPractices = practices.sort(
    (a, b) => b.date.getTime() - a.date.getTime()
  );
  let currentStreak = 0;
  let longestStreak = 0;
  let streak = 0;
  let lastDate: Date | null = null;

  for (const practice of sortedPractices) {
    const practiceDate = new Date(practice.date);
    practiceDate.setHours(0, 0, 0, 0);

    if (!lastDate) {
      streak = 1;
      currentStreak = 1;
    } else {
      const daysDiff = Math.floor(
        (lastDate.getTime() - practiceDate.getTime()) / (1000 * 60 * 60 * 24)
      );

      if (daysDiff === 1) {
        streak++;
        currentStreak++;
      } else if (daysDiff > 1) {
        streak = 1;
        currentStreak = 0;
      }
    }

    longestStreak = Math.max(longestStreak, streak);
    lastDate = practiceDate;
  }

  await prisma.userStats.upsert({
    where: { userId },
    update: {
      totalPractices,
      averageScore,
      currentStreak,
      longestStreak,
      totalTimeMs,
      lastPracticed: practices[0]?.date || null,
    },
    create: {
      userId,
      totalPractices,
      averageScore,
      currentStreak,
      longestStreak,
      totalTimeMs,
      lastPracticed: practices[0]?.date || null,
    },
  });
}
