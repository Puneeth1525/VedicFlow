/**
 * Syllable Analyzer using Whisper AI for pronunciation verification
 * AND V2 contour-based pitch analysis for swara detection
 */

import { SwaraType, SyllableWithSwara } from './pitchDetection';
import { transcribeAudioToText, calculatePhoneticSimilarity } from './speechRecognition';
import { analyzeSwaras as analyzeSwarasV2 } from './swaraAnalyzerV2';

export interface SyllableAnalysisResult {
  syllableIndex: number;
  expectedText: string;
  transcribedText: string;
  expectedSwara: SwaraType;

  // Only pronunciation matching for now
  pronunciationScore: number;
  pronunciationMatch: boolean;

  // Placeholder for future swara analysis
  detectedSwara: SwaraType;
  swaraScore: number;
  swaraMatch: boolean;

  overallScore: number;
  accuracy: 'perfect' | 'good' | 'fair' | 'poor';
  swaraAccuracy: 'perfect' | 'good' | 'fair' | 'poor'; // Swara-only accuracy for arrow colors

  // Pitch data from V2 analyzer (optional, only when available)
  pitchData?: {
    startPitch: number;      // Hz
    endPitch: number;        // Hz
    deltaStart: number;      // semitones relative to baseline
    deltaEnd: number;        // semitones relative to baseline
    slope: number;           // st/s
    duration: number;        // seconds
    voicedRatio: number;     // 0-1
  };

  feedback?: string;  // Optional individual syllable feedback
}

export interface DetailedFeedback {
  pronunciationMistakes: Array<{
    syllable: string;
    expected: string;
    heard: string;
    position: number;
  }>;
  swaraMistakes: Array<{
    syllable: string;
    expectedSwara: string;
    detectedSwara: string;
    position: number;
  }>;
  summary: {
    pronunciationScore: number;
    swaraScore: number;
    overallScore: number;
    totalSyllables: number;
    correctPronunciation: number;
    correctSwaras: number;
  };
}

export interface ComprehensiveAnalysisResult {
  syllableResults: SyllableAnalysisResult[];
  transcribedText: string;
  expectedText: string;
  pronunciationAccuracy: number;
  swaraAccuracy?: number;
  overallScore: number;
  feedback: string[];  // Kept for backward compatibility
  detailedFeedback: DetailedFeedback;  // New detailed feedback
}

/**
 * Main analysis function - uses Whisper AI to transcribe and match
 */
export async function analyzeMantraChanting(
  userAudioBuffer: AudioBuffer,
  syllables: SyllableWithSwara[],
  referenceAudioBuffer?: AudioBuffer,
  verseStartTime?: number,
  verseEndTime?: number,
  userAudioBlob?: Blob,
  userBaseToneHz?: number  // User's personal baseline from onboarding
): Promise<ComprehensiveAnalysisResult> {

  console.log('\n🎯 Starting Whisper-based pronunciation analysis...');

  // Step 1: Transcribe user's audio using Whisper
  if (!userAudioBlob) {
    console.error('❌ No audio blob provided for transcription');
    return createEmptyResult(syllables);
  }

  const transcriptionResult = await transcribeAudioToText(userAudioBlob);

  if (!transcriptionResult.success) {
    console.error('❌ Whisper transcription failed');
    return createEmptyResult(syllables);
  }

  console.log(`✅ Whisper transcribed: "${transcriptionResult.transcript}"`);

  // Step 2: Extract expected text from syllables
  const expectedText = syllables.map(s => s.text).join('');
  console.log(`📝 Expected text: "${expectedText}"`);

  // Step 3: Calculate overall similarity
  const overallSimilarity = calculatePhoneticSimilarity(
    transcriptionResult.transcript,
    expectedText
  );

  console.log(`📊 Overall pronunciation match: ${overallSimilarity}%`);

  // Step 4: Perform swara detection using ML pitch analysis
  console.log('\n🎵 Starting ML-based swara detection...');
  let swaraResults: SyllableAnalysisResult[] = [];

  try {
    swaraResults = await analyzeSwaras(userAudioBuffer, syllables, userBaseToneHz);
    console.log(`✅ Swara analysis complete`);
  } catch (error) {
    console.error('⚠️ Swara detection failed:', error);
    // Fallback to pronunciation-only analysis
    swaraResults = matchIndividualAksharas(syllables, transcriptionResult.transcript, expectedText);
  }

  // Step 5: Match individual aksharas for pronunciation
  const pronunciationResults = matchIndividualAksharas(
    syllables,
    transcriptionResult.transcript,
    expectedText
  );

  // Step 6: Combine pronunciation and swara scores
  const syllableResults = combineResults(pronunciationResults, swaraResults);

  // Calculate swara accuracy
  const swaraMatches = swaraResults.filter(r => r.swaraMatch).length;
  const swaraAccuracy = swaraResults.length > 0
    ? Math.round((swaraMatches / swaraResults.length) * 100)
    : 0;

  // Step 7: Generate detailed feedback
  const pronunciationMistakes = syllableResults
    .filter(r => !r.pronunciationMatch || r.pronunciationScore < 70)
    .map(r => ({
      syllable: r.expectedText,
      expected: r.expectedText,
      heard: r.transcribedText,
      position: r.syllableIndex + 1
    }));

  const swaraMistakes = syllableResults
    .filter(r => !r.swaraMatch)
    .map(r => ({
      syllable: r.expectedText,
      expectedSwara: getSwaraDisplayName(r.expectedSwara),
      detectedSwara: getSwaraDisplayName(r.detectedSwara),
      position: r.syllableIndex + 1
    }));

  const correctPronunciation = syllableResults.filter(r => r.pronunciationMatch && r.pronunciationScore >= 70).length;
  const correctSwaras = syllableResults.filter(r => r.swaraMatch).length;

  const detailedFeedback: DetailedFeedback = {
    pronunciationMistakes,
    swaraMistakes,
    summary: {
      pronunciationScore: overallSimilarity,
      swaraScore: swaraAccuracy,
      overallScore: overallSimilarity,
      totalSyllables: syllableResults.length,
      correctPronunciation,
      correctSwaras
    }
  };

  // Simple feedback for backward compatibility
  const feedback: string[] = [];
  if (overallSimilarity >= 80) {
    feedback.push('Excellent pronunciation! 🎉');
  } else if (overallSimilarity >= 65) {
    feedback.push('Good pronunciation! Keep practicing.');
  } else if (overallSimilarity >= 45) {
    feedback.push('Fair pronunciation. Try listening to the reference audio again.');
  } else {
    feedback.push('Keep practicing! Listen carefully to the reference audio.');
  }

  return {
    syllableResults,
    transcribedText: transcriptionResult.transcript,
    expectedText,
    pronunciationAccuracy: overallSimilarity,
    swaraAccuracy,
    overallScore: overallSimilarity,
    feedback,
    detailedFeedback
  };
}

/**
 * Convert swara type to display name
 */
function getSwaraDisplayName(swara: SwaraType): string {
  switch (swara) {
    case 'udhaatha':
      return 'Udātta';
    case 'anudhaatha':
      return 'Anudātta';
    case 'swarita':
      return 'Svarita';
    case 'dheerga':
      return 'Dīrgha Svarita';
    default:
      return swara;
  }
}

/**
 * Match individual aksharas by attempting word alignment
 */
function matchIndividualAksharas(
  syllables: SyllableWithSwara[],
  transcribedText: string,
  expectedText: string
): SyllableAnalysisResult[] {

  // Normalize both texts for comparison
  const normalizeText = (text: string) => text
    .replace(/\s+/g, '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

  const normalizedTranscript = normalizeText(transcribedText);
  const normalizedExpected = normalizeText(expectedText);

  // If texts match exactly, mark all syllables as perfect
  if (normalizedTranscript === normalizedExpected) {
    return syllables.map((s, i) => ({
      syllableIndex: i,
      expectedText: s.text,
      transcribedText: s.text,
      expectedSwara: s.swara,
      pronunciationScore: 100,
      pronunciationMatch: true,
      detectedSwara: 'udhaatha' as const,
      swaraScore: 0,
      swaraMatch: false,
      overallScore: 100,
      accuracy: 'perfect' as const,
      swaraAccuracy: 'poor' as const
    }));
  }

  // Calculate overall similarity to determine if we should show all as correct
  const overallSimilarity = calculatePhoneticSimilarity(
    normalizedTranscript,
    normalizedExpected
  );

  // If overall pronunciation is good (>= 75%), mark all aksharas as correct
  // This handles cases where Whisper transcribes with minor variations or spacing
  if (overallSimilarity >= 75) {
    return syllables.map((s, i) => ({
      syllableIndex: i,
      expectedText: s.text,
      transcribedText: s.text,
      expectedSwara: s.swara,
      pronunciationScore: overallSimilarity,
      pronunciationMatch: true,
      detectedSwara: 'udhaatha' as const,
      swaraScore: 0,
      swaraMatch: false,
      overallScore: overallSimilarity,
      accuracy: 'perfect' as const,  // Show all as green when overall is good
      swaraAccuracy: 'poor' as const
    }));
  }

  // If not good enough, try to align syllables for detailed feedback
  const results: SyllableAnalysisResult[] = [];
  let transcriptPosition = 0;

  for (let i = 0; i < syllables.length; i++) {
    const expectedAkshara = syllables[i].text;
    const normalizedExpectedAkshara = normalizeText(expectedAkshara);
    const aksharaLength = normalizedExpectedAkshara.length;

    // Extract corresponding portion from transcript
    const transcriptPortion = normalizedTranscript.substring(
      transcriptPosition,
      transcriptPosition + aksharaLength
    );

    // Calculate similarity
    const pronunciationScore = calculatePhoneticSimilarity(
      transcriptPortion,
      normalizedExpectedAkshara
    );

    const pronunciationMatch = pronunciationScore >= 50;

    results.push({
      syllableIndex: i,
      expectedText: expectedAkshara,
      transcribedText: transcriptPortion || expectedAkshara,
      expectedSwara: syllables[i].swara,
      pronunciationScore,
      pronunciationMatch,

      // Placeholder - not analyzing swaras yet
      detectedSwara: 'udhaatha',
      swaraScore: 0,
      swaraMatch: false,

      overallScore: pronunciationScore,
      accuracy: pronunciationScore >= 70 ? 'perfect' :  // Green for >= 70%
                pronunciationScore >= 50 ? 'fair' :      // Orange for 50-69%
                'poor',                                  // Red only for < 50%
      swaraAccuracy: 'poor'
    });

    // Move position forward
    transcriptPosition += aksharaLength;
  }

  return results;
}

/**
 * Analyze swaras using V2 contour-based pitch analysis
 * Uses rolling baseline, cross-boundary features, and tolerance-based matching
 */
async function analyzeSwaras(
  audioBuffer: AudioBuffer,
  syllables: SyllableWithSwara[],
  _userBaseToneHz?: number
): Promise<SyllableAnalysisResult[]> {

  console.log('\n🎯 Starting V2 swara analysis with contour-based detection...');

  // Prepare canonical data for V2 analyzer
  const syllableTexts = syllables.map(s => s.text);
  const canonicalSwaras = syllables.map(s => s.swara);

  try {
    // Run V2 analysis with canonical context
    const v2Result = await analyzeSwarasV2(audioBuffer, syllableTexts, canonicalSwaras);

    console.log(`✅ V2 analysis complete: ${v2Result.syllables.length} syllables analyzed`);

    // Convert V2 results to old interface format
    const results: SyllableAnalysisResult[] = v2Result.syllables.map((v2Syl) => {
      const expectedSwara = syllables[v2Syl.canonicalIndex].swara;

      // Use corrected swara and tolerance-based matching from V2
      const detectedSwara = v2Syl.detectedSwaraCorrected;

      // swaraMatch should ONLY check if swara is acceptable, not gradability
      // Gradability affects scoring but shouldn't create false mistakes
      const swaraMatch = v2Syl.isAcceptable;
      const isGradable = v2Syl.gradable;

      // Calculate score based on tolerance matching AND gradability
      // Non-gradable syllables (too short/low confidence) get lower scores but aren't marked as mistakes
      const baseScore = swaraMatch ? 95 : 40;
      const score = isGradable ? baseScore : Math.min(baseScore, 60);

      const accuracy = score >= 90 ? 'perfect' :
                      score >= 75 ? 'good' :
                      score >= 60 ? 'fair' : 'poor';

      console.log(`📊 [${v2Syl.syllableText}] ` +
                  `expected=${expectedSwara}, detected=${detectedSwara}, ` +
                  `match=${swaraMatch ? '✅' : '❌'}, ` +
                  `gradable=${isGradable}, score=${score}%`);

      return {
        syllableIndex: v2Syl.canonicalIndex,
        expectedText: v2Syl.syllableText,
        transcribedText: v2Syl.syllableText,
        expectedSwara,
        pronunciationScore: 100,
        pronunciationMatch: true,
        detectedSwara,
        swaraScore: score,
        swaraMatch,  // Only based on swara correctness, not gradability
        overallScore: score,
        accuracy: accuracy as 'perfect' | 'good' | 'fair' | 'poor',
        swaraAccuracy: accuracy as 'perfect' | 'good' | 'fair' | 'poor',
        pitchData: {
          startPitch: v2Syl.f0_start_hz,
          endPitch: v2Syl.f0_end_hz,
          deltaStart: v2Syl.delta_start,
          deltaEnd: v2Syl.delta_end,
          slope: v2Syl.slope_st_per_sec,
          duration: v2Syl.duration_ms / 1000,  // Convert ms to seconds
          voicedRatio: v2Syl.voicedRatio
        }
      };
    });

    // Print summary
    const gradableResults = results.filter((r, idx) => v2Result.syllables[idx].gradable);
    const matches = gradableResults.filter(r => r.swaraMatch).length;
    const total = gradableResults.length;
    const overallAccuracy = total > 0 ? Math.round((matches / total) * 100) : 0;

    console.log('\n🎯 V2 Swara Detection Summary:');
    console.log(`   Total syllables: ${results.length}`);
    console.log(`   Gradable syllables: ${total}`);
    console.log(`   Correct matches: ${matches} ✅`);
    console.log(`   Incorrect: ${total - matches} ❌`);
    console.log(`   Overall accuracy: ${overallAccuracy}%\n`);

    return results;

  } catch (error) {
    console.error('⚠️ V2 swara analysis failed:', error);
    // Fallback to neutral results
    return syllables.map((s, i) => ({
      syllableIndex: i,
      expectedText: s.text,
      transcribedText: s.text,
      expectedSwara: s.swara,
      pronunciationScore: 100,
      pronunciationMatch: true,
      detectedSwara: 'udhaatha' as SwaraType,
      swaraScore: 0,
      swaraMatch: false,
      overallScore: 0,
      accuracy: 'poor' as const,
      swaraAccuracy: 'poor' as const
    }));
  }
}

/**
 * Combine pronunciation and swara results
 * Uses syllableIndex (canonicalIndex) for proper alignment
 */
function combineResults(
  pronunciationResults: SyllableAnalysisResult[],
  swaraResults: SyllableAnalysisResult[]
): SyllableAnalysisResult[] {
  return pronunciationResults.map((pronResult) => {
    // Find matching swara result by syllableIndex (which is canonicalIndex)
    const swaraResult = swaraResults.find(
      sr => sr.syllableIndex === pronResult.syllableIndex
    );

    if (!swaraResult) {
      // No swara result for this syllable - return pronunciation-only
      return {
        ...pronResult,
        detectedSwara: 'udhaatha' as SwaraType,
        swaraScore: 0,
        swaraMatch: false,
        overallScore: pronResult.pronunciationScore,
        accuracy: pronResult.accuracy,
        swaraAccuracy: 'poor' as const
      };
    }

    // Weighted combination: 60% pronunciation, 40% swara
    const combinedScore = Math.round(
      pronResult.pronunciationScore * 0.6 + swaraResult.swaraScore * 0.4
    );

    // Swara-only accuracy (used for arrow colors)
    const swaraAccuracy: 'perfect' | 'good' | 'fair' | 'poor' =
      swaraResult.swaraScore >= 90 ? 'perfect' :
      swaraResult.swaraScore >= 75 ? 'good' :
      swaraResult.swaraScore >= 60 ? 'fair' : 'poor';

    return {
      ...pronResult,
      detectedSwara: swaraResult.detectedSwara,
      swaraScore: swaraResult.swaraScore,
      swaraMatch: swaraResult.swaraMatch,
      overallScore: combinedScore,
      accuracy: combinedScore >= 90 ? 'perfect' :
                combinedScore >= 75 ? 'good' :
                combinedScore >= 60 ? 'fair' : 'poor',
      swaraAccuracy
    };
  });
}

/**
 * Create empty result when transcription fails
 */
function createEmptyResult(syllables: SyllableWithSwara[]): ComprehensiveAnalysisResult {
  return {
    syllableResults: syllables.map((s, i) => ({
      syllableIndex: i,
      expectedText: s.text,
      transcribedText: '',
      expectedSwara: s.swara,
      pronunciationScore: 0,
      pronunciationMatch: false,
      detectedSwara: 'udhaatha',
      swaraScore: 0,
      swaraMatch: false,
      overallScore: 0,
      accuracy: 'poor',
      swaraAccuracy: 'poor'
    })),
    transcribedText: '',
    expectedText: syllables.map(s => s.text).join(''),
    pronunciationAccuracy: 0,
    overallScore: 0,
    feedback: ['Audio transcription failed. Please try again.'],
    detailedFeedback: {
      pronunciationMistakes: [],
      swaraMistakes: [],
      summary: {
        pronunciationScore: 0,
        swaraScore: 0,
        overallScore: 0,
        totalSyllables: syllables.length,
        correctPronunciation: 0,
        correctSwaras: 0
      }
    }
  };
}
