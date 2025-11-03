'use client';

import { useState, useRef, useEffect } from 'react';
import { Mic, Square, ArrowLeft, Play, Pause, CheckCircle, XCircle } from 'lucide-react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  analyzeSwaras,
  type AnalysisResult,
  type SwaraType
} from '@/lib/swaraAnalyzerV2';
import ganeshaGayatriData from '@/data/mantras/ganesha-gayatri.json';

// Extract canonical syllables from mantra data
interface CanonicalSyllable {
  text: string;
  swara: SwaraType;
  romanization: string;
}

// Flatten all syllables from the mantra
const getCanonicalSyllables = (): CanonicalSyllable[] => {
  const syllables: CanonicalSyllable[] = [];
  ganeshaGayatriData.paragraphs.forEach(para => {
    para.lines.forEach(line => {
      line.sanskrit.forEach(syl => {
        syllables.push({
          text: syl.text,
          swara: syl.swara as SwaraType,
          romanization: syl.romanization
        });
      });
    });
  });
  return syllables;
};

export default function SwaraAnalysisV2Page() {
  const [isRecording, setIsRecording] = useState(false);
  const [_audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [canonicalSyllables, setCanonicalSyllables] = useState<CanonicalSyllable[]>([]);
  const [matchResults, setMatchResults] = useState<Array<{
    index: number;
    detected: SwaraType;
    canonical: SwaraType;
    match: boolean;
  }>>([]);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    // Load canonical syllables on mount
    setCanonicalSyllables(getCanonicalSyllables());
  }, []);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        setAudioBlob(blob);
        const url = URL.createObjectURL(blob);
        setAudioUrl(url);

        // Stop all tracks
        stream.getTracks().forEach(track => track.stop());

        // Auto-analyze
        await analyzeAudio(blob);
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (error) {
      console.error('Error starting recording:', error);
      alert('Could not access microphone');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const analyzeAudio = async (blob: Blob) => {
    setIsAnalyzing(true);
    try {
      // Convert blob to ArrayBuffer
      const arrayBuffer = await blob.arrayBuffer();

      // Create audio context and decode
      if (!audioContextRef.current) {
        audioContextRef.current = new AudioContext();
      }
      const audioBuffer = await audioContextRef.current.decodeAudioData(arrayBuffer);

      // Get syllable texts and canonical swaras for analysis
      const syllableTexts = canonicalSyllables.map(s => s.text);
      const canonicalSwaraSeq = canonicalSyllables.map(s => s.swara as SwaraType);

      // Analyze with canonical context
      const result = await analyzeSwaras(audioBuffer, syllableTexts, canonicalSwaraSeq);
      setAnalysisResult(result);

      // Compare detected vs canonical using canonicalIndex
      // Use corrected swara and isAcceptable for tolerance-based grading
      const matches = result.syllables
        .filter(detected => detected.gradable) // Only count gradable syllables
        .map((detected) => {
          const canonical = canonicalSyllables[detected.canonicalIndex];

          return {
            index: detected.canonicalIndex,
            detected: detected.detectedSwaraCorrected,
            canonical: canonical.swara as SwaraType,
            match: detected.isAcceptable
          };
        });
      setMatchResults(matches);
    } catch (error) {
      console.error('Error analyzing audio:', error);
      alert('Error analyzing audio');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const togglePlayback = () => {
    if (!audioRef.current || !audioUrl) return;

    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play();
      setIsPlaying(true);
    }
  };

  const getSwaraColor = (swara: SwaraType, match?: boolean): string => {
    const matchClass = match === false ? 'ring-2 ring-red-500' : '';
    switch (swara) {
      case 'udhaatha':
        return `bg-blue-500/20 text-blue-300 border-blue-400/30 ${matchClass}`;
      case 'anudhaatha':
        return `bg-purple-500/20 text-purple-300 border-purple-400/30 ${matchClass}`;
      case 'swarita':
        return `bg-green-500/20 text-green-300 border-green-400/30 ${matchClass}`;
      case 'dheerga':
        return `bg-orange-500/20 text-orange-300 border-orange-400/30 ${matchClass}`;
    }
  };

  const getSwaraLabel = (swara: SwaraType): string => {
    switch (swara) {
      case 'udhaatha':
        return 'Udātta';
      case 'anudhaatha':
        return 'Anudātta';
      case 'swarita':
        return 'Svarita';
      case 'dheerga':
        return 'Dīrgha';
    }
  };

  const accuracyScore = matchResults.length > 0
    ? (matchResults.filter(m => m.match).length / matchResults.length) * 100
    : 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-900 text-white p-8">
      {/* Hidden audio element for playback */}
      {audioUrl && (
        <audio
          ref={audioRef}
          src={audioUrl}
          onEnded={() => setIsPlaying(false)}
          className="hidden"
        />
      )}

      {/* Header */}
      <div className="max-w-6xl mx-auto mb-8">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 text-purple-300 hover:text-purple-200 transition-colors mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Dashboard
        </Link>

        <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-400 to-cyan-400 bg-clip-text text-transparent mb-2">
          Swara Analysis V2
        </h1>
        <p className="text-purple-200 mb-4">
          Contour-based syllable analysis - Testing with Ganesha Gayatri
        </p>

        {/* Mantra Reference */}
        <div className="p-4 rounded-xl bg-white/5 backdrop-blur-lg border border-white/10">
          <h2 className="text-lg font-semibold mb-2">Reference Mantra: {ganeshaGayatriData.title}</h2>
          <div className="text-purple-200 text-sm space-y-1">
            {ganeshaGayatriData.paragraphs.map((para, pIndex) => (
              <div key={pIndex}>
                {para.lines.map((line, lIndex) => (
                  <div key={lIndex} className="flex flex-wrap gap-2 py-1">
                    {line.sanskrit.map((syl, sIndex) => (
                      <span
                        key={sIndex}
                        className={`px-2 py-1 rounded text-xs ${getSwaraColor(syl.swara as SwaraType)}`}
                      >
                        {syl.text}
                      </span>
                    ))}
                  </div>
                ))}
              </div>
            ))}
          </div>
          <div className="mt-3 text-xs text-purple-300">
            Total syllables: {canonicalSyllables.length}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto">
        {/* Recording Controls */}
        <div className="mb-8 p-6 rounded-2xl bg-white/5 backdrop-blur-lg border border-white/10">
          <h2 className="text-xl font-semibold mb-4">Record Your Chant</h2>

          <div className="flex items-center gap-4">
            {!isRecording ? (
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={startRecording}
                className="flex items-center gap-2 px-6 py-3 rounded-lg bg-gradient-to-r from-purple-600 to-cyan-600 text-white font-medium"
              >
                <Mic className="w-5 h-5" />
                Start Recording
              </motion.button>
            ) : (
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={stopRecording}
                className="flex items-center gap-2 px-6 py-3 rounded-lg bg-red-600 text-white font-medium animate-pulse"
              >
                <Square className="w-5 h-5" />
                Stop Recording
              </motion.button>
            )}

            {audioUrl && (
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={togglePlayback}
                className="flex items-center gap-2 px-6 py-3 rounded-lg bg-white/10 hover:bg-white/20 text-white font-medium transition-colors"
              >
                {isPlaying ? (
                  <>
                    <Pause className="w-5 h-5" />
                    Pause
                  </>
                ) : (
                  <>
                    <Play className="w-5 h-5" />
                    Play
                  </>
                )}
              </motion.button>
            )}
          </div>
        </div>

        {/* Analysis Loading */}
        {isAnalyzing && (
          <div className="mb-8 p-6 rounded-2xl bg-white/5 backdrop-blur-lg border border-white/10 text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-purple-400 mb-4"></div>
            <p className="text-purple-200">Analyzing your chant...</p>
          </div>
        )}

        {/* Analysis Results */}
        <AnimatePresence>
          {analysisResult && !isAnalyzing && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              {/* Overall Metrics */}
              <div className="p-6 rounded-2xl bg-white/5 backdrop-blur-lg border border-white/10">
                <h2 className="text-xl font-semibold mb-4">Overall Metrics</h2>
                <div className="grid grid-cols-4 gap-4">
                  <div>
                    <div className="text-sm text-purple-300 mb-1">Accuracy</div>
                    <div className={`text-3xl font-bold ${accuracyScore >= 70 ? 'text-green-400' : 'text-orange-400'}`}>
                      {Math.round(accuracyScore)}%
                    </div>
                    <div className="text-xs text-purple-300">
                      {matchResults.filter(m => m.match).length} / {matchResults.length} correct
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-purple-300 mb-1">Quality Score</div>
                    <div className="text-2xl font-bold text-blue-400">
                      {Math.round(analysisResult.overallQuality * 100)}%
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-purple-300 mb-1">Average Baseline</div>
                    <div className="text-2xl font-bold text-cyan-400">
                      {Math.round(analysisResult.averageBaseline_hz)} Hz
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-purple-300 mb-1">Pitch Drift</div>
                    <div className="text-2xl font-bold text-orange-400">
                      {analysisResult.driftAmount_st.toFixed(2)} st
                    </div>
                  </div>
                </div>
              </div>

              {/* Syllable Comparison */}
              <div className="p-6 rounded-2xl bg-white/5 backdrop-blur-lg border border-white/10">
                <h2 className="text-xl font-semibold mb-4">
                  Syllable Analysis & Comparison
                </h2>

                <div className="space-y-4">
                  {analysisResult.syllables.map((syllable, index) => {
                    const canonical = canonicalSyllables[syllable.canonicalIndex];
                    const matchInfo = matchResults.find(m => m.index === syllable.canonicalIndex);
                    const isMatch = syllable.gradable ? (matchInfo?.match ?? false) : true; // Don't penalize non-gradable

                    return (
                      <motion.div
                        key={syllable.canonicalIndex}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className={`p-4 rounded-xl border ${getSwaraColor(syllable.detectedSwaraCorrected, syllable.gradable ? isMatch : undefined)}`}
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <div className="text-2xl font-bold">
                                {canonical?.text || syllable.syllableText}
                              </div>
                              {canonical && (
                                <div className="text-sm text-purple-300">
                                  ({canonical.romanization})
                                </div>
                              )}
                              {!syllable.gradable ? (
                                <div className="text-xs text-yellow-400 opacity-70">
                                  ⚠ Too short/noisy
                                </div>
                              ) : isMatch ? (
                                <CheckCircle className="w-5 h-5 text-green-400" />
                              ) : (
                                <XCircle className="w-5 h-5 text-red-400" />
                              )}
                            </div>
                            <div className="text-xs opacity-70">
                              {syllable.startTime.toFixed(2)}s - {syllable.endTime.toFixed(2)}s
                            </div>
                          </div>

                          <div className="text-right">
                            <div className="text-sm font-semibold mb-2">
                              Detected: {getSwaraLabel(syllable.detectedSwaraCorrected)}
                            </div>
                            {canonical && (
                              <div className="text-sm opacity-80">
                                Expected: {getSwaraLabel(canonical.swara as SwaraType)}
                              </div>
                            )}
                            <div className="text-xs mt-1 opacity-70">
                              Confidence: {Math.round(syllable.confidence * 100)}%
                            </div>
                            {syllable.detectedSwara !== syllable.detectedSwaraCorrected && (
                              <div className="text-xs mt-1 text-cyan-400">
                                (Snapped from {getSwaraLabel(syllable.detectedSwara)})
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Feature Grid */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                          <div className="p-2 rounded bg-black/20">
                            <div className="text-xs opacity-70 mb-1">Start Pitch</div>
                            <div className="font-semibold">
                              {Math.round(syllable.f0_start_hz)} Hz
                            </div>
                            <div className="text-xs opacity-70">
                              Δ {syllable.delta_start > 0 ? '+' : ''}{syllable.delta_start.toFixed(2)} st
                            </div>
                          </div>

                          <div className="p-2 rounded bg-black/20">
                            <div className="text-xs opacity-70 mb-1">End Pitch</div>
                            <div className="font-semibold">
                              {Math.round(syllable.f0_end_hz)} Hz
                            </div>
                            <div className="text-xs opacity-70">
                              Δ {syllable.delta_end > 0 ? '+' : ''}{syllable.delta_end.toFixed(2)} st
                            </div>
                          </div>

                          <div className="p-2 rounded bg-black/20">
                            <div className="text-xs opacity-70 mb-1">Slope</div>
                            <div className="font-semibold">
                              {syllable.slope_st_per_sec > 0 ? '↗' : syllable.slope_st_per_sec < -0.5 ? '↘' : '→'}
                              {' '}{Math.abs(syllable.slope_st_per_sec).toFixed(1)} st/s
                            </div>
                            <div className="text-xs opacity-70">
                              {syllable.slope_st_per_sec > 1 ? 'Rising' : syllable.slope_st_per_sec < -1 ? 'Falling' : 'Flat'}
                            </div>
                          </div>

                          <div className="p-2 rounded bg-black/20">
                            <div className="text-xs opacity-70 mb-1">Duration</div>
                            <div className="font-semibold">
                              {Math.round(syllable.duration_ms)} ms
                            </div>
                            <div className="text-xs opacity-70">
                              Voiced: {Math.round(syllable.voicedRatio * 100)}%
                            </div>
                          </div>
                        </div>

                        {/* Match/Mismatch indicator */}
                        {syllable.gradable && !isMatch && canonical && (
                          <div className="mt-3 pt-3 border-t border-red-500/30 text-sm text-red-300">
                            ❌ Mismatch: Expected {getSwaraLabel(canonical.swara as SwaraType)},
                            got {getSwaraLabel(syllable.detectedSwaraCorrected)}
                          </div>
                        )}
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
