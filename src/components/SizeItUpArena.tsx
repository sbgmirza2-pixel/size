import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowRight,
  Check,
  Columns2,
  Layers,
  Minus,
  Plus,
  RotateCcw,
  Share2,
  Trophy,
} from 'lucide-react';
import { SCALE_OBJECTS } from '../data/gameContent';
import type {
  Category,
  ChallengePayload,
  Difficulty,
  RoundResult,
  SizeRound,
} from '../types/game';
import {
  buildSizeRounds,
  calculateScaleScore,
  getDailyPuzzleNumber,
  getTodayKey,
} from '../utils/scoring';
import { soundFX } from '../utils/sound';
import { SilhouetteSvg } from './SilhouetteSvg';

interface SizeItUpArenaProps {
  category: Category | 'Daily Mix';
  difficulty: Difficulty;
  activeChallenge: ChallengePayload | null;
  playerName: string;
  onGameComplete: (summary: {
    results: RoundResult[];
    totalScore: number;
    avgAccuracy: number;
    category: Category | 'Daily Mix';
    difficulty: Difficulty;
    seed: string;
    isDaily: boolean;
  }) => void;
  onOpenChallengeModal: (payload: {
    seed: string;
    score: number;
    difficulty: Difficulty;
    category: Category | 'Daily Mix';
    roundEmojis: string[];
  }) => void;
  onSubmitLeaderboard: (score: number, accuracy: number, name: string) => Promise<void>;
  onClearChallenge: () => void;
}

export const SizeItUpArena: React.FC<SizeItUpArenaProps> = ({
  category,
  difficulty,
  activeChallenge,
  playerName,
  onGameComplete,
  onOpenChallengeModal,
  onSubmitLeaderboard,
  onClearChallenge,
}) => {
  const [practiceNonce, setPracticeNonce] = useState(0);
  const isDaily = !activeChallenge && category === 'Daily Mix' && practiceNonce === 0;
  const seed = activeChallenge
    ? activeChallenge.seed
    : isDaily
    ? `daily-${getTodayKey()}`
    : `practice-${getTodayKey()}-${practiceNonce}`;

  const effectiveCategory = activeChallenge ? activeChallenge.category : category;
  const effectiveDifficulty = activeChallenge ? activeChallenge.difficulty : difficulty;

  const rounds: SizeRound[] = useMemo(
    () => buildSizeRounds(SCALE_OBJECTS, effectiveCategory, effectiveDifficulty, seed, 5),
    [effectiveCategory, effectiveDifficulty, seed]
  );

  const [roundIndex, setRoundIndex] = useState(0);
  const [sliderValue, setSliderValue] = useState(1.0); // ratio guess: target / reference
  const [layoutMode, setLayoutMode] = useState<'side-by-side' | 'overlay'>('side-by-side');
  const [revealed, setRevealed] = useState(false);
  const [results, setResults] = useState<RoundResult[]>([]);
  const [finished, setFinished] = useState(false);
  const [roundStartTime, setRoundStartTime] = useState<number>(() => Date.now());
  const [handleInput, setHandleInput] = useState(playerName);
  const [lbSubmitted, setLbSubmitted] = useState(false);
  const [lbSubmitting, setLbSubmitting] = useState(false);

  const dragRef = useRef<{ startY: number; startX: number; startRatio: number } | null>(null);

  // Reset game when category / difficulty / challenge changes
  useEffect(() => {
    setRoundIndex(0);
    setSliderValue(1.0);
    setRevealed(false);
    setResults([]);
    setFinished(false);
    setLbSubmitted(false);
    setRoundStartTime(Date.now());
  }, [effectiveCategory, effectiveDifficulty, seed]);

  useEffect(() => {
    setHandleInput(playerName);
  }, [playerName]);

  const currentRound = rounds[roundIndex];

  // Compute safe reference pixel height so both reference & true target fit comfortably inside 320px canvas height
  const { refPixelHeight, maxAllowedRatio, minAllowedRatio } = useMemo(() => {
    if (!currentRound) {
      return { refPixelHeight: 140, maxAllowedRatio: 6.5, minAllowedRatio: 0.14 };
    }
    const maxStageHeight = 250;
    const trueR = currentRound.trueRatio;
    // Ensure both ref (1.0 * H) and target (trueR * H) stay <= maxStageHeight and >= 34px
    const idealH = trueR > 1 ? Math.min(180, maxStageHeight / trueR) : Math.min(220, maxStageHeight);
    const clampedH = Math.max(46, Math.round(idealH));
    return {
      refPixelHeight: clampedH,
      minAllowedRatio: 0.12,
      maxAllowedRatio: Math.max(6.5, Math.ceil(trueR * 1.6)),
    };
  }, [currentRound]);

  // Logarithmic slider mapping for silky precision at small AND large scales
  const minLog = Math.log(minAllowedRatio);
  const maxLog = Math.log(maxAllowedRatio);
  const sliderPos = ((Math.log(Math.max(minAllowedRatio, Math.min(maxAllowedRatio, sliderValue))) - minLog) / (maxLog - minLog)) * 100;

  const handleSliderChange = (pct: number) => {
    if (revealed) return;
    const ratio = Math.exp(minLog + (pct / 100) * (maxLog - minLog));
    setSliderValue(Math.round(ratio * 100) / 100);
  };

  const adjustScale = (factor: number) => {
    if (revealed) return;
    soundFX.playTick();
    setSliderValue((prev) => {
      const next = Math.max(minAllowedRatio, Math.min(maxAllowedRatio, prev * factor));
      return Math.round(next * 100) / 100;
    });
  };

  const handlePointerDownResize = (e: React.PointerEvent) => {
    if (revealed) return;
    e.preventDefault();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    dragRef.current = {
      startY: e.clientY,
      startX: e.clientX,
      startRatio: sliderValue,
    };
  };

  const handlePointerMoveResize = (e: React.PointerEvent) => {
    if (!dragRef.current || revealed) return;
    const dy = dragRef.current.startY - e.clientY;
    const dx = e.clientX - dragRef.current.startX;
    const delta = (dy + dx * 0.6) / 140;
    const next = Math.max(
      minAllowedRatio,
      Math.min(maxAllowedRatio, dragRef.current.startRatio * Math.exp(delta))
    );
    setSliderValue(Math.round(next * 100) / 100);
  };

  const handlePointerUpResize = () => {
    dragRef.current = null;
  };

  const handleLockIn = () => {
    if (!currentRound || revealed) return;
    const elapsed = Math.max(0.5, Math.round(((Date.now() - roundStartTime) / 1000) * 10) / 10);
    const evalResult = calculateScaleScore(sliderValue, currentRound.trueRatio);
    soundFX.playLockIn(evalResult.score);

    const roundRes: RoundResult = {
      roundNumber: currentRound.roundNumber,
      referenceName: currentRound.reference.name,
      targetName: currentRound.target.name,
      guessedRatio: sliderValue,
      trueRatio: currentRound.trueRatio,
      score: evalResult.score,
      errorPercent: evalResult.errorPercent,
      timeSeconds: elapsed,
      referenceDisplay: currentRound.reference.displaySize,
      targetDisplay: currentRound.target.displaySize,
    };

    setResults((prev) => [...prev, roundRes]);
    setRevealed(true);
  };

  const handleNextRound = () => {
    if (roundIndex + 1 < rounds.length) {
      setRoundIndex((i) => i + 1);
      setSliderValue(1.0);
      setRevealed(false);
      setRoundStartTime(Date.now());
    } else {
      const totalScore = results.reduce((acc, r) => acc + r.score, 0);
      const avgAccuracy = Math.round(
        results.reduce((acc, r) => acc + Math.max(0, 100 - r.errorPercent), 0) /
          Math.max(1, results.length)
      );
      soundFX.playVictory();
      setFinished(true);
      onGameComplete({
        results,
        totalScore,
        avgAccuracy,
        category: effectiveCategory,
        difficulty: effectiveDifficulty,
        seed,
        isDaily,
      });
    }
  };

  const handlePlayAgain = () => {
    if (activeChallenge) {
      onClearChallenge();
    }
    setPracticeNonce((n) => n + 1);
  };

  // Keyboard shortcuts for snappy desktop play
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (finished) return;
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (!revealed) {
        if (e.key === 'ArrowUp' || e.key === 'ArrowRight') {
          e.preventDefault();
          adjustScale(1.06);
        } else if (e.key === 'ArrowDown' || e.key === 'ArrowLeft') {
          e.preventDefault();
          adjustScale(0.94);
        } else if (e.key === 'Enter') {
          e.preventDefault();
          handleLockIn();
        }
      } else if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        handleNextRound();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  });

  if (!currentRound) {
    return null;
  }

  // ==================== FINISHED SUMMARY VIEW ====================
  if (finished) {
    const totalScore = results.reduce((sum, r) => sum + r.score, 0);
    const avgAccuracy = Math.round(
      results.reduce((sum, r) => sum + Math.max(0, 100 - r.errorPercent), 0) /
        Math.max(1, results.length)
    );
    const roundEmojis = results.map(
      (r) => calculateScaleScore(r.guessedRatio, r.trueRatio).emoji
    );

    const beatChallenger =
      activeChallenge && totalScore > activeChallenge.challengerScore;

    return (
      <section className="rounded-2xl border border-blue-200 bg-white p-6 sm:p-8 shadow-sm">
        <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between border-b border-blue-100 pb-6">
          <div>
            <p className="text-xs font-semibold tracking-wide text-blue-600">
              {activeChallenge
                ? `1v1 Challenge vs ${activeChallenge.challengerName}`
                : isDaily
                ? 'Daily Challenge Complete'
                : `${effectiveCategory} · ${effectiveDifficulty} Mode`}
            </p>
            <h2 className="mt-1 font-display text-3xl sm:text-4xl font-extrabold text-blue-950">
              {totalScore} <span className="text-lg font-semibold text-slate-400">/ 500 pts</span>
            </h2>
            {activeChallenge && (
              <p className="mt-2 text-sm font-medium text-blue-800">
                {beatChallenger
                  ? `You beat ${activeChallenge.challengerName} (${activeChallenge.challengerScore} pts) by ${totalScore - activeChallenge.challengerScore} points.`
                  : totalScore === activeChallenge.challengerScore
                  ? `Dead heat! You tied ${activeChallenge.challengerName} at ${totalScore} points.`
                  : `${activeChallenge.challengerName} scored ${activeChallenge.challengerScore} pts — run it back!`}
              </p>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-6">
            <div>
              <div className="text-xs text-slate-500">Avg Accuracy</div>
              <div className="font-mono text-2xl font-bold tabular-nums text-blue-950">
                {avgAccuracy}%
              </div>
            </div>
            <div>
              <div className="text-xs text-slate-500">Pattern</div>
              <div className="text-xl tracking-wider">{roundEmojis.join('')}</div>
            </div>
          </div>
        </div>

        {/* Round-by-round breakdown */}
        <div className="mt-6 divide-y divide-blue-50">
          {results.map((r) => (
            <div
              key={r.roundNumber}
              className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 py-3 text-sm"
            >
              <div className="flex items-center gap-3">
                <span className="font-mono text-xs font-semibold text-blue-600 tabular-nums">
                  0{r.roundNumber}
                </span>
                <span className="font-medium text-blue-950">
                  {r.targetName} <span className="text-slate-400">vs</span> {r.referenceName}
                </span>
              </div>
              <div className="flex items-center gap-4 font-mono text-xs sm:text-sm tabular-nums">
                <span className="text-slate-500">{r.targetDisplay}</span>
                <span
                  className={
                    r.errorPercent <= 5.5
                      ? 'font-semibold text-emerald-700'
                      : r.errorPercent <= 20
                      ? 'font-semibold text-blue-700'
                      : 'text-slate-600'
                  }
                >
                  {r.errorPercent}% off
                </span>
                <span className="font-bold text-blue-950 w-16 text-right">{r.score} pts</span>
              </div>
            </div>
          ))}
        </div>

        {/* Global Leaderboard quick submit + actions */}
        <div className="mt-6 flex flex-col gap-4 rounded-xl bg-blue-50/70 p-4 sm:flex-row sm:items-center sm:justify-between">
          {!lbSubmitted ? (
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                if (!handleInput.trim() || lbSubmitting) return;
                setLbSubmitting(true);
                await onSubmitLeaderboard(totalScore, avgAccuracy, handleInput.trim());
                setLbSubmitting(false);
                setLbSubmitted(true);
              }}
              className="flex flex-1 flex-wrap items-center gap-2"
            >
              <Trophy className="h-4 w-4 text-blue-700 shrink-0" />
              <input
                type="text"
                maxLength={20}
                value={handleInput}
                onChange={(e) => setHandleInput(e.target.value)}
                placeholder="Enter player handle"
                className="min-w-[160px] flex-1 sm:max-w-xs rounded-lg border border-blue-200 bg-white px-3 py-2 text-sm text-blue-950 focus:border-blue-600 focus:outline-none"
              />
              <button
                type="submit"
                disabled={lbSubmitting || !handleInput.trim()}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50 cursor-pointer whitespace-nowrap"
              >
                {lbSubmitting ? 'Saving...' : 'Post to Leaderboard'}
              </button>
            </form>
          ) : (
            <div className="flex items-center gap-2 text-sm font-semibold text-blue-800">
              <Check className="h-4 w-4 text-emerald-600" />
              Score posted to the Global Leaderboard as {handleInput}.
            </div>
          )}

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() =>
                onOpenChallengeModal({
                  seed,
                  score: totalScore,
                  difficulty: effectiveDifficulty,
                  category: effectiveCategory,
                  roundEmojis,
                })
              }
              className="flex items-center gap-2 rounded-lg border border-blue-200 bg-white px-4 py-2 text-sm font-semibold text-blue-900 hover:bg-blue-50 cursor-pointer whitespace-nowrap"
            >
              <Share2 className="h-4 w-4 text-blue-600" />
              Challenge Friend
            </button>
            <button
              type="button"
              onClick={handlePlayAgain}
              className="flex items-center gap-2 rounded-lg bg-blue-950 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-900 cursor-pointer whitespace-nowrap"
            >
              <RotateCcw className="h-4 w-4" />
              Play Again
            </button>
          </div>
        </div>
      </section>
    );
  }

  // ==================== ACTIVE GAMEPLAY ARENA ====================
  const latestResult = revealed ? results[results.length - 1] : null;
  const activeRatio = revealed ? currentRound.trueRatio : sliderValue;

  const refAspect = currentRound.reference.box[0] / currentRound.reference.box[1];
  const targetAspect = currentRound.target.box[0] / currentRound.target.box[1];

  const refWidthPx = Math.round(refPixelHeight * refAspect);
  const targetHeightPx = Math.round(refPixelHeight * activeRatio);
  const targetWidthPx = Math.round(targetHeightPx * targetAspect);

  const guessedHeightPx = Math.round(refPixelHeight * sliderValue);
  const guessedWidthPx = Math.round(guessedHeightPx * targetAspect);

  return (
    <section className="rounded-2xl border border-blue-200 bg-white shadow-sm overflow-hidden">
      {/* Compact Game HUD */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-blue-100 px-5 py-3.5 bg-white">
        <div className="flex items-center gap-3 text-sm">
          <span className="font-mono font-bold text-blue-700 tabular-nums">
            Round {roundIndex + 1} / {rounds.length}
          </span>
          <span aria-hidden="true" className="text-blue-200">
            ·
          </span>
          <span className="font-medium text-slate-600">
            {activeChallenge
              ? `1v1 vs ${activeChallenge.challengerName}`
              : isDaily
              ? `Daily #${getDailyPuzzleNumber()}`
              : `${effectiveCategory} · ${effectiveDifficulty}`}
          </span>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1 rounded-lg bg-blue-50 p-1">
            <button
              type="button"
              onClick={() => setLayoutMode('side-by-side')}
              className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                layoutMode === 'side-by-side'
                  ? 'bg-white text-blue-900 shadow-sm'
                  : 'text-slate-600 hover:text-blue-900'
              }`}
            >
              <Columns2 className="h-3.5 w-3.5" />
              Side by Side
            </button>
            <button
              type="button"
              onClick={() => setLayoutMode('overlay')}
              className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                layoutMode === 'overlay'
                  ? 'bg-white text-blue-900 shadow-sm'
                  : 'text-slate-600 hover:text-blue-900'
              }`}
            >
              <Layers className="h-3.5 w-3.5" />
              Overlay
            </button>
          </div>

          <div className="font-mono text-sm font-bold text-blue-950 tabular-nums">
            {results.reduce((s, r) => s + r.score, 0)} pts
          </div>
        </div>
      </div>

      {/* Prompt Bar */}
      <div className="px-5 py-3 bg-blue-50/50 border-b border-blue-100 flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm sm:text-base text-blue-950 font-medium">
          Resize the <span className="font-bold text-sky-600">{currentRound.target.name}</span>{' '}
          ({currentRound.target.measureType.toLowerCase()}) relative to the{' '}
          <span className="font-bold text-blue-900">{currentRound.reference.name}</span> (
          <span className="font-mono font-semibold text-blue-800">
            {currentRound.reference.displaySize}
          </span>
          )
        </p>
        <span className="font-mono text-xs text-slate-500 tabular-nums">
          Scale: {sliderValue.toFixed(2)}× · Scroll or drag corner
        </span>
      </div>

      {/* Interactive Blueprint Calibration Canvas */}
      <div
        onWheel={(e) => {
          if (revealed) return;
          e.preventDefault();
          adjustScale(e.deltaY < 0 ? 1.05 : 0.95);
        }}
        className="blueprint-grid relative flex min-h-[340px] sm:min-h-[380px] w-full items-end justify-center px-4 pb-8 pt-10 overflow-hidden select-none"
      >
        {/* Vertical Blueprint Ruler Ticks */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute left-3 top-6 bottom-8 hidden sm:flex flex-col justify-between border-r border-blue-200/80 pr-2 font-mono text-[10px] text-blue-400 tabular-nums"
        >
          <span>{(currentRound.reference.realMeters * 2).toFixed(1)}m</span>
          <span>{(currentRound.reference.realMeters * 1).toFixed(1)}m</span>
          <span>0m</span>
        </div>

        {/* Baseline Ground Line */}
        <div
          aria-hidden="true"
          className="absolute inset-x-6 bottom-8 h-px bg-blue-300"
        />

        {layoutMode === 'side-by-side' ? (
          <div className="relative z-10 flex w-full max-w-3xl items-end justify-center gap-8 sm:gap-16">
            {/* Static Reference Silhouette */}
            <div className="flex flex-col items-center">
              <div
                style={{ width: refWidthPx, height: refPixelHeight }}
                className="flex items-end justify-center text-blue-900 transition-all duration-200"
              >
                <SilhouetteSvg
                  item={currentRound.reference}
                  className="h-full w-full drop-shadow-sm"
                />
              </div>
              <div className="mt-3 text-center">
                <div className="text-xs font-bold text-blue-950">
                  {currentRound.reference.name}
                </div>
                <div className="font-mono text-xs text-blue-700 tabular-nums">
                  {currentRound.reference.displaySize}
                </div>
              </div>
            </div>

            {/* Resizable Target Silhouette */}
            <div className="flex flex-col items-center">
              <div className="relative flex items-end justify-center">
                {/* Ghost guess outline when revealed */}
                {revealed && (
                  <div
                    style={{
                      width: guessedWidthPx,
                      height: guessedHeightPx,
                    }}
                    className="pointer-events-none absolute bottom-0 flex items-end justify-center border-2 border-dashed border-sky-400/70 bg-sky-100/20 text-sky-400/40"
                    title="Your guess"
                  >
                    <SilhouetteSvg
                      item={currentRound.target}
                      forceVector
                      className="h-full w-full"
                    />
                  </div>
                )}

                <div
                  style={{
                    width: targetWidthPx,
                    height: targetHeightPx,
                  }}
                  className={`relative flex items-end justify-center transition-all ${
                    revealed
                      ? 'duration-300 text-blue-600'
                      : 'duration-75 text-sky-500 ring-1 ring-sky-400/60 bg-sky-400/5'
                  }`}
                >
                  <SilhouetteSvg
                    item={currentRound.target}
                    className="h-full w-full drop-shadow-sm"
                  />

                  {/* Direct corner drag handle */}
                  {!revealed && (
                    <button
                      type="button"
                      onPointerDown={handlePointerDownResize}
                      onPointerMove={handlePointerMoveResize}
                      onPointerUp={handlePointerUpResize}
                      aria-label="Drag to resize target silhouette"
                      title="Drag up or right to scale"
                      className="absolute -right-2.5 -top-2.5 flex h-6 w-6 items-center justify-center rounded-full border-2 border-white bg-blue-600 text-[10px] font-bold text-white shadow-md cursor-nwse-resize hover:scale-110 transition-transform"
                    >
                      ⤢
                    </button>
                  )}
                </div>
              </div>

              <div className="mt-3 text-center">
                <div className="text-xs font-bold text-sky-700">
                  {currentRound.target.name}
                </div>
                <div className="font-mono text-xs tabular-nums text-slate-500">
                  {revealed ? currentRound.target.displaySize : 'Size unknown'}
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* Overlay Mode */
          <div className="relative z-10 flex w-full max-w-2xl flex-col items-center justify-end">
            <div className="relative flex items-end justify-center min-h-[240px]">
              <div
                style={{ width: refWidthPx, height: refPixelHeight }}
                className="flex items-end justify-center text-blue-900/75"
              >
                <SilhouetteSvg item={currentRound.reference} className="h-full w-full" />
              </div>

              <div
                style={{
                  width: targetWidthPx,
                  height: targetHeightPx,
                }}
                className={`absolute bottom-0 flex items-end justify-center transition-all ${
                  revealed
                    ? 'duration-300 text-sky-500/80'
                    : 'duration-75 text-sky-500/75 ring-1 ring-sky-500/60'
                }`}
              >
                <SilhouetteSvg item={currentRound.target} className="h-full w-full" />
                {!revealed && (
                  <button
                    type="button"
                    onPointerDown={handlePointerDownResize}
                    onPointerMove={handlePointerMoveResize}
                    onPointerUp={handlePointerUpResize}
                    aria-label="Drag to resize target silhouette"
                    className="absolute -right-2.5 -top-2.5 flex h-6 w-6 items-center justify-center rounded-full border-2 border-white bg-blue-600 text-[10px] font-bold text-white shadow-md cursor-nwse-resize"
                  >
                    ⤢
                  </button>
                )}
              </div>
            </div>

            <div className="mt-4 flex items-center gap-4 text-xs">
              <span className="font-semibold text-blue-950">
                {currentRound.reference.name} ({currentRound.reference.displaySize})
              </span>
              <span className="text-slate-300">/</span>
              <span className="font-semibold text-sky-700">
                {currentRound.target.name} ({revealed ? currentRound.target.displaySize : 'Guessing'})
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Controls / Reveal Footer */}
      <div className="border-t border-blue-100 bg-white px-5 py-4">
        {!revealed ? (
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-1 items-center gap-3">
              <button
                type="button"
                onClick={() => adjustScale(0.92)}
                aria-label="Shrink target"
                className="flex h-10 w-10 items-center justify-center rounded-lg border border-blue-200 text-blue-900 hover:bg-blue-50 cursor-pointer shrink-0"
              >
                <Minus className="h-4 w-4" />
              </button>

              <div className="flex-1">
                <input
                  type="range"
                  min={0}
                  max={100}
                  step={0.2}
                  value={sliderPos}
                  onChange={(e) => handleSliderChange(Number(e.target.value))}
                  aria-label="Scale comparison slider"
                  className="scale-slider w-full cursor-pointer"
                />
                <div className="mt-1 flex justify-between font-mono text-[11px] text-slate-400 tabular-nums">
                  <span>Smaller</span>
                  <span>1.0× Equal</span>
                  <span>Larger</span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => adjustScale(1.08)}
                aria-label="Enlarge target"
                className="flex h-10 w-10 items-center justify-center rounded-lg border border-blue-200 text-blue-900 hover:bg-blue-50 cursor-pointer shrink-0"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>

            <button
              type="button"
              onClick={handleLockIn}
              className="rounded-xl bg-blue-600 px-6 py-3 text-sm font-bold text-white hover:bg-blue-700 active:scale-[0.98] transition-all cursor-pointer whitespace-nowrap shrink-0"
            >
              Lock In Size
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-3">
                <span className="font-display text-lg font-extrabold text-blue-950">
                  {latestResult && latestResult.score === 100
                    ? 'Perfect Guess! +100 pts'
                    : latestResult && latestResult.score >= 82
                    ? `Sharp Eye! +${latestResult.score} pts`
                    : `+${latestResult?.score ?? 0} pts`}
                </span>
                <span className="text-slate-300">·</span>
                <span className="font-mono text-xs font-semibold text-blue-700 tabular-nums">
                  {latestResult?.errorPercent}% error · True ratio {currentRound.trueRatio.toFixed(2)}× · {latestResult?.timeSeconds}s
                </span>
              </div>
              <p className="text-sm text-slate-600 max-w-2xl">
                {currentRound.target.funFact}
              </p>
            </div>

            <button
              type="button"
              onClick={handleNextRound}
              className="flex items-center justify-center gap-2 rounded-xl bg-blue-950 px-6 py-3 text-sm font-bold text-white hover:bg-blue-900 cursor-pointer whitespace-nowrap shrink-0"
            >
              {roundIndex + 1 < rounds.length ? 'Next Round' : 'View Results'}
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>
    </section>
  );
};
