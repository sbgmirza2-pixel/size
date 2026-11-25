import React, { useMemo, useState } from 'react';
import { ArrowRight, CheckCircle2, RotateCcw } from 'lucide-react';
import { ESTIMATE_QUESTIONS } from '../data/gameContent';
import type { Category, Difficulty } from '../types/game';
import { getDailyIndex, getDailyPuzzleNumber } from '../utils/scoring';
import { soundFX } from '../utils/sound';

interface DailyEstimateGameProps {
  category: Category | 'Daily Mix';
  difficulty: Difficulty;
  onComplete: (score: number, accuracy: number) => void;
}

export const DailyEstimateGame: React.FC<DailyEstimateGameProps> = ({
  category,
  difficulty,
  onComplete,
}) => {
  const questions = useMemo(() => {
    const filtered = ESTIMATE_QUESTIONS.filter(
      (q) =>
        (category === 'Daily Mix' || q.category === category) &&
        (difficulty === 'Hard' || q.difficulty === difficulty || q.difficulty === 'Easy')
    );
    return filtered.length > 0 ? filtered : ESTIMATE_QUESTIONS;
  }, [category, difficulty]);

  const [idx, setIdx] = useState(() => getDailyIndex('daily-estimate', questions.length));
  const [guessInput, setGuessInput] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [lastScore, setLastScore] = useState(0);

  const q = questions[idx % questions.length];

  const applyMultiplier = (mult: number) => {
    if (submitted) return;
    soundFX.playTick();
    const numeric = Number(guessInput.replace(/,/g, '')) || 1;
    const next = Math.round(numeric * mult);
    setGuessInput(String(next));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (submitted) return;
    const val = Number(guessInput.replace(/,/g, ''));
    if (!val || val <= 0) return;

    const logDist = Math.abs(Math.log10(val / q.answer));
    const score = Math.max(0, Math.min(100, Math.round(100 - logDist * 45)));
    const accuracy = Math.max(0, Math.min(100, Math.round(100 - logDist * 40)));
    setLastScore(score);
    setSubmitted(true);
    soundFX.playLockIn(score);
    onComplete(score * 5, accuracy);
  };

  const handleNext = () => {
    setIdx((i) => i + 1);
    setGuessInput('');
    setSubmitted(false);
  };

  return (
    <section className="rounded-2xl border border-blue-200 bg-white p-6 sm:p-8 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-blue-100 pb-4">
        <div>
          <span className="text-xs font-semibold text-blue-600">
            Daily Estimate #{getDailyPuzzleNumber()} · {q.category} · {q.difficulty}
          </span>
          <h2 className="mt-1 font-display text-2xl font-extrabold text-blue-950">
            Fermi Scale Challenge
          </h2>
        </div>
        <span className="font-mono text-xs text-slate-500 tabular-nums">
          Puzzle {(idx % questions.length) + 1} of {questions.length}
        </span>
      </div>

      <p className="mt-6 text-lg sm:text-xl font-semibold text-blue-950 leading-relaxed max-w-3xl">
        {q.prompt}
      </p>

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <input
              type="text"
              inputMode="numeric"
              disabled={submitted}
              value={guessInput}
              onChange={(e) => setGuessInput(e.target.value.replace(/[^0-9.,]/g, ''))}
              placeholder={`Enter estimate in ${q.unit}...`}
              className="w-full rounded-xl border border-blue-200 bg-blue-50/40 px-4 py-3.5 font-mono text-lg font-bold text-blue-950 placeholder:font-sans placeholder:text-sm placeholder:font-normal focus:border-blue-600 focus:bg-white focus:outline-none"
            />
            <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-xs font-medium text-slate-400">
              {q.unit}
            </span>
          </div>

          {!submitted ? (
            <button
              type="submit"
              disabled={!guessInput}
              className="rounded-xl bg-blue-600 px-6 py-3.5 text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-50 cursor-pointer whitespace-nowrap"
            >
              Lock Estimate
            </button>
          ) : (
            <button
              type="button"
              onClick={handleNext}
              className="flex items-center justify-center gap-2 rounded-xl bg-blue-950 px-6 py-3.5 text-sm font-bold text-white hover:bg-blue-900 cursor-pointer whitespace-nowrap"
            >
              Next Question
              <ArrowRight className="h-4 w-4" />
            </button>
          )}
        </div>

        {!submitted && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-medium text-slate-500 mr-1">Quick scale:</span>
            {[
              { label: '×10', val: 10 },
              { label: '×100', val: 100 },
              { label: '×1K', val: 1000 },
              { label: '×1M', val: 1000000 },
            ].map((m) => (
              <button
                key={m.label}
                type="button"
                onClick={() => applyMultiplier(m.val)}
                className="rounded-lg border border-blue-200 bg-blue-50/60 px-3 py-1.5 font-mono text-xs font-semibold text-blue-800 hover:bg-blue-100 cursor-pointer"
              >
                {m.label}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setGuessInput('')}
              className="ml-auto flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-blue-700 cursor-pointer"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Clear
            </button>
          </div>
        )}
      </form>

      {submitted && (
        <div className="mt-6 rounded-xl border border-blue-100 bg-blue-50/70 p-5">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-2.5">
              <CheckCircle2 className="h-5 w-5 text-blue-600" />
              <span className="font-display text-lg font-bold text-blue-950">
                Exact Answer: {q.answer.toLocaleString()} {q.unit}
              </span>
            </div>
            <span className="font-mono text-base font-bold text-blue-700 tabular-nums">
              {lastScore} / 100 Precision
            </span>
          </div>
          <p className="mt-2 text-sm text-slate-600">{q.explanation}</p>
        </div>
      )}
    </section>
  );
};
