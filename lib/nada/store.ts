/**
 * NADA Engine Zustand Store
 * Client-side state management for practice UI
 */

import { create } from 'zustand';
import { NadaState, NadaContext } from './machine';

export interface NadaUIState {
  // Machine state
  machineState: NadaState;
  context: NadaContext;

  // UI-specific state
  liveTranscript: string; // Current partial transcript from Whisper
  isRecording: boolean;
  isPlaying: boolean;
  vadActive: boolean; // Voice activity detected
  error: string | null;

  // Settings
  showSettings: boolean;
  showInfo: boolean;

  // Actions
  setMachineState: (state: NadaState, context: NadaContext) => void;
  setLiveTranscript: (transcript: string) => void;
  setIsRecording: (recording: boolean) => void;
  setIsPlaying: (playing: boolean) => void;
  setVadActive: (active: boolean) => void;
  setError: (error: string | null) => void;
  setShowSettings: (show: boolean) => void;
  setShowInfo: (show: boolean) => void;
  reset: () => void;
}

const initialContext: NadaContext = {
  lineIndex: 0,
  repeatInCycle: 1,
  currentCycle: 1,
  totalCyclesTarget: 3,
  mode: 'line',
  refAudioUrl: '',
  totalLines: 0,
  transcripts: [],
};

export const useNadaStore = create<NadaUIState>((set) => ({
  // Initial state
  machineState: 'idle',
  context: initialContext,
  liveTranscript: '',
  isRecording: false,
  isPlaying: false,
  vadActive: false,
  error: null,
  showSettings: false,
  showInfo: false,

  // Actions
  setMachineState: (machineState, context) => set({ machineState, context }),

  setLiveTranscript: (liveTranscript) => set({ liveTranscript }),

  setIsRecording: (isRecording) => set({ isRecording }),

  setIsPlaying: (isPlaying) => set({ isPlaying }),

  setVadActive: (vadActive) => set({ vadActive }),

  setError: (error) => set({ error }),

  setShowSettings: (showSettings) => set({ showSettings }),

  setShowInfo: (showInfo) => set({ showInfo }),

  reset: () =>
    set({
      machineState: 'idle',
      context: initialContext,
      liveTranscript: '',
      isRecording: false,
      isPlaying: false,
      vadActive: false,
      error: null,
    }),
}));

// Selectors for common state queries
export const selectMachineState = (state: NadaUIState) => state.machineState;
export const selectContext = (state: NadaUIState) => state.context;
export const selectIsActive = (state: NadaUIState) =>
  state.machineState !== 'idle' &&
  state.machineState !== 'section_complete' &&
  state.machineState !== 'error';
export const selectProgress = (state: NadaUIState) => ({
  lineIndex: state.context.lineIndex,
  totalLines: state.context.totalLines,
  currentCycle: state.context.currentCycle,
  totalCycles: state.context.totalCyclesTarget,
  percentage:
    state.context.totalLines > 0
      ? ((state.context.lineIndex + (state.context.currentCycle - 1) / state.context.totalCyclesTarget) /
          state.context.totalLines) *
        100
      : 0,
});
export const selectCurrentRepeat = (state: NadaUIState) => state.context.repeatInCycle;
export const selectLiveTranscript = (state: NadaUIState) => state.liveTranscript;
export const selectIsRecording = (state: NadaUIState) => state.isRecording;
export const selectVadActive = (state: NadaUIState) => state.vadActive;
