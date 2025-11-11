/**
 * NADA Engine Audio Utilities
 * Handles microphone capture, VAD (Voice Activity Detection), and audio playback
 */

export interface VADConfig {
  rmsThreshold: number; // RMS threshold for speech detection
  minSilenceMs: number; // Minimum silence duration to consider speech ended
  sampleRate: number;
}

export const DEFAULT_VAD_CONFIG: VADConfig = {
  rmsThreshold: 0.01, // Adjust based on testing
  minSilenceMs: 800, // 800ms of silence = speech ended
  sampleRate: 16000, // 16kHz for Whisper
};

/**
 * Get microphone stream
 */
export async function getMicStream(): Promise<MediaStream> {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        channelCount: 1,
        sampleRate: 16000,
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
    });
    return stream;
  } catch (error) {
    console.error('Failed to get microphone stream:', error);
    throw new Error('Microphone access denied');
  }
}

/**
 * Calculate RMS (Root Mean Square) of audio samples
 */
function calculateRMS(samples: Float32Array): number {
  let sum = 0;
  for (let i = 0; i < samples.length; i++) {
    sum += samples[i] * samples[i];
  }
  return Math.sqrt(sum / samples.length);
}

/**
 * Voice Activity Detection using RMS threshold
 */
export class SimpleVAD {
  private config: VADConfig;
  private isSpeaking = false;
  private silenceStartTime: number | null = null;
  private onSpeechStart?: () => void;
  private onSpeechEnd?: () => void;

  constructor(config: VADConfig = DEFAULT_VAD_CONFIG) {
    this.config = config;
  }

  /**
   * Process audio samples and detect speech start/end
   */
  public process(samples: Float32Array): void {
    const rms = calculateRMS(samples);
    const now = Date.now();

    if (rms > this.config.rmsThreshold) {
      // Voice detected
      if (!this.isSpeaking) {
        this.isSpeaking = true;
        this.silenceStartTime = null;
        if (this.onSpeechStart) {
          this.onSpeechStart();
        }
      } else {
        // Continue speaking, reset silence timer
        this.silenceStartTime = null;
      }
    } else {
      // Silence detected
      if (this.isSpeaking) {
        if (this.silenceStartTime === null) {
          this.silenceStartTime = now;
        } else {
          const silenceDuration = now - this.silenceStartTime;
          if (silenceDuration >= this.config.minSilenceMs) {
            // Speech ended
            this.isSpeaking = false;
            this.silenceStartTime = null;
            if (this.onSpeechEnd) {
              this.onSpeechEnd();
            }
          }
        }
      }
    }
  }

  public setSpeechStartCallback(callback: () => void): void {
    this.onSpeechStart = callback;
  }

  public setSpeechEndCallback(callback: () => void): void {
    this.onSpeechEnd = callback;
  }

  public reset(): void {
    this.isSpeaking = false;
    this.silenceStartTime = null;
  }

  public getIsSpeaking(): boolean {
    return this.isSpeaking;
  }
}

/**
 * Create PCM stream from microphone with VAD
 */
export async function createPCMStream(
  stream: MediaStream,
  onPCMChunk: (chunk: Int16Array) => void,
  vadConfig?: VADConfig
): Promise<{
  start: () => void;
  stop: () => void;
  vad: SimpleVAD;
}> {
  const audioContext = new AudioContext({ sampleRate: 16000 });
  const source = audioContext.createMediaStreamSource(stream);

  // Create ScriptProcessorNode for audio processing
  const bufferSize = 2048;
  const processor = audioContext.createScriptProcessor(bufferSize, 1, 1);

  const vad = new SimpleVAD(vadConfig);

  processor.onaudioprocess = (event) => {
    const inputData = event.inputBuffer.getChannelData(0);

    // Process VAD
    vad.process(inputData);

    // Convert Float32Array to Int16Array (PCM16)
    const pcm16 = new Int16Array(inputData.length);
    for (let i = 0; i < inputData.length; i++) {
      const s = Math.max(-1, Math.min(1, inputData[i]));
      pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
    }

    // Send PCM chunk
    onPCMChunk(pcm16);
  };

  return {
    start: () => {
      source.connect(processor);
      processor.connect(audioContext.destination);
    },
    stop: () => {
      processor.disconnect();
      source.disconnect();
      audioContext.close();
    },
    vad,
  };
}

/**
 * Play reference audio
 */
export async function playRefAudio(url: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const audio = new Audio(url);

    audio.onended = () => resolve();
    audio.onerror = (error) => reject(error);

    audio.play().catch(reject);
  });
}

/**
 * Play reference audio for specific line with timing
 */
export async function playRefAudioLine(
  url: string,
  startTime?: number,
  endTime?: number
): Promise<void> {
  return new Promise((resolve, reject) => {
    const audio = new Audio(url);

    if (startTime !== undefined) {
      audio.currentTime = startTime;
    }

    const checkTime = () => {
      if (endTime !== undefined && audio.currentTime >= endTime) {
        audio.pause();
        resolve();
      }
    };

    audio.ontimeupdate = checkTime;
    audio.onended = () => resolve();
    audio.onerror = (error) => reject(error);

    audio.play().catch(reject);
  });
}

/**
 * Convert Float32Array to Int16Array PCM
 */
export function float32ToInt16(float32: Float32Array): Int16Array {
  const int16 = new Int16Array(float32.length);
  for (let i = 0; i < float32.length; i++) {
    const s = Math.max(-1, Math.min(1, float32[i]));
    int16[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
  }
  return int16;
}

/**
 * Frame audio data into chunks for streaming
 * @param chunkDurationMs Duration of each chunk in milliseconds (20-50ms typical)
 * @param sampleRate Sample rate (16000 for Whisper)
 */
export function* framePCMData(
  pcmData: Int16Array,
  chunkDurationMs: number = 20,
  sampleRate: number = 16000
): Generator<Int16Array> {
  const samplesPerChunk = Math.floor((sampleRate * chunkDurationMs) / 1000);

  for (let i = 0; i < pcmData.length; i += samplesPerChunk) {
    yield pcmData.slice(i, i + samplesPerChunk);
  }
}
