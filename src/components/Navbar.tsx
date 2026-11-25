import React from 'react';
import { Flame, Volume2, VolumeX } from 'lucide-react';
import type { NavTab } from '../types/game';

interface NavbarProps {
  activeTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  streak: number;
  todayCompleted: boolean;
  muted: boolean;
  onToggleMute: () => void;
  onOpenStreak: () => void;
}

const NAV_ITEMS: { id: NavTab; label: string }[] = [
  { id: 'play', label: 'Play' },
  { id: 'categories', label: 'Categories' },
  { id: 'challenges', label: 'Challenges' },
  { id: 'leaderboard', label: 'Leaderboard' },
  { id: 'blog', label: 'Blog' },
];

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  onSelectTab,
  streak,
  muted,
  onToggleMute,
  onOpenStreak,
}) => {
  return (
    <header className="sticky top-0 z-30 border-b border-blue-100 bg-white/95 backdrop-blur-sm">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-8 px-4 py-3.5 sm:px-6">
        {/* Zone 1: Single-line Brand Wordmark */}
        <button
          type="button"
          onClick={() => onSelectTab('play')}
          className="font-display text-xl font-extrabold tracking-tight text-blue-950 whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-blue-600 rounded"
        >
          Size It Up
        </button>

        {/* Zone 2: Clean single-line navigation links */}
        <nav
          aria-label="Primary Navigation"
          className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600"
        >
          {NAV_ITEMS.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelectTab(item.id)}
                className={`relative py-1 whitespace-nowrap shrink-0 cursor-pointer transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-blue-600 rounded ${
                  isActive
                    ? 'text-blue-700 font-semibold'
                    : 'text-slate-600 hover:text-blue-950'
                }`}
              >
                {item.label}
                {isActive && (
                  <span
                    aria-hidden="true"
                    className="absolute inset-x-0 -bottom-0.5 h-0.5 bg-blue-600 rounded-full"
                  />
                )}
              </button>
            );
          })}
        </nav>

        {/* Zone 3: 1 Primary Action + Sound utility */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={onToggleMute}
            aria-label={muted ? 'Unmute game sounds' : 'Mute game sounds'}
            title={muted ? 'Unmute sound' : 'Mute sound'}
            className="flex h-10 w-10 items-center justify-center rounded-lg text-slate-500 hover:bg-blue-50 hover:text-blue-700 transition-colors cursor-pointer"
          >
            {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
          </button>

          <button
            type="button"
            onClick={onOpenStreak}
            className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-xs sm:text-sm font-semibold text-white hover:bg-blue-700 active:scale-[0.98] transition-all whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Flame className="h-4 w-4 text-sky-200" />
            <span className="font-mono tabular-nums">{streak}d Streak</span>
          </button>
        </div>
      </div>

      {/* Compact mobile nav bar */}
      <nav
        aria-label="Mobile Navigation"
        className="flex md:hidden items-center justify-between border-t border-blue-50 px-3 py-1.5 overflow-x-auto gap-2"
      >
        {NAV_ITEMS.map((item) => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelectTab(item.id)}
              className={`px-2.5 py-1.5 text-xs font-medium whitespace-nowrap shrink-0 rounded-md cursor-pointer ${
                isActive ? 'bg-blue-50 text-blue-700 font-semibold' : 'text-slate-600'
              }`}
            >
              {item.label}
            </button>
          );
        })}
      </nav>
    </header>
  );
};
