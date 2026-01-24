"use client";

import { X, FileText, Quote } from "lucide-react";

interface SourcePreviewModalProps {
    isOpen: boolean;
    onClose: () => void;
    source: {
        filename: string;
        chunkIndex: number;
        text: string;
    } | null;
}

export function SourcePreviewModal({ isOpen, onClose, source }: SourcePreviewModalProps) {
    if (!isOpen || !source) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="relative w-full max-w-2xl bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl shadow-black/50 overflow-hidden animate-in zoom-in-95 duration-300">
                <div className="flex items-center justify-between p-4 border-b border-zinc-800 bg-zinc-900/50">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-violet-500/10 text-violet-400">
                            <FileText className="w-5 h-5" />
                        </div>
                        <div>
                            <h3 className="text-sm font-semibold text-white truncate max-w-[400px]">
                                {source.filename}
                            </h3>
                            <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold">
                                Source Chunk #{source.chunkIndex}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-zinc-800 rounded-full transition-colors text-zinc-400 hover:text-white"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-6 overflow-y-auto max-h-[60vh] custom-scrollbar">
                    <div className="relative">
                        <Quote className="absolute -top-2 -left-2 w-8 h-8 text-zinc-800/50 -z-10" />
                        <div className="text-zinc-300 text-sm leading-relaxed whitespace-pre-wrap font-serif">
                            {source.text}
                        </div>
                    </div>
                </div>

                <div className="p-4 bg-zinc-950/50 border-t border-zinc-800 text-[10px] text-zinc-500 flex justify-between">
                    <span>Grounding Verification Mode</span>
                    <span>Provided by Pinecone RAG</span>
                </div>
            </div>
        </div>
    );
}
