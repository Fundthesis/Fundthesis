import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

// Types
export interface ConversationMessage {
  id: string;
  role: 'user' | 'coach';
  content: string;
  citations?: string[] | null;
  sources?: ArticleSource[] | null;
  createdAt: string;
}

export interface ArticleSource {
  id?: string;
  headline: string;
  source: string;
  url?: string;
  publishedAt?: string;
  snippet?: string;
  score?: number;
  tickers?: string;
  sentiment?: string;
  sourceType?: 'article' | 'module';
  moduleNumber?: number;
  sectionHeading?: string;
  chunkType?: string;
}

export interface Conversation {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  messageCount: number;
}

export interface ConversationWithMessages extends Omit<Conversation, 'messageCount'> {
  messages: ConversationMessage[];
}

// Fetch all conversations
export function useConversations() {
  return useQuery<{ conversations: Conversation[] }>({
    queryKey: ['conversations'],
    queryFn: async () => {
      const response = await fetch('/api/conversations');
      if (!response.ok) {
        throw new Error('Failed to fetch conversations');
      }
      return response.json();
    },
    staleTime: 30 * 1000, // 30 seconds
  });
}

// Fetch single conversation with messages
export function useConversation(conversationId: string | null) {
  return useQuery<{ conversation: ConversationWithMessages }>({
    queryKey: ['conversation', conversationId],
    queryFn: async () => {
      if (!conversationId) {
        throw new Error('Conversation ID is required');
      }
      const response = await fetch(`/api/conversations/${conversationId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch conversation');
      }
      return response.json();
    },
    enabled: !!conversationId,
    staleTime: 10 * 1000, // 10 seconds
  });
}

// Create new conversation
export function useCreateConversation() {
  const queryClient = useQueryClient();

  return useMutation<{ conversation: Conversation }, Error, string | undefined>({
    mutationFn: async (title?: string) => {
      const response = await fetch('/api/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title }),
      });
      if (!response.ok) {
        throw new Error('Failed to create conversation');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    },
  });
}

// Send message to conversation
export function useSendMessage(conversationId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (content: string) => {
      const response = await fetch(`/api/conversations/${conversationId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      });
      if (!response.ok) {
        throw new Error('Failed to send message');
      }
      return response.json();
    },
    onSuccess: () => {
      // Invalidate both the specific conversation and the list
      queryClient.invalidateQueries({ queryKey: ['conversation', conversationId] });
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    },
  });
}

// Rename conversation
export function useRenameConversation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, title }: { id: string; title: string }) => {
      const response = await fetch(`/api/conversations/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title }),
      });
      if (!response.ok) {
        throw new Error('Failed to rename conversation');
      }
      return response.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      queryClient.invalidateQueries({ queryKey: ['conversation', variables.id] });
    },
  });
}

// Delete conversation
export function useDeleteConversation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/conversations/${id}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        throw new Error('Failed to delete conversation');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    },
  });
}

// Generate title for conversation
export function useGenerateTitle() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (conversationId: string) => {
      const response = await fetch(`/api/conversations/${conversationId}/title`, {
        method: 'POST',
      });
      if (!response.ok) {
        throw new Error('Failed to generate title');
      }
      return response.json();
    },
    onSuccess: (_, conversationId) => {
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      queryClient.invalidateQueries({ queryKey: ['conversation', conversationId] });
    },
  });
}
