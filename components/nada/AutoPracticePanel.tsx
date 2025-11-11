/**
 * NADA Engine Auto Practice Panel
 * Displays current line, next line preview, and live transcript
 */

'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useNadaStore, selectContext, selectProgress, selectLiveTranscript, selectIsRecording } from '@/lib/nada/store';

interface Line {
  id: number;
  text: string;
  english?: string;
}

interface AutoPracticePanelProps {
  lines: Line[];
}

export function AutoPracticePanel({ lines }: AutoPracticePanelProps) {
  const context = useNadaStore(selectContext);
  const progress = useNadaStore(selectProgress);
  const liveTranscript = useNadaStore(selectLiveTranscript);
  const isRecording = useNadaStore(selectIsRecording);

  const currentLine = lines[context.lineIndex];
  const nextLine = context.lineIndex < lines.length - 1 ? lines[context.lineIndex + 1] : null;

  return (
    <div className="space-y-6">
      {/* Progress Indicator */}
      <div className="p-4 rounded-2xl bg-white/5 backdrop-blur-sm border border-white/10">
        <div className="flex items-center justify-between text-sm mb-2">
          <span className="text-purple-300">
            Line {context.lineIndex + 1} / {progress.totalLines}
          </span>
          <span className="text-cyan-300">
            Cycle {context.currentCycle} / {progress.totalCycles}
          </span>
        </div>
        <div className="h-2 bg-white/10 rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-purple-500 via-pink-500 to-cyan-500"
            initial={{ width: 0 }}
            animate={{ width: `${progress.percentage}%` }}
            transition={{ duration: 0.5 }}
          />
        </div>
      </div>

      {/* Current Line - Large and glowing */}
      <motion.div
        key={`current-${context.lineIndex}`}
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="p-8 rounded-2xl border-2 shadow-lg"
        style={{
          background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.2) 0%, rgba(6, 182, 212, 0.2) 100%)',
          borderColor: 'rgba(139, 92, 246, 0.5)',
          boxShadow: '0 0 30px rgba(139, 92, 246, 0.3)',
        }}
      >
        <p className="text-sm text-purple-400 mb-3">Current Line</p>
        <div className="space-y-3">
          <div className="text-4xl font-bold text-white leading-relaxed">
            {currentLine?.text || 'Loading...'}
          </div>
          {currentLine?.english && (
            <div className="text-xl text-purple-300">{currentLine.english}</div>
          )}
        </div>

        {/* Repeat Indicators */}
        <div className="mt-6 flex gap-2">
          {[1, 2].map((repeatNum) => (
            <div
              key={repeatNum}
              className={`flex-1 py-2 rounded-lg text-center text-sm font-medium transition-all ${
                context.repeatInCycle === repeatNum
                  ? 'bg-gradient-to-r from-pink-500 to-orange-500 text-white'
                  : context.repeatInCycle > repeatNum
                  ? 'bg-green-500/30 text-green-300 border border-green-400/30'
                  : 'bg-white/10 text-white/40'
              }`}
            >
              Repeat {repeatNum}
              {context.repeatInCycle === repeatNum && isRecording && (
                <motion.span
                  animate={{ opacity: [1, 0.5, 1] }}
                  transition={{ duration: 1, repeat: Infinity }}
                  className="ml-2"
                >
                  •
                </motion.span>
              )}
            </div>
          ))}
        </div>
      </motion.div>

      {/* Live Transcript */}
      <AnimatePresence>
        {(isRecording || liveTranscript) && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="p-6 rounded-2xl backdrop-blur-lg border"
            style={{
              background: 'linear-gradient(135deg, rgba(6, 182, 212, 0.1) 0%, rgba(139, 92, 246, 0.1) 100%)',
              borderColor: 'rgba(6, 182, 212, 0.3)',
            }}
          >
            <div className="flex items-center gap-2 mb-3">
              <motion.div
                animate={{ scale: [1, 1.2, 1], opacity: [1, 0.5, 1] }}
                transition={{ duration: 1, repeat: Infinity }}
                className="w-2 h-2 rounded-full bg-cyan-400"
              />
              <h3 className="text-sm font-semibold text-cyan-300">Live Transcription</h3>
            </div>
            <p className="text-white text-lg font-medium min-h-[28px]">
              {liveTranscript || 'Listening...'}
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Cycle Results */}
      {context.transcripts.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-6 rounded-2xl bg-white/5 backdrop-blur-sm border border-white/10"
        >
          <h3 className="text-sm font-semibold text-purple-300 mb-3">
            Cycle {context.currentCycle} Results
          </h3>
          <div className="space-y-2">
            {context.transcripts.map((transcript, index) => (
              <div key={index} className="flex items-start gap-3">
                <span className="text-pink-400 font-medium text-sm">Repeat {index + 1}:</span>
                <span className="text-white flex-1">{transcript}</span>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Next Line Preview - Faded */}
      {nextLine && (
        <motion.div
          key={`next-${context.lineIndex + 1}`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.4 }}
          className="p-4 rounded-xl bg-white/5 border border-white/10"
        >
          <p className="text-xs text-purple-400 mb-2">Next Line</p>
          <div className="space-y-1">
            <div className="text-xl font-medium text-white">{nextLine.text}</div>
            {nextLine.english && <div className="text-sm text-purple-300">{nextLine.english}</div>}
          </div>
        </motion.div>
      )}
    </div>
  );
}
