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
    <nav className="fixed bottom-0 left-0 right-0 z-50 px-3 pb-3 pointer-events-none">
      <div className="max-w-md mx-auto pointer-events-auto">
        {/* Glassmorphic Navigation Bar */}
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 260, damping: 20 }}
          className="relative rounded-[24px] overflow-hidden"
          style={{
            background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.15) 0%, rgba(59, 130, 246, 0.15) 100%)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            boxShadow: '0 6px 24px 0 rgba(139, 92, 246, 0.25), inset 0 1px 0 0 rgba(255, 255, 255, 0.1)',
          }}
        >
          {/* Inner glow effect */}
          <div
            className="absolute inset-0 rounded-[24px]"
            style={{
              background: 'radial-gradient(circle at 50% 0%, rgba(167, 139, 250, 0.12) 0%, transparent 70%)',
            }}
          />

          {/* Navigation Items */}
          <div className="relative flex items-center justify-around px-4 py-2.5">
            {navItems.map((item) => {
              const isActive = pathname === item.href || pathname?.startsWith(item.href + '/');
              const Icon = item.icon;

              return (
                <Link key={item.href} href={item.href} className="flex-1">
                  <motion.div
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="relative flex items-center justify-center py-2"
                  >
                    {/* Active State Background Glow */}
                    {isActive && (
                      <motion.div
                        layoutId="activeTab"
                        className="absolute inset-0 rounded-xl"
                        style={{
                          background: 'linear-gradient(135deg, rgba(236, 72, 153, 0.2) 0%, rgba(139, 92, 246, 0.2) 100%)',
                          filter: 'blur(6px)',
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
                          className="absolute inset-0 rounded-xl -m-2"
                          style={{
                            background: 'linear-gradient(135deg, #ec4899 0%, #8b5cf6 100%)',
                            boxShadow: '0 3px 16px rgba(236, 72, 153, 0.4), 0 0 30px rgba(139, 92, 246, 0.25)',
                          }}
                        />
                      )}

                      {/* Icon */}
                      <motion.div
                        className="relative"
                        animate={isActive ? { y: [0, -1, 0] } : {}}
                        transition={{ duration: 0.3 }}
                      >
                        <Icon
                          className={`relative z-10 transition-all duration-300 ${
                            isActive
                              ? 'w-6 h-6 text-white drop-shadow-[0_0_6px_rgba(236,72,153,0.7)]'
                              : 'w-5 h-5 text-slate-300/60'
                          }`}
                          strokeWidth={isActive ? 2.5 : 2}
                        />

                        {/* Icon Inner Glow for Active State */}
                        {isActive && (
                          <motion.div
                            className="absolute inset-0 rounded-full blur-sm"
                            style={{
                              background: 'radial-gradient(circle, rgba(236, 72, 153, 0.5) 0%, transparent 70%)',
                            }}
                            animate={{
                              scale: [1, 1.15, 1],
                              opacity: [0.4, 0.7, 0.4],
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

                    {/* Hover Glow Effect for Inactive */}
                    {!isActive && (
                      <motion.div
                        className="absolute inset-0 rounded-xl opacity-0"
                        style={{
                          background: 'linear-gradient(135deg, rgba(167, 139, 250, 0.12) 0%, rgba(59, 130, 246, 0.12) 100%)',
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
