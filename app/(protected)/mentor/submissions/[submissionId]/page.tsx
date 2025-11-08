'use client';

import { useEffect, useState, useRef, use } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  ArrowLeft,
  Send,
  Clock,
} from 'lucide-react';

interface FeedbackMarker {
  timestamp: number;
  comment: string;
}

interface Submission {
  id: string;
  status: string;
  submittedAt: string;
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
    overallRemarks: string;
    markers: Array<{
      timestamp: number;
      comment: string;
    }>;
  }>;
}

export default function SubmissionDetailPage({
  params,
}: {
  params: Promise<{ submissionId: string }>;
}) {
  const resolvedParams = use(params);
  const router = useRouter();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const [submission, setSubmission] = useState<Submission | null>(null);
  const [loading, setLoading] = useState(true);
  const [alignmentReady, setAlignmentReady] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [overallRemarks, setOverallRemarks] = useState('');
  const [markers, setMarkers] = useState<FeedbackMarker[]>([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchSubmission();
  }, [resolvedParams.submissionId]);

  // Poll for alignment completion
  useEffect(() => {
    if (loading || alignmentReady || !submission) return;

    const pollInterval = setInterval(() => {
      fetchSubmission();
    }, 3000); // Poll every 3 seconds

    return () => clearInterval(pollInterval);
  }, [loading, alignmentReady, submission]);

  // Set up audio event listeners when submission loads and alignment is ready
  useEffect(() => {
    if (!submission || !audioRef.current || !alignmentReady) return;

    const audio = audioRef.current;

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
    };

    const handleDurationChange = () => {
      setDuration(audio.duration);
    };

    const handleEnded = () => {
      setIsPlaying(false);
    };

    const handlePlay = () => {
      setIsPlaying(true);
    };

    // Auto-insert timestamp when paused
    const handlePause = async () => {
      setIsPlaying(false);
      // Only insert if audio was playing and we're not at the beginning
      if (audio.currentTime > 0.5 && !audio.ended && isPlaying) {
        await insertTimestampWithWord(audio.currentTime);
      }
    };

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('durationchange', handleDurationChange);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('play', handlePlay);
    audio.addEventListener('pause', handlePause);

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('durationchange', handleDurationChange);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('pause', handlePause);
    };
  }, [submission, isPlaying, alignmentReady]);

  const fetchSubmission = async () => {
    try {
      const response = await fetch(
        `/api/mentor/submissions?submissionId=${resolvedParams.submissionId}`
      );
      const data = await response.json();

      if (response.ok) {
        setSubmission(data.submission);

        // Check if alignment words are ready
        const hasAlignment =
          data.submission.recording?.alignmentWords &&
          data.submission.recording.alignmentWords.length > 0;
        setAlignmentReady(hasAlignment);

        // Pre-populate if already reviewed
        if (data.submission.feedbacks && data.submission.feedbacks.length > 0) {
          const latestFeedback = data.submission.feedbacks[0];
          setOverallRemarks(latestFeedback.overallRemarks);
          setMarkers(latestFeedback.markers);
        }
      } else {
        console.error('Failed to fetch submission:', data.error);
      }
    } catch (error) {
      console.error('Error fetching submission:', error);
    } finally {
      setLoading(false);
    }
  };

  const togglePlayPause = () => {
    if (!audioRef.current) return;

    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
      setIsPlaying(true);
    }
  };

  const skipBackward = () => {
    if (!audioRef.current) return;
    audioRef.current.currentTime = Math.max(0, audioRef.current.currentTime - 5);
  };

  const skipForward = () => {
    if (!audioRef.current) return;
    audioRef.current.currentTime = Math.min(
      duration,
      audioRef.current.currentTime + 5
    );
  };

  const seekTo = (time: number) => {
    if (!audioRef.current) return;
    audioRef.current.currentTime = time;
  };

  const formatTime = (seconds: number) => {
    if (isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const findWordAtTimestamp = (timestamp: number) => {
    if (!submission?.recording?.alignmentWords || submission.recording.alignmentWords.length === 0) {
      console.warn('No alignment words available');
      return null;
    }

    // Find the word being spoken at this timestamp
    const word = submission.recording.alignmentWords.find(
      (w: any) => timestamp >= w.startTime && timestamp <= w.endTime
    );

    return word;
  };

  const insertTimestampWithWord = async (timestamp: number) => {
    if (!textareaRef.current) return;

    const word = findWordAtTimestamp(timestamp);
    const timestampText = `\n\n**[${formatTime(timestamp)}]** _"${word?.word || 'processing...'}"_\n`;

    const textarea = textareaRef.current;
    const cursorPosition = textarea.selectionStart;
    const textBefore = overallRemarks.substring(0, cursorPosition);
    const textAfter = overallRemarks.substring(cursorPosition);

    setOverallRemarks(textBefore + timestampText + textAfter);

    // Move cursor after inserted timestamp
    setTimeout(() => {
      textarea.selectionStart = textarea.selectionEnd =
        cursorPosition + timestampText.length;
      textarea.focus();
    }, 0);
  };

  const insertTimestamp = () => {
    if (!audioRef.current) return;
    insertTimestampWithWord(audioRef.current.currentTime);
  };

  const handleSubmitFeedback = async () => {
    if (!overallRemarks.trim()) {
      alert('Please provide overall feedback');
      return;
    }

    setSubmitting(true);

    try {
      const response = await fetch('/api/feedback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          submissionId: resolvedParams.submissionId,
          overallRemarks,
          markers: markers.length > 0 ? markers : undefined,
        }),
      });

      if (response.ok) {
        router.push('/mentor');
      } else {
        const data = await response.json();
        alert(`Failed to submit feedback: ${data.error}`);
      }
    } catch (error) {
      console.error('Error submitting feedback:', error);
      alert('Failed to submit feedback');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-black to-pink-900 flex items-center justify-center">
        <div className="text-white text-xl">Loading submission...</div>
      </div>
    );
  }

  if (!submission) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-black to-pink-900 flex items-center justify-center">
        <div className="text-white text-xl">Submission not found</div>
      </div>
    );
  }

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-black to-pink-900 p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => router.push('/mentor')}
            className="flex items-center gap-2 text-purple-300 hover:text-white mb-4 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            Back to Dashboard
          </button>
          <h1 className="text-4xl font-bold text-white mb-2">
            {submission.recording.practice.mantra.title}
          </h1>
          <p className="text-purple-300">
            {submission.recording.practice.mantra.category} • AI Score:{' '}
            {Math.round(submission.recording.score)}%
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Audio Player Section */}
          <div className="space-y-6">
            {!alignmentReady ? (
              /* Loading State */
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white/5 backdrop-blur-sm rounded-2xl p-8 border border-white/10"
              >
                <h2 className="text-2xl font-bold text-white mb-6">Recording</h2>
                <div className="flex flex-col items-center justify-center py-16 space-y-4">
                  <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-purple-500"></div>
                  <p className="text-purple-300 text-lg font-semibold">
                    Processing audio transcription...
                  </p>
                  <p className="text-purple-400 text-sm text-center max-w-md">
                    This usually takes 5-10 seconds. We're analyzing the recording to enable
                    word-level feedback.
                  </p>
                </div>
              </motion.div>
            ) : (
              /* Audio Player */
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white/5 backdrop-blur-sm rounded-2xl p-8 border border-white/10"
              >
                <h2 className="text-2xl font-bold text-white mb-6">Recording</h2>

                <audio
                  ref={audioRef}
                  src={submission.recording.audioUrl}
                  preload="metadata"
                />

                {/* Progress Bar */}
                <div className="mb-6">
                <div
                  className="h-2 bg-white/10 rounded-full cursor-pointer"
                  onClick={(e) => {
                    const rect = e.currentTarget.getBoundingClientRect();
                    const x = e.clientX - rect.left;
                    const percentage = x / rect.width;
                    seekTo(percentage * duration);
                  }}
                >
                  <div
                    className="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full transition-all"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <div className="flex justify-between text-sm text-purple-400 mt-2">
                  <span>{formatTime(currentTime)}</span>
                  <span>{formatTime(duration)}</span>
                </div>
                </div>

                {/* Controls */}
                <div className="flex items-center justify-center gap-4">
                  <button
                    onClick={skipBackward}
                    className="p-3 rounded-full bg-white/10 hover:bg-white/20 text-white transition-all"
                  >
                    <SkipBack className="w-6 h-6" />
                  </button>
                  <button
                    onClick={togglePlayPause}
                    className="p-6 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 hover:shadow-lg text-white transition-all"
                  >
                    {isPlaying ? (
                      <Pause className="w-8 h-8" />
                    ) : (
                      <Play className="w-8 h-8 ml-1" />
                    )}
                  </button>
                  <button
                    onClick={skipForward}
                    className="p-3 rounded-full bg-white/10 hover:bg-white/20 text-white transition-all"
                  >
                    <SkipForward className="w-6 h-6" />
                  </button>
                </div>

                {/* Manual Timestamp Button */}
                <button
                  onClick={insertTimestamp}
                  className="w-full mt-6 py-3 bg-white/10 hover:bg-white/20 text-purple-300 rounded-xl font-semibold transition-all flex items-center justify-center gap-2"
                >
                  <Clock className="w-5 h-5" />
                  Insert Timestamp at {formatTime(currentTime)}
                </button>
              </motion.div>
            )}

            {/* Previous Feedback (if any) */}
            {submission.feedbacks && submission.feedbacks.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="bg-white/5 backdrop-blur-sm rounded-2xl p-8 border border-white/10"
              >
                <h2 className="text-2xl font-bold text-white mb-4">
                  Previous Feedback
                </h2>
                <div className="text-purple-200 whitespace-pre-wrap">
                  {submission.feedbacks[0].overallRemarks}
                </div>
              </motion.div>
            )}
          </div>

          {/* Feedback Editor Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white/5 backdrop-blur-sm rounded-2xl p-8 border border-white/10"
          >
            <h2 className="text-2xl font-bold text-white mb-6">Your Feedback</h2>

            {/* Feedback Textarea */}
            <div className="mb-6">
              <label className="block text-purple-300 mb-2">
                Overall Remarks (Supports Markdown)
              </label>
              <textarea
                ref={textareaRef}
                value={overallRemarks}
                onChange={(e) => setOverallRemarks(e.target.value)}
                placeholder="Provide detailed feedback here. Pause the audio to auto-insert timestamps, or use the button above."
                className="w-full h-96 bg-white/5 border border-white/10 rounded-xl p-4 text-white placeholder-purple-400/50 focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none font-mono text-sm"
              />
              <p className="text-xs text-purple-400 mt-2">
                Tip: Pause the audio at any point to automatically insert a timestamp
              </p>
            </div>

            {/* Submit Button */}
            <button
              onClick={handleSubmitFeedback}
              disabled={submitting || !overallRemarks.trim()}
              className="w-full py-4 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl font-bold hover:shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? (
                'Submitting...'
              ) : (
                <>
                  <Send className="w-5 h-5" />
                  Submit Feedback
                </>
              )}
            </button>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
