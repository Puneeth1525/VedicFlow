'use client';

import { useUser } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Clock, Mail, CheckCircle2 } from 'lucide-react';

export default function WaitingForApprovalPage() {
  const { user } = useUser();
  const router = useRouter();
  const [isChecking, setIsChecking] = useState(false);

  // Poll approval status every 10 seconds
  useEffect(() => {
    const checkApprovalStatus = async () => {
      if (isChecking) return;

      setIsChecking(true);
      try {
        const response = await fetch('/api/user');
        if (response.ok) {
          const userData = await response.json();
          if (userData.approved) {
            // User has been approved! Redirect to dashboard or onboarding
            if (userData.onboardingComplete) {
              router.push('/dashboard');
            } else {
              router.push('/onboarding');
            }
          }
        }
      } catch (error) {
        console.error('Error checking approval status:', error);
      } finally {
        setIsChecking(false);
      }
    };

    // Check immediately
    checkApprovalStatus();

    // Then check every 10 seconds
    const interval = setInterval(checkApprovalStatus, 10000);

    return () => clearInterval(interval);
  }, [router, isChecking]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-900 text-white flex items-center justify-center px-4">
      <div className="max-w-md w-full">
        <div className="p-8 rounded-2xl bg-white/5 backdrop-blur-lg border border-white/10 text-center">
          {/* Icon */}
          <div className="mb-6 flex justify-center">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-purple-500/20 to-cyan-500/20 flex items-center justify-center">
              <Clock className="w-10 h-10 text-purple-400 animate-pulse" />
            </div>
          </div>

          {/* Title */}
          <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-purple-400 to-cyan-400 bg-clip-text text-transparent mb-3">
            Waiting for Approval
          </h1>

          {/* Message */}
          <p className="text-purple-200 mb-6 text-sm sm:text-base">
            Thank you for signing up! Your account is pending admin approval.
            We&apos;ll notify you once you&apos;ve been approved to access the app.
          </p>

          {/* Email info */}
          {user?.primaryEmailAddress && (
            <div className="mb-6 p-4 rounded-xl bg-white/5 border border-white/10">
              <div className="flex items-center justify-center gap-2 text-purple-300 text-sm">
                <Mail className="w-4 h-4" />
                <span>{user.primaryEmailAddress.emailAddress}</span>
              </div>
            </div>
          )}

          {/* Status indicator */}
          <div className="space-y-3 text-sm text-purple-300">
            <div className="flex items-center justify-center gap-2">
              <div className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse" />
              <span>Checking approval status automatically...</span>
            </div>
          </div>

          {/* Info box */}
          <div className="mt-8 p-4 rounded-xl bg-purple-500/10 border border-purple-500/20">
            <div className="flex items-start gap-3 text-left">
              <CheckCircle2 className="w-5 h-5 text-purple-400 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-purple-200">
                <p className="font-medium mb-1">What happens next?</p>
                <p className="text-purple-300">
                  Once an admin approves your account, you&apos;ll automatically be redirected to the onboarding flow.
                  No action needed from your side!
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
