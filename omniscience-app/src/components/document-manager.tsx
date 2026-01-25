"use client";

import { useState, useEffect } from "react";
import toast from "react-hot-toast";
import { FileText, Trash2, RefreshCw, X, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";

interface Document {
    filename: string;
    chunks: number;
    uploadedAt?: string;
}

interface DocumentManagerProps {
    sessionId: string;
    isOpen: boolean;
    onClose: () => void;
}

export function DocumentManager({ sessionId, isOpen, onClose }: DocumentManagerProps) {
    const [documents, setDocuments] = useState<Document[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [deletingFile, setDeletingFile] = useState<string | null>(null);

    const fetchDocuments = async () => {
        if (!sessionId) return;

        setIsLoading(true);
        try {
            const response = await fetch(`/api/documents/list?sessionId=${sessionId}`);
            const data = await response.json();

            if (data.success) {
                setDocuments(data.documents);
            } else {
                console.error("Failed to fetch documents:", data.message);
            }
        } catch (error) {
            console.error("Error fetching documents:", error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (isOpen) {
            fetchDocuments();
        }
    }, [isOpen, sessionId]);

    const handleDelete = async (filename: string) => {
        setDeletingFile(filename);
        try {
            const response = await fetch("/api/documents/delete", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ filename, sessionId }),
            });

            const data = await response.json();

            if (data.success) {
                setDocuments(prev => prev.filter(d => d.filename !== filename));
                toast.success(`Deleted ${filename}`);
            } else {
                toast.error(`Failed to delete: ${data.message}`);
            }
        } catch (error) {
            toast.error("Error deleting document");
            console.error("Delete error:", error);
        } finally {
            setDeletingFile(null);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="relative bg-zinc-900 dark:bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-zinc-800">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-violet-500/10">
                            <FileText className="w-5 h-5 text-violet-400" />
                        </div>
                        <div>
                            <h2 className="text-lg font-semibold text-white">Document Manager</h2>
                            <p className="text-xs text-zinc-500">{documents.length} document{documents.length !== 1 ? 's' : ''} in session</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={fetchDocuments}
                            disabled={isLoading}
                            className="text-zinc-400 hover:text-white"
                        >
                            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                        </Button>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={onClose}
                            className="text-zinc-400 hover:text-white"
                        >
                            <X className="w-4 h-4" />
                        </Button>
                    </div>
                </div>

                {/* Content */}
                <ScrollArea className="max-h-[400px]">
                    <div className="p-4 space-y-2">
                        {isLoading ? (
                            <div className="flex flex-col items-center justify-center py-12 text-zinc-500">
                                <RefreshCw className="w-8 h-8 animate-spin mb-3" />
                                <p className="text-sm">Loading documents...</p>
                            </div>
                        ) : documents.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-12 text-zinc-500">
                                <FileText className="w-12 h-12 mb-3 opacity-50" />
                                <p className="text-sm font-medium">No documents uploaded</p>
                                <p className="text-xs mt-1">Upload PDFs to get started</p>
                            </div>
                        ) : (
                            documents.map((doc) => (
                                <div
                                    key={doc.filename}
                                    className="flex items-center justify-between p-3 rounded-xl bg-zinc-800/50 border border-zinc-800 hover:border-zinc-700 transition-colors group"
                                >
                                    <div className="flex items-center gap-3 min-w-0">
                                        <div className="p-2 rounded-lg bg-zinc-700/50">
                                            <FileText className="w-4 h-4 text-zinc-400" />
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-sm font-medium text-white truncate" title={doc.filename}>
                                                {doc.filename}
                                            </p>
                                            <p className="text-xs text-zinc-500">
                                                {doc.chunks} chunk{doc.chunks !== 1 ? 's' : ''} indexed
                                            </p>
                                        </div>
                                    </div>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => handleDelete(doc.filename)}
                                        disabled={deletingFile === doc.filename}
                                        className="opacity-0 group-hover:opacity-100 text-zinc-400 hover:text-red-400 hover:bg-red-500/10 transition-all"
                                    >
                                        {deletingFile === doc.filename ? (
                                            <RefreshCw className="w-4 h-4 animate-spin" />
                                        ) : (
                                            <Trash2 className="w-4 h-4" />
                                        )}
                                    </Button>
                                </div>
                            ))
                        )}
                    </div>
                </ScrollArea>

                {/* Footer */}
                {documents.length > 0 && (
                    <div className="p-4 border-t border-zinc-800 bg-zinc-900/50">
                        <p className="text-xs text-zinc-500 text-center">
                            Documents are stored in your session&apos;s private namespace
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}
