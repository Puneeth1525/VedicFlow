import { NextRequest, NextResponse } from 'next/server';
import { analyzeWordPronunciation } from '@/lib/wordPronunciationAnalyzer';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const audioFile = formData.get('audio') as File;
    const expectedWord = formData.get('word') as string;
    const romanization = formData.get('romanization') as string;

    if (!audioFile || !expectedWord || !romanization) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Convert File to Blob
    const audioBlob = new Blob([await audioFile.arrayBuffer()], {
      type: audioFile.type,
    });

    const result = await analyzeWordPronunciation(
      audioBlob,
      expectedWord,
      romanization
    );

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error analyzing word:', error);
    return NextResponse.json(
      { error: 'Failed to analyze pronunciation' },
      { status: 500 }
    );
  }
}
