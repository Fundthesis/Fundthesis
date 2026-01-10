'use client';

import React, { useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { SimpleStockSimulator } from '@/components/enviro/SimpleStockSimulator';
import { useSandbox, useDeleteSandbox } from '@/lib/hooks/useSandboxes';
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

function PortfolioDashboardPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');

  const sandboxId = searchParams?.get('sandboxId');
  const { data: sandbox, isLoading } = useSandbox(sandboxId);
  const deleteSandbox = useDeleteSandbox();

  const handleDeleteClick = () => {
    setDeleteConfirmText('');
    setShowDeleteConfirm(true);
  };

  const handleDeleteConfirm = async () => {
    if (deleteConfirmText.trim().toLowerCase() === 'delete' && sandboxId) {
      try {
        await deleteSandbox.mutateAsync(sandboxId);
        setShowDeleteConfirm(false);
        setDeleteConfirmText('');
        router.push('/enviro');
      } catch (error) {
        console.error('Failed to delete sandbox:', error);
        alert('Failed to delete sandbox');
      }
    }
  };

  if (!sandboxId) {
    router.push('/enviro');
    return null;
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-stone-50 dark:bg-stone-900 flex items-center justify-center">
        <p className="text-gray-500 dark:text-stone-400">Loading sandbox...</p>
      </div>
    );
  }

  if (!sandbox) {
    return (
      <div className="min-h-screen bg-stone-50 dark:bg-stone-900 flex items-center justify-center">
        <p className="text-red-500 dark:text-red-400">Sandbox not found</p>
      </div>
    );
  }

  return (
    <>
      <SimpleStockSimulator
        sandboxId={sandbox.id}
        initialBalance={sandbox.balance}
        sandboxName={sandbox.name}
        onDeleteSandbox={handleDeleteClick}
      />

      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Deletion</AlertDialogTitle>
            <AlertDialogDescription>
              To permanently delete the sandbox &ldquo;{sandbox.name}&rdquo;, type{' '}
                <span className="font-mono font-bold">delete</span> below.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <Input
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                placeholder="Type 'delete' to confirm"
              className="w-full"
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeleteConfirmText('')}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              disabled={
                deleteConfirmText.trim().toLowerCase() !== 'delete' ||
                deleteSandbox.isPending
              }
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

export default function PortfolioDashboardPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-stone-50 dark:bg-stone-900 flex items-center justify-center">
          <p className="text-gray-500 dark:text-stone-400">Loading...</p>
        </div>
      }
    >
      <PortfolioDashboardPageContent />
    </Suspense>
  );
}
