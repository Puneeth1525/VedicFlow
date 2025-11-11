/**
 * NADA Engine Whisper WebSocket Client
 * Real-time transcription via WebSocket connection to OpenAI Whisper
 */

export interface WhisperTranscriptEvent {
  type: 'partial' | 'final';
  transcript: string;
  timestamp: number;
}

export interface WhisperSessionConfig {
  wsUrl: string;
  model?: string;
  language?: string;
}

export type WhisperEventCallback = (event: WhisperTranscriptEvent) => void;

export class WhisperRealtimeSession {
  private ws: WebSocket | null = null;
  private config: WhisperSessionConfig;
  private onTranscript?: WhisperEventCallback;
  private onError?: (error: Error) => void;
  private onClose?: () => void;
  private isConnected = false;

  constructor(config: WhisperSessionConfig) {
    this.config = config;
  }

  /**
   * Connect to WebSocket and initialize session
   */
  public async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      const wsUrl = new URL(this.config.wsUrl);
      if (this.config.model) {
        wsUrl.searchParams.set('model', this.config.model);
      }
      if (this.config.language) {
        wsUrl.searchParams.set('language', this.config.language);
      }

      this.ws = new WebSocket(wsUrl.toString());

      this.ws.onopen = () => {
        console.log('[Whisper] WebSocket connected');
        this.isConnected = true;
        resolve();
      };

      this.ws.onerror = (error) => {
        console.error('[Whisper] WebSocket error:', error);
        this.isConnected = false;
        if (this.onError) {
          this.onError(new Error('WebSocket connection error'));
        }
        reject(error);
      };

      this.ws.onclose = () => {
        console.log('[Whisper] WebSocket closed');
        this.isConnected = false;
        if (this.onClose) {
          this.onClose();
        }
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this.handleMessage(data);
        } catch (error) {
          console.error('[Whisper] Failed to parse message:', error);
        }
      };
    });
  }

  /**
   * Send PCM audio chunk to Whisper
   */
  public sendAudioChunk(pcm16: Int16Array): void {
    if (!this.ws || !this.isConnected) {
      console.warn('[Whisper] Cannot send audio - not connected');
      return;
    }

    // Convert Int16Array to Base64 for transmission
    const uint8 = new Uint8Array(pcm16.buffer);
    const base64 = btoa(String.fromCharCode(...Array.from(uint8)));

    this.ws.send(
      JSON.stringify({
        type: 'audio',
        data: base64,
      })
    );
  }

  /**
   * Signal end of audio stream
   */
  public endAudioStream(): void {
    if (!this.ws || !this.isConnected) {
      return;
    }

    this.ws.send(
      JSON.stringify({
        type: 'end_audio',
      })
    );
  }

  /**
   * Close WebSocket connection
   */
  public close(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.isConnected = false;
  }

  /**
   * Handle incoming WebSocket messages
   */
  private handleMessage(data: any): void {
    if (data.type === 'transcript') {
      const event: WhisperTranscriptEvent = {
        type: data.is_final ? 'final' : 'partial',
        transcript: data.text || '',
        timestamp: Date.now(),
      };

      if (this.onTranscript) {
        this.onTranscript(event);
      }
    } else if (data.type === 'error') {
      console.error('[Whisper] Server error:', data.message);
      if (this.onError) {
        this.onError(new Error(data.message || 'Whisper error'));
      }
    }
  }

  /**
   * Set transcript callback
   */
  public setTranscriptCallback(callback: WhisperEventCallback): void {
    this.onTranscript = callback;
  }

  /**
   * Set error callback
   */
  public setErrorCallback(callback: (error: Error) => void): void {
    this.onError = callback;
  }

  /**
   * Set close callback
   */
  public setCloseCallback(callback: () => void): void {
    this.onClose = callback;
  }

  /**
   * Check if session is connected
   */
  public getIsConnected(): boolean {
    return this.isConnected;
  }
}

/**
 * Connect to realtime Whisper and stream PCM audio
 */
export async function connectRealtimeWhisper(
  wsUrl: string,
  model: string = 'whisper-1',
  language: string = 'sa'
): Promise<WhisperRealtimeSession> {
  const session = new WhisperRealtimeSession({
    wsUrl,
    model,
    language,
  });

  await session.connect();
  return session;
}

/**
 * Start streaming PCM chunks to Whisper
 */
export async function startStream(
  session: WhisperRealtimeSession,
  pcmChunkIterator: AsyncIterableIterator<Int16Array> | IterableIterator<Int16Array>
): Promise<void> {
  try {
    for await (const chunk of pcmChunkIterator) {
      session.sendAudioChunk(chunk);
    }
    session.endAudioStream();
  } catch (error) {
    console.error('[Whisper] Error streaming audio:', error);
    throw error;
  }
}

/**
 * Helper to convert PCM chunks into async iterable
 */
export function createPCMIterator(): {
  iterator: AsyncIterableIterator<Int16Array>;
  push: (chunk: Int16Array) => void;
  end: () => void;
} {
  const queue: Int16Array[] = [];
  let resolveNext: ((value: IteratorResult<Int16Array>) => void) | null = null;
  let isEnded = false;

  const iterator: AsyncIterableIterator<Int16Array> = {
    [Symbol.asyncIterator]() {
      return this;
    },
    async next(): Promise<IteratorResult<Int16Array>> {
      if (queue.length > 0) {
        return { value: queue.shift()!, done: false };
      }

      if (isEnded) {
        return { value: undefined, done: true };
      }

      return new Promise((resolve) => {
        resolveNext = resolve;
      });
    },
  };

  const push = (chunk: Int16Array) => {
    if (isEnded) return;

    if (resolveNext) {
      resolveNext({ value: chunk, done: false });
      resolveNext = null;
    } else {
      queue.push(chunk);
    }
  };

  const end = () => {
    isEnded = true;
    if (resolveNext) {
      resolveNext({ value: undefined, done: true });
      resolveNext = null;
    }
  };

  return { iterator, push, end };
}
