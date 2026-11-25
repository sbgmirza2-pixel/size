import express from 'express';
import fs from 'fs';
import path from 'path';
import { createServer as createViteServer } from 'vite';

interface LeaderboardRecord {
  id: string;
  playerName: string;
  score: number;
  mode: 'size-it-up' | 'weigh-it-up' | 'daily-estimate' | 'rank-rush' | 'rapid-fire' | 'weekly-1k';
  difficulty: 'Easy' | 'Medium' | 'Hard';
  category: string;
  accuracy: number;
  streak: number;
  createdAt: string;
}

const DATA_DIR = path.resolve(process.cwd(), '.data');
const LB_FILE = path.join(DATA_DIR, 'leaderboard.json');

const SEED_LEADERBOARD: LeaderboardRecord[] = [
  {
    id: 'seed-w1',
    playerName: 'CosmicScale',
    score: 942,
    mode: 'weekly-1k',
    difficulty: 'Hard',
    category: 'Space',
    accuracy: 94,
    streak: 18,
    createdAt: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
  },
  {
    id: 'seed-w2',
    playerName: 'OrbitVibe',
    score: 886,
    mode: 'weekly-1k',
    difficulty: 'Medium',
    category: 'Space',
    accuracy: 89,
    streak: 11,
    createdAt: new Date(Date.now() - 1000 * 60 * 110).toISOString(),
  },
  {
    id: 'seed-1',
    playerName: 'NovaScale',
    score: 488,
    mode: 'size-it-up',
    difficulty: 'Hard',
    category: 'Daily Mix',
    accuracy: 97,
    streak: 14,
    createdAt: new Date(Date.now() - 1000 * 60 * 90).toISOString(),
  },
  {
    id: 'seed-2',
    playerName: 'BlueOrbit',
    score: 472,
    mode: 'size-it-up',
    difficulty: 'Medium',
    category: 'Space',
    accuracy: 94,
    streak: 9,
    createdAt: new Date(Date.now() - 1000 * 60 * 140).toISOString(),
  },
  {
    id: 'seed-3',
    playerName: 'PixelRuler',
    score: 461,
    mode: 'size-it-up',
    difficulty: 'Hard',
    category: 'Buildings',
    accuracy: 92,
    streak: 7,
    createdAt: new Date(Date.now() - 1000 * 60 * 210).toISOString(),
  },
  {
    id: 'seed-4',
    playerName: 'ZaraVibe',
    score: 446,
    mode: 'size-it-up',
    difficulty: 'Medium',
    category: 'Animals',
    accuracy: 89,
    streak: 5,
    createdAt: new Date(Date.now() - 1000 * 60 * 320).toISOString(),
  },
  {
    id: 'seed-5',
    playerName: 'TurboGauge',
    score: 430,
    mode: 'rapid-fire',
    difficulty: 'Hard',
    category: 'Cars',
    accuracy: 88,
    streak: 6,
    createdAt: new Date(Date.now() - 1000 * 60 * 410).toISOString(),
  },
  {
    id: 'seed-6',
    playerName: 'KairoGrid',
    score: 412,
    mode: 'rank-rush',
    difficulty: 'Easy',
    category: 'Sports',
    accuracy: 85,
    streak: 4,
    createdAt: new Date(Date.now() - 1000 * 60 * 500).toISOString(),
  },
];

function readLeaderboard(): LeaderboardRecord[] {
  try {
    if (!fs.existsSync(LB_FILE)) {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      fs.writeFileSync(LB_FILE, JSON.stringify(SEED_LEADERBOARD, null, 2));
      return [...SEED_LEADERBOARD];
    }
    const raw = fs.readFileSync(LB_FILE, 'utf-8');
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [...SEED_LEADERBOARD];
  } catch {
    return [...SEED_LEADERBOARD];
  }
}

function writeLeaderboard(records: LeaderboardRecord[]) {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(LB_FILE, JSON.stringify(records.slice(0, 100), null, 2));
  } catch {
    // Non-fatal fallback
  }
}

async function startServer() {
  const app = express();
  app.use(express.json());

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true });
  });

  app.get('/api/leaderboard', (req, res) => {
    const mode = typeof req.query.mode === 'string' ? req.query.mode : 'all';
    const difficulty = typeof req.query.difficulty === 'string' ? req.query.difficulty : 'all';
    let records = readLeaderboard();

    if (mode !== 'all') {
      records = records.filter((r) => r.mode === mode);
    }
    if (difficulty !== 'all') {
      records = records.filter((r) => r.difficulty === difficulty);
    }

    records.sort((a, b) => b.score - a.score || b.accuracy - a.accuracy);
    res.json({ entries: records.slice(0, 30) });
  });

  app.post('/api/leaderboard', (req, res) => {
    const body = req.body as Partial<LeaderboardRecord>;
    const cleanName = String(body.playerName || '').trim().slice(0, 22);
    const score = Number(body.score);
    const accuracy = Number(body.accuracy);
    const streak = Number(body.streak || 0);
    const mode = body.mode || 'size-it-up';
    const difficulty = body.difficulty || 'Medium';
    const category = String(body.category || 'Daily Mix').slice(0, 32);

    if (!cleanName || Number.isNaN(score) || score < 0 || score > 2000) {
      res.status(400).json({ error: 'Invalid leaderboard submission' });
      return;
    }

    const newRecord: LeaderboardRecord = {
      id: `lb-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      playerName: cleanName,
      score: Math.round(score),
      mode,
      difficulty,
      category,
      accuracy: Math.max(0, Math.min(100, Math.round(Number.isNaN(accuracy) ? 0 : accuracy))),
      streak: Math.max(0, Math.round(streak)),
      createdAt: new Date().toISOString(),
    };

    const records = readLeaderboard();
    records.push(newRecord);
    records.sort((a, b) => b.score - a.score || b.accuracy - a.accuracy);
    writeLeaderboard(records);

    res.status(201).json({ entry: newRecord, entries: records.slice(0, 30) });
  });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  const PORT = 3000;
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Size It Up server running on http://localhost:${PORT}`);
  });
}

startServer();
