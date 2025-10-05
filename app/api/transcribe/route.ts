import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const audioFile = formData.get('audio') as Blob;

    if (!audioFile) {
      return NextResponse.json(
        { error: 'No audio file provided' },
        { status: 400 }
      );
    }

    // Check for API key
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      console.error('OPENAI_API_KEY not set in environment variables');
      return NextResponse.json(
        { error: 'OpenAI API key not configured' },
        { status: 500 }
      );
    }

    console.log('🎙️ Sending audio to Whisper API...');

    // Create form data for OpenAI
    const openaiFormData = new FormData();
    openaiFormData.append('file', audioFile, 'audio.wav');
    openaiFormData.append('model', 'whisper-1');
    // Note: Whisper doesn't support 'sa' (Sanskrit) - using 'hi' (Hindi) for Devanagari script
    // or omitting language to let Whisper auto-detect
    openaiFormData.append('language', 'hi'); // Hindi (closest to Sanskrit for Devanagari)
    openaiFormData.append('response_format', 'json');

    // Call OpenAI Whisper API
    const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
      },
      body: openaiFormData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Whisper API error:', errorText);
      return NextResponse.json(
        { error: 'Transcription failed', details: errorText },
        { status: response.status }
      );
    }

    const result = await response.json();
    console.log('✅ Whisper transcription:', result.text);

    return NextResponse.json({
      success: true,
      transcript: result.text,
      confidence: 0.95, // Whisper doesn't provide confidence, assume high
    });

  } catch (error: any) {
    console.error('Transcription error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}
