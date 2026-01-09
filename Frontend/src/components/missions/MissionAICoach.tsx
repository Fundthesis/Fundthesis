'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, Loader2 } from 'lucide-react';
import { Mission } from '@/data/missions';

interface MissionAICoachProps {
  mission: Mission;
  portfolioContext?: {
    cashBalance: number;
    holdings: { [symbol: string]: number };
    transactions: Array<{
      id: string;
      ticker: string;
      side: 'buy' | 'sell';
      price: number;
      quantity: number;
      executedAt: Date;
    }>;
    totalValue: number;
  };
}

interface ChatMessage {
  role: 'user' | 'coach';
  content: string;
  timestamp: Date;
}

export function MissionAICoach({ mission, portfolioContext }: MissionAICoachProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Initial greeting from AI Coach with mission context
    if (messages.length === 0) {
      const greeting = `Welcome to ${mission.title}! I'm your AI Coach, and I'm here to guide you through this mission using the Socratic method. 

Instead of giving you direct answers, I'll ask questions that help you discover insights yourself. 

Your mission: ${mission.description}

What would you like to explore first?`;
      
      setMessages([
        {
          role: 'coach',
          content: greeting,
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
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMsg: ChatMessage = {
      role: 'user',
      content: input,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      // Build student context for the API
      const studentContext = {
        mission_id: mission.id,
        mission_title: mission.title,
        mission_scenario: mission.sandboxConfig.scenario,
        mission_objectives: mission.objectives,
        portfolio: portfolioContext || {},
      };

      const response = await fetch('/api/education/socratic', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          question: userMsg.content,
          student_context: studentContext,
        }),
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();

      const coachMsg: ChatMessage = {
        role: 'coach',
        content: data.guidance || data.message || "I'm here to help you think through this. What specific aspect would you like to explore?",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, coachMsg]);
    } catch (error) {
      console.error('Failed to get coach response:', error);
      setMessages((prev) => [
        ...prev,
        {
          role: 'coach',
          content: "I apologize, but I'm having trouble connecting right now. Let's try again later. In the meantime, consider reviewing the mission objectives and thinking about how they relate to your portfolio decisions.",
          timestamp: new Date(),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-white dark:bg-stone-800 border-2 border-black dark:border-stone-700 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] dark:shadow-[8px_8px_0px_0px_rgba(0,0,0,0.5)] flex flex-col h-[600px]">
      {/* Header */}
      <div className="border-b-2 border-black dark:border-stone-700 p-4 bg-stone-50 dark:bg-stone-900">
        <div className="flex items-center gap-2">
          <Bot className="w-5 h-5 text-black dark:text-stone-400" />
          <h3 className="text-lg font-black font-serif text-black dark:text-stone-100 uppercase tracking-wide">
            AI Coach
          </h3>
        </div>
        <p className="text-xs text-gray-600 dark:text-stone-400 font-serif italic mt-1">
          Socratic guidance for {mission.title}
        </p>
      </div>

      {/* Messages */}
      <div
        className="flex-1 overflow-y-auto p-4 space-y-4 bg-white dark:bg-stone-800 scrollbar-hide"
        ref={scrollRef}
      >
        {messages.map((msg, idx) => (
          <div
            key={idx}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[80%] p-3 rounded-lg text-sm font-serif leading-relaxed ${
                msg.role === 'user'
                  ? 'bg-black dark:bg-stone-700 text-white rounded-br-none'
                  : 'bg-stone-100 dark:bg-stone-900 text-gray-800 dark:text-stone-200 border border-black/10 dark:border-stone-700 rounded-bl-none'
              }`}
            >
              {msg.role === 'coach' && (
                <span className="block text-xs font-bold mb-1 opacity-50 uppercase tracking-widest">
                  The Coach
                </span>
              )}
              {msg.role === 'user' && (
                <span className="block text-xs font-bold mb-1 opacity-50 uppercase tracking-widest text-right">
                  Your Question
                </span>
              )}
              <div className="whitespace-pre-wrap">{msg.content}</div>
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-stone-100 dark:bg-stone-900 p-3 rounded-lg border border-black/10 dark:border-stone-700 rounded-bl-none">
              <Loader2 className="w-4 h-4 animate-spin text-gray-400 dark:text-stone-500" />
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="p-4 border-t-2 border-black dark:border-stone-700 bg-stone-50 dark:bg-stone-900">
        <div className="flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
            placeholder="Ask a question about the mission or your portfolio..."
            className="flex-1 bg-white dark:bg-stone-800 border-2 border-black/20 dark:border-stone-600 rounded-none px-3 py-2 text-sm font-serif text-black dark:text-stone-100 placeholder:text-gray-400 dark:placeholder:text-stone-500 focus:outline-none focus:border-black dark:focus:border-stone-400"
          />
          <button
            onClick={handleSend}
            disabled={isLoading || !input.trim()}
            className="bg-black dark:bg-stone-700 text-white hover:bg-gray-800 dark:hover:bg-stone-600 font-serif px-4 py-2 border-2 border-black dark:border-stone-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
        <p className="text-xs text-gray-500 dark:text-stone-500 mt-2 italic">
          The Coach uses the Socratic method—expect questions, not direct answers!
        </p>
      </div>
    </div>
  );
}
