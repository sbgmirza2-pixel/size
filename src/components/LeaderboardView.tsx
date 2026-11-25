import React, { useEffect, useState } from 'react';
import { RefreshCw, Trophy } from 'lucide-react';
import type { Difficulty, GameMode, LeaderboardEntry } from '../types/game';

interface LeaderboardViewProps {
  currentPlayerName: string;
  refreshSignal: number;
}

export const LeaderboardView: React.FC<LeaderboardViewProps> = ({
  currentPlayerName,
  refreshSignal,
}) => {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modeFilter, setModeFilter] = useState<GameMode | 'all'>('all');
  const [diffFilter, setDiffFilter] = useState<Difficulty | 'all'>('all');

  const fetchBoard = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/leaderboard?mode=${encodeURIComponent(modeFilter)}&difficulty=${encodeURIComponent(diffFilter)}`
      );
      if (!res.ok) throw new Error('Failed to load leaderboard');
      const data = (await res.json()) as { entries: LeaderboardEntry[] };
      setEntries(data.entries || []);
    } catch {
      setError('Could not load global rankings right now.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBoard();
  }, [modeFilter, diffFilter, refreshSignal]);

  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between border-b border-blue-100 pb-6">
        <div>
          <span className="text-xs font-semibold text-blue-600">Global Rankings</span>
          <h2 className="mt-1 font-display text-3xl font-extrabold text-blue-950">
            Global Leaderboard
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            Compare scores, accuracy, and streaks against top Size It Up players worldwide.
          </p>
        </div>

        <button
          type="button"
          onClick={fetchBoard}
          className="inline-flex items-center gap-2 rounded-lg border border-blue-200 bg-white px-4 py-2 text-xs font-semibold text-blue-900 hover:bg-blue-50 cursor-pointer self-start sm:self-auto"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1 rounded-xl bg-blue-100/70 p-1">
          {[
            { id: 'all', label: 'All Modes' },
            { id: 'weekly-1k', label: 'Weekly 1K' },
            { id: 'size-it-up', label: 'Size It Up' },
            { id: 'weigh-it-up', label: 'Weigh It Up' },
            { id: 'rapid-fire', label: 'Rapid Fire' },
            { id: 'rank-rush', label: 'Rank Rush' },
            { id: 'daily-estimate', label: 'Daily Estimate' },
          ].map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => setModeFilter(m.id as GameMode | 'all')}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                modeFilter === m.id
                  ? 'bg-white text-blue-950 shadow-sm'
                  : 'text-slate-600 hover:text-blue-950'
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1 rounded-xl bg-blue-100/70 p-1">
          {(['all', 'Easy', 'Medium', 'Hard'] as const).map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => setDiffFilter(d)}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                diffFilter === d
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-600 hover:text-blue-950'
              }`}
            >
              {d === 'all' ? 'All Tiers' : d}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-2xl border border-blue-200 bg-white shadow-sm">
        {loading ? (
          <div className="p-10 text-center text-sm text-slate-500">
            Loading rankings...
          </div>
        ) : error ? (
          <div className="p-10 text-center text-sm text-rose-600">{error}</div>
        ) : entries.length === 0 ? (
          <div className="p-10 text-center text-sm text-slate-500">
            No scores recorded for this filter yet. Play a round and claim #1!
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-blue-100 bg-blue-50/60 text-xs font-semibold text-slate-500">
                <tr>
                  <th className="px-5 py-3.5">Rank</th>
                  <th className="px-5 py-3.5">Player</th>
                  <th className="px-5 py-3.5">Mode &amp; Category</th>
                  <th className="px-5 py-3.5">Difficulty</th>
                  <th className="px-5 py-3.5 text-right">Accuracy</th>
                  <th className="px-5 py-3.5 text-right">Streak</th>
                  <th className="px-5 py-3.5 text-right">Score</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-blue-50">
                {entries.map((entry, idx) => {
                  const isYou =
                    currentPlayerName &&
                    entry.playerName.toLowerCase() === currentPlayerName.toLowerCase();
                  return (
                    <tr
                      key={entry.id}
                      className={isYou ? 'bg-blue-50/80' : 'hover:bg-blue-50/30'}
                    >
                      <td className="px-5 py-3.5 font-mono font-bold tabular-nums text-blue-950">
                        {idx === 0 ? (
                          <span className="inline-flex items-center gap-1.5 text-blue-600">
                            <Trophy className="h-4 w-4" /> #1
                          </span>
                        ) : (
                          `#${idx + 1}`
                        )}
                      </td>
                      <td className="px-5 py-3.5 font-semibold text-blue-950">
                        {entry.playerName}
                        {isYou && (
                          <span className="ml-2 text-xs font-medium text-blue-600">
                            (You)
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-3.5 text-slate-600">
                        {entry.mode} · {entry.category}
                      </td>
                      <td className="px-5 py-3.5 text-slate-600">{entry.difficulty}</td>
                      <td className="px-5 py-3.5 text-right font-mono tabular-nums text-slate-700">
                        {entry.accuracy}%
                      </td>
                      <td className="px-5 py-3.5 text-right font-mono tabular-nums text-blue-700">
                        {entry.streak}d
                      </td>
                      <td className="px-5 py-3.5 text-right font-mono font-extrabold tabular-nums text-blue-950">
                        {entry.score}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
};
