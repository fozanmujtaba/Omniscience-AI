import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import type { PDFDocument, TextChunk, ChunkMetadata } from "@/types";
import { v4 as uuidv4 } from "uuid";

// Configuration as per requirements
const CHUNK_SIZE = 1000;
const CHUNK_OVERLAP = 200;

/**
 * Split PDF text into semantic chunks using RecursiveCharacterTextSplitter
 */
export async function chunkDocument(document: PDFDocument): Promise<TextChunk[]> {
    const splitter = new RecursiveCharacterTextSplitter({
        chunkSize: CHUNK_SIZE,
        chunkOverlap: CHUNK_OVERLAP,
        separators: ["\n\n", "\n", ". ", " ", ""],
    });

    const chunks = await splitter.splitText(document.text);
    const totalChunks = chunks.length;

    return chunks.map((text, index) => {
        const metadata: ChunkMetadata = {
            filename: document.filename,
            uploadDate: document.uploadDate,
            chunkIndex: index,
            totalChunks,
            pageCount: document.pageCount,
        };

        return {
            id: uuidv4(),
            text,
            metadata,
        };
    });
}
