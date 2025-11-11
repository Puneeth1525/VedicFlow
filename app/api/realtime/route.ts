/**
 * NADA Engine WebSocket Proxy
 * Upgrades HTTP to WebSocket and proxies audio chunks to OpenAI Whisper/Realtime API
 */

import { NextRequest } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface WhisperMessage {
  type: 'audio' | 'end_audio';
  data?: string; // Base64 encoded PCM16
}

export async function GET(request: NextRequest) {
  const upgradeHeader = request.headers.get('upgrade');

  if (upgradeHeader !== 'websocket') {
    return new Response('Expected Upgrade: websocket', { status: 426 });
  }

  const { searchParams } = new URL(request.url);
  const model = searchParams.get('model') || 'whisper-1';
  const language = searchParams.get('language') || 'sa';

  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    return new Response('OpenAI API key not configured', { status: 500 });
  }

  // Note: Next.js App Router doesn't natively support WebSocket upgrades yet
  // This is a placeholder implementation. In production, you would:
  // 1. Use a separate WebSocket server (e.g., with ws library)
  // 2. Use Vercel/Next.js Edge Functions with WebSocket support
  // 3. Use a service like Pusher or Ably for real-time communication

  // For now, return a response indicating WebSocket upgrade is needed
  return new Response(
    JSON.stringify({
      error: 'WebSocket not supported in this configuration',
      message:
        'Please use a dedicated WebSocket server or upgrade to Edge runtime with WebSocket support',
      model,
      language,
    }),
    {
      status: 501,
      headers: {
        'Content-Type': 'application/json',
      },
    }
  );
}

/**
 * Alternative implementation using Server-Sent Events (SSE) for now
 * This can provide partial transcripts while we work on proper WebSocket support
 */
export async function POST(request: NextRequest) {
  try {
    const { audioData, model = 'whisper-1', language = 'sa' } = await request.json();

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: 'OpenAI API key not configured' }),
        { status: 500 }
      );
    }

    // Convert base64 PCM to audio blob
    const binaryData = Uint8Array.from(atob(audioData), (c) => c.charCodeAt(0));
    const audioBlob = new Blob([binaryData], { type: 'audio/wav' });

    // Create form data for Whisper API
    const formData = new FormData();
    formData.append('file', audioBlob, 'audio.wav');
    formData.append('model', model);
    if (language) {
      formData.append('language', language);
    }
    formData.append('response_format', 'json');

    // Call OpenAI Whisper API
    const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('Whisper API error:', error);
      return new Response(JSON.stringify({ error: 'Transcription failed' }), {
        status: response.status,
      });
    }

    const result = await response.json();

    return new Response(
      JSON.stringify({
        type: 'transcript',
        is_final: true,
        text: result.text,
      }),
      {
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error) {
    console.error('Transcription error:', error);
    return new Response(
      JSON.stringify({
        error: 'Failed to process transcription',
        details: error instanceof Error ? error.message : 'Unknown error',
      }),
      { status: 500 }
    );
  }
}
