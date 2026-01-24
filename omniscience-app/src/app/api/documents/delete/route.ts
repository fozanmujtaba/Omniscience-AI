import { NextRequest, NextResponse } from "next/server";
import { deleteVectors } from "@/lib/pinecone";

/**
 * POST /api/documents/delete
 * 
 * Deletes all vectors associated with a specific filename
 */
export async function POST(request: NextRequest) {
    try {
        const { filename, sessionId } = await request.json();

        if (!filename) {
            return NextResponse.json(
                { success: false, message: "Filename is required" },
                { status: 400 }
            );
        }

        console.log(`[Delete] Removing document: ${filename} from namespace: ${sessionId || "default"}`);

        // Pinecone delete by metadata filter (scoped to namespace)
        await deleteVectors({ filename: { $eq: filename } }, sessionId);

        return NextResponse.json({
            success: true,
            message: `Successfully deleted document: ${filename}`,
        });
    } catch (error) {
        console.error("[Delete] Error:", error);
        return NextResponse.json(
            {
                success: false,
                message: `Failed to delete document: ${error instanceof Error ? error.message : "Unknown error"}`,
            },
            { status: 500 }
        );
    }
}
