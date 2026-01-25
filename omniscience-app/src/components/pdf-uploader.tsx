"use client";

import { useState, useCallback, useEffect } from "react";
import toast from "react-hot-toast";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FileText, X, Check, Loader2, Upload } from "lucide-react";

interface PDFUploaderProps {
    sessionId: string;
    onUploadComplete?: (filename: string, stats: { chunks: number; vectors: number }) => void;
}

interface FileUploadState {
    file: File;
    status: "pending" | "uploading" | "success" | "error";
    progress: string;
    chunks?: number;
}

export function PDFUploader({ sessionId, onUploadComplete }: PDFUploaderProps) {
    const [isDragging, setIsDragging] = useState(false);
    const [uploadQueue, setUploadQueue] = useState<FileUploadState[]>([]);
    const [uploadedFiles, setUploadedFiles] = useState<string[]>([]);
    const [isProcessing, setIsProcessing] = useState(false);

    // Reset files when switching sessions
    useEffect(() => {
        setUploadedFiles([]);
        setUploadQueue([]);
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
            addFilesToQueue(files);
        } else {
            toast.error("Please drop PDF files only");
        }
    }, []);

    const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []);
        if (files.length > 0) {
            addFilesToQueue(files);
        }
        // Reset input so same file can be selected again
        e.target.value = "";
    }, []);

    const addFilesToQueue = (files: File[]) => {
        const newFiles: FileUploadState[] = files
            .filter(file => !uploadedFiles.includes(file.name) && !uploadQueue.some(q => q.file.name === file.name))
            .map(file => ({
                file,
                status: "pending" as const,
                progress: "Waiting...",
            }));

        if (newFiles.length === 0) {
            toast.error("Files already added or uploaded");
            return;
        }

        setUploadQueue(prev => [...prev, ...newFiles]);
        toast.success(`Added ${newFiles.length} file${newFiles.length > 1 ? "s" : ""} to queue`);
    };

    const removeFromQueue = (filename: string) => {
        setUploadQueue(prev => prev.filter(f => f.file.name !== filename));
    };

    const processQueue = async () => {
        if (uploadQueue.length === 0) return;

        setIsProcessing(true);
        const filesToProcess = uploadQueue.filter(f => f.status === "pending");

        for (let i = 0; i < filesToProcess.length; i++) {
            const fileState = filesToProcess[i];
            const filename = fileState.file.name;

            // Update status to uploading
            setUploadQueue(prev =>
                prev.map(f =>
                    f.file.name === filename
                        ? { ...f, status: "uploading" as const, progress: `Processing (${i + 1}/${filesToProcess.length})...` }
                        : f
                )
            );

            try {
                const formData = new FormData();
                formData.append("file", fileState.file);
                formData.append("sessionId", sessionId);

                const response = await fetch("/api/ingest", {
                    method: "POST",
                    body: formData,
                });

                const result = await response.json();

                if (result.success) {
                    setUploadQueue(prev =>
                        prev.map(f =>
                            f.file.name === filename
                                ? { ...f, status: "success" as const, progress: `${result.chunksCreated} chunks`, chunks: result.chunksCreated }
                                : f
                        )
                    );
                    setUploadedFiles(prev => [...prev, filename]);
                    onUploadComplete?.(filename, {
                        chunks: result.chunksCreated,
                        vectors: result.vectorsUpserted,
                    });
                } else {
                    setUploadQueue(prev =>
                        prev.map(f =>
                            f.file.name === filename
                                ? { ...f, status: "error" as const, progress: result.message || "Failed" }
                                : f
                        )
                    );
                }
            } catch (error) {
                console.error("Upload error:", error);
                setUploadQueue(prev =>
                    prev.map(f =>
                        f.file.name === filename
                            ? { ...f, status: "error" as const, progress: "Upload failed" }
                            : f
                    )
                );
            }
        }

        setIsProcessing(false);

        // Show summary toast
        const successful = uploadQueue.filter(f => f.status === "success").length + filesToProcess.filter(f => {
            const updated = uploadQueue.find(u => u.file.name === f.file.name);
            return updated?.status === "success";
        }).length;

        if (successful > 0) {
            toast.success(`Successfully processed ${successful} file${successful > 1 ? "s" : ""}!`);
        }

        // Clear successful uploads from queue after delay
        setTimeout(() => {
            setUploadQueue(prev => prev.filter(f => f.status !== "success"));
        }, 2000);
    };

    const deleteFile = async (filename: string) => {
        try {
            toast.loading(`Deleting ${filename}...`, { id: `delete-${filename}` });
            const response = await fetch("/api/documents/delete", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ filename, sessionId }),
            });

            if (response.ok) {
                setUploadedFiles((prev) => prev.filter((f) => f !== filename));
                toast.success(`Removed ${filename}`, { id: `delete-${filename}` });
            } else {
                toast.error(`Failed to delete ${filename}`, { id: `delete-${filename}` });
            }
        } catch (error) {
            console.error("Delete error:", error);
            toast.error(`Error deleting ${filename}`, { id: `delete-${filename}` });
        }
    };

    const pendingCount = uploadQueue.filter(f => f.status === "pending").length;

    return (
        <Card
            className={`relative overflow-hidden border-2 border-dashed p-6 transition-all duration-300 bg-white dark:bg-transparent ${isDragging
                ? "border-violet-500 bg-violet-50 dark:bg-violet-500/5 scale-[1.02]"
                : "border-zinc-300 dark:border-zinc-700 hover:border-zinc-400 dark:hover:border-zinc-500"
                }`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
        >
            {/* Gradient background effect */}
            <div className="absolute inset-0 bg-gradient-to-br from-violet-500/5 dark:from-violet-500/10 via-transparent to-cyan-500/5 dark:to-cyan-500/10 pointer-events-none" />

            <div className="relative space-y-4">
                {/* Drop Zone Header */}
                <div className="text-center space-y-3">
                    <div className="mx-auto w-14 h-14 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center">
                        <Upload className="w-7 h-7 text-zinc-500 dark:text-zinc-400" />
                    </div>

                    <div>
                        <h3 className="text-base font-semibold text-zinc-900 dark:text-white">
                            {isDragging ? "Drop files here" : "Upload Documents"}
                        </h3>
                        <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
                            Drag & drop multiple PDFs or click to browse
                        </p>
                    </div>

                    <input
                        type="file"
                        accept=".pdf"
                        multiple
                        onChange={handleFileSelect}
                        className="hidden"
                        id="pdf-upload"
                        disabled={isProcessing}
                    />
                    <label htmlFor="pdf-upload">
                        <Button
                            variant="outline"
                            className="cursor-pointer"
                            disabled={isProcessing}
                            asChild
                        >
                            <span>Select Files</span>
                        </Button>
                    </label>
                </div>

                {/* Upload Queue */}
                {uploadQueue.length > 0 && (
                    <div className="space-y-2 pt-4 border-t border-zinc-200 dark:border-zinc-700">
                        <div className="flex items-center justify-between">
                            <p className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                                Upload Queue ({uploadQueue.length})
                            </p>
                            {pendingCount > 0 && !isProcessing && (
                                <Button
                                    size="sm"
                                    onClick={processQueue}
                                    className="bg-violet-600 hover:bg-violet-700 text-white h-7 text-xs"
                                >
                                    Process {pendingCount} file{pendingCount > 1 ? "s" : ""}
                                </Button>
                            )}
                        </div>

                        <div className="space-y-2 max-h-40 overflow-y-auto custom-scrollbar">
                            {uploadQueue.map((item, idx) => (
                                <div
                                    key={`${item.file.name}-${idx}`}
                                    className={`flex items-center gap-3 p-2 rounded-lg transition-colors ${item.status === "success"
                                            ? "bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20"
                                            : item.status === "error"
                                                ? "bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20"
                                                : item.status === "uploading"
                                                    ? "bg-violet-50 dark:bg-violet-500/10 border border-violet-200 dark:border-violet-500/20"
                                                    : "bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700"
                                        }`}
                                >
                                    {/* Status Icon */}
                                    <div className="flex-shrink-0">
                                        {item.status === "uploading" ? (
                                            <Loader2 className="w-4 h-4 text-violet-500 animate-spin" />
                                        ) : item.status === "success" ? (
                                            <Check className="w-4 h-4 text-emerald-500" />
                                        ) : item.status === "error" ? (
                                            <X className="w-4 h-4 text-red-500" />
                                        ) : (
                                            <FileText className="w-4 h-4 text-zinc-400" />
                                        )}
                                    </div>

                                    {/* File Info */}
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium text-zinc-700 dark:text-zinc-200 truncate">
                                            {item.file.name}
                                        </p>
                                        <p className={`text-xs ${item.status === "success" ? "text-emerald-600 dark:text-emerald-400" :
                                                item.status === "error" ? "text-red-600 dark:text-red-400" :
                                                    item.status === "uploading" ? "text-violet-600 dark:text-violet-400" :
                                                        "text-zinc-500"
                                            }`}>
                                            {item.progress}
                                        </p>
                                    </div>

                                    {/* Remove Button (only for pending) */}
                                    {item.status === "pending" && (
                                        <button
                                            onClick={() => removeFromQueue(item.file.name)}
                                            className="p-1 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded transition-colors"
                                        >
                                            <X className="w-3.5 h-3.5 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300" />
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Uploaded Files */}
                {uploadedFiles.length > 0 && (
                    <div className="flex flex-wrap gap-2 pt-4 border-t border-zinc-200 dark:border-zinc-700">
                        {uploadedFiles.map((filename, idx) => (
                            <Badge
                                key={idx}
                                variant="secondary"
                                className="group flex items-center gap-1.5 px-3 py-1.5 bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700 hover:border-zinc-300 dark:hover:border-zinc-500 transition-colors"
                            >
                                <FileText className="w-3.5 h-3.5 text-violet-500" />
                                <span className="truncate max-w-[120px]">{filename}</span>
                                <button
                                    onClick={() => deleteFile(filename)}
                                    className="ml-1 text-zinc-400 dark:text-zinc-500 hover:text-red-500 dark:hover:text-red-400 transition-colors"
                                    title="Delete document"
                                >
                                    <X className="w-3.5 h-3.5" />
                                </button>
                            </Badge>
                        ))}
                    </div>
                )}
            </div>
        </Card>
    );
}
