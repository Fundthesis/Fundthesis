import React, { useState, useRef, useEffect } from 'react';
import { Send, User, Bot, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/button'; // Assuming this exists or using standard button
import { getCoachResponse, type ChatMessage } from '@/lib/aiCoach';

export function EditorsDesk({ className }: { className?: string }) {
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        // Initial greeting from The Editor
        if (messages.length === 0) {
            setMessages([
                {
                    role: 'coach',
                    content: "Welcome to The Editor's Desk. I'm here to discuss investment concepts and help you think through market dynamics. What's on your mind today?",
                    timestamp: new Date(),
                },
            ]);
        }
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
            timestamp: new Date()
        };
        setMessages((prev) => [...prev, userMsg]);
        setInput('');
        setIsLoading(true);

        try {
            const response = await getCoachResponse(userMsg.content, {}, messages);

            const coachMsg: ChatMessage = {
                role: 'coach',
                content: response.message,
                timestamp: new Date(),
                citations: response.citations
            };
            setMessages((prev) => [...prev, coachMsg]);
        } catch (error) {
            console.error('Failed to get coach response:', error);
            setMessages((prev) => [
                ...prev,
                {
                    role: 'coach',
                    content: "I apologize, but I'm having trouble connecting right now. Let's try again later.",
                    timestamp: new Date()
                },
            ]);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Card className={`flex flex-col h-[500px] border-black/10 shadow-sm ${className}`}>
            <CardHeader className="bg-[#fcfbf9] border-b border-black/10 py-3">
                <CardTitle className="font-serif text-xl italic flex items-center">
                    <Bot className="w-5 h-5 mr-2" />
                    The Editor's Desk
                </CardTitle>
                <p className="text-xs text-gray-500 font-serif italic">A Socratic Dialogue on Markets & Money</p>
            </CardHeader>

            <CardContent className="flex-1 overflow-hidden p-0">
                <div
                    className="h-full overflow-y-auto p-4 space-y-4 bg-white scrollbar-hide"
                    ref={scrollRef}
                >
                    {messages.map((msg, idx) => (
                        <div
                            key={idx}
                            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                        >
                            <div
                                className={`max-w-[80%] p-3 rounded-lg text-sm font-serif leading-relaxed ${msg.role === 'user'
                                    ? 'bg-black text-white rounded-br-none'
                                    : 'bg-[#fcfbf9] text-gray-800 border border-black/5 rounded-bl-none'
                                    }`}
                            >
                                {msg.role === 'coach' && <span className="block text-xs font-bold mb-1 opacity-50 uppercase tracking-widest">The Editor</span>}
                                {msg.role === 'user' && <span className="block text-xs font-bold mb-1 opacity-50 uppercase tracking-widest text-right">Your Inquiry</span>}
                                {msg.content}
                            </div>
                        </div>
                    ))}
                    {isLoading && (
                        <div className="flex justify-start">
                            <div className="bg-[#fcfbf9] p-3 rounded-lg border border-black/5 rounded-bl-none">
                                <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
                            </div>
                        </div>
                    )}
                </div>
            </CardContent>

            <div className="p-3 bg-[#fcfbf9] border-t border-black/10">
                <div className="flex gap-2">
                    <input
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                        placeholder="Type your question here..."
                        className="flex-1 bg-white border border-gray-200 rounded-md px-3 py-2 text-sm font-serif focus:outline-none focus:ring-1 focus:ring-black/20"
                    />
                    <Button
                        onClick={handleSend}
                        disabled={isLoading || !input.trim()}
                        className="bg-black text-white hover:bg-gray-800 font-serif"
                    >
                        <Send className="w-4 h-4" />
                    </Button>
                </div>
            </div>
        </Card>
    );
}
