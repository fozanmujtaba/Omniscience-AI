import { Pinecone } from "@pinecone-database/pinecone";
import type { EmbeddingResult } from "@/types";

// Lazy-initialized Pinecone client (to avoid build-time errors)
let pineconeClient: Pinecone | null = null;

function getPinecone(): Pinecone {
    if (!pineconeClient) {
        const apiKey = process.env.PINECONE_API_KEY;
        if (!apiKey) {
            throw new Error("PINECONE_API_KEY environment variable is not set");
        }
        pineconeClient = new Pinecone({ apiKey });
    }
    return pineconeClient;
}

// Get index name from environment
const INDEX_NAME = process.env.PINECONE_INDEX || "omniscience";

// Batch size for upserts
const UPSERT_BATCH_SIZE = 100;

/**
 * Get the Pinecone index instance
 */
export function getIndex() {
    return getPinecone().index(INDEX_NAME);
}

/**
 * Upsert embedding vectors to Pinecone with metadata
 */
export async function upsertVectors(
    embeddings: EmbeddingResult[],
    namespace?: string
): Promise<number> {
    const index = getIndex();
    let upsertedCount = 0;

    // Process in batches
    for (let i = 0; i < embeddings.length; i += UPSERT_BATCH_SIZE) {
        const batch = embeddings.slice(i, i + UPSERT_BATCH_SIZE);

        const vectors = batch.map((embedding) => ({
            id: embedding.id,
            values: embedding.values,
            metadata: embedding.metadata,
        }));

        if (namespace) {
            await index.namespace(namespace).upsert(vectors);
        } else {
            await index.upsert(vectors);
        }

        upsertedCount += vectors.length;
    }

    return upsertedCount;
}

/**
 * Query vectors by similarity
 */
export async function queryVectors(
    queryVector: number[],
    topK: number = 5,
    filter?: Record<string, unknown>,
    namespace?: string
) {
    const index = getIndex();

    const queryOptions = {
        vector: queryVector,
        topK,
        includeMetadata: true,
        filter,
    };

    if (namespace) {
        return index.namespace(namespace).query(queryOptions);
    }

    return index.query(queryOptions);
}

/**
 * Delete vectors by filter (for document deletion)
 */
export async function deleteVectors(
    filter: Record<string, unknown>,
    namespace?: string
) {
    const index = getIndex();

    if (namespace) {
        await index.namespace(namespace).deleteMany(filter);
    } else {
        await index.deleteMany(filter);
    }
}

/**
 * Query vectors by namespace to list all documents
 * Uses a dummy query to retrieve documents with metadata
 */
export async function queryVectorsByMetadata(namespace: string) {
    const index = getIndex();

    // Create a dummy vector for listing (768 dimensions, matching the embedding output size)
    const dummyVector = new Array(768).fill(0);

    // Query with high topK to get all documents
    return index.namespace(namespace).query({
        vector: dummyVector,
        topK: 10000,
        includeMetadata: true,
    });
}

