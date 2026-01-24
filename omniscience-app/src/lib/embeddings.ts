import { GoogleGenerativeAI } from "@google/generative-ai";
import type { TextChunk, EmbeddingResult } from "@/types";

// Initialize Gemini client
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY || "");

// Using text-embedding-004 for high-dimensional semantic accuracy
const EMBEDDING_MODEL = "text-embedding-004";

// Batch size for embedding requests
const BATCH_SIZE = 100;

/**
 * Generate embeddings for a single text
 */
export async function generateEmbedding(text: string): Promise<number[]> {
    const model = genAI.getGenerativeModel({ model: EMBEDDING_MODEL });
    const result = await model.embedContent(text);
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
