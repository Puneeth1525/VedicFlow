/**
 * Syllable Segmentation for Vedic Chanting
 * Aligns syllables with audio timestamps using energy-based detection
 */

import { SyllableWithSwara } from '../pitchDetection';

export interface SyllableTimeSegment {
  index: number;
  startTime: number;
  endTime: number;
  duration: number;
  text: string;
  expectedSwara: string;
}

export class SyllableSegmenter {
  /**
   * Segment audio into syllable time ranges
   * Uses energy-based detection and expected syllable count
   */
  async segmentBySyllables(
    audioBuffer: AudioBuffer,
    syllables: SyllableWithSwara[]
  ): Promise<SyllableTimeSegment[]> {
    const audioData = audioBuffer.getChannelData(0);
    const sampleRate = audioBuffer.sampleRate;

    // Detect onset times (syllable boundaries) using energy
    const onsets = this.detectOnsets(audioData, sampleRate);

    console.log(`🎵 Detected ${onsets.length} onsets for ${syllables.length} syllables`);

    // Align onsets with syllables
    const segments = this.alignOnsetsWithSyllables(onsets, syllables, audioBuffer.duration);

    return segments;
  }

  /**
   * Detect syllable onsets using energy-based method
   */
  private detectOnsets(audioData: Float32Array, sampleRate: number): number[] {
    const hopSize = Math.floor(sampleRate * 0.01); // 10ms hops
    const frameSize = hopSize * 2;
    const onsets: number[] = [];

    // Calculate energy envelope
    const energy: number[] = [];
    for (let i = 0; i < audioData.length - frameSize; i += hopSize) {
      let sum = 0;
      for (let j = 0; j < frameSize; j++) {
        sum += audioData[i + j] * audioData[i + j];
      }
      energy.push(Math.sqrt(sum / frameSize));
    }

    // Smooth energy using moving average
    const smoothed = this.movingAverage(energy, 3);

    // Normalize
    const maxEnergy = Math.max(...smoothed);
    const normalized = smoothed.map(e => e / maxEnergy);

    // Detect peaks in energy (onsets)
    const threshold = 0.15;  // Energy threshold
    const minDistance = Math.floor(sampleRate * 0.08 / hopSize); // Min 80ms between syllables

    let lastOnset = -minDistance;

    for (let i = 1; i < normalized.length - 1; i++) {
      // Peak detection: current > previous AND current > next AND above threshold
      if (normalized[i] > normalized[i - 1] &&
          normalized[i] > normalized[i + 1] &&
          normalized[i] > threshold &&
          i - lastOnset >= minDistance) {
        const time = (i * hopSize) / sampleRate;
        onsets.push(time);
        lastOnset = i;
      }
    }

    return onsets;
  }

  /**
   * Align detected onsets with expected syllables
   */
  private alignOnsetsWithSyllables(
    onsets: number[],
    syllables: SyllableWithSwara[],
    totalDuration: number
  ): SyllableTimeSegment[] {
    const segments: SyllableTimeSegment[] = [];

    // If we have more or fewer onsets than syllables, distribute evenly as fallback
    if (onsets.length < syllables.length - 2 || onsets.length > syllables.length + 3) {
      console.warn(`⚠️ Onset count mismatch. Using uniform distribution.`);
      return this.uniformDistribution(syllables, totalDuration);
    }

    // Use onsets as boundaries
    for (let i = 0; i < syllables.length; i++) {
      const startTime = onsets[i] || (i / syllables.length) * totalDuration;
      const endTime = onsets[i + 1] || ((i + 1) / syllables.length) * totalDuration;

      segments.push({
        index: i,
        startTime,
        endTime,
        duration: endTime - startTime,
        text: syllables[i].text,
        expectedSwara: syllables[i].swara
      });
    }

    return segments;
  }

  /**
   * Fallback: Uniform time distribution
   */
  private uniformDistribution(
    syllables: SyllableWithSwara[],
    totalDuration: number
  ): SyllableTimeSegment[] {
    const segments: SyllableTimeSegment[] = [];
    const syllableDuration = totalDuration / syllables.length;

    for (let i = 0; i < syllables.length; i++) {
      const startTime = i * syllableDuration;
      const endTime = (i + 1) * syllableDuration;

      segments.push({
        index: i,
        startTime,
        endTime,
        duration: syllableDuration,
        text: syllables[i].text,
        expectedSwara: syllables[i].swara
      });
    }

    console.log(`📊 Using uniform distribution: ${syllableDuration.toFixed(3)}s per syllable`);

    return segments;
  }

  /**
   * Moving average filter
   */
  private movingAverage(data: number[], windowSize: number): number[] {
    const result: number[] = [];
    const halfWindow = Math.floor(windowSize / 2);

    for (let i = 0; i < data.length; i++) {
      const start = Math.max(0, i - halfWindow);
      const end = Math.min(data.length, i + halfWindow + 1);
      const window = data.slice(start, end);
      const avg = window.reduce((sum, val) => sum + val, 0) / window.length;
      result.push(avg);
    }

    return result;
  }
}
