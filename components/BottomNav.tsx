'use client';

import { Home, Headphones, User } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';

export default function BottomNav() {
  const pathname = usePathname();

  const navItems = [
    { href: '/dashboard', icon: Home, label: 'Home' },
    { href: '/mantras', icon: Headphones, label: 'Practice' },
    { href: '/settings', icon: User, label: 'Profile' },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 px-4 pb-4 pointer-events-none">
      <div className="max-w-md mx-auto pointer-events-auto">
        {/* Glassmorphic Navigation Bar */}
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 260, damping: 20 }}
          className="relative rounded-[28px] overflow-hidden"
          style={{
            background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.15) 0%, rgba(59, 130, 246, 0.15) 100%)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            boxShadow: '0 8px 32px 0 rgba(139, 92, 246, 0.25), inset 0 1px 0 0 rgba(255, 255, 255, 0.1)',
          }}
        >
          {/* Inner glow effect */}
          <div
            className="absolute inset-0 rounded-[28px]"
            style={{
              background: 'radial-gradient(circle at 50% 0%, rgba(167, 139, 250, 0.15) 0%, transparent 70%)',
            }}
          />

          {/* Navigation Items */}
          <div className="relative flex items-center justify-around px-6 py-4">
            {navItems.map((item) => {
              const isActive = pathname === item.href || pathname?.startsWith(item.href + '/');
              const Icon = item.icon;

              return (
                <Link key={item.href} href={item.href} className="flex-1">
                  <motion.div
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="relative flex flex-col items-center gap-1.5 py-2"
                  >
                    {/* Active State Background Glow */}
                    {isActive && (
                      <motion.div
                        layoutId="activeTab"
                        className="absolute inset-0 rounded-2xl"
                        style={{
                          background: 'linear-gradient(135deg, rgba(236, 72, 153, 0.25) 0%, rgba(139, 92, 246, 0.25) 100%)',
                          filter: 'blur(8px)',
                        }}
                        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                      />
                    )}

                    {/* Icon Container */}
                    <div className="relative">
                      {/* Active State Icon Background */}
                      {isActive && (
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          className="absolute inset-0 rounded-2xl -m-3"
                          style={{
                            background: 'linear-gradient(135deg, #ec4899 0%, #8b5cf6 100%)',
                            boxShadow: '0 4px 20px rgba(236, 72, 153, 0.5), 0 0 40px rgba(139, 92, 246, 0.3)',
                          }}
                        />
                      )}

                      {/* Icon */}
                      <motion.div
                        className="relative"
                        animate={isActive ? { y: [0, -2, 0] } : {}}
                        transition={{ duration: 0.3 }}
                      >
                        <Icon
                          className={`relative z-10 transition-all duration-300 ${
                            isActive
                              ? 'w-7 h-7 text-white drop-shadow-[0_0_8px_rgba(236,72,153,0.8)]'
                              : 'w-6 h-6 text-slate-300/60'
                          }`}
                          strokeWidth={isActive ? 2.5 : 2}
                        />

                        {/* Icon Inner Glow for Active State */}
                        {isActive && (
                          <motion.div
                            className="absolute inset-0 rounded-full blur-md"
                            style={{
                              background: 'radial-gradient(circle, rgba(236, 72, 153, 0.6) 0%, transparent 70%)',
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
                      </motion.div>
                    </div>

                    {/* Label */}
                    <motion.span
                      className={`relative z-10 text-xs font-medium transition-all duration-300 ${
                        isActive
                          ? 'text-white font-semibold'
                          : 'text-slate-300/50'
                      }`}
                      style={{
                        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                        letterSpacing: '0.01em',
                      }}
                      animate={isActive ? {
                        textShadow: '0 0 8px rgba(236, 72, 153, 0.6)'
                      } : {
                        textShadow: '0 0 0px rgba(0, 0, 0, 0)'
                      }}
                    >
                      {item.label}
                    </motion.span>

                    {/* Hover Glow Effect for Inactive */}
                    {!isActive && (
                      <motion.div
                        className="absolute inset-0 rounded-2xl opacity-0"
                        style={{
                          background: 'linear-gradient(135deg, rgba(167, 139, 250, 0.15) 0%, rgba(59, 130, 246, 0.15) 100%)',
                        }}
                        whileHover={{ opacity: 1 }}
                        transition={{ duration: 0.2 }}
                      />
                    )}
                  </motion.div>
                </Link>
              );
            })}
          </div>

          {/* Bottom Border Highlight */}
          <div
            className="absolute bottom-0 left-0 right-0 h-[1px]"
            style={{
              background: 'linear-gradient(90deg, transparent 0%, rgba(236, 72, 153, 0.3) 50%, transparent 100%)',
            }}
          />
        </motion.div>
      </div>
    </nav>
  );
}
