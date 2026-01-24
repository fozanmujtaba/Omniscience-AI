"use client";

import { useState, useCallback, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface PDFUploaderProps {
    sessionId: string;
    onUploadComplete?: (filename: string, stats: { chunks: number; vectors: number }) => void;
}

export function PDFUploader({ sessionId, onUploadComplete }: PDFUploaderProps) {
    const [isDragging, setIsDragging] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState<string>("");
    const [uploadedFiles, setUploadedFiles] = useState<string[]>([]);

    // Reset files when switching sessions
    useEffect(() => {
        setUploadedFiles([]);
        setUploadProgress("");
    }, [sessionId]);

    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    }, []);

    const handleDragLeave = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
    }, []);

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        const files = Array.from(e.dataTransfer.files).filter(
            (file) => file.type === "application/pdf"
        );
        if (files.length > 0) {
            uploadFiles(files);
        }
    }, []);

    const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []);
        if (files.length > 0) {
            uploadFiles(files);
        }
    }, []);

    const deleteFile = async (filename: string) => {
        try {
            setUploadProgress(`Deleting ${filename}...`);
            const response = await fetch("/api/documents/delete", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ filename, sessionId }),
            });

            if (response.ok) {
                setUploadedFiles((prev) => prev.filter((f) => f !== filename));
                setUploadProgress(`✓ Removed ${filename}`);
            } else {
                setUploadProgress(`✗ Failed to delete ${filename}`);
            }
        } catch (error) {
            console.error("Delete error:", error);
            setUploadProgress(`✗ Error deleting ${filename}`);
        }
        setTimeout(() => setUploadProgress(""), 3000);
    };

    const uploadFiles = async (files: File[]) => {
        setIsUploading(true);

        for (const file of files) {
            try {
                setUploadProgress(`Uploading ${file.name}...`);

                const formData = new FormData();
                formData.append("file", file);
                formData.append("sessionId", sessionId);

                const response = await fetch("/api/ingest", {
                    method: "POST",
                    body: formData,
                });

                const result = await response.json();

                if (result.success) {
                    setUploadedFiles((prev) => [...prev, file.name]);
                    setUploadProgress(`✓ ${file.name} — ${result.chunksCreated} chunks indexed`);
                    onUploadComplete?.(file.name, {
                        chunks: result.chunksCreated,
                        vectors: result.vectorsUpserted,
                    });
                } else {
                    setUploadProgress(`✗ ${file.name} — ${result.message}`);
                }
            } catch (error) {
                setUploadProgress(`✗ ${file.name} — Upload failed`);
                console.error("Upload error:", error);
            }
        }

        setIsUploading(false);
        setTimeout(() => setUploadProgress(""), 3000);
    };

    return (
        <Card
            className={`relative overflow-hidden border-2 border-dashed p-8 transition-all duration-300 ${isDragging
                ? "border-primary bg-primary/5 scale-[1.02]"
                : "border-zinc-700 hover:border-zinc-500"
                }`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
        >
            {/* Gradient background effect */}
            <div className="absolute inset-0 bg-gradient-to-br from-violet-500/10 via-transparent to-cyan-500/10 pointer-events-none" />

            <div className="relative text-center space-y-4">
                <div className="mx-auto w-16 h-16 rounded-full bg-zinc-800 flex items-center justify-center">
                    <svg
                        className="w-8 h-8 text-zinc-400"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                        />
                    </svg>
                </div>

                <div>
                    <h3 className="text-lg font-semibold text-white">
                        {isUploading ? "Processing..." : "Upload Documents"}
                    </h3>
                    <p className="text-sm text-zinc-400 mt-1">
                        Drag & drop PDFs or click to browse
                    </p>
                </div>

                <input
                    type="file"
                    accept=".pdf"
                    multiple
                    onChange={handleFileSelect}
                    className="hidden"
                    id="pdf-upload"
                    disabled={isUploading}
                />
                <label htmlFor="pdf-upload">
                    <Button
                        variant="outline"
                        className="cursor-pointer"
                        disabled={isUploading}
                        asChild
                    >
                        <span>{isUploading ? "Uploading..." : "Select Files"}</span>
                    </Button>
                </label>

                {uploadProgress && (
                    <p className="text-sm text-zinc-300 animate-pulse">{uploadProgress}</p>
                )}

                {uploadedFiles.length > 0 && (
                    <div className="flex flex-wrap gap-2 justify-center mt-4">
                        {uploadedFiles.map((filename, idx) => (
                            <Badge key={idx} variant="secondary" className="group flex items-center gap-1.5 px-3 py-1 bg-zinc-800 text-zinc-300 border-zinc-700 hover:border-zinc-500 transition-colors">
                                📄 {filename}
                                <button
                                    onClick={() => deleteFile(filename)}
                                    className="ml-1 text-zinc-500 hover:text-red-400 transition-colors"
                                    title="Delete document"
                                >
                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </Badge>
                        ))}
                    </div>
                )}
            </div>
        </Card>
    );
}
