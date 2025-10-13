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
  SwaraSyllableMatch,
  SyllableWithSwara,
  SwaraType,
} from '@/lib/pitchDetection';
import { analyzeMantraChanting, SyllableAnalysisResult } from '@/lib/syllableAnalyzer';

interface Line {
  id: number;
  sanskrit: SyllableWithSwara[];
  audioStartTime?: number; // in seconds
  audioEndTime?: number; // in seconds
}

interface Paragraph {
  id: number;
  lines: Line[];
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
        lines: [
          {
            id: 1,
            audioStartTime: 0,
            audioEndTime: 9,
            sanskrit: [
              { text: 'ओम्', swara: 'udhaata', romanization: 'Om' },
              { text: 'ए', swara: 'udhaata', romanization: 'E' },
              { text: 'क', swara: 'udhaata', romanization: 'ka' },
              { text: 'दं', swara: 'anudhaata', romanization: 'daṃ' },
              { text: 'ता', swara: 'udhaata', romanization: 'tā' },
              { text: 'य', swara: 'swarita', romanization: 'ya' },
              { text: 'वि', swara: 'anudhaata', romanization: 'vi' },
              { text: 'द्म', swara: 'udhaata', romanization: 'dma' },
              { text: 'हे', swara: 'swarita', romanization: 'he' },
            ] as SyllableWithSwara[],
          },
          {
            id: 2,
            audioStartTime: 10,
            audioEndTime: 15,
            sanskrit: [
              { text: 'व', swara: 'udhaata', romanization: 'Va' },
              { text: 'क्र', swara: 'udhaata', romanization: 'kra' },
              { text: 'तुं', swara: 'anudhaata', romanization: 'tuṃ' },
              { text: 'डा', swara: 'udhaata', romanization: 'ḍā' },
              { text: 'य', swara: 'swarita', romanization: 'ya' },
              { text: 'धी', swara: 'udhaata', romanization: 'dhī' },
              { text: 'म', swara: 'udhaata', romanization: 'ma' },
              { text: 'हि', swara: 'udhaata', romanization: 'hi' },
            ] as SyllableWithSwara[],
          },
          {
            id: 3,
            audioStartTime: 15,
            audioEndTime: 999,
            sanskrit: [
              { text: 'त', swara: 'udhaata', romanization: 'Taṃ' },
              { text: 'न्नो', swara: 'swarita', romanization: 'no' },
              { text: 'द', swara: 'udhaata', romanization: 'daṃ' },
              { text: 'न्तिः', swara: 'udhaata', romanization: 'tiḥ' },
              { text: 'प्र', swara: 'udhaata', romanization: 'pra' },
              { text: 'चो', swara: 'anudhaata', romanization: 'cho' },
              { text: 'द', swara: 'udhaata', romanization: 'da' },
              { text: 'यात्', swara: 'dheerga', romanization: 'yāt' },
            ] as SyllableWithSwara[],
          },
        ],
      },
    ],
    audioUrl: '/audio/Ganesha_Gayatri_Mantra.mp3',
  },
  'ganapathi-atharva-shirsham': {
    title: 'Ganapathi Atharva Shirsham',
    category: 'Atharvaveda',
    paragraphs: [
      {
        id: 1,
        lines: [
          {
            id: 1,
            sanskrit: [
              { text: 'ॐ', swara: 'udhaata', romanization: 'Om' },
              { text: 'न', swara: 'swarita', romanization: 'na' },
              { text: 'मस्', swara: 'swarita', romanization: 'mas' },
              { text: 'ते', swara: 'anudhaata', romanization: 'tē' },
              { text: 'ग', swara: 'anudhaata', romanization: 'ga' },
              { text: 'ण', swara: 'udhaata', romanization: 'ṇa' },
              { text: 'प', swara: 'swarita', romanization: 'pa' },
              { text: 'त', swara: 'udhaata', romanization: 'ta' },
              { text: 'ये', swara: 'anudhaata', romanization: 'yē' },
            ] as SyllableWithSwara[],
          },
          {
            id: 2,
            sanskrit: [
              { text: 'त्व', swara: 'anudhaata', romanization: 'tva' },
              { text: 'मे', swara: 'udhaata', romanization: 'mē' },
              { text: 'व', swara: 'udhaata', romanization: 'va' },
              { text: 'प्', swara: 'udhaata', romanization: 'p' },
              { text: 'प्रत्', swara: 'udhaata', romanization: 'prat' },
              { text: 'य', swara: 'udhaata', romanization: 'ya' },
              { text: 'क्', swara: 'udhaata', romanization: 'k' },
              { text: 'श', swara: 'anudhaata', romanization: 'śha' },
              { text: 'न्', swara: 'udhaata', romanization: 'n' },
              { text: 'तत्', swara: 'swarita', romanization: 'tat' },
              { text: 'त्व', swara: 'swarita', romanization: 'tva' },
              { text: 'म', swara: 'udhaata', romanization: 'ma' },
              { text: 'सि', swara: 'udhaata', romanization: 'si' },
            ] as SyllableWithSwara[],
          },
          {
            id: 3,
            sanskrit: [
              { text: 'त्व', swara: 'anudhaata', romanization: 'tva' },
              { text: 'मे', swara: 'udhaata', romanization: 'mē' },
              { text: 'व', swara: 'udhaata', romanization: 'va' },
              { text: 'के', swara: 'anudhaata', romanization: 'kē' },
              { text: 'व', swara: 'udhaata', romanization: 'va' },
              { text: 'लं', swara: 'udhaata', romanization: 'laṃ' },
              { text: 'कर्', swara: 'udhaata', romanization: 'kar' },
              { text: 'ता', swara: 'dheerga', romanization: 'tā' },
              { text: 'सि', swara: 'anudhaata', romanization: 'si' },
            ] as SyllableWithSwara[],
          },
          {
            id: 4,
            sanskrit: [
              { text: 'त्व', swara: 'anudhaata', romanization: 'tva' },
              { text: 'मे', swara: 'udhaata', romanization: 'mē' },
              { text: 'व', swara: 'udhaata', romanization: 'va' },
              { text: 'के', swara: 'anudhaata', romanization: 'kē' },
              { text: 'व', swara: 'udhaata', romanization: 'va' },
              { text: 'लं', swara: 'udhaata', romanization: 'laṃ' },
              { text: 'हर्', swara: 'udhaata', romanization: 'har' },
              { text: 'ता', swara: 'dheerga', romanization: 'tā' },
              { text: 'सि', swara: 'anudhaata', romanization: 'si' },
            ] as SyllableWithSwara[],
          },
        ],
      },
      {
        id: 2,
        lines: [
          {
            id: 1,
            sanskrit: [
              { text: 'त्व', swara: 'anudhaata', romanization: 'tva' },
              { text: 'मे', swara: 'udhaata', romanization: 'mē' },
              { text: 'व', swara: 'udhaata', romanization: 'va' },
              { text: 'सर्', swara: 'udhaata', romanization: 'sar' },
              { text: 'व', swara: 'udhaata', romanization: 'va' },
              { text: 'ख', swara: 'udhaata', romanization: 'kha' },
              { text: 'ल्', swara: 'udhaata', romanization: 'l' },
              { text: 'वि', swara: 'anudhaata', romanization: 'vi' },
              { text: 'दं', swara: 'swarita', romanization: 'daṃ' },
              { text: 'ब्रम्', swara: 'udhaata', romanization: 'bram' },
              { text: 'हा', swara: 'anudhaata', romanization: 'hā' },
              { text: 'सि', swara: 'udhaata', romanization: 'si' },
            ] as SyllableWithSwara[],
          },
          {
            id: 2,
            sanskrit: [
              { text: 'त्वं', swara: 'anudhaata', romanization: 'tvaṃ' },
              { text: 'सा', swara: 'udhaata', romanization: 'sā' },
              { text: 'क्', swara: 'udhaata', romanization: 'k' },
              { text: 'षा', swara: 'swarita', romanization: 'ṣhā' },
              { text: 'दा', swara: 'anudhaata', romanization: 'dā' },
              { text: 'त्', swara: 'swarita', romanization: 't' },
              { text: 'मा', swara: 'dheerga', romanization: 'mā' },
              { text: 'सि', swara: 'udhaata', romanization: 'si' },
              { text: 'नि', swara: 'anudhaata', romanization: 'ni' },
              { text: 'त्', swara: 'udhaata', romanization: 't' },
              { text: 'यम्', swara: 'udhaata', romanization: 'yam' },
            ] as SyllableWithSwara[],
          },
        ],
      },
      {
        id: 3,
        lines: [
          {
            id: 1,
            sanskrit: [
              { text: 'ऋ', swara: 'udhaata', romanization: 'Ṛ' },
              { text: 'तं', swara: 'udhaata', romanization: 'taṃ' },
              { text: 'व', swara: 'anudhaata', romanization: 'va' },
              { text: 'च्', swara: 'udhaata', romanization: 'ch' },
              { text: 'मि', swara: 'udhaata', romanization: 'mi' },
              { text: 'सत्', swara: 'swarita', romanization: 'sat' },
              { text: 'यं', swara: 'udhaata', romanization: 'yaṃ' },
              { text: 'व', swara: 'anudhaata', romanization: 'va' },
              { text: 'च्', swara: 'udhaata', romanization: 'ch' },
              { text: 'मि', swara: 'udhaata', romanization: 'mi' },
            ] as SyllableWithSwara[],
          },
        ],
      },
      {
        id: 4,
        lines: [
          {
            id: 1,
            sanskrit: [
              { text: 'अ', swara: 'udhaata', romanization: 'a' },
              { text: 'व', swara: 'swarita', romanization: 'va' },
              { text: 'त', swara: 'udhaata', romanization: 'ta' },
              { text: 'त्वं', swara: 'udhaata', romanization: 'tvaṃ' },
              { text: 'माम्', swara: 'udhaata', romanization: 'mām' },
              { text: 'अ', swara: 'udhaata', romanization: 'a' },
              { text: 'व', swara: 'swarita', romanization: 'va' },
              { text: 'व', swara: 'udhaata', romanization: 'va' },
              { text: 'क्', swara: 'udhaata', romanization: 'k' },
              { text: 'ता', swara: 'dheerga', romanization: 'tā' },
              { text: 'रं', swara: 'udhaata', romanization: 'raṃ' },
            ] as SyllableWithSwara[],
          },
          {
            id: 2,
            sanskrit: [
              { text: 'सर्', swara: 'udhaata', romanization: 'sar' },
              { text: 'व', swara: 'udhaata', romanization: 'va' },
              { text: 'तो', swara: 'udhaata', romanization: 'tō' },
              { text: 'मां', swara: 'udhaata', romanization: 'māṃ' },
              { text: 'पा', swara: 'udhaata', romanization: 'pā' },
              { text: 'हि', swara: 'udhaata', romanization: 'hi' },
              { text: 'पा', swara: 'swarita', romanization: 'pā' },
              { text: 'हि', swara: 'anudhaata', romanization: 'hi' },
              { text: 'स', swara: 'udhaata', romanization: 'sa' },
              { text: 'म', swara: 'anudhaata', romanization: 'ma' },
              { text: 'न्', swara: 'udhaata', romanization: 'n' },
              { text: 'ता', swara: 'anudhaata', romanization: 'tā' },
              { text: 'ते', swara: 'udhaata', romanization: 'tē' },
            ] as SyllableWithSwara[],
          },
        ],
      },
      {
        id: 5,
        lines: [
          {
            id: 1,
            sanskrit: [
              { text: 'त्वं', swara: 'udhaata', romanization: 'tvaṃ' },
              { text: 'वाङ्', swara: 'udhaata', romanization: 'vāṅ' },
              { text: 'म', swara: 'swarita', romanization: 'ma' },
              { text: 'यस्', swara: 'swarita', romanization: 'yas' },
              { text: 'त्वं', swara: 'udhaata', romanization: 'tvaṃ' },
              { text: 'चिन्', swara: 'udhaata', romanization: 'chin' },
              { text: 'म', swara: 'anudhaata', romanization: 'ma' },
              { text: 'य', swara: 'udhaata', romanization: 'ya' },
              { text: 'ह', swara: 'udhaata', romanization: 'ha' },
            ] as SyllableWithSwara[],
          },
          {
            id: 2,
            sanskrit: [
              { text: 'न', swara: 'udhaata', romanization: 'na' },
              { text: 'मो', swara: 'swarita', romanization: 'mō' },
              { text: 'व्', swara: 'udhaata', romanization: 'v' },
              { text: 'रा', swara: 'udhaata', romanization: 'rā' },
              { text: 'त', swara: 'udhaata', romanization: 'ta' },
              { text: 'प', swara: 'udhaata', romanization: 'pa' },
              { text: 'त', swara: 'anudhaata', romanization: 'ta' },
              { text: 'ये', swara: 'anudhaata', romanization: 'yē' },
              { text: 'न', swara: 'udhaata', romanization: 'na' },
              { text: 'मो', swara: 'udhaata', romanization: 'mō' },
              { text: 'ग', swara: 'udhaata', romanization: 'ga' },
              { text: 'ण', swara: 'udhaata', romanization: 'ṇa' },
              { text: 'प', swara: 'swarita', romanization: 'pa' },
              { text: 'त', swara: 'udhaata', romanization: 'ta' },
              { text: 'ये', swara: 'anudhaata', romanization: 'yē' },
              { text: 'न', swara: 'udhaata', romanization: 'na' },
              { text: 'मः', swara: 'udhaata', romanization: 'maḥ' },
            ] as SyllableWithSwara[],
          },
        ],
      },
    ],
    audioUrl: '', // Audio file to be added later
  },
};

export default function PracticePage() {
  const params = useParams();
  const mantraId = params.mantraId as string;
  const mantra = mantraData[mantraId] || mantraData.gayatri;

  const [practiceMode, setPracticeMode] = useState<'line' | 'paragraph' | 'full'>('line');
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

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const pitchDetectorRef = useRef<RealtimePitchDetector | null>(null);
  const userPitchDataRef = useRef<PitchData[]>([]);
  const recordingStartTimeRef = useRef<number>(0);

  const currentParagraph = mantra.paragraphs.find((p) => p.id === selectedParagraph);
  const currentLine = currentParagraph?.lines.find((l) => l.id === selectedLine);

  // Get the content to display based on practice mode
  const getDisplayContent = () => {
    if (practiceMode === 'line' && currentLine) {
      return [currentLine];
    } else if (practiceMode === 'paragraph' && currentParagraph) {
      return currentParagraph.lines;
    } else if (practiceMode === 'full') {
      return mantra.paragraphs.flatMap(p => p.lines);
    }
    return [];
  };

  const displayLines = getDisplayContent();

  // Get all syllables for the current practice mode
  const getCurrentSyllables = () => {
    return displayLines.flatMap(line => line.sanskrit);
  };

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
              const response = await fetch(mantra.audioUrl);
              const arrayBuffer = await response.arrayBuffer();
              const audioContext = new AudioContext();
              referenceAudioBuffer = await audioContext.decodeAudioData(arrayBuffer);
              audioContext.close();
              console.log('Reference audio loaded for comparison');
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
              audioBlob  // Pass the blob for speech recognition
            );

            console.log('Comprehensive analysis result:', result);

            // Update pronunciation results first
            setPhoneticAccuracy(result.pronunciationAccuracy);
            setAccuracyScore(result.pronunciationAccuracy);
            setIsPronunciationReady(true);

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
            }

            console.log('Pronunciation Accuracy:', result.pronunciationAccuracy);
            console.log('Swara Accuracy:', result.swaraAccuracy);
            console.log('Overall Score:', result.overallScore);

            if (result.feedback.length > 0) {
              console.log('Feedback:', result.feedback.join('; '));
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

            console.log('Analysis result:', result);
            }
          } else {
            alert('Unable to analyze audio. Please try again.');
          }

          audioContext.close();
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

              {/* Paragraph Selector - only show when not in full mode */}
              {practiceMode !== 'full' && (
                <>
                  <p className="text-sm text-purple-300 mb-3">Select Paragraph</p>
                  <div className="flex flex-wrap gap-2 mb-4">
                    {mantra.paragraphs.map((para) => (
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
              <h3 className="text-xl font-semibold mb-6 text-purple-300">
                {practiceMode === 'full' ? 'Full Chant' :
                 practiceMode === 'paragraph' ? `Paragraph ${selectedParagraph}` :
                 `Para ${selectedParagraph} - Line ${selectedLine}`}
              </h3>

              {/* Display all lines in current practice mode */}
              {displayLines.map((line, lineIdx) => (
                <div key={`line-${lineIdx}`} className="mb-8 last:mb-0">
                  {/* Show line number if displaying multiple lines */}
                  {displayLines.length > 1 && (
                    <p className="text-sm text-purple-400 mb-3">Line {line.id}</p>
                  )}

                  {/* Sanskrit with Swara indicators */}
                  <div className="flex flex-wrap gap-x-4 gap-y-16 md:gap-x-3 md:gap-y-16">
                    {line.sanskrit.map((syllable: SyllableWithSwara, index: number) => {
                      // Calculate global syllable index across all displayed lines
                      const globalIndex = displayLines.slice(0, lineIdx).reduce((sum, l) => sum + l.sanskrit.length, 0) + index;
                      const match = syllableMatches.find(m => m.syllableIndex === globalIndex);
                      const comprehensiveResult = comprehensiveResults.find(r => r.syllableIndex === globalIndex);
                      const isRecordingActive = isRecording && currentSyllableIndex === globalIndex;
                      const hasFeedback = match !== undefined;
                      const hasSwaraFeedback = isSwaraReady && comprehensiveResult !== undefined;

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
                              ? `${getSwaraFeedbackColor(comprehensiveResult.accuracy).split(' ')[0]} text-3xl font-bold drop-shadow-lg`
                              : 'text-gray-400 text-2xl'
                          }`}>
                            {getSwaraSymbol(syllable.swara)}
                          </div>

                          {/* Syllable with feedback */}
                          <motion.div
                            animate={isRecordingActive ? { scale: [1, 1.1, 1] } : { scale: 1 }}
                            transition={isRecordingActive ? { repeat: Infinity, duration: 0.8 } : {}}
                            className={`px-4 py-3 rounded-xl border-2 font-bold text-2xl transition-all ${
                              hasFeedback
                                ? getFeedbackColor(match.accuracy)
                                : isRecordingActive
                                ? 'border-cyan-500 bg-cyan-500/30 ring-2 ring-cyan-400'
                                : getSwaraColor(syllable.swara)
                            }`}
                          >
                            {syllable.text}
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
            {comprehensiveResults.length > 0 && analysisMode === 'phonetic' && (
              <AnimatePresence>
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mb-6 p-6 rounded-2xl bg-gradient-to-br from-purple-500/10 to-cyan-500/10 backdrop-blur-lg border border-purple-400/30"
                >
                  <h3 className="text-lg font-semibold mb-4 text-purple-300 flex items-center gap-2">
                    <span className="text-2xl">💡</span>
                    Feedback
                  </h3>

                  {/* Pronunciation Errors */}
                  <div className="mb-4">
                    <h4 className="text-sm font-semibold text-cyan-300 mb-2">📝 Pronunciation</h4>
                    <div className="space-y-2 text-sm">
                      {comprehensiveResults
                        .filter(r => !r.pronunciationMatch || r.pronunciationScore < 70)
                        .slice(0, 3)
                        .map((result, idx) => (
                          <motion.div
                            key={idx}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: idx * 0.1 }}
                            className="p-2 rounded-lg bg-white/5 text-purple-200"
                          >
                            Heard &ldquo;<span className="text-orange-300">{result.transcribedText}</span>&rdquo; instead of &ldquo;<span className="text-cyan-300">{result.expectedText}</span>&rdquo;
                          </motion.div>
                        ))}
                      {comprehensiveResults.filter(r => !r.pronunciationMatch || r.pronunciationScore < 70).length === 0 && (
                        <p className="text-green-400 text-sm">✓ Perfect pronunciation!</p>
                      )}
                    </div>
                  </div>

                  {/* Swara Errors */}
                  <div>
                    <h4 className="text-sm font-semibold text-cyan-300 mb-2">🎵 Swaras</h4>
                    <div className="space-y-2 text-sm">
                      {comprehensiveResults
                        .filter(r => !r.swaraMatch)
                        .slice(0, 3)
                        .map((result, idx) => (
                          <motion.div
                            key={idx}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: idx * 0.1 }}
                            className="p-2 rounded-lg bg-white/5 text-purple-200"
                          >
                            &ldquo;<span className="text-xl">{result.expectedText}</span>&rdquo; is <span className="text-cyan-300">{result.expectedSwara}</span> but heard <span className="text-orange-300">{result.detectedSwara}</span>
                          </motion.div>
                        ))}
                      {comprehensiveResults.filter(r => !r.swaraMatch).length === 0 && (
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

      {/* Hidden audio element */}
      <audio ref={audioRef} src={mantra.audioUrl} onEnded={() => setIsPlaying(false)} />
    </div>
  );
}
