'use client';

import { motion } from 'framer-motion';
import { Play } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { UserButton } from '@clerk/nextjs';
import { useState, useEffect } from 'react';
import { loadMantra } from '@/lib/mantraLoader';

interface MantraCardData {
  id: string;
  title: string;
  category: string;
  difficulty: string;
  verses: number;
  duration: string;
}

export default function MantrasPage() {
  const router = useRouter();
  const [mantras, setMantras] = useState<MantraCardData[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Dynamically load all mantras from data/mantras directory
  useEffect(() => {
    const loadAllMantras = async () => {
      try {
        // List of mantra IDs - add new mantras here
        const mantraIds = ['ganapati-prarthana', 'ganesha-gayatri']; // 'ganapathi-atharva-shirsham' hidden for now

        const loadedMantras = await Promise.all(
          mantraIds.map(async (id) => {
            try {
              const mantra = await loadMantra(id);

              // Calculate metadata from mantra data
              const paragraphs = mantra.chapters
                ? mantra.chapters.flatMap(c => c.paragraphs)
                : mantra.paragraphs || [];

              const totalLines = paragraphs.reduce((sum, p) => sum + p.lines.length, 0);

              // Estimate duration (rough: 3 seconds per line)
              const estimatedSeconds = totalLines * 3;
              const minutes = Math.ceil(estimatedSeconds / 60);

              // Auto-determine difficulty based on line count
              let difficulty = 'Beginner';
              if (totalLines > 15) difficulty = 'Intermediate';
              if (totalLines > 30) difficulty = 'Advanced';

              return {
                id: mantra.id,
                title: mantra.title,
                category: mantra.category,
                difficulty,
                verses: paragraphs.length,
                duration: `${minutes} min`,
              };
            } catch (error) {
              console.error(`Failed to load mantra ${id}:`, error);
              return null;
            }
          })
        );

        // Filter out failed loads
        setMantras(loadedMantras.filter(m => m !== null) as MantraCardData[]);
      } catch (error) {
        console.error('Error loading mantras:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadAllMantras();
  }, []);

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'Beginner':
        return 'text-green-400 bg-green-400/10';
      case 'Intermediate':
        return 'text-yellow-400 bg-yellow-400/10';
      case 'Advanced':
        return 'text-red-400 bg-red-400/10';
      default:
        return 'text-purple-400 bg-purple-400/10';
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-900 text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-400 mx-auto mb-4"></div>
          <p className="text-purple-300">Loading mantras...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-900 text-white pb-24">
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-start justify-between mb-8">
          <div>
            <h1 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-purple-400 to-cyan-400 bg-clip-text text-transparent">
              Sacred Mantras
            </h1>
            <p className="text-purple-200 mt-1 text-sm sm:text-base">
              {mantras.length} {mantras.length === 1 ? 'mantra' : 'mantras'} available
            </p>
          </div>

          <UserButton
            appearance={{
              elements: {
                avatarBox: "w-10 h-10"
              }
            }}
          />
        </div>

        {/* Mantras Grid */}
        {mantras.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-purple-300">No mantras available</p>
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="grid md:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            {mantras.map((mantra, index) => (
            <motion.div
              key={mantra.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              whileHover={{ scale: 1.02, y: -5 }}
              onClick={() => router.push(`/practice/${mantra.id}`)}
              className="p-6 rounded-2xl bg-white/5 backdrop-blur-lg border border-white/10 hover:border-purple-400/50 transition-all cursor-pointer group"
            >
              {/* Mantra Title */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h3 className="text-xl font-semibold mb-1 group-hover:text-purple-400 transition-colors">
                    {mantra.title}
                  </h3>
                  <p className="text-sm text-purple-300">{mantra.category}</p>
                </div>
                <motion.div
                  whileHover={{ scale: 1.2, rotate: 90 }}
                  className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500/20 to-cyan-500/20 flex items-center justify-center text-purple-400 group-hover:from-purple-500/40 group-hover:to-cyan-500/40 transition-all"
                >
                  <Play className="w-5 h-5 ml-0.5" />
                </motion.div>
              </div>

              {/* Mantra Details */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-purple-200">Verses</span>
                  <span className="text-white font-medium">{mantra.verses}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-purple-200">Duration</span>
                  <span className="text-white font-medium">{mantra.duration}</span>
                </div>
              </div>

              {/* Difficulty Badge */}
              <div className="mt-4">
                <span
                  className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${getDifficultyColor(
                    mantra.difficulty
                  )}`}
                >
                  {mantra.difficulty}
                </span>
              </div>
            </motion.div>
          ))}
          </motion.div>
        )}

        {/* Info Box */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="mt-12 p-6 rounded-2xl bg-white/5 backdrop-blur-lg border border-white/10"
        >
          <h3 className="text-lg font-semibold mb-3 text-purple-300">How it works</h3>
          <ol className="space-y-2 text-purple-200">
            <li className="flex gap-3">
              <span className="text-purple-400 font-bold">1.</span>
              <span>Select a mantra from the library above</span>
            </li>
            <li className="flex gap-3">
              <span className="text-purple-400 font-bold">2.</span>
              <span>Listen to the reference audio to understand the correct swara patterns</span>
            </li>
            <li className="flex gap-3">
              <span className="text-purple-400 font-bold">3.</span>
              <span>Record yourself reciting the mantra</span>
            </li>
            <li className="flex gap-3">
              <span className="text-purple-400 font-bold">4.</span>
              <span>Get instant feedback on your pitch accuracy and swara placement</span>
            </li>
          </ol>
        </motion.div>
      </div>
    </div>
  );
}
