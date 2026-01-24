import { NextRequest } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { generateEmbedding } from "@/lib/embeddings";
import { queryVectors } from "@/lib/pinecone";
import { formatContext, buildPrompt } from "@/lib/prompts";

// Initialize Gemini for chat
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY || "");

interface ChatRequest {
    message: string;
    topK?: number;
}

/**
 * POST /api/chat
 * 
 * RAG chat endpoint:
 * 1. Retrieve relevant document chunks
 * 2. Build prompt with strict RAG system instructions
 * 3. Stream response from Gemini 1.5 Pro
 */
export async function POST(request: NextRequest) {
    try {
        const body: ChatRequest = await request.json();
        const { message, topK = 5 } = body;

        if (!message || message.trim().length === 0) {
            return new Response(
                JSON.stringify({ success: false, message: "Message is required" }),
                { status: 400, headers: { "Content-Type": "application/json" } }
            );
        }

        // Step 1: Retrieve relevant context
        console.log(`[Chat] Retrieving context for: "${message}"`);
        const queryVector = await generateEmbedding(message);
        const queryResult = await queryVectors(queryVector, topK);

        const chunks = (queryResult.matches || []).map((match) => ({
            text: (match.metadata?.text as string) || "",
            metadata: {
                filename: (match.metadata?.filename as string) || "",
                chunkIndex: (match.metadata?.chunkIndex as number) || 0,
            },
        }));

        console.log(`[Chat] Retrieved ${chunks.length} context chunks`);

        // Step 2: Build the prompt
        const context = formatContext(chunks);
        const prompt = buildPrompt(context, message);

        // Step 3: Generate response with Gemini 1.5 Pro
        console.log(`[Chat] Generating response with Gemini 1.5 Flash...`);
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

        const result = await model.generateContentStream(prompt);

        // Step 4: Stream the response
        const encoder = new TextEncoder();
        const stream = new ReadableStream({
            async start(controller) {
                try {
                    // Send sources metadata first
                    const sourcesData = JSON.stringify({
                        type: "sources",
                        sources: chunks.map((c) => ({
                            filename: c.metadata.filename,
                            chunkIndex: c.metadata.chunkIndex,
                        })),
                    });
                    controller.enqueue(encoder.encode(`data: ${sourcesData}\n\n`));

                    // Stream text chunks
                    for await (const chunk of result.stream) {
                        const text = chunk.text();
                        if (text) {
                            const data = JSON.stringify({ type: "text", content: text });
                            controller.enqueue(encoder.encode(`data: ${data}\n\n`));
                        }
                    }

                    // Send done signal
                    controller.enqueue(encoder.encode(`data: {"type": "done"}\n\n`));
                    controller.close();
                } catch (error) {
                    console.error("[Chat] Stream error:", error);
                    const errorData = JSON.stringify({
                        type: "error",
                        message: error instanceof Error ? error.message : "Stream error",
                    });
                    controller.enqueue(encoder.encode(`data: ${errorData}\n\n`));
                    controller.close();
                }
            },
        });

        return new Response(stream, {
            headers: {
                "Content-Type": "text/event-stream",
                "Cache-Control": "no-cache",
                Connection: "keep-alive",
            },
        });
    } catch (error) {
        console.error("[Chat] Error:", error);

        const errorMessage = error instanceof Error ? error.message : "Unknown error";

        return new Response(
            JSON.stringify({ success: false, message: `Chat failed: ${errorMessage}` }),
            { status: 500, headers: { "Content-Type": "application/json" } }
        );
    }
}
