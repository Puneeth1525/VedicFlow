'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Play, Pause, Mic, Square, Volume2, Info, Loader2, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';
import { useState, useRef, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useUser } from '@clerk/nextjs';
import {
  RealtimePitchDetector,
  PitchData,
  loadAndAnalyzeAudio,
  comparePitchSequences,
  SwaraSyllableMatch,
  SyllableWithSwara,
  SwaraType,
} from '@/lib/pitchDetection';
import { analyzeMantraChanting, SyllableAnalysisResult, DetailedFeedback } from '@/lib/syllableAnalyzer';
import { loadMantra } from '@/lib/mantraLoader';
import { MantraData } from '@/lib/types/mantra';
import WordByWordPractice from '@/components/WordByWordPractice';

export default function PracticePage() {
  const params = useParams();
  const router = useRouter();
  const mantraId = params.mantraId as string;
  const { user } = useUser();

  // State for dynamically loaded mantra
  const [mantra, setMantra] = useState<MantraData | null>(null);
  const [isLoadingMantra, setIsLoadingMantra] = useState(true);

  // State for user's personal baseline
  const [userBaseToneHz, setUserBaseToneHz] = useState<number | null>(null);

  // State for saving to database
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [canSaveRecording, setCanSaveRecording] = useState(false);
  const [lastRecordingBlob, setLastRecordingBlob] = useState<Blob | null>(null);
  const [lastRecordingScore, setLastRecordingScore] = useState<number | null>(null);
  const [lastRecordingDuration, setLastRecordingDuration] = useState<number>(0);
  const [lastDetailedFeedback, setLastDetailedFeedback] = useState<DetailedFeedback | null>(null);

  const [practiceMode, setPracticeMode] = useState<'line' | 'paragraph' | 'full'>('line');
  const [selectedChapter, setSelectedChapter] = useState(1);
  const [selectedParagraph, setSelectedParagraph] = useState(1);
  const [selectedLine, setSelectedLine] = useState(1);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [accuracyScore, setAccuracyScore] = useState<number | null>(null);
  const [syllableMatches, setSyllableMatches] = useState<SwaraSyllableMatch[]>([]);
  const [comprehensiveResults, setComprehensiveResults] = useState<SyllableAnalysisResult[]>([]);
  const [phoneticAccuracy, setPhoneticAccuracy] = useState<number | null>(null);
  const [swaraAccuracy, setSwaraAccuracy] = useState<number | null>(null);
  const [isPronunciationReady, setIsPronunciationReady] = useState(false);
  const [isSwaraReady, setIsSwaraReady] = useState(false);
  const [currentSyllableIndex, setCurrentSyllableIndex] = useState<number>(-1);
  const [showInfo, setShowInfo] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [referencePitchData, setReferencePitchData] = useState<PitchData[]>([]);
  const [analysisMode, setAnalysisMode] = useState<'phonetic' | 'pitch'>('phonetic');
  const [advancedMode, setAdvancedMode] = useState(false); // Toggle for word-by-word display
  const [audioProgress, setAudioProgress] = useState(0); // Current audio time in seconds
  const [showWordByWord, setShowWordByWord] = useState(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const pitchDetectorRef = useRef<RealtimePitchDetector | null>(null);
  const userPitchDataRef = useRef<PitchData[]>([]);
  const recordingStartTimeRef = useRef<number>(0);

  // Load mantra data dynamically when component mounts or mantraId changes
  useEffect(() => {
    const loadMantraData = async () => {
      try {
        setIsLoadingMantra(true);
        const data = await loadMantra(mantraId);
        setMantra(data);
      } catch (error) {
        console.error('Failed to load mantra:', error);
        // Fallback: redirect to mantras page
        window.location.href = '/mantras';
      } finally {
        setIsLoadingMantra(false);
      }
    };

    loadMantraData();
  }, [mantraId]);

  // Fetch user's personal baseline from onboarding
  useEffect(() => {
    const fetchUserBaseTone = async () => {
      try {
        const response = await fetch('/api/user');
        if (response.ok) {
          const userData = await response.json();
          if (userData.baseToneHz) {
            setUserBaseToneHz(userData.baseToneHz);
            console.log(`🎯 User's personal baseline loaded: ${userData.baseToneHz.toFixed(1)} Hz`);
          } else {
            console.warn('⚠️ User has no baseline set. Swara detection will use recording baseline.');
          }
        }
      } catch (error) {
        console.error('Error fetching user baseline:', error);
      }
    };

    fetchUserBaseTone();
  }, []);

  // Helper functions to handle hierarchical structure
  const hasChapters = () => !!mantra?.chapters;
  const getParagraphs = () => {
    if (!mantra) return [];
    if (hasChapters()) {
      const chapter = mantra.chapters?.find((c) => c.id === selectedChapter);
      return chapter?.paragraphs || [];
    }
    return mantra.paragraphs || [];
  };

  const getAllParagraphs = () => {
    if (!mantra) return [];
    if (hasChapters()) {
      return mantra.chapters?.flatMap((c) => c.paragraphs) || [];
    }
    return mantra.paragraphs || [];
  };

  const hasMultipleParagraphs = () => getParagraphs().length > 1;
  const shouldShowParagraphSelector = () => practiceMode !== 'full' && (hasMultipleParagraphs() || hasChapters());

  const currentParagraph = getParagraphs().find((p) => p.id === selectedParagraph);
  const currentLine = currentParagraph?.lines.find((l) => l.id === selectedLine);

  // Get the content to display based on practice mode
  const getDisplayContent = () => {
    if (!mantra) return [];
    if (practiceMode === 'line' && currentLine) {
      return [currentLine];
    } else if (practiceMode === 'paragraph' && currentParagraph) {
      return currentParagraph.lines;
    } else if (practiceMode === 'full') {
      return getAllParagraphs().flatMap(p => p.lines);
    }
    return [];
  };

  const displayLines = getDisplayContent();

  // Get all syllables for the current practice mode
  const getCurrentSyllables = () => {
    return displayLines.flatMap(line => line.sanskrit);
  };

  // Group syllables into words based on explicit wordBoundaries from JSON
  const groupSyllablesIntoWords = (line: typeof displayLines[0]) => {
    const words: Array<{syllables: SyllableWithSwara[], startIndex: number}> = [];

    // Use explicit word boundaries if available, otherwise fall back to treating each syllable as a separate word
    const boundaries = line.wordBoundaries || line.sanskrit.map((_, i) => i);

    for (let i = 0; i < boundaries.length; i++) {
      const startIndex = boundaries[i];
      const endIndex = i < boundaries.length - 1 ? boundaries[i + 1] : line.sanskrit.length;

      const wordSyllables = line.sanskrit.slice(startIndex, endIndex);
      words.push({
        syllables: wordSyllables,
        startIndex: startIndex
      });
    }

    return words;
  };

  // Extract words from current line for word-by-word practice
  const getWordsFromCurrentLine = () => {
    if (!currentLine) return [];

    const words: Array<{ text: string; romanization: string }> = [];
    let currentWord = { text: '', romanization: '' };

    currentLine.sanskrit.forEach((syllable, index) => {
      // Check if this syllable is a word boundary
      const isWordBoundary = currentLine.wordBoundaries?.includes(index);

      if (isWordBoundary && currentWord.text) {
        // Push previous word
        words.push(currentWord);
        currentWord = { text: '', romanization: '' };
      }

      // Add syllable to current word
      currentWord.text += syllable.text;
      currentWord.romanization += syllable.romanization;
    });

    // Push last word
    if (currentWord.text) {
      words.push(currentWord);
    }

    return words;
  };

  const getSwaraColor = (swara: SwaraType) => {
    switch (swara) {
      case 'anudhaatha':
        return 'text-blue-400 bg-blue-500/20 border-blue-400/30';  // Low pitch
      case 'udhaatha':
        return 'text-yellow-400 bg-yellow-500/20 border-yellow-400/30';  // Base/Stable pitch
      case 'swarita':
        return 'text-red-400 bg-red-500/20 border-red-400/30';  // Rising pitch
      case 'dheerga':
        return 'text-green-400 bg-green-500/20 border-green-400/30';  // Prolonged rising
    }
  };

  const getSwaraSymbol = (swara: SwaraType) => {
    switch (swara) {
      case 'anudhaatha':
        return '↓';  // Going down
      case 'udhaatha':
        return '—';  // Base/Stable
      case 'swarita':
        return '↗';  // Going up
      case 'dheerga':
        return '⤴';  // Going up and prolonged
    }
  };

  // Get duration weight based on swara type
  const getSwaraDurationWeight = (swara: SwaraType) => {
    switch (swara) {
      case 'dheerga':
        return 1.5;  // Prolonged - takes 50% more time
      case 'swarita':
        return 1.1;  // Rising pitch - slightly longer
      case 'anudhaatha':
        return 0.9;  // Low pitch - slightly shorter
      case 'udhaatha':
        return 1.0;  // Base - normal duration
    }
  };

  // Calculate weighted syllable timings for a line
  const calculateSyllableTimings = (line: typeof displayLines[0], lineIndex: number) => {
    // Try to use explicit timing data first
    if (line.audioStartTime !== undefined && line.audioEndTime !== undefined) {
      const lineDuration = line.audioEndTime - line.audioStartTime;
      const weights = line.sanskrit.map(s => getSwaraDurationWeight(s.swara));
      const totalWeight = weights.reduce((sum, w) => sum + w, 0);

      const timings: Array<{ start: number; end: number }> = [];
      let currentTime = line.audioStartTime;

      line.sanskrit.forEach((syllable, idx) => {
        const syllableDuration = (weights[idx] / totalWeight) * lineDuration;
        timings.push({
          start: currentTime,
          end: currentTime + syllableDuration
        });
        currentTime += syllableDuration;
      });

      return timings;
    }

    // Fallback: estimate timing based on audio duration if no explicit timing
    const audio = audioRef.current;
    if (!audio || !audio.duration || audio.duration === Infinity) return [];

    // Calculate total syllables across all lines to distribute duration
    const totalSyllables = displayLines.reduce((sum, l) => sum + l.sanskrit.length, 0);
    const averageTimePerSyllable = audio.duration / totalSyllables;

    // Calculate the starting offset for this line
    const syllablesBeforeThisLine = displayLines
      .slice(0, lineIndex)
      .reduce((sum, l) => sum + l.sanskrit.length, 0);
    const lineStartTime = syllablesBeforeThisLine * averageTimePerSyllable;

    // Now calculate timings for syllables in this line using swara weights
    const weights = line.sanskrit.map(s => getSwaraDurationWeight(s.swara));
    const totalWeight = weights.reduce((sum, w) => sum + w, 0);
    const estimatedLineDuration = line.sanskrit.length * averageTimePerSyllable;

    const timings: Array<{ start: number; end: number }> = [];
    let currentTime = lineStartTime;

    line.sanskrit.forEach((syllable, idx) => {
      const syllableDuration = (weights[idx] / totalWeight) * estimatedLineDuration;
      timings.push({
        start: currentTime,
        end: currentTime + syllableDuration
      });
      currentTime += syllableDuration;
    });

    return timings;
  };

  const getFeedbackColor = (accuracy: 'perfect' | 'good' | 'fair' | 'poor') => {
    switch (accuracy) {
      case 'perfect':
        return 'border-green-500 bg-green-500/30 ring-2 ring-green-400';
      case 'good':
        return 'border-yellow-500 bg-yellow-500/20 ring-2 ring-yellow-400';
      case 'fair':
        return 'border-orange-500 bg-orange-500/20 ring-2 ring-orange-400';
      case 'poor':
        return 'border-red-500 bg-red-500/20 ring-2 ring-red-400';
    }
  };

  const getSwaraFeedbackColor = (accuracy: 'perfect' | 'good' | 'fair' | 'poor') => {
    switch (accuracy) {
      case 'perfect':
        return 'text-green-400 bg-green-500/20';
      case 'good':
        return 'text-yellow-400 bg-yellow-500/20';
      case 'fair':
        return 'text-orange-400 bg-orange-500/20';
      case 'poor':
        return 'text-red-400 bg-red-500/20';
    }
  };

  // Load reference audio pitch data when mantra changes
  useEffect(() => {
    if (mantra?.audioUrl) {
      loadAndAnalyzeAudio(mantra.audioUrl)
        .then((pitchData) => {
          setReferencePitchData(pitchData);
          console.log('Reference pitch data loaded:', pitchData.length, 'points');
        })
        .catch((error) => {
          console.error('Error loading reference audio:', error);
        });
    }
  }, [mantra?.audioUrl]);

  // Clear feedback when selection or practice mode changes
  useEffect(() => {
    setAccuracyScore(null);
    setSyllableMatches([]);
    setComprehensiveResults([]);
    setPhoneticAccuracy(null);
    setSwaraAccuracy(null);
    setIsPronunciationReady(false);
    setIsSwaraReady(false);
  }, [selectedParagraph, selectedLine, practiceMode]);

  // ML model removed - now using Whisper AI for pronunciation detection

  const togglePlayAudio = () => {
    if (!audioRef.current) return;

    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      // Set start time based on practice mode
      if (practiceMode === 'line' && currentLine?.audioStartTime !== undefined) {
        audioRef.current.currentTime = currentLine.audioStartTime;
      } else if (practiceMode === 'paragraph' && currentParagraph?.lines[0]?.audioStartTime !== undefined) {
        audioRef.current.currentTime = currentParagraph.lines[0].audioStartTime;
      } else {
        // Play from beginning for full chant
        audioRef.current.currentTime = 0;
      }
      audioRef.current.play();
      setIsPlaying(true);
    }
  };

  // Handle audio time update to stop at line/paragraph end
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleTimeUpdate = () => {
      // Update audio progress for visual indicator
      setAudioProgress(audio.currentTime);

      if (practiceMode === 'line' && currentLine?.audioEndTime !== undefined) {
        if (audio.currentTime >= currentLine.audioEndTime) {
          audio.pause();
          setIsPlaying(false);
        }
      } else if (practiceMode === 'paragraph' && currentParagraph) {
        const lastLine = currentParagraph.lines[currentParagraph.lines.length - 1];
        if (lastLine?.audioEndTime !== undefined && audio.currentTime >= lastLine.audioEndTime) {
          audio.pause();
          setIsPlaying(false);
        }
      }
      // For full chant mode, let it play until the end naturally
    };

    const handleEnded = () => {
      setIsPlaying(false);
    };

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('ended', handleEnded);
    };
  }, [currentParagraph, currentLine, practiceMode]);

  const startRecording = async () => {
    try {
      // Reset previous data
      userPitchDataRef.current = [];
      setAccuracyScore(null);
      setSyllableMatches([]);
      setComprehensiveResults([]);
      setCurrentSyllableIndex(-1);
      setIsPronunciationReady(false);
      setIsSwaraReady(false);
      setSwaraAccuracy(null);
      setPhoneticAccuracy(null);

      // Reset save states
      setSaveSuccess(false);
      setSaveError(null);
      setIsSaving(false);
      setCanSaveRecording(false);
      setLastRecordingBlob(null);
      setLastRecordingScore(null);
      setLastRecordingDuration(0);
      setLastDetailedFeedback(null);

      // Start media recorder for playback
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
        const recordingDuration = Date.now() - recordingStartTimeRef.current;

        // Analyze the recorded audio
        setIsAnalyzing(true);
        let finalScore: number | null = null;

        try {
          // Convert blob to AudioBuffer for comprehensive analysis
          const arrayBuffer = await audioBlob.arrayBuffer();
          const audioContext = new AudioContext();
          const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

          console.log('Audio buffer created:', audioBuffer.duration, 'seconds');

          if (currentParagraph && analysisMode === 'phonetic') {
            // Use comprehensive phonetic + swara analysis with progressive updates
            console.log('Running comprehensive analysis...');

            // Load reference audio for comparison
            let referenceAudioBuffer: AudioBuffer | undefined;
            try {
              if (mantra?.audioUrl) {
                const response = await fetch(mantra.audioUrl);
                const arrayBuffer = await response.arrayBuffer();
                const audioContext = new AudioContext();
                referenceAudioBuffer = await audioContext.decodeAudioData(arrayBuffer);
                audioContext.close();
                console.log('Reference audio loaded for comparison');
              }
            } catch (error) {
              console.warn('Could not load reference audio:', error);
            }

            // Run the full analysis (pronunciation + swara)
            const currentSyllables = getCurrentSyllables();
            const result = await analyzeMantraChanting(
              audioBuffer,
              currentSyllables,
              referenceAudioBuffer,
              displayLines[0]?.audioStartTime,
              displayLines[displayLines.length - 1]?.audioEndTime,
              audioBlob,  // Pass the blob for speech recognition
              userBaseToneHz || undefined  // Pass user's personal baseline
            );

            console.log('Comprehensive analysis result:', result);

            // Update pronunciation results first
            setPhoneticAccuracy(result.pronunciationAccuracy);
            setAccuracyScore(result.pronunciationAccuracy);
            setIsPronunciationReady(true);
            finalScore = result.pronunciationAccuracy;

            // Convert to syllable matches for UI (pronunciation only at first)
            const matches: SwaraSyllableMatch[] = result.syllableResults.map(r => ({
              syllableIndex: r.syllableIndex,
              expectedSwara: r.expectedSwara,
              detectedSwara: r.detectedSwara,
              confidence: r.pronunciationScore / 100, // Convert percentage to 0-1
              accuracy: r.accuracy,
              semitonesDiff: 0, // Not used in phonetic mode
            }));

            setSyllableMatches(matches);
            setComprehensiveResults(result.syllableResults);

            // Update swara results
            if (result.swaraAccuracy !== undefined) {
              setSwaraAccuracy(result.swaraAccuracy);
              setIsSwaraReady(true);

              // Update overall score to include swara (60% pronunciation + 40% swara)
              const combinedScore = Math.round(
                result.pronunciationAccuracy * 0.6 + result.swaraAccuracy * 0.4
              );
              setAccuracyScore(combinedScore);
              finalScore = combinedScore;
            }

            console.log('Pronunciation Accuracy:', result.pronunciationAccuracy);
            console.log('Swara Accuracy:', result.swaraAccuracy);
            console.log('Overall Score:', result.overallScore);

            if (result.feedback.length > 0) {
              console.log('Feedback:', result.feedback.join('; '));
            }

            // Store detailed feedback for saving to database
            if (result.detailedFeedback) {
              setLastDetailedFeedback(result.detailedFeedback);
            }
          } else if (referencePitchData.length > 0 && currentParagraph) {
            // Fallback to pitch-only analysis
            console.log('Running pitch-only analysis...');
            const audioUrl = URL.createObjectURL(audioBlob);
            const userPitchData = await loadAndAnalyzeAudio(audioUrl);

            console.log('User pitch data:', userPitchData.length, 'points');
            console.log('Reference pitch data:', referencePitchData.length, 'points');

            if (userPitchData.length > 0) {
            // Basic pitch comparison
            const result = comparePitchSequences(referencePitchData, userPitchData);

            // No swara analysis for now - only pronunciation via Whisper AI

            setAccuracyScore(result.overallScore);
            finalScore = result.overallScore;

            console.log('Analysis result:', result);
            }
          } else {
            alert('Unable to analyze audio. Please try again.');
          }

          audioContext.close();

          // Store recording data for potential save (only in Full Chant mode)
          if (finalScore !== null && practiceMode === 'full') {
            setLastRecordingBlob(audioBlob);
            setLastRecordingScore(finalScore);
            setLastRecordingDuration(recordingDuration);
            setCanSaveRecording(true);
          }

          // Track practice time (update user stats without saving recording)
          if (finalScore !== null) {
            await trackPracticeTime(recordingDuration, finalScore);
          }
        } catch (error) {
          console.error('Error analyzing audio:', error);
          alert('Error analyzing audio. Please try again.');
        } finally {
          setIsAnalyzing(false);
        }
      };

      // Start real-time pitch detection
      pitchDetectorRef.current = new RealtimePitchDetector();
      recordingStartTimeRef.current = Date.now();

      await pitchDetectorRef.current.start((frequency, clarity) => {
        const timestamp = (Date.now() - recordingStartTimeRef.current) / 1000;
        userPitchDataRef.current.push({ frequency, clarity, timestamp });
      });

      mediaRecorder.start();
      setIsRecording(true);
    } catch (error) {
      console.error('Error accessing microphone:', error);
      alert('Unable to access microphone. Please grant permission.');
    }
  };

  const stopRecording = () => {
    if (pitchDetectorRef.current) {
      pitchDetectorRef.current.stop();
    }
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
      setIsRecording(false);
    }
  };

  // Track practice time without saving recording
  const trackPracticeTime = async (durationMs: number, score: number) => {
    if (!user?.id) return;

    try {
      // Update user stats with practice time only
      const response = await fetch('/api/user-stats', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          durationMs,
          score,
        }),
      });

      if (response.ok) {
        console.log('Practice time tracked successfully');
      }
    } catch (error) {
      console.error('Error tracking practice time:', error);
      // Don't show error to user, this is background tracking
    }
  };

  // Save recording to database (only for Full Chant mode)
  const saveRecordingToDatabase = async (
    audioBlob: Blob,
    score: number,
    durationMs: number,
    detailedFeedback: DetailedFeedback | null
  ) => {
    if (!user?.id || !mantraId) {
      console.error('Missing user ID or mantra ID');
      setSaveError('Unable to save: missing user or mantra information');
      return;
    }

    setIsSaving(true);
    setSaveError(null);
    setSaveSuccess(false);

    try {
      // 1. Upload audio to Supabase Storage via API route
      console.log('Uploading recording to Supabase Storage...');
      const formData = new FormData();
      formData.append('file', audioBlob, `recording-${Date.now()}.webm`);

      const uploadRes = await fetch('/api/upload-recording', {
        method: 'POST',
        body: formData,
      });

      if (!uploadRes.ok) {
        const errorData = await uploadRes.json();
        throw new Error(errorData.error || 'Failed to upload recording');
      }

      const { url: audioUrl } = await uploadRes.json();
      console.log('Audio uploaded:', audioUrl);

      // 2. Create Practice session
      console.log('Creating practice session...');
      const practiceRes = await fetch('/api/practices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          mantraId: mantraId,
          durationMs,
        }),
      });

      if (!practiceRes.ok) {
        throw new Error('Failed to create practice session');
      }

      const practice = await practiceRes.json();
      console.log('Practice session created:', practice.id);

      // 3. Create Recording entry
      console.log('Creating recording entry...');
      const recordingRes = await fetch('/api/recordings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          practiceId: practice.id,
          audioUrl,
          score,
          detailedFeedback,
        }),
      });

      if (!recordingRes.ok) {
        throw new Error('Failed to create recording entry');
      }

      const recording = await recordingRes.json();
      console.log('Recording saved:', recording.id);

      // Show success message
      setSaveSuccess(true);

      // Auto-redirect to dashboard after 2 seconds
      setTimeout(() => {
        router.push('/dashboard');
      }, 2000);

    } catch (error) {
      console.error('Error saving recording:', error);
      setSaveError(error instanceof Error ? error.message : 'Failed to save recording');
    } finally {
      setIsSaving(false);
    }
  };

  // Show loading state
  if (isLoadingMantra || !mantra) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-900 text-white flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4 text-purple-400" />
          <p className="text-xl text-purple-300">Loading mantra...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-900 text-white pb-24">
      <div className="max-w-6xl mx-auto px-4 py-8">
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
              <p className="text-purple-200 text-sm mt-1">{mantra.category}</p>
            </div>
          </div>

          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowInfo(!showInfo)}
            className="p-2 rounded-full bg-white/5 backdrop-blur-lg border border-white/10 hover:border-purple-400/50"
          >
            <Info className="w-6 h-6" />
          </motion.button>
        </div>

        {/* Info Panel */}
        <AnimatePresence>
          {showInfo && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-6 p-6 rounded-2xl bg-white/5 backdrop-blur-lg border border-white/10 overflow-hidden"
            >
              <h3 className="text-lg font-semibold mb-3 text-purple-300">Swara Guide</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-2xl">↓</span>
                    <span className="text-blue-400 font-semibold">Anudātta</span>
                  </div>
                  <p className="text-sm text-purple-200">Low pitch - go down</p>
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-2xl">—</span>
                    <span className="text-yellow-400 font-semibold">Udātta</span>
                  </div>
                  <p className="text-sm text-purple-200">Base pitch - stable tone</p>
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-2xl">↗</span>
                    <span className="text-red-400 font-semibold">Swarita</span>
                  </div>
                  <p className="text-sm text-purple-200">Rising pitch - go up</p>
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-2xl">⤴</span>
                    <span className="text-green-400 font-semibold">Dīrgha Swarita</span>
                  </div>
                  <p className="text-sm text-purple-200">Prolonged rise - go up and hold</p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Main Practice Area */}
          <div className="lg:col-span-2">
            {/* Practice Mode Selector */}
            <div className="mb-6 p-4 rounded-2xl bg-white/5 backdrop-blur-lg border border-white/10">
              <p className="text-sm text-purple-300 mb-3">Practice Mode</p>
              <div className="flex flex-wrap gap-2 mb-4">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setPracticeMode('line')}
                  className={`px-4 py-2 rounded-lg font-medium transition-all ${
                    practiceMode === 'line'
                      ? 'bg-gradient-to-r from-purple-600 to-cyan-600 text-white'
                      : 'bg-white/5 text-purple-300 hover:bg-white/10'
                  }`}
                >
                  Line by Line
                </motion.button>
                {/* Only show Paragraph mode if there are multiple paragraphs */}
                {hasMultipleParagraphs() && (
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setPracticeMode('paragraph')}
                    className={`px-4 py-2 rounded-lg font-medium transition-all ${
                      practiceMode === 'paragraph'
                        ? 'bg-gradient-to-r from-purple-600 to-cyan-600 text-white'
                        : 'bg-white/5 text-purple-300 hover:bg-white/10'
                    }`}
                  >
                    Paragraph
                  </motion.button>
                )}
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setPracticeMode('full')}
                  className={`px-4 py-2 rounded-lg font-medium transition-all ${
                    practiceMode === 'full'
                      ? 'bg-gradient-to-r from-purple-600 to-cyan-600 text-white'
                      : 'bg-white/5 text-purple-300 hover:bg-white/10'
                  }`}
                >
                  Full Chant
                </motion.button>
              </div>

              {/* Word by Word Mode - Only show in Line mode */}
              {practiceMode === 'line' && (
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="mt-4 p-4 rounded-xl bg-gradient-to-r from-cyan-500/10 to-purple-500/10 border border-cyan-500/30"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-white font-medium mb-1">
                        Beginner Mode
                      </p>
                      <p className="text-sm text-purple-300">
                        Practice one word at a time with instant feedback
                      </p>
                    </div>
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => setShowWordByWord(true)}
                      className="px-6 py-3 rounded-lg bg-gradient-to-r from-cyan-600 to-purple-600 hover:from-cyan-500 hover:to-purple-500 text-white font-medium transition-all shadow-lg"
                    >
                      Start Word-by-Word
                    </motion.button>
                  </div>
                </motion.div>
              )}

              {/* Chapter Selector - only show if mantra has chapters */}
              {hasChapters() && practiceMode !== 'full' && (
                <>
                  <p className="text-sm text-purple-300 mb-3">Select Chapter</p>
                  <div className="flex flex-wrap gap-2 mb-4">
                    {mantra.chapters?.map((chapter) => (
                      <motion.button
                        key={chapter.id}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => {
                          setSelectedChapter(chapter.id);
                          setSelectedParagraph(1);
                          setSelectedLine(1);
                        }}
                        className={`px-4 py-2 rounded-lg font-medium transition-all ${
                          selectedChapter === chapter.id
                            ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white'
                            : 'bg-white/5 text-purple-300 hover:bg-white/10'
                        }`}
                      >
                        {chapter.name}
                      </motion.button>
                    ))}
                  </div>
                </>
              )}

              {/* Paragraph Selector - only show when needed */}
              {shouldShowParagraphSelector() && (
                <>
                  <p className="text-sm text-purple-300 mb-3">Select Paragraph</p>
                  <div className="flex flex-wrap gap-2 mb-4">
                    {getParagraphs().map((para) => (
                      <motion.button
                        key={para.id}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => {
                          setSelectedParagraph(para.id);
                          setSelectedLine(1); // Reset line when changing paragraph
                        }}
                        className={`px-4 py-2 rounded-lg font-medium transition-all ${
                          selectedParagraph === para.id
                            ? 'bg-gradient-to-r from-purple-600 to-cyan-600 text-white'
                            : 'bg-white/5 text-purple-300 hover:bg-white/10'
                        }`}
                      >
                        Para {para.id}
                      </motion.button>
                    ))}
                  </div>
                </>
              )}

              {/* Line Selector - only show in line mode */}
              {practiceMode === 'line' && currentParagraph && (
                <>
                  <p className="text-sm text-purple-300 mb-3">Select Line</p>
                  <div className="flex flex-wrap gap-2">
                    {currentParagraph.lines.map((line) => (
                      <motion.button
                        key={line.id}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => setSelectedLine(line.id)}
                        className={`px-4 py-2 rounded-lg font-medium transition-all ${
                          selectedLine === line.id
                            ? 'bg-gradient-to-r from-green-600 to-teal-600 text-white'
                            : 'bg-white/5 text-purple-300 hover:bg-white/10'
                        }`}
                      >
                        Line {line.id}
                      </motion.button>
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* Swara Notation Display */}
            <motion.div
              key={`${practiceMode}-${selectedParagraph}-${selectedLine}`}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="p-8 rounded-2xl bg-white/5 backdrop-blur-lg border border-white/10 mb-6"
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-semibold text-purple-300">
                  {practiceMode === 'full' ? 'Full Chant' :
                   practiceMode === 'paragraph' ? `Paragraph ${selectedParagraph}` :
                   `Para ${selectedParagraph} - Line ${selectedLine}`}
                </h3>

                {/* Advanced Mode Toggle - only show in full chant mode */}
                {practiceMode === 'full' && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-purple-300">Display:</span>
                    <button
                      onClick={() => setAdvancedMode(!advancedMode)}
                      className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                        advancedMode
                          ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white'
                          : 'bg-white/10 text-purple-300 hover:bg-white/20'
                      }`}
                    >
                      {advancedMode ? 'Word Mode' : 'Letter Mode'}
                    </button>
                  </div>
                )}
              </div>

              {/* Display all lines in current practice mode */}
              {displayLines.map((line, lineIdx) => (
                <div key={`line-${lineIdx}`} className="mb-8 last:mb-0">
                  {/* Show line number if displaying multiple lines */}
                  {displayLines.length > 1 && (
                    <p className="text-sm text-purple-400 mb-3">Line {line.id}</p>
                  )}

                  {/* Sanskrit with Swara indicators */}
                  {!advancedMode || practiceMode !== 'full' ? (
                    // Letter-by-letter mode (default)
                    <div className="flex flex-wrap gap-x-4 gap-y-16 md:gap-x-3 md:gap-y-16">
                      {line.sanskrit.map((syllable: SyllableWithSwara, index: number) => {
                        // Calculate global syllable index across all displayed lines
                        const globalIndex = displayLines.slice(0, lineIdx).reduce((sum, l) => sum + l.sanskrit.length, 0) + index;
                        const match = syllableMatches.find(m => m.syllableIndex === globalIndex);
                        const comprehensiveResult = comprehensiveResults.find(r => r.syllableIndex === globalIndex);
                        const isRecordingActive = isRecording && currentSyllableIndex === globalIndex;
                        const hasFeedback = match !== undefined;
                        const hasSwaraFeedback = isSwaraReady && comprehensiveResult !== undefined;

                        // Calculate syllable timing using swara-based weights
                        let isThisSyllableActive = false;
                        if (isPlaying && audioProgress > 0) {
                          const syllableTimings = calculateSyllableTimings(line, lineIdx);
                          if (syllableTimings.length > index) {
                            const timing = syllableTimings[index];
                            isThisSyllableActive = audioProgress >= timing.start && audioProgress < timing.end;
                            if (isThisSyllableActive) {
                              console.log(`Active syllable ${index}: ${syllable.text}, time: ${audioProgress.toFixed(2)}s, range: ${timing.start.toFixed(2)}-${timing.end.toFixed(2)}`);
                            }
                          }
                        }

                        return (
                          <motion.div
                            key={globalIndex}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.05 }}
                            className="relative"
                          >
                            {/* Swara symbol above with feedback - just colored arrow, no box */}
                            <div className={`absolute -top-8 left-1/2 -translate-x-1/2 transition-all ${
                              hasSwaraFeedback
                                ? `${getSwaraFeedbackColor(comprehensiveResult.swaraAccuracy).split(' ')[0]} text-3xl font-bold drop-shadow-lg`
                                : 'text-gray-400 text-2xl'
                            }`}>
                              {getSwaraSymbol(syllable.swara)}
                            </div>

                            {/* Syllable with feedback */}
                            <motion.div
                              animate={isRecordingActive ? { scale: [1, 1.1, 1] } : { scale: 1 }}
                              transition={isRecordingActive ? { repeat: Infinity, duration: 0.8 } : {}}
                              className={`relative px-4 py-3 rounded-xl border-2 font-bold text-2xl transition-all ${
                                hasFeedback
                                  ? getFeedbackColor(match.accuracy)
                                  : isRecordingActive
                                  ? 'border-cyan-500 bg-cyan-500/30 ring-2 ring-cyan-400'
                                  : getSwaraColor(syllable.swara)
                              }`}
                            >
                              {/* Audio progress overlay */}
                              {isThisSyllableActive && (
                                <motion.div
                                  initial={{ opacity: 0 }}
                                  animate={{ opacity: [0.3, 0.5, 0.3] }}
                                  transition={{ duration: 1, repeat: Infinity }}
                                  className="absolute inset-0 rounded-xl bg-gradient-to-r from-cyan-400/40 to-purple-400/40 pointer-events-none z-10"
                                />
                              )}
                              <span className="relative z-20">{syllable.text}</span>
                            </motion.div>

                            {/* Romanization below */}
                            {syllable.romanization && (
                              <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-xs text-purple-300 whitespace-nowrap">
                                {syllable.romanization}
                              </div>
                            )}
                          </motion.div>
                        );
                      })}
                    </div>
                  ) : (
                    // Word-by-word mode (advanced)
                    <div className="flex flex-wrap gap-x-6 gap-y-16">
                      {groupSyllablesIntoWords(line).map((word, wordIdx) => {
                        // Calculate global start index for this word
                        const lineStartIndex = displayLines.slice(0, lineIdx).reduce((sum, l) => sum + l.sanskrit.length, 0);
                        const wordStartGlobalIndex = lineStartIndex + word.startIndex;

                        // Calculate average accuracy for the word
                        const wordMatches = word.syllables.map((_, idx) => {
                          const globalIdx = wordStartGlobalIndex + idx;
                          return syllableMatches.find(m => m.syllableIndex === globalIdx);
                        }).filter(m => m !== undefined);

                        const wordAccuracy = wordMatches.length > 0
                          ? wordMatches.every(m => m.accuracy === 'perfect') ? 'perfect'
                            : wordMatches.every(m => m.accuracy === 'perfect' || m.accuracy === 'good') ? 'good'
                            : wordMatches.some(m => m.accuracy === 'fair') ? 'fair'
                            : 'poor'
                          : undefined;

                        // Calculate word timing using swara-based weights
                        const currentLineForWord = displayLines[lineIdx];
                        let isThisWordActive = false;
                        if (isPlaying && audioProgress > 0) {
                          const syllableTimings = calculateSyllableTimings(currentLineForWord, lineIdx);
                          const wordStartSyllableIdx = word.startIndex;
                          const wordEndSyllableIdx = word.startIndex + word.syllables.length;

                          if (syllableTimings.length > wordStartSyllableIdx) {
                            const wordStartTime = syllableTimings[wordStartSyllableIdx].start;
                            const wordEndTime = wordEndSyllableIdx < syllableTimings.length
                              ? syllableTimings[wordEndSyllableIdx].start
                              : syllableTimings[syllableTimings.length - 1].end;
                            isThisWordActive = audioProgress >= wordStartTime && audioProgress < wordEndTime;
                          }
                        }

                        return (
                          <motion.div
                            key={`word-${wordIdx}`}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: wordIdx * 0.1 }}
                            className="relative"
                          >
                            {/* Word container with mixed colors and overall border */}
                            <div className={`relative flex rounded-xl border-2 ${
                              wordAccuracy ? getFeedbackColor(wordAccuracy) : 'border-white/20'
                            }`}>
                              {/* Audio progress overlay */}
                              {isThisWordActive && (
                                <motion.div
                                  initial={{ opacity: 0 }}
                                  animate={{ opacity: [0.3, 0.5, 0.3] }}
                                  transition={{ duration: 1, repeat: Infinity }}
                                  className="absolute inset-0 rounded-xl bg-gradient-to-r from-cyan-400/40 to-purple-400/40 pointer-events-none z-10"
                                />
                              )}

                              {word.syllables.map((syllable, sylIdx) => {
                                const globalIdx = wordStartGlobalIndex + sylIdx;
                                const comprehensiveResult = comprehensiveResults.find(r => r.syllableIndex === globalIdx);
                                const isRecordingActive = isRecording && currentSyllableIndex === globalIdx;
                                const hasSwaraFeedback = isSwaraReady && comprehensiveResult !== undefined;

                                return (
                                  <div key={`syl-${sylIdx}`} className="relative">
                                    {/* Swara symbol above syllable */}
                                    <div className={`absolute -top-7 left-1/2 -translate-x-1/2 transition-all ${
                                      hasSwaraFeedback
                                        ? `${getSwaraFeedbackColor(comprehensiveResult.swaraAccuracy).split(' ')[0]} text-2xl font-bold drop-shadow-lg`
                                        : 'text-gray-400 text-xl'
                                    }`}>
                                      {getSwaraSymbol(syllable.swara)}
                                    </div>

                                    {/* Syllable with color based on individual swara */}
                                    <motion.div
                                      animate={isRecordingActive ? { scale: [1, 1.1, 1] } : { scale: 1 }}
                                      transition={isRecordingActive ? { repeat: Infinity, duration: 0.8 } : {}}
                                      className={`px-3 py-2 font-bold text-xl relative z-0 ${
                                        isRecordingActive
                                          ? 'bg-cyan-500/30 text-cyan-200'
                                          : getSwaraColor(syllable.swara)
                                      }`}
                                    >
                                      {syllable.text}
                                    </motion.div>
                                  </div>
                                );
                              })}
                            </div>

                            {/* Romanization below word */}
                            <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-xs text-purple-300 whitespace-nowrap">
                              {word.syllables.map(s => s.romanization).join('')}
                            </div>
                          </motion.div>
                        );
                      })}
                    </div>
                  )}
                </div>
              ))}

              {/* Audio Controls */}
              <div className="space-y-4 pt-8 border-t border-white/10">
                <div className="flex items-center gap-4">
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={togglePlayAudio}
                    className="flex items-center gap-2 px-6 py-3 rounded-full bg-gradient-to-r from-purple-600 to-cyan-600 hover:from-purple-500 hover:to-cyan-500 font-medium transition-all"
                  >
                    {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
                    {isPlaying ? 'Pause' : 'Play'}{' '}
                    {practiceMode === 'line'
                      ? `Line ${selectedLine}`
                      : practiceMode === 'paragraph'
                      ? `Paragraph ${selectedParagraph}`
                      : 'Full Chant'}
                  </motion.button>
                  <Volume2 className="w-5 h-5 text-purple-400" />
                </div>
              </div>
            </motion.div>

            {/* Recording Controls */}
            <div className="p-6 rounded-2xl bg-white/5 backdrop-blur-lg border border-white/10">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-purple-300">Your Practice</h3>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-purple-300">Mode:</span>
                  <button
                    onClick={() => setAnalysisMode(analysisMode === 'phonetic' ? 'pitch' : 'phonetic')}
                    className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                      analysisMode === 'phonetic'
                        ? 'bg-gradient-to-r from-purple-600 to-cyan-600 text-white'
                        : 'bg-white/10 text-purple-300 hover:bg-white/20'
                    }`}
                  >
                    {analysisMode === 'phonetic' ? 'Phonetic' : 'Pitch-only'}
                  </button>
                </div>
              </div>
              <div className="flex items-center gap-4 flex-wrap">
                {!isRecording ? (
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={startRecording}
                    className="flex items-center gap-2 px-6 py-3 rounded-full bg-gradient-to-r from-red-600 to-pink-600 hover:from-red-500 hover:to-pink-500 font-medium transition-all"
                  >
                    <Mic className="w-5 h-5" />
                    Start Recording
                  </motion.button>
                ) : (
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={stopRecording}
                    animate={{ scale: [1, 1.05, 1] }}
                    transition={{ repeat: Infinity, duration: 1.5 }}
                    className="flex items-center gap-2 px-6 py-3 rounded-full bg-gradient-to-r from-red-600 to-pink-600 font-medium"
                  >
                    <Square className="w-5 h-5" />
                    Stop Recording
                  </motion.button>
                )}

                {/* Save Recording Button - beside record button in Full Chant mode */}
                {canSaveRecording && practiceMode === 'full' && !saveSuccess && (
                  <motion.button
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => {
                      if (lastRecordingBlob && lastRecordingScore !== null) {
                        saveRecordingToDatabase(
                          lastRecordingBlob,
                          lastRecordingScore,
                          lastRecordingDuration,
                          lastDetailedFeedback
                        );
                      }
                    }}
                    disabled={isSaving}
                    className="flex items-center gap-2 px-6 py-3 rounded-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSaving ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-5 h-5" />
                        Save Recording
                      </>
                    )}
                  </motion.button>
                )}

                {isRecording && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex items-center gap-2 text-red-400"
                  >
                    <motion.div
                      animate={{ scale: [1, 1.2, 1] }}
                      transition={{ repeat: Infinity, duration: 1 }}
                      className="w-3 h-3 rounded-full bg-red-500"
                    />
                    Recording...
                  </motion.div>
                )}

                {isAnalyzing && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex items-center gap-2 text-purple-400"
                  >
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Analyzing your pitch...
                  </motion.div>
                )}

                {saveSuccess && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="flex items-center gap-2 text-green-400 font-semibold"
                  >
                    <CheckCircle2 className="w-5 h-5" />
                    Recording saved! Redirecting to dashboard...
                  </motion.div>
                )}

                {saveError && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex items-center gap-2 text-red-400 text-sm"
                  >
                    ⚠️ {saveError}
                  </motion.div>
                )}
              </div>
            </div>
          </div>

          {/* Sidebar - Results & Progress */}
          <div className="lg:col-span-1">
            {/* Accuracy Score */}
            <AnimatePresence>
              {accuracyScore !== null && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="mb-6 p-6 rounded-2xl bg-gradient-to-br from-purple-600/20 to-cyan-600/20 backdrop-blur-lg border border-purple-400/30"
                >
                  <h3 className="text-lg font-semibold mb-4 text-purple-300">Accuracy Score</h3>
                  <div className="relative w-32 h-32 mx-auto mb-4">
                    <svg className="w-full h-full transform -rotate-90">
                      <circle
                        cx="64"
                        cy="64"
                        r="56"
                        stroke="currentColor"
                        strokeWidth="8"
                        fill="none"
                        className="text-white/10"
                      />
                      <motion.circle
                        cx="64"
                        cy="64"
                        r="56"
                        stroke="url(#gradient)"
                        strokeWidth="8"
                        fill="none"
                        strokeLinecap="round"
                        initial={{ strokeDasharray: '0 352' }}
                        animate={{
                          strokeDasharray: `${(accuracyScore / 100) * 352} 352`,
                        }}
                        transition={{ duration: 1, ease: 'easeOut' }}
                      />
                      <defs>
                        <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                          <stop offset="0%" stopColor="#a855f7" />
                          <stop offset="100%" stopColor="#06b6d4" />
                        </linearGradient>
                      </defs>
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-4xl font-bold">{accuracyScore}%</span>
                    </div>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between items-center">
                      <span className="text-purple-300">Pronunciation</span>
                      <span className="text-white font-medium">
                        {isPronunciationReady
                          ? `${phoneticAccuracy !== null ? phoneticAccuracy.toFixed(1) : '0'}%`
                          : <Loader2 className="w-4 h-4 animate-spin" />}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-purple-300">Swara Accuracy</span>
                      <span className="text-white font-medium">
                        {isSwaraReady
                          ? `${swaraAccuracy !== null ? swaraAccuracy.toFixed(1) : '0'}%`
                          : isPronunciationReady
                          ? <Loader2 className="w-4 h-4 animate-spin" />
                          : 'Pending...'}
                      </span>
                    </div>
                    <div className="flex justify-between border-t border-white/10 pt-2 mt-2">
                      <span className="text-purple-300 font-semibold">Overall Score</span>
                      <span className="text-white font-bold">
                        {accuracyScore}%
                      </span>
                    </div>
                  </div>

                  {/* Color Legend */}
                  {syllableMatches.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-white/10">
                      <p className="text-xs text-purple-300 mb-2">Feedback Colors:</p>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="flex items-center gap-1">
                          <div className="w-3 h-3 rounded-full bg-green-500"></div>
                          <span>Perfect</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                          <span>Good</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <div className="w-3 h-3 rounded-full bg-orange-500"></div>
                          <span>Fair</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <div className="w-3 h-3 rounded-full bg-red-500"></div>
                          <span>Needs work</span>
                        </div>
                      </div>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Feedback Section - Pronunciation & Swara Errors */}
            {lastDetailedFeedback && analysisMode === 'phonetic' && (
              <AnimatePresence>
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mb-6 p-6 rounded-2xl bg-gradient-to-br from-purple-500/10 to-cyan-500/10 backdrop-blur-lg border border-purple-400/30"
                >
                  <h3 className="text-lg font-semibold mb-4 text-purple-300 flex items-center gap-2">
                    <span className="text-2xl">💡</span>
                    Detailed Feedback
                  </h3>

                  {/* Summary Stats */}
                  <div className="mb-4 p-3 rounded-lg bg-white/5 border border-white/10">
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="text-purple-300">Pronunciation:</span>
                        <span className="ml-2 text-white font-semibold">
                          {lastDetailedFeedback.summary.correctPronunciation}/{lastDetailedFeedback.summary.totalSyllables}
                        </span>
                      </div>
                      <div>
                        <span className="text-purple-300">Swaras:</span>
                        <span className="ml-2 text-white font-semibold">
                          {lastDetailedFeedback.summary.correctSwaras}/{lastDetailedFeedback.summary.totalSyllables}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Pronunciation Mistakes */}
                  <div className="mb-4">
                    <h4 className="text-sm font-semibold text-cyan-300 mb-2">
                      📝 Pronunciation Mistakes ({lastDetailedFeedback.pronunciationMistakes.length})
                    </h4>
                    <div className="space-y-2 text-sm max-h-60 overflow-y-auto">
                      {lastDetailedFeedback.pronunciationMistakes.length > 0 ? (
                        lastDetailedFeedback.pronunciationMistakes.map((mistake, idx) => (
                          <motion.div
                            key={idx}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: idx * 0.05 }}
                            className="p-2 rounded-lg bg-white/5 text-purple-200"
                          >
                            <span className="text-purple-400">#{mistake.position}</span>{' '}
                            Heard &ldquo;<span className="text-orange-300">{mistake.heard}</span>&rdquo; instead of &ldquo;<span className="text-cyan-300">{mistake.expected}</span>&rdquo;
                          </motion.div>
                        ))
                      ) : (
                        <p className="text-green-400 text-sm">✓ Perfect pronunciation!</p>
                      )}
                    </div>
                  </div>

                  {/* Swara Mistakes */}
                  <div>
                    <h4 className="text-sm font-semibold text-cyan-300 mb-2">
                      🎵 Swara Mistakes ({lastDetailedFeedback.swaraMistakes.length})
                    </h4>
                    <div className="space-y-2 text-sm max-h-60 overflow-y-auto">
                      {lastDetailedFeedback.swaraMistakes.length > 0 ? (
                        lastDetailedFeedback.swaraMistakes.map((mistake, idx) => (
                          <motion.div
                            key={idx}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: idx * 0.05 }}
                            className="p-2 rounded-lg bg-white/5 text-purple-200"
                          >
                            <span className="text-purple-400">#{mistake.position}</span>{' '}
                            &ldquo;<span className="text-xl">{mistake.syllable}</span>&rdquo; should be <span className="text-cyan-300">{mistake.expectedSwara}</span> but heard <span className="text-orange-300">{mistake.detectedSwara}</span>
                          </motion.div>
                        ))
                      ) : (
                        <p className="text-green-400 text-sm">✓ Perfect swara accuracy!</p>
                      )}
                    </div>
                  </div>
                </motion.div>
              </AnimatePresence>
            )}

            {/* Tips - 4 Steps to Learn Vedic Chanting */}
            <div className="p-6 rounded-2xl bg-white/5 backdrop-blur-lg border border-white/10">
              <h3 className="text-lg font-semibold mb-4 text-purple-300">4 Steps to Learn Vedic Chanting</h3>
              <ul className="space-y-3 text-sm text-purple-200">
                <li className="flex gap-3">
                  <span className="text-cyan-400 font-bold shrink-0">Step 1:</span>
                  <span><span className="font-semibold text-purple-100">Recite slowly</span> - Focus on pronouncing each akshara correctly. No swaras, no sandhi rules yet.</span>
                </li>
                <li className="flex gap-3">
                  <span className="text-cyan-400 font-bold shrink-0">Step 2:</span>
                  <span><span className="font-semibold text-purple-100">Apply sandhi</span> - Speed up slightly and combine syllables using sandhi rules (e.g., एकदंताय → ekadantāya).</span>
                </li>
                <li className="flex gap-3">
                  <span className="text-cyan-400 font-bold shrink-0">Step 3:</span>
                  <span><span className="font-semibold text-purple-100">Add swaras slowly</span> - Chant with correct pitch changes (udātta, anudātta, swarita). Listen carefully to the reference.</span>
                </li>
                <li className="flex gap-3">
                  <span className="text-cyan-400 font-bold shrink-0">Step 4:</span>
                  <span><span className="font-semibold text-purple-100">Flow naturally</span> - After perfecting steps 1-3, chant smoothly in one continuous flow with proper rhythm.</span>
                </li>
                <li className="flex gap-2 pt-3 border-t border-white/10 mt-3">
                  <span className="text-cyan-400">💡</span>
                  <span className="text-cyan-200">
                    {analysisMode === 'phonetic'
                      ? 'This app analyzes pronunciation and swara accuracy to help you master all 4 steps.'
                      : 'Pitch mode focuses on swara and rhythm matching.'}
                  </span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Word-by-Word Practice Modal */}
      {showWordByWord && currentLine && (
        <WordByWordPractice
          words={getWordsFromCurrentLine()}
          lineAudioUrl={mantra?.audioUrl}
          onComplete={() => {
            setShowWordByWord(false);
            // Optionally auto-advance to next line
          }}
          onExit={() => setShowWordByWord(false)}
        />
      )}

      {/* Hidden audio element */}
      <audio ref={audioRef} src={mantra.audioUrl} onEnded={() => setIsPlaying(false)} />
    </div>
  );
}
