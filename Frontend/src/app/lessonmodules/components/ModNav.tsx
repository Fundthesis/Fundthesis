"use client";
import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { getAnsweredCount } from '@/app/lessonmodules/data/userProgress';

type Props = {
  moduleIndex: number;
  totalModules: number;
  title?: string;
};

const ModNav: React.FC<Props> = ({ moduleIndex, totalModules, title }) => {
  const prev = moduleIndex - 1;
  const next = moduleIndex + 1;
  const isFirst = moduleIndex <= 1;

  const [counts, setCounts] = useState(() => getAnsweredCount(moduleIndex));

  useEffect(() => {
    function onChange() {
      try {
        setCounts(getAnsweredCount(moduleIndex));
      } catch {
        /* ignore */
      }
    }
    window.addEventListener('ft-progress-changed', onChange);
    window.addEventListener('storage', onChange);
    onChange();
    return () => {
      window.removeEventListener('ft-progress-changed', onChange);
      window.removeEventListener('storage', onChange);
    };
  }, [moduleIndex]);

  const label = moduleIndex === totalModules ? 'X' : String(moduleIndex);

  return (
    <div className="w-full bg-white border-b-2 border-black">
      <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
        <div>
          {!isFirst ? (
            <Link
              href={`/lessonmodules/${prev}`}
              className="text-xs uppercase tracking-widest text-stone-500 hover:text-black transition-colors"
              aria-label={`Go to chapter ${prev}`}
            >
              Previous Chapter
            </Link>
          ) : (
            <Link
              href="/learn"
              className="text-xs uppercase tracking-widest text-stone-500 hover:text-black transition-colors"
            >
              Back to Ledger
            </Link>
          )}
        </div>

        <div className="text-center">
          <p className="text-xs uppercase tracking-widest text-stone-400">
            Chapter {label}
          </p>
          <h2 className="font-serif text-lg font-bold text-black">
            {title ?? `Chapter ${label}`}
          </h2>
          {moduleIndex !== 10 && (
            <p className="text-xs text-stone-500 mt-1">
              {counts.answered} of {counts.total} questions answered
            </p>
          )}
        </div>

        <div>
          {next <= totalModules ? (
            <Link
              href={`/lessonmodules/${next}`}
              className="text-xs uppercase tracking-widest text-stone-500 hover:text-black transition-colors"
              aria-label={`Go to chapter ${next}`}
            >
              Next Chapter
            </Link>
          ) : (
            <Link
              href="/learn"
              className="text-xs uppercase tracking-widest text-stone-500 hover:text-black transition-colors"
            >
              Complete
            </Link>
          )}
        </div>
      </div>
    </div>
  );
};

export default ModNav;
