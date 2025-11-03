'use client';

import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, ArrowRight, X, RotateCcw } from 'lucide-react';
import {
  analyzeWordPronunciation,
  initializeWordProgress,
  updateWordProgress,
  canMoveToNextWord,
  getCompletionPercentage,
  WordProgress,
  WordPronunciationResult,
} from '@/lib/wordPronunciationAnalyzer';

interface Word {
  text: string;
  romanization: string;
}

interface WordByWordPracticeProps {
  words: Word[];
  lineAudioUrl?: string;
  onComplete: () => void;
  onExit: () => void;
}

export default function WordByWordPractice({
  words,
  lineAudioUrl,
  onComplete,
  onExit,
}: WordByWordPracticeProps) {
  const [wordProgress, setWordProgress] = useState<WordProgress[]>(() =>
    initializeWordProgress(words)
  );
  const [currentWordIndex, setCurrentWordIndex] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [currentResult, setCurrentResult] = useState<WordPronunciationResult | null>(null);
  const [showResult, setShowResult] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const currentWord = words[currentWordIndex];
  const currentProgress = wordProgress[currentWordIndex];
  const maxAttempts = 5;
  const attempts = currentProgress.attempts.length;
  const canProgress = canMoveToNextWord(currentProgress, maxAttempts);

  // Particle animation
  const particles = Array.from({ length: 20 }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    y: Math.random() * 100,
    delay: Math.random() * 2,
    duration: 3 + Math.random() * 2,
  }));

  // Start recording
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });

        await analyzeRecording(audioBlob);

        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setShowResult(false);
      setCurrentResult(null);
    } catch (error) {
      console.error('Error starting recording:', error);
      alert('Could not access microphone');
    }
  };

  // Stop recording
  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  // Analyze the recording
  const analyzeRecording = async (audioBlob: Blob) => {
    setIsAnalyzing(true);

    try {
      const result = await analyzeWordPronunciation(
        audioBlob,
        currentWord.text,
        currentWord.romanization
      );

      setCurrentResult(result);
      setShowResult(true);

      // Update progress
      const newProgress = updateWordProgress(wordProgress, currentWordIndex, result);
      setWordProgress(newProgress);

    } catch (error) {
      console.error('Error analyzing pronunciation:', error);
      alert('Error analyzing pronunciation. Please try again.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Move to next word
  const moveToNextWord = () => {
    if (currentWordIndex < words.length - 1) {
      setCurrentWordIndex(currentWordIndex + 1);
      setShowResult(false);
      setCurrentResult(null);
    } else {
      // All words completed
      onComplete();
    }
  };

  // Get syllable color class
  const getSyllableColorClass = (color: 'green' | 'yellow' | 'red') => {
    switch (color) {
      case 'green':
        return 'text-green-400';
      case 'yellow':
        return 'text-yellow-400';
      case 'red':
        return 'text-red-400';
    }
  };

  const completionPercentage = getCompletionPercentage(wordProgress);

  return (
    <div className="fixed inset-0 z-[9999] bg-slate-950 flex flex-col">
      {/* Animated Particles Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {particles.map((particle) => (
          <motion.div
            key={particle.id}
            className="absolute w-2 h-2 rounded-full"
            style={{
              left: `${particle.x}%`,
              top: `${particle.y}%`,
              background: currentResult?.passed
                ? 'linear-gradient(135deg, #10b981, #34d399)'
                : 'linear-gradient(135deg, #8b5cf6, #a78bfa)',
            }}
            animate={{
              y: [0, -100, 0],
              opacity: [0, 1, 0],
              scale: [0, 1, 0],
            }}
            transition={{
              duration: particle.duration,
              repeat: Infinity,
              delay: particle.delay,
            }}
          />
        ))}
      </div>

      {/* Header */}
      <div className="relative z-10 flex items-center justify-between p-4">
        <button
          onClick={onExit}
          className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
        >
          <X className="w-6 h-6 text-white" />
        </button>

        {/* Progress Bar */}
        <div className="flex-1 mx-4">
          <div className="h-2 bg-white/10 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-purple-500 to-cyan-500"
              initial={{ width: 0 }}
              animate={{ width: `${completionPercentage}%` }}
              transition={{ duration: 0.5 }}
            />
          </div>
          <div className="text-center text-sm text-white/60 mt-1">
            Word {currentWordIndex + 1} of {words.length}
          </div>
        </div>

        <div className="w-10" />
      </div>

      {/* Main Content */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-4 pb-32">

        {/* Feedback Message */}
        <AnimatePresence mode="wait">
          {showResult && currentResult && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className={`mb-8 px-6 py-4 rounded-2xl ${
                currentResult.passed
                  ? 'bg-green-500/20 border border-green-500/50'
                  : 'bg-purple-500/20 border border-purple-500/50'
              }`}
            >
              <p className="text-white font-medium text-center">{currentResult.feedback}</p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Score Circle */}
        <AnimatePresence mode="wait">
          {showResult && currentResult && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
              className="mb-8"
            >
              <div className="relative w-32 h-32">
                {/* Circle Progress */}
                <svg className="w-full h-full transform -rotate-90">
                  <circle
                    cx="64"
                    cy="64"
                    r="56"
                    stroke="rgba(255,255,255,0.1)"
                    strokeWidth="8"
                    fill="none"
                  />
                  <motion.circle
                    cx="64"
                    cy="64"
                    r="56"
                    stroke={currentResult.passed ? '#10b981' : '#a78bfa'}
                    strokeWidth="8"
                    fill="none"
                    strokeLinecap="round"
                    initial={{ strokeDashoffset: 352 }}
                    animate={{
                      strokeDashoffset: 352 - (352 * currentResult.score) / 100,
                    }}
                    style={{ strokeDasharray: 352 }}
                    transition={{ duration: 1, ease: 'easeOut' }}
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-4xl font-bold text-white">
                    {currentResult.score}%
                  </span>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Word Display with Syllables */}
        <div className="text-center mb-4">
          <div className="text-6xl font-bold mb-2">
            {showResult && currentResult ? (
              <div className="flex gap-1 justify-center">
                {currentResult.syllableBreakdown.map((syl, idx) => (
                  <motion.span
                    key={idx}
                    className={getSyllableColorClass(syl.color)}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.1 }}
                  >
                    {syl.syllable}
                  </motion.span>
                ))}
              </div>
            ) : (
              <span className="text-white">{currentWord.text}</span>
            )}
          </div>
          <div className="text-xl text-purple-300">{currentWord.romanization}</div>
          <div className="text-sm text-white/40 mt-2">
            Attempt {attempts + 1} of {maxAttempts}
          </div>
        </div>

        {/* Next Word Button (shown when can progress) */}
        {canProgress && (
          <motion.button
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            onClick={moveToNextWord}
            className="flex items-center gap-2 px-8 py-4 rounded-full bg-gradient-to-r from-purple-600 to-cyan-600 hover:from-purple-500 hover:to-cyan-500 text-white font-semibold text-lg transition-all"
          >
            {currentWordIndex < words.length - 1 ? (
              <>
                Next Word <ArrowRight className="w-5 h-5" />
              </>
            ) : (
              <>Complete Practice</>
            )}
          </motion.button>
        )}
      </div>

      {/* Mic Button (Fixed at Bottom) */}
      <div className="relative z-10 pb-8 flex justify-center">
        <motion.button
          onMouseDown={startRecording}
          onMouseUp={stopRecording}
          onTouchStart={startRecording}
          onTouchEnd={stopRecording}
          disabled={isAnalyzing || canProgress}
          className={`w-24 h-24 rounded-full flex items-center justify-center transition-all ${
            isRecording
              ? 'bg-red-500 scale-110'
              : isAnalyzing
              ? 'bg-gray-500'
              : 'bg-gradient-to-br from-pink-500 to-orange-500 hover:scale-105'
          } disabled:opacity-50 disabled:cursor-not-allowed shadow-2xl`}
          whileTap={{ scale: isAnalyzing ? 1 : 0.95 }}
        >
          {isAnalyzing ? (
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
            >
              <RotateCcw className="w-10 h-10 text-white" />
            </motion.div>
          ) : (
            <Mic className="w-10 h-10 text-white" />
          )}
        </motion.button>
      </div>
    </div>
  );
}
