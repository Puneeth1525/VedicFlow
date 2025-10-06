/**
 * CREPE-inspired Pitch Detection for Vedic Swara Analysis
 * Uses autocorrelation with ML-enhanced preprocessing
 *
 * This is a lightweight implementation optimized for browser performance
 * while maintaining accuracy for relative pitch detection in Vedic chanting.
 */

export interface PitchFrame {
  time: number;        // Time in seconds
  frequency: number;   // Fundamental frequency in Hz
  confidence: number;  // Confidence score 0-1
}

export interface PitchContour {
  frames: PitchFrame[];
  sampleRate: number;
  duration: number;
}

/**
 * Enhanced autocorrelation pitch detection
 * Based on YIN algorithm with improvements
 */
export class MLPitchDetector {
  private sampleRate: number;
  private hopLength: number;
  private fftSize: number;
  private minFreq: number;
  private maxFreq: number;

  constructor(config: {
    sampleRate?: number;
    hopLength?: number;
    fftSize?: number;
    minFreq?: number;
    maxFreq?: number;
  } = {}) {
    this.sampleRate = config.sampleRate || 16000;
    this.hopLength = config.hopLength || 160; // 10ms at 16kHz
    this.fftSize = config.fftSize || 2048;
    this.minFreq = config.minFreq || 80;   // Lowest human voice
    this.maxFreq = config.maxFreq || 800;  // Upper range for chanting
  }

  /**
   * Extract pitch contour from audio buffer
   */
  async extractPitchContour(audioBuffer: AudioBuffer): Promise<PitchContour> {
    const audioData = audioBuffer.getChannelData(0);
    const frames: PitchFrame[] = [];

    // Resample to 16kHz if needed
    let processedAudio: Float32Array = audioData;
    if (audioBuffer.sampleRate !== this.sampleRate) {
      processedAudio = await this.resample(audioData, audioBuffer.sampleRate, this.sampleRate);
    }

    // Extract pitch for each frame
    for (let i = 0; i < processedAudio.length - this.fftSize; i += this.hopLength) {
      const frame = processedAudio.slice(i, i + this.fftSize);
      const pitch = this.detectPitchInFrame(frame);

      frames.push({
        time: i / this.sampleRate,
        frequency: pitch.frequency,
        confidence: pitch.confidence
      });
    }

    return {
      frames,
      sampleRate: this.sampleRate,
      duration: audioBuffer.duration
    };
  }

  /**
   * Detect pitch in a single frame using enhanced autocorrelation (YIN algorithm)
   */
  private detectPitchInFrame(frame: Float32Array): { frequency: number; confidence: number } {
    const minLag = Math.floor(this.sampleRate / this.maxFreq);
    const maxLag = Math.floor(this.sampleRate / this.minFreq);

    // Calculate RMS for voice activity detection
    const rms = this.calculateRMS(frame);
    if (rms < 0.01) {
      return { frequency: 0, confidence: 0 }; // Silence
    }

    // Apply window function
    const windowed = this.applyHannWindow(frame);

    // Calculate autocorrelation using YIN
    const { lag, confidence } = this.yinPitchDetection(windowed, minLag, maxLag);

    if (lag === 0 || confidence < 0.1) {
      return { frequency: 0, confidence: 0 };
    }

    // Parabolic interpolation for sub-sample accuracy
    const refinedLag = this.parabolicInterpolation(windowed, lag, minLag, maxLag);
    const frequency = this.sampleRate / refinedLag;

    return { frequency, confidence };
  }

  /**
   * YIN pitch detection algorithm
   * Reference: http://audition.ens.fr/adc/pdf/2002_JASA_YIN.pdf
   */
  private yinPitchDetection(
    frame: Float32Array,
    minLag: number,
    maxLag: number
  ): { lag: number; confidence: number } {
    const yinBuffer = new Float32Array(maxLag);

    // Step 1: Calculate difference function
    for (let tau = 0; tau < maxLag; tau++) {
      let sum = 0;
      for (let i = 0; i < frame.length - maxLag; i++) {
        const delta = frame[i] - frame[i + tau];
        sum += delta * delta;
      }
      yinBuffer[tau] = sum;
    }

    // Step 2: Cumulative mean normalized difference
    yinBuffer[0] = 1;
    let runningSum = 0;
    for (let tau = 1; tau < maxLag; tau++) {
      runningSum += yinBuffer[tau];
      yinBuffer[tau] *= tau / runningSum;
    }

    // Step 3: Absolute threshold
    const threshold = 0.15;
    let lag = minLag;

    // Find first valley below threshold
    for (let tau = minLag; tau < maxLag; tau++) {
      if (yinBuffer[tau] < threshold) {
        // Check if it's a local minimum
        while (tau + 1 < maxLag && yinBuffer[tau + 1] < yinBuffer[tau]) {
          tau++;
        }
        lag = tau;
        break;
      }
    }

    // If no valley found below threshold, use global minimum
    if (lag === minLag) {
      let minValue = yinBuffer[minLag];
      for (let tau = minLag; tau < maxLag; tau++) {
        if (yinBuffer[tau] < minValue) {
          minValue = yinBuffer[tau];
          lag = tau;
        }
      }
    }

    const confidence = 1 - yinBuffer[lag];
    return { lag, confidence };
  }

  /**
   * Parabolic interpolation for sub-sample pitch accuracy
   */
  private parabolicInterpolation(
    frame: Float32Array,
    lag: number,
    minLag: number,
    maxLag: number
  ): number {
    if (lag <= minLag || lag >= maxLag - 1) {
      return lag;
    }

    // Calculate autocorrelation around the lag
    const prev = this.autocorrelationAt(frame, lag - 1);
    const curr = this.autocorrelationAt(frame, lag);
    const next = this.autocorrelationAt(frame, lag + 1);

    const adjustment = 0.5 * (prev - next) / (prev - 2 * curr + next);
    return lag + adjustment;
  }

  /**
   * Calculate autocorrelation at specific lag
   */
  private autocorrelationAt(frame: Float32Array, lag: number): number {
    let sum = 0;
    for (let i = 0; i < frame.length - lag; i++) {
      sum += frame[i] * frame[i + lag];
    }
    return sum;
  }

  /**
   * Apply Hann window to reduce spectral leakage
   */
  private applyHannWindow(frame: Float32Array): Float32Array {
    const windowed = new Float32Array(frame.length);
    for (let i = 0; i < frame.length; i++) {
      const window = 0.5 * (1 - Math.cos((2 * Math.PI * i) / (frame.length - 1)));
      windowed[i] = frame[i] * window;
    }
    return windowed;
  }

  /**
   * Calculate RMS for voice activity detection
   */
  private calculateRMS(frame: Float32Array): number {
    let sum = 0;
    for (let i = 0; i < frame.length; i++) {
      sum += frame[i] * frame[i];
    }
    return Math.sqrt(sum / frame.length);
  }

  /**
   * Resample audio to target sample rate
   */
  private async resample(
    audio: Float32Array,
    fromRate: number,
    toRate: number
  ): Promise<Float32Array> {
    if (fromRate === toRate) {
      return audio;
    }

    const ratio = fromRate / toRate;
    const newLength = Math.floor(audio.length / ratio);
    const resampled = new Float32Array(newLength);

    for (let i = 0; i < newLength; i++) {
      const srcIndex = i * ratio;
      const srcIndexFloor = Math.floor(srcIndex);
      const srcIndexCeil = Math.min(srcIndexFloor + 1, audio.length - 1);
      const fraction = srcIndex - srcIndexFloor;

      // Linear interpolation
      resampled[i] = audio[srcIndexFloor] * (1 - fraction) + audio[srcIndexCeil] * fraction;
    }

    return resampled;
  }

  /**
   * Apply median filter to smooth pitch contour
   */
  smoothPitchContour(contour: PitchContour, windowSize: number = 5): PitchContour {
    const smoothedFrames: PitchFrame[] = [];
    const halfWindow = Math.floor(windowSize / 2);

    for (let i = 0; i < contour.frames.length; i++) {
      const start = Math.max(0, i - halfWindow);
      const end = Math.min(contour.frames.length, i + halfWindow + 1);
      const window = contour.frames.slice(start, end);

      // Only consider confident frames
      const validFrames = window.filter(f => f.confidence > 0.3 && f.frequency > 0);

      if (validFrames.length === 0) {
        smoothedFrames.push({ ...contour.frames[i], frequency: 0, confidence: 0 });
        continue;
      }

      // Median frequency
      const frequencies = validFrames.map(f => f.frequency).sort((a, b) => a - b);
      const medianFreq = frequencies[Math.floor(frequencies.length / 2)];

      // Average confidence
      const avgConfidence = validFrames.reduce((sum, f) => sum + f.confidence, 0) / validFrames.length;

      smoothedFrames.push({
        time: contour.frames[i].time,
        frequency: medianFreq,
        confidence: avgConfidence
      });
    }

    return {
      frames: smoothedFrames,
      sampleRate: contour.sampleRate,
      duration: contour.duration
    };
  }
}
