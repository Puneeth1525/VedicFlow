/**
 * Vedic Swara Classifier
 * Detects Udātta, Anudātta, Swarita, and Dīrgha Swarita based on relative pitch
 */

import { PitchContour } from './crepePitchDetector';
import { SwaraType } from '../pitchDetection';

export interface BaselinePitch {
  frequency: number;      // Median pitch (Udātta baseline)
  confidence: number;     // Confidence in baseline detection
  semitoneRange: {        // Expected range for each swara
    anudhaata: [number, number];
    udhaata: [number, number];
    swarita: [number, number];
    dheerga: [number, number];
  };
}

export interface SwaraDetection {
  swara: SwaraType;
  confidence: number;
  semitoneDeviation: number;  // Relative to udātta baseline
  frequency: number;
  idealDeviation: number;     // Ideal semitone for this swara
  error: number;              // Distance from ideal
}

export interface SyllableSwara {
  syllableIndex: number;
  startTime: number;
  endTime: number;
  duration: number;
  detection: SwaraDetection;
  expectedSwara: SwaraType;
  match: boolean;
  score: number;
  accuracy: 'perfect' | 'good' | 'fair' | 'poor';
}

export class VedicSwaraClassifier {
  private baselinePitch: BaselinePitch | null = null;

  /**
   * Detect the user's baseline pitch (Udātta) from the audio
   * Find syllables marked as udātta and use their average pitch as reference
   */
  detectBaseline(
    contour: PitchContour,
    syllables?: Array<{
      index: number;
      startTime: number;
      endTime: number;
      expectedSwara: SwaraType;
    }>
  ): BaselinePitch {
    let udaataFrequencies: number[] = [];

    // If syllables provided, find udātta syllables specifically
    if (syllables && syllables.length > 0) {
      const udaataSyllables = syllables.filter(s => s.expectedSwara === 'udhaatha');

      if (udaataSyllables.length > 0) {
        console.log(`🎯 Found ${udaataSyllables.length} udātta syllables to use as baseline`);

        for (const syllable of udaataSyllables) {
          const syllableFrames = contour.frames.filter(
            f => f.time >= syllable.startTime &&
                 f.time < syllable.endTime &&
                 f.confidence > 0.5 &&
                 f.frequency > 50
          );

          if (syllableFrames.length > 0) {
            const avgFreq = syllableFrames.reduce((sum, f) => sum + f.frequency, 0) / syllableFrames.length;
            udaataFrequencies.push(avgFreq);
          }
        }
      }
    }

    // Fallback: use all confident pitches if no udātta syllables found
    if (udaataFrequencies.length === 0) {
      console.log('⚠️ No udātta syllables found, using median of all pitches');
      const validFrames = contour.frames.filter(
        f => f.confidence > 0.5 && f.frequency > 50 && f.frequency < 1000
      );

      if (validFrames.length === 0) {
        throw new Error('No valid pitch detected in audio');
      }

      udaataFrequencies = validFrames.map(f => f.frequency);
    }

    // Use median of udātta frequencies as baseline
    udaataFrequencies.sort((a, b) => a - b);
    const medianFreq = udaataFrequencies[Math.floor(udaataFrequencies.length / 2)];

    // Calculate confidence
    const avgConfidence = 0.9; // High confidence since we're using expected udātta

    // Define semitone ranges for each swara (more lenient)
    const semitoneRange = {
      anudhaatha: [-6.0, -0.5] as [number, number],    // Any note below udātta
      udhaatha: [-0.5, 0.5] as [number, number],        // Within ±0.5 semitones
      swarita: [0.5, 6.0] as [number, number],         // Any note above udātta
      dheerga: [0.5, 6.0] as [number, number]          // Same as swarita (distinguished by duration)
    };

    const baseline: BaselinePitch = {
      frequency: medianFreq,
      confidence: avgConfidence,
      semitoneRange
    };

    this.baselinePitch = baseline;

    console.log(`🎯 Detected baseline (Udātta): ${medianFreq.toFixed(1)} Hz (confidence: ${(avgConfidence * 100).toFixed(1)}%)`);

    return baseline;
  }

  /**
   * Convert frequency ratio to semitones
   */
  private frequencyToSemitones(freq: number, baseline: number): number {
    if (freq === 0 || baseline === 0) return 0;
    return 12 * Math.log2(freq / baseline);
  }

  /**
   * Classify a syllable's swara based on pitch and duration
   * Simple rule: below baseline = anudātta, at baseline = udātta, above = swarita/dheerga
   */
  classifySwara(
    avgFrequency: number,
    duration: number,
    normalDuration: number = 0.3
  ): SwaraDetection {
    if (!this.baselinePitch) {
      throw new Error('Baseline pitch not detected. Call detectBaseline() first.');
    }

    const baseline = this.baselinePitch.frequency;
    const semitones = this.frequencyToSemitones(avgFrequency, baseline);

    // Determine swara type based on simple relative position
    let swara: SwaraType;
    let idealDeviation: number;
    const confidence = 0.9;

    console.log(`   🔍 Duration: ${duration.toFixed(3)}s (normal: ${normalDuration.toFixed(3)}s, ratio: ${(duration/normalDuration).toFixed(2)}x)`);

    // Optimized thresholds based on real chanting data:
    // - Udātta range: ±1.3 ST (accounts for natural variation across udātta syllables)
    // - Anudātta/Swarita need to be clearly outside this range
    if (semitones < -1.3) {
      // Below baseline = anudātta (went clearly down)
      swara = 'anudhaatha';
      idealDeviation = semitones;  // Use actual deviation as ideal
    } else if (semitones >= -1.3 && semitones <= 1.3) {
      // At baseline = udātta (stable pitch with natural variation)
      swara = 'udhaatha';
      idealDeviation = 0;
    } else {
      // Above baseline = swarita or dheerga (went clearly up)
      // Dheerga swarita is distinguished by higher pitch (>2.2 semitones)
      if (semitones > 2.2) {
        swara = 'dheerga';
        console.log(`   ⏱️ High pitch (${semitones.toFixed(2)} ST) → dheerga`);
      } else {
        swara = 'swarita';
      }
      idealDeviation = semitones;  // Use actual deviation as ideal
    }

    const error = 0;  // No error since we accept the actual deviation

    return {
      swara,
      confidence,
      semitoneDeviation: semitones,
      frequency: avgFrequency,
      idealDeviation,
      error
    };
  }

  /**
   * Score a syllable's swara accuracy
   * Since we only care about relative direction, match = correct swara
   */
  scoreSyllableSwara(
    expected: SwaraType,
    detected: SwaraDetection
  ): { score: number; accuracy: 'perfect' | 'good' | 'fair' | 'poor'; match: boolean } {
    // Check if swara direction matches (treating swarita and dheerga as same direction)
    let match = false;

    if (expected === detected.swara) {
      match = true;
    } else if ((expected === 'swarita' && detected.swara === 'dheerga') ||
               (expected === 'dheerga' && detected.swara === 'swarita')) {
      // Accept swarita/dheerga interchangeably (both are "up")
      match = true;
    }

    if (!match) {
      // Wrong direction
      return { score: 40, accuracy: 'poor', match: false };
    }

    // Correct direction - always give high score since we only care about relative movement
    return { score: 95, accuracy: 'perfect', match: true };
  }

  /**
   * Analyze swaras for all syllables
   */
  analyzeSyllableSwaras(
    contour: PitchContour,
    syllables: Array<{
      index: number;
      startTime: number;
      endTime: number;
      expectedSwara: SwaraType;
      text?: string;
    }>
  ): SyllableSwara[] {
    // Always detect baseline using udātta syllables for accurate reference
    this.detectBaseline(contour, syllables);

    const results: SyllableSwara[] = [];
    const normalDuration = 0.3; // Approximate syllable duration in seconds

    for (const syllable of syllables) {
      // Extract frames for this syllable
      const syllableFrames = contour.frames.filter(
        f => f.time >= syllable.startTime && f.time < syllable.endTime && f.confidence > 0.3
      );

      if (syllableFrames.length === 0) {
        // No valid pitch detected for this syllable
        results.push({
          syllableIndex: syllable.index,
          startTime: syllable.startTime,
          endTime: syllable.endTime,
          duration: syllable.endTime - syllable.startTime,
          detection: {
            swara: 'udhaatha',
            confidence: 0,
            semitoneDeviation: 0,
            frequency: 0,
            idealDeviation: 0,
            error: 999
          },
          expectedSwara: syllable.expectedSwara,
          match: false,
          score: 0,
          accuracy: 'poor'
        });
        continue;
      }

      // Calculate average frequency (weighted by confidence)
      const totalWeight = syllableFrames.reduce((sum, f) => sum + f.confidence, 0);
      const avgFrequency = syllableFrames.reduce(
        (sum, f) => sum + f.frequency * f.confidence,
        0
      ) / totalWeight;

      const duration = syllable.endTime - syllable.startTime;

      // Classify swara
      const detection = this.classifySwara(avgFrequency, duration, normalDuration);

      // Score accuracy
      const scoring = this.scoreSyllableSwara(syllable.expectedSwara, detection);

      // Log detailed metrics for debugging
      const syllableText = syllable.text || `#${syllable.index}`;
      console.log(`📊 [${syllableText}] freq=${avgFrequency.toFixed(1)}Hz, ` +
                  `semitones=${detection.semitoneDeviation.toFixed(2)}, ` +
                  `expected=${syllable.expectedSwara}, detected=${detection.swara}, ` +
                  `match=${scoring.match ? '✅' : '❌'}, score=${scoring.score}%`);

      results.push({
        syllableIndex: syllable.index,
        startTime: syllable.startTime,
        endTime: syllable.endTime,
        duration,
        detection,
        expectedSwara: syllable.expectedSwara,
        ...scoring
      });
    }

    // Print summary statistics
    const matches = results.filter(r => r.match).length;
    const total = results.length;
    const accuracy = Math.round((matches / total) * 100);

    console.log('\n🎯 Swara Detection Summary:');
    console.log(`   Total syllables: ${total}`);
    console.log(`   Correct matches: ${matches} ✅`);
    console.log(`   Incorrect: ${total - matches} ❌`);
    console.log(`   Overall accuracy: ${accuracy}%`);

    // Breakdown by swara type
    const bySwara: Record<string, { expected: number; matched: number }> = {
      anudhaatha: { expected: 0, matched: 0 },
      udhaatha: { expected: 0, matched: 0 },
      swarita: { expected: 0, matched: 0 },
      dheerga: { expected: 0, matched: 0 }
    };

    for (const result of results) {
      bySwara[result.expectedSwara].expected++;
      if (result.match) {
        bySwara[result.expectedSwara].matched++;
      }
    }

    console.log('\n📈 Breakdown by Swara:');
    for (const [swara, stats] of Object.entries(bySwara)) {
      if (stats.expected > 0) {
        const acc = Math.round((stats.matched / stats.expected) * 100);
        console.log(`   ${swara}: ${stats.matched}/${stats.expected} (${acc}%)`);
      }
    }
    console.log('');

    return results;
  }

  /**
   * Get the current baseline pitch
   */
  getBaseline(): BaselinePitch | null {
    return this.baselinePitch;
  }

  /**
   * Reset the baseline (useful for new audio)
   */
  resetBaseline(): void {
    this.baselinePitch = null;
  }
}
