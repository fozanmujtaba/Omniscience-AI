import { NextRequest } from "next/server";
import { queryVectorsByMetadata } from "@/lib/pinecone";

/**
 * GET /api/documents/list
 * 
 * Lists all unique documents in a session's namespace
 */
export async function GET(request: NextRequest) {
    try {
        const sessionId = request.nextUrl.searchParams.get("sessionId");

        if (!sessionId) {
            return new Response(
                JSON.stringify({ success: false, message: "Session ID is required" }),
                { status: 400, headers: { "Content-Type": "application/json" } }
            );
        }

        // Query vectors to get unique filenames
        const results = await queryVectorsByMetadata(sessionId);

        // Extract unique filenames with counts
        const fileMap = new Map<string, { filename: string; chunks: number; uploadedAt?: string }>();

        for (const match of results.matches || []) {
            const filename = match.metadata?.filename as string;
            if (filename) {
                const existing = fileMap.get(filename);
                if (existing) {
                    existing.chunks += 1;
                } else {
                    fileMap.set(filename, {
                        filename,
                        chunks: 1,
                        uploadedAt: match.metadata?.uploadedAt as string || undefined,
                    });
                }
            }
        }

        const documents = Array.from(fileMap.values());

        return new Response(
            JSON.stringify({
                success: true,
                documents,
                total: documents.length,
            }),
            { status: 200, headers: { "Content-Type": "application/json" } }
        );
    } catch (error) {
        console.error("[Documents List] Error:", error);
        return new Response(
            JSON.stringify({
                success: false,
                message: error instanceof Error ? error.message : "Failed to list documents",
            }),
            { status: 500, headers: { "Content-Type": "application/json" } }
        );
    }
}
