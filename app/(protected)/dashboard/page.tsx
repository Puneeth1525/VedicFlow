'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Play, Pause, TrendingUp, Award, Clock, Mic, Send, MessageSquare, X, Trash2, Flame } from 'lucide-react';
import { UserButton } from '@clerk/nextjs';
import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { formatRelativeTime } from '@/lib/format';
import OnboardingPage from '@/app/(protected)/onboarding/page';
import Image from 'next/image';

type Recording = {
  id: string;
  practiceId: string;
  audioUrl: string;
  score: number;
  submittedForReview: boolean;
  reviewStatus: string;
  mentorRemarks?: string | null;
  createdAt: string;
};

type Practice = {
  id: string;
  userId: string;
  mantraId: string;
  date: string;
  durationMs: number;
  mantra: {
    id: string;
    title: string;
    category: string;
  };
  recordings: Recording[];
};

type MantraProgress = {
  id: string;
  userId: string;
  mantraId: string;
  totalPractices: number;
  averageScore: number;
  lastPracticed: string | null;
  mantra: {
    id: string;
    title: string;
    category: string;
  };
};

type UserStats = {
  totalPractices: number;
  averageScore: number;
  currentStreak: number;
  longestStreak: number;
  totalTimeMs: number;
  lastPracticed: string | null;
};

export default function DashboardPage() {
  const [showRemarksModal, setShowRemarksModal] = useState<Recording | null>(null);
  const [userStats, setUserStats] = useState<UserStats | null>(null);
  const [mantraProgress, setMantraProgress] = useState<MantraProgress[]>([]);
  const [practices, setPractices] = useState<Practice[]>([]);
  const [loading, setLoading] = useState(true);
  const [playingRecordingId, setPlayingRecordingId] = useState<string | null>(null);
  const [onboardingComplete, setOnboardingComplete] = useState<boolean | null>(null);
  const [audioProgress, setAudioProgress] = useState<{ [key: string]: number }>({});
  const audioRefs = useRef<{ [key: string]: HTMLAudioElement }>({});
  const [modalAudioPlaying, setModalAudioPlaying] = useState(false);
  const [modalAudioProgress, setModalAudioProgress] = useState(0);
  const [modalAudioCurrentTime, setModalAudioCurrentTime] = useState(0);
  const [modalAudioDuration, setModalAudioDuration] = useState(0);
  const modalAudioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);

        // First, check onboarding status
        const userRes = await fetch('/api/user');
        if (userRes.ok) {
          const user = await userRes.json();
          setOnboardingComplete(user.onboardingComplete);

          // Only fetch dashboard data if onboarding is complete
          if (!user.onboardingComplete) {
            setLoading(false);
            return;
          }
        }

        // Fetch user stats
        const statsRes = await fetch('/api/user-stats');
        if (statsRes.ok) {
          const stats = await statsRes.json();
          setUserStats(stats);
        }

        // Fetch mantra progress
        const progressRes = await fetch('/api/mantra-progress');
        if (progressRes.ok) {
          const progress = await progressRes.json();
          setMantraProgress(progress);
        }

        // Fetch all practices
        const practicesRes = await fetch('/api/practices');
        if (practicesRes.ok) {
          const allPractices = await practicesRes.json();
          setPractices(allPractices);
        }
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  const handleSubmitForReview = async (recordingId: string) => {
    try {
      const res = await fetch('/api/submissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recordingId,
        }),
      });

      if (res.ok) {
        // Refresh practices to show updated status
        const practicesRes = await fetch('/api/practices');
        if (practicesRes.ok) {
          const allPractices = await practicesRes.json();
          setPractices(allPractices);
        }
        alert('Recording submitted for mentor review!');
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to submit recording');
      }
    } catch (error) {
      console.error('Error submitting recording:', error);
      alert('Failed to submit recording');
    }
  };

  const handleDeleteRecording = async (recordingId: string) => {
    if (!confirm('Are you sure you want to delete this recording? This action cannot be undone.')) {
      return;
    }

    try {
      const res = await fetch(`/api/recordings?id=${recordingId}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        // Refresh all data
        const [statsRes, progressRes, practicesRes] = await Promise.all([
          fetch('/api/user-stats'),
          fetch('/api/mantra-progress'),
          fetch('/api/practices'),
        ]);

        if (statsRes.ok) {
          const stats = await statsRes.json();
          setUserStats(stats);
        }

        if (progressRes.ok) {
          const progress = await progressRes.json();
          setMantraProgress(progress);
        }

        if (practicesRes.ok) {
          const allPractices = await practicesRes.json();
          setPractices(allPractices);
        }

        alert('Recording deleted successfully!');
      } else {
        throw new Error('Failed to delete recording');
      }
    } catch (error) {
      console.error('Error deleting recording:', error);
      alert('Failed to delete recording. Please try again.');
    }
  };

  const togglePlayer = (recordingId: string, audioUrl: string, e: React.MouseEvent) => {
    e.stopPropagation();

    if (playingRecordingId === recordingId) {
      // Pause current
      if (audioRefs.current[recordingId]) {
        audioRefs.current[recordingId].pause();
      }
      setPlayingRecordingId(null);
    } else {
      // Stop any currently playing audio
      if (playingRecordingId && audioRefs.current[playingRecordingId]) {
        audioRefs.current[playingRecordingId].pause();
      }

      // Create new audio if doesn't exist
      if (!audioRefs.current[recordingId]) {
        const audio = new Audio(audioUrl);
        audio.addEventListener('timeupdate', () => {
          const progress = (audio.currentTime / audio.duration) * 100;
          setAudioProgress(prev => ({ ...prev, [recordingId]: progress }));
        });
        audio.addEventListener('ended', () => {
          setPlayingRecordingId(null);
          setAudioProgress(prev => ({ ...prev, [recordingId]: 0 }));
        });
        audioRefs.current[recordingId] = audio;
      }

      // Play
      audioRefs.current[recordingId].play();
      setPlayingRecordingId(recordingId);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'from-green-500 to-emerald-500';
    if (score >= 75) return 'from-yellow-500 to-orange-500';
    return 'from-red-500 to-pink-500';
  };

  const getStatusBadge = (status: string) => {
    if (status === 'reviewed') {
      return { text: 'Reviewed', className: 'bg-green-500/20 text-green-400 border-green-400/30' };
    }
    if (status === 'under-review') {
      return { text: 'Submitted', className: 'bg-blue-500/20 text-blue-400 border-blue-400/30' };
    }
    return { text: 'In Progress', className: 'bg-slate-500/20 text-slate-400 border-slate-400/30' };
  };

  const formatDuration = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const formatTime = (seconds: number) => {
    if (isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatTotalTime = (ms: number) => {
    const totalMinutes = Math.floor(ms / (1000 * 60));
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;

    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  const getLevelName = (score: number) => {
    if (score >= 85) return 'Elite';
    if (score >= 60) return 'Pro';
    if (score >= 35) return 'Intermediate';
    return 'Amateur';
  };

  // Modal audio player controls
  useEffect(() => {
    if (!showRemarksModal) {
      // Reset and cleanup when modal closes
      if (modalAudioRef.current) {
        modalAudioRef.current.pause();
        modalAudioRef.current = null;
      }
      setModalAudioPlaying(false);
      setModalAudioProgress(0);
      setModalAudioCurrentTime(0);
      setModalAudioDuration(0);
    } else if (showRemarksModal && !modalAudioRef.current) {
      // Create new audio element when modal opens
      const audio = new Audio(`/api/serve-audio?id=${showRemarksModal.id}`);

      audio.addEventListener('timeupdate', () => {
        setModalAudioCurrentTime(audio.currentTime);
        setModalAudioProgress((audio.currentTime / audio.duration) * 100);
      });

      audio.addEventListener('durationchange', () => {
        setModalAudioDuration(audio.duration);
      });

      audio.addEventListener('ended', () => {
        setModalAudioPlaying(false);
        setModalAudioProgress(0);
      });

      audio.addEventListener('play', () => {
        setModalAudioPlaying(true);
      });

      audio.addEventListener('pause', () => {
        setModalAudioPlaying(false);
      });

      modalAudioRef.current = audio;
    }
  }, [showRemarksModal]);

  const toggleModalAudio = () => {
    if (!modalAudioRef.current) return;

    if (modalAudioPlaying) {
      modalAudioRef.current.pause();
    } else {
      modalAudioRef.current.play();
    }
  };

  const seekModalAudio = (time: number) => {
    if (!modalAudioRef.current) return;
    modalAudioRef.current.currentTime = time;
  };

  // Get all recordings for "Your Recordings" section
  // Group recordings by mantra and number them based on timestamp
  const allRecordings = practices.flatMap(practice => {
    // Sort recordings by creation time for this practice
    const sortedRecordings = [...practice.recordings].sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );

    return sortedRecordings.map((recording, index) => ({
      ...recording,
      mantraTitle: practice.mantra.title,
      mantraCategory: practice.mantra.category,
      sessionName: `${practice.mantra.title} #${index + 1}`,
      durationMs: practice.durationMs,
    }));
  }).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-900 text-white flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-purple-400 mb-4"></div>
          <p className="text-purple-200">Loading your progress...</p>
        </div>
      </div>
    );
  }

  // Show onboarding if not complete
  if (onboardingComplete === false) {
    return <OnboardingPage />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-900 text-white pb-24">
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Image
              src="/logo.png"
              alt="VedicFlo Logo"
              width={64}
              height={64}
              className="drop-shadow-2xl"
            />
            <div>
              <h1 className="text-xl font-bold text-white">VedicFlo</h1>
              <p className="text-sm text-purple-300">Sacred Technology</p>
            </div>
          </div>

          <UserButton
            appearance={{
              elements: {
                avatarBox: "w-10 h-10"
              }
            }}
          />
        </div>

        {/* Your Progress Title */}
        <div className="mb-6">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-3xl sm:text-4xl font-bold mb-2"
            style={{
              background: 'linear-gradient(135deg, #fbbf24 0%, #ec4899 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}
          >
            Your Progress
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-purple-300 text-base"
          >
            Track your Vedic chanting journey
          </motion.p>
        </div>

        {/* Stats Cards */}
        {userStats && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10"
          >
            {/* Total Practices */}
            <div className="p-6 rounded-2xl bg-gradient-to-br from-purple-500/10 to-blue-500/10 backdrop-blur-lg border border-white/10 hover:border-purple-400/30 transition-all">
              <div className="flex flex-col items-center gap-2">
                <div className="p-3 rounded-full bg-purple-500/20">
                  <Play className="w-6 h-6 text-purple-400" />
                </div>
                <div className="text-3xl font-bold">{userStats.totalPractices}</div>
                <div className="text-sm text-purple-200 text-center">Total Practices</div>
              </div>
            </div>

            {/* Average Score */}
            <div className="p-6 rounded-2xl bg-gradient-to-br from-cyan-500/10 to-blue-500/10 backdrop-blur-lg border border-white/10 hover:border-cyan-400/30 transition-all">
              <div className="flex flex-col items-center gap-2">
                <div className="p-3 rounded-full bg-cyan-500/20">
                  <TrendingUp className="w-6 h-6 text-cyan-400" />
                </div>
                <div className="text-3xl font-bold">{Math.round(userStats.averageScore)}%</div>
                <div className="text-sm text-purple-200 text-center">Avg Score</div>
              </div>
            </div>

            {/* Day Streak */}
            <div className="p-6 rounded-2xl bg-gradient-to-br from-orange-500/10 to-red-500/10 backdrop-blur-lg border border-white/10 hover:border-orange-400/30 transition-all">
              <div className="flex flex-col items-center gap-2">
                <div className="p-3 rounded-full bg-orange-500/20">
                  <Flame className="w-6 h-6 text-orange-400" />
                </div>
                <div className="text-3xl font-bold">{userStats.currentStreak}</div>
                <div className="text-sm text-purple-200 text-center">Day Streak</div>
              </div>
            </div>

            {/* Total Time */}
            <div className="p-6 rounded-2xl bg-gradient-to-br from-green-500/10 to-emerald-500/10 backdrop-blur-lg border border-white/10 hover:border-green-400/30 transition-all">
              <div className="flex flex-col items-center gap-2">
                <div className="p-3 rounded-full bg-green-500/20">
                  <Clock className="w-6 h-6 text-green-400" />
                </div>
                <div className="text-3xl font-bold">{formatTotalTime(userStats.totalTimeMs)}</div>
                <div className="text-sm text-purple-200 text-center">Total Time</div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Your Mantras Section */}
        <div className="mb-10">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="text-2xl font-bold mb-6"
            style={{
              background: 'linear-gradient(135deg, #fbbf24 0%, #ec4899 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}
          >
            Your Mantras
          </motion.h2>

          {mantraProgress.length === 0 && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center py-16 rounded-3xl bg-white/5 backdrop-blur-lg border border-white/10"
            >
              <div className="p-6 rounded-full bg-purple-500/10 w-24 h-24 mx-auto mb-6 flex items-center justify-center">
                <Mic className="w-12 h-12 text-purple-400" />
              </div>
              <h3 className="text-2xl font-semibold mb-2">No practices yet</h3>
              <p className="text-purple-300 mb-6">Start your Vedic chanting journey today!</p>
              <Link href="/mantras">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="px-8 py-3 rounded-full bg-gradient-to-r from-purple-600 to-cyan-600 text-white font-medium"
                >
                  Browse Mantras
                </motion.button>
              </Link>
            </motion.div>
          )}

          <div className="grid md:grid-cols-2 gap-6">
            {mantraProgress.map((progress, index) => (
              <motion.div
                key={progress.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 + index * 0.1 }}
                whileHover={{ scale: 1.02, y: -4 }}
                className="relative p-6 rounded-3xl cursor-pointer group overflow-hidden"
                style={{
                  background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.1) 0%, rgba(59, 130, 246, 0.1) 100%)',
                  backdropFilter: 'blur(20px)',
                  WebkitBackdropFilter: 'blur(20px)',
                  boxShadow: '0 8px 32px 0 rgba(139, 92, 246, 0.2), inset 0 1px 0 0 rgba(255, 255, 255, 0.1)',
                }}
              >
                {/* Background Glow Effect */}
                <div
                  className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                  style={{
                    background: 'radial-gradient(circle at 50% 0%, rgba(139, 92, 246, 0.3), transparent 70%)',
                    pointerEvents: 'none',
                  }}
                />

                {/* Content */}
                <div className="relative z-10">
                  {/* Mantra Title */}
                  <h3 className="text-xl font-bold text-white mb-1">{progress.mantra.title}</h3>
                  <p className="text-purple-300 text-sm mb-4">{progress.mantra.category}</p>

                  {/* Level Badge */}
                  <div className="inline-block px-3 py-1 rounded-full bg-white/10 text-xs font-semibold text-purple-300 mb-4">
                    {getLevelName(progress.averageScore)}
                  </div>

                  {/* Progress Bar */}
                  <div className="mb-4">
                    <div className="flex justify-between text-sm text-purple-300 mb-2">
                      <span>Progress to Mastery</span>
                      <span>{Math.round(progress.averageScore)}%</span>
                    </div>
                    <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${progress.averageScore}%` }}
                        transition={{ duration: 1, delay: 0.5 + index * 0.1 }}
                        className={`h-full bg-gradient-to-r ${progress.averageScore >= 85 ? 'from-green-500 to-emerald-500' : progress.averageScore >= 60 ? 'from-yellow-500 to-orange-500' : 'from-purple-500 to-pink-500'}`}
                      />
                    </div>
                  </div>

                  {/* Continue Practice Button */}
                  <Link href={`/practice/${progress.mantraId}`} onClick={(e) => e.stopPropagation()}>
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      className="w-full py-3 rounded-xl bg-gradient-to-r from-orange-500 to-red-500 text-white font-semibold transition-all flex items-center justify-center gap-2"
                    >
                      Continue Practice
                    </motion.button>
                  </Link>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Your Recordings Section */}
        {allRecordings.length > 0 && (
          <div>
            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              className="text-2xl font-bold mb-6"
              style={{
                background: 'linear-gradient(135deg, #fbbf24 0%, #ec4899 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}
            >
              Your Recordings
            </motion.h2>

            <div className="space-y-4">
              {allRecordings.map((recording, index) => {
                const statusBadge = getStatusBadge(recording.reviewStatus);
                const isPlaying = playingRecordingId === recording.id;
                const progress = audioProgress[recording.id] || 0;
                const audio = audioRefs.current[recording.id];
                const currentTime = audio?.currentTime || 0;
                const duration = audio?.duration || 0;

                return (
                  <motion.div
                    key={recording.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.7 + index * 0.05 }}
                    className="relative p-6 rounded-2xl overflow-hidden"
                    style={{
                      background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.08) 0%, rgba(59, 130, 246, 0.08) 100%)',
                      backdropFilter: 'blur(20px)',
                      WebkitBackdropFilter: 'blur(20px)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                    }}
                  >
                    {/* Header Row */}
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-white mb-1">{recording.sessionName}</h3>
                        <p className="text-sm text-purple-300">{formatRelativeTime(recording.createdAt)}</p>
                      </div>

                      {/* Status Badge */}
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${statusBadge.className}`}>
                        {statusBadge.text}
                      </span>
                    </div>

                    {/* Seekbar and Controls Row */}
                    <div className="flex items-center gap-4 mb-4">
                      {/* Play/Pause Button */}
                      <button
                        onClick={(e) => togglePlayer(recording.id, `/api/serve-audio?id=${recording.id}`, e)}
                        className="p-3 rounded-full bg-purple-500/20 hover:bg-purple-500/30 transition-colors flex-shrink-0"
                      >
                        {isPlaying ? (
                          <Pause className="w-5 h-5 text-purple-400" />
                        ) : (
                          <Play className="w-5 h-5 text-purple-400" />
                        )}
                      </button>

                      {/* Seekbar */}
                      <div className="flex-1">
                        <div className="h-2 bg-white/10 rounded-full overflow-hidden cursor-pointer">
                          <div
                            className="h-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all"
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                        <div className="flex justify-between text-xs text-purple-400 mt-1">
                          <span>{formatTime(currentTime)}</span>
                          <span>{formatTime(duration)}</span>
                        </div>
                      </div>

                      {/* AI Score */}
                      <div className={`px-4 py-2 rounded-lg font-bold text-lg bg-gradient-to-r ${getScoreColor(recording.score)} text-white`}>
                        {Math.round(recording.score)}%
                      </div>
                    </div>

                    {/* Action Buttons Row */}
                    <div className="flex items-center gap-3 flex-wrap">
                      {/* Mentor Feedback Button */}
                      {recording.reviewStatus === 'reviewed' && recording.mentorRemarks && (
                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={(e) => {
                            e.stopPropagation();
                            setShowRemarksModal(recording);
                          }}
                          className="flex-1 px-4 py-2 rounded-lg bg-green-600 hover:bg-green-500 text-white text-sm font-medium transition-colors flex items-center justify-center gap-2"
                        >
                          <MessageSquare className="w-4 h-4" />
                          View Feedback
                        </motion.button>
                      )}

                      {/* Submit Button */}
                      {!recording.submittedForReview && (
                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSubmitForReview(recording.id);
                          }}
                          className="flex-1 px-4 py-2 rounded-lg bg-gradient-to-r from-purple-600 to-cyan-600 text-white text-sm font-medium transition-all flex items-center justify-center gap-2"
                        >
                          <Send className="w-4 h-4" />
                          Submit to Mentor
                        </motion.button>
                      )}

                      {/* Delete Button */}
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteRecording(recording.id);
                        }}
                        className="px-4 py-2 rounded-lg bg-red-600/20 hover:bg-red-600/30 text-red-400 text-sm font-medium transition-colors flex items-center gap-2 border border-red-400/30"
                      >
                        <Trash2 className="w-4 h-4" />
                      </motion.button>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        )}

        {/* Mentor Remarks Modal */}
        <AnimatePresence>
          {showRemarksModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
              onClick={() => setShowRemarksModal(null)}
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-gradient-to-br from-slate-900 to-purple-900 border border-purple-400/30 rounded-2xl p-6 max-w-2xl w-full"
              >
                {/* Modal Header */}
                <div className="flex items-start justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="p-3 rounded-lg bg-green-500/20">
                      <MessageSquare className="w-6 h-6 text-green-400" />
                    </div>
                    <div>
                      <h3 className="text-2xl font-bold text-white">Mentor Feedback</h3>
                      <p className="text-sm text-purple-300">Recording from {formatRelativeTime(showRemarksModal.createdAt)}</p>
                    </div>
                  </div>
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => setShowRemarksModal(null)}
                    className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </motion.button>
                </div>

                {/* Score Display */}
                <div className="flex items-center gap-6 mb-6 p-4 rounded-xl bg-white/5">
                  <div className="flex items-center gap-3">
                    <div className="text-sm text-purple-300">Score</div>
                    <div className={`text-3xl font-bold ${showRemarksModal.score >= 90 ? 'text-green-400' : showRemarksModal.score >= 75 ? 'text-yellow-400' : 'text-red-400'}`}>
                      {Math.round(showRemarksModal.score)}%
                    </div>
                  </div>
                </div>

                {/* Mentor Remarks */}
                <div className="bg-white/5 rounded-xl p-6 border border-green-400/20 mb-6">
                  <div className="text-sm text-green-400 font-semibold mb-3 flex items-center gap-2">
                    <span className="w-2 h-2 bg-green-400 rounded-full"></span>
                    Mentor&apos;s Comments
                  </div>
                  <p className="text-white/90 leading-relaxed">
                    {showRemarksModal.mentorRemarks}
                  </p>
                </div>

                {/* Audio Player */}
                <div className="bg-white/5 rounded-xl p-6 border border-purple-400/20 mb-6">
                  <div className="text-sm text-purple-400 font-semibold mb-4">Recording</div>

                  {/* Progress Bar */}
                  <div className="mb-4">
                    <div
                      className="h-2 bg-white/10 rounded-full cursor-pointer"
                      onClick={(e) => {
                        const rect = e.currentTarget.getBoundingClientRect();
                        const x = e.clientX - rect.left;
                        const percentage = x / rect.width;
                        seekModalAudio(percentage * modalAudioDuration);
                      }}
                    >
                      <div
                        className="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full transition-all"
                        style={{ width: `${modalAudioProgress}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-sm text-purple-400 mt-2">
                      <span>{formatTime(modalAudioCurrentTime)}</span>
                      <span>{formatTime(modalAudioDuration)}</span>
                    </div>
                  </div>

                  {/* Play/Pause Button */}
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={toggleModalAudio}
                    className="w-full py-3 rounded-lg bg-gradient-to-r from-purple-600 to-pink-600 text-white font-medium transition-all flex items-center justify-center gap-2"
                  >
                    {modalAudioPlaying ? (
                      <>
                        <Pause className="w-5 h-5" />
                        Pause Recording
                      </>
                    ) : (
                      <>
                        <Play className="w-5 h-5" />
                        Play Recording
                      </>
                    )}
                  </motion.button>
                </div>

                {/* Close Button */}
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setShowRemarksModal(null)}
                  className="w-full px-6 py-3 rounded-lg bg-white/10 hover:bg-white/20 text-white font-medium transition-colors"
                >
                  Close
                </motion.button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
