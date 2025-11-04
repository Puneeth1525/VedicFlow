'use client';

import { motion } from 'framer-motion';
import { Mic, BookOpen, TrendingUp, Sparkles } from 'lucide-react';
import { SignedOut, SignInButton } from '@clerk/nextjs';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@clerk/nextjs';
import Image from 'next/image';

export default function Home() {
  const router = useRouter();
  const { isSignedIn, isLoaded } = useUser();

  useEffect(() => {
    if (isLoaded && isSignedIn) {
      router.push('/dashboard');
    }
  }, [isSignedIn, isLoaded, router]);

  if (!isLoaded || isSignedIn) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-900 text-white flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-purple-400"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-900 text-white overflow-hidden">
      {/* Animated background particles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(20)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-1 h-1 bg-purple-400 rounded-full"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
            }}
            animate={{
              y: [0, -100, 0],
              opacity: [0, 1, 0],
            }}
            transition={{
              duration: Math.random() * 5 + 3,
              repeat: Infinity,
              delay: Math.random() * 2,
            }}
          />
        ))}
      </div>

      {/* Top Right - Sign In */}
      <div className="fixed top-4 right-4 z-50">
        <SignedOut>
          <SignInButton mode="modal">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="px-4 py-2 rounded-lg bg-gradient-to-r from-purple-600 to-cyan-600 hover:from-purple-500 hover:to-cyan-500 text-white font-medium transition-all text-sm"
            >
              Sign In
            </motion.button>
          </SignInButton>
        </SignedOut>
      </div>

      {/* Main content */}
      <div className="relative z-10 flex flex-col items-center justify-center min-h-screen px-4 py-20">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="text-center mb-12"
        >
          {/* Logo */}
          <motion.div
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ delay: 0.1, type: 'spring', stiffness: 150 }}
            className="flex justify-center mb-6"
          >
            <Image
              src="/logo.png"
              alt="VedicFlo Logo"
              width={180}
              height={180}
              className="drop-shadow-2xl"
            />
          </motion.div>

          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.3, type: 'spring', stiffness: 200 }}
            className="inline-flex items-center gap-2 mb-6"
          >
            <Sparkles className="w-8 h-8 text-purple-400" />
            <h1 className="text-6xl md:text-7xl font-bold bg-gradient-to-r from-purple-400 via-pink-400 to-cyan-400 bg-clip-text text-transparent">
              VedicFlo
            </h1>
            <Sparkles className="w-8 h-8 text-cyan-400" />
          </motion.div>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="text-xl md:text-2xl text-purple-200 max-w-2xl mx-auto"
          >
            Master the ancient art of Vedic chanting with AI-powered precision
          </motion.p>
        </motion.div>

        {/* Feature cards */}
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="grid md:grid-cols-3 gap-6 max-w-5xl w-full mb-12"
        >
          <FeatureCard
            icon={<BookOpen className="w-8 h-8" />}
            title="Sacred Mantras"
            description="Access a comprehensive library of Vedic mantras and shlokas"
            delay={0.7}
          />
          <FeatureCard
            icon={<Mic className="w-8 h-8" />}
            title="Swara Analysis"
            description="Perfect your pronunciation with real-time pitch detection"
            delay={0.8}
          />
          <FeatureCard
            icon={<TrendingUp className="w-8 h-8" />}
            title="Track Progress"
            description="Monitor your improvement across different mantras"
            delay={0.9}
          />
        </motion.div>

        {/* CTA Button */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 1 }}
        >
          <SignInButton mode="modal">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="relative group px-8 py-4 text-lg font-semibold rounded-full overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-purple-600 via-pink-600 to-cyan-600 group-hover:from-purple-500 group-hover:via-pink-500 group-hover:to-cyan-500 transition-all duration-300" />
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 bg-gradient-to-r from-purple-400 via-pink-400 to-cyan-400 blur-xl transition-opacity duration-300" />
              <span className="relative flex items-center gap-2">
                Begin Your Journey
                <motion.span
                  animate={{ x: [0, 5, 0] }}
                  transition={{ repeat: Infinity, duration: 1.5 }}
                >
                  →
                </motion.span>
              </span>
            </motion.button>
          </SignInButton>
        </motion.div>

        {/* Swara Legend */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2 }}
          className="mt-16 p-6 rounded-2xl bg-white/5 backdrop-blur-lg border border-white/10"
        >
          <h3 className="text-lg font-semibold mb-4 text-center text-purple-300">
            The Four Swaras
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <SwaraTag name="Anudātta" color="bg-blue-500" description="Low ↓" />
            <SwaraTag name="Udātta" color="bg-yellow-500" description="Base —" />
            <SwaraTag name="Swarita" color="bg-red-500" description="Rising ↗" />
            <SwaraTag name="Dīrgha Swarita" color="bg-green-500" description="Prolonged Rising ⤴" />
          </div>
        </motion.div>
      </div>
    </div>
  );
}

function FeatureCard({
  icon,
  title,
  description,
  delay,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  delay: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      whileHover={{ scale: 1.05, y: -5 }}
      className="p-6 rounded-2xl bg-white/5 backdrop-blur-lg border border-white/10 hover:border-purple-400/50 transition-all duration-300"
    >
      <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-purple-500/20 to-cyan-500/20 flex items-center justify-center mb-4 text-purple-400">
        {icon}
      </div>
      <h3 className="text-xl font-semibold mb-2">{title}</h3>
      <p className="text-purple-200/80">{description}</p>
    </motion.div>
  );
}

function SwaraTag({
  name,
  color,
  description,
}: {
  name: string;
  color: string;
  description: string;
}) {
  return (
    <div className="flex flex-col items-center gap-2">
      <div className={`w-3 h-3 rounded-full ${color}`} />
      <div className="text-center">
        <p className="text-sm font-semibold text-white">{name}</p>
        <p className="text-xs text-purple-300">{description}</p>
      </div>
    </div>
  );
}
