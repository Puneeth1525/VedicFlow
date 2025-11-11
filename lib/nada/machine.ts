/**
 * NADA Engine State Machine
 * Pure TypeScript deterministic state machine for Shruti-Smriti practice flow
 */

export type NadaState =
  | 'idle'
  | 'init'
  | 'app_play'
  | 'user_repeat_1'
  | 'user_repeat_2'
  | 'repeat_cycle_check'
  | 'advance_line'
  | 'section_complete'
  | 'error';

export type NadaEvent =
  | { type: 'START'; lineIndex: number }
  | { type: 'APP_PLAY_DONE' }
  | { type: 'USER_SPOKE_DONE'; transcript?: string }
  | { type: 'CYCLE_DONE' }
  | { type: 'NEXT_LINE' }
  | { type: 'STOP' }
  | { type: 'ERROR'; message: string };

export type PracticeMode = 'line' | 'paragraph' | 'full';

export interface NadaContext {
  lineIndex: number;
  repeatInCycle: number; // Current repeat within this cycle (1 or 2)
  currentCycle: number; // Current cycle number (1..N)
  totalCyclesTarget: 3 | 5 | 9 | 11;
  mode: PracticeMode;
  refAudioUrl: string;
  whisperSessionId?: string;
  totalLines: number;
  transcripts: string[]; // Transcripts from both repeats
  error?: string;
}

export interface NadaMachineState {
  state: NadaState;
  context: NadaContext;
}

type StateListener = (state: NadaMachineState) => void;

export class NadaMachine {
  private currentState: NadaState = 'idle';
  private context: NadaContext;
  private listeners: Set<StateListener> = new Set();
  private audioUrlMap: Record<number, string>;

  constructor(
    totalLines: number,
    audioUrlMap: Record<number, string>,
    initialContext?: Partial<NadaContext>
  ) {
    this.audioUrlMap = audioUrlMap;
    this.context = {
      lineIndex: 0,
      repeatInCycle: 1,
      currentCycle: 1,
      totalCyclesTarget: 3,
      mode: 'line',
      refAudioUrl: audioUrlMap[0] || '',
      totalLines,
      transcripts: [],
      ...initialContext,
    };
  }

  public getState(): NadaMachineState {
    return {
      state: this.currentState,
      context: { ...this.context },
    };
  }

  public subscribe(listener: StateListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  public send(event: NadaEvent): void {
    const prevState = this.currentState;
    const prevContext = { ...this.context };

    this.transition(event);

    // Notify listeners if state or context changed
    if (
      prevState !== this.currentState ||
      JSON.stringify(prevContext) !== JSON.stringify(this.context)
    ) {
      this.notifyListeners();
    }
  }

  private transition(event: NadaEvent): void {
    console.log(`[NADA] State: ${this.currentState} | Event: ${event.type}`);

    switch (this.currentState) {
      case 'idle':
        if (event.type === 'START') {
          this.currentState = 'init';
          this.context.lineIndex = event.lineIndex;
          this.context.currentCycle = 1;
          this.context.repeatInCycle = 1;
          this.context.transcripts = [];
          this.context.refAudioUrl = this.audioUrlMap[event.lineIndex] || '';
          // Auto-transition to app_play
          setTimeout(() => this.send({ type: 'APP_PLAY_DONE' }), 0);
        }
        break;

      case 'init':
        if (event.type === 'APP_PLAY_DONE') {
          this.currentState = 'app_play';
        } else if (event.type === 'ERROR') {
          this.currentState = 'error';
          this.context.error = event.message;
        }
        break;

      case 'app_play':
        if (event.type === 'APP_PLAY_DONE') {
          this.currentState = 'user_repeat_1';
          this.context.repeatInCycle = 1;
        } else if (event.type === 'ERROR') {
          this.currentState = 'error';
          this.context.error = event.message;
        } else if (event.type === 'STOP') {
          this.currentState = 'idle';
        }
        break;

      case 'user_repeat_1':
        if (event.type === 'USER_SPOKE_DONE') {
          if (event.transcript) {
            this.context.transcripts[0] = event.transcript;
          }
          this.currentState = 'user_repeat_2';
          this.context.repeatInCycle = 2;
        } else if (event.type === 'ERROR') {
          this.currentState = 'error';
          this.context.error = event.message;
        } else if (event.type === 'STOP') {
          this.currentState = 'idle';
        }
        break;

      case 'user_repeat_2':
        if (event.type === 'USER_SPOKE_DONE') {
          if (event.transcript) {
            this.context.transcripts[1] = event.transcript;
          }
          this.currentState = 'repeat_cycle_check';
          // Auto-check cycle
          setTimeout(() => this.send({ type: 'CYCLE_DONE' }), 0);
        } else if (event.type === 'ERROR') {
          this.currentState = 'error';
          this.context.error = event.message;
        } else if (event.type === 'STOP') {
          this.currentState = 'idle';
        }
        break;

      case 'repeat_cycle_check':
        if (event.type === 'CYCLE_DONE') {
          // Check if we need more cycles
          if (this.hasMoreRepeatsInCycle()) {
            // More cycles needed - go back to app_play
            this.context.currentCycle++;
            this.context.repeatInCycle = 1;
            this.context.transcripts = [];
            this.currentState = 'app_play';
          } else {
            // Cycles complete - advance line
            this.currentState = 'advance_line';
            setTimeout(() => this.send({ type: 'NEXT_LINE' }), 0);
          }
        } else if (event.type === 'STOP') {
          this.currentState = 'idle';
        }
        break;

      case 'advance_line':
        if (event.type === 'NEXT_LINE') {
          if (this.hasMoreLines()) {
            // Move to next line
            this.context.lineIndex++;
            this.context.currentCycle = 1;
            this.context.repeatInCycle = 1;
            this.context.transcripts = [];
            this.context.refAudioUrl = this.audioUrlMap[this.context.lineIndex] || '';
            this.currentState = 'app_play';
          } else {
            // All lines complete
            this.currentState = 'section_complete';
          }
        } else if (event.type === 'STOP') {
          this.currentState = 'idle';
        }
        break;

      case 'section_complete':
        if (event.type === 'START') {
          // Restart from beginning or specified line
          this.currentState = 'init';
          this.context.lineIndex = event.lineIndex;
          this.context.currentCycle = 1;
          this.context.repeatInCycle = 1;
          this.context.transcripts = [];
          this.context.refAudioUrl = this.audioUrlMap[event.lineIndex] || '';
          setTimeout(() => this.send({ type: 'APP_PLAY_DONE' }), 0);
        } else if (event.type === 'STOP') {
          this.currentState = 'idle';
        }
        break;

      case 'error':
        if (event.type === 'START') {
          // Retry from current or specified line
          this.currentState = 'init';
          this.context.lineIndex = event.lineIndex;
          this.context.currentCycle = 1;
          this.context.repeatInCycle = 1;
          this.context.transcripts = [];
          this.context.error = undefined;
          this.context.refAudioUrl = this.audioUrlMap[event.lineIndex] || '';
          setTimeout(() => this.send({ type: 'APP_PLAY_DONE' }), 0);
        } else if (event.type === 'STOP') {
          this.currentState = 'idle';
          this.context.error = undefined;
        }
        break;
    }
  }

  // Guards
  private hasMoreRepeatsInCycle(): boolean {
    return this.context.currentCycle < this.context.totalCyclesTarget;
  }

  private hasMoreLines(): boolean {
    return this.context.lineIndex < this.context.totalLines - 1;
  }

  // Public setters for configuration
  public setTotalCycles(cycles: 3 | 5 | 9 | 11): void {
    this.context.totalCyclesTarget = cycles;
    this.notifyListeners();
  }

  public setMode(mode: PracticeMode): void {
    this.context.mode = mode;
    this.notifyListeners();
  }

  // Persistence helpers
  public serialize(): string {
    return JSON.stringify({
      lineIndex: this.context.lineIndex,
      currentCycle: this.context.currentCycle,
      repeatInCycle: this.context.repeatInCycle,
      totalCyclesTarget: this.context.totalCyclesTarget,
      mode: this.context.mode,
      timestamp: Date.now(),
    });
  }

  public static deserialize(
    data: string,
    totalLines: number,
    audioUrlMap: Record<number, string>
  ): NadaMachine | null {
    try {
      const saved = JSON.parse(data);
      // Only restore if within 24 hours
      if (Date.now() - saved.timestamp > 24 * 60 * 60 * 1000) {
        return null;
      }

      return new NadaMachine(totalLines, audioUrlMap, {
        lineIndex: saved.lineIndex,
        currentCycle: saved.currentCycle,
        repeatInCycle: saved.repeatInCycle,
        totalCyclesTarget: saved.totalCyclesTarget,
        mode: saved.mode,
        totalLines,
        transcripts: [],
      });
    } catch {
      return null;
    }
  }

  private notifyListeners(): void {
    const state = this.getState();
    this.listeners.forEach(listener => listener(state));
  }
}
