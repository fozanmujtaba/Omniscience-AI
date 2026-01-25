"use client";

import { useState, useEffect } from "react";
import { v4 as uuidv4 } from "uuid";
import { PDFUploader } from "@/components/pdf-uploader";
import { ChatInterface } from "@/components/chat-interface";
import { Sidebar } from "@/components/sidebar";
import { DocumentManager } from "@/components/document-manager";

interface Session {
  id: string;
  title: string;
  createdAt: string;
  files: string[];
}

export default function Home() {
  const [sessionId, setSessionId] = useState<string>("");
  const [sessions, setSessions] = useState<Session[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isDocumentManagerOpen, setIsDocumentManagerOpen] = useState(false);

  useEffect(() => {
    // Initialize sessions and current session
    const savedSessions = localStorage.getItem("omniscience_sessions");
    const initialSessions = savedSessions ? JSON.parse(savedSessions) : [];
    setSessions(initialSessions);

    const lastSessionId = localStorage.getItem("omniscience_last_session");
    if (lastSessionId && initialSessions.find((s: Session) => s.id === lastSessionId)) {
      setSessionId(lastSessionId);
    } else if (initialSessions.length > 0) {
      setSessionId(initialSessions[0].id);
    } else {
      handleNewSession();
    }
    setIsLoaded(true);
  }, []);

  const handleNewSession = () => {
    const newId = uuidv4();
    const newSession = {
      id: newId,
      title: "New Conversation",
      createdAt: new Date().toISOString(),
      files: []
    };
    const updated = [newSession, ...sessions];
    setSessions(updated);
    setSessionId(newId);
    localStorage.setItem("omniscience_sessions", JSON.stringify(updated));
    localStorage.setItem("omniscience_last_session", newId);
  };

  const handleSessionChange = (id: string) => {
    setSessionId(id);
    localStorage.setItem("omniscience_last_session", id);
  };

  const handleDeleteSession = (id: string) => {
    const updated = sessions.filter(s => s.id !== id);
    setSessions(updated);
    localStorage.setItem("omniscience_sessions", JSON.stringify(updated));
    if (id === sessionId) {
      if (updated.length > 0) {
        setSessionId(updated[0].id);
      } else {
        handleNewSession();
      }
    }
  };

  const handleFirstMessage = (message: string) => {
    const updated = sessions.map(s => {
      if (s.id === sessionId && (s.title === "New Conversation" || !s.title)) {
        return { ...s, title: message.length > 30 ? message.substring(0, 30) + "..." : message };
      }
      return s;
    });
    setSessions(updated);
    localStorage.setItem("omniscience_sessions", JSON.stringify(updated));
  };

  if (!isLoaded) return <div className="min-h-screen bg-white dark:bg-zinc-950" />;

  return (
    <div className="bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-white font-[family-name:var(--font-geist-sans)] min-h-screen">
      <Sidebar
        currentSessionId={sessionId}
        sessions={sessions}
        onSessionChange={handleSessionChange}
        onNewSession={handleNewSession}
        onDeleteSession={handleDeleteSession}
        onOpenDocumentManager={() => setIsDocumentManagerOpen(true)}
      />

      <main className="ml-72 min-h-screen">
        {/* Animated gradient background */}
        <div className="fixed inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-1/2 -left-1/2 w-full h-full bg-gradient-radial from-violet-500/5 dark:from-violet-900/10 via-transparent to-transparent animate-pulse" />
          <div className="absolute -bottom-1/2 -right-1/2 w-full h-full bg-gradient-radial from-cyan-500/5 dark:from-cyan-900/10 via-transparent to-transparent animate-pulse" style={{ animationDelay: "1s" }} />
        </div>

        <div className="relative z-10 p-8 max-w-6xl mx-auto pb-24">
          {/* Header Info */}
          <div className="flex items-center justify-between mb-12">
            <div>
              <h2 className="text-2xl font-bold text-zinc-900 dark:text-white">Knowledge Workspace</h2>
              <p className="text-zinc-500 text-sm mt-1">Session: <span className="font-mono text-zinc-600 dark:text-zinc-400">{sessionId.split('-')[0]}...</span></p>
            </div>
            <div className="flex items-center gap-6">
              <div className="text-right">
                <p className="text-xs text-zinc-500 uppercase tracking-widest font-bold">Model</p>
                <p className="text-sm text-zinc-700 dark:text-zinc-300">Llama 3.3 70B <span className="text-zinc-500">(Groq)</span></p>
              </div>
              <div className="text-right">
                <p className="text-xs text-zinc-500 uppercase tracking-widest font-bold">Storage</p>
                <p className="text-sm text-zinc-700 dark:text-zinc-300">Pinecone Vector DB</p>
              </div>
            </div>
          </div>

          <div className="grid lg:grid-cols-12 gap-8 items-start">
            {/* Left Column: Upload & Context */}
            <div className="lg:col-span-5 space-y-8">
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-md bg-violet-500/20 flex items-center justify-center text-violet-600 dark:text-violet-400 text-xs font-bold">1</div>
                  <h3 className="font-semibold text-zinc-700 dark:text-zinc-200">Session Knowledge</h3>
                </div>
                <PDFUploader sessionId={sessionId} />
              </div>

              <div className="p-6 rounded-2xl bg-white dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-800 backdrop-blur-sm shadow-sm dark:shadow-none">
                <h4 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-4">Isolated Retrieval</h4>
                <p className="text-xs text-zinc-500 leading-relaxed">
                  This session uses a dedicated namespace. Questions asked here will only search documents uploaded above.
                  Switching sessions provides a clean slate.
                </p>
                <div className="mt-4 flex flex-wrap gap-2 text-[10px] uppercase font-bold text-zinc-500 dark:text-zinc-600">
                  <span className="px-2 py-1 rounded bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700">AES-256</span>
                  <span className="px-2 py-1 rounded bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700">PII Redaction</span>
                  <span className="px-2 py-1 rounded bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700">Citations</span>
                </div>
              </div>
            </div>

            {/* Right Column: Chat Interface */}
            <div className="lg:col-span-7">
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-md bg-cyan-500/20 flex items-center justify-center text-cyan-600 dark:text-cyan-400 text-xs font-bold">2</div>
                  <h3 className="font-semibold text-zinc-700 dark:text-zinc-200">Intelligent Analysis</h3>
                </div>
                <ChatInterface sessionId={sessionId} onFirstMessage={handleFirstMessage} />
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Document Manager Modal */}
      <DocumentManager
        sessionId={sessionId}
        isOpen={isDocumentManagerOpen}
        onClose={() => setIsDocumentManagerOpen(false)}
      />
    </div>
  );
}
