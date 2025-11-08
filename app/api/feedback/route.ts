import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

interface FeedbackMarkerInput {
  timestamp: number;
  comment: string;
}

export async function POST(request: Request) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify user is a mentor or admin
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });

    if (!user || (user.role !== 'MENTOR' && user.role !== 'TEACHER')) {
      return NextResponse.json(
        { error: 'Only mentors can submit feedback' },
        { status: 403 }
      );
    }

    const { submissionId, overallRemarks, markers } = await request.json();

    if (!submissionId || !overallRemarks) {
      return NextResponse.json(
        { error: 'Submission ID and overall remarks are required' },
        { status: 400 }
      );
    }

    // Verify submission exists and is assigned to this mentor
    const submission = await prisma.submission.findUnique({
      where: { id: submissionId },
    });

    if (!submission) {
      return NextResponse.json(
        { error: 'Submission not found' },
        { status: 404 }
      );
    }

    // Allow mentors to review any submission (not just their own)
    // This allows flexibility in the workflow

    // Create feedback with markers in a transaction
    const feedback = await prisma.$transaction(async (tx) => {
      // Create the feedback
      const newFeedback = await tx.feedback.create({
        data: {
          submissionId,
          mentorId: userId,
          overallRemarks,
          markers: markers
            ? {
                create: markers.map((m: FeedbackMarkerInput) => ({
                  timestamp: m.timestamp,
                  comment: m.comment,
                })),
              }
            : undefined,
        },
        include: {
          markers: {
            orderBy: {
              timestamp: 'asc',
            },
          },
        },
      });

      // Update submission status to COMPLETED and set reviewedAt
      await tx.submission.update({
        where: { id: submissionId },
        data: {
          status: 'COMPLETED',
          reviewedAt: new Date(),
          mentorId: userId, // Assign to this mentor if not already assigned
        },
      });

      // Update recording status
      await tx.recording.update({
        where: { id: submission.recordingId },
        data: {
          reviewStatus: 'reviewed',
          mentorRemarks: overallRemarks,
        },
      });

      return newFeedback;
    });

    return NextResponse.json({
      success: true,
      feedback,
    });
  } catch (error) {
    console.error('Error submitting feedback:', error);
    return NextResponse.json(
      { error: 'Failed to submit feedback' },
      { status: 500 }
    );
  }
}

// GET endpoint to fetch feedback for a submission
export async function GET(request: Request) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const submissionId = searchParams.get('submissionId');

    if (!submissionId) {
      return NextResponse.json(
        { error: 'Submission ID is required' },
        { status: 400 }
      );
    }

    // Fetch all feedback for the submission
    const feedbacks = await prisma.feedback.findMany({
      where: {
        submissionId,
      },
      include: {
        markers: {
          orderBy: {
            timestamp: 'asc',
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return NextResponse.json({ feedbacks });
  } catch (error) {
    console.error('Error fetching feedback:', error);
    return NextResponse.json(
      { error: 'Failed to fetch feedback' },
      { status: 500 }
    );
  }
}
