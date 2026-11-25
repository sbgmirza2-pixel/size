import React, { useEffect, useState } from 'react';
import { Calendar, CheckCircle2, Clock } from 'lucide-react';
import type { GameMode } from '../types/game';
import { getDailyPuzzleNumber, getMidnightCountdown } from '../utils/scoring';

interface DailySlateBarProps {
  activeMode: GameMode;
  completedTodayModes: GameMode[];
  onSelectMode: (mode: GameMode) => void;
}

const DAILY_SLATE: { id: GameMode; label: string; sub: string }[] = [
  { id: 'size-it-up', label: 'Size It Up', sub: '5 Visual Rounds' },
  { id: 'weigh-it-up', label: 'Weigh It Up', sub: 'Balance Scale' },
  { id: 'daily-estimate', label: 'Daily Estimate', sub: 'Fermi Number' },
  { id: 'rank-rush', label: 'Rank Rush', sub: 'Sort 4 Cards' },
  { id: 'rapid-fire', label: 'Rapid Fire', sub: '10s Survival' },
  { id: 'weekly-1k', label: 'Weekly 1K', sub: '10 Rounds · 1K' },
];

export const DailySlateBar: React.FC<DailySlateBarProps> = ({
  activeMode,
  completedTodayModes,
  onSelectMode,
}) => {
  const [countdown, setCountdown] = useState(getMidnightCountdown);
  const puzzleNumber = getDailyPuzzleNumber();

  useEffect(() => {
    const id = window.setInterval(() => {
      setCountdown(getMidnightCountdown());
    }, 1000);
    return () => window.clearInterval(id);
  }, []);

  return (
    <div className="rounded-2xl border border-blue-200 bg-white p-4 shadow-xs">
      <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-blue-50">
        <div className="flex items-center gap-2 text-xs font-bold text-blue-950">
          <Calendar className="h-4 w-4 text-blue-600" />
          <span>Daily Slate #{puzzleNumber}</span>
          <span className="text-slate-300">·</span>
          <span className="font-mono text-blue-700 tabular-nums">
            {completedTodayModes.length}/6 Cleared
          </span>
        </div>

        <div className="flex items-center gap-1.5 font-mono text-xs text-slate-500 tabular-nums">
          <Clock className="h-3.5 w-3.5 text-blue-600" />
          <span>Next daily in {countdown}</span>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
        {DAILY_SLATE.map((item) => {
          const isActive = activeMode === item.id;
          const isDone = completedTodayModes.includes(item.id);
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelectMode(item.id)}
              className={`flex items-center justify-between gap-2 rounded-xl border px-3 py-2.5 text-left transition-all cursor-pointer ${
                isActive
                  ? 'border-blue-600 bg-blue-600 text-white shadow-xs'
                  : isDone
                  ? 'border-blue-200 bg-blue-50/70 text-blue-950 hover:border-blue-400'
                  : 'border-blue-100 bg-white text-blue-950 hover:border-blue-300 hover:bg-blue-50/40'
              }`}
            >
              <div className="min-w-0">
                <div className="truncate text-xs font-bold">{item.label}</div>
                <div
                  className={`truncate text-[11px] ${
                    isActive ? 'text-blue-100' : 'text-slate-500'
                  }`}
                >
                  {item.sub}
                </div>
              </div>
              {isDone && (
                <CheckCircle2
                  className={`h-4 w-4 shrink-0 ${
                    isActive ? 'text-white' : 'text-blue-600'
                  }`}
                />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};
