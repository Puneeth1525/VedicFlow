import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET mantra progress for the current user
export async function GET() {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const mantraProgress = await prisma.mantraProgress.findMany({
      where: { userId },
      include: {
        mantra: true,
      },
      orderBy: {
        lastPracticed: 'desc',
      },
    });

    return NextResponse.json(mantraProgress);
  } catch (error) {
    console.error('Error fetching mantra progress:', error);
    return NextResponse.json(
      { error: 'Failed to fetch mantra progress' },
      { status: 500 }
    );
  }
}
