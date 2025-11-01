'use client';

import { Home, BookOpen, User } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';

export default function BottomNav() {
  const pathname = usePathname();

  const navItems = [
    { href: '/dashboard', icon: Home, label: 'Home' },
    { href: '/mantras', icon: BookOpen, label: 'Mantras' },
    { href: '/settings', icon: User, label: 'Profile' },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-black/80 backdrop-blur-md border-t border-white/10">
      <div className="max-w-lg mx-auto">
        <div className="flex items-center justify-around h-14">
          {navItems.map((item) => {
            const isActive = pathname === item.href || pathname?.startsWith(item.href + '/');
            const Icon = item.icon;

            return (
              <Link key={item.href} href={item.href} className="flex-1">
                <motion.div
                  whileTap={{ scale: 0.9 }}
                  className="flex items-center justify-center h-14"
                >
                  <Icon
                    className={`w-7 h-7 transition-colors ${
                      isActive
                        ? 'text-white stroke-[2.5]'
                        : 'text-slate-400 hover:text-slate-300 stroke-[2]'
                    }`}
                    strokeWidth={isActive ? 2.5 : 2}
                  />
                </motion.div>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
