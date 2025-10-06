/**
 * Syllable Analyzer using Whisper AI for pronunciation verification
 * AND ML-based pitch detection for swara analysis
 */

import { SwaraType, SyllableWithSwara } from './pitchDetection';
import { transcribeAudioToText, calculatePhoneticSimilarity } from './speechRecognition';
import { MLPitchDetector } from './pitch/crepePitchDetector';
import { VedicSwaraClassifier } from './pitch/swaraClassifier';
import { SyllableSegmenter } from './pitch/syllableSegmentation';

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
}

export interface ComprehensiveAnalysisResult {
  syllableResults: SyllableAnalysisResult[];
  transcribedText: string;
  expectedText: string;
  pronunciationAccuracy: number;
  swaraAccuracy?: number;
  overallScore: number;
  feedback: string[];
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
  userAudioBlob?: Blob
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
    swaraResults = await analyzeSwaras(userAudioBuffer, syllables);
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

  // Step 7: Generate feedback
  const feedback: string[] = [];

  // More lenient feedback thresholds to account for phonetically similar sounds
  if (overallSimilarity >= 80) {
    feedback.push('Excellent pronunciation! 🎉');
  } else if (overallSimilarity >= 65) {
    feedback.push('Good pronunciation! Keep practicing.');
  } else if (overallSimilarity >= 45) {
    feedback.push('Fair pronunciation. Try listening to the reference audio again.');
  } else {
    feedback.push('Keep practicing! Listen carefully to the reference audio.');
  }

  // Add akshara-specific feedback
  const incorrectAksharas = syllableResults.filter(r => !r.pronunciationMatch);
  if (incorrectAksharas.length > 0 && incorrectAksharas.length <= 3) {
    const akharaTexts = incorrectAksharas.map(r => syllables[r.syllableIndex].text);
    feedback.push(`Focus on: ${akharaTexts.join(', ')}`);
  }

  return {
    syllableResults,
    transcribedText: transcriptionResult.transcript,
    expectedText,
    pronunciationAccuracy: overallSimilarity,
    swaraAccuracy,
    overallScore: overallSimilarity,
    feedback
  };
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
      detectedSwara: 'udhaata' as const,
      swaraScore: 0,
      swaraMatch: false,
      overallScore: 100,
      accuracy: 'perfect' as const
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
      detectedSwara: 'udhaata' as const,
      swaraScore: 0,
      swaraMatch: false,
      overallScore: overallSimilarity,
      accuracy: 'perfect' as const  // Show all as green when overall is good
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
      detectedSwara: 'udhaata',
      swaraScore: 0,
      swaraMatch: false,

      overallScore: pronunciationScore,
      accuracy: pronunciationScore >= 70 ? 'perfect' :  // Green for >= 70%
                pronunciationScore >= 50 ? 'fair' :      // Orange for 50-69%
                'poor'                                   // Red only for < 50%
    });

    // Move position forward
    transcriptPosition += aksharaLength;
  }

  return results;
}

/**
 * Analyze swaras using ML-based pitch detection
 */
async function analyzeSwaras(
  audioBuffer: AudioBuffer,
  syllables: SyllableWithSwara[]
): Promise<SyllableAnalysisResult[]> {
  // Initialize detectors
  const pitchDetector = new MLPitchDetector({
    sampleRate: audioBuffer.sampleRate
  });
  const swaraClassifier = new VedicSwaraClassifier();
  const segmenter = new SyllableSegmenter();

  // Step 1: Extract pitch contour
  const contour = await pitchDetector.extractPitchContour(audioBuffer);

  // Step 2: Smooth the contour
  const smoothedContour = pitchDetector.smoothPitchContour(contour, 5);

  // Step 3: Detect baseline (Udātta)
  const baseline = swaraClassifier.detectBaseline(smoothedContour);
  console.log(`🎯 Baseline frequency: ${baseline.frequency.toFixed(1)} Hz`);

  // Step 4: Segment syllables
  const segments = await segmenter.segmentBySyllables(audioBuffer, syllables);

  // Step 5: Analyze each syllable's swara
  const swaraAnalysis = swaraClassifier.analyzeSyllableSwaras(
    smoothedContour,
    segments.map(seg => ({
      index: seg.index,
      startTime: seg.startTime,
      endTime: seg.endTime,
      expectedSwara: seg.expectedSwara as SwaraType,
      text: seg.text  // Add syllable text for better logging
    }))
  );

  // Step 6: Convert to SyllableAnalysisResult format
  return swaraAnalysis.map(result => ({
    syllableIndex: result.syllableIndex,
    expectedText: syllables[result.syllableIndex].text,
    transcribedText: syllables[result.syllableIndex].text,
    expectedSwara: result.expectedSwara,
    pronunciationScore: 100,  // Not analyzed in swara-only mode
    pronunciationMatch: true,
    detectedSwara: result.detection.swara,
    swaraScore: result.score,
    swaraMatch: result.match,
    overallScore: result.score,
    accuracy: result.accuracy
  }));
}

/**
 * Combine pronunciation and swara results
 */
function combineResults(
  pronunciationResults: SyllableAnalysisResult[],
  swaraResults: SyllableAnalysisResult[]
): SyllableAnalysisResult[] {
  return pronunciationResults.map((pronResult, i) => {
    const swaraResult = swaraResults[i];

    // Weighted combination: 60% pronunciation, 40% swara
    const combinedScore = Math.round(
      pronResult.pronunciationScore * 0.6 + swaraResult.swaraScore * 0.4
    );

    return {
      ...pronResult,
      detectedSwara: swaraResult.detectedSwara,
      swaraScore: swaraResult.swaraScore,
      swaraMatch: swaraResult.swaraMatch,
      overallScore: combinedScore,
      accuracy: combinedScore >= 90 ? 'perfect' :
                combinedScore >= 75 ? 'good' :
                combinedScore >= 60 ? 'fair' : 'poor'
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
      detectedSwara: 'udhaata',
      swaraScore: 0,
      swaraMatch: false,
      overallScore: 0,
      accuracy: 'poor'
    })),
    transcribedText: '',
    expectedText: syllables.map(s => s.text).join(''),
    pronunciationAccuracy: 0,
    overallScore: 0,
    feedback: ['Audio transcription failed. Please try again.']
  };
}
