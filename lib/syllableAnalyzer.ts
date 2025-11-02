/**
 * Syllable Analyzer using Whisper AI for pronunciation verification
 * AND simple autocorrelation-based pitch detection for swara analysis
 */

import { SwaraType, SyllableWithSwara, classifySwara } from './pitchDetection';
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
      detectedSwara: 'udhaatha' as const,
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
      detectedSwara: 'udhaatha' as const,
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
      detectedSwara: 'udhaatha',
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
 * Analyze swaras using simple autocorrelation-based pitch detection
 * Same reliable method used in test-swara page
 */
async function analyzeSwaras(
  audioBuffer: AudioBuffer,
  syllables: SyllableWithSwara[],
  userBaseToneHz?: number
): Promise<SyllableAnalysisResult[]> {

  if (!userBaseToneHz) {
    console.warn('⚠️ No user baseline provided, cannot analyze swaras accurately');
    // Return neutral results
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
      accuracy: 'poor' as const
    }));
  }

  console.log(`🎯 Analyzing swaras using user's baseline: ${userBaseToneHz.toFixed(1)} Hz`);

  const sampleRate = audioBuffer.sampleRate;
  const audioData = audioBuffer.getChannelData(0);

  // Extract pitches using simple autocorrelation (same as test-swara)
  const pitches = extractPitchesFromAudio(audioData, sampleRate);

  console.log(`🎵 Extracted ${pitches.length} pitch frames from audio`);

  // Detect voice activity to find actual speech region
  const voiceRegion = detectVoiceActivity(pitches);
  console.log(`🎤 Voice activity: ${voiceRegion.start.toFixed(2)}s to ${voiceRegion.end.toFixed(2)}s`);

  // Calculate syllable durations (uniform for now, but within voice region)
  const voiceDuration = voiceRegion.end - voiceRegion.start;
  const syllableDuration = voiceDuration / syllables.length;

  const results: SyllableAnalysisResult[] = [];

  for (let i = 0; i < syllables.length; i++) {
    const syllable = syllables[i];
    const startTime = voiceRegion.start + (i * syllableDuration);
    const endTime = startTime + syllableDuration;

    // Get pitches within this syllable's time window
    const syllablePitches = pitches.filter(p =>
      p.time >= startTime && p.time < endTime && p.frequency > 0
    );

    if (syllablePitches.length === 0) {
      // No valid pitch detected
      console.log(`⚠️ [${syllable.text}] No pitch detected`);
      results.push({
        syllableIndex: i,
        expectedText: syllable.text,
        transcribedText: syllable.text,
        expectedSwara: syllable.swara,
        pronunciationScore: 100,
        pronunciationMatch: true,
        detectedSwara: 'udhaatha' as SwaraType,
        swaraScore: 0,
        swaraMatch: false,
        overallScore: 0,
        accuracy: 'poor' as const
      });
      continue;
    }

    // Calculate average frequency for this syllable
    const avgFrequency = syllablePitches.reduce((sum, p) => sum + p.frequency, 0) / syllablePitches.length;

    // Classify swara using the same thresholds as test-swara
    const { swara: detectedSwara, confidence } = classifySwara(avgFrequency, userBaseToneHz);

    // Calculate semitones for logging
    const semitones = 12 * Math.log2(avgFrequency / userBaseToneHz);

    // Check if it matches
    const match = (detectedSwara === syllable.swara) ||
                  (syllable.swara === 'swarita' && detectedSwara === 'dheerga') ||
                  (syllable.swara === 'dheerga' && detectedSwara === 'swarita');

    const score = match ? 95 : 40;
    const accuracy = score >= 90 ? 'perfect' : score >= 75 ? 'good' : score >= 60 ? 'fair' : 'poor';

    console.log(`📊 [${syllable.text}] freq=${avgFrequency.toFixed(1)}Hz, ` +
                `semitones=${semitones.toFixed(2)}, ` +
                `expected=${syllable.swara}, detected=${detectedSwara}, ` +
                `match=${match ? '✅' : '❌'}, score=${score}%`);

    results.push({
      syllableIndex: i,
      expectedText: syllable.text,
      transcribedText: syllable.text,
      expectedSwara: syllable.swara,
      pronunciationScore: 100,
      pronunciationMatch: true,
      detectedSwara,
      swaraScore: score,
      swaraMatch: match,
      overallScore: score,
      accuracy: accuracy as 'perfect' | 'good' | 'fair' | 'poor'
    });
  }

  // Print summary
  const matches = results.filter(r => r.swaraMatch).length;
  const total = results.length;
  const overallAccuracy = Math.round((matches / total) * 100);

  console.log('\n🎯 Swara Detection Summary:');
  console.log(`   Total syllables: ${total}`);
  console.log(`   Correct matches: ${matches} ✅`);
  console.log(`   Incorrect: ${total - matches} ❌`);
  console.log(`   Overall accuracy: ${overallAccuracy}%\n`);

  return results;
}

/**
 * Extract pitches from audio using simple autocorrelation
 */
function extractPitchesFromAudio(audioData: Float32Array, sampleRate: number): Array<{ time: number; frequency: number }> {
  const pitches: Array<{ time: number; frequency: number }> = [];
  const frameSize = 2048;
  const hopSize = 512;

  for (let i = 0; i + frameSize < audioData.length; i += hopSize) {
    const frame = audioData.slice(i, i + frameSize);
    const frequency = detectPitchAutocorrelation(frame, sampleRate);
    const time = i / sampleRate;
    pitches.push({ time, frequency });
  }

  return pitches;
}

/**
 * Simple autocorrelation-based pitch detection
 */
function detectPitchAutocorrelation(buffer: Float32Array, sampleRate: number): number {
  const SIZE = buffer.length;
  const MAX_SAMPLES = Math.floor(SIZE / 2);
  let best_offset = -1;
  let best_correlation = 0;
  let rms = 0;

  // Calculate RMS
  for (let i = 0; i < SIZE; i++) {
    const val = buffer[i];
    rms += val * val;
  }
  rms = Math.sqrt(rms / SIZE);

  // Not enough signal
  if (rms < 0.01) return 0;

  // Find the best offset (autocorrelation)
  let lastCorrelation = 1;
  for (let offset = 1; offset < MAX_SAMPLES; offset++) {
    let correlation = 0;

    for (let i = 0; i < MAX_SAMPLES; i++) {
      correlation += Math.abs(buffer[i] - buffer[i + offset]);
    }

    correlation = 1 - correlation / MAX_SAMPLES;

    if (correlation > 0.9 && correlation > lastCorrelation) {
      const foundGoodCorrelation = correlation > best_correlation;
      if (foundGoodCorrelation) {
        best_correlation = correlation;
        best_offset = offset;
      }
    }

    lastCorrelation = correlation;
  }

  if (best_offset === -1 || best_correlation < 0.01) return 0;

  const frequency = sampleRate / best_offset;

  // Filter out unrealistic frequencies
  if (frequency < 50 || frequency > 1000) return 0;

  return frequency;
}

/**
 * Detect voice activity region (where speech actually occurs)
 */
function detectVoiceActivity(pitches: Array<{ time: number; frequency: number }>): { start: number; end: number } {
  // Find first and last non-zero pitch
  let firstVoice = -1;
  let lastVoice = -1;

  for (let i = 0; i < pitches.length; i++) {
    if (pitches[i].frequency > 0) {
      if (firstVoice === -1) firstVoice = i;
      lastVoice = i;
    }
  }

  if (firstVoice === -1) {
    // No voice detected, use full duration
    return {
      start: 0,
      end: pitches[pitches.length - 1]?.time || 1
    };
  }

  // Add small padding
  const startIdx = Math.max(0, firstVoice - 5);
  const endIdx = Math.min(pitches.length - 1, lastVoice + 5);

  return {
    start: pitches[startIdx].time,
    end: pitches[endIdx].time
  };
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
      detectedSwara: 'udhaatha',
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
