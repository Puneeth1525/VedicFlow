'use client';

import { motion } from 'framer-motion';
import { ArrowLeft, UserCheck, Mail, Calendar, Check, X, Loader2, Shield } from 'lucide-react';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface PendingUser {
  id: string;
  email: string;
  createdAt: string;
  onboardingComplete: boolean;
}

export default function AdminPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [pendingUsers, setPendingUsers] = useState<PendingUser[]>([]);
  const [approvingUserId, setApprovingUserId] = useState<string | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    checkAuthAndFetchUsers();
  }, []);

  const checkAuthAndFetchUsers = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/admin/pending-users');

      if (response.status === 401) {
        router.push('/sign-in');
        return;
      }

      if (response.status === 403) {
        setIsAuthorized(false);
        setError('Access Denied: Admin privileges required');
        setIsLoading(false);
        return;
      }

      if (response.ok) {
        const users = await response.json();
        setPendingUsers(users);
        setIsAuthorized(true);
      } else {
        throw new Error('Failed to fetch users');
      }
    } catch (err) {
      setError('Error loading users: ' + (err as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleApprove = async (userId: string) => {
    setApprovingUserId(userId);
    setError('');

    try {
      const response = await fetch('/api/admin/approve-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetUserId: userId }),
      });

      if (!response.ok) {
        throw new Error('Failed to approve user');
      }

      // Remove approved user from list
      setPendingUsers(pendingUsers.filter(user => user.id !== userId));
    } catch (err) {
      setError('Error approving user: ' + (err as Error).message);
    } finally {
      setApprovingUserId(null);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-900 text-white flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-purple-400 mx-auto mb-4" />
          <p className="text-purple-300">Loading admin panel...</p>
        </div>
      </div>
    );
  }

  if (!isAuthorized) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-900 text-white flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-md w-full mx-4"
        >
          <div className="p-8 rounded-2xl bg-white/5 backdrop-blur-lg border border-red-500/30">
            <div className="flex items-center justify-center mb-6">
              <div className="p-4 rounded-full bg-red-500/20">
                <Shield className="w-12 h-12 text-red-400" />
              </div>
            </div>

            <h1 className="text-3xl font-bold text-center text-red-400 mb-4">
              Access Denied
            </h1>

            <p className="text-center text-purple-200 mb-6">
              {error || 'You do not have permission to access the admin panel.'}
            </p>

            <Link href="/dashboard">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="w-full px-6 py-3 rounded-lg bg-gradient-to-r from-purple-600 to-cyan-600 hover:from-purple-500 hover:to-cyan-500 font-medium transition-all flex items-center justify-center gap-2"
              >
                <ArrowLeft className="w-5 h-5" />
                Back to Dashboard
              </motion.button>
            </Link>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-900 text-white">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Link href="/dashboard">
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                className="p-2 rounded-full bg-white/5 backdrop-blur-lg border border-white/10 hover:border-purple-400/50 transition-all"
              >
                <ArrowLeft className="w-6 h-6" />
              </motion.button>
            </Link>
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-400 to-cyan-400 bg-clip-text text-transparent">
                Admin Panel
              </h1>
              <p className="text-purple-200 mt-1">User Approval Management</p>
            </div>
          </div>

          <div className="px-4 py-2 rounded-lg bg-green-500/20 border border-green-500/50 text-green-300 text-sm flex items-center gap-2">
            <Shield className="w-4 h-4" />
            Admin Access
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 p-4 rounded-lg bg-red-500/20 border border-red-500/50 text-red-300 flex items-center gap-3"
          >
            <X className="w-5 h-5 flex-shrink-0" />
            <span>{error}</span>
          </motion.div>
        )}

        {/* Stats Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8 p-6 rounded-2xl bg-white/5 backdrop-blur-lg border border-white/10"
        >
          <div className="flex items-center gap-4">
            <div className="p-4 rounded-xl bg-purple-500/20">
              <UserCheck className="w-8 h-8 text-purple-400" />
            </div>
            <div>
              <h2 className="text-3xl font-bold text-white">{pendingUsers.length}</h2>
              <p className="text-purple-300">Pending Approval</p>
            </div>
          </div>
        </motion.div>

        {/* User List */}
        <div className="space-y-4">
          <h2 className="text-2xl font-bold text-purple-300 mb-4">Pending User Registrations</h2>

          {pendingUsers.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="p-12 rounded-2xl bg-white/5 backdrop-blur-lg border border-white/10 text-center"
            >
              <UserCheck className="w-16 h-16 text-purple-400/50 mx-auto mb-4" />
              <p className="text-xl text-purple-300">No pending users</p>
              <p className="text-sm text-purple-300/60 mt-2">All users have been approved!</p>
            </motion.div>
          ) : (
            pendingUsers.map((user, index) => (
              <motion.div
                key={user.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className="p-6 rounded-2xl bg-white/5 backdrop-blur-lg border border-white/10 hover:border-purple-400/30 transition-all"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  {/* User Info */}
                  <div className="flex-1 space-y-3">
                    <div className="flex items-center gap-3">
                      <Mail className="w-5 h-5 text-cyan-400 flex-shrink-0" />
                      <span className="text-white font-medium text-lg">{user.email || 'No email provided'}</span>
                    </div>

                    <div className="flex items-center gap-3 text-sm text-purple-300">
                      <Calendar className="w-4 h-4" />
                      <span>Registered: {formatDate(user.createdAt)}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className={`px-3 py-1 rounded-full text-xs ${
                        user.onboardingComplete
                          ? 'bg-green-500/20 border border-green-500/50 text-green-300'
                          : 'bg-yellow-500/20 border border-yellow-500/50 text-yellow-300'
                      }`}>
                        {user.onboardingComplete ? 'Onboarding Complete' : 'Onboarding Pending'}
                      </div>
                    </div>
                  </div>

                  {/* Approve Button */}
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => handleApprove(user.id)}
                    disabled={approvingUserId === user.id}
                    className="px-6 py-3 rounded-lg bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 min-w-[140px]"
                  >
                    {approvingUserId === user.id ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Approving...
                      </>
                    ) : (
                      <>
                        <Check className="w-5 h-5" />
                        Approve User
                      </>
                    )}
                  </motion.button>
                </div>
              </motion.div>
            ))
          )}
        </div>

        {/* Instructions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mt-8 p-6 rounded-2xl bg-white/5 backdrop-blur-lg border border-white/10"
        >
          <h3 className="text-lg font-semibold mb-3 text-purple-300">Admin Instructions</h3>
          <ul className="space-y-2 text-purple-200 text-sm">
            <li className="flex gap-3">
              <span className="text-cyan-400 font-bold">•</span>
              <span>Review newly registered users and their email addresses</span>
            </li>
            <li className="flex gap-3">
              <span className="text-cyan-400 font-bold">•</span>
              <span>Click &quot;Approve User&quot; to grant access to the application</span>
            </li>
            <li className="flex gap-3">
              <span className="text-cyan-400 font-bold">•</span>
              <span>Approved users will be able to access all features immediately</span>
            </li>
            <li className="flex gap-3">
              <span className="text-cyan-400 font-bold">•</span>
              <span>Users with pending onboarding have not completed the setup process yet</span>
            </li>
          </ul>
        </motion.div>
      </div>
    </div>
  );
}
