import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request) {
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
        { error: 'Only mentors can access this endpoint' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const submissionId = searchParams.get('submissionId');

    // If requesting a specific submission
    if (submissionId) {
      const submission = await prisma.submission.findUnique({
        where: { id: submissionId },
        include: {
          recording: {
            include: {
              practice: {
                include: {
                  mantra: true,
                },
              },
              alignmentWords: {
                orderBy: {
                  startTime: 'asc',
                },
              },
            },
          },
          feedbacks: {
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
          },
        },
      });

      if (!submission) {
        return NextResponse.json(
          { error: 'Submission not found' },
          { status: 404 }
        );
      }

      return NextResponse.json({ submission });
    }

    // Build where clause based on filters
    const whereClause: any = {
      OR: [
        { mentorId: userId }, // Assigned to this mentor
        { mentorId: null }, // Unassigned (available to pick up)
      ],
    };

    if (status && status !== 'ALL') {
      whereClause.status = status;
    }

    // Fetch submissions
    const submissions = await prisma.submission.findMany({
      where: whereClause,
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
          orderBy: {
            createdAt: 'desc',
          },
          take: 1, // Only get the latest feedback
        },
      },
      orderBy: [
        { status: 'asc' }, // PENDING first, then IN_REVIEW, then COMPLETED
        { submittedAt: 'asc' }, // Oldest first
      ],
    });

    // Group by status for easy filtering on frontend
    const grouped = {
      PENDING: submissions.filter((s) => s.status === 'PENDING'),
      IN_REVIEW: submissions.filter((s) => s.status === 'IN_REVIEW'),
      COMPLETED: submissions.filter((s) => s.status === 'COMPLETED'),
    };

    return NextResponse.json({ submissions, grouped });
  } catch (error) {
    console.error('Error fetching mentor submissions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch submissions' },
      { status: 500 }
    );
  }
}

// PATCH endpoint to claim/assign a submission to a mentor
export async function PATCH(request: Request) {
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
        { error: 'Only mentors can assign submissions' },
        { status: 403 }
      );
    }

    const { submissionId, action } = await request.json();

    if (!submissionId || !action) {
      return NextResponse.json(
        { error: 'Submission ID and action are required' },
        { status: 400 }
      );
    }

    const submission = await prisma.submission.findUnique({
      where: { id: submissionId },
    });

    if (!submission) {
      return NextResponse.json(
        { error: 'Submission not found' },
        { status: 404 }
      );
    }

    let updatedSubmission;

    if (action === 'claim') {
      // Claim the submission
      updatedSubmission = await prisma.submission.update({
        where: { id: submissionId },
        data: {
          mentorId: userId,
          status: 'IN_REVIEW',
        },
      });
    } else if (action === 'unclaim') {
      // Release the submission
      updatedSubmission = await prisma.submission.update({
        where: { id: submissionId },
        data: {
          mentorId: null,
          status: 'PENDING',
        },
      });
    } else {
      return NextResponse.json(
        { error: 'Invalid action. Use "claim" or "unclaim"' },
        { status: 400 }
      );
    }

    return NextResponse.json({ submission: updatedSubmission });
  } catch (error) {
    console.error('Error updating submission:', error);
    return NextResponse.json(
      { error: 'Failed to update submission' },
      { status: 500 }
    );
  }
}
