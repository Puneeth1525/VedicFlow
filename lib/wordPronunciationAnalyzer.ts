/**
 * Word-by-Word Pronunciation Analyzer
 * Independent module for beginner-friendly pronunciation training
 * Inspired by Boldvoice - real-time feedback for individual words
 */

import { transcribeAudioToText, calculatePhoneticSimilarity } from './speechRecognition';

export interface WordPronunciationResult {
  word: string;
  romanization: string;
  transcribed: string;
  score: number; // 0-100
  accuracy: 'perfect' | 'good' | 'needs_work';
  syllableBreakdown: SyllableScore[];
  passed: boolean; // true if score >= 70
  feedback: string;
}

export interface SyllableScore {
  syllable: string;
  score: number;
  color: 'green' | 'yellow' | 'red';
}

export interface WordAttempt {
  attemptNumber: number;
  result: WordPronunciationResult;
  timestamp: number;
}

export interface WordProgress {
  wordIndex: number;
  word: string;
  attempts: WordAttempt[];
  bestScore: number;
  passed: boolean;
  locked: boolean; // true until previous word is passed
}

/**
 * Analyze pronunciation of a single word
 */
export async function analyzeWordPronunciation(
  audioBlob: Blob,
  expectedWord: string,
  romanization: string
): Promise<WordPronunciationResult> {

  console.log(`🎤 Analyzing pronunciation for word: "${expectedWord}"`);

  // Step 1: Transcribe user's audio
  const transcriptionResult = await transcribeAudioToText(audioBlob);

  if (!transcriptionResult.success) {
    console.error('❌ Transcription failed');
    return createFailedResult(expectedWord, romanization);
  }

  const transcribed = transcriptionResult.transcript.trim();
  console.log(`✅ Transcribed: "${transcribed}"`);

  // Step 2: Calculate overall word similarity
  const score = calculatePhoneticSimilarity(transcribed, expectedWord);
  console.log(`📊 Similarity score: ${score}%`);

  // Step 3: Break down into syllables and score each
  const syllableBreakdown = analyzeSyllables(expectedWord, transcribed, score);

  // Step 4: Determine accuracy level and feedback
  const accuracy = getAccuracyLevel(score);
  const passed = score >= 70; // 70% threshold to pass
  const feedback = generateFeedback(score, accuracy, expectedWord);

  return {
    word: expectedWord,
    romanization,
    transcribed,
    score,
    accuracy,
    syllableBreakdown,
    passed,
    feedback,
  };
}

/**
 * Analyze syllables within a word and assign color coding
 */
function analyzeSyllables(
  expectedWord: string,
  transcribed: string,
  overallScore: number
): SyllableScore[] {

  // Simple syllable splitting (can be enhanced with Sanskrit rules)
  const syllables = splitIntoSyllables(expectedWord);

  if (syllables.length === 0) {
    return [{
      syllable: expectedWord,
      score: overallScore,
      color: getColorForScore(overallScore),
    }];
  }

  // If overall score is high, mark all syllables as good
  if (overallScore >= 80) {
    return syllables.map(syl => ({
      syllable: syl,
      score: overallScore,
      color: 'green' as const,
    }));
  }

  // Try to map syllables to transcribed parts
  const transcribedSyllables = splitIntoSyllables(transcribed);

  return syllables.map((syllable, index) => {
    const transcribedSyl = transcribedSyllables[index] || '';
    const sylScore = calculatePhoneticSimilarity(transcribedSyl, syllable);

    return {
      syllable,
      score: sylScore,
      color: getColorForScore(sylScore),
    };
  });
}

/**
 * Split Sanskrit word into syllables
 * Basic implementation - can be enhanced with proper Sanskrit rules
 */
function splitIntoSyllables(word: string): string[] {
  const normalized = word.normalize('NFD').replace(/[\u0300-\u036f]/g, '');

  // Simple splitting by consonant-vowel patterns
  // This is a basic implementation - can be enhanced
  const syllables: string[] = [];
  let currentSyl = '';

  for (let i = 0; i < normalized.length; i++) {
    const char = normalized[i];
    currentSyl += char;

    // Check if next char is a consonant or end of word
    const nextChar = normalized[i + 1];
    if (!nextChar || isConsonant(nextChar)) {
      syllables.push(currentSyl);
      currentSyl = '';
    }
  }

  if (currentSyl) {
    syllables.push(currentSyl);
  }

  return syllables.filter(s => s.length > 0);
}

/**
 * Check if character is a consonant (simplified)
 */
function isConsonant(char: string): boolean {
  const consonants = 'कखगघङचछजझञटठडढणतथदधनपफबभमयरलवशषसहक्षत्रज्ञ';
  return consonants.includes(char);
}

/**
 * Get color coding based on score
 */
function getColorForScore(score: number): 'green' | 'yellow' | 'red' {
  if (score >= 75) return 'green';
  if (score >= 50) return 'yellow';
  return 'red';
}

/**
 * Get accuracy level based on score
 */
function getAccuracyLevel(score: number): 'perfect' | 'good' | 'needs_work' {
  if (score >= 85) return 'perfect';
  if (score >= 70) return 'good';
  return 'needs_work';
}

/**
 * Generate encouraging feedback based on performance
 */
function generateFeedback(
  score: number,
  accuracy: 'perfect' | 'good' | 'needs_work',
  word: string
): string {
  const feedbackMessages = {
    perfect: [
      'Perfect! 🎉',
      'Excellent pronunciation!',
      'Outstanding! You nailed it!',
      'Flawless! Well done!',
      'Amazing work!',
    ],
    good: [
      'Great job! Almost there!',
      'Good work! Keep it up!',
      'Nice! You\'re doing well!',
      'Well done! You\'re improving!',
      'Good! Just a bit more practice!',
    ],
    needs_work: [
      `Try pronouncing "${word}" more clearly`,
      'Listen to the reference and try again',
      'Take your time and pronounce slowly',
      'Focus on each syllable',
      'You can do it! Try once more',
    ],
  };

  const messages = feedbackMessages[accuracy];
  return messages[Math.floor(Math.random() * messages.length)];
}

/**
 * Create a failed result when transcription fails
 */
function createFailedResult(
  expectedWord: string,
  romanization: string
): WordPronunciationResult {
  return {
    word: expectedWord,
    romanization,
    transcribed: '',
    score: 0,
    accuracy: 'needs_work',
    syllableBreakdown: [{
      syllable: expectedWord,
      score: 0,
      color: 'red',
    }],
    passed: false,
    feedback: 'Could not hear you clearly. Please try again.',
  };
}

/**
 * Calculate best score from multiple attempts
 */
export function getBestScore(attempts: WordAttempt[]): number {
  if (attempts.length === 0) return 0;
  return Math.max(...attempts.map(a => a.result.score));
}

/**
 * Check if user can move to next word
 */
export function canMoveToNextWord(
  currentWordProgress: WordProgress,
  maxAttempts: number = 5
): boolean {
  // Can move if passed OR reached max attempts
  return currentWordProgress.passed ||
         currentWordProgress.attempts.length >= maxAttempts;
}

/**
 * Initialize progress tracking for all words in a line
 */
export function initializeWordProgress(words: Array<{ text: string; romanization: string }>): WordProgress[] {
  return words.map((word, index) => ({
    wordIndex: index,
    word: word.text,
    attempts: [],
    bestScore: 0,
    passed: false,
    locked: index > 0, // First word unlocked, rest locked
  }));
}

/**
 * Update progress after an attempt
 */
export function updateWordProgress(
  progress: WordProgress[],
  wordIndex: number,
  result: WordPronunciationResult
): WordProgress[] {
  const newProgress = [...progress];
  const currentWord = newProgress[wordIndex];

  // Add new attempt
  const attempt: WordAttempt = {
    attemptNumber: currentWord.attempts.length + 1,
    result,
    timestamp: Date.now(),
  };

  currentWord.attempts.push(attempt);
  currentWord.bestScore = Math.max(currentWord.bestScore, result.score);
  currentWord.passed = result.passed || currentWord.passed;

  // Unlock next word if current word passed or max attempts reached
  if (canMoveToNextWord(currentWord) && wordIndex < newProgress.length - 1) {
    newProgress[wordIndex + 1].locked = false;
  }

  return newProgress;
}

/**
 * Get overall completion percentage
 */
export function getCompletionPercentage(progress: WordProgress[]): number {
  const completedWords = progress.filter(p => p.passed).length;
  return Math.round((completedWords / progress.length) * 100);
}
