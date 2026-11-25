import React, { useState } from 'react';
import { Check, Copy, Flame, Link2, Swords } from 'lucide-react';
import { CATEGORIES } from '../data/gameContent';
import type { Category, ChallengePayload, Difficulty, PlayerProgress } from '../types/game';
import { encodeChallengePayload } from '../utils/scoring';

interface ChallengesViewProps {
  progress: PlayerProgress;
  activeChallenge: ChallengePayload | null;
  onStartFriendChallenge: (category: Category | 'Daily Mix', difficulty: Difficulty, seed: string) => void;
  onOpenStreakModal: () => void;
}

export const ChallengesView: React.FC<ChallengesViewProps> = ({
  progress,
  activeChallenge,
  onStartFriendChallenge,
  onOpenStreakModal,
}) => {
  const [cat, setCat] = useState<Category | 'Daily Mix'>('Daily Mix');
  const [diff, setDiff] = useState<Difficulty>('Medium');
  const [targetScore, setTargetScore] = useState(400);
  const [copied, setCopied] = useState(false);

  const customSeed = `friend-${cat}-${diff}-${Date.now().toString(36).slice(-4)}`;
  const [generatedUrl, setGeneratedUrl] = useState<string>('');

  const handleGenerateLink = () => {
    const token = encodeChallengePayload({
      seed: customSeed,
      challengerName: progress.playerName || 'Challenger',
      challengerScore: targetScore,
      difficulty: diff,
      category: cat,
      roundEmojis: ['🟦', '🔷', '🟦', '🔷', '🟦'],
    });
    const url = `${window.location.origin}${window.location.pathname}?challenge=${token}`;
    setGeneratedUrl(url);
    setCopied(false);
  };

  const handleCopy = async () => {
    if (!generatedUrl) return;
    try {
      await navigator.clipboard.writeText(generatedUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback handled by input selection
    }
  };

  const sevenDayPct = Math.min(100, Math.round((progress.currentStreak / 7) * 100));
  const thirtyDayPct = Math.min(100, Math.round((progress.currentStreak / 30) * 100));

  return (
    <section className="space-y-8">
      <div className="border-b border-blue-100 pb-6">
        <span className="text-xs font-semibold text-blue-600">Social &amp; Daily Milestones</span>
        <h2 className="mt-1 font-display text-3xl font-extrabold text-blue-950">
          Challenge a Friend &amp; Streaks
        </h2>
        <p className="mt-1 text-sm text-slate-600">
          Send a seeded 5-round duel link to friends or track your 7-day and 30-day streak milestones.
        </p>
      </div>

      {activeChallenge && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border border-blue-300 bg-blue-50 p-5">
          <div>
            <div className="text-xs font-bold text-blue-700">Incoming 1v1 Invite</div>
            <h3 className="mt-0.5 font-display text-xl font-extrabold text-blue-950">
              {activeChallenge.challengerName} scored {activeChallenge.challengerScore}/500
            </h3>
            <p className="text-sm text-slate-600">
              {activeChallenge.category} · {activeChallenge.difficulty} Mode · Same 5 rounds locked to this seed.
            </p>
          </div>
          <button
            type="button"
            onClick={() =>
              onStartFriendChallenge(
                activeChallenge.category,
                activeChallenge.difficulty,
                activeChallenge.seed
              )
            }
            className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold text-white hover:bg-blue-700 cursor-pointer whitespace-nowrap"
          >
            Accept &amp; Play
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 1v1 Challenge Builder */}
        <div className="rounded-2xl border border-blue-200 bg-white p-6 shadow-sm space-y-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
              <Swords className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-display text-xl font-bold text-blue-950">
                Create a Friend Duel
              </h3>
              <p className="text-xs text-slate-500">
                Generates a locked 5-round seed so both players get identical comparisons.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <label className="block text-xs font-semibold text-slate-600">
              Category
              <select
                value={cat}
                onChange={(e) => setCat(e.target.value as Category | 'Daily Mix')}
                className="mt-1.5 w-full rounded-xl border border-blue-200 bg-blue-50/40 px-3 py-2.5 text-sm font-medium text-blue-950 focus:border-blue-600 focus:outline-none"
              >
                <option value="Daily Mix">Daily Mix</option>
                {CATEGORIES.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="block text-xs font-semibold text-slate-600">
              Difficulty
              <select
                value={diff}
                onChange={(e) => setDiff(e.target.value as Difficulty)}
                className="mt-1.5 w-full rounded-xl border border-blue-200 bg-blue-50/40 px-3 py-2.5 text-sm font-medium text-blue-950 focus:border-blue-600 focus:outline-none"
              >
                <option value="Easy">Easy</option>
                <option value="Medium">Medium</option>
                <option value="Hard">Hard</option>
              </select>
            </label>
          </div>

          <label className="block text-xs font-semibold text-slate-600">
            Target Score to Beat ({targetScore} / 500)
            <input
              type="range"
              min={150}
              max={500}
              step={10}
              value={targetScore}
              onChange={(e) => setTargetScore(Number(e.target.value))}
              className="scale-slider mt-2 w-full"
            />
          </label>

          <button
            type="button"
            onClick={handleGenerateLink}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold text-white hover:bg-blue-700 cursor-pointer"
          >
            <Link2 className="h-4 w-4" />
            Generate Challenge Link
          </button>

          {generatedUrl && (
            <div className="flex items-center gap-2 rounded-xl border border-blue-200 bg-blue-50/50 p-2.5">
              <input
                type="text"
                readOnly
                value={generatedUrl}
                onFocus={(e) => e.currentTarget.select()}
                className="flex-1 bg-transparent px-2 font-mono text-xs text-blue-950 focus:outline-none"
              />
              <button
                type="button"
                onClick={handleCopy}
                className="inline-flex items-center gap-1.5 rounded-lg bg-blue-950 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-900 cursor-pointer shrink-0"
              >
                {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                {copied ? 'Copied' : 'Copy'}
              </button>
            </div>
          )}
        </div>

        {/* Daily Streak Milestones Card */}
        <div className="rounded-2xl border border-blue-200 bg-white p-6 shadow-sm flex flex-col justify-between space-y-5">
          <div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                  <Flame className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-display text-xl font-bold text-blue-950">
                    Daily Streak Challenge
                  </h3>
                  <p className="text-xs text-slate-500">
                    Complete one daily round each day to unlock 7-day &amp; 30-day rewards.
                  </p>
                </div>
              </div>
              <span className="font-mono text-2xl font-extrabold text-blue-700 tabular-nums">
                {progress.currentStreak}d
              </span>
            </div>

            <div className="mt-6 space-y-4">
              <div>
                <div className="flex justify-between text-xs font-semibold text-blue-950">
                  <span>7-Day Milestone</span>
                  <span className="font-mono tabular-nums">
                    {Math.min(7, progress.currentStreak)} / 7 days
                  </span>
                </div>
                <div className="mt-1.5 h-2.5 w-full overflow-hidden rounded-full bg-blue-100">
                  <div
                    className="h-full rounded-full bg-blue-600 transition-all"
                    style={{ width: `${sevenDayPct}%` }}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs font-semibold text-blue-950">
                  <span>30-Day Milestone</span>
                  <span className="font-mono tabular-nums">
                    {Math.min(30, progress.currentStreak)} / 30 days
                  </span>
                </div>
                <div className="mt-1.5 h-2.5 w-full overflow-hidden rounded-full bg-blue-100">
                  <div
                    className="h-full rounded-full bg-sky-500 transition-all"
                    style={{ width: `${thirtyDayPct}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between border-t border-blue-50 pt-4 text-xs">
            <span className="text-slate-600">
              Streak Shields available: <strong className="font-mono text-blue-950">{progress.streakFreezes}</strong>
            </span>
            <button
              type="button"
              onClick={onOpenStreakModal}
              className="font-semibold text-blue-700 hover:underline cursor-pointer"
            >
              View Streak Calendar
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};
