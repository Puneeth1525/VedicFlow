import { Metadata } from 'next';
import { constructMetadata } from '@/lib/metadata';

export const metadata: Metadata = constructMetadata({
  title: 'Settings - Customize Your Learning Experience | VedicFlo',
  description: 'Customize your Vedic chanting learning preferences, update profile settings, and manage your account for an optimized spiritual practice experience.',
  url: 'https://vedic-flow.vercel.app/settings',
  noIndex: true, // Settings page is user-specific
});

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
