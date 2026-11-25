import React from 'react';
import { ArrowRight, Compass, Gauge } from 'lucide-react';
import { CATEGORIES, SCALE_OBJECTS } from '../data/gameContent';
import type { Category, Difficulty } from '../types/game';

interface CategoryHubProps {
  selectedCategory: Category | 'Daily Mix';
  selectedDifficulty: Difficulty;
  completedCategories: Category[];
  onStartCategory: (category: Category | 'Daily Mix', difficulty: Difficulty) => void;
  onChangeDifficulty: (difficulty: Difficulty) => void;
}

const DIFFICULTY_INFO: { id: Difficulty; summary: string }[] = [
  { id: 'Easy', summary: 'Familiar everyday objects & clear proportions' },
  { id: 'Medium', summary: 'Tricky cross-scale comparisons & landmarks' },
  { id: 'Hard', summary: 'Extreme sizes & deceptive visual illusions' },
];

export const CategoryHub: React.FC<CategoryHubProps> = ({
  selectedCategory,
  selectedDifficulty,
  completedCategories,
  onStartCategory,
  onChangeDifficulty,
}) => {
  return (
    <section className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between border-b border-blue-100 pb-6">
        <div>
          <span className="text-xs font-semibold text-blue-600">Special Categories</span>
          <h2 className="mt-1 font-display text-3xl font-extrabold text-blue-950">
            Pick Your Scale Arena
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            Choose a themed deck and difficulty tier to launch a custom 5-round challenge.
          </p>
        </div>

        {/* Difficulty Segmented Control */}
        <div className="flex items-center gap-1 rounded-xl bg-blue-100/70 p-1 self-start sm:self-auto">
          {DIFFICULTY_INFO.map((diff) => {
            const active = selectedDifficulty === diff.id;
            return (
              <button
                key={diff.id}
                type="button"
                onClick={() => onChangeDifficulty(diff.id)}
                className={`rounded-lg px-3.5 py-2 text-xs font-bold transition-colors cursor-pointer whitespace-nowrap ${
                  active
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-blue-900 hover:bg-white/60'
                }`}
              >
                {diff.id}
              </button>
            );
          })}
        </div>
      </div>

      {/* Difficulty description row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {DIFFICULTY_INFO.map((diff) => {
          const active = selectedDifficulty === diff.id;
          return (
            <button
              key={diff.id}
              type="button"
              onClick={() => onChangeDifficulty(diff.id)}
              className={`text-left rounded-xl border p-4 transition-all cursor-pointer ${
                active
                  ? 'border-blue-600 bg-blue-50/70'
                  : 'border-blue-100 bg-white hover:border-blue-300'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-display text-base font-bold text-blue-950">
                  {diff.id} Mode
                </span>
                <Gauge className={`h-4 w-4 ${active ? 'text-blue-600' : 'text-slate-400'}`} />
              </div>
              <p className="mt-1 text-xs text-slate-600">{diff.summary}</p>
            </button>
          );
        })}
      </div>

      {/* 6 Special Categories + Daily Mix */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {CATEGORIES.map((cat) => {
          const count = SCALE_OBJECTS.filter((o) => o.category === cat.id).length;
          const isDone = completedCategories.includes(cat.id);
          const isCurrent = selectedCategory === cat.id;

          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => onStartCategory(cat.id, selectedDifficulty)}
              className={`group flex flex-col justify-between rounded-2xl border p-5 text-left transition-all cursor-pointer ${
                isCurrent
                  ? 'border-blue-600 bg-white shadow-sm'
                  : 'border-blue-100 bg-white hover:border-blue-400 hover:shadow-sm'
              }`}
            >
              <div>
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span>{cat.accentNote}</span>
                  <span>
                    {count} objects{isDone ? ' · Played' : ''}
                  </span>
                </div>
                <h3 className="mt-2 font-display text-xl font-extrabold text-blue-950 group-hover:text-blue-700 transition-colors">
                  {cat.label}
                </h3>
                <p className="mt-1 text-sm text-slate-600">{cat.tagline}</p>
              </div>

              <div className="mt-5 flex items-center justify-between border-t border-blue-50 pt-3 text-xs font-bold text-blue-700">
                <span>Play {selectedDifficulty}</span>
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </div>
            </button>
          );
        })}
      </div>

      {/* Daily Mix Feature Card */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border border-blue-200 bg-blue-950 p-6 text-white">
        <div className="flex items-start gap-4">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-800 text-sky-300 shrink-0">
            <Compass className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-display text-lg font-bold">Daily Mix · All Categories</h3>
            <p className="mt-0.5 text-sm text-blue-200">
              Cross-category matchups combining wildlife, architecture, spacecraft, and oddities.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => onStartCategory('Daily Mix', selectedDifficulty)}
          className="rounded-xl bg-blue-500 px-5 py-2.5 text-sm font-bold text-white hover:bg-blue-400 cursor-pointer whitespace-nowrap shrink-0"
        >
          Play Daily Mix
        </button>
      </div>
    </section>
  );
};
