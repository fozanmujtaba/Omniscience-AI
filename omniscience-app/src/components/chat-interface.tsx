"use client";

import { useState, useRef, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { SourcePreviewModal } from "./source-preview-modal";

interface Message {
    id: string;
    role: "user" | "assistant";
    content: string;
    sources?: Array<{ filename: string; chunkIndex: number; text: string }>;
}

interface ChatInterfaceProps {
    sessionId: string;
    onFirstMessage?: (message: string) => void;
}

export function ChatInterface({ sessionId, onFirstMessage }: ChatInterfaceProps) {
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [selectedSource, setSelectedSource] = useState<{ filename: string; chunkIndex: number; text: string } | null>(null);
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

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                console.error("[Chat] Request failed:", response.status, errorData);
                throw new Error(errorData.message || `Chat request failed with status ${response.status}`);
            }

            const reader = response.body?.getReader();
            if (!reader) throw new Error("No response stream");

            const decoder = new TextDecoder();
            let assistantContent = "";
            let sources: Message["sources"] = [];

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
                            assistantContent += data.content;
                            setMessages((prev) =>
                                prev.map((m) =>
                                    m.id === assistantId
                                        ? { ...m, content: assistantContent }
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
            const errorMessage = error instanceof Error ? error.message : "Sorry, an error occurred. Please try again.";

            setMessages((prev) =>
                prev.map((m) =>
                    m.id === assistantId
                        ? { ...m, content: `⚠️ **Notification:** ${errorMessage}` }
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
        <>
            <Card className="flex flex-col h-[650px] bg-zinc-900/50 backdrop-blur border-zinc-800">
                {/* Header */}
                <div className="p-4 border-b border-zinc-800">
                    <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                        Omniscience Chat
                    </h2>
                    <p className="text-sm text-zinc-400">Ask questions about your documents</p>
                </div>

                {/* Messages */}
                <div
                    className="flex-1 overflow-y-auto p-4 custom-scrollbar min-h-0"
                    ref={scrollRef}
                >
                    {messages.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-center text-zinc-500 py-20">
                            <div className="w-16 h-16 rounded-full bg-zinc-800 flex items-center justify-center mb-4">
                                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                                </svg>
                            </div>
                            <p className="text-sm">Upload PDFs and start asking questions</p>
                            <p className="text-xs mt-1">Answers will cite specific sources</p>
                        </div>
                    ) : (
                        <div className="space-y-6 pb-4">
                            {messages.map((message, idx) => (
                                <div
                                    key={message.id}
                                    className={`flex ${message.role === "user" ? "justify-end" : "justify-start"} animate-in fade-in slide-in-from-bottom-2 duration-500`}
                                    style={{ animationDelay: `${idx * 50}ms` }}
                                >
                                    <div
                                        className={`max-w-[85%] rounded-2xl px-5 py-4 shadow-xl ${message.role === "user"
                                            ? "bg-violet-600 text-white shadow-violet-900/10"
                                            : "glass text-zinc-100 shadow-black/20"
                                            }`}
                                    >
                                        <div className="text-sm prose-custom">
                                            <ReactMarkdown
                                                components={{
                                                    p: ({ children }) => <p className="mb-3 last:mb-0 leading-relaxed break-words text-zinc-200">{children}</p>,
                                                    ul: ({ children }) => <ul className="list-disc ml-5 mb-3 space-y-1 text-zinc-300">{children}</ul>,
                                                    ol: ({ children }) => <ol className="list-decimal ml-5 mb-3 space-y-1 text-zinc-300">{children}</ol>,
                                                    li: ({ children }) => <li className="pl-1">{children}</li>,
                                                    h3: ({ children }) => (
                                                        <h3 className="text-base font-bold mb-3 mt-1 text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-cyan-400">
                                                            {children}
                                                        </h3>
                                                    ),
                                                    strong: ({ children }) => <strong className="font-semibold text-white tracking-wide">{children}</strong>,
                                                    code: ({ children }) => (
                                                        <code className="bg-zinc-950/50 border border-zinc-800/50 px-1.5 py-0.5 rounded text-[13px] font-mono text-cyan-300">
                                                            {children}
                                                        </code>
                                                    ),
                                                }}
                                            >
                                                {message.content}
                                            </ReactMarkdown>
                                        </div>

                                        {message.sources && message.sources.length > 0 && (
                                            <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-white/5">
                                                {message.sources.map((source, sIdx) => (
                                                    <button
                                                        key={sIdx}
                                                        onClick={() => setSelectedSource(source)}
                                                        className="group flex items-center gap-2 px-2.5 py-1 rounded-full bg-white/5 border border-white/5 hover:border-violet-500/50 hover:bg-violet-500/10 transition-all duration-300"
                                                    >
                                                        <span className="text-[10px] text-zinc-500 group-hover:text-violet-400 transition-colors uppercase tracking-widest font-bold">
                                                            Source {source.chunkIndex}
                                                        </span>
                                                        <span className="text-[10px] text-zinc-400 truncate max-w-[100px]">
                                                            {source.filename}
                                                        </span>
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}

                            {isLoading && messages[messages.length - 1]?.role === "user" && (
                                <div className="flex justify-start animate-in fade-in slide-in-from-left-2 duration-500">
                                    <div className="glass px-5 py-3 rounded-2xl flex gap-1.5 items-center shadow-sm">
                                        <div className="w-1.5 h-1.5 bg-violet-400 rounded-full animate-pulse shadow-[0_0_8px_rgba(167,139,250,0.5)]" />
                                        <div className="w-1.5 h-1.5 bg-violet-400/60 rounded-full animate-pulse delay-75" />
                                        <div className="w-1.5 h-1.5 bg-violet-400/30 rounded-full animate-pulse delay-150" />
                                        <span className="text-[10px] text-zinc-500 font-medium ml-2 uppercase tracking-widest">Thought in progress</span>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>

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

            <SourcePreviewModal
                isOpen={!!selectedSource}
                onClose={() => setSelectedSource(null)}
                source={selectedSource}
            />
        </>
    );
}
