"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import ReactMarkdown from "react-markdown";
import toast from "react-hot-toast";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { SourcePreviewModal } from "./source-preview-modal";
import { VoiceInput } from "./voice-input";
import { SuggestedQuestions } from "./suggested-questions";
import { downloadMarkdown, downloadJSON } from "@/lib/export-chat";

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

// Copy button component
function CopyButton({ text }: { text: string }) {
    const [copied, setCopied] = useState(false);

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(text);
            setCopied(true);
            toast.success("Copied to clipboard!");
            setTimeout(() => setCopied(false), 2000);
        } catch {
            toast.error("Failed to copy");
        }
    };

    return (
        <button
            onClick={handleCopy}
            className="p-1.5 rounded-lg hover:bg-white/10 transition-colors group"
            title="Copy message"
        >
            {copied ? (
                <svg className="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
            ) : (
                <svg className="w-4 h-4 text-zinc-400 group-hover:text-zinc-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
            )}
        </button>
    );
}

// Loading skeleton component
function LoadingSkeleton() {
    return (
        <div className="flex justify-start animate-in fade-in slide-in-from-left-2 duration-500">
            <div className="max-w-[85%] rounded-2xl px-5 py-4 bg-white dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 shadow-lg">
                <div className="space-y-3">
                    {/* Animated skeleton lines */}
                    <div className="flex items-center gap-2 mb-4">
                        <div className="w-2 h-2 bg-violet-500 dark:bg-violet-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                        <div className="w-2 h-2 bg-violet-500 dark:bg-violet-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                        <div className="w-2 h-2 bg-violet-500 dark:bg-violet-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                        <span className="text-xs text-zinc-500 ml-2">Thinking...</span>
                    </div>
                    <div className="h-3 bg-zinc-200 dark:bg-zinc-700/50 rounded-full w-[90%] animate-pulse" />
                    <div className="h-3 bg-zinc-200 dark:bg-zinc-700/50 rounded-full w-[75%] animate-pulse" style={{ animationDelay: '100ms' }} />
                    <div className="h-3 bg-zinc-200 dark:bg-zinc-700/50 rounded-full w-[85%] animate-pulse" style={{ animationDelay: '200ms' }} />
                    <div className="h-3 bg-zinc-200 dark:bg-zinc-700/50 rounded-full w-[60%] animate-pulse" style={{ animationDelay: '300ms' }} />
                </div>
            </div>
        </div>
    );
}

export function ChatInterface({ sessionId, onFirstMessage }: ChatInterfaceProps) {
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [selectedSource, setSelectedSource] = useState<{ filename: string; chunkIndex: number; text: string } | null>(null);
    const [lastUserMessage, setLastUserMessage] = useState<string>("");
    const scrollRef = useRef<HTMLDivElement>(null);
    const abortControllerRef = useRef<AbortController | null>(null);

    // Load session messages from local storage
    useEffect(() => {
        const saved = localStorage.getItem(`chat_${sessionId}`);
        if (saved) {
            const parsed = JSON.parse(saved);
            setMessages(parsed);
            // Find last user message for regenerate
            const lastUser = [...parsed].reverse().find((m: Message) => m.role === "user");
            if (lastUser) setLastUserMessage(lastUser.content);
        } else {
            setMessages([]);
            setLastUserMessage("");
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

    const sendMessage = useCallback(async (messageContent?: string) => {
        const content = messageContent || input.trim();
        if (!content || isLoading) return;

        // If this is the first message, notify parent to set session title
        if (messages.length === 0 && onFirstMessage) {
            onFirstMessage(content);
        }

        const userMessage: Message = {
            id: Date.now().toString(),
            role: "user",
            content: content,
        };

        setLastUserMessage(content);

        const newMessages = messageContent
            ? messages // For regenerate, don't add user message again
            : [...messages, userMessage];

        if (!messageContent) {
            setMessages(newMessages);
        }
        setInput("");
        setIsLoading(true);

        const assistantId = (Date.now() + 1).toString();
        const placeholderAssistantMessage: Message = { id: assistantId, role: "assistant", content: "", sources: [] };

        // For regenerate, remove last assistant message first
        const messagesForDisplay = messageContent
            ? [...messages.filter(m => m.role !== "assistant" || messages.indexOf(m) !== messages.length - 1), placeholderAssistantMessage]
            : [...newMessages, placeholderAssistantMessage];

        setMessages(messagesForDisplay);

        // Create abort controller for this request
        abortControllerRef.current = new AbortController();

        try {
            // Format history for chat (max last 10 messages for context)
            const relevantMessages = messageContent ? newMessages : newMessages;
            const chatHistory = relevantMessages.slice(-10).map((m) => ({
                role: m.role === "user" ? ("user" as const) : ("model" as const),
                parts: [{ text: m.content }],
            }));

            const response = await fetch("/api/chat", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    message: content,
                    sessionId: sessionId,
                    history: chatHistory
                }),
                signal: abortControllerRef.current.signal,
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
                        } else if (data.type === "provider") {
                            // Optional: show which provider is being used
                            console.log(`[Chat] Using provider: ${data.provider} (${data.model})`);
                        }
                    } catch {
                        // Skip malformed JSON
                    }
                }
            }

            toast.success("Response generated");
        } catch (error) {
            if ((error as Error).name === 'AbortError') {
                console.log("[Chat] Request aborted");
                return;
            }

            console.error("Chat error:", error);
            const errorMessage = error instanceof Error ? error.message : "Sorry, an error occurred. Please try again.";

            toast.error(errorMessage);

            setMessages((prev) =>
                prev.map((m) =>
                    m.id === assistantId
                        ? { ...m, content: `⚠️ **Error:** ${errorMessage}` }
                        : m
                )
            );
        } finally {
            setIsLoading(false);
            abortControllerRef.current = null;
        }
    }, [input, isLoading, messages, onFirstMessage, sessionId]);

    const handleRegenerate = () => {
        if (!lastUserMessage || isLoading) return;
        toast("Regenerating response...", { icon: "🔄" });
        sendMessage(lastUserMessage);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    };

    // Check if we can show regenerate button
    const canRegenerate = messages.length > 0 &&
        messages[messages.length - 1]?.role === "assistant" &&
        messages[messages.length - 1]?.content &&
        !isLoading;

    return (
        <>
            <Card className="flex flex-col h-[650px] bg-white dark:bg-zinc-900/50 backdrop-blur border-zinc-200 dark:border-zinc-800 shadow-lg dark:shadow-none">
                {/* Header */}
                <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
                    <div>
                        <h2 className="text-lg font-semibold text-zinc-900 dark:text-white flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                            Omniscience Chat
                        </h2>
                        <p className="text-sm text-zinc-500 dark:text-zinc-400">Ask questions about your documents</p>
                    </div>
                    <div className="flex items-center gap-2">
                        {/* Export dropdown */}
                        {messages.length > 0 && (
                            <div className="relative group">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 gap-2"
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                    </svg>
                                    Export
                                </Button>
                                <div className="absolute right-0 mt-1 w-40 py-1 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
                                    <button
                                        onClick={() => downloadMarkdown(messages)}
                                        className="w-full px-4 py-2 text-left text-sm text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 flex items-center gap-2"
                                    >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                        </svg>
                                        Markdown
                                    </button>
                                    <button
                                        onClick={() => downloadJSON(messages)}
                                        className="w-full px-4 py-2 text-left text-sm text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 flex items-center gap-2"
                                    >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                                        </svg>
                                        JSON
                                    </button>
                                </div>
                            </div>
                        )}
                        {canRegenerate && (
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={handleRegenerate}
                                className="border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 gap-2"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                </svg>
                                Regenerate
                            </Button>
                        )}
                    </div>
                </div>

                {/* Messages */}
                <div
                    className="flex-1 overflow-y-auto p-4 custom-scrollbar min-h-0"
                    ref={scrollRef}
                >
                    {messages.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-center text-zinc-500 py-20">
                            <div className="w-16 h-16 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center mb-4">
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
                                        className={`max-w-[85%] rounded-2xl px-5 py-4 shadow-lg relative group ${message.role === "user"
                                            ? "bg-violet-600 text-white shadow-violet-500/20"
                                            : "bg-white dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700 shadow-zinc-200/50 dark:shadow-black/20"
                                            }`}
                                    >
                                        {/* Copy button - only show for assistant messages with content */}
                                        {message.role === "assistant" && message.content && (
                                            <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <CopyButton text={message.content} />
                                            </div>
                                        )}

                                        <div className="text-sm prose-custom">
                                            <ReactMarkdown
                                                components={{
                                                    p: ({ children }) => (
                                                        <p className={`mb-3 last:mb-0 leading-relaxed break-words ${message.role === "user" ? "text-white" : "text-zinc-700 dark:text-zinc-200"}`}>
                                                            {children}
                                                        </p>
                                                    ),
                                                    ul: ({ children }) => (
                                                        <ul className={`list-disc ml-5 mb-3 space-y-1 ${message.role === "user" ? "text-white/90" : "text-zinc-600 dark:text-zinc-300"}`}>
                                                            {children}
                                                        </ul>
                                                    ),
                                                    ol: ({ children }) => (
                                                        <ol className={`list-decimal ml-5 mb-3 space-y-1 ${message.role === "user" ? "text-white/90" : "text-zinc-600 dark:text-zinc-300"}`}>
                                                            {children}
                                                        </ol>
                                                    ),
                                                    li: ({ children }) => <li className="pl-1">{children}</li>,
                                                    h3: ({ children }) => (
                                                        <h3 className="text-base font-bold mb-3 mt-1 text-violet-600 dark:text-transparent dark:bg-clip-text dark:bg-gradient-to-r dark:from-violet-400 dark:to-cyan-400">
                                                            {children}
                                                        </h3>
                                                    ),
                                                    strong: ({ children }) => (
                                                        <strong className={`font-semibold tracking-wide ${message.role === "user" ? "text-white" : "text-zinc-900 dark:text-white"}`}>
                                                            {children}
                                                        </strong>
                                                    ),
                                                    code: ({ children }) => (
                                                        <code className="bg-zinc-100 dark:bg-zinc-950/50 border border-zinc-200 dark:border-zinc-800/50 px-1.5 py-0.5 rounded text-[13px] font-mono text-violet-600 dark:text-cyan-300">
                                                            {children}
                                                        </code>
                                                    ),
                                                }}
                                            >
                                                {message.content}
                                            </ReactMarkdown>
                                        </div>

                                        {message.sources && message.sources.length > 0 && (
                                            <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-zinc-200 dark:border-white/5">
                                                {message.sources.map((source, sIdx) => (
                                                    <button
                                                        key={sIdx}
                                                        onClick={() => setSelectedSource(source)}
                                                        className="group flex items-center gap-2 px-2.5 py-1 rounded-full bg-zinc-100 dark:bg-white/5 border border-zinc-200 dark:border-white/5 hover:border-violet-400 dark:hover:border-violet-500/50 hover:bg-violet-50 dark:hover:bg-violet-500/10 transition-all duration-300"
                                                    >
                                                        <span className="text-[10px] text-zinc-500 group-hover:text-violet-600 dark:group-hover:text-violet-400 transition-colors uppercase tracking-widest font-bold">
                                                            Source {source.chunkIndex}
                                                        </span>
                                                        <span className="text-[10px] text-zinc-500 dark:text-zinc-400 truncate max-w-[100px]">
                                                            {source.filename}
                                                        </span>
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}

                            {/* Loading skeleton */}
                            {isLoading && messages[messages.length - 1]?.content === "" && (
                                <LoadingSkeleton />
                            )}
                        </div>
                    )}
                </div>

                {/* Input */}
                <div className="p-4 border-t border-zinc-200 dark:border-zinc-800">
                    {/* Suggested Questions */}
                    {messages.length > 0 && messages[messages.length - 1]?.role === "assistant" && !isLoading && (
                        <SuggestedQuestions
                            lastResponse={messages[messages.length - 1]?.content || ""}
                            lastQuestion={lastUserMessage}
                            onSelectQuestion={(question) => {
                                setInput(question);
                            }}
                            visible={true}
                        />
                    )}

                    <div className={`flex gap-2 ${messages.length > 0 && messages[messages.length - 1]?.role === "assistant" && !isLoading ? "mt-4" : ""}`}>
                        <Textarea
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder="Ask a question about your documents..."
                            className="min-h-[44px] max-h-32 resize-none bg-zinc-50 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-white placeholder:text-zinc-400 dark:placeholder:text-zinc-500"
                            disabled={isLoading}
                        />
                        <VoiceInput
                            onTranscript={(text) => setInput(prev => prev + (prev ? " " : "") + text)}
                            disabled={isLoading}
                        />
                        <Button
                            onClick={() => sendMessage()}
                            disabled={!input.trim() || isLoading}
                            className="bg-violet-600 hover:bg-violet-700 text-white px-6"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                            </svg>
                        </Button>
                    </div>
                    <p className="text-[10px] text-zinc-500 dark:text-zinc-600 mt-2 text-center">
                        Press <kbd className="px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400">Enter</kbd> to send • <kbd className="px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400">🎤</kbd> for voice
                    </p>
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
