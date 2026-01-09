import React, { useState, useRef, useEffect } from "react";
import { Send, Bot, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/button";
import { getCoachResponse, type ChatMessage } from "@/lib/aiCoach";
import { ArticleReferenceCard } from "@/components/shared";
import ReactMarkdown from "react-markdown";

export function EditorsDesk({ className }: { className?: string }) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    // Initial greeting from The Editor
    if (messages.length === 0) {
      setMessages([
        {
          role: "coach",
          content:
            "Welcome to The Editor's Desk. I'm here to discuss investment concepts and help you think through market dynamics. What's on your mind today?",
          timestamp: new Date(),
        },
      ]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(
        textareaRef.current.scrollHeight,
        120
      )}px`;
    }
  }, [input]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMsg: ChatMessage = {
      role: "user",
      content: input.trim(),
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMsg]);
    const messageToSend = input.trim();
    setInput("");
    setIsLoading(true);

    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }

    try {
      const response = await getCoachResponse(messageToSend, {}, messages);

      const coachMsg: ChatMessage = {
        role: "coach",
        content: response.message,
        timestamp: new Date(),
        citations: response.citations,
        sources: response.sources,
      };
      setMessages((prev) => [...prev, coachMsg]);
    } catch (error) {
      console.error("Failed to get coach response:", error);
      setMessages((prev) => [
        ...prev,
        {
          role: "coach",
          content:
            "I apologize, but I'm having trouble connecting right now. Let's try again later.",
          timestamp: new Date(),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card
      className={`flex flex-col h-[500px] border-black/10 dark:border-stone-700 shadow-sm bg-white dark:bg-stone-800 ${className}`}
    >
      <CardHeader className="bg-[#fcfbf9] dark:bg-stone-800 border-b border-black/10 dark:border-stone-700 py-3">
        <CardTitle className="font-serif text-xl italic flex items-center text-black dark:text-stone-100">
          <Bot className="w-5 h-5 mr-2" />
          The Editor&apos;s Desk
        </CardTitle>
        <p className="text-xs text-gray-500 dark:text-stone-400 font-serif italic">
          A Socratic Dialogue on Markets & Money
        </p>
      </CardHeader>

      <CardContent className="flex-1 overflow-hidden p-0 bg-white dark:bg-stone-800">
        <div
          className="h-full overflow-y-auto p-4 space-y-4 bg-white dark:bg-stone-800"
          ref={scrollRef}
        >
          {messages.length === 0 && (
            <div className="flex items-center justify-center h-full text-center">
              <div className="text-stone-400 dark:text-stone-500">
                <Bot className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p className="font-serif text-sm italic">
                  Start a conversation with The Editor
                </p>
              </div>
            </div>
          )}
          {messages.map((msg, idx) => (
            <div
              key={idx}
              className={`flex ${
                msg.role === "user" ? "justify-end" : "justify-start"
              }`}
            >
              <div
                className={`max-w-[85%] p-3 rounded-lg text-sm font-serif leading-relaxed ${
                  msg.role === "user"
                    ? "bg-black dark:bg-stone-700 text-white rounded-br-none"
                    : "bg-[#fcfbf9] dark:bg-stone-800 text-gray-800 dark:text-stone-200 border border-black/5 dark:border-stone-700 rounded-bl-none"
                }`}
              >
                {msg.role === "coach" && (
                  <span className="block text-xs font-bold mb-2 opacity-60 uppercase tracking-widest">
                    The Editor
                  </span>
                )}
                {msg.role === "user" && (
                  <span className="block text-xs font-bold mb-2 opacity-60 uppercase tracking-widest text-right">
                    Your Inquiry
                  </span>
                )}
                {msg.role === "coach" ? (
                  <div className="space-y-2">
                    <ReactMarkdown
                      components={{
                        p: ({ children }: { children?: React.ReactNode }) => (
                          <p className="mb-2 last:mb-0 leading-relaxed">
                            {children}
                          </p>
                        ),
                        strong: ({
                          children,
                        }: {
                          children?: React.ReactNode;
                        }) => (
                          <strong className="font-semibold">{children}</strong>
                        ),
                        em: ({ children }: { children?: React.ReactNode }) => (
                          <em className="italic">{children}</em>
                        ),
                        ul: ({ children }: { children?: React.ReactNode }) => (
                          <ul className="list-disc list-outside mb-2 space-y-1 ml-4">
                            {children}
                          </ul>
                        ),
                        ol: ({ children }: { children?: React.ReactNode }) => (
                          <ol className="list-decimal list-outside mb-2 space-y-1 ml-4">
                            {children}
                          </ol>
                        ),
                        li: ({ children }: { children?: React.ReactNode }) => (
                          <li className="pl-1">{children}</li>
                        ),
                        h1: ({ children }: { children?: React.ReactNode }) => (
                          <h1 className="text-lg font-bold mb-2 mt-2 first:mt-0">
                            {children}
                          </h1>
                        ),
                        h2: ({ children }: { children?: React.ReactNode }) => (
                          <h2 className="text-base font-semibold mb-2 mt-2 first:mt-0">
                            {children}
                          </h2>
                        ),
                        h3: ({ children }: { children?: React.ReactNode }) => (
                          <h3 className="text-sm font-semibold mb-2 mt-2 first:mt-0">
                            {children}
                          </h3>
                        ),
                        code: ({
                          children,
                        }: {
                          children?: React.ReactNode;
                        }) => (
                          <code className="bg-black/10 dark:bg-stone-700/50 px-1.5 py-0.5 rounded text-xs font-mono">
                            {children}
                          </code>
                        ),
                        blockquote: ({
                          children,
                        }: {
                          children?: React.ReactNode;
                        }) => (
                          <blockquote className="border-l-2 border-black/20 dark:border-stone-600 pl-3 italic my-2">
                            {children}
                          </blockquote>
                        ),
                        a: ({
                          children,
                          href,
                        }: {
                          children?: React.ReactNode;
                          href?: string;
                        }) => (
                          <a
                            href={href}
                            className="underline hover:opacity-80"
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

                    {/* Reference Material - Article Sources or Citations */}
                    {(msg.sources && msg.sources.length > 0) ||
                    (msg.citations && msg.citations.length > 0) ? (
                      <div className="mt-3 pt-2 border-t border-black/10 dark:border-stone-700">
                        <p className="text-xs uppercase tracking-widest text-stone-500 dark:text-stone-400 mb-2">
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
                ) : (
                  <p className="whitespace-pre-wrap">{msg.content}</p>
                )}
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-[#fcfbf9] dark:bg-stone-800 p-3 rounded-lg border border-black/5 dark:border-stone-700 rounded-bl-none max-w-[85%]">
                <div className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-gray-400 dark:text-stone-500" />
                  <span className="text-xs text-stone-500 dark:text-stone-400 font-serif italic">
                    The Editor is thinking...
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </CardContent>

      <div className="p-3 bg-[#fcfbf9] dark:bg-stone-800 border-t border-black/10 dark:border-stone-700">
        <div className="flex gap-2 items-end">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder="Type your question here... (Shift+Enter for new line)"
            rows={1}
            className="flex-1 bg-white dark:bg-stone-900 border border-gray-200 dark:border-stone-700 rounded-md px-3 py-2 text-sm font-serif text-black dark:text-stone-100 placeholder:text-gray-400 dark:placeholder:text-stone-500 focus:outline-none focus:ring-2 focus:ring-black/20 dark:focus:ring-stone-500 resize-none min-h-[40px] max-h-[120px] overflow-y-auto"
          />
          <Button
            onClick={handleSend}
            disabled={isLoading || !input.trim()}
            className="bg-black dark:bg-stone-700 text-white hover:bg-gray-800 dark:hover:bg-stone-600 font-serif disabled:opacity-50 disabled:cursor-not-allowed shrink-0 h-[40px] px-4"
            aria-label="Send message"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
        <p className="text-xs text-stone-400 dark:text-stone-500 mt-2 text-center font-serif italic">
          Press Enter to send, Shift+Enter for new line
        </p>
      </div>
    </Card>
  );
}
