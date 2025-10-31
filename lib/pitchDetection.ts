/**
 * Pitch Detection Utilities
 * Uses autocorrelation algorithm for pitch detection from audio
 */

export type SwaraType = 'anudhaata' | 'udhaata' | 'swarita' | 'dheerga';

export interface PitchData {
  frequency: number;
  clarity: number;
  timestamp: number;
}

export interface SwaraAnalysis {
  detectedSwara: SwaraType;
  confidence: number;
  frequency: number;
  timestamp: number;
}

/**
 * Autocorrelation-based pitch detection with improved accuracy
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

  // Increased threshold for better signal detection - reduced false positives
  if (rms < 0.05) return -1;

  // Autocorrelation using proper method (not absolute difference)
  const correlations = new Float32Array(MAX_SAMPLES);

  for (let offset = 0; offset < MAX_SAMPLES; offset++) {
    let correlation = 0;
    for (let i = 0; i < MAX_SAMPLES; i++) {
      correlation += buffer[i] * buffer[i + offset];
    }
    correlations[offset] = correlation;
  }

  // Normalize correlations
  const maxCorr = correlations[0];
  for (let i = 0; i < correlations.length; i++) {
    correlations[i] /= maxCorr;
  }

  // Find first peak after zero crossing (for fundamental frequency)
  // Start from a minimum frequency (e.g., 80 Hz -> max offset)
  const minFreq = 80; // Hz
  const maxOffset = Math.floor(sampleRate / minFreq);
  const minOffset = Math.floor(sampleRate / 1000); // Max 1000 Hz

  for (let offset = minOffset; offset < Math.min(maxOffset, MAX_SAMPLES); offset++) {
    // Look for strong correlation peak
    if (correlations[offset] > 0.6 &&
        correlations[offset] > correlations[offset - 1] &&
        correlations[offset] >= correlations[offset + 1]) {

      // Parabolic interpolation for sub-sample accuracy
      const y1 = correlations[offset - 1];
      const y2 = correlations[offset];
      const y3 = correlations[offset + 1];
      const betterOffset = offset + (y3 - y1) / (2 * (2 * y2 - y1 - y3));

      best_offset = betterOffset;
      best_correlation = y2;
      break;
    }
  }

  if (best_offset !== -1 && best_correlation > 0.5) {
    const frequency = sampleRate / best_offset;
    // Filter out unrealistic frequencies
    if (frequency >= 80 && frequency <= 800) {
      return frequency;
    }
  }

  return -1;
}

/**
 * Median filter for smoothing pitch data
 */
function medianFilter(values: number[], windowSize: number = 5): number[] {
  const result: number[] = [];
  const halfWindow = Math.floor(windowSize / 2);

  for (let i = 0; i < values.length; i++) {
    const start = Math.max(0, i - halfWindow);
    const end = Math.min(values.length, i + halfWindow + 1);
    const window = values.slice(start, end).sort((a, b) => a - b);
    result.push(window[Math.floor(window.length / 2)]);
  }

  return result;
}

/**
 * Extract pitch from audio buffer with smoothing
 */
export async function extractPitchFromAudio(
  audioBuffer: AudioBuffer
): Promise<PitchData[]> {
  const rawPitchData: Array<{ frequency: number; timestamp: number }> = [];
  const sampleRate = audioBuffer.sampleRate;
  const channelData = audioBuffer.getChannelData(0);

  // Window size for pitch detection (about 100ms)
  const windowSize = Math.floor(sampleRate * 0.1);
  const hopSize = Math.floor(windowSize / 2); // 50% overlap

  for (let i = 0; i < channelData.length - windowSize; i += hopSize) {
    const buffer = channelData.slice(i, i + windowSize);
    const frequency = autoCorrelate(buffer, sampleRate);

    if (frequency > 0 && frequency < 800) {
      // Typical human voice range for chanting
      rawPitchData.push({
        frequency,
        timestamp: i / sampleRate,
      });
    }
  }

  // Apply median filter to smooth out noise and octave errors
  if (rawPitchData.length === 0) return [];

  const frequencies = rawPitchData.map(p => p.frequency);
  const smoothedFrequencies = medianFilter(frequencies, 5);

  const pitchData: PitchData[] = rawPitchData.map((p, i) => ({
    frequency: smoothedFrequencies[i],
    clarity: 1.0,
    timestamp: p.timestamp,
  }));

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
 * Dynamic Time Warping (DTW) for aligning two pitch sequences
 * Returns the optimal alignment cost and path
 */
function dynamicTimeWarping(
  reference: PitchData[],
  user: PitchData[]
): {
  cost: number;
  path: Array<[number, number]>;
} {
  const n = reference.length;
  const m = user.length;

  // Initialize DTW matrix with infinity
  const dtw: number[][] = Array(n + 1).fill(0).map(() => Array(m + 1).fill(Infinity));
  dtw[0][0] = 0;

  // Fill DTW matrix
  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= m; j++) {
      // Calculate pitch difference in semitones (more forgiving metric)
      const semitonesDiff = Math.abs(
        12 * Math.log2(user[j - 1].frequency / reference[i - 1].frequency)
      );

      // Cost function: penalize larger semitone differences
      const cost = semitonesDiff;

      // DTW recurrence relation with diagonal bias
      dtw[i][j] = cost + Math.min(
        dtw[i - 1][j],     // insertion
        dtw[i][j - 1],     // deletion
        dtw[i - 1][j - 1]  // match (preferred)
      );
    }
  }

  // Backtrack to find optimal path
  const path: Array<[number, number]> = [];
  let i = n;
  let j = m;

  while (i > 0 || j > 0) {
    path.unshift([i - 1, j - 1]);

    if (i === 0) {
      j--;
    } else if (j === 0) {
      i--;
    } else {
      const minVal = Math.min(dtw[i - 1][j], dtw[i][j - 1], dtw[i - 1][j - 1]);
      if (dtw[i - 1][j - 1] === minVal) {
        i--;
        j--;
      } else if (dtw[i - 1][j] === minVal) {
        i--;
      } else {
        j--;
      }
    }
  }

  return {
    cost: dtw[n][m],
    path,
  };
}

/**
 * Compare two pitch sequences using DTW for better alignment
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

  // Use DTW to align sequences
  const { path } = dynamicTimeWarping(reference, user);

  const details: Array<{
    timestamp: number;
    score: number;
    expectedFreq: number;
    actualFreq: number;
  }> = [];
  let totalPitchError = 0;
  let comparisons = 0;

  // Calculate scores along the aligned path
  for (const [refIdx, userIdx] of path) {
    if (refIdx >= 0 && refIdx < reference.length && userIdx >= 0 && userIdx < user.length) {
      const refPitch = reference[refIdx];
      const userPitch = user[userIdx];

      // Calculate pitch difference in semitones
      const semitonesDiff = Math.abs(
        12 * Math.log2(userPitch.frequency / refPitch.frequency)
      );

      // More lenient scoring: within 1 semitone is still good
      const pitchScore = Math.max(0, 100 - semitonesDiff * 20);

      details.push({
        timestamp: refPitch.timestamp,
        score: pitchScore,
        expectedFreq: refPitch.frequency,
        actualFreq: userPitch.frequency,
      });

      totalPitchError += semitonesDiff;
      comparisons++;
    }
  }

  // Calculate average pitch error with more lenient threshold
  const avgPitchError = comparisons > 0 ? totalPitchError / comparisons : 0;
  // Adjusted formula: 1 semitone off = 80% accuracy (was 90%)
  const pitchAccuracy = Math.max(0, Math.min(100, 100 - avgPitchError * 20));

  // Calculate rhythm accuracy based on length similarity (more forgiving)
  const lengthRatio = Math.min(user.length, reference.length) /
                      Math.max(user.length, reference.length);
  const rhythmAccuracy = Math.pow(lengthRatio, 0.5) * 100; // Square root for more lenient scoring

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

/**
 * Calculate base pitch (median of all pitches) for reference
 */
export function calculateBasePitch(pitchData: PitchData[]): number {
  if (pitchData.length === 0) return 200; // Default fallback

  const frequencies = pitchData.map(p => p.frequency).sort((a, b) => a - b);
  const median = frequencies[Math.floor(frequencies.length / 2)];
  return median;
}

/**
 * Classify swara based on pitch relative to base pitch
 * Using relative pitch movement to determine swara type
 */
export function classifySwara(
  currentFreq: number,
  basePitch: number,
  pitchHistory: number[] = []
): { swara: SwaraType; confidence: number } {
  // Calculate semitones from base
  const semitones = 12 * Math.log2(currentFreq / basePitch);

  // Calculate pitch movement (derivative)
  const isRising = pitchHistory.length >= 2 &&
    currentFreq > pitchHistory[pitchHistory.length - 1] &&
    currentFreq > pitchHistory[pitchHistory.length - 2];

  const isProlonged = pitchHistory.length >= 3 &&
    pitchHistory.slice(-3).every((f, i, arr) =>
      i === 0 || Math.abs(f - arr[i-1]) < 5 // Stable pitch
    );

  // Classification logic based on Vedic swara rules
  let swara: SwaraType;
  let confidence: number;

  if (semitones < -1.5) {
    // Significantly lower than base = Anudātta (low pitch)
    swara = 'anudhaata';
    confidence = Math.min(95, 70 + Math.abs(semitones) * 10);
  } else if (semitones > 1.5 && isRising && isProlonged) {
    // Rising and prolonged = Dīrgha Swarita
    swara = 'dheerga';
    confidence = Math.min(95, 75 + semitones * 5);
  } else if (semitones > 1.5 && isRising) {
    // Rising pitch = Swarita
    swara = 'swarita';
    confidence = Math.min(90, 70 + semitones * 8);
  } else {
    // Around base pitch = Udātta (stable/base)
    swara = 'udhaata';
    confidence = Math.min(90, 80 - Math.abs(semitones) * 5);
  }

  return { swara, confidence: Math.max(0, confidence) };
}

/**
 * Analyze pitch sequence and classify swaras with syllable mapping
 */
export interface SyllableWithSwara {
  text: string;
  swara: SwaraType;
  romanization?: string;
}

export interface SwaraSyllableMatch {
  syllableIndex: number;
  expectedSwara: SwaraType;
  detectedSwara: SwaraType;
  confidence: number;
  accuracy: 'perfect' | 'good' | 'fair' | 'poor';
  semitonesDiff: number;
}

/**
 * Analyze swara accuracy based on RELATIVE pitch patterns, not absolute frequencies
 * Speed-independent - allows users to learn slowly
 */
export function analyzeSwaraAccuracy(
  referencePitchData: PitchData[],
  userPitchData: PitchData[],
  syllables: SyllableWithSwara[]
): {
  syllableMatches: SwaraSyllableMatch[];
  swaraAccuracy: number;
  overallScore: number;
} {
  if (referencePitchData.length === 0 || userPitchData.length === 0 || syllables.length === 0) {
    return {
      syllableMatches: [],
      swaraAccuracy: 0,
      overallScore: 0,
    };
  }

  // Calculate base pitches for relative comparison
  const refFrequencies = referencePitchData.map(p => p.frequency).sort((a, b) => a - b);
  const userFrequencies = userPitchData.map(p => p.frequency).sort((a, b) => a - b);

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const refBasePitch = refFrequencies[Math.floor(refFrequencies.length / 2)];
  const userBasePitch = userFrequencies[Math.floor(userFrequencies.length / 2)];

  // Split user audio into syllable chunks (speed-independent)
  const userDuration = userPitchData[userPitchData.length - 1].timestamp;
  const syllableDuration = userDuration / syllables.length;

  const syllableMatches: SwaraSyllableMatch[] = [];
  let totalSwaraScore = 0;
  let totalVolumeScore = 0;

  syllables.forEach((syllable, index) => {
    const startTime = index * syllableDuration;
    const endTime = (index + 1) * syllableDuration;

    // Get user pitch data for this syllable
    const syllableUserPitches = userPitchData.filter(
      p => p.timestamp >= startTime && p.timestamp < endTime
    );

    if (syllableUserPitches.length === 0) {
      syllableMatches.push({
        syllableIndex: index,
        expectedSwara: syllable.swara,
        detectedSwara: 'udhaata',
        confidence: 0,
        accuracy: 'poor',
        semitonesDiff: 999,
      });
      totalSwaraScore += 30; // Minimal credit for silence
      totalVolumeScore += 0;
      return;
    }

    // Calculate RELATIVE pitch for this syllable
    const avgUserFreq = syllableUserPitches.reduce((sum, p) => sum + p.frequency, 0) / syllableUserPitches.length;
    const relativeSemitones = 12 * Math.log2(avgUserFreq / userBasePitch);

    // Detect which swara the user actually sang
    let detectedSwara: SwaraType;
    if (relativeSemitones < -1) {
      detectedSwara = 'anudhaata';
    } else if (relativeSemitones > 3) {
      detectedSwara = 'dheerga';
    } else if (relativeSemitones > 1) {
      detectedSwara = 'swarita';
    } else {
      detectedSwara = 'udhaata';
    }

    // Score based on swara matching (did they hit the right note?)
    let swaraScore: number;
    let accuracy: 'perfect' | 'good' | 'fair' | 'poor';

    if (detectedSwara === syllable.swara) {
      // Perfect swara match!
      swaraScore = 100;
      accuracy = 'perfect';
    } else {
      // Calculate how far off they were
      const expectedSemitones = getSwaraExpectedSemitones(syllable.swara);
      const semitonesDiff = Math.abs(relativeSemitones - expectedSemitones);

      if (semitonesDiff < 1.5) {
        // Close to correct swara
        swaraScore = 85;
        accuracy = 'good';
      } else if (semitonesDiff < 3) {
        // Somewhat off
        swaraScore = 60;
        accuracy = 'fair';
      } else {
        // Way off
        swaraScore = 30;
        accuracy = 'poor';
      }
    }

    // Calculate volume/confidence (RMS energy)
    // Higher RMS = more confident voice
    const volumeScore = Math.min(100, 50 + syllableUserPitches.length * 2); // Simple heuristic

    totalSwaraScore += swaraScore;
    totalVolumeScore += volumeScore;

    syllableMatches.push({
      syllableIndex: index,
      expectedSwara: syllable.swara,
      detectedSwara,
      confidence: swaraScore,
      accuracy,
      semitonesDiff: Math.abs(relativeSemitones - getSwaraExpectedSemitones(syllable.swara)),
    });
  });

  const swaraAccuracy = totalSwaraScore / syllables.length;
  const volumeAccuracy = totalVolumeScore / syllables.length;

  // Overall score: 80% swara pattern + 20% voice confidence
  const overallScore = swaraAccuracy * 0.8 + volumeAccuracy * 0.2;

  return {
    syllableMatches,
    swaraAccuracy: Math.round(swaraAccuracy),
    overallScore: Math.round(overallScore),
  };
}

/**
 * Get expected semitone offset for each swara type
 */
function getSwaraExpectedSemitones(swara: SwaraType): number {
  switch (swara) {
    case 'anudhaata': return -2;  // Low note
    case 'udhaata': return 0;      // Base note
    case 'swarita': return 2;      // High note
    case 'dheerga': return 4;      // Very high note
  }
}
