/**
 * Vedic Swara Classifier
 * Detects Udātta, Anudātta, Swarita, and Dīrgha Swarita based on relative pitch
 */

import { PitchContour, PitchFrame } from './crepePitchDetector';
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
   * Uses median of confident pitch values
   */
  detectBaseline(contour: PitchContour): BaselinePitch {
    // Filter for confident, non-zero pitches
    const validFrames = contour.frames.filter(
      f => f.confidence > 0.5 && f.frequency > 50 && f.frequency < 1000
    );

    if (validFrames.length === 0) {
      throw new Error('No valid pitch detected in audio');
    }

    // Calculate median frequency (robust against outliers)
    const frequencies = validFrames.map(f => f.frequency).sort((a, b) => a - b);
    const medianFreq = frequencies[Math.floor(frequencies.length / 2)];

    // Calculate average confidence
    const avgConfidence = validFrames.reduce((sum, f) => sum + f.confidence, 0) / validFrames.length;

    // Define semitone ranges for each swara
    // Based on Vedic tradition: Anudātta (-2.5), Udātta (0), Swarita/Dheerga (+2.5)
    const semitoneRange = {
      anudhaata: [-4.0, -1.5] as [number, number],    // 1.5-4 semitones below
      udhaata: [-1.5, 1.5] as [number, number],        // Within ±1.5 semitones
      swarita: [1.5, 4.0] as [number, number],         // 1.5-4 semitones above
      dheerga: [1.5, 4.0] as [number, number]          // Same as swarita (distinguished by duration)
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

    // Determine swara type
    let swara: SwaraType;
    let idealDeviation: number;
    let confidence = 0.9;

    if (semitones >= this.baselinePitch.semitoneRange.anudhaata[0] &&
        semitones < this.baselinePitch.semitoneRange.anudhaata[1]) {
      swara = 'anudhaata';
      idealDeviation = -2.5;  // 2.5 semitones below
    } else if (semitones >= this.baselinePitch.semitoneRange.udhaata[0] &&
               semitones <= this.baselinePitch.semitoneRange.udhaata[1]) {
      swara = 'udhaata';
      idealDeviation = 0;
    } else if (semitones > this.baselinePitch.semitoneRange.swarita[0] &&
               semitones <= this.baselinePitch.semitoneRange.swarita[1]) {
      // Check duration for dheerga swarita
      if (duration > normalDuration * 1.4) {
        swara = 'dheerga';
        idealDeviation = 2.5;
      } else {
        swara = 'swarita';
        idealDeviation = 2.5;  // 2.5 semitones above
      }
    } else {
      // Out of range - classify as closest
      if (semitones < this.baselinePitch.semitoneRange.anudhaata[0]) {
        swara = 'anudhaata';
        idealDeviation = -2.5;
        confidence = 0.5;  // Low confidence
      } else {
        swara = duration > normalDuration * 1.4 ? 'dheerga' : 'swarita';
        idealDeviation = 2.5;
        confidence = 0.5;
      }
    }

    const error = Math.abs(semitones - idealDeviation);

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
   */
  scoreSyllableSwara(
    expected: SwaraType,
    detected: SwaraDetection
  ): { score: number; accuracy: 'perfect' | 'good' | 'fair' | 'poor'; match: boolean } {
    const match = expected === detected.swara;

    if (!match) {
      // Wrong swara detected
      return { score: 30, accuracy: 'poor', match: false };
    }

    // Correct swara - score based on precision
    const error = detected.error;

    if (error < 0.5) {
      return { score: 100, accuracy: 'perfect', match: true };
    } else if (error < 1.0) {
      return { score: 90, accuracy: 'good', match: true };
    } else if (error < 1.5) {
      return { score: 80, accuracy: 'good', match: true };
    } else if (error < 2.0) {
      return { score: 70, accuracy: 'fair', match: true };
    } else {
      return { score: 60, accuracy: 'fair', match: true };
    }
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
    }>
  ): SyllableSwara[] {
    if (!this.baselinePitch) {
      this.detectBaseline(contour);
    }

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
            swara: 'udhaata',
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
