'use client';

import { useState, useRef, useEffect } from 'react';
import { Mic, Square, Download, BarChart3 } from 'lucide-react';
import { RealtimePitchDetector, type PitchData, classifySwara } from '@/lib/pitchDetection';
import { motion } from 'framer-motion';

type SwaraType = 'anudhaata' | 'udhaata' | 'swarita' | 'dheerga';

export default function TestSwaraPage() {
  const [isRecording, setIsRecording] = useState(false);
  const [currentFrequency, setCurrentFrequency] = useState<number | null>(null);
  const [baseToneHz, setBaseToneHz] = useState<number>(150); // Default base tone
  const [detectedSwara, setDetectedSwara] = useState<SwaraType>('udhaata');
  const [confidence, setConfidence] = useState<number>(0);
  const [semitones, setSemitones] = useState<number>(0);
  const [pitchHistory, setPitchHistory] = useState<number[]>([]);
  const [recordingData, setRecordingData] = useState<PitchData[]>([]);

  const pitchDetectorRef = useRef<RealtimePitchDetector | null>(null);
  const pitchHistoryRef = useRef<number[]>([]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (pitchDetectorRef.current) {
        pitchDetectorRef.current.stop();
      }
    };
  }, []);

  const startRecording = async () => {
    try {
      // Reset data
      pitchHistoryRef.current = [];
      setPitchHistory([]);
      setRecordingData([]);
      setCurrentFrequency(null);

      // Create new pitch detector
      const detector = new RealtimePitchDetector();
      pitchDetectorRef.current = detector;

      // Start pitch detection with real-time callback
      await detector.start((frequency, clarity) => {
        // Always update display
        setCurrentFrequency(frequency);

        // Only process if we have valid frequency
        if (frequency > 0) {
          // Calculate semitones from base
          const semitonesFromBase = 12 * Math.log2(frequency / baseToneHz);
          setSemitones(semitonesFromBase);

          // Update pitch history for swara classification
          pitchHistoryRef.current = [...pitchHistoryRef.current.slice(-10), frequency];
          setPitchHistory(pitchHistoryRef.current);

          // Classify swara
          const { swara, confidence: conf } = classifySwara(
            frequency,
            baseToneHz,
            pitchHistoryRef.current
          );
          setDetectedSwara(swara);
          setConfidence(conf);

          // Store data for export
          setRecordingData(prev => [...prev, {
            frequency,
            clarity,
            timestamp: Date.now()
          }]);
        } else {
          // Reset to defaults when silent
          setSemitones(0);
          setConfidence(0);
        }
      });

      setIsRecording(true);
    } catch (error) {
      console.error('Error starting recording:', error);
      alert('Failed to start recording. Please ensure microphone permissions are granted.');
    }
  };

  const stopRecording = () => {
    if (pitchDetectorRef.current) {
      pitchDetectorRef.current.stop();
      setIsRecording(false);
    }
  };

  const exportData = () => {
    const dataWithSwaras = recordingData.map(d => ({
      frequency: d.frequency,
      semitones: 12 * Math.log2(d.frequency / baseToneHz),
      timestamp: d.timestamp,
      swara: classifySwara(d.frequency, baseToneHz).swara
    }));

    const blob = new Blob([JSON.stringify(dataWithSwaras, null, 2)], {
      type: 'application/json'
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `swara-test-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getSwaraColor = (swara: SwaraType) => {
    switch (swara) {
      case 'anudhaata': return 'bg-blue-500';
      case 'udhaata': return 'bg-green-500';
      case 'swarita': return 'bg-orange-500';
      case 'dheerga': return 'bg-red-500';
    }
  };

  const getSwaraLabel = (swara: SwaraType) => {
    switch (swara) {
      case 'anudhaata': return 'Anudātta (Low)';
      case 'udhaata': return 'Udātta (Base)';
      case 'swarita': return 'Swarita (High)';
      case 'dheerga': return 'Dīrgha (Very High)';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-900 text-white pb-20">
      <div className="max-w-2xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Swara Testing Lab</h1>
          <p className="text-purple-300">Test and calibrate swara detection thresholds</p>
        </div>

        {/* Base Tone Configuration */}
        <div className="mb-6 p-6 rounded-xl bg-white/5 border border-white/10">
          <label className="block text-sm font-medium mb-3">Base Tone (Udātta) - Hz</label>
          <input
            type="number"
            value={baseToneHz}
            onChange={(e) => setBaseToneHz(Number(e.target.value))}
            disabled={isRecording}
            className="w-full px-4 py-2 rounded-lg bg-white/10 border border-white/20 text-white disabled:opacity-50"
            step="0.1"
          />
          <p className="text-xs text-purple-300 mt-2">
            Set your base tone from onboarding, or use a default value
          </p>
        </div>

        {/* Current Detection Display */}
        {isRecording && (
          <div className="mb-6 space-y-4">
            {/* Frequency Display */}
            <div className="p-6 rounded-xl bg-cyan-500/20 border border-cyan-500/30">
              <div className="text-sm text-cyan-300 mb-2">Current Frequency</div>
              <div className="text-4xl font-bold text-cyan-100">
                {currentFrequency !== null ? currentFrequency.toFixed(2) : '0.00'} Hz
              </div>
              <div className="text-sm text-cyan-300 mt-2">
                {semitones >= 0 ? '+' : ''}{semitones.toFixed(2)} semitones from base
              </div>
            </div>

            {/* Swara Detection */}
            <div className={`p-6 rounded-xl border ${getSwaraColor(detectedSwara)}/20 border-${getSwaraColor(detectedSwara).replace('bg-', '')}/30`}>
              <div className="flex items-center justify-between mb-3">
                <div className="text-sm text-white/70">Detected Swara</div>
                <div className="text-sm text-white/70">{confidence.toFixed(0)}% confidence</div>
              </div>
              <div className="text-3xl font-bold">
                {getSwaraLabel(detectedSwara)}
              </div>
            </div>

            {/* Visual Pitch Meter */}
            <div className="p-6 rounded-xl bg-white/5 border border-white/10">
              <div className="text-sm text-white/70 mb-4">Pitch Position</div>
              <div className="relative h-8 bg-gradient-to-r from-blue-500 via-green-500 via-orange-500 to-red-500 rounded-full overflow-hidden">
                <motion.div
                  className="absolute top-0 bottom-0 w-1 bg-white shadow-lg"
                  animate={{
                    left: `${Math.max(0, Math.min(100, ((semitones + 3) / 6) * 100))}%`
                  }}
                  transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                />
              </div>
              <div className="flex justify-between text-xs text-white/50 mt-2">
                <span>-3 st</span>
                <span>0 st</span>
                <span>+3 st</span>
              </div>
            </div>

            {/* Detailed Stats */}
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 rounded-lg bg-white/5 border border-white/10">
                <div className="text-xs text-white/50 mb-1">Ratio</div>
                <div className="text-lg font-semibold">
                  {currentFrequency !== null ? (currentFrequency / baseToneHz).toFixed(3) : '0.000'}x
                </div>
              </div>
              <div className="p-4 rounded-lg bg-white/5 border border-white/10">
                <div className="text-xs text-white/50 mb-1">Samples</div>
                <div className="text-lg font-semibold">
                  {recordingData.length}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Control Buttons */}
        <div className="flex gap-4 mb-6">
          {!isRecording ? (
            <button
              onClick={startRecording}
              className="flex-1 flex items-center justify-center gap-2 px-6 py-4 rounded-xl bg-gradient-to-r from-purple-500 to-cyan-500 hover:from-purple-600 hover:to-cyan-600 transition-all font-semibold"
            >
              <Mic className="w-5 h-5" />
              Start Testing
            </button>
          ) : (
            <button
              onClick={stopRecording}
              className="flex-1 flex items-center justify-center gap-2 px-6 py-4 rounded-xl bg-red-500 hover:bg-red-600 transition-all font-semibold"
            >
              <Square className="w-5 h-5" />
              Stop Recording
            </button>
          )}

          {recordingData.length > 0 && (
            <button
              onClick={exportData}
              className="flex items-center justify-center gap-2 px-6 py-4 rounded-xl bg-white/10 hover:bg-white/20 transition-all border border-white/20"
            >
              <Download className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Pitch History Visualization */}
        {pitchHistory.length > 0 && (
          <div className="p-6 rounded-xl bg-white/5 border border-white/10">
            <div className="flex items-center gap-2 mb-4">
              <BarChart3 className="w-5 h-5 text-purple-400" />
              <h3 className="font-semibold">Recent Pitch History</h3>
            </div>
            <div className="flex items-end justify-between h-32 gap-1">
              {pitchHistory.slice(-20).map((freq, idx) => {
                const semitonesOffset = 12 * Math.log2(freq / baseToneHz);
                const height = Math.max(10, Math.min(100, 50 + semitonesOffset * 10));

                let color = 'bg-green-400';
                if (semitonesOffset < -1.5) color = 'bg-blue-400';
                else if (semitonesOffset > 3) color = 'bg-red-400';
                else if (semitonesOffset > 1.5) color = 'bg-orange-400';

                return (
                  <div
                    key={idx}
                    className={`flex-1 ${color} rounded-t transition-all`}
                    style={{ height: `${height}%` }}
                  />
                );
              })}
            </div>
          </div>
        )}

        {/* Threshold Guidelines */}
        <div className="mt-6 p-6 rounded-xl bg-purple-500/10 border border-purple-500/30">
          <h3 className="font-semibold mb-3">Current Detection Thresholds</h3>
          <div className="space-y-2 text-sm text-purple-200">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-blue-500" />
                Anudātta (Low)
              </span>
              <span className="font-mono">&lt; -1.5 semitones</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-green-500" />
                Udātta (Base)
              </span>
              <span className="font-mono">-1.5 to +1.5 semitones</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-orange-500" />
                Swarita (High)
              </span>
              <span className="font-mono">+1.5 to +3 semitones</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-red-500" />
                Dīrgha (Very High)
              </span>
              <span className="font-mono">&gt; +3 semitones</span>
            </div>
          </div>
        </div>

        {/* Instructions */}
        <div className="mt-6 p-6 rounded-xl bg-cyan-500/10 border border-cyan-500/30">
          <h3 className="font-semibold mb-3">How to Use</h3>
          <ol className="space-y-2 text-sm text-cyan-200">
            <li>1. Set your base tone from your onboarding calibration</li>
            <li>2. Click &quot;Start Testing&quot; and chant at different pitches</li>
            <li>3. Try going low (anudātta), staying at base (udātta), going high (swarita), and very high (dīrgha)</li>
            <li>4. Watch the real-time frequency, semitone offset, and swara detection</li>
            <li>5. Export the data to analyze the patterns and adjust thresholds if needed</li>
          </ol>
        </div>
      </div>
    </div>
  );
}
