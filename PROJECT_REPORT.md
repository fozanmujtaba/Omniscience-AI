# Project Report: Omniscience AI
## An Intelligent Knowledge Base Powered by RAG


---

## 1. Abstract
**Omniscience AI** is a professional-grade Retrieval-Augmented Generation (RAG) system designed to serve as a "Second Brain." It empowers users to upload complex PDF documents and interact with them through an intelligent chat interface. By grounding Large Language Model (LLM) responses in specific, verified documentation, the system eliminates hallucinations and provides cited, reliable information. The project leverages state-of-the-art technologies including Next.js 16, Pinecone Vector Database, and high-dimensional embeddings.

## 2. Introduction
In an era of information overload, managing and extracting insights from vast quantities of documents is a significant challenge. Traditional search methods are keyword-based and often fail to capture semantic meaning. Omniscience AI addresses this by implementing a RAG pipeline that transforms static documents into a dynamic, searchable knowledge base. This project focuses on accuracy, speed, and user experience, providing a seamless bridge between raw data and actionable intelligence.

## 3. Technology Stack
The system is built using a modern, scalable stack:
- **Frontend Framework:** Next.js 16 with TypeScript for type-safe, server-side rendered application logic.
- **Styling:** Tailwind CSS 4 and shadcn/ui for a premium, responsive user interface.
- **Vector Database:** Pinecone for high-performance semantic search and storage of document embeddings.
- **Embedding Model:** Google Gemini `text-embedding-004` (768 dimensions) for superior semantic representation.
- **Large Language Model (LLM):** Groq (Llama 3.3 70B) for ultra-fast, high-quality response generation.
- **Document Processing:** LangChain Recursive Character Text Splitter for intelligent chunking.

## 4. System Architecture
The system follows a two-stage pipeline architecture:

### 4.1 Ingestion Pipeline (Data to Vector)
1.  **PDF Parsing:** Extracts raw text from uploaded PDF documents.
2.  **Semantic Chunking:** Text is split into overlapping chunks (1000 characters with 200 character overlap) to preserve context.
3.  **Vectorization:** Each chunk is converted into a 768-dimensional vector using Google Gemini's embedding model.
4.  **Upsertion:** Vectors and metadata (filename, page number, original text) are stored in the Pinecone Vector Database.

### 4.2 Retrieval & Generation Pipeline (Query to Answer)
1.  **Query Embedding:** The user's question is converted into a vector representation.
2.  **Vector Search:** Pinecone performs a similarity search to find the most relevant document chunks.
3.  **Context Construction:** The system retrieves top-k results and constructs a rich context window.
4.  **Prompt Engineering:** A system prompt instructs the LLM to answer strictly based on the provided context.
5.  **Generation:** Groq Llama 3.3 generates a natural language response with source citations.

## 5. Implementation Highlights
- **`chunking.ts`**: Implements specialized logic to ensure document segments are small enough for LLM context windows but large enough to maintain semantic meaning.
- **`embeddings.ts`**: Manages batch processing of text-to-vector conversions to handle large documents efficiently.
- **`pinecone.ts`**: Handles complex vector operations, including namespace management and metadata filtering.
- **Voice Integration**: Implements Web Speech API for hands-free query input.
- **Persistence**: Supports exporting conversations in Markdown or JSON for academic archiving.

## 6. Features & User Experience
- **Smart Suggestions**: Analyzes current context to suggest relevant follow-up questions.
- **Premium UI**: Dark/Light mode support with a focus on typography and readability.
- **Real-time Processing**: Streaming completions for an interactive, responsive feel.
- **Security**: Environment variable-based API key management for production safety.

## 7. Conclusion
Omniscience AI successfully demonstrates the power of RAG in creating reliable, document-grounded AI applications. By combining high-performance vector search with advanced LLMs, the project provides a robust solution for personal and professional knowledge management. Future iterations will explore multi-modal support (images/videos) and multi-agent collaborative search.

---
*This project was developed as part of the end-semester requirements for [Course Name].*
