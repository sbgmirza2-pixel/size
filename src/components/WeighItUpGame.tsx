import React, { useEffect, useState } from 'react';
import { ArrowRight, RotateCcw, Scale } from 'lucide-react';
import { WEIGH_PUZZLES } from '../data/gameContent';
import type { Category, Difficulty } from '../types/game';
import { getDailyIndex, getDailyPuzzleNumber } from '../utils/scoring';
import { soundFX } from '../utils/sound';

interface WeighItUpGameProps {
  category: Category | 'Daily Mix';
  difficulty: Difficulty;
  onComplete: (score: number, accuracy: number) => void;
}

export const WeighItUpGame: React.FC<WeighItUpGameProps> = ({
  category,
  difficulty,
  onComplete,
}) => {
  const [practiceOffset, setPracticeOffset] = useState(0);
  const dailyIdx = getDailyIndex('weigh-it-up', WEIGH_PUZZLES.length);

  const pool = WEIGH_PUZZLES.filter(
    (p) =>
      (category === 'Daily Mix' || p.category === category) &&
      (difficulty === 'Hard' || p.difficulty === difficulty || p.difficulty === 'Easy')
  );
  const activePool = pool.length > 0 ? pool : WEIGH_PUZZLES;
  const isDaily = practiceOffset === 0 && category === 'Daily Mix';
  const puzzle = activePool[(dailyIdx + practiceOffset) % activePool.length];

  const [count, setCount] = useState(25);
  const [revealed, setRevealed] = useState(false);
  const [roundScore, setRoundScore] = useState(0);
  const [accuracy, setAccuracy] = useState(0);

  useEffect(() => {
    setCount(25);
    setRevealed(false);
  }, [puzzle.id]);

  const exactUnits = Math.max(1, Math.round(puzzle.heavyItem.weightKg / puzzle.unitItem.weightKg));
  const guessedWeight = count * puzzle.unitItem.weightKg;
  const ratio = guessedWeight / puzzle.heavyItem.weightKg;

  // Tilt angle in degrees: negative tilts left (target is heavier), positive tilts right (your stack is heavier)
  const tiltDeg = revealed
    ? Math.max(-18, Math.min(18, Math.log2(Math.max(0.1, ratio)) * 12))
    : 0;

  const adjustCount = (delta: number) => {
    if (revealed) return;
    soundFX.playTick();
    setCount((prev) => Math.max(1, Math.min(50000, prev + delta)));
  };

  const handleWeigh = () => {
    if (revealed) return;
    const logErr = Math.abs(Math.log2(Math.max(0.01, ratio)));
    const relErr = Math.abs(count - exactUnits) / exactUnits;
    const precision = relErr <= 0.055 ? 100 : Math.max(0, Math.min(99, Math.round(104 - logErr * 52)));
    const totalPts = precision * 5;
    setAccuracy(precision);
    setRoundScore(totalPts);
    setRevealed(true);
    soundFX.playLockIn(precision);
    onComplete(totalPts, precision);
  };

  const dailyNum = getDailyPuzzleNumber();

  return (
    <section className="rounded-2xl border border-blue-200 bg-white shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-blue-100 px-6 py-4">
        <div>
          <span className="text-xs font-semibold text-blue-600">
            Weigh It Up · {isDaily ? `Daily #${dailyNum}` : `${puzzle.category} · ${puzzle.difficulty}`}
          </span>
          <h2 className="mt-0.5 font-display text-2xl font-extrabold text-blue-950">
            Balance the Scale
          </h2>
        </div>

        <div className="flex items-center gap-3 text-xs font-mono text-slate-500 tabular-nums">
          <span>
            1 {puzzle.unitItem.name} = <strong className="text-blue-950">{puzzle.unitItem.displayWeight}</strong>
          </span>
        </div>
      </div>

      {/* Interactive Physics Beam Stage */}
      <div className="blueprint-grid px-4 py-8 sm:px-8">
        <p className="text-center text-sm sm:text-base font-medium text-blue-950 mb-6">
          How many <span className="font-bold text-sky-600">{puzzle.unitItem.pluralName}</span> balance{' '}
          <span className="font-bold text-blue-900">1 {puzzle.heavyItem.name}</span>?
        </p>

        <div className="mx-auto max-w-2xl">
          <svg viewBox="0 0 420 190" className="w-full h-auto overflow-visible" role="img" aria-label="Interactive Balance Scale">
            {/* Base Pedestal */}
            <path d="M165 178 L255 178 L240 164 L180 164 Z" fill="#1e3a8a" />
            <rect x="205" y="54" width="10" height="112" rx="4" fill="#1d4ed8" />
            <circle cx="210" cy="54" r="9" fill="#0ea5e9" stroke="#ffffff" strokeWidth="3" />

            {/* Tilting Beam Group */}
            <g
              style={{
                transform: `rotate(${tiltDeg}deg)`,
                transformOrigin: '210px 54px',
                transition: 'transform 650ms cubic-bezier(0.22, 1, 0.36, 1)',
              }}
            >
              {/* Beam Bar */}
              <rect x="60" y="50" width="300" height="8" rx="4" fill="#1e3a8a" />

              {/* Left Pan (Target Heavy Object) */}
              <line x1="78" y1="56" x2="54" y2="112" stroke="#64748b" strokeWidth="2" />
              <line x1="78" y1="56" x2="102" y2="112" stroke="#64748b" strokeWidth="2" />
              <path d="M36 112 L120 112 L110 124 L46 124 Z" fill="#1d4ed8" />
              <rect x="44" y="76" width="68" height="34" rx="8" fill="#dbeafe" stroke="#1d4ed8" strokeWidth="2" />
              <text
                x="78"
                y="91"
                textAnchor="middle"
                fontSize="9"
                fontWeight="700"
                fill="#0b1f44"
              >
                {puzzle.heavyItem.name.split(' ').slice(0, 2).join(' ')}
              </text>
              <text
                x="78"
                y="103"
                textAnchor="middle"
                fontSize="8.5"
                fontWeight="700"
                fill="#1d4ed8"
                fontFamily="JetBrains Mono, monospace"
              >
                {revealed ? puzzle.heavyItem.displayWeight : '??? kg'}
              </text>

              {/* Right Pan (Player Unit Stack) */}
              <line x1="342" y1="56" x2="318" y2="112" stroke="#64748b" strokeWidth="2" />
              <line x1="342" y1="56" x2="366" y2="112" stroke="#64748b" strokeWidth="2" />
              <path d="M300 112 L384 112 L374 124 L310 124 Z" fill="#0284c7" />
              <rect x="308" y="76" width="68" height="34" rx="8" fill="#e0f2fe" stroke="#0284c7" strokeWidth="2" />
              <text
                x="342"
                y="92"
                textAnchor="middle"
                fontSize="12"
                fontWeight="800"
                fill="#0369a1"
                fontFamily="JetBrains Mono, monospace"
              >
                {count.toLocaleString()}×
              </text>
              <text
                x="342"
                y="104"
                textAnchor="middle"
                fontSize="8"
                fontWeight="600"
                fill="#0c4a6e"
              >
                {puzzle.unitItem.pluralName.split(' ').slice(-1)[0]}
              </text>
            </g>
          </svg>
        </div>
      </div>

      {/* Controls / Reveal */}
      <div className="border-t border-blue-100 bg-white p-5 sm:p-6">
        {!revealed ? (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-center gap-2">
              {[-100, -10, -1].map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => adjustCount(d)}
                  className="rounded-lg border border-blue-200 bg-blue-50/50 px-3 py-2 font-mono text-xs font-bold text-blue-900 hover:bg-blue-100 cursor-pointer"
                >
                  {d}
                </button>
              ))}

              <input
                type="number"
                min={1}
                max={50000}
                value={count}
                onChange={(e) => setCount(Math.max(1, Math.min(50000, Number(e.target.value) || 1)))}
                className="w-28 rounded-xl border border-blue-300 bg-white px-3 py-2 text-center font-mono text-lg font-extrabold text-blue-950 focus:border-blue-600 focus:outline-none"
              />

              {[1, 10, 100, 1000].map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => adjustCount(d)}
                  className="rounded-lg border border-blue-200 bg-blue-50/50 px-3 py-2 font-mono text-xs font-bold text-blue-900 hover:bg-blue-100 cursor-pointer"
                >
                  +{d >= 1000 ? '1K' : d}
                </button>
              ))}
            </div>

            <div className="flex justify-center">
              <button
                type="button"
                onClick={handleWeigh}
                className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-8 py-3 text-sm font-bold text-white hover:bg-blue-700 cursor-pointer"
              >
                <Scale className="h-4 w-4" />
                Drop &amp; Weigh
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-3">
                <span className="font-display text-lg font-extrabold text-blue-950">
                  {accuracy >= 95
                    ? `Perfect Balance! +${roundScore} pts`
                    : `${accuracy}% Precision · +${roundScore} pts`}
                </span>
                <span className="text-slate-300">·</span>
                <span className="font-mono text-xs font-bold text-blue-700 tabular-nums">
                  True Balance: {exactUnits.toLocaleString()} {puzzle.unitItem.pluralName}
                </span>
              </div>
              <p className="text-sm text-slate-600">{puzzle.funFact}</p>
            </div>

            <button
              type="button"
              onClick={() => setPracticeOffset((o) => o + 1)}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-950 px-5 py-3 text-sm font-bold text-white hover:bg-blue-900 cursor-pointer whitespace-nowrap shrink-0"
            >
              <RotateCcw className="h-4 w-4" />
              Next Weight Puzzle
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>
    </section>
  );
};
