import { NextRequest, NextResponse } from "next/server";
import { parsePDF } from "@/lib/pdf-parser";
import { chunkDocument } from "@/lib/chunking";
import { generateEmbeddings } from "@/lib/embeddings";
import { upsertVectors } from "@/lib/pinecone";
import type { IngestResponse } from "@/types";

/**
 * POST /api/ingest
 * 
 * Ingests a PDF file into the vector database:
 * 1. Parse PDF and extract text
 * 2. Split text into semantic chunks (1000 chars, 200 overlap)
 * 3. Generate embeddings using Google gemini-embedding-001 (768 dims)
 * 4. Upsert vectors to Pinecone with metadata
 */
export async function POST(request: NextRequest) {
    try {
        // Get the form data with the PDF file and session ID
        const formData = await request.formData();
        const file = formData.get("file") as File | null;
        const sessionId = formData.get("sessionId") as string | undefined;

        if (!file) {
            return NextResponse.json(
                { success: false, message: "No file provided" },
                { status: 400 }
            );
        }

        // Validate file type
        if (!file.type.includes("pdf")) {
            return NextResponse.json(
                { success: false, message: "File must be a PDF" },
                { status: 400 }
            );
        }

        // Convert file to buffer
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        // Step 1: Parse PDF
        console.log(`[Ingest] Parsing PDF: ${file.name} (Session: ${sessionId || "global"})`);
        const document = await parsePDF(buffer, file.name);
        console.log(`[Ingest] Extracted ${document.text.length} characters from ${document.pageCount} pages`);

        // Step 2: Chunk document
        console.log(`[Ingest] Chunking document...`);
        const chunks = await chunkDocument(document);
        console.log(`[Ingest] Created ${chunks.length} chunks`);

        // Step 3: Generate embeddings
        console.log(`[Ingest] Generating embeddings with gemini-embedding-001...`);
        const embeddings = await generateEmbeddings(chunks);
        console.log(`[Ingest] Generated ${embeddings.length} embeddings`);

        // Step 4: Upsert to Pinecone (using sessionId as namespace)
        console.log(`[Ingest] Upserting to Pinecone namespace: ${sessionId || "default"}...`);
        const upsertedCount = await upsertVectors(embeddings, sessionId);
        console.log(`[Ingest] Upserted ${upsertedCount} vectors`);

        const response: IngestResponse = {
            success: true,
            filename: file.name,
            chunksCreated: chunks.length,
            vectorsUpserted: upsertedCount,
            message: `Successfully ingested ${file.name}: ${chunks.length} chunks, ${upsertedCount} vectors`,
        };

        return NextResponse.json(response);
    } catch (error) {
        console.error("[Ingest] Error:", error);

        const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";

        return NextResponse.json(
            {
                success: false,
                message: `Ingestion failed: ${errorMessage}`,
            },
            { status: 500 }
        );
    }
}
