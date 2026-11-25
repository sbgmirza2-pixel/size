import React from 'react';
import {
  Award,
  CheckCircle2,
  Compass,
  Crown,
  Flame,
  Lock,
  Shield,
  Sparkles,
  Target,
  Zap,
} from 'lucide-react';
import { ACHIEVEMENT_BADGES } from '../data/gameContent';
import type { AchievementBadge, PlayerProgress } from '../types/game';
import { getRankTitle } from '../utils/scoring';

interface BadgesViewProps {
  progress: PlayerProgress;
}

function renderBadgeIcon(name: AchievementBadge['iconName'], unlocked: boolean) {
  const cls = `h-5 w-5 ${unlocked ? 'text-blue-600' : 'text-slate-400'}`;
  switch (name) {
    case 'target':
      return <Target className={cls} />;
    case 'zap':
      return <Zap className={cls} />;
    case 'flame':
      return <Flame className={cls} />;
    case 'award':
      return <Award className={cls} />;
    case 'crown':
      return <Crown className={cls} />;
    case 'compass':
      return <Compass className={cls} />;
    case 'shield':
      return <Shield className={cls} />;
    default:
      return <Sparkles className={cls} />;
  }
}

export const BadgesView: React.FC<BadgesViewProps> = ({ progress }) => {
  const rank = getRankTitle(progress.xp);
  const avgAcc =
    progress.totalRoundsPlayed > 0
      ? Math.round(progress.totalAccuracySum / progress.totalRoundsPlayed)
      : 0;

  return (
    <section className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between border-b border-blue-100 pb-6">
        <div>
          <span className="text-xs font-semibold text-blue-600">Achievements &amp; Rank</span>
          <h2 className="mt-1 font-display text-3xl font-extrabold text-blue-950">
            Badge Vault
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            Unlock milestone badges by hitting perfect guesses, blazing speeds, and daily streaks.
          </p>
        </div>

        <div className="font-mono text-sm font-bold text-blue-700 tabular-nums">
          {progress.unlockedBadges.length} / {ACHIEVEMENT_BADGES.length} Unlocked
        </div>
      </div>

      {/* XP Rank Card */}
      <div className="rounded-2xl border border-blue-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="text-xs font-semibold text-blue-600">Current Tier</div>
            <div className="mt-1 font-display text-2xl font-extrabold text-blue-950">
              {rank.title}
            </div>
            <div className="mt-0.5 text-xs text-slate-500">
              {progress.xp.toLocaleString()} XP · Next: {rank.nextTitle}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-6 font-mono text-sm tabular-nums">
            <div>
              <div className="text-xs font-sans text-slate-500">Best Score</div>
              <div className="text-lg font-bold text-blue-950">{progress.bestScore}</div>
            </div>
            <div>
              <div className="text-xs font-sans text-slate-500">Avg Accuracy</div>
              <div className="text-lg font-bold text-blue-950">{avgAcc}%</div>
            </div>
            <div>
              <div className="text-xs font-sans text-slate-500">Perfect Rounds</div>
              <div className="text-lg font-bold text-blue-950">{progress.perfectGuesses}</div>
            </div>
          </div>
        </div>

        <div className="mt-4 h-2.5 w-full overflow-hidden rounded-full bg-blue-100">
          <div
            className="h-full rounded-full bg-blue-600 transition-all duration-300"
            style={{ width: `${rank.progressPct}%` }}
          />
        </div>
      </div>

      {/* Badges Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {ACHIEVEMENT_BADGES.map((badge) => {
          const unlocked = progress.unlockedBadges.includes(badge.id);
          return (
            <div
              key={badge.id}
              className={`flex flex-col justify-between rounded-2xl border p-5 transition-all ${
                unlocked
                  ? 'border-blue-300 bg-white shadow-sm'
                  : 'border-blue-100 bg-slate-50/70 opacity-80'
              }`}
            >
              <div>
                <div className="flex items-center justify-between">
                  <div
                    className={`flex h-10 w-10 items-center justify-center rounded-xl ${
                      unlocked ? 'bg-blue-50' : 'bg-slate-200/70'
                    }`}
                  >
                    {renderBadgeIcon(badge.iconName, unlocked)}
                  </div>
                  <span className="text-xs font-semibold text-slate-500">
                    {badge.tier}
                  </span>
                </div>

                <h3 className="mt-4 font-display text-lg font-bold text-blue-950">
                  {badge.title}
                </h3>
                <p className="mt-1 text-xs leading-relaxed text-slate-600">
                  {badge.description}
                </p>
              </div>

              <div className="mt-4 flex items-center justify-between border-t border-blue-50 pt-3 text-xs">
                <span className="text-slate-500">{badge.requirement}</span>
                {unlocked ? (
                  <span className="inline-flex items-center gap-1 font-semibold text-blue-700">
                    <CheckCircle2 className="h-3.5 w-3.5" /> Earned
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-slate-400">
                    <Lock className="h-3.5 w-3.5" /> Locked
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};
