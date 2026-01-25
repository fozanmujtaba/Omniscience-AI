"use client";

import toast from "react-hot-toast";

interface Message {
    role: "user" | "assistant";
    content: string;
    sources?: Array<{ filename: string; chunkIndex: number; text: string }>;
}

/**
 * Export chat messages as Markdown
 */
export function exportAsMarkdown(messages: Message[], sessionTitle?: string): string {
    const title = sessionTitle || "Omniscience Chat";
    const date = new Date().toLocaleString();

    let markdown = `# ${title}\n\n`;
    markdown += `*Exported on ${date}*\n\n---\n\n`;

    for (const message of messages) {
        if (message.role === "user") {
            markdown += `## 🧑 You\n\n${message.content}\n\n`;
        } else {
            markdown += `## 🤖 Omniscience\n\n${message.content}\n\n`;

            if (message.sources && message.sources.length > 0) {
                markdown += `**Sources:**\n\n`;
                for (const source of message.sources) {
                    markdown += `- \`${source.filename}\` (Chunk ${source.chunkIndex})\n`;
                }
                markdown += "\n";
            }
        }
        markdown += "---\n\n";
    }

    return markdown;
}

/**
 * Export chat messages as JSON
 */
export function exportAsJSON(messages: Message[], sessionTitle?: string): string {
    return JSON.stringify({
        title: sessionTitle || "Omniscience Chat",
        exportedAt: new Date().toISOString(),
        messages: messages.map(m => ({
            role: m.role,
            content: m.content,
            sources: m.sources?.map(s => ({
                filename: s.filename,
                chunkIndex: s.chunkIndex,
            })),
        })),
    }, null, 2);
}

/**
 * Download file utility
 */
function downloadFile(content: string, filename: string, mimeType: string) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

/**
 * Export chat as Markdown file
 */
export function downloadMarkdown(messages: Message[], sessionTitle?: string) {
    if (messages.length === 0) {
        toast.error("No messages to export");
        return;
    }

    const markdown = exportAsMarkdown(messages, sessionTitle);
    const filename = `omniscience-chat-${Date.now()}.md`;
    downloadFile(markdown, filename, "text/markdown");
    toast.success("Chat exported as Markdown");
}

/**
 * Export chat as JSON file
 */
export function downloadJSON(messages: Message[], sessionTitle?: string) {
    if (messages.length === 0) {
        toast.error("No messages to export");
        return;
    }

    const json = exportAsJSON(messages, sessionTitle);
    const filename = `omniscience-chat-${Date.now()}.json`;
    downloadFile(json, filename, "application/json");
    toast.success("Chat exported as JSON");
}
