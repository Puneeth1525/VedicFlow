/**
 * Pitch Detection Utilities
 * Uses autocorrelation algorithm for pitch detection from audio
 */

export interface PitchData {
  frequency: number;
  clarity: number;
  timestamp: number;
}

/**
 * Autocorrelation-based pitch detection
 * Returns the fundamental frequency in Hz
 */
function autoCorrelate(buffer: Float32Array, sampleRate: number): number {
  const SIZE = buffer.length;
  const MAX_SAMPLES = Math.floor(SIZE / 2);
  let best_offset = -1;
  let best_correlation = 0;
  let rms = 0;

  // Calculate RMS (root mean square) for volume detection
  for (let i = 0; i < SIZE; i++) {
    const val = buffer[i];
    rms += val * val;
  }
  rms = Math.sqrt(rms / SIZE);

  // Not enough signal
  if (rms < 0.01) return -1;

  // Find the best correlation
  let lastCorrelation = 1;
  for (let offset = 1; offset < MAX_SAMPLES; offset++) {
    let correlation = 0;

    for (let i = 0; i < MAX_SAMPLES; i++) {
      correlation += Math.abs(buffer[i] - buffer[i + offset]);
    }

    correlation = 1 - correlation / MAX_SAMPLES;

    if (correlation > 0.9 && correlation > lastCorrelation) {
      const foundGoodCorrelation = correlation > 0.9;
      if (foundGoodCorrelation) {
        if (correlation > best_correlation) {
          best_correlation = correlation;
          best_offset = offset;
        }
      }
    }

    lastCorrelation = correlation;
  }

  if (best_correlation > 0.01 && best_offset !== -1) {
    const frequency = sampleRate / best_offset;
    return frequency;
  }

  return -1;
}

/**
 * Extract pitch from audio buffer
 */
export async function extractPitchFromAudio(
  audioBuffer: AudioBuffer
): Promise<PitchData[]> {
  const pitchData: PitchData[] = [];
  const sampleRate = audioBuffer.sampleRate;
  const channelData = audioBuffer.getChannelData(0);

  // Window size for pitch detection (about 100ms)
  const windowSize = Math.floor(sampleRate * 0.1);
  const hopSize = Math.floor(windowSize / 2); // 50% overlap

  for (let i = 0; i < channelData.length - windowSize; i += hopSize) {
    const buffer = channelData.slice(i, i + windowSize);
    const frequency = autoCorrelate(buffer, sampleRate);

    if (frequency > 0 && frequency < 1000) {
      // Typical human voice range
      pitchData.push({
        frequency,
        clarity: 1.0, // Can be improved with more sophisticated analysis
        timestamp: i / sampleRate,
      });
    }
  }

  return pitchData;
}

/**
 * Detect pitch in real-time from microphone stream
 */
export class RealtimePitchDetector {
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private mediaStream: MediaStream | null = null;
  private rafId: number | null = null;
  private buffer: Float32Array<ArrayBuffer> | null = null;

  async start(onPitchDetected: (frequency: number, clarity: number) => void) {
    this.audioContext = new AudioContext();
    this.analyser = this.audioContext.createAnalyser();
    this.analyser.fftSize = 2048;

    this.buffer = new Float32Array(new ArrayBuffer(this.analyser.fftSize * 4));

    this.mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const source = this.audioContext.createMediaStreamSource(this.mediaStream);
    source.connect(this.analyser);

    const detectPitch = () => {
      if (!this.analyser || !this.buffer || !this.audioContext) return;

      this.analyser.getFloatTimeDomainData(this.buffer);
      const frequency = autoCorrelate(this.buffer, this.audioContext.sampleRate);

      if (frequency > 0) {
        onPitchDetected(frequency, 1.0);
      }

      this.rafId = requestAnimationFrame(detectPitch);
    };

    detectPitch();
  }

  stop() {
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
    }
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((track) => track.stop());
    }
    if (this.audioContext) {
      this.audioContext.close();
    }
  }
}

/**
 * Compare two pitch sequences and calculate similarity score
 */
export function comparePitchSequences(
  reference: PitchData[],
  user: PitchData[]
): {
  overallScore: number;
  pitchAccuracy: number;
  rhythmAccuracy: number;
  details: Array<{ timestamp: number; score: number; expectedFreq: number; actualFreq: number }>;
} {
  if (reference.length === 0 || user.length === 0) {
    return {
      overallScore: 0,
      pitchAccuracy: 0,
      rhythmAccuracy: 0,
      details: [],
    };
  }

  const details: Array<{
    timestamp: number;
    score: number;
    expectedFreq: number;
    actualFreq: number;
  }> = [];
  let totalPitchError = 0;
  let comparisons = 0;

  // Align sequences by timestamp and compare
  for (let i = 0; i < Math.min(reference.length, user.length); i++) {
    const refPitch = reference[i];
    const userPitch = user[i];

    // Calculate pitch difference in semitones
    const semitonesDiff = Math.abs(
      12 * Math.log2(userPitch.frequency / refPitch.frequency)
    );

    // Score based on semitone difference (closer = higher score)
    const pitchScore = Math.max(0, 100 - semitonesDiff * 10);

    details.push({
      timestamp: refPitch.timestamp,
      score: pitchScore,
      expectedFreq: refPitch.frequency,
      actualFreq: userPitch.frequency,
    });

    totalPitchError += semitonesDiff;
    comparisons++;
  }

  const avgPitchError = comparisons > 0 ? totalPitchError / comparisons : 0;
  const pitchAccuracy = Math.max(0, Math.min(100, 100 - avgPitchError * 10));

  // Calculate rhythm accuracy based on length similarity
  const lengthRatio = Math.min(user.length, reference.length) /
                      Math.max(user.length, reference.length);
  const rhythmAccuracy = lengthRatio * 100;

  // Overall score is weighted average
  const overallScore = pitchAccuracy * 0.7 + rhythmAccuracy * 0.3;

  return {
    overallScore: Math.round(overallScore),
    pitchAccuracy: Math.round(pitchAccuracy),
    rhythmAccuracy: Math.round(rhythmAccuracy),
    details,
  };
}

/**
 * Load audio file and extract pitch data
 */
export async function loadAndAnalyzeAudio(audioUrl: string): Promise<PitchData[]> {
  const response = await fetch(audioUrl);
  const arrayBuffer = await response.arrayBuffer();

  const audioContext = new AudioContext();
  const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

  const pitchData = await extractPitchFromAudio(audioBuffer);

  audioContext.close();

  return pitchData;
}
