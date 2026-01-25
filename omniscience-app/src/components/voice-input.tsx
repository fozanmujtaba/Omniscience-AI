"use client";

import { useState, useEffect, useCallback } from "react";
import { Mic, MicOff, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import toast from "react-hot-toast";

interface VoiceInputProps {
    onTranscript: (text: string) => void;
    disabled?: boolean;
}

// Extend Window interface for Speech Recognition
interface SpeechRecognitionEvent extends Event {
    results: SpeechRecognitionResultList;
    resultIndex: number;
}

interface SpeechRecognitionErrorEvent extends Event {
    error: string;
}

declare global {
    interface Window {
        SpeechRecognition: new () => SpeechRecognition;
        webkitSpeechRecognition: new () => SpeechRecognition;
    }
}

interface SpeechRecognition extends EventTarget {
    continuous: boolean;
    interimResults: boolean;
    lang: string;
    start: () => void;
    stop: () => void;
    abort: () => void;
    onresult: (event: SpeechRecognitionEvent) => void;
    onerror: (event: SpeechRecognitionErrorEvent) => void;
    onend: () => void;
    onstart: () => void;
}

interface SpeechRecognitionResultList {
    length: number;
    item(index: number): SpeechRecognitionResult;
    [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
    isFinal: boolean;
    length: number;
    item(index: number): SpeechRecognitionAlternative;
    [index: number]: SpeechRecognitionAlternative;
}

interface SpeechRecognitionAlternative {
    transcript: string;
    confidence: number;
}

export function VoiceInput({ onTranscript, disabled }: VoiceInputProps) {
    const [isListening, setIsListening] = useState(false);
    const [isSupported, setIsSupported] = useState(true);
    const [recognition, setRecognition] = useState<SpeechRecognition | null>(null);
    const [interimTranscript, setInterimTranscript] = useState("");

    useEffect(() => {
        // Check for browser support
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

        if (!SpeechRecognition) {
            setIsSupported(false);
            return;
        }

        const recognitionInstance = new SpeechRecognition();
        recognitionInstance.continuous = true;
        recognitionInstance.interimResults = true;
        recognitionInstance.lang = "en-US";

        recognitionInstance.onstart = () => {
            setIsListening(true);
        };

        recognitionInstance.onresult = (event: SpeechRecognitionEvent) => {
            let finalTranscript = "";
            let interim = "";

            for (let i = event.resultIndex; i < event.results.length; i++) {
                const result = event.results[i];
                if (result.isFinal) {
                    finalTranscript += result[0].transcript;
                } else {
                    interim += result[0].transcript;
                }
            }

            setInterimTranscript(interim);

            if (finalTranscript) {
                onTranscript(finalTranscript);
                setInterimTranscript("");
            }
        };

        recognitionInstance.onerror = (event: SpeechRecognitionErrorEvent) => {
            console.error("Speech recognition error:", event.error);

            if (event.error === "not-allowed") {
                toast.error("Microphone access denied. Please allow microphone access.");
            } else if (event.error === "no-speech") {
                toast("No speech detected. Try again.", { icon: "🎤" });
            } else {
                toast.error(`Voice error: ${event.error}`);
            }

            setIsListening(false);
            setInterimTranscript("");
        };

        recognitionInstance.onend = () => {
            setIsListening(false);
        };

        setRecognition(recognitionInstance);

        return () => {
            recognitionInstance.abort();
        };
    }, [onTranscript]);

    const toggleListening = useCallback(() => {
        if (!recognition) return;

        if (isListening) {
            recognition.stop();
            setIsListening(false);
            setInterimTranscript("");
        } else {
            try {
                recognition.start();
                toast("Listening... Speak now", { icon: "🎤", duration: 2000 });
            } catch (error) {
                console.error("Failed to start recognition:", error);
                toast.error("Failed to start voice input");
            }
        }
    }, [recognition, isListening]);

    if (!isSupported) {
        return (
            <Button
                variant="outline"
                size="icon"
                disabled
                title="Voice input not supported in this browser"
                className="border-zinc-200 dark:border-zinc-700 text-zinc-400"
            >
                <MicOff className="w-5 h-5" />
            </Button>
        );
    }

    return (
        <div className="relative">
            <Button
                variant="outline"
                size="icon"
                onClick={toggleListening}
                disabled={disabled}
                title={isListening ? "Stop listening" : "Start voice input"}
                className={`relative transition-all duration-300 ${isListening
                        ? "bg-red-50 dark:bg-red-500/10 border-red-300 dark:border-red-500/50 text-red-500 hover:bg-red-100 dark:hover:bg-red-500/20"
                        : "border-zinc-200 dark:border-zinc-700 text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-violet-500 dark:hover:text-violet-400"
                    }`}
            >
                {isListening ? (
                    <>
                        <Mic className="w-5 h-5 animate-pulse" />
                        {/* Pulsing ring animation */}
                        <span className="absolute inset-0 rounded-md animate-ping bg-red-400/20" />
                    </>
                ) : (
                    <Mic className="w-5 h-5" />
                )}
            </Button>

            {/* Interim transcript tooltip */}
            {interimTranscript && (
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-zinc-900 dark:bg-zinc-800 text-white text-sm rounded-lg shadow-lg max-w-[200px] whitespace-nowrap overflow-hidden text-ellipsis animate-in fade-in slide-in-from-bottom-2">
                    <div className="flex items-center gap-2">
                        <Loader2 className="w-3 h-3 animate-spin flex-shrink-0" />
                        <span className="truncate">{interimTranscript}</span>
                    </div>
                    {/* Arrow */}
                    <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-zinc-900 dark:border-t-zinc-800" />
                </div>
            )}
        </div>
    );
}
