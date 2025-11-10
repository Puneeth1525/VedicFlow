import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

interface WhisperWord {
  word: string;
  start: number;
  end: number;
}

interface WhisperTranscription {
  words?: WhisperWord[];
}

export async function POST(request: Request) {
  try {
    const { recordingId } = await request.json();

    if (!recordingId) {
      return NextResponse.json(
        { error: 'Recording ID is required' },
        { status: 400 }
      );
    }

    // Get the recording
    const recording = await prisma.recording.findUnique({
      where: { id: recordingId },
    });

    if (!recording) {
      return NextResponse.json(
        { error: 'Recording not found' },
        { status: 404 }
      );
    }

    // Check if alignment already exists
    const existingAlignment = await prisma.alignmentWord.findFirst({
      where: { recordingId },
    });

    if (existingAlignment) {
      return NextResponse.json({
        message: 'Alignment already exists',
        recordingId,
      });
    }

    // Fetch the audio file
    const audioResponse = await fetch(recording.audioUrl);
    if (!audioResponse.ok) {
      throw new Error('Failed to fetch audio file');
    }

    const audioBlob = await audioResponse.blob();
    const audioFile = new File([audioBlob], 'recording.webm', {
      type: audioBlob.type || 'audio/webm',
    });

    // Call Whisper API with word-level timestamps
    const transcription = await openai.audio.transcriptions.create({
      file: audioFile,
      model: 'whisper-1',
      response_format: 'verbose_json',
      timestamp_granularities: ['word'],
    });

    // Extract words with timestamps
    const words = (transcription as WhisperTranscription).words || [];

    if (words.length === 0) {
      console.warn('No words found in transcription');
      return NextResponse.json({
        message: 'No words found in transcription',
        recordingId,
      });
    }

    // Store alignment words in database
    await prisma.alignmentWord.createMany({
      data: words.map((word: WhisperWord) => ({
        recordingId,
        word: word.word,
        startTime: word.start,
        endTime: word.end,
        confidence: 1.0, // Whisper doesn't provide confidence, default to 1.0
      })),
    });

    console.log(`Stored ${words.length} alignment words for recording ${recordingId}`);

    return NextResponse.json({
      success: true,
      recordingId,
      wordCount: words.length,
    });
  } catch (error) {
    console.error('Error processing alignment:', error);
    return NextResponse.json(
      {
        error: 'Failed to process alignment',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
