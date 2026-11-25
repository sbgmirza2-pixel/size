import { useEffect, useState } from 'react';
import { ArrowLeft, Award, Flame, Ruler } from 'lucide-react';
import { BadgesView } from './components/BadgesView';
import { BlogSection } from './components/BlogSection';
import { CategoryHub } from './components/CategoryHub';
import { ChallengeModal } from './components/ChallengeModal';
import { ChallengesView } from './components/ChallengesView';
import { DailyEstimateGame } from './components/DailyEstimateGame';
import { DailySlateBar } from './components/DailySlateBar';
import { LeaderboardView } from './components/LeaderboardView';
import { Navbar } from './components/Navbar';
import { RankRushGame } from './components/RankRushGame';
import { RapidFireGame } from './components/RapidFireGame';
import { SizeItUpArena } from './components/SizeItUpArena';
import { StreakModal } from './components/StreakModal';
import { Weekly1KGame } from './components/Weekly1KGame';
import { WeighItUpGame } from './components/WeighItUpGame';
import { ACHIEVEMENT_BADGES, CATEGORIES } from './data/gameContent';
import type {
  Category,
  ChallengePayload,
  Difficulty,
  GameMode,
  NavTab,
  PlayerProgress,
  RoundResult,
} from './types/game';
import {
  decodeChallengePayload,
  evaluateBadges,
  getRankTitle,
  getTodayKey,
} from './utils/scoring';
import { soundFX } from './utils/sound';

const STORAGE_KEY = 'size-it-up-progress-v1';

const DEFAULT_PROGRESS: PlayerProgress = {
  playerName: 'PlayerOne',
  xp: 0,
  currentStreak: 0,
  bestStreak: 0,
  lastCompletedDate: null,
  completedDates: [],
  dailyCompletedModes: {},
  gamesPlayed: 0,
  bestScore: 0,
  perfectGuesses: 0,
  fastestRoundSeconds: null,
  totalAccuracySum: 0,
  totalRoundsPlayed: 0,
  categoriesCompleted: [],
  unlockedBadges: [],
  streakFreezes: 1,
  todayCompleted: false,
};

function loadInitialProgress(): PlayerProgress {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_PROGRESS;
    const parsed = JSON.parse(raw) as Partial<PlayerProgress>;
    const today = getTodayKey();
    const yesterdayDate = new Date();
    yesterdayDate.setDate(yesterdayDate.getDate() - 1);
    const yesterday = `${yesterdayDate.getFullYear()}-${String(
      yesterdayDate.getMonth() + 1
    ).padStart(2, '0')}-${String(yesterdayDate.getDate()).padStart(2, '0')}`;

    const last = parsed.lastCompletedDate || null;
    const streakStillValid = last === today || last === yesterday;

    return {
      ...DEFAULT_PROGRESS,
      ...parsed,
      dailyCompletedModes: parsed.dailyCompletedModes || {},
      currentStreak: streakStillValid ? parsed.currentStreak ?? 0 : 0,
      todayCompleted: last === today,
    };
  } catch {
    return DEFAULT_PROGRESS;
  }
}

export default function App() {
  const [activeTab, setActiveTab] = useState<NavTab>('play');
  const [gameMode, setGameMode] = useState<GameMode>('size-it-up');
  const [selectedCategory, setSelectedCategory] = useState<Category | 'Daily Mix'>('Daily Mix');
  const [selectedDifficulty, setSelectedDifficulty] = useState<Difficulty>('Medium');
  const [progress, setProgress] = useState<PlayerProgress>(loadInitialProgress);
  const [muted, setMuted] = useState(false);
  const [streakOpen, setStreakOpen] = useState(false);
  const [lbRefresh, setLbRefresh] = useState(0);
  const [badgeToast, setBadgeToast] = useState<string | null>(null);
  const [challengeModalData, setChallengeModalData] = useState<{
    seed: string;
    score: number;
    difficulty: Difficulty;
    category: Category | 'Daily Mix';
    roundEmojis: string[];
  } | null>(null);
  const [activeChallenge, setActiveChallenge] = useState<ChallengePayload | null>(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('challenge');
    return token ? decodeChallengePayload(token) : null;
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
    } catch {
      // Ignore storage quota errors
    }
  }, [progress]);

  const toggleMute = () => {
    soundFX.muted = !muted;
    setMuted(!muted);
  };

  const applyProgressUpdate = (
    updater: (prev: PlayerProgress) => { next: PlayerProgress; newlyUnlocked: string[] }
  ) => {
    setProgress((prev) => {
      const { next, newlyUnlocked } = updater(prev);
      if (newlyUnlocked.length > 0) {
        const badge = ACHIEVEMENT_BADGES.find((b) => b.id === newlyUnlocked[0]);
        if (badge) {
          setBadgeToast(`Badge Unlocked: ${badge.title}`);
          window.setTimeout(() => setBadgeToast(null), 4000);
        }
      }
      return next;
    });
  };

  const markDailyModeDone = (
    prevMap: Record<string, GameMode[]>,
    today: string,
    mode: GameMode
  ): Record<string, GameMode[]> => {
    const existing = prevMap[today] || [];
    if (existing.includes(mode)) return prevMap;
    return { ...prevMap, [today]: [...existing, mode] };
  };

  const handleSizeGameComplete = (summary: {
    results: RoundResult[];
    totalScore: number;
    avgAccuracy: number;
    category: Category | 'Daily Mix';
    difficulty: Difficulty;
    isDaily: boolean;
  }) => {
    const today = getTodayKey();
    const perfectCount = summary.results.filter((r) => r.score === 100).length;
    const fastestInGame = summary.results.reduce(
      (min, r) => (r.score >= 75 && r.timeSeconds < min ? r.timeSeconds : min),
      Infinity
    );

    applyProgressUpdate((prev) => {
      const alreadyCompletedToday = prev.lastCompletedDate === today;
      const nextStreak = alreadyCompletedToday ? prev.currentStreak : prev.currentStreak + 1;
      const nextBestStreak = Math.max(prev.bestStreak, nextStreak);
      const nextCategories =
        summary.category !== 'Daily Mix' && !prev.categoriesCompleted.includes(summary.category)
          ? [...prev.categoriesCompleted, summary.category]
          : prev.categoriesCompleted;

      const candidate: PlayerProgress = {
        ...prev,
        xp: prev.xp + Math.max(40, Math.round(summary.totalScore * 0.45)),
        currentStreak: nextStreak,
        bestStreak: nextBestStreak,
        lastCompletedDate: today,
        todayCompleted: true,
        completedDates: prev.completedDates.includes(today)
          ? prev.completedDates
          : [...prev.completedDates, today],
        dailyCompletedModes: markDailyModeDone(prev.dailyCompletedModes, today, 'size-it-up'),
        gamesPlayed: prev.gamesPlayed + 1,
        bestScore: Math.max(prev.bestScore, summary.totalScore),
        perfectGuesses: prev.perfectGuesses + perfectCount,
        fastestRoundSeconds:
          fastestInGame < Infinity
            ? prev.fastestRoundSeconds === null
              ? fastestInGame
              : Math.min(prev.fastestRoundSeconds, fastestInGame)
            : prev.fastestRoundSeconds,
        totalAccuracySum: prev.totalAccuracySum + summary.avgAccuracy * summary.results.length,
        totalRoundsPlayed: prev.totalRoundsPlayed + summary.results.length,
        categoriesCompleted: nextCategories,
      };

      const updatedBadges = evaluateBadges(candidate, summary.results, summary.totalScore);
      const newlyUnlocked = updatedBadges.filter((id) => !prev.unlockedBadges.includes(id));

      return {
        next: { ...candidate, unlockedBadges: updatedBadges },
        newlyUnlocked,
      };
    });
  };

  const handleMiniGameComplete = (mode: GameMode, score: number, accuracy: number) => {
    const today = getTodayKey();
    applyProgressUpdate((prev) => {
      const alreadyToday = prev.lastCompletedDate === today;
      const nextStreak = alreadyToday ? prev.currentStreak : prev.currentStreak + 1;
      const candidate: PlayerProgress = {
        ...prev,
        xp: prev.xp + Math.max(30, Math.round(score * 0.35)),
        currentStreak: nextStreak,
        bestStreak: Math.max(prev.bestStreak, nextStreak),
        lastCompletedDate: today,
        todayCompleted: true,
        completedDates: prev.completedDates.includes(today)
          ? prev.completedDates
          : [...prev.completedDates, today],
        dailyCompletedModes: markDailyModeDone(prev.dailyCompletedModes, today, mode),
        gamesPlayed: prev.gamesPlayed + 1,
        bestScore: Math.max(prev.bestScore, score),
        totalAccuracySum: prev.totalAccuracySum + accuracy,
        totalRoundsPlayed: prev.totalRoundsPlayed + 1,
      };
      const updatedBadges = evaluateBadges(candidate);
      const newlyUnlocked = updatedBadges.filter((id) => !prev.unlockedBadges.includes(id));
      return {
        next: { ...candidate, unlockedBadges: updatedBadges },
        newlyUnlocked,
      };
    });
  };

  const handleSubmitLeaderboard = async (
    score: number,
    accuracy: number,
    name: string,
    categoryOverride?: string
  ) => {
    setProgress((prev) => ({ ...prev, playerName: name }));
    try {
      await fetch('/api/leaderboard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          playerName: name,
          score,
          mode: gameMode,
          difficulty: selectedDifficulty,
          category: categoryOverride || selectedCategory,
          accuracy,
          streak: progress.currentStreak,
        }),
      });
      setLbRefresh((n) => n + 1);
    } catch {
      // Fail gracefully
    }
  };

  const launchModeFromAnywhere = (mode: GameMode) => {
    setGameMode(mode);
    setActiveTab('play');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const rank = getRankTitle(progress.xp);
  const todayKey = getTodayKey();
  const completedTodayModes = progress.dailyCompletedModes[todayKey] || [];

  return (
    <div className="min-h-screen flex flex-col bg-[#f4f8ff] text-blue-950">
      <Navbar
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        streak={progress.currentStreak}
        todayCompleted={progress.todayCompleted}
        muted={muted}
        onToggleMute={toggleMute}
        onOpenStreak={() => setStreakOpen(true)}
      />

      {badgeToast && (
        <div
          role="status"
          className="fixed bottom-5 right-5 z-40 flex items-center gap-3 rounded-xl border border-blue-300 bg-blue-950 px-4 py-3 text-sm font-semibold text-white shadow-lg"
        >
          <Award className="h-4 w-4 text-sky-300" />
          <span>{badgeToast}</span>
        </div>
      )}

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6 sm:py-8">
        {activeTab === 'play' && (
          <div className="space-y-8">
            {/* Hero Title + Quick Back link if inside secondary mode */}
            <div className="space-y-4">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-blue-700">
                    <span className="inline-flex items-center gap-1 font-semibold">
                      <Ruler className="h-3.5 w-3.5" /> Visual Scale Calibration
                    </span>
                    <span aria-hidden="true">·</span>
                    <span>{rank.title}</span>
                    <span aria-hidden="true">·</span>
                    <span className="font-mono tabular-nums">{progress.xp} XP</span>
                  </div>
                  <h1 className="mt-1 font-display text-3xl sm:text-4xl font-extrabold tracking-tight text-blue-950">
                    {gameMode === 'size-it-up'
                      ? 'Size It Up'
                      : gameMode === 'weekly-1k'
                      ? 'The Weekly 1K'
                      : gameMode === 'weigh-it-up'
                      ? 'Weigh It Up'
                      : gameMode === 'daily-estimate'
                      ? 'Daily Estimate'
                      : gameMode === 'rank-rush'
                      ? 'Rank Rush'
                      : 'Rapid Fire'}
                  </h1>
                </div>

                {gameMode !== 'size-it-up' && (
                  <button
                    type="button"
                    onClick={() => setGameMode('size-it-up')}
                    className="inline-flex items-center gap-1.5 self-start sm:self-auto rounded-lg border border-blue-200 bg-white px-3.5 py-2 text-xs font-bold text-blue-900 hover:bg-blue-50 cursor-pointer"
                  >
                    <ArrowLeft className="h-3.5 w-3.5" />
                    Back to Size It Up
                  </button>
                )}
              </div>

              {/* Category + Difficulty Workspace Toolbar */}
              {(gameMode === 'size-it-up' ||
                gameMode === 'weigh-it-up' ||
                gameMode === 'daily-estimate') && (
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-blue-100 bg-white px-4 py-2.5">
                  <div className="flex items-center gap-2 overflow-x-auto py-0.5">
                    <button
                      type="button"
                      onClick={() => {
                        setActiveChallenge(null);
                        setSelectedCategory('Daily Mix');
                      }}
                      className={`rounded-lg px-3 py-1.5 text-xs font-semibold whitespace-nowrap cursor-pointer transition-colors ${
                        selectedCategory === 'Daily Mix'
                          ? 'bg-blue-950 text-white'
                          : 'text-slate-600 hover:bg-blue-50'
                      }`}
                    >
                      Daily Mix
                    </button>
                    {CATEGORIES.map((cat) => (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => {
                          setActiveChallenge(null);
                          setSelectedCategory(cat.id);
                        }}
                        className={`rounded-lg px-3 py-1.5 text-xs font-semibold whitespace-nowrap cursor-pointer transition-colors ${
                          selectedCategory === cat.id
                            ? 'bg-blue-950 text-white'
                            : 'text-slate-600 hover:bg-blue-50'
                        }`}
                      >
                        {cat.label}
                      </button>
                    ))}
                  </div>

                  <div className="flex items-center gap-1 rounded-lg bg-blue-50 p-1 shrink-0">
                    {(['Easy', 'Medium', 'Hard'] as const).map((diff) => (
                      <button
                        key={diff}
                        type="button"
                        onClick={() => {
                          setActiveChallenge(null);
                          setSelectedDifficulty(diff);
                        }}
                        className={`rounded-md px-2.5 py-1 text-xs font-bold cursor-pointer transition-colors whitespace-nowrap ${
                          selectedDifficulty === diff
                            ? 'bg-white text-blue-700 shadow-sm'
                            : 'text-slate-500 hover:text-blue-900'
                        }`}
                      >
                        {diff}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Active Flagship Game Surface (Front & Center on Home!) */}
              {gameMode === 'size-it-up' && (
                <SizeItUpArena
                  category={selectedCategory}
                  difficulty={selectedDifficulty}
                  activeChallenge={activeChallenge}
                  playerName={progress.playerName}
                  onGameComplete={handleSizeGameComplete}
                  onOpenChallengeModal={setChallengeModalData}
                  onSubmitLeaderboard={handleSubmitLeaderboard}
                  onClearChallenge={() => setActiveChallenge(null)}
                />
              )}
              {gameMode === 'weigh-it-up' && (
                <WeighItUpGame
                  category={selectedCategory}
                  difficulty={selectedDifficulty}
                  onComplete={(s, a) => handleMiniGameComplete('weigh-it-up', s, a)}
                />
              )}
              {gameMode === 'daily-estimate' && (
                <DailyEstimateGame
                  category={selectedCategory}
                  difficulty={selectedDifficulty}
                  onComplete={(s, a) => handleMiniGameComplete('daily-estimate', s, a)}
                />
              )}
              {gameMode === 'rank-rush' && (
                <RankRushGame onComplete={(s, a) => handleMiniGameComplete('rank-rush', s, a)} />
              )}
              {gameMode === 'rapid-fire' && (
                <RapidFireGame onComplete={(s, a) => handleMiniGameComplete('rapid-fire', s, a)} />
              )}
              {gameMode === 'weekly-1k' && (
                <Weekly1KGame
                  playerName={progress.playerName}
                  onComplete={(s, a) => handleMiniGameComplete('weekly-1k', s, a)}
                  onSubmitLeaderboard={handleSubmitLeaderboard}
                />
              )}
            </div>

            {/* Compact Streak & Badges Strip */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-blue-100 bg-white px-5 py-3.5 text-xs text-slate-600">
              <div className="flex flex-wrap items-center gap-3">
                <span className="inline-flex items-center gap-1.5 font-semibold text-blue-950">
                  <Flame className="h-4 w-4 text-blue-600" />
                  {progress.currentStreak}-Day Streak
                </span>
                <span aria-hidden="true">·</span>
                <span>
                  7-Day Milestone:{' '}
                  <strong className="font-mono text-blue-950">
                    {Math.min(7, progress.currentStreak)}/7
                  </strong>
                </span>
                <span aria-hidden="true">·</span>
                <span>
                  Badges:{' '}
                  <strong className="font-mono text-blue-950">
                    {progress.unlockedBadges.length}/{ACHIEVEMENT_BADGES.length}
                  </strong>
                </span>
              </div>
              <div className="flex items-center gap-4 font-medium text-blue-700">
                <button
                  type="button"
                  onClick={() => setActiveTab('badges')}
                  className="hover:underline cursor-pointer"
                >
                  Achievement Badges
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('leaderboard')}
                  className="hover:underline cursor-pointer"
                >
                  Leaderboard
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('challenges')}
                  className="hover:underline cursor-pointer"
                >
                  Challenge Friend
                </button>
              </div>
            </div>

            {/* More Daily & Weekly Games Hub below Size It Up */}
            <div className="space-y-3">
              <h2 className="font-display text-xl font-extrabold text-blue-950">
                More Daily &amp; Weekly Scale Games
              </h2>
              <DailySlateBar
                activeMode={gameMode}
                completedTodayModes={completedTodayModes}
                onSelectMode={launchModeFromAnywhere}
              />
            </div>

            {/* Scale & Strategy Blog Preview below the games */}
            <BlogSection
              compact
              onLaunchMode={launchModeFromAnywhere}
              onOpenFullBlog={() => {
                setActiveTab('blog');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
            />
          </div>
        )}

        {activeTab === 'categories' && (
          <CategoryHub
            selectedCategory={selectedCategory}
            selectedDifficulty={selectedDifficulty}
            completedCategories={progress.categoriesCompleted}
            onChangeDifficulty={setSelectedDifficulty}
            onStartCategory={(cat, diff) => {
              setActiveChallenge(null);
              setSelectedCategory(cat);
              setSelectedDifficulty(diff);
              setGameMode('size-it-up');
              setActiveTab('play');
            }}
          />
        )}

        {activeTab === 'challenges' && (
          <ChallengesView
            progress={progress}
            activeChallenge={activeChallenge}
            onStartFriendChallenge={(cat, diff, seed) => {
              setActiveChallenge({
                seed,
                challengerName: activeChallenge?.challengerName || 'Friend',
                challengerScore: activeChallenge?.challengerScore || 400,
                difficulty: diff,
                category: cat,
                roundEmojis: activeChallenge?.roundEmojis || ['🟦', '🟦', '🟦', '🟦', '🟦'],
              });
              setSelectedCategory(cat);
              setSelectedDifficulty(diff);
              setGameMode('size-it-up');
              setActiveTab('play');
            }}
            onOpenStreakModal={() => setStreakOpen(true)}
          />
        )}

        {activeTab === 'leaderboard' && (
          <LeaderboardView
            currentPlayerName={progress.playerName}
            refreshSignal={lbRefresh}
          />
        )}

        {activeTab === 'badges' && <BadgesView progress={progress} />}

        {activeTab === 'blog' && (
          <BlogSection onLaunchMode={launchModeFromAnywhere} />
        )}
      </main>

      <footer className="border-t border-blue-100 bg-white py-5 text-xs text-slate-500">
        <div className="mx-auto flex max-w-6xl flex-col sm:flex-row items-center justify-between gap-2 px-4 sm:px-6">
          <span>Size It Up — Daily Visual Scale &amp; Estimation Arcade</span>
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => setActiveTab('badges')}
              className="hover:text-blue-700 cursor-pointer"
            >
              Badges
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('blog')}
              className="hover:text-blue-700 cursor-pointer"
            >
              Blog Guides
            </button>
            <span>Scroll or Arrow keys resize · Enter locks in</span>
          </div>
        </div>
      </footer>

      <StreakModal
        open={streakOpen}
        progress={progress}
        onClose={() => setStreakOpen(false)}
      />

      <ChallengeModal
        data={challengeModalData}
        playerName={progress.playerName}
        onClose={() => setChallengeModalData(null)}
      />
    </div>
  );
}
