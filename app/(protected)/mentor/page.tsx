'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Clock, CheckCircle, AlertCircle, PlayCircle } from 'lucide-react';

interface Feedback {
  overallRemarks: string;
  markers: Array<{
    timestamp: number;
    comment: string;
  }>;
}

interface Submission {
  id: string;
  status: 'PENDING' | 'IN_REVIEW' | 'COMPLETED';
  submittedAt: string;
  reviewedAt?: string;
  studentId: string;
  mentorId?: string;
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
  feedbacks: Feedback[];
}

interface GroupedSubmissions {
  PENDING: Submission[];
  IN_REVIEW: Submission[];
  COMPLETED: Submission[];
}

export default function MentorDashboard() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'PENDING' | 'IN_REVIEW' | 'COMPLETED'>('PENDING');
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [grouped, setGrouped] = useState<GroupedSubmissions>({
    PENDING: [],
    IN_REVIEW: [],
    COMPLETED: [],
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSubmissions();
  }, []);

  const fetchSubmissions = async () => {
    try {
      const response = await fetch('/api/mentor/submissions');
      const data = await response.json();

      if (response.ok) {
        setSubmissions(data.submissions);
        setGrouped(data.grouped);
      } else {
        console.error('Failed to fetch submissions:', data.error);
      }
    } catch (error) {
      console.error('Error fetching submissions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleClaimSubmission = async (submissionId: string) => {
    try {
      const response = await fetch('/api/mentor/submissions', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          submissionId,
          action: 'claim',
        }),
      });

      if (response.ok) {
        await fetchSubmissions();
      } else {
        console.error('Failed to claim submission');
      }
    } catch (error) {
      console.error('Error claiming submission:', error);
    }
  };

  const handleViewSubmission = (submissionId: string) => {
    router.push(`/mentor/submissions/${submissionId}`);
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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const tabs = [
    { id: 'PENDING', label: 'Pending', count: grouped.PENDING.length },
    { id: 'IN_REVIEW', label: 'In Review', count: grouped.IN_REVIEW.length },
    { id: 'COMPLETED', label: 'Completed', count: grouped.COMPLETED.length },
  ] as const;

  const currentSubmissions = grouped[activeTab];

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-black to-pink-900 flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-black to-pink-900 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">Mentor Dashboard</h1>
          <p className="text-purple-300">Review student submissions and provide feedback</p>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-8">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-6 py-3 rounded-xl font-semibold transition-all ${
                activeTab === tab.id
                  ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg'
                  : 'bg-white/10 text-purple-200 hover:bg-white/20'
              }`}
            >
              {tab.label}
              {tab.count > 0 && (
                <span className="ml-2 px-2 py-1 rounded-full bg-white/20 text-xs">
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Submissions Grid */}
        {currentSubmissions.length === 0 ? (
          <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-12 text-center border border-white/10">
            <p className="text-purple-300 text-lg">No {activeTab.toLowerCase()} submissions</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {currentSubmissions.map((submission) => (
              <motion.div
                key={submission.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white/5 backdrop-blur-sm rounded-2xl p-6 border border-white/10 hover:border-purple-500/50 transition-all cursor-pointer"
                onClick={() => handleViewSubmission(submission.id)}
              >
                {/* Status Badge */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    {getStatusIcon(submission.status)}
                    <span className="text-sm text-purple-300">{submission.status}</span>
                  </div>
                  <span className="text-xs text-purple-400">
                    {formatDate(submission.submittedAt)}
                  </span>
                </div>

                {/* Mantra Info */}
                <h3 className="text-xl font-bold text-white mb-2">
                  {submission.recording.practice.mantra.title}
                </h3>
                <p className="text-sm text-purple-300 mb-4">
                  {submission.recording.practice.mantra.category}
                </p>

                {/* Score */}
                <div className="flex items-center justify-between mb-4">
                  <span className="text-sm text-purple-400">AI Score</span>
                  <span className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                    {Math.round(submission.recording.score)}%
                  </span>
                </div>

                {/* Actions */}
                {submission.status === 'PENDING' && !submission.mentorId && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleClaimSubmission(submission.id);
                    }}
                    className="w-full py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl font-semibold hover:shadow-lg transition-all"
                  >
                    Claim & Review
                  </button>
                )}

                {submission.status === 'IN_REVIEW' && (
                  <button
                    onClick={() => handleViewSubmission(submission.id)}
                    className="w-full py-2 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-xl font-semibold hover:shadow-lg transition-all flex items-center justify-center gap-2"
                  >
                    <PlayCircle className="w-5 h-5" />
                    Continue Review
                  </button>
                )}

                {submission.status === 'COMPLETED' && (
                  <button
                    onClick={() => handleViewSubmission(submission.id)}
                    className="w-full py-2 bg-white/10 text-purple-300 rounded-xl font-semibold hover:bg-white/20 transition-all"
                  >
                    View Feedback
                  </button>
                )}
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
