/**
 * Speech Recognition using browser's built-in capabilities
 * This provides real-time transcription for pronunciation verification
 */

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
 * Sanskrit consonant groups - phonetically similar sounds
 * These are often confused by non-native speakers and ASR systems
 */
const SANSKRIT_CONSONANT_GROUPS = {
  // Dental vs Cerebral (retroflex) - same voicing/aspiration
  dental_cerebral: [
    ['त', 'ट'], // ta / ṭa (unvoiced, unaspirated)
    ['थ', 'ठ'], // tha / ṭha (unvoiced, aspirated)
    ['द', 'ड'], // da / ḍa (voiced, unaspirated)
    ['ध', 'ढ'], // dha / ḍha (voiced, aspirated)
    ['न', 'ण'], // na / ṇa (nasal)
  ],
  // Voicing pairs within same articulation
  voicing_pairs: [
    ['क', 'ग'], // ka / ga
    ['ख', 'घ'], // kha / gha
    ['च', 'ज'], // ca / ja
    ['छ', 'झ'], // cha / jha
    ['त', 'द'], // ta / da
    ['थ', 'ध'], // tha / dha
    ['ट', 'ड'], // ṭa / ḍa
    ['ठ', 'ढ'], // ṭha / ḍha
    ['प', 'ब'], // pa / ba
    ['फ', 'भ'], // pha / bha
  ],
  // Aspiration pairs within same articulation
  aspiration_pairs: [
    ['क', 'ख'], // ka / kha
    ['ग', 'घ'], // ga / gha
    ['च', 'छ'], // ca / cha
    ['ज', 'झ'], // ja / jha
    ['त', 'थ'], // ta / tha
    ['द', 'ध'], // da / dha
    ['ट', 'ठ'], // ṭa / ṭha
    ['ड', 'ढ'], // ḍa / ḍha
    ['प', 'फ'], // pa / pha
    ['ब', 'भ'], // ba / bha
  ],
  // Sibilants - often confused
  sibilants: [['श', 'ष', 'स']], // śa / ṣa / sa
};

/**
 * Normalize Sanskrit text for phonetic comparison
 * Handles various orthographic equivalents
 */
function normalizeSanskritPhonetics(text: string): string {
  return text
    // Remove explicit halant/virama followed by same consonant (द्ध -> ध, त्त -> त, etc.)
    .replace(/(.)\u094D\1/g, '$1')
    // Normalize zero-width characters
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    // Normalize whitespace
    .replace(/\s+/g, '');
}

/**
 * Check if two strings differ by visarga sandhi
 * e.g., "दन्तिः" vs "दन्तिह" or "दन्तिस्" or "दन्ति"
 */
function isVisargaSandhiVariant(str1: string, str2: string): boolean {
  // Visarga (ः) can be pronounced as 'h', 's', or be silent
  const visargaVariants = [
    [/ः/g, 'ह'],  // visarga -> ha
    [/ः/g, 'स्'], // visarga -> s with halant
    [/ः/g, ''],   // visarga silent
  ];

  for (const [pattern, replacement] of visargaVariants) {
    if (str1.replace(pattern, replacement) === str2) return true;
    if (str2.replace(pattern, replacement) === str1) return true;
  }

  return false;
}

/**
 * Check if two consonants differ only by halant vs 'u' vowel
 * e.g., त् (t with halant) vs तु (tu)
 */
function isHalantVsUVariant(str1: string, str2: string): boolean {
  // Check if one has halant and other has 'u' vowel
  const halantPattern = /([क-ह])्$/;
  const uPattern = /([क-ह])\u0941$/;

  const match1Halant = str1.match(halantPattern);
  const match2U = str2.match(uPattern);
  const match1U = str1.match(uPattern);
  const match2Halant = str2.match(halantPattern);

  // Check if base consonant is same
  if (match1Halant && match2U && match1Halant[1] === match2U[1]) return true;
  if (match1U && match2Halant && match1U[1] === match2Halant[1]) return true;

  return false;
}

/**
 * Calculate phonetic distance between two Sanskrit characters
 * Returns 0 for identical, 0.3 for similar sounds, 1.0 for different sounds
 */
function getSanskritPhoneticDistance(char1: string, char2: string): number {
  if (char1 === char2) return 0;

  // Normalize both for phonetic comparison
  const norm1 = normalizeSanskritPhonetics(char1);
  const norm2 = normalizeSanskritPhonetics(char2);

  if (norm1 === norm2) return 0; // Phonetically identical

  // Check visarga sandhi (ः can be h, s, or silent)
  if (isVisargaSandhiVariant(char1, char2)) return 0.1; // Sandhi variation

  // Check halant vs 'u' vowel (Whisper often adds 'u' where there should be halant)
  if (isHalantVsUVariant(char1, char2)) return 0.1; // Very minor difference

  // Check if they're in the same phonetic group
  for (const [groupName, pairs] of Object.entries(SANSKRIT_CONSONANT_GROUPS)) {
    for (const group of pairs) {
      if (group.includes(char1) && group.includes(char2)) {
        // Dental/cerebral confusion is most common - treat as very similar
        if (groupName === 'dental_cerebral') return 0.25;
        // Voicing/aspiration confusion - moderately similar
        if (groupName === 'voicing_pairs' || groupName === 'aspiration_pairs') return 0.4;
        // Sibilants - somewhat similar
        if (groupName === 'sibilants') return 0.5;
      }
    }
  }

  return 1.0; // Completely different sounds
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
