import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowRight,
  Check,
  Clock,
  Minus,
  Plus,
  RotateCcw,
  Ruler,
  Scale,
  Calculator,
  Trophy,
} from 'lucide-react';
import { SCALE_OBJECTS, WEEKLY_1K_PACKS } from '../data/gameContent';
import type { LeaderboardEntry, WeeklyRound } from '../types/game';
import { calculateScaleScore, getWeeklyCountdown } from '../utils/scoring';
import { soundFX } from '../utils/sound';
import { SilhouetteSvg } from './SilhouetteSvg';

interface Weekly1KGameProps {
  playerName: string;
  onComplete: (score: number, accuracy: number, theme: string) => void;
  onSubmitLeaderboard: (score: number, accuracy: number, name: string, category: string) => Promise<void>;
}

interface WeeklyResultItem {
  roundNumber: number;
  type: WeeklyRound['type'];
  label: string;
  score: number;
  detail: string;
  emoji: string;
}

export const Weekly1KGame: React.FC<Weekly1KGameProps> = ({
  playerName,
  onComplete,
  onSubmitLeaderboard,
}) => {
  const [packIndex, setPackIndex] = useState(0);
  const pack = WEEKLY_1K_PACKS[packIndex];
  const [countdown, setCountdown] = useState(getWeeklyCountdown);

  const [roundIdx, setRoundIdx] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [results, setResults] = useState<WeeklyResultItem[]>([]);
  const [finished, setFinished] = useState(false);

  // Per-mechanic state
  const [sliderRatio, setSliderRatio] = useState(1.0);
  const [weightCount, setWeightCount] = useState(25);
  const [estimateInput, setEstimateInput] = useState('');
  const [lastRoundNote, setLastRoundNote] = useState('');

  // Leaderboard rank comparison
  const [weeklyEntries, setWeeklyEntries] = useState<LeaderboardEntry[]>([]);
  const [handleInput, setHandleInput] = useState(playerName);
  const [lbSubmitted, setLbSubmitted] = useState(false);
  const [lbSubmitting, setLbSubmitting] = useState(false);

  const dragRef = useRef<{ startY: number; startX: number; startRatio: number } | null>(null);

  useEffect(() => {
    const t = window.setInterval(() => setCountdown(getWeeklyCountdown()), 30000);
    return () => window.clearInterval(t);
  }, []);

  useEffect(() => {
    setHandleInput(playerName);
  }, [playerName]);

  useEffect(() => {
    setRoundIdx(0);
    setRevealed(false);
    setResults([]);
    setFinished(false);
    setSliderRatio(1.0);
    setWeightCount(25);
    setEstimateInput('');
    setLastRoundNote('');
    setLbSubmitted(false);
  }, [pack.id]);

  const round = pack.rounds[roundIdx];

  const visualObjects = useMemo(() => {
    if (!round || round.type !== 'visual') return null;
    const refObj = SCALE_OBJECTS.find((o) => o.id === round.referenceId);
    const targetObj = SCALE_OBJECTS.find((o) => o.id === round.targetId);
    if (!refObj || !targetObj) return null;
    const trueRatio = targetObj.realMeters / refObj.realMeters;
    const maxStageHeight = 225;
    const refPixelHeight = Math.max(
      46,
      Math.round(trueRatio > 1 ? Math.min(165, maxStageHeight / trueRatio) : Math.min(200, maxStageHeight))
    );
    return {
      refObj,
      targetObj,
      trueRatio,
      refPixelHeight,
      minRatio: 0.14,
      maxRatio: Math.max(6.2, Math.ceil(trueRatio * 1.55)),
    };
  }, [round]);

  const fetchWeeklyRankContext = async () => {
    try {
      const res = await fetch('/api/leaderboard?mode=weekly-1k');
      if (res.ok) {
        const data = (await res.json()) as { entries: LeaderboardEntry[] };
        setWeeklyEntries(data.entries || []);
      }
    } catch {
      // ignore
    }
  };

  const lockInCurrentRound = () => {
    if (!round || revealed) return;

    if (round.type === 'visual' && visualObjects) {
      const evalRes = calculateScaleScore(sliderRatio, visualObjects.trueRatio);
      soundFX.playLockIn(evalRes.score);
      setResults((prev) => [
        ...prev,
        {
          roundNumber: round.roundNumber,
          type: 'visual',
          label: `${visualObjects.targetObj.name} vs ${visualObjects.refObj.name}`,
          score: evalRes.score,
          detail: `${evalRes.errorPercent}% off (${visualObjects.targetObj.displaySize})`,
          emoji: evalRes.emoji,
        },
      ]);
      setLastRoundNote(visualObjects.targetObj.funFact);
      setRevealed(true);
      return;
    }

    if (round.type === 'weight') {
      const exactUnits = Math.max(1, Math.round(round.heavyItem.weightKg / round.unitItem.weightKg));
      const guessedKg = weightCount * round.unitItem.weightKg;
      const ratio = guessedKg / round.heavyItem.weightKg;
      const relErr = Math.abs(weightCount - exactUnits) / exactUnits;
      const logErr = Math.abs(Math.log2(Math.max(0.01, ratio)));
      const score = relErr <= 0.055 ? 100 : Math.max(0, Math.min(99, Math.round(104 - logErr * 52)));
      const emoji = score === 100 ? '🟦' : score >= 82 ? '🔷' : score >= 50 ? '🔹' : '⬜';
      soundFX.playLockIn(score);
      setResults((prev) => [
        ...prev,
        {
          roundNumber: round.roundNumber,
          type: 'weight',
          label: `${round.heavyItem.name} in ${round.unitItem.pluralName}`,
          score,
          detail: `Answer: ${exactUnits.toLocaleString()} ${round.unitItem.pluralName}`,
          emoji,
        },
      ]);
      setLastRoundNote(round.funFact);
      setRevealed(true);
      return;
    }

    if (round.type === 'estimate') {
      const val = Number(estimateInput.replace(/,/g, ''));
      if (!val || val <= 0) return;
      const logDist = Math.abs(Math.log10(val / round.answer));
      const relErr = Math.abs(val - round.answer) / round.answer;
      const score = relErr <= 0.05 ? 100 : Math.max(0, Math.min(99, Math.round(100 - logDist * 45)));
      const emoji = score === 100 ? '🟦' : score >= 82 ? '🔷' : score >= 50 ? '🔹' : '⬜';
      soundFX.playLockIn(score);
      setResults((prev) => [
        ...prev,
        {
          roundNumber: round.roundNumber,
          type: 'estimate',
          label: round.prompt,
          score,
          detail: `Exact: ${round.answer.toLocaleString()} ${round.unit}`,
          emoji,
        },
      ]);
      setLastRoundNote(round.explanation);
      setRevealed(true);
    }
  };

  const handleNext = () => {
    if (roundIdx + 1 < pack.rounds.length) {
      setRoundIdx((i) => i + 1);
      setRevealed(false);
      setSliderRatio(1.0);
      setWeightCount(25);
      setEstimateInput('');
      setLastRoundNote('');
    } else {
      const total = results.reduce((sum, r) => sum + r.score, 0);
      const avgAcc = Math.round(total / Math.max(1, results.length));
      soundFX.playVictory();
      setFinished(true);
      fetchWeeklyRankContext();
      onComplete(total, avgAcc, pack.theme);
    }
  };

  const resetPack = () => {
    setRoundIdx(0);
    setRevealed(false);
    setResults([]);
    setFinished(false);
    setSliderRatio(1.0);
    setWeightCount(25);
    setEstimateInput('');
    setLastRoundNote('');
    setLbSubmitted(false);
  };

  // ==================== FINISHED 1,000-PT SUMMARY ====================
  if (finished) {
    const totalScore = results.reduce((s, r) => s + r.score, 0);
    const avgAccuracy = Math.round(totalScore / Math.max(1, results.length));
    const totalPlayers = weeklyEntries.length + (lbSubmitted ? 0 : 1);
    const higherCount = weeklyEntries.filter((e) => e.score > totalScore).length;
    const estRank = higherCount + 1;
    const topPct = Math.max(1, Math.round((estRank / Math.max(1, totalPlayers)) * 100));

    return (
      <section className="rounded-2xl border border-blue-200 bg-white p-6 sm:p-8 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-blue-100 pb-6">
          <div>
            <span className="text-xs font-semibold text-blue-600">
              Weekly 1K · Week #{pack.weekNumber} · {pack.theme}
            </span>
            <h2 className="mt-1 font-display text-3xl sm:text-4xl font-extrabold text-blue-950 font-mono tabular-nums">
              {totalScore} <span className="text-lg font-sans font-semibold text-slate-400">/ 1,000 pts</span>
            </h2>
            <p className="mt-1 text-sm font-medium text-blue-800">
              Estimated Rank #{estRank} of {totalPlayers} players · Top {topPct}%
            </p>
          </div>

          <div className="flex flex-col sm:items-end gap-1">
            <div className="text-xs text-slate-500">10-Round Pattern</div>
            <div className="text-lg tracking-wider">{results.map((r) => r.emoji).join('')}</div>
          </div>
        </div>

        <div className="divide-y divide-blue-50">
          {results.map((r) => (
            <div
              key={r.roundNumber}
              className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 py-2.5 text-sm"
            >
              <div className="flex items-center gap-3 min-w-0">
                <span className="font-mono text-xs font-bold text-blue-600 tabular-nums shrink-0">
                  {String(r.roundNumber).padStart(2, '0')}
                </span>
                <span className="truncate font-medium text-blue-950">{r.label}</span>
              </div>
              <div className="flex items-center gap-4 font-mono text-xs sm:text-sm tabular-nums shrink-0">
                <span className="text-slate-500">{r.detail}</span>
                <span className="font-bold text-blue-950 w-16 text-right">{r.score} pts</span>
              </div>
            </div>
          ))}
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-xl bg-blue-50/70 p-4">
          {!lbSubmitted ? (
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                if (!handleInput.trim() || lbSubmitting) return;
                setLbSubmitting(true);
                await onSubmitLeaderboard(totalScore, avgAccuracy, handleInput.trim(), pack.category);
                await fetchWeeklyRankContext();
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
                placeholder="Enter handle"
                className="min-w-[160px] flex-1 sm:max-w-xs rounded-lg border border-blue-200 bg-white px-3 py-2 text-sm text-blue-950 focus:border-blue-600 focus:outline-none"
              />
              <button
                type="submit"
                disabled={lbSubmitting || !handleInput.trim()}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50 cursor-pointer whitespace-nowrap"
              >
                {lbSubmitting ? 'Saving...' : 'Submit Weekly Score'}
              </button>
            </form>
          ) : (
            <div className="flex items-center gap-2 text-sm font-semibold text-blue-800">
              <Check className="h-4 w-4 text-emerald-600" />
              Posted {totalScore}/1,000 to Weekly 1K Leaderboard!
            </div>
          )}

          <button
            type="button"
            onClick={resetPack}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-950 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-900 cursor-pointer whitespace-nowrap"
          >
            <RotateCcw className="h-4 w-4" />
            Replay Week #{pack.weekNumber}
          </button>
        </div>
      </section>
    );
  }

  // ==================== ACTIVE 10-ROUND ARENA ====================
  const runningScore = results.reduce((s, r) => s + r.score, 0);
  const currentResult = revealed ? results[results.length - 1] : null;

  return (
    <section className="space-y-4">
      {/* Week Header + Archive Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border border-blue-200 bg-white px-5 py-4 shadow-xs">
        <div>
          <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-blue-600">
            <span>The Weekly 1K · Week #{pack.weekNumber}</span>
            <span className="text-slate-300">·</span>
            <span className="inline-flex items-center gap-1 font-mono text-slate-500">
              <Clock className="h-3.5 w-3.5 text-blue-600" />
              Next drop in {countdown}
            </span>
          </div>
          <h2 className="mt-0.5 font-display text-2xl font-extrabold text-blue-950">
            {pack.theme}
          </h2>
          <p className="text-xs text-slate-500">{pack.subtitle}</p>
        </div>

        <div className="flex items-center gap-1 rounded-xl bg-blue-50 p-1 self-start sm:self-auto">
          {WEEKLY_1K_PACKS.map((p, idx) => (
            <button
              key={p.id}
              type="button"
              onClick={() => setPackIndex(idx)}
              className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-colors cursor-pointer whitespace-nowrap ${
                idx === packIndex
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-blue-900 hover:bg-white/70'
              }`}
            >
              {idx === 0 ? `Week #${p.weekNumber} (Live)` : `Week #${p.weekNumber}`}
            </button>
          ))}
        </div>
      </div>

      {/* Main Round Card */}
      <div className="rounded-2xl border border-blue-200 bg-white shadow-sm overflow-hidden">
        {/* 10-round segmented progress bar */}
        <div className="border-b border-blue-100 px-5 py-3.5 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-1.5 flex-wrap">
            {pack.rounds.map((r, i) => {
              const done = results[i];
              const isCurrent = i === roundIdx;
              return (
                <div
                  key={r.roundNumber}
                  title={`Round ${r.roundNumber}: ${r.type}`}
                  className={`flex h-7 w-7 items-center justify-center rounded-md font-mono text-xs font-bold tabular-nums transition-colors ${
                    done
                      ? 'bg-blue-600 text-white'
                      : isCurrent
                      ? 'border-2 border-blue-600 bg-blue-50 text-blue-700'
                      : 'bg-slate-100 text-slate-400'
                  }`}
                >
                  {r.roundNumber}
                </div>
              );
            })}
          </div>

          <div className="flex items-center gap-3 font-mono text-sm font-bold text-blue-950 tabular-nums">
            <span className="inline-flex items-center gap-1 text-xs font-sans font-semibold text-blue-700">
              {round.type === 'visual' && <Ruler className="h-3.5 w-3.5" />}
              {round.type === 'weight' && <Scale className="h-3.5 w-3.5" />}
              {round.type === 'estimate' && <Calculator className="h-3.5 w-3.5" />}
              {round.type === 'visual'
                ? 'Visual Scale'
                : round.type === 'weight'
                ? 'Weight Balance'
                : 'Fermi Estimate'}
            </span>
            <span className="text-slate-300">·</span>
            <span>{runningScore} / 1,000</span>
          </div>
        </div>

        {/* ROUND TYPE 1: VISUAL SCALE */}
        {round.type === 'visual' && visualObjects && (() => {
          const { refObj, targetObj, trueRatio, refPixelHeight, minRatio, maxRatio } = visualObjects;
          const activeRatio = revealed ? trueRatio : sliderRatio;
          const refW = Math.round(refPixelHeight * (refObj.box[0] / refObj.box[1]));
          const targetH = Math.round(refPixelHeight * activeRatio);
          const targetW = Math.round(targetH * (targetObj.box[0] / targetObj.box[1]));

          const minLog = Math.log(minRatio);
          const maxLog = Math.log(maxRatio);
          const sliderPos =
            ((Math.log(Math.max(minRatio, Math.min(maxRatio, sliderRatio))) - minLog) /
              (maxLog - minLog)) *
            100;

          return (
            <div>
              <div className="px-5 py-3 bg-blue-50/50 border-b border-blue-100 flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm sm:text-base font-medium text-blue-950">
                  {round.prompt} ({refObj.name}:{' '}
                  <span className="font-mono font-bold text-blue-800">{refObj.displaySize}</span>)
                </p>
                <span className="font-mono text-xs text-slate-500 tabular-nums">
                  {sliderRatio.toFixed(2)}×
                </span>
              </div>

              <div
                onWheel={(e) => {
                  if (revealed) return;
                  e.preventDefault();
                  const factor = e.deltaY < 0 ? 1.05 : 0.95;
                  setSliderRatio((p) =>
                    Math.round(Math.max(minRatio, Math.min(maxRatio, p * factor)) * 100) / 100
                  );
                }}
                className="blueprint-grid relative flex min-h-[300px] items-end justify-center px-4 pb-8 pt-10 select-none overflow-hidden"
              >
                <div aria-hidden="true" className="absolute inset-x-6 bottom-8 h-px bg-blue-300" />
                <div className="relative z-10 flex items-end justify-center gap-10 sm:gap-16">
                  <div className="flex flex-col items-center">
                    <div
                      style={{ width: refW, height: refPixelHeight }}
                      className="flex items-end justify-center text-blue-900"
                    >
                      <SilhouetteSvg item={refObj} className="h-full w-full" />
                    </div>
                    <span className="mt-2 text-xs font-bold text-blue-950">{refObj.name}</span>
                  </div>

                  <div className="flex flex-col items-center">
                    <div
                      style={{ width: targetW, height: targetH }}
                      className={`relative flex items-end justify-center ${
                        revealed
                          ? 'text-blue-600 transition-all duration-300'
                          : 'text-sky-500 ring-1 ring-sky-400/60 bg-sky-400/5'
                      }`}
                    >
                      <SilhouetteSvg item={targetObj} className="h-full w-full" />
                      {!revealed && (
                        <button
                          type="button"
                          onPointerDown={(e) => {
                            e.preventDefault();
                            (e.target as HTMLElement).setPointerCapture(e.pointerId);
                            dragRef.current = {
                              startY: e.clientY,
                              startX: e.clientX,
                              startRatio: sliderRatio,
                            };
                          }}
                          onPointerMove={(e) => {
                            if (!dragRef.current) return;
                            const dy = dragRef.current.startY - e.clientY;
                            const dx = e.clientX - dragRef.current.startX;
                            const next = Math.max(
                              minRatio,
                              Math.min(maxRatio, dragRef.current.startRatio * Math.exp((dy + dx * 0.6) / 140))
                            );
                            setSliderRatio(Math.round(next * 100) / 100);
                          }}
                          onPointerUp={() => {
                            dragRef.current = null;
                          }}
                          aria-label="Drag to resize"
                          className="absolute -right-2.5 -top-2.5 flex h-6 w-6 items-center justify-center rounded-full border-2 border-white bg-blue-600 text-[10px] font-bold text-white shadow cursor-nwse-resize"
                        >
                          ⤢
                        </button>
                      )}
                    </div>
                    <span className="mt-2 text-xs font-bold text-sky-700">
                      {targetObj.name} {revealed ? `(${targetObj.displaySize})` : ''}
                    </span>
                  </div>
                </div>
              </div>

              {!revealed && (
                <div className="border-t border-blue-100 px-5 py-4 flex flex-col sm:flex-row items-center gap-4">
                  <div className="flex flex-1 items-center gap-3 w-full">
                    <button
                      type="button"
                      onClick={() =>
                        setSliderRatio((p) => Math.max(minRatio, Math.round(p * 0.92 * 100) / 100))
                      }
                      className="flex h-9 w-9 items-center justify-center rounded-lg border border-blue-200 text-blue-900 hover:bg-blue-50 cursor-pointer shrink-0"
                    >
                      <Minus className="h-4 w-4" />
                    </button>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      step={0.2}
                      value={sliderPos}
                      onChange={(e) => {
                        const pct = Number(e.target.value);
                        const r = Math.exp(minLog + (pct / 100) * (maxLog - minLog));
                        setSliderRatio(Math.round(r * 100) / 100);
                      }}
                      className="scale-slider w-full cursor-pointer"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setSliderRatio((p) => Math.min(maxRatio, Math.round(p * 1.08 * 100) / 100))
                      }
                      className="flex h-9 w-9 items-center justify-center rounded-lg border border-blue-200 text-blue-900 hover:bg-blue-50 cursor-pointer shrink-0"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={lockInCurrentRound}
                    className="rounded-xl bg-blue-600 px-6 py-3 text-sm font-bold text-white hover:bg-blue-700 cursor-pointer whitespace-nowrap shrink-0"
                  >
                    Lock Round {round.roundNumber}
                  </button>
                </div>
              )}
            </div>
          );
        })()}

        {/* ROUND TYPE 2: WEIGHT BALANCE */}
        {round.type === 'weight' && (() => {
          const ratio = (weightCount * round.unitItem.weightKg) / round.heavyItem.weightKg;
          const tiltDeg = revealed ? Math.max(-18, Math.min(18, Math.log2(Math.max(0.1, ratio)) * 12)) : 0;

          return (
            <div>
              <div className="blueprint-grid px-6 py-8 text-center">
                <p className="text-base font-semibold text-blue-950 mb-4">
                  How many <span className="font-bold text-sky-600">{round.unitItem.pluralName}</span> (
                  {round.unitItem.displayWeight} each) balance{' '}
                  <span className="font-bold text-blue-900">{round.heavyItem.name}</span>?
                </p>

                <div className="mx-auto max-w-lg">
                  <svg viewBox="0 0 420 180" className="w-full h-auto overflow-visible">
                    <path d="M165 170 L255 170 L240 156 L180 156 Z" fill="#1e3a8a" />
                    <rect x="205" y="48" width="10" height="110" rx="4" fill="#1d4ed8" />
                    <circle cx="210" cy="48" r="8" fill="#0ea5e9" stroke="#ffffff" strokeWidth="3" />
                    <g
                      style={{
                        transform: `rotate(${tiltDeg}deg)`,
                        transformOrigin: '210px 48px',
                        transition: 'transform 600ms cubic-bezier(0.22, 1, 0.36, 1)',
                      }}
                    >
                      <rect x="60" y="44" width="300" height="8" rx="4" fill="#1e3a8a" />
                      <line x1="78" y1="50" x2="54" y2="106" stroke="#64748b" strokeWidth="2" />
                      <line x1="78" y1="50" x2="102" y2="106" stroke="#64748b" strokeWidth="2" />
                      <path d="M36 106 L120 106 L110 118 L46 118 Z" fill="#1d4ed8" />
                      <rect x="44" y="70" width="68" height="34" rx="8" fill="#dbeafe" stroke="#1d4ed8" strokeWidth="2" />
                      <text x="78" y="85" textAnchor="middle" fontSize="9" fontWeight="700" fill="#0b1f44">
                        {round.heavyItem.name.split(' ').slice(0, 2).join(' ')}
                      </text>
                      <text x="78" y="97" textAnchor="middle" fontSize="8.5" fontWeight="700" fill="#1d4ed8">
                        {revealed ? round.heavyItem.displayWeight : '??? kg'}
                      </text>

                      <line x1="342" y1="50" x2="318" y2="106" stroke="#64748b" strokeWidth="2" />
                      <line x1="342" y1="50" x2="366" y2="106" stroke="#64748b" strokeWidth="2" />
                      <path d="M300 106 L384 106 L374 118 L310 118 Z" fill="#0284c7" />
                      <rect x="308" y="70" width="68" height="34" rx="8" fill="#e0f2fe" stroke="#0284c7" strokeWidth="2" />
                      <text x="342" y="88" textAnchor="middle" fontSize="12" fontWeight="800" fill="#0369a1">
                        {weightCount.toLocaleString()}×
                      </text>
                      <text x="342" y="99" textAnchor="middle" fontSize="8" fontWeight="600" fill="#0c4a6e">
                        {round.unitItem.pluralName.split(' ').slice(-1)[0]}
                      </text>
                    </g>
                  </svg>
                </div>
              </div>

              {!revealed && (
                <div className="border-t border-blue-100 px-5 py-4 flex flex-wrap items-center justify-center gap-2">
                  {[-100, -10, -1].map((d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => setWeightCount((c) => Math.max(1, c + d))}
                      className="rounded-lg border border-blue-200 bg-blue-50/50 px-3 py-2 font-mono text-xs font-bold text-blue-900 hover:bg-blue-100 cursor-pointer"
                    >
                      {d}
                    </button>
                  ))}
                  <input
                    type="number"
                    min={1}
                    max={50000}
                    value={weightCount}
                    onChange={(e) => setWeightCount(Math.max(1, Math.min(50000, Number(e.target.value) || 1)))}
                    className="w-24 rounded-xl border border-blue-300 px-3 py-2 text-center font-mono text-base font-extrabold text-blue-950"
                  />
                  {[1, 10, 100, 1000].map((d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => setWeightCount((c) => Math.min(50000, c + d))}
                      className="rounded-lg border border-blue-200 bg-blue-50/50 px-3 py-2 font-mono text-xs font-bold text-blue-900 hover:bg-blue-100 cursor-pointer"
                    >
                      +{d >= 1000 ? '1K' : d}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={lockInCurrentRound}
                    className="ml-2 rounded-xl bg-blue-600 px-6 py-2.5 text-sm font-bold text-white hover:bg-blue-700 cursor-pointer"
                  >
                    Drop &amp; Weigh
                  </button>
                </div>
              )}
            </div>
          );
        })()}

        {/* ROUND TYPE 3: FERMI ESTIMATE */}
        {round.type === 'estimate' && (
          <div className="p-6 sm:p-8 space-y-5">
            <p className="text-lg sm:text-xl font-bold text-blue-950 max-w-2xl">
              {round.prompt}
            </p>

            {!revealed && (
              <div className="space-y-3">
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="relative flex-1">
                    <input
                      type="text"
                      inputMode="numeric"
                      value={estimateInput}
                      onChange={(e) => setEstimateInput(e.target.value.replace(/[^0-9.,]/g, ''))}
                      placeholder={`Estimate in ${round.unit}...`}
                      className="w-full rounded-xl border border-blue-200 bg-blue-50/40 px-4 py-3 font-mono text-lg font-bold text-blue-950 focus:border-blue-600 focus:bg-white focus:outline-none"
                    />
                    <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-xs text-slate-400">
                      {round.unit}
                    </span>
                  </div>
                  <button
                    type="button"
                    disabled={!estimateInput}
                    onClick={lockInCurrentRound}
                    className="rounded-xl bg-blue-600 px-6 py-3 text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-50 cursor-pointer whitespace-nowrap"
                  >
                    Lock Estimate
                  </button>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {[
                    { label: '×10', m: 10 },
                    { label: '×100', m: 100 },
                    { label: '×1K', m: 1000 },
                    { label: '×1M', m: 1000000 },
                  ].map((item) => (
                    <button
                      key={item.label}
                      type="button"
                      onClick={() => {
                        const curr = Number(estimateInput.replace(/,/g, '')) || 1;
                        setEstimateInput(String(Math.round(curr * item.m)));
                      }}
                      className="rounded-lg border border-blue-200 bg-blue-50/60 px-3 py-1.5 font-mono text-xs font-semibold text-blue-800 hover:bg-blue-100 cursor-pointer"
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Reveal Banner for any round type */}
        {revealed && currentResult && (
          <div className="border-t border-blue-100 bg-blue-50/60 px-5 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2.5">
                <span className="font-display text-lg font-extrabold text-blue-950">
                  +{currentResult.score} / 100 pts
                </span>
                <span className="text-slate-300">·</span>
                <span className="font-mono text-xs font-bold text-blue-700">
                  {currentResult.detail}
                </span>
              </div>
              <p className="text-sm text-slate-600 max-w-2xl">{lastRoundNote}</p>
            </div>

            <button
              type="button"
              onClick={handleNext}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-950 px-6 py-3 text-sm font-bold text-white hover:bg-blue-900 cursor-pointer whitespace-nowrap shrink-0"
            >
              {roundIdx + 1 < pack.rounds.length
                ? `Round ${roundIdx + 2} of 10`
                : 'Finish Weekly 1K'}
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>
    </section>
  );
};
