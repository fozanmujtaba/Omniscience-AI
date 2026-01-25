"use client";

import { useState, useEffect } from "react";
import { Sparkles, Loader2 } from "lucide-react";

interface SuggestedQuestionsProps {
    lastResponse: string;
    lastQuestion: string;
    onSelectQuestion: (question: string) => void;
    visible: boolean;
}

export function SuggestedQuestions({
    lastResponse,
    lastQuestion,
    onSelectQuestion,
    visible,
}: SuggestedQuestionsProps) {
    const [suggestions, setSuggestions] = useState<string[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [hasLoaded, setHasLoaded] = useState(false);

    useEffect(() => {
        if (!visible || !lastResponse || hasLoaded) return;

        const fetchSuggestions = async () => {
            setIsLoading(true);
            try {
                const response = await fetch("/api/suggest", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        lastResponse,
                        lastQuestion,
                    }),
                });

                const data = await response.json();

                if (data.success && data.suggestions) {
                    setSuggestions(data.suggestions);
                }
            } catch (error) {
                console.error("Failed to fetch suggestions:", error);
            } finally {
                setIsLoading(false);
                setHasLoaded(true);
            }
        };

        // Delay slightly to let the response render first
        const timeout = setTimeout(fetchSuggestions, 500);
        return () => clearTimeout(timeout);
    }, [visible, lastResponse, lastQuestion, hasLoaded]);

    // Reset when response changes
    useEffect(() => {
        setHasLoaded(false);
        setSuggestions([]);
    }, [lastResponse]);

    if (!visible) return null;

    return (
        <div className="mt-4 animate-in fade-in slide-in-from-bottom-2 duration-500">
            <div className="flex items-center gap-2 mb-2">
                <Sparkles className="w-3.5 h-3.5 text-violet-500" />
                <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                    Suggested follow-ups
                </span>
            </div>

            <div className="flex flex-wrap gap-2">
                {isLoading ? (
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-zinc-100 dark:bg-zinc-800/50 text-zinc-500 text-sm">
                        <Loader2 className="w-3 h-3 animate-spin" />
                        <span>Generating suggestions...</span>
                    </div>
                ) : suggestions.length > 0 ? (
                    suggestions.map((question, idx) => (
                        <button
                            key={idx}
                            onClick={() => onSelectQuestion(question)}
                            className="group px-3 py-1.5 rounded-full bg-zinc-100 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 text-sm text-zinc-700 dark:text-zinc-300 hover:bg-violet-50 dark:hover:bg-violet-500/10 hover:border-violet-300 dark:hover:border-violet-500/50 hover:text-violet-700 dark:hover:text-violet-300 transition-all duration-200"
                        >
                            <span className="flex items-center gap-1.5">
                                <span className="opacity-60 group-hover:opacity-100">💡</span>
                                {question}
                            </span>
                        </button>
                    ))
                ) : null}
            </div>
        </div>
    );
}
