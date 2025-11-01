import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { deleteRecording as deleteRecordingFromStorage } from '@/lib/supabase';

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

// DELETE remove a recording
export async function DELETE(request: Request) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const recordingId = searchParams.get('id');

    if (!recordingId) {
      return NextResponse.json(
        { error: 'Recording ID required' },
        { status: 400 }
      );
    }

    // Verify the recording belongs to the user and get the audio URL
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

    // Extract file path from URL for Supabase Storage deletion
    // URL format: https://...supabase.co/storage/v1/object/public/recordings/user_xxx/timestamp.webm
    const urlParts = recording.audioUrl.split('/recordings/');
    const filePath = urlParts.length > 1 ? urlParts[1] : null;

    // Delete from database first
    await prisma.recording.delete({
      where: { id: recordingId },
    });

    // Delete from Supabase Storage
    if (filePath) {
      try {
        await deleteRecordingFromStorage(filePath);
        console.log('Deleted audio file from storage:', filePath);
      } catch (error) {
        console.error('Error deleting from storage (continuing anyway):', error);
        // Don't fail the request if storage deletion fails
      }
    }

    // Update mantra progress after deletion
    await updateMantraProgress(userId, recording.practice.mantraId);

    return NextResponse.json({ success: true, message: 'Recording deleted' });
  } catch (error) {
    console.error('Error deleting recording:', error);
    return NextResponse.json(
      { error: 'Failed to delete recording' },
      { status: 500 }
    );
  }
}
