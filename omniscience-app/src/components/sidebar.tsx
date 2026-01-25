"use client";

import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ThemeToggle } from "./theme-toggle";
import { PlusCircle, MessageSquare, FileText, Trash2 } from "lucide-react";

interface Session {
    id: string;
    title: string;
    createdAt: string;
    files: string[];
}

interface SidebarProps {
    currentSessionId: string;
    sessions: Session[];
    onSessionChange: (sessionId: string) => void;
    onNewSession: () => void;
    onDeleteSession: (id: string) => void;
    onOpenDocumentManager?: () => void;
}

export function Sidebar({
    currentSessionId,
    sessions,
    onSessionChange,
    onNewSession,
    onDeleteSession,
    onOpenDocumentManager
}: SidebarProps) {
    const deleteSession = (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        onDeleteSession(id);
    };

    return (
        <div className="w-72 border-r border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950/50 backdrop-blur-xl flex flex-col h-screen fixed left-0 top-0 z-30">
            <div className="p-6">
                <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-cyan-500 flex items-center justify-center">
                            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                            </svg>
                        </div>
                        <h1 className="text-lg font-bold bg-gradient-to-r from-zinc-900 to-zinc-600 dark:from-white dark:to-zinc-400 bg-clip-text text-transparent">
                            Omniscience
                        </h1>
                    </div>
                    <ThemeToggle />
                </div>

                <Button
                    onClick={onNewSession}
                    className="w-full bg-violet-600 hover:bg-violet-700 text-white gap-2 justify-start px-4 h-11"
                >
                    <PlusCircle className="w-5 h-5" />
                    New Chat
                </Button>
            </div>

            <ScrollArea className="flex-1 px-4 pb-4">
                <div className="space-y-1">
                    <p className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest px-2 mb-2">History</p>
                    {sessions.length === 0 ? (
                        <p className="text-xs text-zinc-500 dark:text-zinc-600 px-3 py-4 italic">No previous chats</p>
                    ) : (
                        sessions.map((session) => (
                            <div
                                key={session.id}
                                onClick={() => onSessionChange(session.id)}
                                className={`group flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-all duration-200 ${session.id === currentSessionId
                                    ? "bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-lg"
                                    : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-900 hover:text-zinc-900 dark:hover:text-zinc-200"
                                    }`}
                            >
                                <MessageSquare className={`w-4 h-4 ${session.id === currentSessionId ? "text-violet-500 dark:text-violet-400" : "text-zinc-400 dark:text-zinc-600"}`} />
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium truncate">{session.title || "Untitled Chat"}</p>
                                    <p className="text-[10px] text-zinc-400 dark:text-zinc-600">{new Date(session.createdAt).toLocaleDateString()}</p>
                                </div>
                                <button
                                    onClick={(e) => deleteSession(e, session.id)}
                                    className="p-1.5 text-zinc-400 dark:text-zinc-500 hover:bg-zinc-200 dark:hover:bg-zinc-700 hover:text-red-500 dark:hover:text-red-400 rounded-md transition-all"
                                    title="Delete conversation"
                                >
                                    <Trash2 className="w-3.5 h-3.5" />
                                </button>
                            </div>
                        ))
                    )
                    }
                </div>
            </ScrollArea>

            <div className="p-4 border-t border-zinc-200 dark:border-zinc-800 space-y-1">
                <button
                    onClick={onOpenDocumentManager}
                    className="w-full flex items-center gap-3 px-3 py-2 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-900 hover:text-zinc-900 dark:hover:text-zinc-200 rounded-lg transition-all text-sm"
                >
                    <FileText className="w-4 h-4" />
                    Documents
                </button>
            </div>
        </div>
    );
}
