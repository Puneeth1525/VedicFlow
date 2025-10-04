/**
 * Audio ML Model Utilities
 * Loads and uses Teachable Machine audio models for mantra verification
 */

import * as tf from '@tensorflow/tfjs';

export interface AudioMLResult {
  className: string;
  probability: number;
}

export class AudioMLModel {
  private recognizer: any = null;
  private wordLabels: string[] = [];

  /**
   * Load a Teachable Machine audio model
   * @param modelURL - URL to the folder containing model.json (e.g., '/models/ganesha-gayatri/')
   */
  async loadModel(modelURL: string): Promise<void> {
    try {
      // Dynamically import speech-commands to avoid SSR issues
      const speechCommands = await import('@tensorflow-models/speech-commands');

      // Create a recognizer from the Teachable Machine model
      this.recognizer = speechCommands.create(
        'BROWSER_FFT',
        undefined,
        modelURL + 'model.json',
        modelURL + 'metadata.json'
      );

      // Ensure the model is loaded
      await this.recognizer.ensureModelLoaded();

      // Get the word labels from the model
      this.wordLabels = this.recognizer.wordLabels();

      console.log('Model loaded successfully. Labels:', this.wordLabels);
    } catch (error) {
      console.error('Error loading model:', error);
      throw error;
    }
  }

  /**
   * Predict from audio buffer
   * @param audioBuffer - Web Audio API AudioBuffer
   * @returns Array of predictions
   */
  async predictFromAudioBuffer(audioBuffer: AudioBuffer): Promise<AudioMLResult[]> {
    if (!this.recognizer) {
      throw new Error('Model not loaded. Call loadModel() first.');
    }

    try {
      // Convert AudioBuffer to the format expected by the recognizer
      const inputTensor = this.audioBufferToTensor(audioBuffer);

      // Run prediction
      const scores = await this.recognizer.recognize(inputTensor);

      // Clean up tensor
      inputTensor.dispose();

      // Convert scores to results
      const results: AudioMLResult[] = this.wordLabels.map((label, i) => ({
        className: label,
        probability: scores[i] || 0,
      }));

      // Sort by probability (highest first)
      results.sort((a, b) => b.probability - a.probability);

      return results;
    } catch (error) {
      console.error('Prediction error:', error);
      throw error;
    }
  }

  /**
   * Real-time prediction from microphone stream
   * @param onPrediction - Callback for each prediction
   * @returns Cleanup function to stop listening
   */
  async startRealtimePrediction(
    onPrediction: (results: AudioMLResult[]) => void
  ): Promise<() => void> {
    if (!this.recognizer) {
      throw new Error('Model not loaded. Call loadModel() first.');
    }

    await this.recognizer.listen(
      (result) => {
        const results: AudioMLResult[] = this.wordLabels.map((label, i) => ({
          className: label,
          probability: result.scores[i] || 0,
        }));

        results.sort((a, b) => b.probability - a.probability);
        onPrediction(results);
      },
      {
        probabilityThreshold: 0.5,
        includeSpectrogram: false,
        overlapFactor: 0.5,
      }
    );

    // Return cleanup function
    return async () => {
      if (this.recognizer) {
        await this.recognizer.stopListening();
      }
    };
  }

  /**
   * Convert AudioBuffer to tensor format expected by speech commands model
   */
  private audioBufferToTensor(audioBuffer: AudioBuffer): tf.Tensor {
    // Get mono channel data
    const channelData = audioBuffer.getChannelData(0);

    // Speech commands model expects specific length (usually 44032 samples for 1 second at 44.1kHz)
    const expectedLength = 44032;
    const resampledData = new Float32Array(expectedLength);

    // Resample to expected length
    const ratio = channelData.length / expectedLength;
    for (let i = 0; i < expectedLength; i++) {
      const srcIndex = Math.floor(i * ratio);
      resampledData[i] = channelData[srcIndex] || 0;
    }

    // Create tensor with shape [1, expectedLength, 1]
    return tf.tensor3d(resampledData, [1, expectedLength, 1]);
  }

  /**
   * Get the top N predictions
   */
  getTopPredictions(results: AudioMLResult[], n: number = 3): AudioMLResult[] {
    return results.slice(0, n);
  }

  /**
   * Check if prediction matches expected class with minimum confidence
   */
  matchesPrediction(
    results: AudioMLResult[],
    expectedClass: string,
    minConfidence: number = 0.7
  ): { matches: boolean; confidence: number } {
    const topResult = results[0];
    const matches =
      topResult.className.toLowerCase().includes(expectedClass.toLowerCase()) &&
      topResult.probability >= minConfidence;

    return {
      matches,
      confidence: topResult.probability,
    };
  }
}

/**
 * Utility function to split audio into syllable-sized chunks
 * @param audioBuffer - Full audio buffer
 * @param numSyllables - Number of syllables to split into
 * @returns Array of audio buffers, one per syllable
 */
export function splitAudioBySyllables(
  audioBuffer: AudioBuffer,
  numSyllables: number
): AudioBuffer[] {
  const duration = audioBuffer.duration;
  const sampleRate = audioBuffer.sampleRate;
  const channelData = audioBuffer.getChannelData(0);

  const syllableDuration = duration / numSyllables;
  const samplesPerSyllable = Math.floor(sampleRate * syllableDuration);

  const syllableBuffers: AudioBuffer[] = [];
  const audioContext = new AudioContext();

  for (let i = 0; i < numSyllables; i++) {
    const startSample = i * samplesPerSyllable;
    const endSample = Math.min(startSample + samplesPerSyllable, channelData.length);

    const syllableData = channelData.slice(startSample, endSample);

    // Create new AudioBuffer for this syllable
    const syllableBuffer = audioContext.createBuffer(
      1,
      syllableData.length,
      sampleRate
    );
    syllableBuffer.copyToChannel(syllableData, 0);

    syllableBuffers.push(syllableBuffer);
  }

  return syllableBuffers;
}
