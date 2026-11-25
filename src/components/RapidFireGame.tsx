import React, { useEffect, useState } from 'react';
import { Heart, Play, RotateCcw, Timer } from 'lucide-react';
import { RAPID_FIRE_PAIRS } from '../data/gameContent';
import { soundFX } from '../utils/sound';

interface RapidFireGameProps {
  onComplete: (score: number, accuracy: number) => void;
}

export const RapidFireGame: React.FC<RapidFireGameProps> = ({ onComplete }) => {
  const [started, setStarted] = useState(false);
  const [idx, setIdx] = useState(0);
  const [hearts, setHearts] = useState(3);
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [answeredCount, setAnsweredCount] = useState(0);
  const [timeLeft, setTimeLeft] = useState(10);
  const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null);
  const [gameOver, setGameOver] = useState(false);

  const pair = RAPID_FIRE_PAIRS[idx % RAPID_FIRE_PAIRS.length];

  useEffect(() => {
    if (!started || gameOver || feedback !== null) return;
    const timer = window.setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          handleTimeout();
          return 10;
        }
        return t - 1;
      });
    }, 1000);
    return () => window.clearInterval(timer);
  });

  const finishRun = (finalScore: number, correct: number, total: number) => {
    setGameOver(true);
    soundFX.playVictory();
    const acc = total > 0 ? Math.round((correct / total) * 100) : 0;
    onComplete(finalScore, acc);
  };

  const handleTimeout = () => {
    soundFX.playWrong();
    const nextHearts = hearts - 1;
    const nextAnswered = answeredCount + 1;
    setHearts(nextHearts);
    setCombo(0);
    setAnsweredCount(nextAnswered);
    setFeedback('wrong');

    window.setTimeout(() => {
      if (nextHearts <= 0 || nextAnswered >= RAPID_FIRE_PAIRS.length) {
        finishRun(score, correctCount, nextAnswered);
      } else {
        setIdx((i) => i + 1);
        setTimeLeft(10);
        setFeedback(null);
      }
    }, 900);
  };

  const handlePick = (choice: 'A' | 'B') => {
    if (feedback !== null || gameOver) return;
    const aWins = pair.optionA.value >= pair.optionB.value;
    const isCorrect = (choice === 'A' && aWins) || (choice === 'B' && !aWins);

    const nextAnswered = answeredCount + 1;
    setAnsweredCount(nextAnswered);

    if (isCorrect) {
      const gained = 60 + combo * 15 + timeLeft * 3;
      const nextScore = score + gained;
      const nextCorrect = correctCount + 1;
      setScore(nextScore);
      setCombo((c) => c + 1);
      setCorrectCount(nextCorrect);
      setFeedback('correct');
      soundFX.playLockIn(100);

      window.setTimeout(() => {
        if (nextAnswered >= RAPID_FIRE_PAIRS.length) {
          finishRun(nextScore, nextCorrect, nextAnswered);
        } else {
          setIdx((i) => i + 1);
          setTimeLeft(10);
          setFeedback(null);
        }
      }, 850);
    } else {
      const nextHearts = hearts - 1;
      setHearts(nextHearts);
      setCombo(0);
      setFeedback('wrong');
      soundFX.playWrong();

      window.setTimeout(() => {
        if (nextHearts <= 0 || nextAnswered >= RAPID_FIRE_PAIRS.length) {
          finishRun(score, correctCount, nextAnswered);
        } else {
          setIdx((i) => i + 1);
          setTimeLeft(10);
          setFeedback(null);
        }
      }, 900);
    }
  };

  const restart = () => {
    setStarted(true);
    setIdx(0);
    setHearts(3);
    setScore(0);
    setCombo(0);
    setCorrectCount(0);
    setAnsweredCount(0);
    setTimeLeft(10);
    setFeedback(null);
    setGameOver(false);
  };

  if (!started) {
    return (
      <section className="rounded-2xl border border-blue-200 bg-white p-8 text-center shadow-sm">
        <span className="text-xs font-semibold text-blue-600">
          Survival Mode · 10s per pair · 3 Hearts
        </span>
        <h2 className="mt-2 font-display text-3xl font-extrabold text-blue-950">
          Rapid Fire Scale Duel
        </h2>
        <p className="mx-auto mt-3 max-w-md text-sm text-slate-600">
          Pick the larger object before the 10-second clock expires. Build combos for bonus points — three misses end your run.
        </p>
        <button
          type="button"
          onClick={restart}
          className="mt-6 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-3 text-sm font-bold text-white hover:bg-blue-700 cursor-pointer"
        >
          <Play className="h-4 w-4" />
          Start Survival Run
        </button>
      </section>
    );
  }

  if (gameOver) {
    const acc = answeredCount > 0 ? Math.round((correctCount / answeredCount) * 100) : 0;
    return (
      <section className="rounded-2xl border border-blue-200 bg-white p-8 text-center shadow-sm">
        <span className="text-xs font-semibold text-blue-600">Survival Run Finished</span>
        <h2 className="mt-2 font-display text-4xl font-extrabold text-blue-950 font-mono tabular-nums">
          {score} pts
        </h2>
        <p className="mt-2 text-sm text-slate-600">
          {correctCount} of {answeredCount} correct · {acc}% accuracy
        </p>
        <button
          type="button"
          onClick={restart}
          className="mt-6 inline-flex items-center gap-2 rounded-xl bg-blue-950 px-6 py-3 text-sm font-bold text-white hover:bg-blue-900 cursor-pointer"
        >
          <RotateCcw className="h-4 w-4" />
          Play Again
        </button>
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-blue-200 bg-white p-6 sm:p-8 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-blue-100 pb-4">
        <div className="flex items-center gap-2" aria-label={`Hearts remaining: ${hearts}`}>
          {[0, 1, 2].map((i) => (
            <Heart
              key={i}
              className={`h-5 w-5 transition-colors ${
                i < hearts ? 'fill-blue-600 text-blue-600' : 'text-slate-200'
              }`}
            />
          ))}
          <span className="ml-2 font-mono text-xs font-semibold text-slate-500 tabular-nums">
            Combo {combo}×
          </span>
        </div>

        <div className="flex items-center gap-5">
          <div
            className={`flex items-center gap-1.5 font-mono text-sm font-bold tabular-nums ${
              timeLeft <= 3 ? 'text-rose-600' : 'text-blue-700'
            }`}
          >
            <Timer className="h-4 w-4" />
            {timeLeft}s
          </div>
          <div className="font-mono text-sm font-bold text-blue-950 tabular-nums">
            {score} pts
          </div>
        </div>
      </div>

      <div className="mt-6 text-center">
        <span className="text-xs font-semibold text-blue-600">
          {pair.category} · {pair.difficulty}
        </span>
        <h3 className="mt-1 font-display text-2xl font-extrabold text-blue-950">
          {pair.prompt}
        </h3>
      </div>

      <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
        {[
          { key: 'A' as const, opt: pair.optionA },
          { key: 'B' as const, opt: pair.optionB },
        ].map(({ key, opt }) => {
          const isBigger =
            key === 'A'
              ? pair.optionA.value >= pair.optionB.value
              : pair.optionB.value > pair.optionA.value;
          return (
            <button
              key={key}
              type="button"
              disabled={feedback !== null}
              onClick={() => handlePick(key)}
              className={`flex flex-col items-center justify-center rounded-xl border p-6 text-center transition-all cursor-pointer ${
                feedback !== null
                  ? isBigger
                    ? 'border-emerald-300 bg-emerald-50/70'
                    : 'border-blue-100 bg-slate-50 opacity-70'
                  : 'border-blue-200 bg-blue-50/40 hover:border-blue-500 hover:bg-blue-50 active:scale-[0.99]'
              }`}
            >
              <span className="font-display text-xl font-bold text-blue-950">
                {opt.name}
              </span>
              {feedback !== null ? (
                <span className="mt-2 font-mono text-sm font-bold text-blue-700 tabular-nums">
                  {opt.display}
                </span>
              ) : (
                <span className="mt-2 text-xs font-medium text-blue-600">
                  Tap to choose
                </span>
              )}
            </button>
          );
        })}
      </div>
    </section>
  );
};
