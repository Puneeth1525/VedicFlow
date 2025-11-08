'use client';

import { motion } from 'framer-motion';
import { Play, Heart, Search, Pause } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState, useEffect, useRef } from 'react';
import { loadMantra } from '@/lib/mantraLoader';
import Image from 'next/image';

interface MantraCardData {
  id: string;
  title: string;
  category: string;
  difficulty: string;
  about?: string;
  verses: number;
  duration: string;
  audioUrl?: string;
  subtitle?: string;
  description?: string;
  practitionersCount?: number;
  likesCount?: number;
  isLiked?: boolean;
}

export default function MantrasPage() {
  const router = useRouter();
  const [mantras, setMantras] = useState<MantraCardData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedFilter, setSelectedFilter] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [playingMantraId, setPlayingMantraId] = useState<string | null>(null);
  const [audioProgress, setAudioProgress] = useState<{ [key: string]: number }>({});
  const audioRef = useRef<HTMLAudioElement | null>(null);

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

              return {
                id: mantra.id,
                title: mantra.title,
                category: mantra.category,
                difficulty: mantra.difficulty || 'Beginner', // Use difficulty from JSON
                about: mantra.about, // Get about from JSON
                audioUrl: mantra.audioUrl, // Get audio URL from JSON
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
        const validMantras = loadedMantras.filter(m => m !== null) as MantraCardData[];

        // Fetch stats for all mantras
        if (validMantras.length > 0) {
          try {
            const mantraIds = validMantras.map(m => m.id).join(',');
            const statsResponse = await fetch(`/api/mantras/stats?mantraIds=${mantraIds}`);
            const statsData = await statsResponse.json();

            // Merge stats with mantra data
            const mantrasWithStats = validMantras.map(mantra => {
              const stats = statsData.stats?.find((s: any) => s.mantraId === mantra.id);
              return {
                ...mantra,
                practitionersCount: stats?.practitionersCount || 0,
                likesCount: stats?.likesCount || 0,
                isLiked: stats?.isLiked || false,
              };
            });

            setMantras(mantrasWithStats);
          } catch (error) {
            console.error('Error fetching mantra stats:', error);
            setMantras(validMantras);
          }
        }
      } catch (error) {
        console.error('Error loading mantras:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadAllMantras();
  }, []);

  const handleLike = async (mantraId: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent navigation when clicking heart

    try {
      const response = await fetch(`/api/mantras/${mantraId}/like`, {
        method: 'POST',
      });

      if (response.ok) {
        const data = await response.json();

        // Update the mantra in state
        setMantras(prevMantras =>
          prevMantras.map(mantra =>
            mantra.id === mantraId
              ? {
                  ...mantra,
                  likesCount: data.likesCount,
                  isLiked: data.liked,
                }
              : mantra
          )
        );
      }
    } catch (error) {
      console.error('Error toggling like:', error);
    }
  };

  const handlePlayPause = (mantra: MantraCardData, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent navigation when clicking play button

    if (!mantra.audioUrl) return;

    // If clicking on already playing mantra, pause it
    if (playingMantraId === mantra.id) {
      audioRef.current?.pause();
      setPlayingMantraId(null);
      return;
    }

    // Stop any currently playing audio
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }

    // Create and play new audio
    const audio = new Audio(mantra.audioUrl);
    audioRef.current = audio;
    setPlayingMantraId(mantra.id);

    // Update progress
    audio.addEventListener('timeupdate', () => {
      const progress = (audio.currentTime / audio.duration) * 100;
      setAudioProgress(prev => ({ ...prev, [mantra.id]: progress }));
    });

    // Reset when ended
    audio.addEventListener('ended', () => {
      setPlayingMantraId(null);
      setAudioProgress(prev => ({ ...prev, [mantra.id]: 0 }));
    });

    audio.play().catch(err => {
      console.error('Error playing audio:', err);
      setPlayingMantraId(null);
    });
  };

  const getDifficultyBadge = (difficulty: string) => {
    switch (difficulty) {
      case 'Beginner':
        return {
          text: 'BEGINNER',
          className: 'bg-gradient-to-r from-yellow-400 to-amber-400 text-slate-900 font-bold'
        };
      case 'Intermediate':
        return {
          text: 'INTERMEDIATE',
          className: 'bg-gradient-to-r from-purple-500 to-pink-500 text-white font-bold'
        };
      case 'Advanced':
        return {
          text: 'ADVANCED',
          className: 'bg-gradient-to-r from-red-500 to-orange-500 text-white font-bold'
        };
      default:
        return {
          text: difficulty.toUpperCase(),
          className: 'bg-gradient-to-r from-purple-400 to-cyan-400 text-white font-bold'
        };
    }
  };

  // Get unique categories from mantras
  const categories = ['All', ...Array.from(new Set(mantras.map(m => m.category)))];

  // Filter mantras based on selected category and search query
  const filteredMantras = mantras.filter(mantra => {
    // Category filter
    const matchesCategory = selectedFilter === 'All' || mantra.category === selectedFilter;

    // Search query filter
    const matchesSearch = searchQuery.trim() === '' ||
      mantra.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      mantra.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (mantra.about && mantra.about.toLowerCase().includes(searchQuery.toLowerCase()));

    return matchesCategory && matchesSearch;
  });

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
        <div className="mb-8">
          {/* Top Bar - VedicFlo + Search */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-4">
              {/* App Logo */}
              <div className="w-16 h-16 rounded-2xl overflow-hidden flex-shrink-0">
                <Image
                  src="/logo.png"
                  alt="VedicFlo Logo"
                  width={64}
                  height={64}
                  className="w-full h-full object-cover"
                />
              </div>
              {/* VedicFlo Branding */}
              <div>
                <h1 className="text-xl font-bold text-white">VedicFlo</h1>
                <p className="text-sm text-purple-300">Sacred Technology</p>
              </div>
            </div>

            {/* Search Button/Input */}
            <div className="relative">
              {!isSearchOpen ? (
                <button
                  onClick={() => setIsSearchOpen(true)}
                  className="w-10 h-10 rounded-full bg-white/10 backdrop-blur-lg flex items-center justify-center hover:bg-white/20 transition-all"
                >
                  <Search className="w-5 h-5 text-purple-200" />
                </button>
              ) : (
                <motion.div
                  initial={{ width: 40 }}
                  animate={{ width: 192 }}
                  className="relative"
                >
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-purple-300" />
                  <input
                    type="text"
                    placeholder="Search mantras..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onBlur={() => {
                      if (!searchQuery) setIsSearchOpen(false);
                    }}
                    autoFocus
                    className="pl-10 pr-4 py-2 rounded-full bg-white/10 backdrop-blur-lg text-white placeholder-purple-300 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400 hover:bg-white/15 transition-all w-48"
                  />
                </motion.div>
              )}
            </div>
          </div>

          {/* Sacred Mantras Title */}
          <div className="mb-6">
            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="text-3xl sm:text-4xl font-bold mb-2"
              style={{
                background: 'linear-gradient(135deg, #fbbf24 0%, #ec4899 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}
            >
              Sacred Mantras
            </motion.h2>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-purple-300 text-base"
            >
              Experience the sound of creation
            </motion.p>
          </div>

          {/* Filter Pills */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="flex flex-wrap gap-3"
          >
            {categories.map((category) => (
              <button
                key={category}
                onClick={() => setSelectedFilter(category)}
                className={`px-6 py-2.5 rounded-full text-sm font-semibold transition-all ${
                  selectedFilter === category
                    ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg scale-105'
                    : 'bg-white/10 text-purple-200 hover:bg-white/20'
                }`}
              >
                {category}
              </button>
            ))}
          </motion.div>
        </div>

        {/* Mantras Grid */}
        {filteredMantras.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-purple-300">
              {searchQuery ? 'No mantras found matching your search' : 'No mantras available'}
            </p>
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.6 }}
            className="grid md:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            {filteredMantras.map((mantra, index) => {
              const badge = getDifficultyBadge(mantra.difficulty);
              const practitionersCount = mantra.practitionersCount || 0;
              const likesCount = mantra.likesCount || 0;
              const isLiked = mantra.isLiked || false;
              const isPlaying = playingMantraId === mantra.id;
              const progress = audioProgress[mantra.id] || 0;

              return (
                <motion.div
                  key={mantra.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  whileHover={{ scale: 1.02, y: -8 }}
                  onClick={() => router.push(`/practice/${mantra.id}`)}
                  className="relative p-6 rounded-3xl cursor-pointer group overflow-hidden"
                  style={{
                    background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.1) 0%, rgba(59, 130, 246, 0.1) 100%)',
                    backdropFilter: 'blur(20px)',
                    WebkitBackdropFilter: 'blur(20px)',
                    boxShadow: '0 8px 32px 0 rgba(139, 92, 246, 0.2), inset 0 1px 0 0 rgba(255, 255, 255, 0.1)',
                  }}
                >
                  {/* Background Glow Effect */}
                  <div
                    className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                    style={{
                      background: 'radial-gradient(circle at 50% 50%, rgba(236, 72, 153, 0.15) 0%, transparent 70%)',
                    }}
                  />

                  {/* Content Container */}
                  <div className="relative">
                    {/* Top Section - Title and Play Button */}
                    <div className="flex items-start justify-between gap-4 mb-4">
                      {/* Left Content */}
                      <div className="flex-1 min-w-0">
                        {/* Badge and Duration */}
                        <div className="flex items-center gap-3 mb-4">
                          <span className={`px-3 py-1 rounded-full text-xs tracking-wide ${badge.className}`}>
                            {badge.text}
                          </span>
                          <span className="text-sm text-cyan-300 font-medium">{mantra.duration}</span>
                        </div>

                        {/* Title */}
                        <h3 className="text-2xl font-bold text-white mb-2 group-hover:text-transparent group-hover:bg-gradient-to-r group-hover:from-pink-400 group-hover:to-purple-400 group-hover:bg-clip-text transition-all duration-300">
                          {mantra.title}
                        </h3>

                        {/* Category below title */}
                        <p className="text-purple-200 text-sm mb-2">
                          {mantra.category}
                        </p>

                        {/* Description - Verses and About */}
                        <p className="text-purple-300/70 text-sm">
                          {mantra.verses} verses • <span className="text-cyan-300">{mantra.about || 'Sacred chant'}</span>
                        </p>
                      </div>

                      {/* Right Side - Circular Play Button */}
                      <div className="relative flex-shrink-0">
                      {/* Progress Ring */}
                      <svg className="w-20 h-20 transform -rotate-90">
                        {/* Background ring */}
                        <circle
                          cx="40"
                          cy="40"
                          r="36"
                          stroke="rgba(139, 92, 246, 0.3)"
                          strokeWidth="3"
                          fill="none"
                        />
                        {/* Progress ring */}
                        <circle
                          cx="40"
                          cy="40"
                          r="36"
                          stroke={`url(#gradient-${mantra.id})`}
                          strokeWidth="3"
                          fill="none"
                          strokeDasharray={`${2 * Math.PI * 36}`}
                          strokeDashoffset={`${2 * Math.PI * 36 * (1 - progress / 100)}`}
                          strokeLinecap="round"
                          className="transition-all duration-200"
                        />
                        <defs>
                          <linearGradient id={`gradient-${mantra.id}`} x1="0%" y1="0%" x2="100%" y2="0%">
                            <stop offset="0%" stopColor="#ec4899" />
                            <stop offset="100%" stopColor="#8b5cf6" />
                          </linearGradient>
                        </defs>
                      </svg>

                      {/* Play/Pause Button */}
                      <motion.div
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={(e) => handlePlayPause(mantra, e)}
                        className="absolute inset-0 flex items-center justify-center cursor-pointer"
                      >
                        <div
                          className="w-16 h-16 rounded-full flex items-center justify-center"
                          style={{
                            background: 'linear-gradient(135deg, #ec4899 0%, #8b5cf6 100%)',
                            boxShadow: '0 4px 20px rgba(236, 72, 153, 0.4), 0 0 40px rgba(139, 92, 246, 0.3)',
                          }}
                        >
                          {isPlaying ? (
                            <Pause className="w-7 h-7 text-white" fill="white" />
                          ) : (
                            <Play className="w-7 h-7 text-white ml-1" fill="white" />
                          )}
                        </div>
                      </motion.div>

                      {/* Pulsing Glow - only when playing */}
                      {isPlaying && (
                        <motion.div
                          className="absolute inset-0 rounded-full"
                          style={{
                            background: 'radial-gradient(circle, rgba(236, 72, 153, 0.4) 0%, transparent 70%)',
                            filter: 'blur(10px)',
                          }}
                          animate={{
                            scale: [1, 1.2, 1],
                            opacity: [0.5, 0.8, 0.5],
                          }}
                          transition={{
                            duration: 2,
                            repeat: Infinity,
                            ease: 'easeInOut',
                          }}
                        />
                      )}
                    </div>
                    </div>

                    {/* Bottom Stats Row - Spans Full Width */}
                    <div className="flex items-center justify-between w-full">
                      {/* Practitioners Count */}
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-purple-300">Practitioners:</span>
                        <span className="text-sm font-semibold text-gray-400">
                          {practitionersCount > 999 ? `${(practitionersCount / 1000).toFixed(1)}k` : practitionersCount}
                        </span>
                      </div>

                      {/* Likes - Clickable, pushed to right end of card */}
                      <motion.button
                        onClick={(e) => handleLike(mantra.id, e)}
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        className="flex items-center gap-1.5 cursor-pointer"
                      >
                        <Heart
                          className={`w-4 h-4 transition-colors ${
                            isLiked ? 'text-pink-400 fill-pink-400' : 'text-purple-300'
                          }`}
                        />
                        <span className="text-sm text-purple-200">
                          {likesCount > 999 ? `${(likesCount / 1000).toFixed(1)}k` : likesCount}
                        </span>
                      </motion.button>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </motion.div>
        )}

        {/* Info Box */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
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
