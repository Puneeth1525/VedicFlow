/**
 * Swara Analysis V2 - Contour-based syllable analysis
 *
 * Key improvements:
 * - Syllable-level analysis (not letter-level)
 * - Rolling baseline (handles pitch drift)
 * - Contour features (start, end, slope, duration, energy)
 * - Correct swara definitions (svarita = upward glide)
 */

// ============================================================================
// Types
// ============================================================================

export type SwaraType = 'udhaatha' | 'anudhaatha' | 'swarita' | 'dheerga';

export interface SyllableFeatures {
  canonicalIndex: number;   // Index into canonical syllable sequence
  syllableText: string;
  startTime: number;
  endTime: number;

  // Core acoustic features
  f0_start_hz: number;      // Starting pitch in Hz
  f0_end_hz: number;        // Ending pitch in Hz
  f0_start_st: number;      // Starting pitch in semitones (relative to A4=440)
  f0_end_st: number;        // Ending pitch in semitones
  slope_st_per_sec: number; // Pitch slope (semitones/second)
  duration_ms: number;      // Voiced duration in milliseconds
  energy_rms: number;       // RMS amplitude (proxy for emphasis)

  // Relative features (after baseline adjustment)
  delta_start: number;      // Start pitch relative to baseline (semitones)
  delta_end: number;        // End pitch relative to baseline (semitones)
  baseline_st: number;      // Local rolling baseline (semitones)

  // Cross-boundary features (context from previous syllable)
  cross_jump: number;       // Pitch jump from previous syllable end to this start
  cross_slope: number;      // Internal pitch rise (delta_end - delta_start)

  // Classification
  detectedSwara: SwaraType;
  confidence: number;       // 0-1 confidence score

  // Corrected classification (after canonical snapping)
  detectedSwaraCorrected: SwaraType;
  isAcceptable: boolean;    // True if within tolerance for canonical
  gradable: boolean;        // True if duration/confidence sufficient for grading

  // Flags
  sustainHighFlag: boolean; // True if sustained above baseline
  voicedRatio: number;      // Ratio of voiced to total duration (quality check)
}

export interface AnalysisResult {
  syllables: SyllableFeatures[];
  overallQuality: number;   // 0-1 quality score
  averageBaseline_hz: number;
  driftAmount_st: number;   // How much pitch drifted during recording
}

// ============================================================================
// Pitch Extraction (Autocorrelation-based F0 detection)
// ============================================================================

/**
 * Extract fundamental frequency using autocorrelation method
 */
export function extractPitchAutocorrelation(
  audioData: Float32Array,
  sampleRate: number,
  minFreq: number = 75,  // Minimum expected pitch (male voice)
  maxFreq: number = 400   // Maximum expected pitch (high voice)
): number | null {
  const minPeriod = Math.floor(sampleRate / maxFreq);
  const maxPeriod = Math.floor(sampleRate / minFreq);

  // Autocorrelation
  let maxCorrelation = 0;
  let bestPeriod = 0;

  for (let period = minPeriod; period <= maxPeriod; period++) {
    let correlation = 0;
    for (let i = 0; i < audioData.length - period; i++) {
      correlation += audioData[i] * audioData[i + period];
    }

    if (correlation > maxCorrelation) {
      maxCorrelation = correlation;
      bestPeriod = period;
    }
  }

  // Check if correlation is strong enough (voicing confidence)
  const energy = audioData.reduce((sum, x) => sum + x * x, 0);
  const normalizedCorrelation = maxCorrelation / energy;

  if (normalizedCorrelation < 0.3 || bestPeriod === 0) {
    return null; // Unvoiced or unreliable
  }

  return sampleRate / bestPeriod;
}

/**
 * Convert frequency (Hz) to semitones relative to A4=440Hz
 */
export function hzToSemitones(hz: number): number {
  return 12 * Math.log2(hz / 440);
}

/**
 * Convert semitones to Hz relative to A4=440Hz
 */
export function semitonesToHz(semitones: number): number {
  return 440 * Math.pow(2, semitones / 12);
}

/**
 * Extract pitch contour over a time window
 * Returns array of {time, hz} samples
 */
export function extractPitchContour(
  audioBuffer: AudioBuffer,
  startTime: number,
  endTime: number,
  windowSize: number = 0.03, // 30ms window
  hopSize: number = 0.01      // 10ms hop
): Array<{ time: number; hz: number | null }> {
  const sampleRate = audioBuffer.sampleRate;
  const audioData = audioBuffer.getChannelData(0);

  const startSample = Math.floor(startTime * sampleRate);
  const endSample = Math.floor(endTime * sampleRate);
  const windowSamples = Math.floor(windowSize * sampleRate);
  const hopSamples = Math.floor(hopSize * sampleRate);

  const contour: Array<{ time: number; hz: number | null }> = [];

  for (let i = startSample; i < endSample - windowSamples; i += hopSamples) {
    const window = audioData.slice(i, i + windowSamples);
    const hz = extractPitchAutocorrelation(window, sampleRate);
    const time = i / sampleRate;
    contour.push({ time, hz });
  }

  return contour;
}

/**
 * Smooth pitch contour using median filter to remove octave jumps
 */
export function smoothPitchContour(
  contour: Array<{ time: number; hz: number | null }>,
  windowSize: number = 5
): Array<{ time: number; hz: number | null }> {
  const smoothed = [...contour];
  const halfWindow = Math.floor(windowSize / 2);

  for (let i = 0; i < contour.length; i++) {
    const start = Math.max(0, i - halfWindow);
    const end = Math.min(contour.length, i + halfWindow + 1);
    const window = contour.slice(start, end)
      .map(p => p.hz)
      .filter((hz): hz is number => hz !== null);

    if (window.length > 0) {
      window.sort((a, b) => a - b);
      const median = window[Math.floor(window.length / 2)];
      smoothed[i] = { ...contour[i], hz: median };
    }
  }

  return smoothed;
}

// ============================================================================
// Feature Extraction per Syllable
// ============================================================================

/**
 * Extract acoustic features for a syllable
 */
export function extractSyllableFeatures(
  audioBuffer: AudioBuffer,
  syllableText: string,
  startTime: number,
  endTime: number
): Omit<SyllableFeatures, 'detectedSwara' | 'confidence' | 'delta_start' | 'delta_end' | 'baseline_st' | 'sustainHighFlag'> {
  // Extract pitch contour
  const rawContour = extractPitchContour(audioBuffer, startTime, endTime);
  const smoothContour = smoothPitchContour(rawContour);

  // Filter to voiced frames only
  const voicedFrames = smoothContour.filter(p => p.hz !== null) as Array<{ time: number; hz: number }>;
  const voicedRatio = voicedFrames.length / smoothContour.length;

  if (voicedFrames.length < 3) {
    // Not enough voiced data - return defaults
    return {
      canonicalIndex,
      syllableText,
      startTime,
      endTime,
      f0_start_hz: 0,
      f0_end_hz: 0,
      f0_start_st: 0,
      f0_end_st: 0,
      slope_st_per_sec: 0,
      duration_ms: (endTime - startTime) * 1000,
      energy_rms: 0,
      voicedRatio: 0,
      delta_start: 0,
      delta_end: 0,
      baseline_st: 0,
      cross_jump: 0,
      cross_slope: 0,
      detectedSwara: 'udhaatha' as SwaraType,
      confidence: 0,
      detectedSwaraCorrected: 'udhaatha' as SwaraType,
      isAcceptable: false,
      gradable: false,
      sustainHighFlag: false
    };
  }

  // Compute start and end pitch (average of first/last 30ms)
  const firstThird = voicedFrames.slice(0, Math.max(1, Math.floor(voicedFrames.length / 3)));
  const lastThird = voicedFrames.slice(-Math.max(1, Math.floor(voicedFrames.length / 3)));

  const f0_start_hz = firstThird.reduce((sum, p) => sum + p.hz, 0) / firstThird.length;
  const f0_end_hz = lastThird.reduce((sum, p) => sum + p.hz, 0) / lastThird.length;

  const f0_start_st = hzToSemitones(f0_start_hz);
  const f0_end_st = hzToSemitones(f0_end_hz);

  // Duration of voiced portion
  const duration_ms = voicedFrames.length * 10; // 10ms hop

  // Slope (semitones per second)
  const slope_st_per_sec = duration_ms > 0
    ? ((f0_end_st - f0_start_st) / duration_ms) * 1000
    : 0;

  // Energy (RMS amplitude)
  const sampleRate = audioBuffer.sampleRate;
  const audioData = audioBuffer.getChannelData(0);
  const startSample = Math.floor(startTime * sampleRate);
  const endSample = Math.floor(endTime * sampleRate);
  const segment = audioData.slice(startSample, endSample);
  const energy_rms = Math.sqrt(
    segment.reduce((sum, x) => sum + x * x, 0) / segment.length
  );

  return {
    syllableText,
    startTime,
    endTime,
    f0_start_hz,
    f0_end_hz,
    f0_start_st,
    f0_end_st,
    slope_st_per_sec,
    duration_ms,
    energy_rms,
    voicedRatio
  };
}

// ============================================================================
// Rolling Baseline Calculation
// ============================================================================

/**
 * Compute rolling baseline for each syllable
 * Uses median of recent CANONICAL UDĀTTA syllables only (not all syllables)
 * This prevents svarita peaks and anudātta dips from polluting the baseline
 */
export function computeRollingBaselines(
  syllables: Array<Omit<SyllableFeatures, 'detectedSwara' | 'confidence' | 'delta_start' | 'delta_end' | 'baseline_st' | 'sustainHighFlag' | 'cross_jump' | 'cross_slope' | 'canonicalIndex'>>,
  canonicalSwaras: SwaraType[]
): number[] {
  const baselines: number[] = [];
  const windowSize = 5; // Look at up to 5 previous udātta syllables

  // Find initial baseline from first few udātta syllables
  const firstUdaattaPitches = syllables
    .slice(0, Math.min(10, syllables.length))
    .map((s, idx) => ({ pitch: s.f0_start_st, idx }))
    .filter((item) => canonicalSwaras[item.idx] === 'udhaatha' && syllables[item.idx].voicedRatio > 0.5)
    .map(item => item.pitch);

  const globalBaseline = firstUdaattaPitches.length > 0
    ? firstUdaattaPitches.reduce((sum, p) => sum + p, 0) / firstUdaattaPitches.length
    : syllables[0]?.f0_start_st || 0;

  for (let i = 0; i < syllables.length; i++) {
    // Look back for previous canonical udātta syllables
    const udaattaPitches: number[] = [];
    for (let j = i - 1; j >= 0 && udaattaPitches.length < windowSize; j--) {
      if (canonicalSwaras[j] === 'udhaatha' && syllables[j].voicedRatio > 0.5) {
        udaattaPitches.push(syllables[j].f0_start_st);
      }
    }

    if (udaattaPitches.length >= 2) {
      // Use median of recent udātta syllables
      udaattaPitches.sort((a, b) => a - b);
      baselines.push(udaattaPitches[Math.floor(udaattaPitches.length / 2)]);
    } else if (udaattaPitches.length === 1) {
      baselines.push(udaattaPitches[0]);
    } else {
      // No prior udātta - use global baseline
      baselines.push(globalBaseline);
    }
  }

  return baselines;
}

// ============================================================================
// Rule-based Classification
// ============================================================================

/**
 * Classify syllable based on acoustic features
 * Uses cross-boundary features and relative comparisons to neighbors
 */
export function classifySyllable(
  features: SyllableFeatures,
  neighbors: {
    localHigh?: number;      // delta_start relative to recent udātta syllables
    longCompared?: number;   // duration relative to recent syllables
  } = {}
): { swara: SwaraType; confidence: number } {
  const {
    delta_start,
    delta_end,
    slope_st_per_sec,
    duration_ms,
    sustainHighFlag,
    cross_jump,
    cross_slope
  } = features;

  const { localHigh = 0, longCompared = 1.0 } = neighbors;

  // Priority-based classification

  // 1. Dheerga Svarita: Extremely high and long relative to neighbors
  // Must be extreme in BOTH dimensions, not just one
  if (localHigh > 1.0 && longCompared > 1.4 && sustainHighFlag && duration_ms > 200) {
    return { swara: 'dheerga', confidence: 0.9 };
  }

  // 2. Svarita: Upward glide detected via cross-boundary OR internal rise
  // A. Jump upward from previous syllable and land high
  if (cross_jump > 0.8 && delta_end > 0.8) {
    const confidence = Math.min(1.0, (cross_jump + delta_end) / 3.0);
    return { swara: 'swarita', confidence };
  }
  // B. Internal upward glide (rising pitch contour)
  if (cross_slope > 0.8 && slope_st_per_sec > 1.0) {
    const confidence = Math.min(1.0, (cross_slope + slope_st_per_sec) / 3.5);
    return { swara: 'swarita', confidence };
  }

  // 3. Anudhaatha: Starts low (defining characteristic)
  // Can rise afterwards - low start is what matters
  if (delta_start < -1.5) {
    const confidence = Math.min(1.0, Math.abs(delta_start) / 3.0);
    return { swara: 'anudhaatha', confidence };
  }

  // 4. Udhaatha: Default baseline (neutral)
  return { swara: 'udhaatha', confidence: 0.8 };
}

// ============================================================================
// Canonical Snapping & Tolerance
// ============================================================================

/**
 * Snap raw detected swara to acceptable corrected swara based on canonical expectation
 * This implements musical tolerance - how a human teacher would grade
 */
export function snapSwara(
  canonical: SwaraType,
  rawDetected: SwaraType,
  features: SyllableFeatures
): SwaraType {
  const {
    slope_st_per_sec,
    delta_start,
    delta_end,
    duration_ms,
    cross_jump,
    sustainHighFlag
  } = features;

  // If exact match, keep it
  if (rawDetected === canonical) {
    return rawDetected;
  }

  // Canonical-specific tolerance rules
  switch (canonical) {
    case 'udhaatha':
      // Udātta held long can look like Dīrgha - accept it
      if (rawDetected === 'dheerga') {
        return 'udhaatha';
      }
      // Only accept Svarita if there's clear rising accent
      if (rawDetected === 'swarita') {
        if (slope_st_per_sec > 2.0 && cross_jump > 1.0) {
          return 'swarita'; // Clear rising accent - keep it
        }
        return 'udhaatha'; // Snap back - not clear enough
      }
      return rawDetected;

    case 'anudhaatha':
      // Anudātta with recovery slope is still Anudātta
      if (rawDetected === 'swarita' && delta_start < -1.0) {
        return 'anudhaatha'; // Started low, snap back
      }
      return rawDetected;

    case 'swarita':
      // Svarita delivered as step-up instead of glide
      if (rawDetected === 'udhaatha') {
        if (cross_jump > 0.8 || delta_end > 0.8) {
          return 'swarita'; // Acceptable svarita delivery
        }
      }
      // Long svarita can look like Dīrgha
      if (rawDetected === 'dheerga') {
        return 'swarita';
      }
      return rawDetected;

    case 'dheerga':
      // Accept long Svarita as Dīrgha
      if (rawDetected === 'swarita' && duration_ms > 200 && sustainHighFlag) {
        return 'dheerga';
      }
      return rawDetected;

    default:
      return rawDetected;
  }
}

/**
 * Check if detected swara is acceptable for canonical, given acoustic features
 * More lenient than exact equality - reflects musical reality
 */
export function isAcceptable(
  canonical: SwaraType,
  detected: SwaraType,
  features: SyllableFeatures
): boolean {
  const {
    slope_st_per_sec,
    delta_start,
    delta_end,
    duration_ms,
    cross_jump,
    sustainHighFlag: _sustainHighFlag
  } = features;

  // Exact match always acceptable
  if (detected === canonical) {
    return true;
  }

  // Tolerance rules based on canonical expectation
  switch (canonical) {
    case 'udhaatha':
      // Long Udātta can acoustically appear as Dīrgha - acceptable
      if (detected === 'dheerga' && duration_ms > 300) {
        return true;
      }
      // Only reject Svarita if it has weak accent features
      if (detected === 'swarita') {
        return slope_st_per_sec > 1.5 && delta_end > 0.5;
      }
      return false;

    case 'anudhaatha':
      // Started low - that's what matters
      if (delta_start < -1.0) {
        return true; // Accept any classification if started low
      }
      return detected === 'anudhaatha';

    case 'swarita':
      // Accept Udātta if there's contextual rise
      if (detected === 'udhaatha' && (cross_jump > 0.8 || delta_end > 0.8)) {
        return true;
      }
      // Accept Dīrgha (long sustained svarita)
      if (detected === 'dheerga') {
        return true;
      }
      return detected === 'swarita';

    case 'dheerga':
      // Accept Svarita or Udātta if high and long
      if ((detected === 'swarita' || detected === 'udhaatha') &&
          duration_ms > 200 && delta_start > 0.5) {
        return true;
      }
      return detected === 'dheerga';

    default:
      return detected === canonical;
  }
}

// ============================================================================
// Sequence Smoothing
// ============================================================================

/**
 * Cost matrix for swara transitions
 * Lower cost = more similar swaras
 */
function getSwaraCost(detected: SwaraType, canonical: SwaraType): number {
  if (detected === canonical) return 0;

  // Near matches (similar acoustic features)
  if ((detected === 'swarita' && canonical === 'dheerga') ||
      (detected === 'dheerga' && canonical === 'swarita')) {
    return 0.5;
  }

  // Bad mismatches (opposite characteristics)
  if ((detected === 'anudhaatha' && canonical === 'swarita') ||
      (detected === 'swarita' && canonical === 'anudhaatha') ||
      (detected === 'anudhaatha' && canonical === 'dheerga') ||
      (detected === 'dheerga' && canonical === 'anudhaatha')) {
    return 2.0;
  }

  // Medium mismatches
  return 1.0;
}

/**
 * Smooth detected swara sequence against canonical pattern using DP
 * This reduces noise from single-frame misclassifications
 */
export function smoothSwaraSequence(
  detectedSwaras: SwaraType[],
  canonicalSwaras: SwaraType[],
  confidences: number[]
): SwaraType[] {
  const n = detectedSwaras.length;

  // If sequences don't match length, return detected as-is
  if (n !== canonicalSwaras.length) {
    return detectedSwaras;
  }

  const smoothed: SwaraType[] = [];

  for (let i = 0; i < n; i++) {
    const detected = detectedSwaras[i];
    const canonical = canonicalSwaras[i];
    const confidence = confidences[i];

    // High confidence detection - keep as-is
    if (confidence > 0.85) {
      smoothed.push(detected);
      continue;
    }

    // Calculate cost of keeping detected vs switching to canonical
    const keepCost = getSwaraCost(detected, canonical);

    // Look at neighbor agreement
    let neighborSupport = 0;
    if (i > 0 && detectedSwaras[i - 1] === canonical) neighborSupport++;
    if (i < n - 1 && detectedSwaras[i + 1] === canonical) neighborSupport++;

    // If canonical has strong neighbor support and current confidence is low, switch
    if (neighborSupport >= 1 && confidence < 0.7 && keepCost > 0.5) {
      smoothed.push(canonical);
    } else {
      smoothed.push(detected);
    }
  }

  return smoothed;
}

// ============================================================================
// Main Analysis Pipeline
// ============================================================================

/**
 * Analyze audio for swara classification
 * Now with canonical swara sequence for context-aware analysis
 */
export async function analyzeSwaras(
  audioBuffer: AudioBuffer,
  syllableTexts: string[] = [],
  canonicalSwaras: SwaraType[] = []
): Promise<AnalysisResult> {
  // For MVP: Simple syllable segmentation based on energy
  // In production: Use proper forced alignment
  const syllableTimings = segmentIntoSyllables(audioBuffer);

  // Limit to canonical length if provided
  const numSyllables = canonicalSwaras.length > 0
    ? Math.min(syllableTimings.length, canonicalSwaras.length)
    : syllableTimings.length;

  // Extract features for each syllable
  const rawFeatures = syllableTimings.slice(0, numSyllables).map((timing, i) => {
    const syllableText = i < syllableTexts.length ? syllableTexts[i] : `S${i + 1}`;
    return extractSyllableFeatures(
      audioBuffer,
      syllableText,
      timing.start,
      timing.end
    );
  });

  // Compute rolling baselines using ONLY canonical udātta syllables
  const baselines = computeRollingBaselines(rawFeatures, canonicalSwaras);

  // Add baseline-relative and cross-boundary features
  const syllables: SyllableFeatures[] = rawFeatures.map((features, i) => {
    const baseline_st = baselines[i];
    const delta_start = features.f0_start_st - baseline_st;
    const delta_end = features.f0_end_st - baseline_st;

    // Cross-boundary features
    const prev_delta_end = i > 0 ? rawFeatures[i - 1].f0_end_st - baselines[i - 1] : 0;
    const cross_jump = delta_start - prev_delta_end;
    const cross_slope = delta_end - delta_start;

    // Check if sustained high
    const sustainHighFlag = delta_start > 0.8 && features.duration_ms > 100;

    // Compute neighbor-relative features for dīrgha detection
    const recentUdaattaPitches: number[] = [];
    const recentDurations: number[] = [];
    for (let j = Math.max(0, i - 3); j < i; j++) {
      if (canonicalSwaras[j] === 'udhaatha') {
        recentUdaattaPitches.push(rawFeatures[j].f0_start_st - baselines[j]);
        recentDurations.push(rawFeatures[j].duration_ms);
      }
    }

    const localHigh = recentUdaattaPitches.length > 0
      ? delta_start - (recentUdaattaPitches.reduce((s, p) => s + p, 0) / recentUdaattaPitches.length)
      : 0;

    const longCompared = recentDurations.length > 0
      ? features.duration_ms / (recentDurations.reduce((s, d) => s + d, 0) / recentDurations.length)
      : 1.0;

    const withAllFeatures: SyllableFeatures = {
      canonicalIndex: i,
      ...features,
      baseline_st,
      delta_start,
      delta_end,
      cross_jump,
      cross_slope,
      sustainHighFlag,
      detectedSwara: 'udhaatha', // Will be set below
      confidence: 0,
      detectedSwaraCorrected: 'udhaatha', // Will be set below
      isAcceptable: false, // Will be set below
      gradable: true // Will be set below
    };

    // Classify with neighbor context
    const { swara, confidence } = classifySyllable(withAllFeatures, {
      localHigh,
      longCompared
    });
    withAllFeatures.detectedSwara = swara;
    withAllFeatures.confidence = confidence;

    // Apply canonical snapping if canonical swara is available
    if (i < canonicalSwaras.length) {
      const canonical = canonicalSwaras[i];

      // Snap to acceptable corrected swara
      withAllFeatures.detectedSwaraCorrected = snapSwara(canonical, swara, withAllFeatures);

      // Check if acceptable within tolerance
      withAllFeatures.isAcceptable = isAcceptable(canonical, withAllFeatures.detectedSwaraCorrected, withAllFeatures);

      // Mark as gradable only if duration and confidence are sufficient
      withAllFeatures.gradable = features.duration_ms >= 180 && confidence >= 0.7;
    } else {
      // No canonical swara - use raw values
      withAllFeatures.detectedSwaraCorrected = swara;
      withAllFeatures.isAcceptable = true;
      withAllFeatures.gradable = features.duration_ms >= 180 && confidence >= 0.7;
    }

    return withAllFeatures;
  });

  // Apply sequence smoothing if canonical swaras provided
  if (canonicalSwaras.length === syllables.length) {
    const detectedSwaras = syllables.map(s => s.detectedSwara);
    const confidences = syllables.map(s => s.confidence);
    const smoothedSwaras = smoothSwaraSequence(detectedSwaras, canonicalSwaras, confidences);

    // Update syllables with smoothed classifications
    syllables.forEach((syl, i) => {
      syl.detectedSwara = smoothedSwaras[i];
    });
  }

  // Compute overall metrics
  const validSyllables = syllables.filter(s => s.voicedRatio > 0.5);
  const averageBaseline_hz = validSyllables.length > 0
    ? validSyllables.reduce((sum, s) => sum + semitonesToHz(s.baseline_st), 0) / validSyllables.length
    : 0;

  const driftAmount_st = validSyllables.length > 1
    ? Math.abs(validSyllables[validSyllables.length - 1].baseline_st - validSyllables[0].baseline_st)
    : 0;

  const overallQuality = validSyllables.reduce((sum, s) => sum + s.confidence, 0) / validSyllables.length;

  return {
    syllables,
    overallQuality,
    averageBaseline_hz,
    driftAmount_st
  };
}

/**
 * Simple energy-based syllable segmentation (MVP)
 * In production: Use proper forced alignment with DTW
 */
function segmentIntoSyllables(
  audioBuffer: AudioBuffer,
  minSyllableDuration: number = 0.15 // 150ms minimum
): Array<{ start: number; end: number }> {
  const audioData = audioBuffer.getChannelData(0);
  const sampleRate = audioBuffer.sampleRate;
  const windowSize = Math.floor(0.02 * sampleRate); // 20ms window
  const hopSize = Math.floor(0.01 * sampleRate); // 10ms hop

  // Compute energy envelope
  const energy: number[] = [];
  for (let i = 0; i < audioData.length - windowSize; i += hopSize) {
    const window = audioData.slice(i, i + windowSize);
    const rms = Math.sqrt(window.reduce((sum, x) => sum + x * x, 0) / window.length);
    energy.push(rms);
  }

  // Find energy threshold
  const sortedEnergy = [...energy].sort((a, b) => a - b);
  const threshold = sortedEnergy[Math.floor(sortedEnergy.length * 0.3)]; // 30th percentile

  // Find syllable boundaries
  const segments: Array<{ start: number; end: number }> = [];
  let inSyllable = false;
  let syllableStart = 0;

  for (let i = 0; i < energy.length; i++) {
    const time = (i * hopSize) / sampleRate;

    if (!inSyllable && energy[i] > threshold) {
      // Start of syllable
      inSyllable = true;
      syllableStart = time;
    } else if (inSyllable && energy[i] <= threshold) {
      // End of syllable
      const duration = time - syllableStart;
      if (duration >= minSyllableDuration) {
        segments.push({ start: syllableStart, end: time });
      }
      inSyllable = false;
    }
  }

  // Close last syllable if still open
  if (inSyllable) {
    segments.push({ start: syllableStart, end: audioBuffer.duration });
  }

  return segments;
}
