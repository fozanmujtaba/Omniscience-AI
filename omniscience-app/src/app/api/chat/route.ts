import { NextRequest } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { generateEmbedding } from "@/lib/embeddings";
import { queryVectors } from "@/lib/pinecone";
import { formatContext, buildPrompt } from "@/lib/prompts";

// Initialize Gemini for chat
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY || "");

interface ChatRequest {
    message: string;
    sessionId?: string;
    history?: Array<{ role: "user" | "model"; parts: { text: string }[] }>;
    topK?: number;
}

/**
 * POST /api/chat
 * 
 * RAG chat endpoint:
 * 1. Retrieve relevant document chunks from the session's namespace
 * 2. Build system instruction with context
 * 3. Start a chat session with Gemini for conversational memory
 * 4. Stream response
 */
export async function POST(request: NextRequest) {
    try {
        const body: ChatRequest = await request.json();
        const { message, sessionId, history = [], topK = 5 } = body;

        if (!message || message.trim().length === 0) {
            return new Response(
                JSON.stringify({ success: false, message: "Message is required" }),
                { status: 400, headers: { "Content-Type": "application/json" } }
            );
        }

        // Step 1: Retrieve relevant context (filtered by session namespace)
        console.log(`[Chat] Retrieving context for: "${message}" in namespace: ${sessionId || "default"}`);
        const queryVector = await generateEmbedding(message);
        const queryResult = await queryVectors(queryVector, topK, undefined, sessionId);

        const chunks = (queryResult.matches || []).map((match) => ({
            text: (match.metadata?.text as string) || "",
            metadata: {
                filename: (match.metadata?.filename as string) || "",
                chunkIndex: (match.metadata?.chunkIndex as number) || 0,
            },
        }));

        console.log(`[Chat] Retrieved ${chunks.length} context chunks`);

        // Step 2: Build the system instruction
        const context = formatContext(chunks);
        const systemInstruction = buildPrompt(context, message);

        // Step 3: Generate response with Gemini Pro
        console.log(`[Chat] Generating response with Gemini Flash...`);
        const model = genAI.getGenerativeModel({
            model: "gemini-flash-latest",
            systemInstruction: {
                role: "system",
                parts: [{ text: systemInstruction }]
            }
        });

        // Start chat with history
        const chat = model.startChat({
            history: history.length > 0 ? history : [],
        });

        const result = await chat.sendMessageStream(message);

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
                            text: c.text, // Include text for instant preview
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
        console.error("[Chat] Top-level error:", error);

        // Detailed error logging
        if (error instanceof Error) {
            console.error(`[Chat] Error Name: ${error.name}`);
            console.error(`[Chat] Error Message: ${error.message}`);
            console.error(`[Chat] Stack Trace: ${error.stack}`);
        }

        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        const isQuotaExceeded = errorMessage.includes("429") || errorMessage.includes("Quota exceeded");

        return new Response(
            JSON.stringify({
                success: false,
                message: isQuotaExceeded
                    ? "You've reached the Gemini API daily limit (Free Tier). Please wait for the quota to reset or upgrade your API key."
                    : `Chat failed: ${errorMessage}`,
                error: (error as any)?.toString(),
                code: isQuotaExceeded ? "QUOTA_EXCEEDED" : "UNKNOWN_ERROR"
            }),
            { status: isQuotaExceeded ? 429 : 500, headers: { "Content-Type": "application/json" } }
        );
    }
}
