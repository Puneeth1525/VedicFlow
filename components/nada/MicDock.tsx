/**
 * NADA Engine Persistent Mic Dock
 * Fixed floating mic control that stays above the navbar
 */

'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Mic, Volume2 } from 'lucide-react';
import { useNadaStore, selectIsRecording, selectVadActive, selectMachineState } from '@/lib/nada/store';

export function MicDock() {
  const machineState = useNadaStore(selectMachineState);
  const isRecording = useNadaStore(selectIsRecording);
  const vadActive = useNadaStore(selectVadActive);

  // Get state badge info
  const getStateBadge = () => {
    switch (machineState) {
      case 'app_play':
        return {
          text: 'App Chanting...',
          color: 'from-cyan-500 to-blue-500',
          textColor: 'text-cyan-300',
          glowColor: 'cyan',
        };
      case 'user_repeat_1':
        return {
          text: 'Your Turn 1/2',
          color: 'from-pink-500 to-orange-500',
          textColor: 'text-orange-300',
          glowColor: 'orange',
        };
      case 'user_repeat_2':
        return {
          text: 'Your Turn 2/2',
          color: 'from-pink-500 to-orange-500',
          textColor: 'text-orange-300',
          glowColor: 'orange',
        };
      case 'repeat_cycle_check':
      case 'advance_line':
        return {
          text: 'Analyzing...',
          color: 'from-purple-500 to-violet-500',
          textColor: 'text-violet-300',
          glowColor: 'violet',
        };
      case 'section_complete':
        return {
          text: 'Practice Complete!',
          color: 'from-green-500 to-emerald-500',
          textColor: 'text-green-300',
          glowColor: 'green',
        };
      case 'error':
        return {
          text: 'Error - Retry',
          color: 'from-red-500 to-rose-500',
          textColor: 'text-red-300',
          glowColor: 'red',
        };
      default:
        return {
          text: 'Ready',
          color: 'from-purple-500 to-pink-500',
          textColor: 'text-purple-300',
          glowColor: 'purple',
        };
    }
  };

  const badge = getStateBadge();
  const isActive =
    machineState !== 'idle' &&
    machineState !== 'section_complete' &&
    machineState !== 'error';

  if (!isActive && machineState === 'idle') {
    return null; // Hide when idle
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 100, opacity: 0 }}
        className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50"
      >
        {/* Main Dock Container */}
        <div
          className="relative px-8 py-4 rounded-full backdrop-blur-xl border-2 border-white/20 shadow-2xl"
          style={{
            background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.9) 0%, rgba(236, 72, 153, 0.9) 100%)',
          }}
        >
          {/* Glow Effect */}
          <motion.div
            className="absolute inset-0 rounded-full opacity-50 blur-xl"
            style={{
              background: `radial-gradient(circle, rgba(${
                badge.glowColor === 'cyan'
                  ? '6, 182, 212'
                  : badge.glowColor === 'orange'
                  ? '249, 115, 22'
                  : badge.glowColor === 'violet'
                  ? '139, 92, 246'
                  : badge.glowColor === 'green'
                  ? '16, 185, 129'
                  : badge.glowColor === 'red'
                  ? '239, 68, 68'
                  : '168, 85, 247'
              }, 0.6) 0%, transparent 70%)`,
            }}
            animate={
              isRecording || machineState === 'app_play'
                ? { scale: [1, 1.2, 1], opacity: [0.3, 0.6, 0.3] }
                : {}
            }
            transition={
              isRecording || machineState === 'app_play'
                ? { duration: 2, repeat: Infinity, ease: 'easeInOut' }
                : {}
            }
          />

          {/* Content */}
          <div className="relative flex items-center gap-6">
            {/* Mic Icon with VAD indicator */}
            <div className="relative">
              <motion.div
                animate={
                  isRecording
                    ? { scale: [1, 1.1, 1] }
                    : {}
                }
                transition={
                  isRecording
                    ? { duration: 1, repeat: Infinity, ease: 'easeInOut' }
                    : {}
                }
                className={`w-12 h-12 rounded-full flex items-center justify-center ${
                  isRecording ? 'bg-red-500' : 'bg-white/20'
                }`}
              >
                <Mic className="w-6 h-6 text-white" />
              </motion.div>

              {/* VAD Ring */}
              {vadActive && (
                <motion.div
                  initial={{ scale: 1, opacity: 0.8 }}
                  animate={{ scale: 1.5, opacity: 0 }}
                  transition={{ duration: 1, repeat: Infinity }}
                  className="absolute inset-0 rounded-full border-4 border-red-400"
                />
              )}
            </div>

            {/* State Badge */}
            <div className="flex flex-col gap-1">
              <motion.div
                key={badge.text}
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className={`px-4 py-2 rounded-full bg-gradient-to-r ${badge.color}`}
              >
                <span className="text-white font-bold text-sm">{badge.text}</span>
              </motion.div>

              {/* Recording Indicator */}
              {isRecording && (
                <div className="flex items-center gap-2 px-2">
                  <motion.div
                    animate={{ scale: [1, 1.2, 1], opacity: [1, 0.5, 1] }}
                    transition={{ duration: 1, repeat: Infinity }}
                    className="w-2 h-2 rounded-full bg-red-500"
                  />
                  <span className="text-xs text-white/80">Listening...</span>
                </div>
              )}
            </div>

            {/* Audio Visualization */}
            <div className="flex items-center gap-2">
              <Volume2 className="w-5 h-5 text-white/60" />
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((i) => (
                  <motion.div
                    key={i}
                    animate={
                      isRecording || machineState === 'app_play'
                        ? {
                            height: [8, 16, 8],
                            opacity: [0.3, 1, 0.3],
                          }
                        : { height: 8, opacity: 0.3 }
                    }
                    transition={
                      isRecording || machineState === 'app_play'
                        ? {
                            duration: 0.8,
                            repeat: Infinity,
                            delay: i * 0.1,
                            ease: 'easeInOut',
                          }
                        : {}
                    }
                    className="w-1 bg-white/80 rounded-full"
                    style={{ height: 8 }}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
