import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(request: Request) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { recordingId } = await request.json();

    if (!recordingId) {
      return NextResponse.json(
        { error: 'Recording ID is required' },
        { status: 400 }
      );
    }

    // Verify the recording exists and belongs to the user
    const recording = await prisma.recording.findUnique({
      where: { id: recordingId },
      include: {
        practice: true,
      },
    });

    if (!recording) {
      return NextResponse.json(
        { error: 'Recording not found' },
        { status: 404 }
      );
    }

    if (recording.practice.userId !== userId) {
      return NextResponse.json(
        { error: 'Unauthorized to submit this recording' },
        { status: 403 }
      );
    }

    // Check if already submitted
    const existingSubmission = await prisma.submission.findUnique({
      where: { recordingId },
    });

    if (existingSubmission) {
      return NextResponse.json(
        { error: 'Recording already submitted for review' },
        { status: 400 }
      );
    }

    // Create submission
    const submission = await prisma.submission.create({
      data: {
        recordingId,
        studentId: userId,
        status: 'PENDING',
      },
      include: {
        recording: {
          include: {
            practice: {
              include: {
                mantra: true,
              },
            },
          },
        },
      },
    });

    // Update recording status
    await prisma.recording.update({
      where: { id: recordingId },
      data: {
        submittedForReview: true,
        reviewStatus: 'under-review',
      },
    });

    // Trigger alignment processing asynchronously (don't wait for it)
    fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/process-alignment`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ recordingId }),
    }).catch((error) => {
      console.error('Error triggering alignment processing:', error);
      // Don't fail the submission if alignment processing fails
    });

    return NextResponse.json({
      success: true,
      submission,
    });
  } catch (error) {
    console.error('Error creating submission:', error);
    return NextResponse.json(
      { error: 'Failed to create submission' },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user role
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Students can only see their own submissions
    const submissions = await prisma.submission.findMany({
      where: {
        studentId: userId,
      },
      include: {
        recording: {
          include: {
            practice: {
              include: {
                mantra: true,
              },
            },
          },
        },
        feedbacks: {
          include: {
            markers: true,
          },
        },
      },
      orderBy: {
        submittedAt: 'desc',
      },
    });

    return NextResponse.json({ submissions });
  } catch (error) {
    console.error('Error fetching submissions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch submissions' },
      { status: 500 }
    );
  }
}
