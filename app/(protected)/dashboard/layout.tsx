import { Metadata } from 'next';
import { constructMetadata } from '@/lib/metadata';

export const metadata: Metadata = constructMetadata({
  title: 'Dashboard - Track Your Vedic Chanting Progress | VedicFlo',
  description: 'Monitor your Vedic chanting journey with detailed practice statistics, pronunciation scores, swara accuracy, and progress across different mantras. Personalized insights powered by AI.',
  url: 'https://vedic-flow.vercel.app/dashboard',
  keywords: [
    'Vedic chanting progress',
    'mantra practice tracker',
    'pronunciation improvement',
    'swara accuracy tracker',
    'learning dashboard',
    'spiritual practice analytics',
    'Vedic education progress',
  ],
  noIndex: true, // Dashboard is user-specific, no need to index
});

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
