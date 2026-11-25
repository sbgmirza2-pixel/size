export type Category =
  | 'Animals'
  | 'Cars'
  | 'Space'
  | 'Buildings'
  | 'Sports'
  | 'Weird Objects';

export type Difficulty = 'Easy' | 'Medium' | 'Hard';

export type GameMode =
  | 'size-it-up'
  | 'weigh-it-up'
  | 'daily-estimate'
  | 'rank-rush'
  | 'rapid-fire'
  | 'weekly-1k';

export type NavTab = 'play' | 'categories' | 'leaderboard' | 'badges' | 'challenges' | 'blog';

export interface ScaleObject {
  id: string;
  name: string;
  category: Category;
  difficulty: Difficulty;
  measureType: 'Height' | 'Length' | 'Diameter' | 'Width';
  realMeters: number;
  displaySize: string;
  funFact: string;
  /** Optional photorealistic studio cutout image */
  imageUrl?: string;
  /** Natural bounding box [width, height] for accurate visual proportion */
  box: [number, number];
  /** Clean vector shapes rendered in SVG using currentColor */
  renderType: 'path' | 'compound';
  paths: {
    d: string;
    opacity?: number;
  }[];
}

export interface SizeRound {
  roundNumber: number;
  reference: ScaleObject;
  target: ScaleObject;
  /** True ratio: target.realMeters / reference.realMeters */
  trueRatio: number;
}

export interface RoundResult {
  roundNumber: number;
  referenceName: string;
  targetName: string;
  guessedRatio: number;
  trueRatio: number;
  score: number;
  errorPercent: number;
  timeSeconds: number;
  referenceDisplay: string;
  targetDisplay: string;
}

export interface WeighPuzzle {
  id: string;
  category: Category;
  difficulty: Difficulty;
  heavyItem: {
    name: string;
    weightKg: number;
    displayWeight: string;
  };
  unitItem: {
    name: string;
    pluralName: string;
    weightKg: number;
    displayWeight: string;
  };
  funFact: string;
}

export interface EstimateQuestion {
  id: string;
  category: Category;
  difficulty: Difficulty;
  prompt: string;
  unit: string;
  answer: number;
  explanation: string;
}

export interface RankItem {
  id: string;
  name: string;
  metricValue: number;
  metricDisplay: string;
  category: Category;
}

export interface RankRushSet {
  id: string;
  title: string;
  metricLabel: string;
  category: Category;
  difficulty: Difficulty;
  items: RankItem[];
}

export interface RapidPair {
  id: string;
  category: Category;
  difficulty: Difficulty;
  prompt: string;
  optionA: { name: string; value: number; display: string };
  optionB: { name: string; value: number; display: string };
}

export type WeeklyRound =
  | {
      type: 'visual';
      roundNumber: number;
      prompt: string;
      referenceId: string;
      targetId: string;
    }
  | {
      type: 'weight';
      roundNumber: number;
      heavyItem: { name: string; weightKg: number; displayWeight: string };
      unitItem: { name: string; pluralName: string; weightKg: number; displayWeight: string };
      funFact: string;
    }
  | {
      type: 'estimate';
      roundNumber: number;
      prompt: string;
      unit: string;
      answer: number;
      explanation: string;
    };

export interface WeeklyChallengePack {
  id: string;
  weekNumber: number;
  theme: string;
  subtitle: string;
  category: Category | 'Daily Mix';
  rounds: WeeklyRound[];
}

export interface AchievementBadge {
  id: string;
  title: string;
  description: string;
  requirement: string;
  tier: 'Bronze' | 'Silver' | 'Gold' | 'Diamond';
  iconName: 'target' | 'zap' | 'flame' | 'award' | 'crown' | 'compass' | 'sparkles' | 'shield';
}

export interface PlayerProgress {
  playerName: string;
  xp: number;
  currentStreak: number;
  bestStreak: number;
  lastCompletedDate: string | null;
  completedDates: string[];
  dailyCompletedModes: Record<string, GameMode[]>;
  gamesPlayed: number;
  bestScore: number;
  perfectGuesses: number;
  fastestRoundSeconds: number | null;
  totalAccuracySum: number;
  totalRoundsPlayed: number;
  categoriesCompleted: Category[];
  unlockedBadges: string[];
  streakFreezes: number;
  todayCompleted: boolean;
}

export interface LeaderboardEntry {
  id: string;
  playerName: string;
  score: number;
  mode: GameMode;
  difficulty: Difficulty;
  category: Category | 'Daily Mix';
  accuracy: number;
  streak: number;
  createdAt: string;
}

export interface ChallengePayload {
  seed: string;
  challengerName: string;
  challengerScore: number;
  difficulty: Difficulty;
  category: Category | 'Daily Mix';
  roundEmojis: string[];
}
