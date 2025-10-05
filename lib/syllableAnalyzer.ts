/**
 * Comprehensive Syllable Analyzer
 * Combines phonetic analysis + swara detection + pronunciation verification
 */

import { PitchData, SwaraType, SyllableWithSwara } from './pitchDetection';
import {
  analyzeSyllable,
  extractFormants,
  calculateSpectralCentroid,
  SANSKRIT_PHONEMES,
  PhoneticFeatures,
} from './sanskritPhonetics';

export interface SyllableAnalysisResult {
  syllableIndex: number;
  expectedText: string;
  expectedSwara: SwaraType;

  // Phonetic analysis
  phoneticScore: number;
  phoneticFeedback: string;
  articulationCorrect: boolean;

  // Swara (pitch pattern) analysis
  detectedSwara: SwaraType;
  swaraScore: number;
  swaraMatch: boolean;

  // Combined metrics
  overallScore: number;
  confidence: number;
  accuracy: 'perfect' | 'good' | 'fair' | 'poor';
}

export interface ComprehensiveAnalysisResult {
  syllableResults: SyllableAnalysisResult[];
  phoneticAccuracy: number;   // Did they say the right syllables?
  swaraAccuracy: number;       // Did they hit the right notes?
  pronunciationScore: number;  // How clear was pronunciation?
  confidenceScore: number;     // Voice volume/boldness
  overallScore: number;
  feedback: string[];
}

/**
 * Analyze a single syllable comprehensively
 */
async function analyzeSyllableComprehensive(
  expectedSyllable: SyllableWithSwara,
  syllableIndex: number,
  audioBuffer: Float32Array,
  sampleRate: number,
  userBasePitch: number
): Promise<SyllableAnalysisResult> {
  // 1. Extract acoustic features
  const formants = extractFormants(audioBuffer, sampleRate);
  const spectralCentroid = calculateSpectralCentroid(audioBuffer);

  // Calculate RMS energy (voice boldness)
  const rms = Math.sqrt(
    audioBuffer.reduce((sum, val) => sum + val * val, 0) / audioBuffer.length
  );
  const confidenceScore = Math.min(100, rms * 1000); // Normalize

  // 2. Phonetic analysis - Check if they said the right syllable
  let phoneticScore = 0;
  let phoneticFeedback = '';
  let articulationCorrect = false;

  // Extract first character for phonetic analysis
  const firstChar = expectedSyllable.text[0];
  const phonemeData = SANSKRIT_PHONEMES[firstChar];

  if (phonemeData) {
    const result = analyzeSyllable(firstChar, audioBuffer, sampleRate);
    phoneticScore = result.score;
    phoneticFeedback = result.feedback;
    articulationCorrect = result.score >= 70;
  } else {
    phoneticScore = 50; // Default for unknown characters
    phoneticFeedback = 'Character not in phoneme database';
  }

  // 3. Swara (pitch) analysis - Check if they hit the right note
  // Calculate average pitch for this syllable
  let avgFrequency = 0;
  let pitchCount = 0;

  // Use autocorrelation on the buffer to get pitch
  const pitch = estimatePitch(audioBuffer, sampleRate);
  if (pitch > 0) {
    avgFrequency = pitch;
    pitchCount = 1;
  }

  // Calculate relative pitch (in semitones from user's base)
  const relativeSemitones = pitchCount > 0
    ? 12 * Math.log2(avgFrequency / userBasePitch)
    : 0;

  // Detect which swara they sang
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

  // Score swara matching
  const swaraMatch = detectedSwara === expectedSyllable.swara;
  const expectedSemitones = getSwaraExpectedSemitones(expectedSyllable.swara);
  const semitoneDiff = Math.abs(relativeSemitones - expectedSemitones);

  let swaraScore: number;
  if (swaraMatch) {
    swaraScore = 100;
  } else if (semitoneDiff < 1.5) {
    swaraScore = 85;
  } else if (semitoneDiff < 3) {
    swaraScore = 60;
  } else {
    swaraScore = 30;
  }

  // 4. Calculate overall score
  // Weighting: 50% phonetic (right syllable) + 30% swara (right note) + 20% confidence (bold voice)
  const overallScore =
    phoneticScore * 0.5 +
    swaraScore * 0.3 +
    confidenceScore * 0.2;

  // 5. Determine accuracy level
  let accuracy: 'perfect' | 'good' | 'fair' | 'poor';
  if (overallScore >= 90) accuracy = 'perfect';
  else if (overallScore >= 75) accuracy = 'good';
  else if (overallScore >= 60) accuracy = 'fair';
  else accuracy = 'poor';

  return {
    syllableIndex,
    expectedText: expectedSyllable.text,
    expectedSwara: expectedSyllable.swara,
    phoneticScore,
    phoneticFeedback,
    articulationCorrect,
    detectedSwara,
    swaraScore,
    swaraMatch,
    overallScore,
    confidence: confidenceScore,
    accuracy,
  };
}

/**
 * Simple pitch estimation using autocorrelation
 */
function estimatePitch(buffer: Float32Array, sampleRate: number): number {
  const SIZE = buffer.length;
  const MAX_SAMPLES = Math.floor(SIZE / 2);

  // Calculate RMS
  let rms = 0;
  for (let i = 0; i < SIZE; i++) {
    rms += buffer[i] * buffer[i];
  }
  rms = Math.sqrt(rms / SIZE);

  if (rms < 0.01) return -1;

  // Autocorrelation
  let bestOffset = -1;
  let bestCorrelation = 0;

  for (let offset = Math.floor(sampleRate / 1000); offset < Math.floor(sampleRate / 80); offset++) {
    let correlation = 0;
    for (let i = 0; i < MAX_SAMPLES; i++) {
      correlation += buffer[i] * buffer[i + offset];
    }

    if (correlation > bestCorrelation) {
      bestCorrelation = correlation;
      bestOffset = offset;
    }
  }

  if (bestOffset > 0) {
    return sampleRate / bestOffset;
  }

  return -1;
}

/**
 * Get expected semitone offset for each swara
 */
function getSwaraExpectedSemitones(swara: SwaraType): number {
  switch (swara) {
    case 'anudhaata':
      return -2;
    case 'udhaata':
      return 0;
    case 'swarita':
      return 2;
    case 'dheerga':
      return 4;
  }
}

/**
 * Comprehensive analysis of full mantra chanting
 */
export async function analyzeMantraChanting(
  userAudioBuffer: AudioBuffer,
  syllables: SyllableWithSwara[]
): Promise<ComprehensiveAnalysisResult> {
  const sampleRate = userAudioBuffer.sampleRate;
  const channelData = userAudioBuffer.getChannelData(0);

  // Calculate user's base pitch from entire recording
  const userPitches: number[] = [];
  const windowSize = Math.floor(sampleRate * 0.1); // 100ms windows

  for (let i = 0; i < channelData.length - windowSize; i += windowSize / 2) {
    const window = channelData.slice(i, i + windowSize);
    const pitch = estimatePitch(window, sampleRate);
    if (pitch > 0 && pitch < 800) {
      userPitches.push(pitch);
    }
  }

  const userBasePitch =
    userPitches.length > 0
      ? userPitches.sort((a, b) => a - b)[Math.floor(userPitches.length / 2)]
      : 200; // default

  // Split audio into syllable chunks (equal duration)
  const duration = userAudioBuffer.duration;
  const syllableDuration = duration / syllables.length;

  const syllableResults: SyllableAnalysisResult[] = [];
  const feedback: string[] = [];

  // Analyze each syllable
  for (let i = 0; i < syllables.length; i++) {
    const startSample = Math.floor(i * syllableDuration * sampleRate);
    const endSample = Math.floor((i + 1) * syllableDuration * sampleRate);
    const syllableBuffer = channelData.slice(startSample, endSample);

    const result = await analyzeSyllableComprehensive(
      syllables[i],
      i,
      syllableBuffer,
      sampleRate,
      userBasePitch
    );

    syllableResults.push(result);

    // Generate feedback
    if (!result.articulationCorrect) {
      feedback.push(`Syllable "${result.expectedText}": ${result.phoneticFeedback}`);
    }
    if (!result.swaraMatch) {
      feedback.push(
        `Syllable "${result.expectedText}": Expected ${result.expectedSwara} swara, detected ${result.detectedSwara}`
      );
    }
  }

  // Calculate aggregate scores
  const phoneticAccuracy =
    syllableResults.reduce((sum, r) => sum + r.phoneticScore, 0) / syllables.length;

  const swaraAccuracy =
    syllableResults.reduce((sum, r) => sum + r.swaraScore, 0) / syllables.length;

  const pronunciationScore =
    syllableResults.filter(r => r.articulationCorrect).length / syllables.length * 100;

  const confidenceScore =
    syllableResults.reduce((sum, r) => sum + r.confidence, 0) / syllables.length;

  const overallScore =
    syllableResults.reduce((sum, r) => sum + r.overallScore, 0) / syllables.length;

  return {
    syllableResults,
    phoneticAccuracy: Math.round(phoneticAccuracy),
    swaraAccuracy: Math.round(swaraAccuracy),
    pronunciationScore: Math.round(pronunciationScore),
    confidenceScore: Math.round(confidenceScore),
    overallScore: Math.round(overallScore),
    feedback: feedback.slice(0, 5), // Top 5 issues
  };
}
