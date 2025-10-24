'use client';

import { motion, useScroll, useTransform, useInView } from 'framer-motion';
import { ChevronDown } from 'lucide-react';
import Link from 'next/link';
import { SignedIn, SignedOut, SignInButton, UserButton } from '@clerk/nextjs';
import { useRef, useState, Suspense, useEffect, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Float, MeshDistortMaterial, Sphere, Stars } from '@react-three/drei';
import * as THREE from 'three';

export default function Home() {
  const containerRef = useRef<HTMLDivElement>(null);

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"]
  });

  return (
    <div ref={containerRef} className="bg-black text-white overflow-x-hidden relative">
      {/* Fixed Header with Progress */}
      <Header currentSection={0} scrollProgress={scrollYProgress} />

      {/* Epic Opening: Rishi Meditation → Ear Zoom → Mandala */}
      <CinematicOpeningSection />

      {/* Portal Sections */}
      <Portal3DSection
        sectionNumber={1}
        title="The Cosmic Hearing"
        subtitle="Shruti: That Which Was Heard"
        description="In states of profound consciousness, the ancient rishis heard the eternal vibrations of the universe"
        color="#8b5cf6"
      />

      <Portal3DSection
        sectionNumber={2}
        title="The Sacred Architecture"
        subtitle="Designed for Immortality"
        description="The rishis encoded the Vedas in patterns of sound and rhythm, designed to live in memory for millennia"
        color="#f59e0b"
      />

      <Portal3DSection
        sectionNumber={3}
        title="The Unbroken Chain"
        subtitle="40,000 Years of Perfect Fidelity"
        description="From guru to shishya, the sacred knowledge passed through an unbroken lineage"
        color="#14b8a6"
      />

      {/* Final CTA */}
      <FinalCTASection />

      {/* Footer */}
      <footer className="relative z-10 py-12 px-4 border-t border-white/5">
        <div className="max-w-7xl mx-auto text-center text-white/40 text-sm">
          <p>Preserving 40,000 years of sacred knowledge</p>
        </div>
      </footer>
    </div>
  );
}

// Header
function Header({ currentSection, scrollProgress }: { currentSection: number; scrollProgress: ReturnType<typeof useScroll>['scrollYProgress'] }) {
  const scaleX = useTransform(scrollProgress, [0, 1], [0, 1]);

  return (
    <motion.header className="fixed top-0 left-0 right-0 z-50 px-4 py-4" initial={{ y: -100 }} animate={{ y: 0 }} transition={{ duration: 0.6 }}>
      <div className="absolute bottom-0 left-0 right-0 h-px bg-white/10">
        <motion.div className="h-full bg-gradient-to-r from-amber-400 to-orange-500" style={{ scaleX, transformOrigin: 'left' }} />
      </div>
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <motion.div className="text-xl font-semibold bg-gradient-to-r from-amber-400 via-orange-400 to-amber-500 bg-clip-text text-transparent" whileHover={{ scale: 1.05 }}>
          VedicFlow
        </motion.div>
        <div className="flex items-center gap-4">
          <div className="hidden sm:block text-amber-400/60 text-sm font-mono">{currentSection}/3</div>
          <SignedOut>
            <SignInButton mode="modal">
              <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} className="px-4 py-2 rounded-full bg-gradient-to-r from-amber-600 to-orange-600 text-white font-medium text-sm">
                Sign In
              </motion.button>
            </SignInButton>
          </SignedOut>
          <SignedIn>
            <UserButton appearance={{ elements: { avatarBox: "w-9 h-9" } }} />
          </SignedIn>
        </div>
      </div>
    </motion.header>
  );
}

// CINEMATIC OPENING: Scroll-Driven Video
function CinematicOpeningSection() {
  const ref = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [videoReady, setVideoReady] = useState(false);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end start"]
  });

  // Wait for video metadata to load
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleLoadedMetadata = () => {
      setVideoReady(true);
      video.pause(); // Ensure video doesn't autoplay
    };

    video.addEventListener('loadedmetadata', handleLoadedMetadata);
    video.load();

    return () => {
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
    };
  }, []);

  // Update video currentTime based on scroll position
  useEffect(() => {
    if (!videoReady) return;

    const unsubscribe = scrollYProgress.on('change', (latest) => {
      if (videoRef.current && videoRef.current.duration) {
        const duration = videoRef.current.duration;
        // Map scroll progress (0-1) to video duration
        videoRef.current.currentTime = duration * latest;
      }
    });

    return () => unsubscribe();
  }, [scrollYProgress, videoReady]);

  return (
    <section ref={ref} className="relative h-[400vh]">
      <div className="sticky top-0 left-0 h-screen w-full overflow-hidden bg-black">
        {/* Loading indicator */}
        {!videoReady && (
          <div className="fixed inset-0 flex items-center justify-center bg-black z-20">
            <div className="text-amber-400 text-xl">Loading sacred journey...</div>
          </div>
        )}

        {/* Scroll-driven video - stays fixed while scrolling */}
        <video
          ref={videoRef}
          className="fixed top-0 left-0 w-full h-full object-cover z-0"
          preload="auto"
          muted
          playsInline
        >
          <source src="/videos/rishi-intro.mp4" type="video/mp4" />
        </video>

        {/* Text Overlay */}
        <motion.div
          className="fixed inset-0 flex items-center justify-center pointer-events-none z-10"
          style={{ opacity: useTransform(scrollYProgress, [0, 0.2, 0.8, 1], [1, 0, 0, 0]) }}
        >
          <div className="text-center px-4 max-w-5xl">
            <h1 className="text-5xl sm:text-6xl md:text-8xl font-bold mb-6 leading-tight">
              <span className="bg-gradient-to-r from-amber-200 via-amber-400 to-orange-400 bg-clip-text text-transparent">
                40,000 Years
              </span>
              <br />
              <span className="text-white/90 text-4xl sm:text-5xl md:text-6xl">
                of Sacred Knowledge
              </span>
            </h1>
            <p className="text-lg sm:text-xl text-white/60">In deep meditation, the rishis heard the eternal vibrations</p>
          </div>
        </motion.div>

        {/* Scroll hint */}
        <motion.div
          className="fixed bottom-20 left-1/2 -translate-x-1/2 pointer-events-none z-10"
          animate={{ y: [0, 10, 0] }}
          transition={{ duration: 2, repeat: Infinity }}
          style={{ opacity: useTransform(scrollYProgress, [0, 0.1], [1, 0]) }}
        >
          <div className="flex flex-col items-center gap-2 text-amber-400/60">
            <span className="text-sm">Scroll to begin the journey</span>
            <ChevronDown className="w-6 h-6" />
          </div>
        </motion.div>
      </div>
    </section>
  );
}


// Portal sections (same as before)
function Portal3DSection({ sectionNumber, title, subtitle, description, color }: { sectionNumber: number; title: string; subtitle: string; description: string; color: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const scale = useTransform(scrollYProgress, [0.2, 0.5, 0.8], [0.5, 1, 0.5]);
  const opacity = useTransform(scrollYProgress, [0.2, 0.5, 0.8], [0, 1, 0]);

  return (
    <section ref={ref} className="relative h-screen flex items-center justify-center">
      <motion.div className="absolute inset-0" style={{ opacity }}>
        <Canvas camera={{ position: [0, 0, 5], fov: 50 }}>
          <Suspense fallback={null}>
            <ambientLight intensity={0.3} />
            <pointLight position={[10, 10, 10]} intensity={0.8} color={color} />
            <Float speed={1.5} rotationIntensity={0.3} floatIntensity={0.2}>
              <mesh scale={[2, 2, 2]}>
                <icosahedronGeometry args={[1, 4]} />
                <MeshDistortMaterial color={color} distort={0.5} speed={3} roughness={0} metalness={0.5} opacity={0.6} transparent />
              </mesh>
            </Float>
            <Points count={2000} color={color} />
            <SacredGeometry color={color} section={sectionNumber} />
          </Suspense>
        </Canvas>
      </motion.div>

      <motion.div style={{ scale, opacity }} className="relative z-10 max-w-4xl mx-auto text-center px-4">
        <div className="inline-block px-4 py-2 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 mb-6">
          <span className="text-amber-400 font-mono text-sm">{sectionNumber}/3</span>
        </div>
        <h2 className="text-4xl sm:text-5xl md:text-7xl font-bold mb-4 bg-gradient-to-r from-amber-200 to-amber-400 bg-clip-text text-transparent">{title}</h2>
        <h3 className="text-xl sm:text-2xl md:text-3xl text-amber-300/60 mb-8 font-light">{subtitle}</h3>
        <p className="text-lg sm:text-xl md:text-2xl text-white/80 leading-relaxed max-w-3xl mx-auto">{description}</p>
        {sectionNumber === 2 && <MiniSwaraShowcase />}
      </motion.div>
    </section>
  );
}

function Points({ count, color }: { count: number; color: string }) {
  const points = useRef<THREE.Points>(null);
  const particlesPosition = useMemo(() => {
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 10;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 10;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 10;
    }
    return positions;
  }, [count]);

  useFrame(({ clock }) => { if (points.current) points.current.rotation.y = clock.getElapsedTime() * 0.05; });

  return (
    <points ref={points}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={count}
          array={particlesPosition}
          itemSize={3}
          args={[particlesPosition, 3]}
        />
      </bufferGeometry>
      <pointsMaterial size={0.02} color={color} sizeAttenuation transparent opacity={0.6} />
    </points>
  );
}

function SacredGeometry({ color, section }: { color: string; section: number }) {
  const group = useRef<THREE.Group>(null);
  useFrame(({ clock }) => { if (group.current) { group.current.rotation.x = Math.sin(clock.getElapsedTime() * 0.3) * 0.2; group.current.rotation.y = clock.getElapsedTime() * 0.2; } });
  return (
    <group ref={group}>
      {section === 1 && <>{[0, 1, 2, 3].map((i) => <mesh key={i} position={[Math.cos(i * Math.PI / 2) * 2, Math.sin(i * Math.PI / 2) * 2, 0]}><tetrahedronGeometry args={[0.3]} /><meshStandardMaterial color={color} wireframe /></mesh>)}</>}
      {section === 2 && <>{[0, 1, 2, 3, 4, 5].map((i) => <mesh key={i} position={[Math.cos(i * Math.PI / 3) * 2.5, Math.sin(i * Math.PI / 3) * 2.5, 0]}><octahedronGeometry args={[0.3]} /><meshStandardMaterial color={color} wireframe /></mesh>)}</>}
      {section === 3 && <>{[0, 1, 2, 3, 4].map((i) => <mesh key={i} position={[Math.cos(i * Math.PI / 2.5) * 3, Math.sin(i * Math.PI / 2.5) * 3, 0]}><dodecahedronGeometry args={[0.3]} /><meshStandardMaterial color={color} wireframe /></mesh>)}</>}
    </group>
  );
}

function MiniSwaraShowcase() {
  const swaras = [
    { name: "Udātta", symbol: "—", color: "from-yellow-500 to-amber-500" },
    { name: "Anudātta", symbol: "↓", color: "from-blue-500 to-cyan-500" },
    { name: "Swarita", symbol: "↗", color: "from-red-500 to-rose-500" },
    { name: "Dīrgha Swarita", symbol: "⤴", color: "from-green-500 to-emerald-500" },
  ];
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-12">
      {swaras.map((swara, i) => (
        <motion.div key={swara.name} initial={{ opacity: 0, scale: 0.8 }} whileInView={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.1, duration: 0.4 }} viewport={{ once: false }} whileHover={{ scale: 1.1, y: -5 }} className="p-4 rounded-xl bg-white/5 backdrop-blur-sm border border-white/10">
          <div className={`text-4xl mb-2 bg-gradient-to-r ${swara.color} bg-clip-text text-transparent font-bold`}>{swara.symbol}</div>
          <div className="text-sm text-white/80">{swara.name}</div>
        </motion.div>
      ))}
    </div>
  );
}

function FinalCTASection() {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: false, amount: 0.5 });
  return (
    <section ref={ref} className="relative min-h-screen flex items-center justify-center px-4 py-20">
      <div className="absolute inset-0 opacity-30">
        <Canvas camera={{ position: [0, 0, 6] }}>
          <Suspense fallback={null}>
            <ambientLight intensity={0.5} />
            <Float speed={2}><Sphere args={[2, 64, 64]}><MeshDistortMaterial color="#f59e0b" distort={0.4} speed={2} roughness={0.2} /></Sphere></Float>
            <Stars />
          </Suspense>
        </Canvas>
      </div>
      <motion.div initial={{ opacity: 0, y: 50 }} animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 50 }} transition={{ duration: 0.8 }} className="max-w-4xl mx-auto text-center z-10 relative">
        <h2 className="text-5xl sm:text-6xl md:text-7xl font-bold mb-8 bg-gradient-to-r from-amber-200 via-amber-400 to-orange-400 bg-clip-text text-transparent">Begin Your Journey</h2>
        <p className="text-xl sm:text-2xl text-white/60 mb-12">Join the ancient lineage of Vedic chanters with AI-powered precision</p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link href="/mantras"><motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} className="relative group px-10 py-5 rounded-full overflow-hidden text-xl font-semibold"><div className="absolute inset-0 bg-gradient-to-r from-amber-600 via-orange-600 to-amber-600 group-hover:from-amber-500 group-hover:via-orange-500 group-hover:to-amber-500 transition-all duration-300" /><span className="relative text-white">Start Practicing →</span></motion.button></Link>
          <Link href="/admin"><motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} className="px-10 py-5 rounded-full border-2 border-white/20 hover:border-amber-400/50 text-white hover:text-amber-400 transition-all text-xl font-semibold">Explore Library</motion.button></Link>
        </div>
      </motion.div>
    </section>
  );
}
