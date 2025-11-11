import { auth } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    // Verify user is authenticated
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get recording ID from query params
    const { searchParams } = new URL(request.url);
    const recordingId = searchParams.get('id');

    if (!recordingId) {
      return NextResponse.json({ error: 'Recording ID required' }, { status: 400 });
    }

    // Verify user can access this recording (owner or mentor reviewing it)
    const recording = await prisma.recording.findFirst({
      where: { id: recordingId },
      include: {
        practice: true,
        submission: {
          include: {
            recording: true,
          },
        },
      },
    });

    if (!recording) {
      return NextResponse.json({ error: 'Recording not found' }, { status: 404 });
    }

    // Check if user is the owner
    const isOwner = recording.practice.userId === userId;

    // Check if user is a mentor reviewing this submission
    const isMentor = recording.submission && (
      recording.submission.mentorId === userId ||
      recording.submission.mentorId === null // Unassigned submissions can be viewed by any mentor
    );

    // Get user role to verify mentor access
    if (!isOwner && !isMentor) {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { role: true },
      });

      const isMentorRole = user && (user.role === 'MENTOR' || user.role === 'TEACHER');

      if (!isMentorRole || !recording.submission) {
        return NextResponse.json({ error: 'Access denied' }, { status: 403 });
      }
    }

    // Initialize Supabase admin client
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Extract file path from URL
    // URL format: https://...supabase.co/storage/v1/object/public/recordings/user_xxx/timestamp.webm
    const urlParts = recording.audioUrl.split('/recordings/');
    const filePath = urlParts.length > 1 ? urlParts[1] : null;

    if (!filePath) {
      return NextResponse.json({ error: 'Invalid audio URL' }, { status: 400 });
    }

    // Download file from Supabase Storage
    const { data, error } = await supabaseAdmin.storage
      .from('recordings')
      .download(filePath);

    if (error || !data) {
      console.error('Error downloading from Supabase:', error);
      return NextResponse.json({ error: 'Failed to retrieve audio' }, { status: 500 });
    }

    // Convert blob to buffer
    const arrayBuffer = await data.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Return audio file with appropriate headers
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'audio/webm',
        'Content-Length': buffer.length.toString(),
        'Cache-Control': 'private, max-age=3600',
        'Accept-Ranges': 'bytes',
      },
    });

  } catch (error) {
    console.error('Error serving audio:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
