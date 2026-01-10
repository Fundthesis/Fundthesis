import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export interface Sandbox {
  id: string;
  name: string;
  balance: number;
  settings?: {
    watchedStocks?: string[];
  };
  createdAt: string;
  positions: Array<{
    id: string;
    ticker: string;
    quantity: number;
    avgPrice: number;
    createdAt?: string;
  }>;
  trades: Array<{
    id: string;
    ticker: string;
    side: string;
    price: number;
    quantity: number;
    executedAt?: string;
  }>;
}

export interface TradeRequest {
  ticker: string;
  side: 'buy' | 'sell';
  price: number;
  quantity: number;
}

export interface TradeResponse {
  id: string;
  ticker: string;
  side: string;
  price: number;
  quantity: number;
  executedAt?: string;
}

/**
 * Hook to fetch all sandboxes for the current user
 */
export function useSandboxes() {
  return useQuery<Sandbox[]>({
    queryKey: ['sandboxes'],
    queryFn: async () => {
      const response = await fetch('/api/sandboxes');
      if (!response.ok) {
        throw new Error('Failed to fetch sandboxes');
      }
      return response.json();
    },
    staleTime: 30 * 1000, // 30 seconds
  });
}

/**
 * Hook to fetch a single sandbox by ID
 */
export function useSandbox(sandboxId: string | null) {
  return useQuery<Sandbox>({
    queryKey: ['sandbox', sandboxId],
    queryFn: async () => {
      if (!sandboxId) {
        throw new Error('Sandbox ID is required');
      }
      const response = await fetch(`/api/sandboxes/${sandboxId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch sandbox');
      }
      return response.json();
    },
    enabled: !!sandboxId,
    staleTime: 10 * 1000, // 10 seconds - more frequent updates for active sandbox
    refetchInterval: 30 * 1000, // Refetch every 30 seconds for real-time updates
  });
}

/**
 * Hook to create a new sandbox
 */
export function useCreateSandbox() {
  const queryClient = useQueryClient();

  return useMutation<Sandbox, Error, { name: string; balance: number }>({
    mutationFn: async ({ name, balance }) => {
      const response = await fetch('/api/sandboxes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, balance }),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create sandbox');
      }
      return response.json();
    },
    onSuccess: () => {
      // Invalidate sandboxes list
      queryClient.invalidateQueries({ queryKey: ['sandboxes'] });
    },
  });
}

/**
 * Hook to update a sandbox
 */
export function useUpdateSandbox() {
  const queryClient = useQueryClient();

  return useMutation<
    Sandbox,
    Error,
    { id: string; name?: string; balance?: number; watchedStocks?: string[] }
  >({
    mutationFn: async ({ id, ...updates }) => {
      const response = await fetch(`/api/sandboxes/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update sandbox');
      }
      return response.json();
    },
    onSuccess: (data) => {
      // Update both the list and the specific sandbox cache
      queryClient.invalidateQueries({ queryKey: ['sandboxes'] });
      queryClient.setQueryData(['sandbox', data.id], data);
    },
  });
}

/**
 * Hook to delete a sandbox
 */
export function useDeleteSandbox() {
  const queryClient = useQueryClient();

  return useMutation<void, Error, string>({
    mutationFn: async (id) => {
      const response = await fetch(`/api/sandboxes/${id}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete sandbox');
      }
    },
    onSuccess: () => {
      // Invalidate sandboxes list
      queryClient.invalidateQueries({ queryKey: ['sandboxes'] });
    },
  });
}

/**
 * Hook to execute a trade
 */
export function useExecuteTrade() {
  const queryClient = useQueryClient();

  return useMutation<TradeResponse, Error, { sandboxId: string; trade: TradeRequest }>({
    mutationFn: async ({ sandboxId, trade }) => {
      const response = await fetch(`/api/sandboxes/${sandboxId}/trades`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(trade),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to execute trade');
      }
      return response.json();
    },
    onSuccess: (_, variables) => {
      // Invalidate the sandbox to refetch updated positions and trades
      queryClient.invalidateQueries({ queryKey: ['sandbox', variables.sandboxId] });
      queryClient.invalidateQueries({ queryKey: ['sandboxes'] });
    },
  });
}

