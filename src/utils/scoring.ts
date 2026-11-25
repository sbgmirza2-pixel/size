import type {
  Category,
  ChallengePayload,
  Difficulty,
  PlayerProgress,
  RoundResult,
  ScaleObject,
  SizeRound,
} from '../types/game';

/** Deterministic seeded PRNG (Mulberry32) */
export function createSeededRandom(seedStr: string): () => number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < seedStr.length; i++) {
    h ^= seedStr.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return function () {
    let t = (h += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function getTodayKey(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function getDailyPuzzleNumber(): number {
  const start = new Date(2026, 0, 1).getTime();
  const now = new Date();
  const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  return Math.max(1, Math.floor((todayMidnight - start) / (1000 * 60 * 60 * 24)) + 1);
}

export function getMidnightCountdown(): string {
  const now = new Date();
  const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  const diffSec = Math.max(0, Math.floor((tomorrow.getTime() - now.getTime()) / 1000));
  const h = String(Math.floor(diffSec / 3600)).padStart(2, '0');
  const m = String(Math.floor((diffSec % 3600) / 60)).padStart(2, '0');
  const s = String(diffSec % 60).padStart(2, '0');
  return `${h}h ${m}m ${s}s`;
}

export function getDailyIndex(salt: string, length: number): number {
  if (length <= 0) return 0;
  const rng = createSeededRandom(`${getTodayKey()}-${salt}`);
  return Math.floor(rng() * length);
}

export function getCurrentWeekNumber(): number {
  const start = new Date(2026, 0, 4).getTime(); // First Sunday of 2026
  const now = new Date();
  const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  return Math.max(1, Math.floor((todayMidnight - start) / (1000 * 60 * 60 * 24 * 7)) + 1);
}

export function getWeeklyCountdown(): string {
  const now = new Date();
  const daysUntilSunday = (7 - now.getDay()) % 7 || 7;
  const nextSunday = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() + daysUntilSunday
  );
  const diffSec = Math.max(0, Math.floor((nextSunday.getTime() - now.getTime()) / 1000));
  const d = Math.floor(diffSec / 86400);
  const h = String(Math.floor((diffSec % 86400) / 3600)).padStart(2, '0');
  const m = String(Math.floor((diffSec % 3600) / 60)).padStart(2, '0');
  return `${d}d ${h}h ${m}m`;
}

/**
 * Score a visual scale guess from 0 to 100.
 * Within 5% error = 100 pts ("Perfect Guess").
 * Drops smoothly using logarithmic ratio error so both over- and under-scaling are scored fairly.
 */
export function calculateScaleScore(guessedRatio: number, trueRatio: number): {
  score: number;
  errorPercent: number;
  rating: 'Perfect' | 'Close' | 'Good' | 'Off';
  emoji: string;
} {
  const safeGuess = Math.max(0.01, guessedRatio);
  const safeTrue = Math.max(0.01, trueRatio);
  const absRelError = Math.abs(safeGuess - safeTrue) / safeTrue;
  const errorPercent = Math.round(absRelError * 1000) / 10;

  if (absRelError <= 0.055) {
    return { score: 100, errorPercent, rating: 'Perfect', emoji: '🟦' };
  }

  // Logarithmic distance (symmetric for 2x too big vs 0.5x too small)
  const logDiff = Math.abs(Math.log2(safeGuess / safeTrue));
  // 0.08 logDiff (~5.7%) -> ~99, 1.0 logDiff (2x off) -> ~45, 2.2 logDiff -> 0
  const rawScore = Math.max(0, Math.round(104 - logDiff * 56));
  const score = Math.min(99, rawScore);

  if (score >= 82) {
    return { score, errorPercent, rating: 'Close', emoji: '🔷' };
  }
  if (score >= 50) {
    return { score, errorPercent, rating: 'Good', emoji: '🔹' };
  }
  return { score, errorPercent, rating: 'Off', emoji: '⬜' };
}

/**
 * Build 5 balanced rounds from the object pool for a given category, difficulty, and seed.
 * Ensures every pair has a playable visual ratio between 0.16x and 6.2x.
 */
export function buildSizeRounds(
  pool: ScaleObject[],
  category: Category | 'Daily Mix',
  difficulty: Difficulty,
  seed: string,
  count = 5
): SizeRound[] {
  const rng = createSeededRandom(`${seed}-${category}-${difficulty}`);

  let filtered = pool.filter((item) => {
    const catMatch = category === 'Daily Mix' || item.category === category;
    const diffMatch =
      difficulty === 'Easy'
        ? item.difficulty === 'Easy'
        : difficulty === 'Medium'
        ? item.difficulty === 'Easy' || item.difficulty === 'Medium'
        : true;
    return catMatch && diffMatch;
  });

  if (filtered.length < 6) {
    filtered = pool.filter((item) => category === 'Daily Mix' || item.category === category);
  }
  if (filtered.length < 6) {
    filtered = [...pool];
  }

  // Build all valid pairs with ratio within [0.16, 6.2] and not identical
  const candidatePairs: { ref: ScaleObject; target: ScaleObject; ratio: number }[] = [];
  for (let i = 0; i < filtered.length; i++) {
    for (let j = 0; j < filtered.length; j++) {
      if (i === j) continue;
      const ref = filtered[i];
      const target = filtered[j];
      const ratio = target.realMeters / ref.realMeters;
      if (ratio >= 0.16 && ratio <= 6.2 && Math.abs(ratio - 1) > 0.08) {
        candidatePairs.push({ ref, target, ratio });
      }
    }
  }

  // Fallback across whole pool if category pool had narrow scale range
  if (candidatePairs.length < count) {
    for (let i = 0; i < filtered.length; i++) {
      for (let j = 0; j < pool.length; j++) {
        const ref = pool[j];
        const target = filtered[i];
        if (ref.id === target.id) continue;
        const ratio = target.realMeters / ref.realMeters;
        if (ratio >= 0.16 && ratio <= 6.2) {
          candidatePairs.push({ ref, target, ratio });
        }
      }
    }
  }

  // Shuffle deterministically, then softly prioritize pairs with realistic studio images
  const shuffled = [...candidatePairs];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  shuffled.sort((a, b) => {
    const aReal = (a.ref.imageUrl ? 1 : 0) + (a.target.imageUrl ? 1 : 0);
    const bReal = (b.ref.imageUrl ? 1 : 0) + (b.target.imageUrl ? 1 : 0);
    return bReal - aReal;
  });

  const chosen: SizeRound[] = [];
  const usedTargets = new Set<string>();

  for (const pair of shuffled) {
    if (chosen.length >= count) break;
    if (usedTargets.has(pair.target.id)) continue;
    usedTargets.add(pair.target.id);
    chosen.push({
      roundNumber: chosen.length + 1,
      reference: pair.ref,
      target: pair.target,
      trueRatio: pair.ratio,
    });
  }

  // If still fewer than count, fill remaining without unique target restriction
  let idx = 0;
  while (chosen.length < count && idx < shuffled.length) {
    const pair = shuffled[idx++];
    if (!chosen.some((r) => r.reference.id === pair.ref.id && r.target.id === pair.target.id)) {
      chosen.push({
        roundNumber: chosen.length + 1,
        reference: pair.ref,
        target: pair.target,
        trueRatio: pair.ratio,
      });
    }
  }

  return chosen;
}

export function getRankTitle(xp: number): { title: string; nextTitle: string; progressPct: number } {
  const tiers = [
    { min: 0, title: 'Scale Rookie' },
    { min: 400, title: 'Grid Scout' },
    { min: 1000, title: 'Ratio Ranger' },
    { min: 2000, title: 'Blueprint Ace' },
    { min: 3500, title: 'Magnitude Master' },
    { min: 6000, title: 'Cosmic Architect' },
  ];

  let currentIdx = 0;
  for (let i = 0; i < tiers.length; i++) {
    if (xp >= tiers[i].min) currentIdx = i;
  }
  const current = tiers[currentIdx];
  const next = tiers[currentIdx + 1];
  if (!next) {
    return { title: current.title, nextTitle: 'Max Rank', progressPct: 100 };
  }
  const span = next.min - current.min;
  const pct = Math.min(100, Math.round(((xp - current.min) / span) * 100));
  return { title: current.title, nextTitle: next.title, progressPct: pct };
}

export function evaluateBadges(
  progress: PlayerProgress,
  latestResults?: RoundResult[],
  latestTotalScore?: number
): string[] {
  const unlocked = new Set(progress.unlockedBadges);

  if (progress.perfectGuesses >= 1 || latestResults?.some((r) => r.score === 100)) {
    unlocked.add('perfect-guess');
  }
  if (
    (progress.fastestRoundSeconds !== null && progress.fastestRoundSeconds <= 4.5) ||
    latestResults?.some((r) => r.timeSeconds <= 4.5 && r.score >= 75)
  ) {
    unlocked.add('speed-master');
  }
  if (progress.currentStreak >= 5 || progress.bestStreak >= 5) {
    unlocked.add('5-day-streak');
  }
  if (progress.currentStreak >= 7 || progress.bestStreak >= 7) {
    unlocked.add('7-day-milestone');
  }
  if (progress.currentStreak >= 30 || progress.bestStreak >= 30) {
    unlocked.add('30-day-titan');
  }
  const avgAccuracy =
    progress.totalRoundsPlayed > 0
      ? progress.totalAccuracySum / progress.totalRoundsPlayed
      : 0;
  if (
    (progress.totalRoundsPlayed >= 5 && avgAccuracy >= 85) ||
    (latestTotalScore !== undefined && latestTotalScore >= 440)
  ) {
    unlocked.add('accuracy-expert');
  }
  if (progress.categoriesCompleted.length >= 3) {
    unlocked.add('category-explorer');
  }
  if (progress.gamesPlayed >= 10) {
    unlocked.add('arcade-regular');
  }

  return Array.from(unlocked);
}

export function encodeChallengePayload(payload: ChallengePayload): string {
  try {
    const json = JSON.stringify(payload);
    return btoa(unescape(encodeURIComponent(json)));
  } catch {
    return '';
  }
}

export function decodeChallengePayload(token: string): ChallengePayload | null {
  try {
    const json = decodeURIComponent(escape(atob(token)));
    const parsed = JSON.parse(json) as ChallengePayload;
    if (parsed && parsed.seed && typeof parsed.challengerScore === 'number') {
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
}
