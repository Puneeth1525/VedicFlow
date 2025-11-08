import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const mantraIds = searchParams.get('mantraIds')?.split(',') || [];

    if (mantraIds.length === 0) {
      return NextResponse.json({ stats: [] });
    }

    // Ensure all mantras exist in database (upsert)
    for (const mantraId of mantraIds) {
      await prisma.mantra.upsert({
        where: { id: mantraId },
        update: {},
        create: {
          id: mantraId,
          title: mantraId, // Will be updated later
          category: '',
          difficulty: 'Beginner',
          verses: 0,
          duration: '0 min',
        },
      });
    }

    // Fetch mantras with their stats
    const mantras = await prisma.mantra.findMany({
      where: {
        id: {
          in: mantraIds,
        },
      },
      select: {
        id: true,
        likesCount: true,
        likes: {
          where: {
            userId,
          },
          select: {
            id: true,
          },
        },
      },
    });

    // Calculate practitioners count from MantraProgress
    const practitionersCountByMantra = await prisma.mantraProgress.groupBy({
      by: ['mantraId'],
      where: {
        mantraId: {
          in: mantraIds,
        },
      },
      _count: {
        userId: true,
      },
    });

    const practitionersMap = new Map(
      practitionersCountByMantra.map(p => [p.mantraId, p._count.userId])
    );

    // Transform the data
    const stats = mantras.map((mantra) => ({
      mantraId: mantra.id,
      practitionersCount: practitionersMap.get(mantra.id) || 0,
      likesCount: mantra.likesCount,
      isLiked: mantra.likes.length > 0,
    }));

    return NextResponse.json({ stats });
  } catch (error) {
    console.error('Error fetching mantra stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch mantra stats' },
      { status: 500 }
    );
  }
}
