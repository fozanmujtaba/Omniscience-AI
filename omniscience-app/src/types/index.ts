// Type definitions for Omniscience RAG system

export interface PDFDocument {
  filename: string;
  text: string;
  uploadDate: string;
  pageCount: number;
}

export interface TextChunk {
  id: string;
  text: string;
  metadata: ChunkMetadata;
}

// Index signature makes this compatible with Pinecone's RecordMetadata
export interface ChunkMetadata {
  [key: string]: string | number;
  filename: string;
  uploadDate: string;
  chunkIndex: number;
  totalChunks: number;
  pageCount: number;
}

export interface EmbeddingResult {
  id: string;
  values: number[];
  metadata: ChunkMetadata & { text: string };
}

export interface IngestResponse {
  success: boolean;
  filename: string;
  chunksCreated: number;
  vectorsUpserted: number;
  message: string;
}

export interface SearchResult {
  id: string;
  score: number;
  text: string;
  metadata: ChunkMetadata;
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}
