import { NextRequest, NextResponse } from "next/server";
import { generateEmbedding } from "@/lib/embeddings";
import { queryVectors } from "@/lib/pinecone";
import type { SearchResult } from "@/types";

interface SearchRequest {
    query: string;
    topK?: number;
    filters?: {
        filename?: string;
        uploadDateAfter?: string;
        uploadDateBefore?: string;
    };
}

interface SearchResponse {
    success: boolean;
    results: SearchResult[];
    query: string;
    totalResults: number;
}

/**
 * POST /api/search
 * 
 * Hybrid search combining vector similarity with metadata filtering:
 * 1. Generate query embedding
 * 2. Query Pinecone with optional metadata filters
 * 3. Return ranked results with source information
 */
export async function POST(request: NextRequest) {
    try {
        const body: SearchRequest = await request.json();
        const { query, topK = 5, filters } = body;

        if (!query || query.trim().length === 0) {
            return NextResponse.json(
                { success: false, message: "Query is required" },
                { status: 400 }
            );
        }

        // Step 1: Generate embedding for the query
        console.log(`[Search] Generating embedding for: "${query}"`);
        const queryVector = await generateEmbedding(query);

        // Step 2: Build Pinecone filter from metadata filters
        const pineconeFilter = buildFilter(filters);
        console.log(`[Search] Filter:`, pineconeFilter);

        // Step 3: Query Pinecone
        console.log(`[Search] Querying Pinecone for top ${topK} results...`);
        const queryResult = await queryVectors(queryVector, topK, pineconeFilter);

        // Step 4: Transform results
        const results: SearchResult[] = (queryResult.matches || []).map((match) => ({
            id: match.id,
            score: match.score || 0,
            text: (match.metadata?.text as string) || "",
            metadata: {
                filename: (match.metadata?.filename as string) || "",
                uploadDate: (match.metadata?.uploadDate as string) || "",
                chunkIndex: (match.metadata?.chunkIndex as number) || 0,
                totalChunks: (match.metadata?.totalChunks as number) || 0,
                pageCount: (match.metadata?.pageCount as number) || 0,
            },
        }));

        console.log(`[Search] Found ${results.length} results`);

        const response: SearchResponse = {
            success: true,
            results,
            query,
            totalResults: results.length,
        };

        return NextResponse.json(response);
    } catch (error) {
        console.error("[Search] Error:", error);

        const errorMessage = error instanceof Error ? error.message : "Unknown error";

        return NextResponse.json(
            { success: false, message: `Search failed: ${errorMessage}` },
            { status: 500 }
        );
    }
}

/**
 * Build Pinecone metadata filter from search filters
 */
function buildFilter(
    filters?: SearchRequest["filters"]
): Record<string, unknown> | undefined {
    if (!filters) return undefined;

    const conditions: Record<string, unknown>[] = [];

    // Filename exact match
    if (filters.filename) {
        conditions.push({ filename: { $eq: filters.filename } });
    }

    // Upload date range filters
    if (filters.uploadDateAfter) {
        conditions.push({ uploadDate: { $gte: filters.uploadDateAfter } });
    }

    if (filters.uploadDateBefore) {
        conditions.push({ uploadDate: { $lte: filters.uploadDateBefore } });
    }

    // Return combined filter or undefined
    if (conditions.length === 0) return undefined;
    if (conditions.length === 1) return conditions[0];

    return { $and: conditions };
}
