import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// POST create a new recording
export async function POST(request: Request) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { practiceId, audioUrl, score } = body;

    if (!practiceId || !audioUrl || score === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Verify the practice belongs to the user
    const practice = await prisma.practice.findFirst({
      where: {
        id: practiceId,
        userId,
      },
    });

    if (!practice) {
      return NextResponse.json(
        { error: 'Practice not found' },
        { status: 404 }
      );
    }

    const recording = await prisma.recording.create({
      data: {
        practiceId,
        audioUrl,
        score,
        submittedForReview: false,
        reviewStatus: 'not-submitted',
      },
    });

    // Update mantra progress
    await updateMantraProgress(userId, practice.mantraId);

    return NextResponse.json(recording);
  } catch (error) {
    console.error('Error creating recording:', error);
    return NextResponse.json(
      { error: 'Failed to create recording' },
      { status: 500 }
    );
  }
}

// PATCH update recording (for submitting for review or adding mentor remarks)
export async function PATCH(request: Request) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { recordingId, submittedForReview, reviewStatus, mentorRemarks } = body;

    if (!recordingId) {
      return NextResponse.json(
        { error: 'Recording ID required' },
        { status: 400 }
      );
    }

    // Verify the recording belongs to the user
    const recording = await prisma.recording.findFirst({
      where: {
        id: recordingId,
      },
      include: {
        practice: true,
      },
    });

    if (!recording || recording.practice.userId !== userId) {
      return NextResponse.json(
        { error: 'Recording not found' },
        { status: 404 }
      );
    }

    const updated = await prisma.recording.update({
      where: { id: recordingId },
      data: {
        ...(submittedForReview !== undefined && { submittedForReview }),
        ...(reviewStatus && { reviewStatus }),
        ...(mentorRemarks !== undefined && { mentorRemarks }),
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Error updating recording:', error);
    return NextResponse.json(
      { error: 'Failed to update recording' },
      { status: 500 }
    );
  }
}

// Helper function to update mantra progress
async function updateMantraProgress(userId: string, mantraId: string) {
  const practices = await prisma.practice.findMany({
    where: {
      userId,
      mantraId,
    },
    include: {
      recordings: true,
    },
  });

  const totalPractices = practices.length;
  const allRecordings = practices.flatMap((p) => p.recordings);
  const averageScore =
    allRecordings.length > 0
      ? allRecordings.reduce((sum, r) => sum + r.score, 0) / allRecordings.length
      : 0;

  const lastPracticed = practices[0]?.date || null;

  await prisma.mantraProgress.upsert({
    where: {
      userId_mantraId: {
        userId,
        mantraId,
      },
    },
    update: {
      totalPractices,
      averageScore,
      lastPracticed,
    },
    create: {
      userId,
      mantraId,
      totalPractices,
      averageScore,
      lastPracticed,
    },
  });
}
