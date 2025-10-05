/**
 * Syllable Analyzer using Whisper AI for pronunciation verification
 * Simple approach: transcribe audio and match aksharas
 */

import { SwaraType, SyllableWithSwara } from './pitchDetection';
import { transcribeAudioToText, calculatePhoneticSimilarity } from './speechRecognition';

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

  // Step 4: Match individual aksharas
  const syllableResults = matchIndividualAksharas(
    syllables,
    transcriptionResult.transcript,
    expectedText
  );

  // Step 5: Generate feedback
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
  _expectedText: string
): SyllableAnalysisResult[] {

  // Normalize both texts for comparison
  const normalizeText = (text: string) => text
    .replace(/\s+/g, '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

  const normalizedTranscript = normalizeText(transcribedText);

  // Simple character-by-character alignment
  // This works when transcription is close to expected
  const results: SyllableAnalysisResult[] = [];

  for (let i = 0; i < syllables.length; i++) {
    const expectedAkshara = syllables[i].text;
    const normalizedExpectedAkshara = normalizeText(expectedAkshara);

    // Try to find this akshara in the transcript around the expected position
    // Calculate approximate position in transcript
    const expectedPosition = Math.floor((i / syllables.length) * normalizedTranscript.length);
    const searchStart = Math.max(0, expectedPosition - 2);
    const searchEnd = Math.min(normalizedTranscript.length, expectedPosition + 3);
    const searchWindow = normalizedTranscript.substring(searchStart, searchEnd);

    // Check if the akshara appears in the search window
    const found = searchWindow.includes(normalizedExpectedAkshara);

    // Calculate similarity score
    let pronunciationScore = 0;
    let transcribedChar = '';

    if (found) {
      pronunciationScore = 100;
      transcribedChar = expectedAkshara;
    } else {
      // Try character-level match
      if (expectedPosition < normalizedTranscript.length) {
        transcribedChar = transcribedText.charAt(expectedPosition) || '';
        pronunciationScore = calculatePhoneticSimilarity(
          transcribedChar,
          expectedAkshara
        );
      }
    }

    // More lenient threshold - phonetically similar sounds should pass
    const pronunciationMatch = pronunciationScore >= 60;

    results.push({
      syllableIndex: i,
      expectedText: expectedAkshara,
      transcribedText: transcribedChar,
      expectedSwara: syllables[i].swara,
      pronunciationScore,
      pronunciationMatch,

      // Placeholder - not analyzing swaras yet
      detectedSwara: 'udhaata',
      swaraScore: 0,
      swaraMatch: false,

      overallScore: pronunciationScore,
      accuracy: pronunciationScore >= 90 ? 'perfect' :
                pronunciationScore >= 75 ? 'good' :
                pronunciationScore >= 60 ? 'fair' : 'poor'
    });
  }

  return results;
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
