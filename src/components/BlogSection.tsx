import React, { useState } from 'react';
import { ArrowRight, BookOpen, X } from 'lucide-react';
import { BLOG_ARTICLES, type BlogArticle } from '../data/gameContent';
import type { GameMode } from '../types/game';

interface BlogSectionProps {
  compact?: boolean;
  onLaunchMode: (mode: GameMode) => void;
  onOpenFullBlog?: () => void;
}

export const BlogSection: React.FC<BlogSectionProps> = ({
  compact = false,
  onLaunchMode,
  onOpenFullBlog,
}) => {
  const [activeArticle, setActiveArticle] = useState<BlogArticle | null>(null);
  const articles = compact ? BLOG_ARTICLES.slice(0, 3) : BLOG_ARTICLES;

  return (
    <section className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3 border-b border-blue-100 pb-4">
        <div>
          <span className="text-xs font-semibold text-blue-600">Scale Journal &amp; Game Guides</span>
          <h2 className="mt-1 font-display text-2xl sm:text-3xl font-extrabold text-blue-950">
            {compact ? 'From the Scale Blog' : 'Size It Up Blog & Guides'}
          </h2>
        </div>

        {compact && onOpenFullBlog && (
          <button
            type="button"
            onClick={onOpenFullBlog}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-700 hover:underline cursor-pointer"
          >
            Read All Articles
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      <div className={`grid grid-cols-1 ${compact ? 'md:grid-cols-3' : 'md:grid-cols-2'} gap-5`}>
        {articles.map((article) => (
          <article
            key={article.id}
            className="flex flex-col justify-between rounded-2xl border border-blue-100 bg-white p-5 transition-all hover:border-blue-300 hover:shadow-xs"
          >
            <div>
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <span className="font-semibold text-blue-700">{article.category}</span>
                <span aria-hidden="true">·</span>
                <span>{article.readTime}</span>
                <span aria-hidden="true">·</span>
                <span>{article.date}</span>
              </div>
              <h3 className="mt-2 font-display text-lg font-extrabold text-blue-950 leading-snug">
                {article.title}
              </h3>
              <p className="mt-2 text-sm text-slate-600 leading-relaxed">
                {article.excerpt}
              </p>
            </div>

            <div className="mt-5 flex items-center justify-between border-t border-blue-50 pt-3">
              <button
                type="button"
                onClick={() => setActiveArticle(article)}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-700 hover:text-blue-900 cursor-pointer"
              >
                <BookOpen className="h-3.5 w-3.5" />
                Read Guide
              </button>

              <button
                type="button"
                onClick={() => onLaunchMode(article.relatedMode)}
                className="text-xs font-semibold text-slate-500 hover:text-blue-700 cursor-pointer"
              >
                Play Mode →
              </button>
            </div>
          </article>
        ))}
      </div>

      {/* Article Reader Modal */}
      {activeArticle && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-blue-950/45 p-4 backdrop-blur-xs"
          role="dialog"
          aria-modal="true"
          aria-labelledby="blog-modal-title"
        >
          <div className="w-full max-w-2xl rounded-2xl border border-blue-200 bg-white p-6 sm:p-8 shadow-xl max-h-[85vh] overflow-y-auto">
            <div className="flex items-start justify-between gap-4 border-b border-blue-100 pb-4">
              <div>
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <span className="font-semibold text-blue-700">{activeArticle.category}</span>
                  <span>·</span>
                  <span>{activeArticle.readTime}</span>
                  <span>·</span>
                  <span>{activeArticle.date}</span>
                </div>
                <h3
                  id="blog-modal-title"
                  className="mt-1 font-display text-2xl font-extrabold text-blue-950"
                >
                  {activeArticle.title}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setActiveArticle(null)}
                aria-label="Close article"
                className="rounded-lg p-1.5 text-slate-400 hover:bg-blue-50 hover:text-blue-950 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-5 space-y-4 text-sm sm:text-base leading-relaxed text-slate-700">
              {activeArticle.paragraphs.map((p, idx) => (
                <p key={idx}>{p}</p>
              ))}
            </div>

            <div className="mt-6 flex items-center justify-end gap-3 border-t border-blue-100 pt-4">
              <button
                type="button"
                onClick={() => setActiveArticle(null)}
                className="rounded-lg border border-blue-200 px-4 py-2 text-xs font-semibold text-blue-900 hover:bg-blue-50 cursor-pointer"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => {
                  const mode = activeArticle.relatedMode;
                  setActiveArticle(null);
                  onLaunchMode(mode);
                }}
                className="rounded-lg bg-blue-600 px-4 py-2 text-xs font-bold text-white hover:bg-blue-700 cursor-pointer"
              >
                Try This Game Mode
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
