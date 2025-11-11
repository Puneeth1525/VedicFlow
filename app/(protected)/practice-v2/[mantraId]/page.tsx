'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Play, Square, Pause, Settings, Info } from 'lucide-react';
import Link from 'next/link';
import { useState, useEffect, use } from 'react';
import { useParams } from 'next/navigation';
import { loadMantra } from '@/lib/mantraLoader';
import { MantraData } from '@/lib/types/mantra';
import { useNadaEngine } from '@/hooks/useNadaEngine';
import { MicDock } from '@/components/nada/MicDock';
import { AutoPracticePanel } from '@/components/nada/AutoPracticePanel';
import { useNadaStore, selectMachineState, selectIsActive, selectContext } from '@/lib/nada/store';

export default function PracticeV2Page() {
  const params = useParams();
  const mantraId = params.mantraId as string;

  // Mantra data
  const [mantra, setMantra] = useState<MantraData | null>(null);
  const [isLoadingMantra, setIsLoadingMantra] = useState(true);

  // Settings
  const [showSettings, setShowSettings] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const [cyclesPerLine, setCyclesPerLine] = useState<3 | 5 | 9 | 11>(3);

  // Load mantra data
  useEffect(() => {
    const loadMantraData = async () => {
      try {
        setIsLoadingMantra(true);
        const data = await loadMantra(mantraId);
        setMantra(data);
      } catch (error) {
        console.error('Failed to load mantra:', error);
      } finally {
        setIsLoadingMantra(false);
      }
    };

    loadMantraData();
  }, [mantraId]);

  // Prepare lines for NADA Engine
  const lines = mantra?.paragraphs?.flatMap((p, pIndex) =>
    p.lines.map((line, lIndex) => ({
      id: pIndex * 100 + lIndex,
      audioUrl: mantra.audioUrl || '',
      audioStartTime: line.audioStartTime,
      audioEndTime: line.audioEndTime,
      text: line.sanskrit.map((s) => s.text).join(''),
      english: line.english,
    }))
  ) || [];

  // Initialize NADA Engine
  const engine = useNadaEngine({
    lines,
    mantraId,
    totalCycles: cyclesPerLine,
  });

  // Get state from store
  const machineState = useNadaStore(selectMachineState);
  const isActive = useNadaStore(selectIsActive);
  const context = useNadaStore(selectContext);

  // Handle cycle change
  const handleCycleChange = (cycles: 3 | 5 | 9 | 11) => {
    if (!isActive) {
      setCyclesPerLine(cycles);
      engine.setRepeatCycles(cycles);
    }
  };

  if (isLoadingMantra || !mantra) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-black to-pink-900 flex items-center justify-center">
        <div className="text-white text-xl">Loading mantra...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-black to-pink-900 text-white pb-32">
      <div className="max-w-5xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Link href="/mantras">
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                className="p-2 rounded-full bg-white/5 backdrop-blur-lg border border-white/10 hover:border-purple-400/50 transition-all"
              >
                <ArrowLeft className="w-6 h-6" />
              </motion.button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-400 to-cyan-400 bg-clip-text text-transparent">
                {mantra.title}
              </h1>
              <p className="text-purple-200 text-sm mt-1">NADA Engine • Autonomous Practice</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setShowSettings(!showSettings)}
              className="p-2 rounded-full bg-white/5 backdrop-blur-lg border border-white/10 hover:border-purple-400/50"
            >
              <Settings className="w-6 h-6" />
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setShowInfo(!showInfo)}
              className="p-2 rounded-full bg-white/5 backdrop-blur-lg border border-white/10 hover:border-purple-400/50"
            >
              <Info className="w-6 h-6" />
            </motion.button>
          </div>
        </div>

        {/* Settings Panel */}
        <AnimatePresence>
          {showSettings && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-6 p-6 rounded-2xl bg-white/5 backdrop-blur-sm border border-white/10 overflow-hidden"
            >
              <h3 className="text-lg font-semibold mb-4 text-purple-300">Practice Settings</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-purple-300 mb-2">Cycles per line</label>
                  <div className="flex gap-2">
                    {([3, 5, 9, 11] as const).map((num) => (
                      <button
                        key={num}
                        onClick={() => handleCycleChange(num)}
                        disabled={isActive}
                        className={`px-4 py-2 rounded-lg font-medium transition-all ${
                          cyclesPerLine === num
                            ? 'bg-gradient-to-r from-purple-600 to-cyan-600 text-white'
                            : 'bg-white/10 text-purple-300 hover:bg-white/20'
                        } disabled:opacity-50 disabled:cursor-not-allowed`}
                      >
                        {num}
                      </button>
                    ))}
                  </div>
                  <p className="text-xs text-purple-400 mt-2">
                    Each cycle = 1 app playback + 2 user repeats
                  </p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Info Panel */}
        <AnimatePresence>
          {showInfo && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-6 p-6 rounded-2xl bg-white/5 backdrop-blur-sm border border-white/10 overflow-hidden"
            >
              <h3 className="text-lg font-semibold mb-3 text-purple-300">How NADA Engine Works</h3>
              <ol className="space-y-2 text-sm text-purple-200">
                <li className="flex gap-3">
                  <span className="text-cyan-400 font-bold">1.</span>
                  <span><strong>Shruti</strong> - App plays reference line</span>
                </li>
                <li className="flex gap-3">
                  <span className="text-cyan-400 font-bold">2.</span>
                  <span><strong>Smriti</strong> - You repeat twice (mic auto on/off)</span>
                </li>
                <li className="flex gap-3">
                  <span className="text-cyan-400 font-bold">3.</span>
                  <span>Cycle repeats {cyclesPerLine} times per line</span>
                </li>
                <li className="flex gap-3">
                  <span className="text-cyan-400 font-bold">4.</span>
                  <span>Auto-advance to next line</span>
                </li>
                <li className="flex gap-3">
                  <span className="text-cyan-400 font-bold">5.</span>
                  <span>VAD detects when you finish speaking (no manual stop needed!)</span>
                </li>
              </ol>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Auto Practice Panel */}
        <AutoPracticePanel
          lines={lines.map((line) => ({
            id: line.id,
            text: line.text,
            english: line.english,
          }))}
        />

        {/* Session Controls */}
        <div className="mt-6 flex justify-center gap-4">
          {machineState === 'idle' || machineState === 'section_complete' ? (
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => engine.start(0)}
              disabled={!engine.isReady}
              className="px-8 py-4 rounded-full bg-gradient-to-r from-purple-600 to-cyan-600 hover:from-purple-500 hover:to-cyan-500 font-bold text-lg flex items-center gap-2 disabled:opacity-50"
            >
              <Play className="w-6 h-6" />
              {machineState === 'section_complete' ? 'Practice Again' : 'Start Practice'}
            </motion.button>
          ) : machineState === 'error' ? (
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => engine.start(context.lineIndex)}
              className="px-8 py-4 rounded-full bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-500 hover:to-orange-500 font-bold text-lg flex items-center gap-2"
            >
              <Play className="w-6 h-6" />
              Retry from Line {context.lineIndex + 1}
            </motion.button>
          ) : (
            <>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => engine.pause()}
                className="px-8 py-4 rounded-full bg-yellow-600 hover:bg-yellow-500 font-bold text-lg flex items-center gap-2"
              >
                <Pause className="w-6 h-6" />
                Pause
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => engine.stop()}
                className="px-8 py-4 rounded-full bg-red-600 hover:bg-red-500 font-bold text-lg flex items-center gap-2"
              >
                <Square className="w-6 h-6" />
                Stop
              </motion.button>
            </>
          )}
        </div>

        {/* Resume Hint */}
        {machineState === 'idle' && context.lineIndex > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-4 text-center"
          >
            <button
              onClick={() => engine.start(context.lineIndex)}
              className="text-purple-300 hover:text-white transition-colors text-sm underline"
            >
              Resume from Line {context.lineIndex + 1}
            </button>
          </motion.div>
        )}
      </div>

      {/* Persistent Mic Dock */}
      <MicDock />
    </div>
  );
}
