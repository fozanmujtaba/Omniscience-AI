import { GoogleGenerativeAI, type EmbedContentRequest } from "@google/generative-ai";
import type { TextChunk, EmbeddingResult } from "@/types";

// Initialize Gemini client
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY || "");

// gemini-embedding-001 replaced text-embedding-004, which Google retired.
// Its native size is 3072; truncating to 768 keeps the existing Pinecone index usable.
const EMBEDDING_MODEL = "gemini-embedding-001";
const EMBEDDING_DIMENSIONS = 768;

// Batch size for embedding requests
const BATCH_SIZE = 100;

/**
 * Generate embeddings for a single text
 */
export async function generateEmbedding(text: string): Promise<number[]> {
    const model = genAI.getGenerativeModel({ model: EMBEDDING_MODEL });
    // The SDK's EmbedContentRequest type predates outputDimensionality, but it
    // forwards the request body unchanged, so the field reaches the API.
    const request = {
        content: { role: "user", parts: [{ text }] },
        outputDimensionality: EMBEDDING_DIMENSIONS,
    } as EmbedContentRequest;
    const result = await model.embedContent(request);
    return result.embedding.values;
}

/**
 * Generate embeddings for multiple text chunks in batches
 */
export async function generateEmbeddings(
    chunks: TextChunk[]
): Promise<EmbeddingResult[]> {
    const results: EmbeddingResult[] = [];

    // Process in batches to avoid rate limits
    for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
        const batch = chunks.slice(i, i + BATCH_SIZE);

        const batchPromises = batch.map(async (chunk) => {
            const values = await generateEmbedding(chunk.text);
            return {
                id: chunk.id,
                values,
                metadata: {
                    ...chunk.metadata,
                    text: chunk.text,
                },
            };
        });

        const batchResults = await Promise.all(batchPromises);
        results.push(...batchResults);
    }

    return results;
}
