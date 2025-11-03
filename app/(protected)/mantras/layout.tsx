import { Metadata } from 'next';
import { constructMetadata } from '@/lib/metadata';

export const metadata: Metadata = constructMetadata({
  title: 'Sacred Mantras Library - Learn Vedic Chanting | VedicFlo',
  description: 'Explore our comprehensive collection of sacred Vedic mantras from Rig Veda, Atharvaveda, and Upanishads. Learn Ganapati mantras, Gayatri mantras, and more with AI-powered guidance and pronunciation feedback.',
  url: 'https://vedic-flow.vercel.app/mantras',
  keywords: [
    'Vedic mantras library',
    'Sanskrit mantras collection',
    'Rig Veda mantras',
    'Atharvaveda hymns',
    'Ganapati mantras',
    'Gayatri mantra',
    'Vedic chanting learn',
    'mantra practice online',
    'sacred Hindu mantras',
    'Vedic scriptures',
  ],
});

export default function MantrasLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
