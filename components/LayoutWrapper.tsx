'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useAuth } from '@clerk/nextjs';
import BottomNav from './BottomNav';

export default function LayoutWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { isLoaded, userId } = useAuth();
  const [checkingOnboarding, setCheckingOnboarding] = useState(true);

  // Don't show BottomNav on sign-in, sign-up, landing, and onboarding pages
  const hideBottomNav =
    pathname === '/' ||
    pathname?.startsWith('/sign-in') ||
    pathname?.startsWith('/sign-up') ||
    pathname?.startsWith('/onboarding');

  useEffect(() => {
    // No need to check onboarding here anymore - dashboard handles it
    setCheckingOnboarding(false);
  }, []);

  // Show loading state while checking onboarding
  if (checkingOnboarding && userId) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-purple-400 mb-4"></div>
          <p className="text-purple-200">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      {children}
      {!hideBottomNav && <BottomNav />}
    </>
  );
}
