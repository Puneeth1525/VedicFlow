'use client';

import { motion } from 'framer-motion';
import { UserButton, useUser } from '@clerk/nextjs';
import { User, Bell, Shield, Palette } from 'lucide-react';

export default function SettingsPage() {
  const { user } = useUser();

  const settingsSections = [
    {
      title: 'Account',
      items: [
        { icon: User, label: 'Profile', description: 'Manage your profile information' },
        { icon: Bell, label: 'Notifications', description: 'Configure notification preferences' },
      ],
    },
    {
      title: 'Preferences',
      items: [
        { icon: Palette, label: 'Appearance', description: 'Customize app theme' },
        { icon: Shield, label: 'Privacy', description: 'Control your privacy settings' },
      ],
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-900 text-white pb-24">
      <div className="max-w-2xl mx-auto px-4 py-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-purple-400 to-cyan-400 bg-clip-text text-transparent mb-2">
            Settings
          </h1>
          <p className="text-purple-200 text-sm sm:text-base">Manage your account and preferences</p>
        </motion.div>

        {/* User Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="p-6 rounded-2xl bg-white/5 backdrop-blur-lg border border-white/10 mb-8"
        >
          <div className="flex items-center gap-4">
            <UserButton
              appearance={{
                elements: {
                  avatarBox: 'w-16 h-16',
                },
              }}
            />
            <div className="flex-1">
              <h2 className="text-xl font-semibold">{user?.fullName || 'User'}</h2>
              <p className="text-sm text-purple-300">{user?.primaryEmailAddress?.emailAddress}</p>
            </div>
          </div>
        </motion.div>

        {/* Settings Sections */}
        {settingsSections.map((section, sectionIndex) => (
          <motion.div
            key={section.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 + sectionIndex * 0.1 }}
            className="mb-6"
          >
            <h3 className="text-lg font-semibold text-purple-300 mb-3 px-2">{section.title}</h3>
            <div className="space-y-2">
              {section.items.map((item) => {
                const Icon = item.icon;
                return (
                  <motion.button
                    key={item.label}
                    whileHover={{ scale: 1.02, x: 4 }}
                    whileTap={{ scale: 0.98 }}
                    className="w-full p-4 rounded-xl bg-white/5 backdrop-blur-lg border border-white/10 hover:border-purple-400/50 transition-all text-left"
                  >
                    <div className="flex items-center gap-4">
                      <div className="p-2 rounded-lg bg-purple-500/20">
                        <Icon className="w-5 h-5 text-purple-400" />
                      </div>
                      <div className="flex-1">
                        <div className="font-medium">{item.label}</div>
                        <div className="text-sm text-purple-300">{item.description}</div>
                      </div>
                      <div className="text-purple-400">›</div>
                    </div>
                  </motion.button>
                );
              })}
            </div>
          </motion.div>
        ))}

        {/* App Info */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-8 text-center text-sm text-purple-300"
        >
          <p>VedicFlo v0.1.0</p>
          <p className="mt-1">Made with 🕉️ for Vedic learners</p>
        </motion.div>
      </div>
    </div>
  );
}
