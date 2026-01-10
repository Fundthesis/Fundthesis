'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/providers/AuthProvider';
import { useSandboxes, useCreateSandbox, useDeleteSandbox } from '@/lib/hooks/useSandboxes';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

type Difficulty = 'easy' | 'medium' | 'hard';

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

// Helper to determine difficulty from balance
function getDifficultyFromBalance(balance: number): Difficulty {
  if (balance >= DIFFICULTY_BALANCE.easy) return 'easy';
  if (balance >= DIFFICULTY_BALANCE.medium) return 'medium';
  return 'hard';
}

export default function EnviroPage() {
  const { user, isLoading: isAuthLoading } = useAuth();
  const router = useRouter();
  const { data: sandboxes = [], isLoading: isLoadingSandboxes } = useSandboxes();
  const createSandbox = useCreateSandbox();
  const deleteSandbox = useDeleteSandbox();

  const [name, setName] = useState('');
  const [difficulty, setDifficulty] = useState<Difficulty>('easy');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [selectedToDelete, setSelectedToDelete] = useState<string | null>(null);

  // Get today's date
  const today = new Date();
  const dateString = today.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const handleCreateSandbox = async () => {
    const balance = DIFFICULTY_BALANCE[difficulty];
    const sandboxName = name || `Edition ${new Date().toLocaleDateString()}`;

    try {
      const newSandbox = await createSandbox.mutateAsync({
        name: sandboxName,
        balance,
      });
      setName('');
      setDifficulty('easy');
      router.push(`/enviro/enviro-dashboard?sandboxId=${encodeURIComponent(newSandbox.id)}`);
    } catch (error) {
      console.error('Failed to create sandbox:', error);
      alert('Failed to create sandbox');
    }
  };

  const openSandbox = (id: string) => {
    router.push(`/enviro/enviro-dashboard?sandboxId=${encodeURIComponent(id)}`);
  };

  const promptDeleteSandbox = (id: string) => {
    setSelectedToDelete(id);
    setDeleteConfirmText('');
    setShowDeleteConfirm(true);
  };

  const confirmDeleteSandbox = async () => {
    if (deleteConfirmText.trim().toLowerCase() === 'delete' && selectedToDelete) {
      try {
        await deleteSandbox.mutateAsync(selectedToDelete);
        setShowDeleteConfirm(false);
        setDeleteConfirmText('');
        setSelectedToDelete(null);
      } catch (error) {
        console.error('Failed to delete sandbox:', error);
        alert('Failed to delete sandbox');
      }
    }
  };

  const selectedSandbox = selectedToDelete
    ? sandboxes.find((s) => s.id === selectedToDelete)
    : null;

  if (isAuthLoading) {
    return (
      <div className="min-h-screen bg-stone-50 dark:bg-stone-900 flex items-center justify-center">
        <p className="text-gray-500 dark:text-stone-400">Loading...</p>
      </div>
    );
  }

  if (!user) {
    router.replace('/auth');
    return null;
  }

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
          <p className="text-sm font-serif italic text-stone-600 dark:text-stone-400 mt-2 mb-4">
            &ldquo;Practice Without Consequence&rdquo;
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push('/debrief')}
            className="inline-block"
          >
            Confidential Debrief
          </Button>
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
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Optional title"
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
              <Button
                onClick={handleCreateSandbox}
                disabled={createSandbox.isPending}
                className="w-full"
              >
                {createSandbox.isPending ? 'Creating...' : 'Create & Open'}
              </Button>
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
            {isLoadingSandboxes ? (
              <p className="p-6 text-center font-serif text-stone-500 dark:text-stone-400 italic">
                Loading sandboxes...
              </p>
            ) : sandboxes.length === 0 ? (
              <p className="p-6 text-center font-serif text-stone-500 dark:text-stone-400 italic">
                No editions created yet.
              </p>
            ) : (
              sandboxes.map((sb) => {
                const difficulty = getDifficultyFromBalance(sb.balance);
                return (
                  <div
                    key={sb.id}
                    className="flex items-center justify-between p-4 hover:bg-stone-50 dark:hover:bg-stone-700 transition-colors"
                  >
                    <div>
                      <h3 className="font-serif font-bold text-black dark:text-white">
                        {sb.name}
                      </h3>
                      <p className="text-xs text-stone-500 dark:text-stone-400">
                        {DIFFICULTY_LABELS[difficulty]} — ${sb.balance.toLocaleString()}{' '}
                        starting capital
                      </p>
                      <p className="text-xs text-stone-400 mt-1">
                        Created {new Date(sb.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openSandbox(sb.id)}
                      >
                        Open
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => promptDeleteSandbox(sb.id)}
                      >
                        Remove
                      </Button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </section>
      </main>

      {/* Delete Confirmation Modal */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Removal</AlertDialogTitle>
            <AlertDialogDescription>
              To permanently remove the edition &ldquo;{selectedSandbox?.name}&rdquo;, type{' '}
              <span className="font-mono font-bold">delete</span> below.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <Input
              value={deleteConfirmText}
              onChange={(e) => setDeleteConfirmText(e.target.value)}
              placeholder="Type delete to confirm"
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={() => {
                setShowDeleteConfirm(false);
                setDeleteConfirmText('');
                setSelectedToDelete(null);
              }}
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeleteSandbox}
              disabled={
                deleteConfirmText.trim().toLowerCase() !== 'delete' ||
                deleteSandbox.isPending
              }
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
