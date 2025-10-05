/**
 * Speech Recognition using browser's built-in capabilities
 * This provides real-time transcription for pronunciation verification
 */

import { getSanskritPhoneticDistance } from './sanskrit/sandhiRules';

export interface TranscriptionResult {
  transcript: string;
  confidence: number;
  success: boolean;
}

/**
 * Transcribe audio using OpenAI Whisper API
 * This provides accurate Sanskrit transcription
 */
export async function transcribeAudioToText(
  audioBlob: Blob
): Promise<TranscriptionResult> {
  try {
    console.log('🎙️ Sending audio to Whisper API for transcription...');

    // Create form data
    const formData = new FormData();
    formData.append('audio', audioBlob, 'recording.wav');

    // Call our API route
    const response = await fetch('/api/transcribe', {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('Transcription API error:', error);
      return {
        transcript: '',
        confidence: 0,
        success: false,
      };
    }

    const result = await response.json();

    if (result.success) {
      console.log(`✅ Whisper transcribed: "${result.transcript}"`);
      return {
        transcript: result.transcript,
        confidence: result.confidence || 0.95,
        success: true,
      };
    } else {
      console.error('Transcription failed:', result.error);
      return {
        transcript: '',
        confidence: 0,
        success: false,
      };
    }

  } catch (error) {
    console.error('Transcription error:', error);
    return {
      transcript: '',
      confidence: 0,
      success: false,
    };
  }
}

/**
 * Calculate phonetic similarity between two strings
 * Uses modified Levenshtein distance with Sanskrit-aware phonetic costs
 */
export function calculatePhoneticSimilarity(
  text1: string,
  text2: string
): number {
  // Normalize: lowercase, remove spaces, punctuation, and diacritics
  const normalize = (str: string) => {
    // First, split by Devanagari danda (॥) and take only the first part if repeated
    const parts = str.split(/[॥।]+/);
    const mainText = parts[0] || str;

    return mainText
      .toLowerCase()
      .replace(/\s+/g, '')
      .replace(/[.,!?\-_:;'"()[\]{}]/g, '') // Remove punctuation
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
  };

  const s1 = normalize(text1);
  const s2 = normalize(text2);

  if (s1 === s2) return 100;
  if (s1.length === 0 || s2.length === 0) return 0;

  // Modified Levenshtein distance with phonetic costs
  const matrix: number[][] = [];

  for (let i = 0; i <= s2.length; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= s1.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= s2.length; i++) {
    for (let j = 1; j <= s1.length; j++) {
      const char1 = s1.charAt(j - 1);
      const char2 = s2.charAt(i - 1);

      if (char1 === char2) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        // Use Sanskrit phonetic distance for substitution cost
        const phoneticCost = getSanskritPhoneticDistance(char1, char2);

        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + phoneticCost, // phonetic substitution
          matrix[i][j - 1] + 1, // insertion
          matrix[i - 1][j] + 1 // deletion
        );
      }
    }
  }

  const distance = matrix[s2.length][s1.length];
  const maxLength = Math.max(s1.length, s2.length);

  // Calculate similarity with reduced penalty for phonetically similar sounds
  const similarity = ((maxLength - distance) / maxLength) * 100;

  return Math.round(similarity);
}

/**
 * Match transcribed text against expected syllables
 */
export function matchTranscriptToSyllables(
  transcript: string,
  expectedSyllables: string[]
): {
  overallSimilarity: number;
  syllableMatches: Array<{ syllable: string; matched: boolean; similarity: number }>;
} {
  const expectedText = expectedSyllables.join(' ');
  const overallSimilarity = calculatePhoneticSimilarity(transcript, expectedText);

  // Try to match individual syllables
  const transcriptWords = transcript.toLowerCase().split(/\s+/);
  const syllableMatches = expectedSyllables.map((syllable, index) => {
    const transcriptWord = transcriptWords[index] || '';
    const similarity = calculatePhoneticSimilarity(transcriptWord, syllable);

    return {
      syllable,
      matched: similarity >= 70,
      similarity,
    };
  });

  return {
    overallSimilarity,
    syllableMatches,
  };
}
