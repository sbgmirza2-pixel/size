import React, { useState } from 'react';
import { Check, Copy, Share2, X } from 'lucide-react';
import type { Category, Difficulty } from '../types/game';
import { encodeChallengePayload } from '../utils/scoring';

interface ChallengeModalProps {
  data: {
    seed: string;
    score: number;
    difficulty: Difficulty;
    category: Category | 'Daily Mix';
    roundEmojis: string[];
  } | null;
  playerName: string;
  onClose: () => void;
}

export const ChallengeModal: React.FC<ChallengeModalProps> = ({
  data,
  playerName,
  onClose,
}) => {
  const [copiedCard, setCopiedCard] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  if (!data) return null;

  const token = encodeChallengePayload({
    seed: data.seed,
    challengerName: playerName || 'SizeItUp Player',
    challengerScore: data.score,
    difficulty: data.difficulty,
    category: data.category,
    roundEmojis: data.roundEmojis,
  });

  const challengeUrl = `${window.location.origin}${window.location.pathname}?challenge=${token}`;
  const shareText = `Size It Up (${data.category} · ${data.difficulty})\nScore: ${data.score}/500\n${data.roundEmojis.join('')}\nBeat my scale intuition: ${challengeUrl}`;

  const copyText = async (txt: string, kind: 'card' | 'link') => {
    try {
      await navigator.clipboard.writeText(txt);
      if (kind === 'card') {
        setCopiedCard(true);
        window.setTimeout(() => setCopiedCard(false), 2000);
      } else {
        setCopiedLink(true);
        window.setTimeout(() => setCopiedLink(false), 2000);
      }
    } catch {
      // Fallback ignored
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-blue-950/40 p-4 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-labelledby="challenge-modal-title"
    >
      <div className="w-full max-w-md rounded-2xl border border-blue-200 bg-white p-6 shadow-xl">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white">
              <Share2 className="h-5 w-5" />
            </div>
            <div>
              <h2 id="challenge-modal-title" className="font-display text-xl font-extrabold text-blue-950">
                Challenge a Friend
              </h2>
              <p className="text-xs text-slate-500">
                Friends play the exact same 5 rounds and try to top your score.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close challenge modal"
            className="rounded-lg p-1.5 text-slate-400 hover:bg-blue-50 hover:text-blue-950 cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-5 rounded-xl border border-blue-100 bg-blue-50/70 p-4 font-mono text-xs text-blue-950 whitespace-pre-line">
          {`Size It Up · ${data.category} (${data.difficulty})\nScore: ${data.score}/500\n${data.roundEmojis.join('')}`}
        </div>

        <div className="mt-4 space-y-2.5">
          <button
            type="button"
            onClick={() => copyText(shareText, 'card')}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-bold text-white hover:bg-blue-700 cursor-pointer"
          >
            {copiedCard ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            {copiedCard ? 'Copied Score Card & Link!' : 'Copy Shareable Score Card'}
          </button>

          <button
            type="button"
            onClick={() => copyText(challengeUrl, 'link')}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-blue-200 bg-white px-4 py-2.5 text-sm font-semibold text-blue-900 hover:bg-blue-50 cursor-pointer"
          >
            {copiedLink ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4 text-blue-600" />}
            {copiedLink ? 'Direct Link Copied' : 'Copy Duel Link Only'}
          </button>
        </div>
      </div>
    </div>
  );
};
