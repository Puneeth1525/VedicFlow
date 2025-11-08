import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ mantraId: string }> }
) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { mantraId } = await params;

    // Ensure mantra exists in database
    await prisma.mantra.upsert({
      where: { id: mantraId },
      update: {},
      create: {
        id: mantraId,
        title: mantraId,
        category: '',
        difficulty: 'Beginner',
        verses: 0,
        duration: '0 min',
      },
    });

    // Check if user already liked this mantra
    const existingLike = await prisma.mantraLike.findUnique({
      where: {
        userId_mantraId: {
          userId,
          mantraId,
        },
      },
    });

    if (existingLike) {
      // Unlike: Remove the like
      await prisma.$transaction([
        prisma.mantraLike.delete({
          where: { id: existingLike.id },
        }),
        prisma.mantra.update({
          where: { id: mantraId },
          data: { likesCount: { decrement: 1 } },
        }),
      ]);

      const updatedMantra = await prisma.mantra.findUnique({
        where: { id: mantraId },
        select: { likesCount: true },
      });

      return NextResponse.json({
        liked: false,
        likesCount: updatedMantra?.likesCount || 0,
      });
    } else {
      // Like: Add the like
      await prisma.$transaction([
        prisma.mantraLike.create({
          data: {
            userId,
            mantraId,
          },
        }),
        prisma.mantra.update({
          where: { id: mantraId },
          data: { likesCount: { increment: 1 } },
        }),
      ]);

      const updatedMantra = await prisma.mantra.findUnique({
        where: { id: mantraId },
        select: { likesCount: true },
      });

      return NextResponse.json({
        liked: true,
        likesCount: updatedMantra?.likesCount || 0,
      });
    }
  } catch (error) {
    console.error('Error toggling mantra like:', error);
    return NextResponse.json(
      { error: 'Failed to toggle like' },
      { status: 500 }
    );
  }
}
