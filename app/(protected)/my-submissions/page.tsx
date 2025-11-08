'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Clock, CheckCircle, AlertCircle, ChevronDown, ChevronUp } from 'lucide-react';

interface Submission {
  id: string;
  status: 'PENDING' | 'IN_REVIEW' | 'COMPLETED';
  submittedAt: string;
  reviewedAt?: string;
  recording: {
    id: string;
    score: number;
    audioUrl: string;
    practice: {
      mantra: {
        id: string;
        title: string;
        category: string;
      };
    };
  };
  feedbacks: Array<{
    id: string;
    overallRemarks: string;
    createdAt: string;
    markers: Array<{
      timestamp: number;
      comment: string;
    }>;
  }>;
}

export default function MySubmissionsPage() {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedSubmissions, setExpandedSubmissions] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchSubmissions();
  }, []);

  const fetchSubmissions = async () => {
    try {
      const response = await fetch('/api/submissions');
      const data = await response.json();

      if (response.ok) {
        setSubmissions(data.submissions);
      } else {
        console.error('Failed to fetch submissions:', data.error);
      }
    } catch (error) {
      console.error('Error fetching submissions:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleExpanded = (submissionId: string) => {
    setExpandedSubmissions((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(submissionId)) {
        newSet.delete(submissionId);
      } else {
        newSet.add(submissionId);
      }
      return newSet;
    });
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'PENDING':
        return <AlertCircle className="w-5 h-5 text-yellow-400" />;
      case 'IN_REVIEW':
        return <Clock className="w-5 h-5 text-blue-400" />;
      case 'COMPLETED':
        return <CheckCircle className="w-5 h-5 text-green-400" />;
      default:
        return null;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'PENDING':
        return 'Waiting for Mentor';
      case 'IN_REVIEW':
        return 'Under Review';
      case 'COMPLETED':
        return 'Reviewed';
      default:
        return status;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-black to-pink-900 flex items-center justify-center">
        <div className="text-white text-xl">Loading submissions...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-black to-pink-900 p-8">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">My Submissions</h1>
          <p className="text-purple-300">Track your recordings submitted for mentor review</p>
        </div>

        {/* Submissions List */}
        {submissions.length === 0 ? (
          <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-12 text-center border border-white/10">
            <p className="text-purple-300 text-lg mb-4">No submissions yet</p>
            <p className="text-purple-400 text-sm">
              Complete a practice session and submit your recording for mentor review
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {submissions.map((submission) => {
              const isExpanded = expandedSubmissions.has(submission.id);
              const hasFeedback = submission.feedbacks && submission.feedbacks.length > 0;

              return (
                <motion.div
                  key={submission.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10 overflow-hidden"
                >
                  {/* Submission Header */}
                  <div className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="text-2xl font-bold text-white mb-2">
                          {submission.recording.practice.mantra.title}
                        </h3>
                        <p className="text-sm text-purple-300">
                          {submission.recording.practice.mantra.category}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {getStatusIcon(submission.status)}
                        <span className="text-sm text-purple-300">
                          {getStatusText(submission.status)}
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div>
                        <p className="text-xs text-purple-400 mb-1">AI Score</p>
                        <p className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                          {Math.round(submission.recording.score)}%
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-purple-400 mb-1">Submitted</p>
                        <p className="text-sm text-white">
                          {formatDate(submission.submittedAt)}
                        </p>
                      </div>
                    </div>

                    {/* View Feedback Button */}
                    {hasFeedback && (
                      <button
                        onClick={() => toggleExpanded(submission.id)}
                        className="w-full py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl font-semibold hover:shadow-lg transition-all flex items-center justify-center gap-2"
                      >
                        {isExpanded ? (
                          <>
                            <ChevronUp className="w-5 h-5" />
                            Hide Feedback
                          </>
                        ) : (
                          <>
                            <ChevronDown className="w-5 h-5" />
                            View Feedback
                          </>
                        )}
                      </button>
                    )}

                    {submission.status === 'PENDING' && (
                      <div className="py-3 text-center text-purple-300 text-sm">
                        Waiting for a mentor to review your submission
                      </div>
                    )}

                    {submission.status === 'IN_REVIEW' && !hasFeedback && (
                      <div className="py-3 text-center text-blue-300 text-sm">
                        A mentor is currently reviewing your submission
                      </div>
                    )}
                  </div>

                  {/* Feedback Section (Expanded) */}
                  {isExpanded && hasFeedback && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="border-t border-white/10 p-6 bg-white/5"
                    >
                      <h4 className="text-xl font-bold text-white mb-4">Mentor Feedback</h4>

                      {/* Overall Remarks */}
                      <div className="mb-6">
                        <h5 className="text-sm font-semibold text-purple-300 mb-2">
                          Overall Remarks
                        </h5>
                        <div className="bg-black/20 rounded-xl p-4 text-purple-100 whitespace-pre-wrap">
                          {submission.feedbacks[0].overallRemarks}
                        </div>
                      </div>

                      {/* Timestamp Markers (if any) */}
                      {submission.feedbacks[0].markers &&
                        submission.feedbacks[0].markers.length > 0 && (
                          <div>
                            <h5 className="text-sm font-semibold text-purple-300 mb-2">
                              Detailed Feedback
                            </h5>
                            <div className="space-y-2">
                              {submission.feedbacks[0].markers.map((marker, idx) => (
                                <div
                                  key={idx}
                                  className="bg-black/20 rounded-xl p-3 flex items-start gap-3"
                                >
                                  <span className="text-pink-400 font-mono text-sm font-semibold">
                                    {formatTime(marker.timestamp)}
                                  </span>
                                  <p className="text-purple-100 flex-1">{marker.comment}</p>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                      <p className="text-xs text-purple-400 mt-4">
                        Reviewed on {formatDate(submission.feedbacks[0].createdAt)}
                      </p>
                    </motion.div>
                  )}
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
