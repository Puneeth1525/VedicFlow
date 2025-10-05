/**
 * Sanskrit Phonetic Analysis Library
 * Based on Devanagari Varnamala - identifies correct articulation of consonants and vowels
 */

export type ArticulationPoint =
  | 'guttural'    // कवर्ग - throat
  | 'palatal'     // चवर्ग - middle of mouth
  | 'cerebral'    // टवर्ग - roof of mouth (retroflex)
  | 'dental'      // तवर्ग - teeth
  | 'labial';     // पवर्ग - lips

export type VowelType =
  | 'short'       // अ, इ, उ, ऋ, ऌ
  | 'long'        // आ, ई, ऊ, ॠ, ॡ
  | 'diphthong';  // ए, ऐ, ओ, औ

export interface PhoneticFeatures {
  // Spectral features
  formants: number[];        // F1, F2, F3 frequencies
  spectralCentroid: number;  // Center of mass of spectrum
  spectralRolloff: number;   // Frequency below which 85% of energy is contained

  // Temporal features
  duration: number;          // Length of sound
  energy: number;            // RMS energy

  // Voicing
  isVoiced: boolean;         // Voiced vs unvoiced
  isAspirated: boolean;      // Aspirated vs unaspirated
  isNasal: boolean;          // Nasal consonants (ङ, ञ, ण, न, म)
}

export interface SanskritPhoneme {
  devanagari: string;
  romanization: string;
  articulationPoint: ArticulationPoint | null;
  type: 'vowel' | 'consonant' | 'semivowel' | 'sibilant';
  isVoiced: boolean;
  isAspirated: boolean;
  isNasal: boolean;
  expectedFormants?: number[]; // F1, F2, F3 for vowels
}

/**
 * Sanskrit Phoneme Database based on Varnamala
 */
export const SANSKRIT_PHONEMES: Record<string, SanskritPhoneme> = {
  // Vowels (स्वर)
  'अ': { devanagari: 'अ', romanization: 'a', articulationPoint: 'guttural', type: 'vowel', isVoiced: true, isAspirated: false, isNasal: false, expectedFormants: [700, 1220, 2600] },
  'आ': { devanagari: 'आ', romanization: 'ā', articulationPoint: 'guttural', type: 'vowel', isVoiced: true, isAspirated: false, isNasal: false, expectedFormants: [850, 1610, 2850] },
  'इ': { devanagari: 'इ', romanization: 'i', articulationPoint: 'palatal', type: 'vowel', isVoiced: true, isAspirated: false, isNasal: false, expectedFormants: [270, 2290, 3010] },
  'ई': { devanagari: 'ई', romanization: 'ī', articulationPoint: 'palatal', type: 'vowel', isVoiced: true, isAspirated: false, isNasal: false, expectedFormants: [270, 2290, 3010] },
  'उ': { devanagari: 'उ', romanization: 'u', articulationPoint: 'labial', type: 'vowel', isVoiced: true, isAspirated: false, isNasal: false, expectedFormants: [300, 870, 2240] },
  'ऊ': { devanagari: 'ऊ', romanization: 'ū', articulationPoint: 'labial', type: 'vowel', isVoiced: true, isAspirated: false, isNasal: false, expectedFormants: [300, 870, 2240] },
  'ए': { devanagari: 'ए', romanization: 'e', articulationPoint: 'palatal', type: 'vowel', isVoiced: true, isAspirated: false, isNasal: false, expectedFormants: [390, 2300, 3000] },
  'ओ': { devanagari: 'ओ', romanization: 'o', articulationPoint: 'labial', type: 'vowel', isVoiced: true, isAspirated: false, isNasal: false, expectedFormants: [450, 880, 2830] },

  // Gutturals (कवर्ग) - throat
  'क': { devanagari: 'क', romanization: 'ka', articulationPoint: 'guttural', type: 'consonant', isVoiced: false, isAspirated: false, isNasal: false },
  'ख': { devanagari: 'ख', romanization: 'kha', articulationPoint: 'guttural', type: 'consonant', isVoiced: false, isAspirated: true, isNasal: false },
  'ग': { devanagari: 'ग', romanization: 'ga', articulationPoint: 'guttural', type: 'consonant', isVoiced: true, isAspirated: false, isNasal: false },
  'घ': { devanagari: 'घ', romanization: 'gha', articulationPoint: 'guttural', type: 'consonant', isVoiced: true, isAspirated: true, isNasal: false },
  'ङ': { devanagari: 'ङ', romanization: 'ṅa', articulationPoint: 'guttural', type: 'consonant', isVoiced: true, isAspirated: false, isNasal: true },

  // Palatals (चवर्ग) - middle of mouth
  'च': { devanagari: 'च', romanization: 'ca', articulationPoint: 'palatal', type: 'consonant', isVoiced: false, isAspirated: false, isNasal: false },
  'छ': { devanagari: 'छ', romanization: 'cha', articulationPoint: 'palatal', type: 'consonant', isVoiced: false, isAspirated: true, isNasal: false },
  'ज': { devanagari: 'ज', romanization: 'ja', articulationPoint: 'palatal', type: 'consonant', isVoiced: true, isAspirated: false, isNasal: false },
  'झ': { devanagari: 'झ', romanization: 'jha', articulationPoint: 'palatal', type: 'consonant', isVoiced: true, isAspirated: true, isNasal: false },
  'ञ': { devanagari: 'ञ', romanization: 'ña', articulationPoint: 'palatal', type: 'consonant', isVoiced: true, isAspirated: false, isNasal: true },

  // Cerebrals (टवर्ग) - roof of mouth (retroflex)
  'ट': { devanagari: 'ट', romanization: 'ṭa', articulationPoint: 'cerebral', type: 'consonant', isVoiced: false, isAspirated: false, isNasal: false },
  'ठ': { devanagari: 'ठ', romanization: 'ṭha', articulationPoint: 'cerebral', type: 'consonant', isVoiced: false, isAspirated: true, isNasal: false },
  'ड': { devanagari: 'ड', romanization: 'ḍa', articulationPoint: 'cerebral', type: 'consonant', isVoiced: true, isAspirated: false, isNasal: false },
  'ढ': { devanagari: 'ढ', romanization: 'ḍha', articulationPoint: 'cerebral', type: 'consonant', isVoiced: true, isAspirated: true, isNasal: false },
  'ण': { devanagari: 'ण', romanization: 'ṇa', articulationPoint: 'cerebral', type: 'consonant', isVoiced: true, isAspirated: false, isNasal: true },

  // Dentals (तवर्ग) - teeth
  'त': { devanagari: 'त', romanization: 'ta', articulationPoint: 'dental', type: 'consonant', isVoiced: false, isAspirated: false, isNasal: false },
  'थ': { devanagari: 'थ', romanization: 'tha', articulationPoint: 'dental', type: 'consonant', isVoiced: false, isAspirated: true, isNasal: false },
  'द': { devanagari: 'द', romanization: 'da', articulationPoint: 'dental', type: 'consonant', isVoiced: true, isAspirated: false, isNasal: false },
  'ध': { devanagari: 'ध', romanization: 'dha', articulationPoint: 'dental', type: 'consonant', isVoiced: true, isAspirated: true, isNasal: false },
  'न': { devanagari: 'न', romanization: 'na', articulationPoint: 'dental', type: 'consonant', isVoiced: true, isAspirated: false, isNasal: true },

  // Labials (पवर्ग) - lips
  'प': { devanagari: 'प', romanization: 'pa', articulationPoint: 'labial', type: 'consonant', isVoiced: false, isAspirated: false, isNasal: false },
  'फ': { devanagari: 'फ', romanization: 'pha', articulationPoint: 'labial', type: 'consonant', isVoiced: false, isAspirated: true, isNasal: false },
  'ब': { devanagari: 'ब', romanization: 'ba', articulationPoint: 'labial', type: 'consonant', isVoiced: true, isAspirated: false, isNasal: false },
  'भ': { devanagari: 'भ', romanization: 'bha', articulationPoint: 'labial', type: 'consonant', isVoiced: true, isAspirated: true, isNasal: false },
  'म': { devanagari: 'म', romanization: 'ma', articulationPoint: 'labial', type: 'consonant', isVoiced: true, isAspirated: false, isNasal: true },

  // Semi-vowels (अन्तःस्थ)
  'य': { devanagari: 'य', romanization: 'ya', articulationPoint: 'palatal', type: 'semivowel', isVoiced: true, isAspirated: false, isNasal: false },
  'र': { devanagari: 'र', romanization: 'ra', articulationPoint: 'cerebral', type: 'semivowel', isVoiced: true, isAspirated: false, isNasal: false },
  'ल': { devanagari: 'ल', romanization: 'la', articulationPoint: 'dental', type: 'semivowel', isVoiced: true, isAspirated: false, isNasal: false },
  'व': { devanagari: 'व', romanization: 'va', articulationPoint: 'labial', type: 'semivowel', isVoiced: true, isAspirated: false, isNasal: false },

  // Sibilants (ऊष्म)
  'श': { devanagari: 'श', romanization: 'śa', articulationPoint: 'palatal', type: 'sibilant', isVoiced: false, isAspirated: false, isNasal: false },
  'ष': { devanagari: 'ष', romanization: 'ṣa', articulationPoint: 'cerebral', type: 'sibilant', isVoiced: false, isAspirated: false, isNasal: false },
  'स': { devanagari: 'स', romanization: 'sa', articulationPoint: 'dental', type: 'sibilant', isVoiced: false, isAspirated: false, isNasal: false },
  'ह': { devanagari: 'ह', romanization: 'ha', articulationPoint: 'guttural', type: 'sibilant', isVoiced: true, isAspirated: false, isNasal: false },
};

/**
 * Extract formant frequencies from audio using LPC (Linear Predictive Coding)
 */
export function extractFormants(audioBuffer: Float32Array, sampleRate: number): number[] {
  // Simplified formant extraction using spectral peaks
  const fftSize = 2048;
  const frequencies: number[] = [];

  // Perform FFT (simplified - in real implementation use FFT library)
  // For now, return approximate formants
  // This is a placeholder - real implementation would use proper DSP

  return [700, 1220, 2600]; // Default vowel formants
}

/**
 * Calculate spectral centroid (brightness of sound)
 */
export function calculateSpectralCentroid(spectrum: Float32Array): number {
  let weightedSum = 0;
  let sum = 0;

  for (let i = 0; i < spectrum.length; i++) {
    weightedSum += i * spectrum[i];
    sum += spectrum[i];
  }

  return sum > 0 ? weightedSum / sum : 0;
}

/**
 * Detect if consonant is voiced or unvoiced using zero-crossing rate
 */
export function detectVoicing(audioBuffer: Float32Array): boolean {
  let zeroCrossings = 0;

  for (let i = 1; i < audioBuffer.length; i++) {
    if ((audioBuffer[i] >= 0 && audioBuffer[i - 1] < 0) ||
        (audioBuffer[i] < 0 && audioBuffer[i - 1] >= 0)) {
      zeroCrossings++;
    }
  }

  const zcr = zeroCrossings / audioBuffer.length;

  // Voiced sounds have lower zero-crossing rate
  return zcr < 0.3;
}

/**
 * Detect aspiration (breath after consonant)
 */
export function detectAspiration(audioBuffer: Float32Array, sampleRate: number): boolean {
  // Check for burst of noise energy after main consonant
  const windowSize = Math.floor(sampleRate * 0.02); // 20ms window

  let maxEnergy = 0;
  for (let i = 0; i < audioBuffer.length - windowSize; i += windowSize) {
    let energy = 0;
    for (let j = 0; j < windowSize; j++) {
      energy += audioBuffer[i + j] * audioBuffer[i + j];
    }
    maxEnergy = Math.max(maxEnergy, energy / windowSize);
  }

  // Aspirated sounds have higher energy burst
  return maxEnergy > 0.05;
}

/**
 * Detect nasality using spectral features
 */
export function detectNasality(formants: number[]): boolean {
  // Nasal consonants have lower F1 and additional nasal formant around 250Hz
  if (formants.length < 2) return false;

  const f1 = formants[0];
  const hasNasalFormant = formants.some(f => f > 200 && f < 350);

  return f1 < 400 && hasNasalFormant;
}

/**
 * Identify articulation point based on formants
 */
export function identifyArticulationPoint(formants: number[]): ArticulationPoint {
  if (formants.length < 2) return 'dental'; // default

  const f1 = formants[0];
  const f2 = formants[1];

  // Gutturals: low F1, low F2
  if (f1 < 600 && f2 < 1400) return 'guttural';

  // Palatals: low F1, high F2
  if (f1 < 600 && f2 > 1800) return 'palatal';

  // Labials: low F1, medium F2
  if (f1 < 600 && f2 > 1000 && f2 < 1600) return 'labial';

  // Cerebrals (retroflexes): lowered F3
  if (formants.length >= 3 && formants[2] < 2500) return 'cerebral';

  // Dentals: default
  return 'dental';
}

/**
 * Compare two phonemes and calculate similarity score
 */
export function comparePhonemes(
  expected: SanskritPhoneme,
  detectedFeatures: PhoneticFeatures
): {
  score: number;
  articulationMatch: boolean;
  voicingMatch: boolean;
  aspirationMatch: boolean;
  nasalityMatch: boolean;
  feedback: string;
} {
  let score = 0;
  const feedback: string[] = [];

  // Detect articulation point from formants
  const detectedArticulation = identifyArticulationPoint(detectedFeatures.formants);
  const articulationMatch = detectedArticulation === expected.articulationPoint;

  if (articulationMatch) {
    score += 40; // 40% for correct articulation
  } else {
    feedback.push(`Wrong articulation: detected ${detectedArticulation}, expected ${expected.articulationPoint}`);
  }

  // Check voicing
  const voicingMatch = detectedFeatures.isVoiced === expected.isVoiced;
  if (voicingMatch) {
    score += 20; // 20% for correct voicing
  } else {
    feedback.push(`${expected.isVoiced ? 'Should be voiced' : 'Should be unvoiced'}`);
  }

  // Check aspiration
  const aspirationMatch = detectedFeatures.isAspirated === expected.isAspirated;
  if (aspirationMatch) {
    score += 20; // 20% for correct aspiration
  } else {
    feedback.push(`${expected.isAspirated ? 'Should be aspirated' : 'Should be unaspirated'}`);
  }

  // Check nasality
  const nasalityMatch = detectedFeatures.isNasal === expected.isNasal;
  if (nasalityMatch) {
    score += 20; // 20% for correct nasality
  } else {
    feedback.push(`${expected.isNasal ? 'Should be nasal' : 'Should not be nasal'}`);
  }

  return {
    score,
    articulationMatch,
    voicingMatch,
    aspirationMatch,
    nasalityMatch,
    feedback: feedback.join(', '),
  };
}

/**
 * Analyze a syllable and return phonetic accuracy
 */
export function analyzeSyllable(
  expectedDevanagari: string,
  audioBuffer: Float32Array,
  sampleRate: number
): {
  score: number;
  detectedPhoneme: string;
  feedback: string;
  articulationPoint: ArticulationPoint | null;
} {
  const expected = SANSKRIT_PHONEMES[expectedDevanagari];

  if (!expected) {
    return {
      score: 0,
      detectedPhoneme: '?',
      feedback: 'Unknown phoneme',
      articulationPoint: null,
    };
  }

  // Extract phonetic features
  const formants = extractFormants(audioBuffer, sampleRate);
  const isVoiced = detectVoicing(audioBuffer);
  const isAspirated = detectAspiration(audioBuffer, sampleRate);
  const isNasal = detectNasality(formants);
  const spectralCentroid = 0; // Placeholder
  const spectralRolloff = 0; // Placeholder

  const features: PhoneticFeatures = {
    formants,
    spectralCentroid,
    spectralRolloff,
    duration: audioBuffer.length / sampleRate,
    energy: Math.sqrt(audioBuffer.reduce((sum, val) => sum + val * val, 0) / audioBuffer.length),
    isVoiced,
    isAspirated,
    isNasal,
  };

  // Compare with expected
  const result = comparePhonemes(expected, features);

  const detectedArticulation = identifyArticulationPoint(formants);

  return {
    score: result.score,
    detectedPhoneme: expectedDevanagari, // For now
    feedback: result.feedback,
    articulationPoint: detectedArticulation,
  };
}
