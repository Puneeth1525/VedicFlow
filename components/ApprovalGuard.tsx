'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export function ApprovalGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [isChecking, setIsChecking] = useState(true);
  const [isApproved, setIsApproved] = useState(false);

  useEffect(() => {
    const checkApproval = async () => {
      try {
        const response = await fetch('/api/user');
        if (response.ok) {
          const userData = await response.json();
          if (userData.approved) {
            setIsApproved(true);
          } else {
            router.push('/waiting-for-approval');
          }
        }
      } catch (error) {
        console.error('Error checking approval:', error);
        router.push('/waiting-for-approval');
      } finally {
        setIsChecking(false);
      }
    };

    checkApproval();
  }, [router]);

  if (isChecking) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-900 text-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-400"></div>
      </div>
    );
  }

  if (!isApproved) {
    return null;
  }

  return <>{children}</>;
}
