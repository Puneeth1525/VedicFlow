'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useState, useRef, useEffect } from 'react';
import { Mic, CheckCircle, Sparkles, AlertTriangle, Volume2 } from 'lucide-react';
import { RealtimePitchDetector, calculateBasePitch, type PitchData } from '@/lib/pitchDetection';
import Image from 'next/image';

export default function OnboardingPage() {
  const [step, setStep] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const [hasRecording, setHasRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [baseToneHz, setBaseToneHz] = useState<number | null>(null);
  const [currentFrequency, setCurrentFrequency] = useState<number | null>(null);
  const [recordingNumber, setRecordingNumber] = useState(1); // Track which recording (1, 2, or 3)
  const [allRecordings, setAllRecordings] = useState<number[]>([]); // Store all 3 base tones
  const pitchDetectorRef = useRef<RealtimePitchDetector | null>(null);
  const collectedPitchesRef = useRef<PitchData[]>([]);

  // Cleanup pitch detector on unmount
  useEffect(() => {
    return () => {
      if (pitchDetectorRef.current) {
        pitchDetectorRef.current.stop();
      }
    };
  }, []);

  const startRecording = async () => {
    try {
      // Reset collected pitches
      collectedPitchesRef.current = [];
      setCurrentFrequency(null);
      setBaseToneHz(null);

      // Create new pitch detector
      const detector = new RealtimePitchDetector();
      pitchDetectorRef.current = detector;

      // Start pitch detection with real-time callback
      await detector.start((frequency, clarity) => {
        // Always update display
        setCurrentFrequency(frequency);

        // Only collect valid pitch data (ignore silence)
        if (frequency > 0) {
          collectedPitchesRef.current.push({
            frequency,
            clarity,
            timestamp: Date.now(),
          });
        }
      });

      setIsRecording(true);
      setHasRecording(false);
    } catch (error) {
      console.error('Error starting recording:', error);
      alert('Failed to start recording. Please ensure microphone permissions are granted.');
    }
  };

  const stopRecording = async () => {
    if (pitchDetectorRef.current && isRecording) {
      // Stop the pitch detector
      pitchDetectorRef.current.stop();
      setIsRecording(false);
      setHasRecording(true);

      // Calculate base tone from collected pitches
      setIsProcessing(true);
      try {
        if (collectedPitchesRef.current.length > 0) {
          const basePitch = calculateBasePitch(collectedPitchesRef.current);

          // Store this recording
          const updatedRecordings = [...allRecordings, basePitch];
          setAllRecordings(updatedRecordings);

          if (recordingNumber < 3) {
            // Move to next recording
            setRecordingNumber(recordingNumber + 1);
            setBaseToneHz(null);
            setHasRecording(false);
          } else {
            // All 3 recordings done - calculate average
            const average = updatedRecordings.reduce((sum, val) => sum + val, 0) / updatedRecordings.length;
            const roundedAverage = Math.round(average * 10) / 10;
            setBaseToneHz(roundedAverage);
          }
        } else {
          alert('No pitch data collected. Please try recording again with a longer "OM".');
        }
      } catch (error) {
        console.error('Error calculating base tone:', error);
        alert('Failed to calculate base tone. Please try again.');
      } finally {
        setIsProcessing(false);
      }
    }
  };

  const completeOnboarding = async () => {
    try {
      setIsProcessing(true);

      // Save user data with base tone
      const response = await fetch('/api/user', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          onboardingComplete: true,
          baseToneHz,
        }),
      });

      if (response.ok) {
        // Refresh the page to reload dashboard with new onboarding status
        window.location.reload();
      } else {
        throw new Error('Failed to complete onboarding');
      }
    } catch (error) {
      console.error('Error completing onboarding:', error);
      alert('Failed to complete onboarding. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const canProceed = () => {
    if (step === 3) {
      return baseToneHz !== null && allRecordings.length === 3;
    }
    return true;
  };

  const steps = [
    {
      title: 'Welcome to VedicFlo',
      subtitle: 'Your AI-powered Vedic chanting coach',
      content: (
        <div className="text-center space-y-6">
          <motion.div
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ delay: 0.2, type: 'spring', stiffness: 150 }}
            className="flex justify-center"
          >
            <Image
              src="/logo.png"
              alt="VedicFlo Logo"
              width={150}
              height={150}
              className="drop-shadow-2xl"
            />
          </motion.div>
          <p className="text-lg text-purple-200">
            Begin your journey to master the sacred art of Vedic chanting with personalized AI feedback
          </p>
        </div>
      ),
    },
    {
      title: 'Important Disclaimer',
      subtitle: 'Please read carefully',
      content: (
        <div className="space-y-4">
          <div className="p-6 rounded-xl bg-amber-500/10 border border-amber-500/30">
            <div className="flex items-start gap-4">
              <AlertTriangle className="w-6 h-6 text-amber-400 flex-shrink-0 mt-1" />
              <div className="space-y-2">
                <h3 className="font-semibold text-amber-200">Not a Replacement for a Guru</h3>
                <p className="text-sm text-purple-200 leading-relaxed">
                  VedicFlo is designed to support your Vedic chanting learning journey through technology.
                  However, it is NOT a replacement for learning from a qualified Guru or teacher.
                  The sacred tradition of Vedic chanting is best learned through direct transmission from a master.
                </p>
              </div>
            </div>
          </div>
          <div className="p-6 rounded-xl bg-purple-500/10 border border-purple-500/30">
            <h3 className="font-semibold text-purple-200 mb-2">Purpose of this App:</h3>
            <ul className="space-y-2 text-sm text-purple-200">
              <li className="flex gap-2">
                <span className="text-purple-400">•</span>
                <span>Support your personal practice between sessions with your teacher</span>
              </li>
              <li className="flex gap-2">
                <span className="text-purple-400">•</span>
                <span>Provide instant feedback on pronunciation and swara accuracy</span>
              </li>
              <li className="flex gap-2">
                <span className="text-purple-400">•</span>
                <span>Track your progress and identify areas for improvement</span>
              </li>
              <li className="flex gap-2">
                <span className="text-purple-400">•</span>
                <span>Help you maintain consistency in your practice</span>
              </li>
            </ul>
          </div>
        </div>
      ),
    },
    {
      title: 'Get Ready to Excel',
      subtitle: 'What you can achieve with VedicFlo',
      content: (
        <div className="space-y-6">
          <div className="grid md:grid-cols-2 gap-4">
            <motion.div
              whileHover={{ scale: 1.05 }}
              className="p-6 rounded-xl bg-gradient-to-br from-purple-500/20 to-cyan-500/20 border border-purple-400/30"
            >
              <Sparkles className="w-8 h-8 text-purple-400 mb-3" />
              <h4 className="font-semibold mb-2">Personalized Reviews</h4>
              <p className="text-sm text-purple-200">Get AI-powered feedback tailored to your voice and progress</p>
            </motion.div>
            <motion.div
              whileHover={{ scale: 1.05 }}
              className="p-6 rounded-xl bg-gradient-to-br from-cyan-500/20 to-purple-500/20 border border-cyan-400/30"
            >
              <Volume2 className="w-8 h-8 text-cyan-400 mb-3" />
              <h4 className="font-semibold mb-2">Swara Accuracy</h4>
              <p className="text-sm text-purple-200">Master the precise pitch variations of Vedic chanting</p>
            </motion.div>
          </div>
          <div className="text-center p-6 rounded-xl bg-white/5 border border-white/10">
            <p className="text-purple-200">
              <span className="font-semibold text-purple-400">Pro tip:</span> Practice regularly,
              even if just for 10 minutes a day, to see rapid improvement in your chanting skills!
            </p>
          </div>
        </div>
      ),
    },
    {
      title: 'Calibrate Your Base Tone',
      subtitle: 'Record "OOOMM" 3 times for accurate calibration',
      content: (
        <div className="space-y-6">
          <div className="p-6 rounded-xl bg-cyan-500/10 border border-cyan-500/30">
            <h3 className="font-semibold text-cyan-200 mb-3">Why do we need this?</h3>
            <p className="text-sm text-purple-200 leading-relaxed mb-4">
              To provide accurate swara (pitch) analysis, we need to know your natural base tone (Udhaatha).
              We&apos;ll take 3 recordings and average them for the most accurate result.
            </p>
            <div className="bg-white/5 rounded-lg p-4">
              <h4 className="font-semibold text-white mb-2">Instructions:</h4>
              <ol className="space-y-2 text-sm text-purple-200">
                <li className="flex gap-2">
                  <span className="text-cyan-400 font-bold">1.</span>
                  <span>Take a comfortable breath</span>
                </li>
                <li className="flex gap-2">
                  <span className="text-cyan-400 font-bold">2.</span>
                  <span>Chant a long, steady &quot;OOOMM&quot; in your natural, comfortable pitch</span>
                </li>
                <li className="flex gap-2">
                  <span className="text-cyan-400 font-bold">3.</span>
                  <span>Keep the pitch constant - no ups or downs</span>
                </li>
                <li className="flex gap-2">
                  <span className="text-cyan-400 font-bold">4.</span>
                  <span>Make it at least 3-5 seconds long</span>
                </li>
              </ol>
            </div>
          </div>

          {/* Recording Progress */}
          <div className="p-4 rounded-xl bg-purple-500/10 border border-purple-500/30">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-semibold text-purple-200">Recording Progress</span>
              <span className="text-sm font-bold text-purple-400">
                {recordingNumber} of 3
              </span>
            </div>
            <div className="flex gap-2">
              {[1, 2, 3].map((num) => (
                <div
                  key={num}
                  className={`flex-1 h-2 rounded-full transition-all ${
                    num < recordingNumber
                      ? 'bg-green-500'
                      : num === recordingNumber
                      ? 'bg-cyan-500 animate-pulse'
                      : 'bg-white/10'
                  }`}
                />
              ))}
            </div>
            {recordingNumber <= 3 && !baseToneHz && (
              <p className="text-sm text-purple-300 mt-2">
                {recordingNumber === 3 ? 'Last recording!' : `${3 - recordingNumber} more ${3 - recordingNumber === 1 ? 'recording' : 'recordings'} to go`}
              </p>
            )}
          </div>

          {/* All Recordings Display */}
          {allRecordings.length > 0 && (
            <div className="p-4 rounded-xl bg-white/5 border border-white/10">
              <h4 className="text-sm font-semibold text-white mb-3">Recorded Values</h4>
              <div className="grid grid-cols-3 gap-3">
                {allRecordings.map((freq, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-lg bg-cyan-500/20 border border-cyan-500/30 text-center"
                  >
                    <div className="text-xs text-cyan-300 mb-1">Recording {idx + 1}</div>
                    <div className="text-lg font-bold text-cyan-200">{freq.toFixed(1)} Hz</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex flex-col items-center gap-4">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={isRecording ? stopRecording : startRecording}
              disabled={isProcessing || baseToneHz !== null}
              className={`w-32 h-32 rounded-full flex items-center justify-center transition-all ${
                isRecording
                  ? 'bg-red-500 hover:bg-red-600 animate-pulse'
                  : baseToneHz !== null
                  ? 'bg-green-500'
                  : 'bg-gradient-to-br from-purple-500 to-cyan-500 hover:from-purple-600 hover:to-cyan-600'
              } ${isProcessing || baseToneHz !== null ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {isProcessing ? (
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
              ) : baseToneHz !== null ? (
                <CheckCircle className="w-12 h-12 text-white" />
              ) : (
                <Mic className="w-12 h-12 text-white" />
              )}
            </motion.button>
            <p className="text-sm text-purple-300 text-center">
              {isProcessing
                ? 'Analyzing your voice...'
                : isRecording
                ? 'Recording... Click to stop'
                : baseToneHz !== null
                ? 'All recordings complete!'
                : `Click to record (${recordingNumber} of 3)`}
            </p>
            {isRecording && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-cyan-500/20 border border-cyan-500/30">
                <Volume2 className="w-5 h-5 text-cyan-400" />
                <span className="text-sm text-cyan-300">
                  Current pitch: {currentFrequency !== null ? currentFrequency.toFixed(1) : '0.0'} Hz
                </span>
              </div>
            )}
            {baseToneHz && !isRecording && (
              <div className="flex flex-col items-center gap-2 p-4 rounded-lg bg-green-500/20 border border-green-500/30 w-full max-w-md">
                <CheckCircle className="w-6 h-6 text-green-400" />
                <div className="text-center">
                  <div className="text-sm text-green-300 mb-1">Average Base Tone</div>
                  <div className="text-2xl font-bold text-green-200">{baseToneHz.toFixed(1)} Hz</div>
                  <div className="text-xs text-green-300/70 mt-1">
                    Based on {allRecordings.length} recordings
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      ),
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-900 text-white">
      <div className="max-w-4xl mx-auto px-4 py-12">
        {/* Progress bar */}
        <div className="mb-12">
          <div className="flex justify-between mb-2">
            {steps.map((_, index) => (
              <div
                key={index}
                className={`h-2 flex-1 mx-1 rounded-full transition-all ${
                  index <= step ? 'bg-gradient-to-r from-purple-500 to-cyan-500' : 'bg-white/10'
                }`}
              />
            ))}
          </div>
          <p className="text-sm text-purple-300 text-center">
            Step {step + 1} of {steps.length}
          </p>
        </div>

        {/* Content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
            className="mb-12"
          >
            <h1 className="text-4xl font-bold mb-3 bg-gradient-to-r from-purple-400 to-cyan-400 bg-clip-text text-transparent">
              {steps[step].title}
            </h1>
            <p className="text-purple-300 mb-8">{steps[step].subtitle}</p>
            <div className="bg-white/5 backdrop-blur-lg rounded-2xl border border-white/10 p-8">
              {steps[step].content}
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Navigation buttons */}
        <div className="flex justify-between gap-4">
          {step > 0 && (
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setStep(step - 1)}
              disabled={isProcessing}
              className="px-8 py-3 rounded-lg bg-white/10 hover:bg-white/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Back
            </motion.button>
          )}
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => {
              if (step < steps.length - 1) {
                setStep(step + 1);
              } else {
                completeOnboarding();
              }
            }}
            disabled={!canProceed() || isProcessing}
            className="ml-auto px-8 py-3 rounded-lg bg-gradient-to-r from-purple-500 to-cyan-500 hover:from-purple-600 hover:to-cyan-600 transition-all font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isProcessing ? 'Processing...' : step === steps.length - 1 ? 'Complete Setup' : 'Continue'}
          </motion.button>
        </div>
      </div>
    </div>
  );
}
