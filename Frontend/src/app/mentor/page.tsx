'use client';

import React, { useState, useRef, useEffect } from 'react';
import { getCoachResponse, CoachMessage, CoachResponse } from '@/lib/aiCoach';

export default function MentorPage() {
    const [messages, setMessages] = useState<CoachMessage[]>([
        {
            role: 'coach',
            content:
                "Welcome to The Editor's Desk. I'm here to discuss investment concepts and help you think through market dynamics. What's on your mind today?",
            timestamp: new Date(),
        },
    ]);
    const [input, setInput] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const [lastResponse, setLastResponse] = useState<CoachResponse | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const sendMessage = async () => {
        if (!input.trim() || isTyping) return;

        const userMessage: CoachMessage = {
            role: 'user',
            content: input.trim(),
            timestamp: new Date(),
        };

        setMessages((prev) => [...prev, userMessage]);
        setInput('');
        setIsTyping(true);

        try {
            const response = await getCoachResponse(userMessage.content, {}, messages);
            setLastResponse(response);

            const coachMessage: CoachMessage = {
                role: 'coach',
                content: response.message,
                timestamp: new Date(),
                citations: response.citations,
            };

            setMessages((prev) => [...prev, coachMessage]);
        } catch (e) {
            console.error('Failed to get response', e);
            setMessages((prev) => [
                ...prev,
                {
                    role: 'coach',
                    content: "I apologize, but I'm having trouble connecting at the moment. Please try again shortly.",
                    timestamp: new Date(),
                },
            ]);
        } finally {
            setIsTyping(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
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
    const dateString = today.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
    });

    return (
        <div className="min-h-screen bg-stone-50 flex flex-col">
            <main className="flex-1 max-w-4xl w-full mx-auto px-4 py-8 flex flex-col">
                {/* Masthead */}
                <header className="text-center border-b-2 border-black pb-4 mb-6">
                    <p className="text-xs tracking-widest text-stone-500 uppercase mb-1">
                        {dateString}
                    </p>
                    <h1 className="font-serif text-4xl font-black tracking-tight text-black">
                        The Editor&apos;s Desk
                    </h1>
                    <p className="text-sm font-serif italic text-stone-500 mt-1">
                        A Socratic Dialogue on Markets & Money
                    </p>
                </header>

                {/* Conversation Container */}
                <div className="flex-1 border border-stone-200 bg-white flex flex-col">
                    {/* Messages Area */}
                    <div className="flex-1 overflow-y-auto p-6">
                        <div className="max-w-2xl mx-auto space-y-6">
                            {messages.map((msg, i) => (
                                <div key={i} className={msg.role === 'user' ? 'text-right' : ''}>
                                    {msg.role === 'coach' && (
                                        <p className="text-xs uppercase tracking-widest text-stone-400 mb-2">
                                            The Editor
                                        </p>
                                    )}
                                    {msg.role === 'user' && (
                                        <p className="text-xs uppercase tracking-widest text-stone-400 mb-2">
                                            Your Inquiry
                                        </p>
                                    )}
                                    <div
                                        className={`inline-block max-w-[85%] ${msg.role === 'user'
                                                ? 'bg-stone-100 text-stone-800'
                                                : 'bg-white border-l-2 border-stone-300 pl-4'
                                            } py-3 px-4`}
                                    >
                                        <p className="font-serif text-base leading-relaxed whitespace-pre-wrap">
                                            {msg.content}
                                        </p>

                                        {/* Citations */}
                                        {msg.citations && msg.citations.length > 0 && (
                                            <div className="mt-4 pt-3 border-t border-stone-200">
                                                <p className="text-xs uppercase tracking-widest text-stone-400 mb-2">
                                                    Reference Material
                                                </p>
                                                <div className="flex flex-wrap gap-2">
                                                    {msg.citations.map((citation, ci) => (
                                                        <span
                                                            key={ci}
                                                            className="text-xs text-stone-600 bg-stone-50 px-2 py-1"
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

                            {isTyping && (
                                <div>
                                    <p className="text-xs uppercase tracking-widest text-stone-400 mb-2">
                                        The Editor
                                    </p>
                                    <div className="inline-block border-l-2 border-stone-300 pl-4 py-3">
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
                    {lastResponse?.suggestedActions && lastResponse.suggestedActions.length > 0 && (
                        <div className="px-6 py-3 bg-stone-50 border-t border-stone-200">
                            <p className="text-xs uppercase tracking-widest text-stone-500 mb-2">
                                Suggested Next Steps
                            </p>
                            <div className="flex flex-wrap gap-2">
                                {lastResponse.suggestedActions.map((action, i) => (
                                    <span
                                        key={i}
                                        className="text-xs text-stone-600 border border-stone-300 px-3 py-1"
                                    >
                                        {action}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Suggested Topics (only if few messages) */}
                    {messages.length <= 2 && (
                        <div className="px-6 py-4 bg-stone-50 border-t border-stone-200">
                            <p className="text-xs uppercase tracking-widest text-stone-500 mb-3">
                                Topics to Explore
                            </p>
                            <div className="flex flex-wrap gap-2">
                                {suggestedTopics.map((topic, i) => (
                                    <button
                                        key={i}
                                        onClick={() => setInput(topic)}
                                        className="text-sm font-serif text-stone-700 border border-stone-300 px-3 py-2 hover:bg-white hover:border-stone-400 transition-colors"
                                    >
                                        {topic}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Input Area */}
                    <div className="p-4 border-t border-stone-200 bg-white">
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
                                        className="w-full border border-stone-300 px-4 py-3 font-serif text-base focus:outline-none focus:border-stone-400 resize-none"
                                    />
                                </div>
                                <button
                                    onClick={sendMessage}
                                    disabled={!input.trim() || isTyping}
                                    className={`px-6 py-3 text-sm uppercase tracking-widest font-medium transition-colors ${input.trim() && !isTyping
                                            ? 'bg-black text-white hover:bg-stone-800'
                                            : 'bg-stone-200 text-stone-400 cursor-not-allowed'
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
