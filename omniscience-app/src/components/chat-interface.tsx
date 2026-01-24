"use client";

import { useState, useRef, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";

interface Message {
    id: string;
    role: "user" | "assistant";
    content: string;
    sources?: Array<{ filename: string; chunkIndex: number }>;
}

interface ChatInterfaceProps {
    sessionId: string;
    onFirstMessage?: (message: string) => void;
}

export function ChatInterface({ sessionId, onFirstMessage }: ChatInterfaceProps) {
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);

    // Load session messages from local storage
    useEffect(() => {
        const saved = localStorage.getItem(`chat_${sessionId}`);
        if (saved) {
            setMessages(JSON.parse(saved));
        } else {
            setMessages([]);
        }
    }, [sessionId]);

    // Save messages when they change
    useEffect(() => {
        if (messages.length > 0) {
            localStorage.setItem(`chat_${sessionId}`, JSON.stringify(messages));
        }
    }, [messages, sessionId]);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages]);

    const sendMessage = async () => {
        if (!input.trim() || isLoading) return;

        // If this is the first message, notify parent to set session title
        if (messages.length === 0 && onFirstMessage) {
            onFirstMessage(input.trim());
        }

        const userMessage: Message = {
            id: Date.now().toString(),
            role: "user",
            content: input.trim(),
        };

        const newMessages = [...messages, userMessage];
        setMessages(newMessages);
        setInput("");
        setIsLoading(true);

        const assistantId = (Date.now() + 1).toString();
        const placeholderAssistantMessage: Message = { id: assistantId, role: "assistant", content: "", sources: [] };
        setMessages([...newMessages, placeholderAssistantMessage]);

        try {
            // Format history for Gemini (max last 10 messages for context)
            const chatHistory = newMessages.slice(-10).map((m) => ({
                role: m.role === "user" ? ("user" as const) : ("model" as const),
                parts: [{ text: m.content }],
            }));

            const response = await fetch("/api/chat", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    message: userMessage.content,
                    sessionId: sessionId,
                    history: chatHistory
                }),
            });

            if (!response.ok) throw new Error("Chat request failed");

            const reader = response.body?.getReader();
            if (!reader) throw new Error("No response stream");

            const decoder = new TextDecoder();
            let sources: Array<{ filename: string; chunkIndex: number }> = [];

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                const chunk = decoder.decode(value);
                const lines = chunk.split("\n").filter((line) => line.startsWith("data: "));

                for (const line of lines) {
                    try {
                        const data = JSON.parse(line.slice(6));

                        if (data.type === "sources") {
                            sources = data.sources;
                            setMessages((prev) =>
                                prev.map((m) =>
                                    m.id === assistantId ? { ...m, sources } : m
                                )
                            );
                        } else if (data.type === "text") {
                            setMessages((prev) =>
                                prev.map((m) =>
                                    m.id === assistantId
                                        ? { ...m, content: m.content + data.content }
                                        : m
                                )
                            );
                        }
                    } catch {
                        // Skip malformed JSON
                    }
                }
            }
        } catch (error) {
            console.error("Chat error:", error);
            setMessages((prev) =>
                prev.map((m) =>
                    m.id === assistantId
                        ? { ...m, content: "Sorry, an error occurred. Please try again." }
                        : m
                )
            );
        } finally {
            setIsLoading(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    };

    return (
        <Card className="flex flex-col h-[600px] bg-zinc-900/50 backdrop-blur border-zinc-800">
            {/* Header */}
            <div className="p-4 border-b border-zinc-800">
                <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    Omniscience Chat
                </h2>
                <p className="text-sm text-zinc-400">Ask questions about your documents</p>
            </div>

            {/* Messages */}
            <ScrollArea className="flex-1 p-4" ref={scrollRef}>
                {messages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-center text-zinc-500">
                        <div className="w-16 h-16 rounded-full bg-zinc-800 flex items-center justify-center mb-4">
                            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                            </svg>
                        </div>
                        <p className="text-sm">Upload PDFs and start asking questions</p>
                        <p className="text-xs mt-1">Answers will cite specific sources</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {messages.map((message) => (
                            <div
                                key={message.id}
                                className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
                            >
                                <div
                                    className={`max-w-[80%] rounded-2xl px-4 py-3 ${message.role === "user"
                                        ? "bg-violet-600 text-white"
                                        : "bg-zinc-800 text-zinc-100"
                                        }`}
                                >
                                    <p className="text-sm whitespace-pre-wrap">{message.content}</p>

                                    {message.sources && message.sources.length > 0 && (
                                        <div className="flex flex-wrap gap-1 mt-2 pt-2 border-t border-zinc-700">
                                            {message.sources.map((source, idx) => (
                                                <Badge
                                                    key={idx}
                                                    variant="outline"
                                                    className="text-xs bg-zinc-900/50 border-zinc-600"
                                                >
                                                    📄 {source.filename} (#{source.chunkIndex})
                                                </Badge>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}

                        {isLoading && messages[messages.length - 1]?.content === "" && (
                            <div className="flex justify-start">
                                <div className="bg-zinc-800 rounded-2xl px-4 py-3">
                                    <div className="flex gap-1">
                                        <span className="w-2 h-2 bg-zinc-500 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                                        <span className="w-2 h-2 bg-zinc-500 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                                        <span className="w-2 h-2 bg-zinc-500 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </ScrollArea>

            {/* Input */}
            <div className="p-4 border-t border-zinc-800">
                <div className="flex gap-2">
                    <Textarea
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Ask a question about your documents..."
                        className="min-h-[44px] max-h-32 resize-none bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500"
                        disabled={isLoading}
                    />
                    <Button
                        onClick={sendMessage}
                        disabled={!input.trim() || isLoading}
                        className="bg-violet-600 hover:bg-violet-700 text-white px-6"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                        </svg>
                    </Button>
                </div>
            </div>
        </Card>
    );
}
