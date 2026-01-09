"use client";

import React, { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import ReactMarkdown from "react-markdown";
import { useAuth } from "@/providers/AuthProvider";
import { getCoachResponse, CoachMessage, CoachResponse } from "@/lib/aiCoach";
import { ArticleReferenceCard } from "@/components/shared";

export default function MentorPage() {
  const { user, isLoading: isAuthLoading } = useAuth();
  const router = useRouter();
  const [messages, setMessages] = useState<CoachMessage[]>([
    {
      role: "coach",
      content:
        "Welcome to The Editor's Desk. I'm here to discuss investment concepts and help you think through market dynamics. What's on your mind today?",
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [lastResponse, setLastResponse] = useState<CoachResponse | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!isAuthLoading && !user) {
      router.replace("/auth");
    }
  }, [isAuthLoading, user, router]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim() || isTyping) return;

    const userMessage: CoachMessage = {
      role: "user",
      content: input.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsTyping(true);

    try {
      const response = await getCoachResponse(
        userMessage.content,
        {},
        messages
      );
      setLastResponse(response);

      const coachMessage: CoachMessage = {
        role: "coach",
        content: response.message,
        timestamp: new Date(),
        citations: response.citations,
        sources: response.sources,
      };

      setMessages((prev) => [...prev, coachMessage]);
    } catch (e) {
      console.error("Failed to get response", e);
      setMessages((prev) => [
        ...prev,
        {
          role: "coach",
          content:
            "I apologize, but I'm having trouble connecting at the moment. Please try again shortly.",
          timestamp: new Date(),
        },
      ]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
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

  return (
    <div className="h-screen bg-stone-50 dark:bg-stone-900 flex flex-col overflow-hidden -mt-24 pt-24">
      <main className="flex-1 max-w-4xl w-full mx-auto px-4 py-4 flex flex-col min-h-0 overflow-hidden">
        {/* Masthead */}
        <header className="text-center border-b-2 border-black dark:border-stone-600 pb-4 mb-4 shrink-0">
          <p className="text-xs tracking-widest text-stone-500 dark:text-stone-400 uppercase mb-1">
            {dateString}
          </p>
          <h1 className="font-serif text-4xl font-black tracking-tight text-black dark:text-white">
            The Editor&apos;s Desk
          </h1>
          <p className="text-sm font-serif italic text-stone-500 dark:text-stone-400 mt-1">
            A Socratic Dialogue on Markets & Money
          </p>
        </header>

        {/* Conversation Container */}
        <div className="flex-1 border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 flex flex-col min-h-0">
          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-6 scroll-smooth">
            <div className="max-w-2xl mx-auto space-y-6">
              {messages.map((msg, i) => (
                <div
                  key={i}
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
                              <p className="mb-3 leading-relaxed">{children}</p>
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

                    {/* Reference Material - Article Sources or Citations */}
                    {(msg.sources && msg.sources.length > 0) ||
                    (msg.citations && msg.citations.length > 0) ? (
                      <div className="mt-3 pt-2 border-t border-stone-200 dark:border-stone-600">
                        <p className="text-xs uppercase tracking-widest text-stone-400 mb-2">
                          Reference Material
                        </p>
                        {/* Article Sources - Compact Expandable Cards */}
                        {msg.sources && msg.sources.length > 0 ? (
                          <div className="space-y-1.5">
                            {msg.sources.map((source, si) => (
                              <ArticleReferenceCard
                                key={source.id || si}
                                article={source}
                              />
                            ))}
                          </div>
                        ) : (
                          /* Fallback to Citations (Module References) */
                          <div className="flex flex-wrap gap-2">
                            {msg.citations?.map((citation, ci) => (
                              <span
                                key={ci}
                                className="text-xs text-stone-600 dark:text-stone-300 bg-stone-50 dark:bg-stone-700 px-2 py-1 rounded"
                              >
                                {citation}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    ) : null}
                  </div>
                </div>
              ))}

              {isTyping && (
                <div>
                  <p className="text-xs uppercase tracking-widest text-stone-400 mb-2">
                    The Editor
                  </p>
                  <div className="inline-block border-l-2 border-stone-300 dark:border-stone-600 pl-4 py-3">
                    <p className="font-serif text-stone-400 italic">
                      Composing response...
                    </p>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>
          </div>

          {/* Suggested Actions */}
          {lastResponse?.suggestedActions &&
            lastResponse.suggestedActions.length > 0 && (
              <div className="px-6 py-3 bg-stone-50 dark:bg-stone-900 border-t border-stone-200 dark:border-stone-700 shrink-0">
                <p className="text-xs uppercase tracking-widest text-stone-500 dark:text-stone-400 mb-2">
                  Suggested Next Steps
                </p>
                <div className="flex flex-wrap gap-2">
                  {lastResponse.suggestedActions.map((action, i) => (
                    <span
                      key={i}
                      className="text-xs text-stone-600 dark:text-stone-300 border border-stone-300 dark:border-stone-600 px-3 py-1"
                    >
                      {action}
                    </span>
                  ))}
                </div>
              </div>
            )}

          {/* Suggested Topics (only if few messages) */}
          {messages.length <= 2 && (
            <div className="px-6 py-4 bg-stone-50 dark:bg-stone-900 border-t border-stone-200 dark:border-stone-700 shrink-0">
              <p className="text-xs uppercase tracking-widest text-stone-500 dark:text-stone-400 mb-3">
                Topics to Explore
              </p>
              <div className="flex flex-wrap gap-2">
                {suggestedTopics.map((topic, i) => (
                  <button
                    key={i}
                    onClick={() => setInput(topic)}
                    className="text-sm font-serif text-stone-700 dark:text-stone-200 border border-stone-300 dark:border-stone-600 px-3 py-2 hover:bg-white dark:hover:bg-stone-700 hover:border-stone-400 dark:hover:border-stone-500 transition-colors"
                  >
                    {topic}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Input Area */}
          <div className="p-4 border-t border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 shrink-0">
            <div className="max-w-2xl mx-auto">
              <div className="flex items-end gap-3">
                <div className="flex-1">
                  <label className="text-xs uppercase tracking-widest text-stone-400 block mb-2">
                    Your Question
                  </label>
                  <textarea
                    ref={textareaRef}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Type your question here..."
                    rows={2}
                    className="w-full border border-stone-300 dark:border-stone-600 bg-white dark:bg-stone-900 dark:text-stone-100 px-4 py-3 font-serif text-base focus:outline-none focus:border-stone-400 dark:focus:border-stone-500 resize-none"
                  />
                </div>
                <button
                  onClick={sendMessage}
                  disabled={!input.trim() || isTyping}
                  className={`px-6 py-3 text-sm uppercase tracking-widest font-medium transition-colors ${
                    input.trim() && !isTyping
                      ? "bg-black dark:bg-green-600 text-white hover:bg-stone-800 dark:hover:bg-green-700"
                      : "bg-stone-200 dark:bg-stone-700 text-stone-400 cursor-not-allowed"
                  }`}
                >
                  Submit
                </button>
              </div>
              <p className="text-xs text-stone-400 mt-3 text-center font-serif italic">
                Guidance through inquiry, not answers delivered.
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
