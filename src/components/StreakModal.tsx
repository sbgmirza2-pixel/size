import React from 'react';
import { Flame, Shield, Trophy, X } from 'lucide-react';
import type { PlayerProgress } from '../types/game';
import { getTodayKey } from '../utils/scoring';

interface StreakModalProps {
  open: boolean;
  progress: PlayerProgress;
  onClose: () => void;
}

export const StreakModal: React.FC<StreakModalProps> = ({ open, progress, onClose }) => {
  if (!open) return null;

  const today = getTodayKey();
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
      d.getDate()
    ).padStart(2, '0')}`;
    const label = d.toLocaleDateString('en-US', { weekday: 'short' });
    const done = progress.completedDates.includes(key);
    return { key, label, done, isToday: key === today };
  });

  const sevenPct = Math.min(100, Math.round((progress.currentStreak / 7) * 100));
  const thirtyPct = Math.min(100, Math.round((progress.currentStreak / 30) * 100));

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-blue-950/40 p-4 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-labelledby="streak-modal-title"
    >
      <div className="w-full max-w-md rounded-2xl border border-blue-200 bg-white p-6 shadow-xl">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-600 text-white">
              <Flame className="h-5 w-5" />
            </div>
            <div>
              <h2 id="streak-modal-title" className="font-display text-xl font-extrabold text-blue-950">
                Daily Streak Tracker
              </h2>
              <p className="text-xs text-slate-500">
                {progress.todayCompleted
                  ? 'Today’s daily challenge is complete.'
                  : 'Finish a Daily Mix game today to extend your streak.'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close streak modal"
            className="rounded-lg p-1.5 text-slate-400 hover:bg-blue-50 hover:text-blue-950 cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-6 grid grid-cols-3 gap-3 rounded-xl bg-blue-50/70 p-4 text-center">
          <div>
            <div className="font-mono text-2xl font-extrabold text-blue-700 tabular-nums">
              {progress.currentStreak}
            </div>
            <div className="text-xs text-slate-600">Current</div>
          </div>
          <div>
            <div className="font-mono text-2xl font-extrabold text-blue-950 tabular-nums">
              {progress.bestStreak}
            </div>
            <div className="text-xs text-slate-600">Best</div>
          </div>
          <div>
            <div className="font-mono text-2xl font-extrabold text-sky-600 tabular-nums">
              {progress.streakFreezes}
            </div>
            <div className="text-xs text-slate-600">Shields</div>
          </div>
        </div>

        {/* Last 7 days */}
        <div className="mt-5">
          <div className="text-xs font-semibold text-slate-500 mb-2.5">Last 7 Days</div>
          <div className="grid grid-cols-7 gap-2 text-center">
            {last7Days.map((day) => (
              <div key={day.key} className="flex flex-col items-center gap-1.5">
                <div
                  className={`flex h-9 w-9 items-center justify-center rounded-lg border text-xs font-bold ${
                    day.done
                      ? 'border-blue-600 bg-blue-600 text-white'
                      : day.isToday
                      ? 'border-blue-400 bg-blue-50 text-blue-700'
                      : 'border-blue-100 bg-slate-50 text-slate-400'
                  }`}
                >
                  {day.done ? '✓' : '·'}
                </div>
                <span className="text-[11px] font-medium text-slate-500">{day.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* 7-day & 30-day milestones */}
        <div className="mt-6 space-y-3 border-t border-blue-100 pt-5">
          <div>
            <div className="flex items-center justify-between text-xs font-semibold text-blue-950">
              <span className="flex items-center gap-1.5">
                <Shield className="h-3.5 w-3.5 text-blue-600" /> 7-Day Milestone
              </span>
              <span className="font-mono tabular-nums">{Math.min(7, progress.currentStreak)} / 7</span>
            </div>
            <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-blue-100">
              <div className="h-full rounded-full bg-blue-600" style={{ width: `${sevenPct}%` }} />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between text-xs font-semibold text-blue-950">
              <span className="flex items-center gap-1.5">
                <Trophy className="h-3.5 w-3.5 text-sky-600" /> 30-Day Milestone
              </span>
              <span className="font-mono tabular-nums">{Math.min(30, progress.currentStreak)} / 30</span>
            </div>
            <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-blue-100">
              <div className="h-full rounded-full bg-sky-500" style={{ width: `${thirtyPct}%` }} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
