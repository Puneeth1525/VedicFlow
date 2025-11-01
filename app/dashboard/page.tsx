'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Play, Pause, TrendingUp, Award, Clock, Calendar, Mic, Send, MessageSquare, X, Trash2 } from 'lucide-react';
import { UserButton } from '@clerk/nextjs';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import BottomNav from '@/components/BottomNav';

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
  const [selectedMantra, setSelectedMantra] = useState<string | null>(null);
  const [showRemarksModal, setShowRemarksModal] = useState<Recording | null>(null);
  const [userStats, setUserStats] = useState<UserStats | null>(null);
  const [mantraProgress, setMantraProgress] = useState<MantraProgress[]>([]);
  const [practices, setPractices] = useState<Practice[]>([]);
  const [loading, setLoading] = useState(true);
  const [playingRecordingId, setPlayingRecordingId] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);

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
      const res = await fetch('/api/recordings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recordingId,
          submittedForReview: true,
          reviewStatus: 'under-review',
        }),
      });

      if (res.ok) {
        // Refresh practices
        const practicesRes = await fetch('/api/practices');
        if (practicesRes.ok) {
          const allPractices = await practicesRes.json();
          setPractices(allPractices);
        }
        alert('Recording submitted for mentor review!');
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

  const togglePlayer = (recordingId: string) => {
    setPlayingRecordingId(playingRecordingId === recordingId ? null : recordingId);
  };

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-400 bg-green-400/10';
    if (score >= 75) return 'text-yellow-400 bg-yellow-400/10';
    return 'text-red-400 bg-red-400/10';
  };

  const getStatusBadge = (status: string) => {
    if (status === 'reviewed') {
      return <span className="px-3 py-1 rounded-full text-xs bg-green-400/10 text-green-400 border border-green-400/20">✓ Reviewed</span>;
    }
    if (status === 'under-review') {
      return <span className="px-3 py-1 rounded-full text-xs bg-blue-400/10 text-blue-400 border border-blue-400/20">⏳ Under Review</span>;
    }
    return <span className="px-3 py-1 rounded-full text-xs bg-slate-400/10 text-slate-400 border border-slate-400/20">Not Submitted</span>;
  };

  const formatDuration = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const formatTotalTime = (ms: number) => {
    const totalMinutes = Math.floor(ms / 60000);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  // Group practices by mantra
  const getPracticesByMantra = (mantraId: string) => {
    return practices.filter(p => p.mantraId === mantraId);
  };

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

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-900 text-white pb-24">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-start justify-between mb-8">
          <div>
            <h1 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-purple-400 to-cyan-400 bg-clip-text text-transparent">
              Your Progress
            </h1>
            <p className="text-purple-200 mt-1 text-sm sm:text-base">Track your Vedic chanting journey</p>
          </div>

          <UserButton
            appearance={{
              elements: {
                avatarBox: "w-10 h-10"
              }
            }}
          />
        </div>

        {/* Overall Stats */}
        {userStats && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8"
          >
            <div className="p-6 rounded-2xl bg-white/5 backdrop-blur-lg border border-white/10">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 rounded-lg bg-purple-500/20">
                  <Mic className="w-5 h-5 text-purple-400" />
                </div>
                <div className="text-2xl font-bold">{userStats.totalPractices}</div>
              </div>
              <div className="text-sm text-purple-200">Total Practices</div>
            </div>

            <div className="p-6 rounded-2xl bg-white/5 backdrop-blur-lg border border-white/10">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 rounded-lg bg-green-500/20">
                  <TrendingUp className="w-5 h-5 text-green-400" />
                </div>
                <div className="text-2xl font-bold">{Math.round(userStats.averageScore)}%</div>
              </div>
              <div className="text-sm text-purple-200">Average Score</div>
            </div>

            <div className="p-6 rounded-2xl bg-white/5 backdrop-blur-lg border border-white/10">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 rounded-lg bg-orange-500/20">
                  <Award className="w-5 h-5 text-orange-400" />
                </div>
                <div className="text-2xl font-bold">{userStats.currentStreak}</div>
              </div>
              <div className="text-sm text-purple-200">Day Streak</div>
            </div>

            <div className="p-6 rounded-2xl bg-white/5 backdrop-blur-lg border border-white/10">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 rounded-lg bg-cyan-500/20">
                  <Clock className="w-5 h-5 text-cyan-400" />
                </div>
                <div className="text-2xl font-bold">{formatTotalTime(userStats.totalTimeMs)}</div>
              </div>
              <div className="text-sm text-purple-200">Total Time</div>
            </div>
          </motion.div>
        )}

        {/* Mantras Progress */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="space-y-6"
        >
          <h2 className="text-2xl font-bold mb-4">Your Mantras</h2>

          {mantraProgress.length === 0 && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center py-16"
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

          {mantraProgress.map((progress, index) => {
            const mantraPractices = getPracticesByMantra(progress.mantraId);
            const allRecordings = mantraPractices.flatMap(p => p.recordings);

            return (
              <motion.div
                key={progress.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className="p-6 rounded-2xl bg-white/5 backdrop-blur-lg border border-white/10"
              >
                {/* Mantra Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="text-xl font-semibold mb-1">{progress.mantra.title}</h3>
                    <p className="text-sm text-purple-300">{progress.mantra.category}</p>
                  </div>
                  <div className="flex gap-4 text-sm">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-purple-400">{progress.totalPractices}</div>
                      <div className="text-purple-200">Practices</div>
                    </div>
                    <div className="text-center">
                      <div className={`text-2xl font-bold ${progress.averageScore >= 85 ? 'text-green-400' : 'text-yellow-400'}`}>
                        {Math.round(progress.averageScore)}%
                      </div>
                      <div className="text-purple-200">Avg Score</div>
                    </div>
                  </div>
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
                      transition={{ duration: 1, delay: index * 0.2 }}
                      className={`h-full ${progress.averageScore >= 85 ? 'bg-gradient-to-r from-green-500 to-emerald-500' : 'bg-gradient-to-r from-yellow-500 to-orange-500'}`}
                    />
                  </div>
                </div>

                {/* Toggle Recordings */}
                {allRecordings.length > 0 && (
                  <>
                    <button
                      onClick={() => setSelectedMantra(selectedMantra === progress.mantraId ? null : progress.mantraId)}
                      className="text-sm text-purple-400 hover:text-purple-300 transition-colors mb-4"
                    >
                      {selectedMantra === progress.mantraId ? '▼ Hide' : '▶'} View {allRecordings.length} Recordings
                    </button>

                    {/* Recordings List */}
                    {selectedMantra === progress.mantraId && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="space-y-3 mt-4"
                      >
                        {allRecordings.map((recording) => (
                          <div
                            key={recording.id}
                            className="p-4 rounded-xl bg-white/5 border border-white/10 hover:border-purple-400/30 transition-all"
                          >
                            <div className="flex items-center justify-between mb-3">
                              <div className="flex items-center gap-4 flex-1">
                                {/* Play/Pause Button */}
                                <motion.button
                                  whileHover={{ scale: 1.05 }}
                                  whileTap={{ scale: 0.95 }}
                                  onClick={() => togglePlayer(recording.id)}
                                  className="p-3 rounded-lg bg-purple-500/20 hover:bg-purple-500/30 transition-colors"
                                >
                                  {playingRecordingId === recording.id ? (
                                    <Pause className="w-5 h-5 text-purple-400" />
                                  ) : (
                                    <Play className="w-5 h-5 text-purple-400" />
                                  )}
                                </motion.button>
                                <div className="flex-1">
                                  <div className="flex items-center gap-3 mb-2">
                                    <div className="flex items-center gap-2 text-sm text-purple-300">
                                      <Calendar className="w-4 h-4" />
                                      {formatDate(recording.createdAt)}
                                    </div>
                                    <div className="flex items-center gap-2 text-sm text-purple-300">
                                      <Clock className="w-4 h-4" />
                                      {formatDuration(mantraPractices.find(p => p.id === recording.practiceId)?.durationMs || 0)}
                                    </div>
                                  </div>
                                  {getStatusBadge(recording.reviewStatus)}
                                </div>
                              </div>
                              <div className="flex items-center gap-3">
                                <div className={`px-4 py-2 rounded-lg font-semibold ${getScoreColor(recording.score)}`}>
                                  {Math.round(recording.score)}%
                                </div>

                                {/* Show mentor remarks button if reviewed */}
                                {recording.reviewStatus === 'reviewed' && recording.mentorRemarks && (
                                  <motion.button
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                    onClick={() => setShowRemarksModal(recording)}
                                    className="px-4 py-2 rounded-lg bg-green-600 hover:bg-green-500 text-white text-sm font-medium transition-colors flex items-center gap-2"
                                  >
                                    <MessageSquare className="w-4 h-4" />
                                    Mentor Feedback
                                  </motion.button>
                                )}

                                {/* Show submit button if not submitted */}
                                {!recording.submittedForReview && (
                                  <motion.button
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                    onClick={() => handleSubmitForReview(recording.id)}
                                    className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium transition-colors flex items-center gap-2"
                                  >
                                    <Send className="w-4 h-4" />
                                    Submit for Review
                                  </motion.button>
                                )}

                                {/* Delete button - always shown */}
                                <motion.button
                                  whileHover={{ scale: 1.05 }}
                                  whileTap={{ scale: 0.95 }}
                                  onClick={() => handleDeleteRecording(recording.id)}
                                  className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-white text-sm font-medium transition-colors flex items-center gap-2"
                                >
                                  <Trash2 className="w-4 h-4" />
                                  Delete
                                </motion.button>
                              </div>
                            </div>

                            {/* Audio Player - shown when playing */}
                            {playingRecordingId === recording.id && (
                              <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                className="mt-3 pt-3 border-t border-white/10"
                              >
                                <audio
                                  src={recording.audioUrl}
                                  controls
                                  autoPlay
                                  className="w-full"
                                  onEnded={() => setPlayingRecordingId(null)}
                                  style={{
                                    height: '40px',
                                    borderRadius: '8px',
                                  }}
                                />
                              </motion.div>
                            )}
                          </div>
                        ))}
                      </motion.div>
                    )}
                  </>
                )}

                {/* Last Practiced */}
                {progress.lastPracticed && (
                  <div className="mt-4 pt-4 border-t border-white/10 text-sm text-purple-300">
                    Last practiced: {formatDate(progress.lastPracticed)}
                  </div>
                )}
              </motion.div>
            );
          })}
        </motion.div>

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
                      <p className="text-sm text-purple-300">Recording from {formatDate(showRemarksModal.createdAt)}</p>
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
                <div className="bg-white/5 rounded-xl p-6 border border-green-400/20">
                  <div className="text-sm text-green-400 font-semibold mb-3 flex items-center gap-2">
                    <span className="w-2 h-2 bg-green-400 rounded-full"></span>
                    Mentor&apos;s Comments
                  </div>
                  <p className="text-white/90 leading-relaxed">
                    {showRemarksModal.mentorRemarks}
                  </p>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3 mt-6">
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setShowRemarksModal(null)}
                    className="flex-1 px-6 py-3 rounded-lg bg-white/10 hover:bg-white/20 text-white font-medium transition-colors"
                  >
                    Close
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => window.open(showRemarksModal.audioUrl, '_blank')}
                    className="flex-1 px-6 py-3 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-medium transition-colors flex items-center justify-center gap-2"
                  >
                    <Play className="w-4 h-4" />
                    Play Recording
                  </motion.button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <BottomNav />
    </div>
  );
}
