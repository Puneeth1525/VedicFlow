/**
 * NADA Engine Hook
 * Main hook that orchestrates the autonomous Shruti-Smriti practice flow
 */

import { useEffect, useRef, useCallback } from 'react';
import { NadaMachine } from '@/lib/nada/machine';
import { useNadaStore } from '@/lib/nada/store';
import {
  getMicStream,
  createPCMStream,
  playRefAudioLine,
  SimpleVAD,
} from '@/lib/nada/audio';

export interface NadaEngineConfig {
  lines: Array<{
    id: number;
    audioUrl: string;
    audioStartTime?: number;
    audioEndTime?: number;
    text: string;
  }>;
  mantraId: string;
  totalCycles?: 3 | 5 | 9 | 11;
}

export interface NadaEngineAPI {
  start: (fromLineIndex?: number) => void;
  stop: () => void;
  pause: () => void;
  resume: () => void;
  setRepeatCycles: (cycles: 3 | 5 | 9 | 11) => void;
  isReady: boolean;
}

export function useNadaEngine(config: NadaEngineConfig): NadaEngineAPI {
  const machineRef = useRef<NadaMachine | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const pcmProcessorRef = useRef<{
    start: () => void;
    stop: () => void;
    vad: SimpleVAD;
  } | null>(null);
  const audioChunksRef = useRef<Int16Array[]>([]);
  const isInitializedRef = useRef(false);

  const store = useNadaStore();

  // Initialize machine
  useEffect(() => {
    if (isInitializedRef.current) return;

    const audioUrlMap: Record<number, string> = {};
    config.lines.forEach((line, index) => {
      audioUrlMap[index] = line.audioUrl;
    });

    machineRef.current = new NadaMachine(config.lines.length, audioUrlMap, {
      totalCyclesTarget: config.totalCycles || 3,
      totalLines: config.lines.length,
    });

    // Subscribe to machine state changes
    const unsubscribe = machineRef.current.subscribe((state) => {
      store.setMachineState(state.state, state.context);

      // React to state changes
      handleStateChange(state.state);
    });

    // Try to restore saved session
    const saved = localStorage.getItem(`nada-session-${config.mantraId}`);
    if (saved && machineRef.current) {
      const restored = NadaMachine.deserialize(
        saved,
        config.lines.length,
        audioUrlMap
      );
      if (restored) {
        machineRef.current = restored;
        machineRef.current.subscribe((state) => {
          store.setMachineState(state.state, state.context);
          handleStateChange(state.state);
        });
      }
    }

    isInitializedRef.current = true;

    return () => {
      unsubscribe();
      cleanup();
    };
  }, [config.lines.length, config.mantraId]);

  // Handle state transitions
  const handleStateChange = useCallback(
    async (state: string) => {
      if (!machineRef.current) return;

      const context = machineRef.current.getState().context;

      switch (state) {
        case 'app_play':
          await handleAppPlay(context.lineIndex);
          break;

        case 'user_repeat_1':
        case 'user_repeat_2':
          await handleUserRepeat();
          break;

        case 'section_complete':
          cleanup();
          break;

        case 'error':
          cleanup();
          store.setError(context.error || 'An error occurred');
          break;
      }

      // Save session after each transition
      if (machineRef.current) {
        const serialized = machineRef.current.serialize();
        localStorage.setItem(`nada-session-${config.mantraId}`, serialized);
      }
    },
    [config]
  );

  // Handle app playback (Shruti)
  const handleAppPlay = useCallback(
    async (lineIndex: number) => {
      try {
        store.setIsPlaying(true);
        const line = config.lines[lineIndex];

        if (line.audioStartTime !== undefined && line.audioEndTime !== undefined) {
          await playRefAudioLine(line.audioUrl, line.audioStartTime, line.audioEndTime);
        } else {
          await playRefAudioLine(line.audioUrl);
        }

        store.setIsPlaying(false);

        // Notify machine that playback is done
        if (machineRef.current) {
          machineRef.current.send({ type: 'APP_PLAY_DONE' });
        }
      } catch (error) {
        console.error('Error playing reference audio:', error);
        store.setIsPlaying(false);
        if (machineRef.current) {
          machineRef.current.send({
            type: 'ERROR',
            message: 'Failed to play reference audio',
          });
        }
      }
    },
    [config.lines, store]
  );

  // Handle user repeat (Smriti)
  const handleUserRepeat = useCallback(async () => {
    try {
      // Get microphone stream
      if (!micStreamRef.current) {
        micStreamRef.current = await getMicStream();
      }

      // Clear previous audio chunks
      audioChunksRef.current = [];

      // Create PCM stream with VAD
      const processor = await createPCMStream(
        micStreamRef.current,
        (chunk) => {
          audioChunksRef.current.push(chunk);
        }
      );

      pcmProcessorRef.current = processor;

      // Set up VAD callbacks
      processor.vad.setSpeechStartCallback(() => {
        store.setVadActive(true);
      });

      processor.vad.setSpeechEndCallback(async () => {
        store.setVadActive(false);

        // Speech ended - stop recording and process
        processor.stop();
        store.setIsRecording(false);

        // Combine all audio chunks
        const totalLength = audioChunksRef.current.reduce(
          (sum, chunk) => sum + chunk.length,
          0
        );
        const combinedAudio = new Int16Array(totalLength);
        let offset = 0;
        for (const chunk of audioChunksRef.current) {
          combinedAudio.set(chunk, offset);
          offset += chunk.length;
        }

        // Send to Whisper for transcription
        const transcript = await transcribeAudio(combinedAudio);

        // Notify machine
        if (machineRef.current) {
          machineRef.current.send({
            type: 'USER_SPOKE_DONE',
            transcript,
          });
        }
      });

      // Start recording
      processor.start();
      store.setIsRecording(true);
    } catch (error) {
      console.error('Error handling user repeat:', error);
      store.setIsRecording(false);
      if (machineRef.current) {
        machineRef.current.send({
          type: 'ERROR',
          message: 'Failed to record audio',
        });
      }
    }
  }, [store]);

  // Transcribe audio using Whisper
  const transcribeAudio = useCallback(async (pcmData: Int16Array): Promise<string> => {
    try {
      // Convert Int16Array to base64
      const uint8 = new Uint8Array(pcmData.buffer);
      const base64 = btoa(String.fromCharCode(...Array.from(uint8)));

      // Send to API
      const response = await fetch('/api/realtime', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          audioData: base64,
          model: 'whisper-1',
          language: 'sa',
        }),
      });

      if (!response.ok) {
        throw new Error('Transcription failed');
      }

      const result = await response.json();
      return result.text || 'ok';
    } catch (error) {
      console.error('Transcription error:', error);
      return 'ok'; // Fallback
    }
  }, []);

  // Cleanup resources
  const cleanup = useCallback(() => {
    if (pcmProcessorRef.current) {
      pcmProcessorRef.current.stop();
      pcmProcessorRef.current = null;
    }

    if (micStreamRef.current) {
      micStreamRef.current.getTracks().forEach((track) => track.stop());
      micStreamRef.current = null;
    }

    audioChunksRef.current = [];
    store.setIsRecording(false);
    store.setIsPlaying(false);
    store.setVadActive(false);
    store.setLiveTranscript('');
  }, [store]);

  // Public API
  const start = useCallback(
    (fromLineIndex: number = 0) => {
      if (!machineRef.current) return;
      machineRef.current.send({ type: 'START', lineIndex: fromLineIndex });
    },
    []
  );

  const stop = useCallback(() => {
    if (!machineRef.current) return;
    machineRef.current.send({ type: 'STOP' });
    cleanup();
  }, [cleanup]);

  const pause = useCallback(() => {
    stop(); // For now, pause = stop
  }, [stop]);

  const resume = useCallback(() => {
    if (!machineRef.current) return;
    const state = machineRef.current.getState();
    start(state.context.lineIndex);
  }, [start]);

  const setRepeatCycles = useCallback((cycles: 3 | 5 | 9 | 11) => {
    if (!machineRef.current) return;
    machineRef.current.setTotalCycles(cycles);
  }, []);

  return {
    start,
    stop,
    pause,
    resume,
    setRepeatCycles,
    isReady: isInitializedRef.current,
  };
}
