import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin
    const currentUser = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!currentUser || currentUser.role !== 'TEACHER') {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 });
    }

    // Fetch all users
    const allUsers = await prisma.user.findMany({
      orderBy: {
        createdAt: 'desc',
      },
      select: {
        id: true,
        email: true,
        role: true,
        approved: true,
        onboardingComplete: true,
        createdAt: true,
      },
    });

    // Fetch all user stats separately
    const allUserStats = await prisma.userStats.findMany({
      select: {
        userId: true,
        lastPracticed: true,
        totalPractices: true,
      },
    });

    // Create a map of userId to stats
    const statsMap = new Map(
      allUserStats.map(stat => [stat.userId, stat])
    );

    // Combine users with their stats
    const usersWithStats = allUsers.map(user => ({
      ...user,
      userStats: statsMap.get(user.id) || null,
    }));

    return NextResponse.json(usersWithStats);
  } catch (error) {
    console.error('Error fetching all users:', error);
    return NextResponse.json(
      { error: 'Failed to fetch users' },
      { status: 500 }
    );
  }
}
