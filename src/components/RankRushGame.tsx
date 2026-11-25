import React, { useEffect, useState } from 'react';
import { ArrowDown, ArrowRight, ArrowUp, Check, RotateCcw } from 'lucide-react';
import { RANK_RUSH_SETS } from '../data/gameContent';
import type { RankItem } from '../types/game';
import { getDailyIndex } from '../utils/scoring';
import { soundFX } from '../utils/sound';

interface RankRushGameProps {
  onComplete: (score: number, accuracy: number) => void;
}

function shuffleItems(items: RankItem[]): RankItem[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  // Ensure it's not already solved on initial deal
  const sorted = [...items].sort((a, b) => a.metricValue - b.metricValue);
  if (copy.every((item, idx) => item.id === sorted[idx].id)) {
    [copy[0], copy[1]] = [copy[1], copy[0]];
  }
  return copy;
}

export const RankRushGame: React.FC<RankRushGameProps> = ({ onComplete }) => {
  const [setIdx, setSetIdx] = useState(() => getDailyIndex('rank-rush', RANK_RUSH_SETS.length));
  const activeSet = RANK_RUSH_SETS[setIdx % RANK_RUSH_SETS.length];
  const [ordered, setOrdered] = useState<RankItem[]>(() => shuffleItems(activeSet.items));
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    setOrdered(shuffleItems(activeSet.items));
    setSubmitted(false);
  }, [activeSet]);

  const moveItem = (index: number, dir: -1 | 1) => {
    if (submitted) return;
    const target = index + dir;
    if (target < 0 || target >= ordered.length) return;
    soundFX.playTick();
    setOrdered((prev) => {
      const next = [...prev];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  };

  const sortedTruth = [...activeSet.items].sort((a, b) => a.metricValue - b.metricValue);

  const handleCheckOrder = () => {
    if (submitted) return;
    let correctSlots = 0;
    ordered.forEach((item, idx) => {
      if (item.id === sortedTruth[idx].id) correctSlots++;
    });
    const score = Math.round((correctSlots / ordered.length) * 500);
    const accuracy = Math.round((correctSlots / ordered.length) * 100);
    soundFX.playLockIn(accuracy);
    setSubmitted(true);
    onComplete(score, accuracy);
  };

  return (
    <section className="rounded-2xl border border-blue-200 bg-white p-6 sm:p-8 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-blue-100 pb-4">
        <div>
          <span className="text-xs font-semibold text-blue-600">
            Rank Rush · {activeSet.metricLabel}
          </span>
          <h2 className="mt-1 font-display text-2xl font-extrabold text-blue-950">
            {activeSet.title}
          </h2>
        </div>
        <span className="font-mono text-xs text-slate-500 tabular-nums">
          Set {(setIdx % RANK_RUSH_SETS.length) + 1} / {RANK_RUSH_SETS.length}
        </span>
      </div>

      <p className="mt-4 text-sm text-slate-600">
        Arrange the 4 cards from <strong className="text-blue-950">smallest at the top</strong> to{' '}
        <strong className="text-blue-950">largest at the bottom</strong>.
      </p>

      <div className="mt-5 space-y-2.5">
        {ordered.map((item, idx) => {
          const isCorrectSlot = submitted && item.id === sortedTruth[idx].id;
          return (
            <div
              key={item.id}
              className={`flex items-center justify-between gap-4 rounded-xl border px-4 py-3.5 transition-colors ${
                submitted
                  ? isCorrectSlot
                    ? 'border-emerald-200 bg-emerald-50/60'
                    : 'border-rose-200 bg-rose-50/50'
                  : 'border-blue-100 bg-blue-50/40 hover:border-blue-300'
              }`}
            >
              <div className="flex items-center gap-3.5">
                <span className="font-mono text-sm font-bold text-blue-700 tabular-nums w-6">
                  #{idx + 1}
                </span>
                <div>
                  <div className="font-semibold text-blue-950">{item.name}</div>
                  <div className="text-xs text-slate-500">{item.category}</div>
                </div>
              </div>

              {submitted ? (
                <div className="flex items-center gap-3 font-mono text-sm tabular-nums">
                  <span className="font-bold text-blue-950">{item.metricDisplay}</span>
                  <span
                    className={`text-xs font-semibold ${
                      isCorrectSlot ? 'text-emerald-700' : 'text-rose-700'
                    }`}
                  >
                    {isCorrectSlot ? 'Correct' : `Should be #${sortedTruth.findIndex((s) => s.id === item.id) + 1}`}
                  </span>
                </div>
              ) : (
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    disabled={idx === 0}
                    onClick={() => moveItem(idx, -1)}
                    aria-label={`Move ${item.name} up`}
                    className="flex h-9 w-9 items-center justify-center rounded-lg border border-blue-200 bg-white text-blue-900 hover:bg-blue-50 disabled:opacity-35 cursor-pointer"
                  >
                    <ArrowUp className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    disabled={idx === ordered.length - 1}
                    onClick={() => moveItem(idx, 1)}
                    aria-label={`Move ${item.name} down`}
                    className="flex h-9 w-9 items-center justify-center rounded-lg border border-blue-200 bg-white text-blue-900 hover:bg-blue-50 disabled:opacity-35 cursor-pointer"
                  >
                    <ArrowDown className="h-4 w-4" />
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-6 flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => {
            setOrdered(shuffleItems(activeSet.items));
            setSubmitted(false);
          }}
          className="flex items-center gap-2 rounded-lg border border-blue-200 px-4 py-2.5 text-sm font-semibold text-blue-900 hover:bg-blue-50 cursor-pointer"
        >
          <RotateCcw className="h-4 w-4" />
          Shuffle
        </button>

        {!submitted ? (
          <button
            type="button"
            onClick={handleCheckOrder}
            className="flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-3 text-sm font-bold text-white hover:bg-blue-700 cursor-pointer"
          >
            <Check className="h-4 w-4" />
            Lock Order
          </button>
        ) : (
          <button
            type="button"
            onClick={() => setSetIdx((i) => i + 1)}
            className="flex items-center gap-2 rounded-xl bg-blue-950 px-6 py-3 text-sm font-bold text-white hover:bg-blue-900 cursor-pointer"
          >
            Next Set
            <ArrowRight className="h-4 w-4" />
          </button>
        )}
      </div>
    </section>
  );
};
