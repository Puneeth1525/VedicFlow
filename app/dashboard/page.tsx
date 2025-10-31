'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Play, TrendingUp, Award, Clock, Calendar, Mic, Send, MessageSquare, X } from 'lucide-react';
import Link from 'next/link';
import { UserButton } from '@clerk/nextjs';
import { useState } from 'react';

// Mock data - replace with real data from your database
const mockMantras = [
  {
    id: 'ganesha-gayatri',
    title: 'Ganesha Gayatri Mantra',
    category: 'Ganapati Upanishad',
    totalPractices: 15,
    averageScore: 87,
    lastPracticed: '2024-01-20',
    recordings: [
      {
        id: 1,
        date: '2024-01-20',
        score: 92,
        duration: '1:23',
        status: 'reviewed',
        submittedForReview: true,
        mentorRemarks: 'Excellent pronunciation! Your swara accuracy has improved significantly. Keep maintaining the rhythm in the second verse.'
      },
      {
        id: 2,
        date: '2024-01-18',
        score: 85,
        duration: '1:25',
        status: 'reviewed',
        submittedForReview: true,
        mentorRemarks: 'Good effort. Work on the Udātta accent in verse 3. The overall flow is very good.'
      },
      {
        id: 3,
        date: '2024-01-15',
        score: 83,
        duration: '1:28',
        status: 'not-submitted',
        submittedForReview: false
      },
    ]
  },
  {
    id: 'ganapathi-atharva-shirsham',
    title: 'Ganapathi Atharva Shirsham',
    category: 'Atharvaveda',
    totalPractices: 8,
    averageScore: 75,
    lastPracticed: '2024-01-19',
    recordings: [
      {
        id: 4,
        date: '2024-01-19',
        score: 78,
        duration: '5:12',
        status: 'under-review',
        submittedForReview: true
      },
      {
        id: 5,
        date: '2024-01-16',
        score: 72,
        duration: '5:18',
        status: 'reviewed',
        submittedForReview: true,
        mentorRemarks: 'The beginning needs more practice. Focus on breath control in longer verses. Overall structure is correct.'
      },
      {
        id: 6,
        date: '2024-01-14',
        score: 70,
        duration: '5:25',
        status: 'not-submitted',
        submittedForReview: false
      }
    ]
  },
];

const overallStats = {
  totalPractices: 23,
  averageScore: 82,
  streakDays: 7,
  totalTime: '2h 15m',
};

type Recording = {
  id: number;
  date: string;
  score: number;
  duration: string;
  status: string;
  submittedForReview: boolean;
  mentorRemarks?: string;
};

export default function DashboardPage() {
  const [selectedMantra, setSelectedMantra] = useState<string | null>(null);
  const [showRemarksModal, setShowRemarksModal] = useState<Recording | null>(null);

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

  const handleSubmitForReview = (recordingId: number) => {
    // TODO: Implement actual API call to submit for review
    alert(`Recording ${recordingId} submitted for mentor review!`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-900 text-white">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-start justify-between mb-8">
          <div className="flex items-start gap-4">
            <Link href="/mantras">
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                className="p-2 rounded-full bg-white/5 backdrop-blur-lg border border-white/10 hover:border-purple-400/50 transition-all mt-1"
              >
                <ArrowLeft className="w-6 h-6" />
              </motion.button>
            </Link>
            <div>
              <h1 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-purple-400 to-cyan-400 bg-clip-text text-transparent">
                Your Progress Dashboard
              </h1>
              <p className="text-purple-200 mt-1 text-sm sm:text-base">Track your Vedic chanting journey</p>
            </div>
          </div>

          <div className="mt-1">
            <UserButton
              appearance={{
                elements: {
                  avatarBox: "w-10 h-10"
                }
              }}
            />
          </div>
        </div>

        {/* Overall Stats */}
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
              <div className="text-2xl font-bold">{overallStats.totalPractices}</div>
            </div>
            <div className="text-sm text-purple-200">Total Practices</div>
          </div>

          <div className="p-6 rounded-2xl bg-white/5 backdrop-blur-lg border border-white/10">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 rounded-lg bg-green-500/20">
                <TrendingUp className="w-5 h-5 text-green-400" />
              </div>
              <div className="text-2xl font-bold">{overallStats.averageScore}%</div>
            </div>
            <div className="text-sm text-purple-200">Average Score</div>
          </div>

          <div className="p-6 rounded-2xl bg-white/5 backdrop-blur-lg border border-white/10">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 rounded-lg bg-orange-500/20">
                <Award className="w-5 h-5 text-orange-400" />
              </div>
              <div className="text-2xl font-bold">{overallStats.streakDays}</div>
            </div>
            <div className="text-sm text-purple-200">Day Streak</div>
          </div>

          <div className="p-6 rounded-2xl bg-white/5 backdrop-blur-lg border border-white/10">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 rounded-lg bg-cyan-500/20">
                <Clock className="w-5 h-5 text-cyan-400" />
              </div>
              <div className="text-2xl font-bold">{overallStats.totalTime}</div>
            </div>
            <div className="text-sm text-purple-200">Total Time</div>
          </div>
        </motion.div>

        {/* Mantras Progress */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="space-y-6"
        >
          <h2 className="text-2xl font-bold mb-4">Your Mantras</h2>

          {mockMantras.map((mantra, index) => (
            <motion.div
              key={mantra.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              className="p-6 rounded-2xl bg-white/5 backdrop-blur-lg border border-white/10"
            >
              {/* Mantra Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h3 className="text-xl font-semibold mb-1">{mantra.title}</h3>
                  <p className="text-sm text-purple-300">{mantra.category}</p>
                </div>
                <div className="flex gap-4 text-sm">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-purple-400">{mantra.totalPractices}</div>
                    <div className="text-purple-200">Practices</div>
                  </div>
                  <div className="text-center">
                    <div className={`text-2xl font-bold ${mantra.averageScore >= 85 ? 'text-green-400' : 'text-yellow-400'}`}>
                      {mantra.averageScore}%
                    </div>
                    <div className="text-purple-200">Avg Score</div>
                  </div>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="mb-4">
                <div className="flex justify-between text-sm text-purple-300 mb-2">
                  <span>Progress to Mastery</span>
                  <span>{mantra.averageScore}%</span>
                </div>
                <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${mantra.averageScore}%` }}
                    transition={{ duration: 1, delay: index * 0.2 }}
                    className={`h-full ${mantra.averageScore >= 85 ? 'bg-gradient-to-r from-green-500 to-emerald-500' : 'bg-gradient-to-r from-yellow-500 to-orange-500'}`}
                  />
                </div>
              </div>

              {/* Toggle Recordings */}
              <button
                onClick={() => setSelectedMantra(selectedMantra === mantra.id ? null : mantra.id)}
                className="text-sm text-purple-400 hover:text-purple-300 transition-colors mb-4"
              >
                {selectedMantra === mantra.id ? '▼ Hide' : '▶'} View {mantra.recordings.length} Recordings
              </button>

              {/* Recordings List */}
              {selectedMantra === mantra.id && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="space-y-3 mt-4"
                >
                  {mantra.recordings.map((recording) => (
                    <div
                      key={recording.id}
                      className="p-4 rounded-xl bg-white/5 border border-white/10 hover:border-purple-400/30 transition-all"
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-4 flex-1">
                          <div className="p-3 rounded-lg bg-purple-500/20">
                            <Play className="w-5 h-5 text-purple-400" />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <div className="flex items-center gap-2 text-sm text-purple-300">
                                <Calendar className="w-4 h-4" />
                                {recording.date}
                              </div>
                              <div className="flex items-center gap-2 text-sm text-purple-300">
                                <Clock className="w-4 h-4" />
                                {recording.duration}
                              </div>
                            </div>
                            {getStatusBadge(recording.status)}
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className={`px-4 py-2 rounded-lg font-semibold ${getScoreColor(recording.score)}`}>
                            {recording.score}%
                          </div>

                          {/* Show mentor remarks button if reviewed */}
                          {recording.status === 'reviewed' && recording.mentorRemarks && (
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
                        </div>
                      </div>
                    </div>
                  ))}
                </motion.div>
              )}

              {/* Last Practiced */}
              <div className="mt-4 pt-4 border-t border-white/10 text-sm text-purple-300">
                Last practiced: {mantra.lastPracticed}
              </div>
            </motion.div>
          ))}
        </motion.div>

        {/* Empty State */}
        {mockMantras.length === 0 && (
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
                      <p className="text-sm text-purple-300">Recording from {showRemarksModal.date}</p>
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
                      {showRemarksModal.score}%
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Clock className="w-4 h-4 text-purple-300" />
                    <div className="text-purple-300">{showRemarksModal.duration}</div>
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
    </div>
  );
}
