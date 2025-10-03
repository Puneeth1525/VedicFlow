'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Play, Pause, Mic, Square, Volume2, Info, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useState, useRef, useEffect } from 'react';
import { useParams } from 'next/navigation';
import {
  RealtimePitchDetector,
  PitchData,
  loadAndAnalyzeAudio,
  comparePitchSequences,
} from '@/lib/pitchDetection';

// Define swara types
type SwaraType = 'anudhaata' | 'udhaata' | 'swarita' | 'dheerga';

interface SyllableWithSwara {
  text: string;
  swara: SwaraType;
  romanization?: string;
}

interface Paragraph {
  id: number;
  sanskrit: SyllableWithSwara[];
  audioStartTime?: number; // in seconds
  audioEndTime?: number; // in seconds
}

interface MantraData {
  title: string;
  category: string;
  paragraphs: Paragraph[];
  audioUrl: string;
}

// Sample mantra data with swara notation
const mantraData: Record<string, MantraData> = {
  'ganesha-gayatri': {
    title: 'Ganesha Gayatri Mantra',
    category: 'Ganapati Upanishad',
    paragraphs: [
      {
        id: 1,
        audioStartTime: 0,
        audioEndTime: 5.5,
        sanskrit: [
          { text: 'ॐ', swara: 'anudhaata', romanization: 'Om' },
          { text: 'ए', swara: 'udhaata', romanization: 'E' },
          { text: 'का', swara: 'anudhaata', romanization: 'kā' },
          { text: 'दं', swara: 'udhaata', romanization: 'daṃ' },
          { text: 'ता', swara: 'swarita', romanization: 'tā' },
          { text: 'य', swara: 'anudhaata', romanization: 'ya' },
          { text: 'वि', swara: 'udhaata', romanization: 'vi' },
          { text: 'द्म', swara: 'swarita', romanization: 'dma' },
          { text: 'हे', swara: 'dheerga', romanization: 'he' },
        ] as SyllableWithSwara[],
      },
      {
        id: 2,
        audioStartTime: 5.5,
        audioEndTime: 10.5,
        sanskrit: [
          { text: 'व', swara: 'anudhaata', romanization: 'Va' },
          { text: 'क्र', swara: 'udhaata', romanization: 'kra' },
          { text: 'तुं', swara: 'swarita', romanization: 'tuṃ' },
          { text: 'डा', swara: 'anudhaata', romanization: 'ḍā' },
          { text: 'य', swara: 'udhaata', romanization: 'ya' },
          { text: 'धी', swara: 'dheerga', romanization: 'dhī' },
          { text: 'म', swara: 'anudhaata', romanization: 'ma' },
          { text: 'हि', swara: 'udhaata', romanization: 'hi' },
        ] as SyllableWithSwara[],
      },
      {
        id: 3,
        audioStartTime: 10.5,
        audioEndTime: 16,
        sanskrit: [
          { text: 'तं', swara: 'anudhaata', romanization: 'Taṃ' },
          { text: 'नो', swara: 'udhaata', romanization: 'no' },
          { text: 'द', swara: 'anudhaata', romanization: 'da' },
          { text: 'न्ति', swara: 'swarita', romanization: 'nti' },
          { text: 'प्र', swara: 'udhaata', romanization: 'pra' },
          { text: 'चो', swara: 'anudhaata', romanization: 'cho' },
          { text: 'द', swara: 'udhaata', romanization: 'da' },
          { text: 'या', swara: 'dheerga', romanization: 'yā' },
          { text: 'त्', swara: 'swarita', romanization: 't' },
        ] as SyllableWithSwara[],
      },
    ],
    audioUrl: '/audio/Ganesha_Gayatri_Mantra.mp3',
  },
  gayatri: {
    title: 'Gayatri Mantra',
    category: 'Rigveda 3.62.10',
    paragraphs: [
      {
        id: 1,
        sanskrit: [
          { text: 'ॐ', swara: 'anudhaata', romanization: 'Om' },
          { text: 'भूः', swara: 'udhaata', romanization: 'Bhūḥ' },
          { text: 'भुवः', swara: 'udhaata', romanization: 'Bhuvaḥ' },
          { text: 'स्वः', swara: 'dheerga', romanization: 'Svaḥ' },
        ] as SyllableWithSwara[],
      },
      {
        id: 2,
        sanskrit: [
          { text: 'तत्', swara: 'anudhaata', romanization: 'Tat' },
          { text: 'स', swara: 'anudhaata', romanization: 'sa' },
          { text: 'वि', swara: 'udhaata', romanization: 'vi' },
          { text: 'तुर्', swara: 'swarita', romanization: 'tur' },
          { text: 'वरे', swara: 'anudhaata', romanization: 'vareṇ' },
          { text: 'ण्यं', swara: 'swarita', romanization: 'yaṃ' },
        ] as SyllableWithSwara[],
      },
      {
        id: 3,
        sanskrit: [
          { text: 'भर्', swara: 'udhaata', romanization: 'Bhar' },
          { text: 'गो', swara: 'anudhaata', romanization: 'go' },
          { text: 'दे', swara: 'udhaata', romanization: 'de' },
          { text: 'वस्य', swara: 'swarita', romanization: 'vasya' },
          { text: 'धी', swara: 'dheerga', romanization: 'dhī' },
          { text: 'म', swara: 'anudhaata', romanization: 'ma' },
          { text: 'हि', swara: 'udhaata', romanization: 'hi' },
        ] as SyllableWithSwara[],
      },
      {
        id: 4,
        sanskrit: [
          { text: 'धि', swara: 'udhaata', romanization: 'Dhi' },
          { text: 'यो', swara: 'anudhaata', romanization: 'yo' },
          { text: 'यो', swara: 'udhaata', romanization: 'yo' },
          { text: 'नः', swara: 'swarita', romanization: 'naḥ' },
          { text: 'प्र', swara: 'anudhaata', romanization: 'pra' },
          { text: 'चो', swara: 'udhaata', romanization: 'cho' },
          { text: 'द', swara: 'anudhaata', romanization: 'da' },
          { text: 'यात्', swara: 'dheerga', romanization: 'yāt' },
        ] as SyllableWithSwara[],
      },
    ],
    audioUrl: '/audio/gayatri.mp3', // Placeholder
  },
};

export default function PracticePage() {
  const params = useParams();
  const mantraId = params.mantraId as string;
  const mantra = mantraData[mantraId] || mantraData.gayatri;

  const [selectedParagraph, setSelectedParagraph] = useState(1);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playAllVerses, setPlayAllVerses] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [accuracyScore, setAccuracyScore] = useState<number | null>(null);
  const [pitchAccuracy, setPitchAccuracy] = useState<number | null>(null);
  const [rhythmAccuracy, setRhythmAccuracy] = useState<number | null>(null);
  const [showInfo, setShowInfo] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [referencePitchData, setReferencePitchData] = useState<PitchData[]>([]);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const pitchDetectorRef = useRef<RealtimePitchDetector | null>(null);
  const userPitchDataRef = useRef<PitchData[]>([]);
  const recordingStartTimeRef = useRef<number>(0);

  const currentParagraph = mantra.paragraphs.find((p) => p.id === selectedParagraph);

  const getSwaraColor = (swara: SwaraType) => {
    switch (swara) {
      case 'anudhaata':
        return 'text-blue-400 bg-blue-500/20 border-blue-400/30';  // Low pitch
      case 'udhaata':
        return 'text-yellow-400 bg-yellow-500/20 border-yellow-400/30';  // Base/Stable pitch
      case 'swarita':
        return 'text-red-400 bg-red-500/20 border-red-400/30';  // Rising pitch
      case 'dheerga':
        return 'text-green-400 bg-green-500/20 border-green-400/30';  // Prolonged rising
    }
  };

  const getSwaraSymbol = (swara: SwaraType) => {
    switch (swara) {
      case 'anudhaata':
        return '↓';  // Going down
      case 'udhaata':
        return '—';  // Base/Stable
      case 'swarita':
        return '↗';  // Going up
      case 'dheerga':
        return '⤴';  // Going up and prolonged
    }
  };

  // Load reference audio pitch data when mantra changes
  useEffect(() => {
    if (mantra.audioUrl) {
      loadAndAnalyzeAudio(mantra.audioUrl)
        .then((pitchData) => {
          setReferencePitchData(pitchData);
          console.log('Reference pitch data loaded:', pitchData.length, 'points');
        })
        .catch((error) => {
          console.error('Error loading reference audio:', error);
        });
    }
  }, [mantra.audioUrl]);

  const togglePlayAudio = () => {
    if (!audioRef.current) return;

    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      // If playing a specific verse (not all verses), set the time range
      if (!playAllVerses && currentParagraph?.audioStartTime !== undefined) {
        audioRef.current.currentTime = currentParagraph.audioStartTime;
      } else {
        // Play from beginning for "Play All"
        audioRef.current.currentTime = 0;
      }
      audioRef.current.play();
      setIsPlaying(true);
    }
  };

  // Handle audio time update to stop at verse end
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleTimeUpdate = () => {
      if (!playAllVerses && currentParagraph?.audioEndTime !== undefined) {
        if (audio.currentTime >= currentParagraph.audioEndTime) {
          audio.pause();
          setIsPlaying(false);
        }
      }
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
  }, [currentParagraph, playAllVerses]);

  const startRecording = async () => {
    try {
      // Reset previous data
      userPitchDataRef.current = [];
      setAccuracyScore(null);
      setPitchAccuracy(null);
      setRhythmAccuracy(null);

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

        // Analyze the recorded audio
        setIsAnalyzing(true);
        try {
          const audioUrl = URL.createObjectURL(audioBlob);
          const userPitchData = await loadAndAnalyzeAudio(audioUrl);

          console.log('User pitch data:', userPitchData.length, 'points');
          console.log('Reference pitch data:', referencePitchData.length, 'points');

          if (referencePitchData.length > 0 && userPitchData.length > 0) {
            const result = comparePitchSequences(referencePitchData, userPitchData);

            setAccuracyScore(result.overallScore);
            setPitchAccuracy(result.pitchAccuracy);
            setRhythmAccuracy(result.rhythmAccuracy);

            console.log('Analysis result:', result);
          } else {
            alert('Unable to analyze audio. Please try again.');
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-900 text-white">
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
            {/* Paragraph Selector */}
            <div className="mb-6 p-4 rounded-2xl bg-white/5 backdrop-blur-lg border border-white/10">
              <p className="text-sm text-purple-300 mb-3">Select Paragraph</p>
              <div className="flex flex-wrap gap-2">
                {mantra.paragraphs.map((para) => (
                  <motion.button
                    key={para.id}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setSelectedParagraph(para.id)}
                    className={`px-4 py-2 rounded-lg font-medium transition-all ${
                      selectedParagraph === para.id
                        ? 'bg-gradient-to-r from-purple-600 to-cyan-600 text-white'
                        : 'bg-white/5 text-purple-300 hover:bg-white/10'
                    }`}
                  >
                    Verse {para.id}
                  </motion.button>
                ))}
              </div>
            </div>

            {/* Swara Notation Display */}
            <motion.div
              key={selectedParagraph}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="p-8 rounded-2xl bg-white/5 backdrop-blur-lg border border-white/10 mb-6"
            >
              <h3 className="text-xl font-semibold mb-6 text-purple-300">
                Verse {selectedParagraph}
              </h3>

              {/* Sanskrit with Swara indicators */}
              <div className="flex flex-wrap gap-3 mb-8">
                {currentParagraph?.sanskrit.map((syllable: SyllableWithSwara, index: number) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="relative"
                  >
                    {/* Swara symbol above */}
                    <div className="absolute -top-6 left-1/2 -translate-x-1/2 text-2xl">
                      {getSwaraSymbol(syllable.swara)}
                    </div>

                    {/* Syllable */}
                    <div
                      className={`px-4 py-3 rounded-xl border-2 ${getSwaraColor(
                        syllable.swara
                      )} font-bold text-2xl`}
                    >
                      {syllable.text}
                    </div>

                    {/* Romanization below */}
                    {syllable.romanization && (
                      <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-xs text-purple-300 whitespace-nowrap">
                        {syllable.romanization}
                      </div>
                    )}
                  </motion.div>
                ))}
              </div>

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
                    {isPlaying ? 'Pause' : 'Play'} {playAllVerses ? 'All Verses' : `Verse ${selectedParagraph}`}
                  </motion.button>
                  <Volume2 className="w-5 h-5 text-purple-400" />
                </div>

                {/* Toggle for Play All Verses */}
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setPlayAllVerses(!playAllVerses)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      playAllVerses ? 'bg-gradient-to-r from-purple-600 to-cyan-600' : 'bg-white/20'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        playAllVerses ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                  <span className="text-sm text-purple-300">Play All Verses</span>
                </div>
              </div>
            </motion.div>

            {/* Recording Controls */}
            <div className="p-6 rounded-2xl bg-white/5 backdrop-blur-lg border border-white/10">
              <h3 className="text-lg font-semibold mb-4 text-purple-300">Your Practice</h3>
              <div className="flex items-center gap-4">
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
                    <div className="flex justify-between">
                      <span className="text-purple-300">Pitch Accuracy</span>
                      <span className="text-white font-medium">
                        {pitchAccuracy !== null ? `${pitchAccuracy}%` : 'N/A'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-purple-300">Rhythm Accuracy</span>
                      <span className="text-white font-medium">
                        {rhythmAccuracy !== null ? `${rhythmAccuracy}%` : 'N/A'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-purple-300">Overall</span>
                      <span className="text-white font-medium">
                        {accuracyScore}%
                      </span>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Tips */}
            <div className="p-6 rounded-2xl bg-white/5 backdrop-blur-lg border border-white/10">
              <h3 className="text-lg font-semibold mb-4 text-purple-300">Practice Tips</h3>
              <ul className="space-y-3 text-sm text-purple-200">
                <li className="flex gap-2">
                  <span className="text-purple-400">•</span>
                  <span>Listen to the reference multiple times before recording</span>
                </li>
                <li className="flex gap-2">
                  <span className="text-purple-400">•</span>
                  <span>Pay attention to pitch changes indicated by swara markers</span>
                </li>
                <li className="flex gap-2">
                  <span className="text-purple-400">•</span>
                  <span>Start slowly and gradually increase your speed</span>
                </li>
                <li className="flex gap-2">
                  <span className="text-purple-400">•</span>
                  <span>Practice in a quiet environment for better accuracy</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Hidden audio element */}
      <audio ref={audioRef} src={mantra.audioUrl} onEnded={() => setIsPlaying(false)} />
    </div>
  );
}
