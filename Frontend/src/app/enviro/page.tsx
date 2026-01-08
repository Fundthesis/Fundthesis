'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

type Difficulty = 'easy' | 'medium' | 'hard';

type Sandbox = {
  id: string;
  name: string;
  difficulty: Difficulty;
  balance: number;
  createdAt: string;
};

const DIFFICULTY_BALANCE: Record<Difficulty, number> = {
  easy: 100000,
  medium: 50000,
  hard: 10000,
};

const DIFFICULTY_LABELS: Record<Difficulty, string> = {
  easy: 'Standard Edition',
  medium: 'Limited Funds',
  hard: 'Challenge Mode',
};

const STORAGE_KEY = 'enviro_sandboxes';

export default function EnviroPage() {
  const router = useRouter();

  const [sandboxes, setSandboxes] = useState<Sandbox[]>([]);
  const [name, setName] = useState('');
  const [difficulty, setDifficulty] = useState<Difficulty>('easy');

  const [showDeleteConfirm, setShowDeleteConfirm] = useState<boolean>(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState<string>('');
  const [selectedToDelete, setSelectedToDelete] = useState<Sandbox | null>(null);

  // Get today's date
  const today = new Date();
  const dateString = today.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        setSandboxes(JSON.parse(raw));
      } else {
        const defaultSandbox: Sandbox = {
          id: 'default-' + Date.now(),
          name: 'Practice Edition',
          difficulty: 'easy',
          balance: DIFFICULTY_BALANCE.easy,
          createdAt: new Date().toISOString(),
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify([defaultSandbox]));
        setSandboxes([defaultSandbox]);
      }
    } catch (e) {
      console.error('Failed to read sandboxes from localStorage', e);
    }
  }, []);

  const save = (items: Sandbox[]) => {
    setSandboxes(items);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  };

  const createSandbox = () => {
    const id = Date.now().toString();
    const balance = DIFFICULTY_BALANCE[difficulty];
    const sb: Sandbox = {
      id,
      name: name || `Edition ${new Date().toLocaleDateString()}`,
      difficulty,
      balance,
      createdAt: new Date().toISOString(),
    };
    const next = [sb, ...sandboxes];
    save(next);
    setName('');
    setDifficulty('easy');
    router.push(`/enviro/enviro-dashboard?sandboxId=${encodeURIComponent(id)}`);
  };

  const openSandbox = (id: string) => {
    router.push(`/enviro/enviro-dashboard?sandboxId=${encodeURIComponent(id)}`);
  };

  const promptDeleteSandbox = (id: string) => {
    const found = sandboxes.find((s) => s.id === id) || null;
    setSelectedToDelete(found);
    setDeleteConfirmText('');
    setShowDeleteConfirm(true);
  };

  const confirmDeleteSandbox = () => {
    if (!selectedToDelete) return;
    const filtered = sandboxes.filter((s) => s.id !== selectedToDelete.id);
    save(filtered);
    try {
      const portRaw = localStorage.getItem('enviro_sandbox_portfolios');
      if (portRaw) {
        const map = JSON.parse(portRaw);
        delete map[selectedToDelete.id];
        localStorage.setItem('enviro_sandbox_portfolios', JSON.stringify(map));
      }
    } catch (e) {
      console.warn('failed to remove sandbox portfolio', e);
    }

    setShowDeleteConfirm(false);
    setSelectedToDelete(null);
    setDeleteConfirmText('');
  };

  return (
    <div className="min-h-screen bg-stone-50 dark:bg-stone-900">
      <main className="max-w-4xl mx-auto px-4 py-8">
        {/* Masthead */}
        <header className="text-center border-b-4 border-double border-black dark:border-stone-600 pb-4 mb-8">
          <p className="text-xs tracking-widest text-stone-500 dark:text-stone-400 uppercase mb-2">
            {dateString}
          </p>
          <h1 className="font-serif text-5xl font-black tracking-tight text-black dark:text-white">
            The Trading Floor
          </h1>
          <p className="text-sm font-serif italic text-stone-600 dark:text-stone-400 mt-2">
            &ldquo;Practice Without Consequence&rdquo;
          </p>
        </header>

        {/* New Edition Form */}
        <section className="border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 p-6 mb-8">
          <h2 className="text-xs uppercase tracking-widest text-stone-500 dark:text-stone-400 mb-4 border-b border-stone-200 dark:border-stone-700 pb-2">
            Start New Edition
          </h2>
          <div className="grid md:grid-cols-3 gap-4">
            <div>
              <label className="text-xs uppercase tracking-widest text-stone-400 block mb-2">
                Edition Name
              </label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Optional title"
                className="w-full border border-stone-300 dark:border-stone-600 bg-white dark:bg-stone-900 dark:text-stone-100 px-3 py-2 font-serif focus:outline-none focus:border-stone-400 dark:focus:border-stone-500"
              />
            </div>
            <div>
              <label className="text-xs uppercase tracking-widest text-stone-400 block mb-2">
                Difficulty
              </label>
              <select
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value as Difficulty)}
                className="w-full border border-stone-300 dark:border-stone-600 bg-white dark:bg-stone-900 dark:text-stone-100 px-3 py-2 font-serif focus:outline-none focus:border-stone-400 dark:focus:border-stone-500"
              >
                <option value="easy">
                  {DIFFICULTY_LABELS.easy} (${DIFFICULTY_BALANCE.easy.toLocaleString()})
                </option>
                <option value="medium">
                  {DIFFICULTY_LABELS.medium} (${DIFFICULTY_BALANCE.medium.toLocaleString()})
                </option>
                <option value="hard">
                  {DIFFICULTY_LABELS.hard} (${DIFFICULTY_BALANCE.hard.toLocaleString()})
                </option>
              </select>
            </div>
            <div className="flex items-end">
              <button
                onClick={createSandbox}
                className="w-full bg-black dark:bg-green-600 text-white py-2 text-sm uppercase tracking-widest font-medium hover:bg-stone-800 dark:hover:bg-green-700 transition-colors"
              >
                Create & Open
              </button>
            </div>
          </div>
        </section>

        {/* Existing Editions */}
        <section className="border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800">
          <div className="p-4 border-b border-stone-200 dark:border-stone-700">
            <h2 className="text-xs uppercase tracking-widest text-stone-500 dark:text-stone-400">
              Your Editions
            </h2>
          </div>
          <div className="divide-y divide-stone-100 dark:divide-stone-700">
            {sandboxes.length === 0 && (
              <p className="p-6 text-center font-serif text-stone-500 dark:text-stone-400 italic">
                No editions created yet.
              </p>
            )}
            {sandboxes.map((sb) => (
              <div
                key={sb.id}
                className="flex items-center justify-between p-4 hover:bg-stone-50 dark:hover:bg-stone-700 transition-colors"
              >
                <div>
                  <h3 className="font-serif font-bold text-black dark:text-white">{sb.name}</h3>
                  <p className="text-xs text-stone-500 dark:text-stone-400">
                    {DIFFICULTY_LABELS[sb.difficulty]} — ${sb.balance.toLocaleString()} starting capital
                  </p>
                  <p className="text-xs text-stone-400 mt-1">
                    Created {new Date(sb.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => openSandbox(sb.id)}
                    className="text-xs uppercase tracking-widest font-medium text-black dark:text-white hover:underline"
                  >
                    Open
                  </button>
                  <button
                    onClick={() => promptDeleteSandbox(sb.id)}
                    className="text-xs uppercase tracking-widest text-stone-400 hover:text-stone-600 dark:hover:text-stone-300"
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black opacity-40 dark:opacity-60"
            onClick={() => {
              setShowDeleteConfirm(false);
              setDeleteConfirmText('');
              setSelectedToDelete(null);
            }}
          />
          <div className="relative bg-white dark:bg-stone-800 p-8 w-full max-w-md z-10 border border-stone-200 dark:border-stone-700">
            <h3 className="font-serif text-xl font-bold text-black dark:text-white mb-2">
              Confirm Removal
            </h3>
            <p className="text-sm text-stone-600 dark:text-stone-400 mb-4">
              To permanently remove the edition &ldquo;{selectedToDelete?.name}&rdquo;,
              type <span className="font-mono font-bold">delete</span> below.
            </p>
            <input
              value={deleteConfirmText}
              onChange={(e) => setDeleteConfirmText(e.target.value)}
              placeholder="Type delete to confirm"
              className="w-full border border-stone-300 dark:border-stone-600 bg-white dark:bg-stone-900 dark:text-stone-100 px-3 py-2 font-serif mb-4 focus:outline-none focus:border-stone-400 dark:focus:border-stone-500"
            />
            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setDeleteConfirmText('');
                  setSelectedToDelete(null);
                }}
                className="px-4 py-2 text-sm text-stone-600 dark:text-stone-300 border border-stone-300 dark:border-stone-600 hover:bg-stone-50 dark:hover:bg-stone-700"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (deleteConfirmText.trim().toLowerCase() === 'delete') {
                    confirmDeleteSandbox();
                  }
                }}
                disabled={deleteConfirmText.trim().toLowerCase() !== 'delete'}
                className={`px-4 py-2 text-sm uppercase tracking-widest ${deleteConfirmText.trim().toLowerCase() === 'delete'
                    ? 'bg-black dark:bg-green-600 text-white hover:bg-stone-800 dark:hover:bg-green-700'
                    : 'bg-stone-200 dark:bg-stone-700 text-stone-400 cursor-not-allowed'
                  }`}
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
