"use client";

import React, { useState, useRef, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import ReactMarkdown from "react-markdown";
import { useAuth } from "@/providers/AuthProvider";
import { ArticleReferenceCard } from "@/components/shared";
import {
  useConversations,
  useConversation,
  useCreateConversation,
  useRenameConversation,
  useDeleteConversation,
  useGenerateTitle,
  type ConversationMessage,
} from "@/lib/hooks/useConversations";
import {
  Plus,
  MessageSquare,
  MoreHorizontal,
  Pencil,
  Trash2,
  Menu,
  X,
  Send,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useQueryClient } from "@tanstack/react-query";

function MentorPageContent() {
  const { user, isLoading: isAuthLoading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const conversationId = searchParams.get("c");
  const queryClient = useQueryClient();

  // Sidebar state
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Dialog states
  const [renameDialogOpen, setRenameDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedConversation, setSelectedConversation] = useState<{
    id: string;
    title: string;
  } | null>(null);
  const [newTitle, setNewTitle] = useState("");

  // Chat state
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [optimisticMessages, setOptimisticMessages] = useState<
    ConversationMessage[]
  >([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Queries and mutations
  const { data: conversationsData, isLoading: loadingConversations } =
    useConversations();
  const { data: conversationData, isLoading: loadingConversation } =
    useConversation(conversationId);
  const createConversation = useCreateConversation();
  const renameConversation = useRenameConversation();
  const deleteConversation = useDeleteConversation();
  const generateTitle = useGenerateTitle();

  const conversations = conversationsData?.conversations || [];
  const currentConversation = conversationData?.conversation;
  const messages = currentConversation?.messages || [];

  // Combine real messages with optimistic ones
  const displayMessages = [...messages, ...optimisticMessages];

  useEffect(() => {
    if (!isAuthLoading && !user) {
      router.replace("/auth");
    }
  }, [isAuthLoading, user, router]);

  // Clear optimistic messages when real messages update
  useEffect(() => {
    if (messages.length > 0) {
      setOptimisticMessages([]);
    }
  }, [messages.length]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [displayMessages.length]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height =
        Math.min(textareaRef.current.scrollHeight, 200) + "px";
    }
  }, [input]);

  const handleNewChat = async () => {
    try {
      const result = await createConversation.mutateAsync(undefined);
      router.push(`/mentor?c=${result.conversation.id}`);
      setSidebarOpen(false);
    } catch (error) {
      console.error("Failed to create conversation:", error);
    }
  };

  const handleSelectConversation = (id: string) => {
    router.push(`/mentor?c=${id}`);
    setSidebarOpen(false);
  };

  const handleSendMessage = async () => {
    if (!input.trim() || isTyping) return;

    let targetConversationId = conversationId;

    // Create conversation if none selected
    if (!targetConversationId) {
      try {
        const result = await createConversation.mutateAsync(undefined);
        targetConversationId = result.conversation.id;
        router.push(`/mentor?c=${targetConversationId}`);
      } catch (error) {
        console.error("Failed to create conversation:", error);
        return;
      }
    }

    const userContent = input.trim();
    setInput("");
    setIsTyping(true);

    // Add optimistic user message
    const optimisticUserMessage: ConversationMessage = {
      id: `optimistic-user-${Date.now()}`,
      role: "user",
      content: userContent,
      createdAt: new Date().toISOString(),
    };
    setOptimisticMessages([optimisticUserMessage]);

    try {
      const response = await fetch(
        `/api/conversations/${targetConversationId}/messages`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content: userContent }),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to send message");
      }

      // Generate title after first message
      if (messages.length === 0) {
        generateTitle.mutate(targetConversationId);
      }

      // Invalidate queries to refetch data
      queryClient.invalidateQueries({
        queryKey: ["conversation", targetConversationId],
      });
      queryClient.invalidateQueries({ queryKey: ["conversations"] });

      // Clear optimistic messages
      setOptimisticMessages([]);
    } catch (error) {
      console.error("Failed to send message:", error);
      setOptimisticMessages([]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleRename = () => {
    if (!selectedConversation || !newTitle.trim()) return;
    renameConversation.mutate(
      { id: selectedConversation.id, title: newTitle.trim() },
      {
        onSuccess: () => {
          setRenameDialogOpen(false);
          setSelectedConversation(null);
          setNewTitle("");
        },
      }
    );
  };

  const handleDelete = () => {
    if (!selectedConversation) return;
    deleteConversation.mutate(selectedConversation.id, {
      onSuccess: () => {
        setDeleteDialogOpen(false);
        setSelectedConversation(null);
        if (conversationId === selectedConversation.id) {
          router.push("/mentor");
        }
      },
    });
  };

  const openRenameDialog = (conv: { id: string; title: string }) => {
    setSelectedConversation(conv);
    setNewTitle(conv.title);
    setRenameDialogOpen(true);
  };

  const openDeleteDialog = (conv: { id: string; title: string }) => {
    setSelectedConversation(conv);
    setDeleteDialogOpen(true);
  };

  const suggestedTopics = [
    "Explain diversification in simple terms",
    "How do interest rate changes affect stocks?",
    "What distinguishes value investing from growth?",
    "How should one approach market volatility?",
  ];

  // Get today's date
  const today = new Date();
  const dateString = today.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const formatRelativeTime = (date: string) => {
    const now = new Date();
    const then = new Date(date);
    const diffMs = now.getTime() - then.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return then.toLocaleDateString();
  };

  return (
    <div className="fixed inset-0 z-40 bg-stone-50 dark:bg-stone-900 flex overflow-hidden pt-24">
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed lg:relative inset-y-0 left-0 z-50 w-72 bg-stone-100 dark:bg-stone-800
          border-r border-stone-200 dark:border-stone-700 flex flex-col
          transform transition-transform duration-300 ease-in-out
          ${
            sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
          }
          pt-24 lg:pt-0
        `}
      >
        {/* Sidebar Header */}
        <div className="p-4 border-b border-stone-200 dark:border-stone-700">
          <button
            onClick={handleNewChat}
            disabled={createConversation.isPending}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-black dark:bg-stone-700 text-white font-serif text-sm uppercase tracking-wider hover:bg-stone-800 dark:hover:bg-stone-600 transition-colors disabled:opacity-50"
          >
            <Plus className="w-4 h-4" />
            New Chat
          </button>
        </div>

        {/* Conversation List */}
        <div className="flex-1 overflow-y-auto p-2">
          {loadingConversations ? (
            <div className="p-4 text-center">
              <div className="w-5 h-5 border-2 border-stone-400 border-t-transparent rounded-full animate-spin mx-auto" />
            </div>
          ) : conversations.length === 0 ? (
            <div className="p-4 text-center text-stone-500 dark:text-stone-400 font-serif text-sm italic">
              No conversations yet
            </div>
          ) : (
            <div className="space-y-1">
              {conversations.map((conv) => (
                <div
                  key={conv.id}
                  className={`
                    group flex items-center gap-2 p-3 rounded cursor-pointer
                    transition-colors
                    ${
                      conv.id === conversationId
                        ? "bg-stone-200 dark:bg-stone-700"
                        : "hover:bg-stone-200/50 dark:hover:bg-stone-700/50"
                    }
                  `}
                  onClick={() => handleSelectConversation(conv.id)}
                >
                  <MessageSquare className="w-4 h-4 text-stone-400 dark:text-stone-500 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-stone-800 dark:text-stone-200 truncate">
                      {conv.title}
                    </p>
                    <p className="text-xs text-stone-500 dark:text-stone-400">
                      {formatRelativeTime(conv.updatedAt)}
                    </p>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button
                        className="opacity-0 group-hover:opacity-100 p-1 hover:bg-stone-300 dark:hover:bg-stone-600 rounded transition-opacity"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <MoreHorizontal className="w-4 h-4 text-stone-500 dark:text-stone-400" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={(e) => {
                          e.stopPropagation();
                          openRenameDialog(conv);
                        }}
                      >
                        <Pencil className="w-4 h-4 mr-2" />
                        Rename
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        variant="destructive"
                        onClick={(e) => {
                          e.stopPropagation();
                          openDeleteDialog(conv);
                        }}
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Mobile Close Button */}
        <button
          className="absolute top-28 right-4 p-2 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        >
          <X className="w-5 h-5 text-stone-500" />
        </button>
      </aside>

      {/* Main Chat Area */}
      <main className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        {/* Header */}
        <header className="shrink-0 border-b border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 px-4 py-3">
          <div className="flex items-center gap-4">
            <button
              className="lg:hidden p-2 -ml-2 hover:bg-stone-100 dark:hover:bg-stone-700 rounded"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu className="w-5 h-5 text-stone-600 dark:text-stone-300" />
            </button>
            <div className="flex-1 text-center lg:text-left">
              <h1 className="font-serif text-xl font-bold text-black dark:text-white">
                The Editor&apos;s Desk
              </h1>
              <p className="text-xs text-stone-500 dark:text-stone-400 tracking-widest uppercase">
                {dateString}
              </p>
            </div>
          </div>
        </header>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-3xl mx-auto px-4 py-6">
            {/* Welcome State (no conversation or empty) */}
            {!conversationId && displayMessages.length === 0 && (
              <div className="text-center py-12">
                <h2 className="font-serif text-2xl font-bold text-black dark:text-white mb-2">
                  Welcome to The Editor&apos;s Desk
                </h2>
                <p className="font-serif text-stone-600 dark:text-stone-400 mb-8 max-w-md mx-auto">
                  A Socratic dialogue on markets & money. Ask me anything about
                  investing, and I&apos;ll guide you to discover the answers
                  yourself.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-xl mx-auto">
                  {suggestedTopics.map((topic, i) => (
                    <button
                      key={i}
                      onClick={() => setInput(topic)}
                      className="text-left p-4 border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 hover:border-stone-400 dark:hover:border-stone-500 transition-colors"
                    >
                      <p className="font-serif text-sm text-stone-700 dark:text-stone-300">
                        {topic}
                      </p>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Loading Conversation */}
            {conversationId && loadingConversation && (
              <div className="py-12 text-center">
                <div className="w-6 h-6 border-2 border-stone-400 border-t-transparent rounded-full animate-spin mx-auto" />
              </div>
            )}

            {/* Messages */}
            {displayMessages.length > 0 && (
              <div className="space-y-6">
                {displayMessages.map((msg, i) => (
                  <div
                    key={msg.id || i}
                    className={msg.role === "user" ? "text-right" : ""}
                  >
                    {msg.role === "coach" && (
                      <p className="text-xs uppercase tracking-widest text-stone-400 mb-2">
                        The Editor
                      </p>
                    )}
                    {msg.role === "user" && (
                      <p className="text-xs uppercase tracking-widest text-stone-400 mb-2">
                        Your Inquiry
                      </p>
                    )}
                    <div
                      className={`inline-block max-w-[85%] ${
                        msg.role === "user"
                          ? "bg-stone-100 dark:bg-stone-700 text-stone-800 dark:text-stone-100"
                          : "bg-white dark:bg-stone-800 border-l-2 border-stone-300 dark:border-stone-600 pl-4"
                      } py-3 px-4`}
                    >
                      {msg.role === "coach" ? (
                        <div className="font-serif text-base leading-relaxed dark:text-stone-100 prose prose-sm max-w-none prose-stone dark:prose-invert">
                          <ReactMarkdown
                            components={{
                              p: ({ children }) => (
                                <p className="mb-3 leading-relaxed">
                                  {children}
                                </p>
                              ),
                              strong: ({ children }) => (
                                <strong className="font-semibold text-stone-900 dark:text-stone-100">
                                  {children}
                                </strong>
                              ),
                              em: ({ children }) => (
                                <em className="italic">{children}</em>
                              ),
                              ul: ({ children }) => (
                                <ul className="list-disc list-outside mb-3 space-y-1 ml-6">
                                  {children}
                                </ul>
                              ),
                              ol: ({ children }) => (
                                <ol className="list-decimal list-outside mb-3 space-y-1 ml-6">
                                  {children}
                                </ol>
                              ),
                              li: ({ children }) => (
                                <li className="pl-2">{children}</li>
                              ),
                              h1: ({ children }) => (
                                <h1 className="text-xl font-bold mb-2 mt-4 text-stone-900 dark:text-stone-100">
                                  {children}
                                </h1>
                              ),
                              h2: ({ children }) => (
                                <h2 className="text-lg font-semibold mb-2 mt-3 text-stone-900 dark:text-stone-100">
                                  {children}
                                </h2>
                              ),
                              h3: ({ children }) => (
                                <h3 className="text-base font-semibold mb-2 mt-2 text-stone-900 dark:text-stone-100">
                                  {children}
                                </h3>
                              ),
                              code: ({ children }) => (
                                <code className="bg-stone-100 dark:bg-stone-700 px-1.5 py-0.5 rounded text-sm font-mono text-stone-800 dark:text-stone-200">
                                  {children}
                                </code>
                              ),
                              pre: ({ children }) => (
                                <pre className="bg-stone-100 dark:bg-stone-700 p-3 rounded mb-3 overflow-x-auto text-sm font-mono text-stone-800 dark:text-stone-200">
                                  {children}
                                </pre>
                              ),
                              blockquote: ({ children }) => (
                                <blockquote className="border-l-4 border-stone-300 dark:border-stone-600 pl-4 italic my-3 text-stone-700 dark:text-stone-300">
                                  {children}
                                </blockquote>
                              ),
                              a: ({ children, href }) => (
                                <a
                                  href={href}
                                  className="text-stone-700 dark:text-stone-300 underline hover:text-stone-900 dark:hover:text-stone-100"
                                  target="_blank"
                                  rel="noopener noreferrer"
                                >
                                  {children}
                                </a>
                              ),
                            }}
                          >
                            {msg.content}
                          </ReactMarkdown>
                        </div>
                      ) : (
                        <p className="font-serif text-base leading-relaxed whitespace-pre-wrap dark:text-stone-100">
                          {msg.content}
                        </p>
                      )}

                      {/* Reference Material */}
                      {msg.sources && msg.sources.length > 0 && (
                        <div className="mt-3 pt-2 border-t border-stone-200 dark:border-stone-600">
                          <p className="text-xs uppercase tracking-widest text-stone-400 mb-2">
                            Reference Material
                          </p>
                          <div className="space-y-1.5">
                            {msg.sources.map((source, si) => (
                              <ArticleReferenceCard
                                key={source.id || si}
                                article={source}
                              />
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Citations fallback */}
                      {(!msg.sources || msg.sources.length === 0) &&
                        msg.citations &&
                        msg.citations.length > 0 && (
                          <div className="mt-3 pt-2 border-t border-stone-200 dark:border-stone-600">
                            <p className="text-xs uppercase tracking-widest text-stone-400 mb-2">
                              Reference Material
                            </p>
                            <div className="flex flex-wrap gap-2">
                              {msg.citations.map((citation, ci) => (
                                <span
                                  key={ci}
                                  className="text-xs text-stone-600 dark:text-stone-300 bg-stone-50 dark:bg-stone-700 px-2 py-1 rounded"
                                >
                                  {citation}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                    </div>
                  </div>
                ))}

                {/* Typing Indicator */}
                {isTyping && (
                  <div>
                    <p className="text-xs uppercase tracking-widest text-stone-400 mb-2">
                      The Editor
                    </p>
                    <div className="inline-block border-l-2 border-stone-300 dark:border-stone-600 pl-4 py-3">
                      <div className="flex items-center gap-1">
                        <span className="w-2 h-2 bg-stone-400 rounded-full animate-bounce" />
                        <span
                          className="w-2 h-2 bg-stone-400 rounded-full animate-bounce"
                          style={{ animationDelay: "0.1s" }}
                        />
                        <span
                          className="w-2 h-2 bg-stone-400 rounded-full animate-bounce"
                          style={{ animationDelay: "0.2s" }}
                        />
                      </div>
                    </div>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>
            )}
          </div>
        </div>

        {/* Input Area */}
        <div className="shrink-0 border-t border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 p-4">
          <div className="max-w-3xl mx-auto">
            <div className="flex items-end gap-3">
              <div className="flex-1 relative">
                <textarea
                  ref={textareaRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask me anything about investing..."
                  rows={1}
                  className="w-full border border-stone-300 dark:border-stone-600 bg-white dark:bg-stone-900 dark:text-stone-100 px-4 py-3 pr-12 font-serif text-base focus:outline-none focus:border-stone-400 dark:focus:border-stone-500 resize-none rounded-none"
                  style={{ minHeight: "48px", maxHeight: "200px" }}
                />
              </div>
              <Button
                onClick={handleSendMessage}
                disabled={!input.trim() || isTyping}
                className="h-12 px-4 bg-black dark:bg-stone-700 hover:bg-stone-800 dark:hover:bg-stone-600 rounded-none"
              >
                <Send className="w-5 h-5" />
              </Button>
            </div>
            <p className="text-xs text-stone-400 mt-2 text-center font-serif italic">
              Guidance through inquiry, not answers delivered.
            </p>
          </div>
        </div>
      </main>

      {/* Rename Dialog */}
      <Dialog open={renameDialogOpen} onOpenChange={setRenameDialogOpen}>
        <DialogContent className="bg-white dark:bg-stone-800">
          <DialogHeader>
            <DialogTitle className="font-serif">
              Rename Conversation
            </DialogTitle>
          </DialogHeader>
          <input
            type="text"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            className="w-full border border-stone-300 dark:border-stone-600 bg-white dark:bg-stone-900 dark:text-stone-100 px-4 py-2 font-serif focus:outline-none focus:border-stone-400"
            placeholder="Enter new title..."
            onKeyDown={(e) => e.key === "Enter" && handleRename()}
          />
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setRenameDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleRename}
              disabled={!newTitle.trim() || renameConversation.isPending}
            >
              {renameConversation.isPending ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="bg-white dark:bg-stone-800">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-serif">
              Delete Conversation
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;
              {selectedConversation?.title}
              &quot;? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              {deleteConversation.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default function MentorPage() {
  return (
    <Suspense
      fallback={
        <div className="h-screen bg-stone-50 dark:bg-stone-900 flex items-center justify-center -mt-24 pt-24">
          <div className="w-8 h-8 border-2 border-stone-400 border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <MentorPageContent />
    </Suspense>
  );
}
