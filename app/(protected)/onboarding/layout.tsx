import { Metadata } from 'next';
import { constructMetadata } from '@/lib/metadata';

export const metadata: Metadata = constructMetadata({
  title: 'Welcome - Set Up Your Vedic Chanting Profile | VedicFlo',
  description: 'Complete your profile setup and calibrate your voice for personalized Vedic chanting feedback. Set your baseline tone for accurate swara analysis.',
  url: 'https://vedicflo.com/onboarding',
  noIndex: true, // Onboarding is user-specific
});

export default function OnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
