import { NextRequest } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { generateEmbedding } from "@/lib/embeddings";
import { queryVectors } from "@/lib/pinecone";
import { formatContext, buildPrompt } from "@/lib/prompts";
import { streamGroqChat, isGroqConfigured, GroqChatMessage, DEFAULT_MODEL } from "@/lib/groq";

// Initialize Gemini for chat (fallback)
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY || "");

interface ChatRequest {
    message: string;
    sessionId?: string;
    history?: Array<{ role: "user" | "model"; parts: { text: string }[] }>;
    topK?: number;
}

/**
 * Convert Gemini history format to Groq format
 */
function convertHistoryToGroq(
    history: Array<{ role: "user" | "model"; parts: { text: string }[] }>
): GroqChatMessage[] {
    return history.map((msg) => ({
        role: msg.role === "model" ? "assistant" : "user",
        content: msg.parts.map((p) => p.text).join(""),
    }));
}

/**
 * Stream response using Groq (primary)
 */
async function streamWithGroq(
    systemInstruction: string,
    message: string,
    history: Array<{ role: "user" | "model"; parts: { text: string }[] }>,
    controller: ReadableStreamDefaultController<Uint8Array>,
    encoder: TextEncoder
) {
    const messages: GroqChatMessage[] = [
        { role: "system", content: systemInstruction },
        ...convertHistoryToGroq(history),
        { role: "user", content: message },
    ];

    const stream = await streamGroqChat({
        model: DEFAULT_MODEL,
        messages,
        temperature: 0.7,
        maxTokens: 2048,
    });

    for await (const chunk of stream) {
        const text = chunk.choices[0]?.delta?.content || "";
        if (text) {
            const data = JSON.stringify({ type: "text", content: text });
            controller.enqueue(encoder.encode(`data: ${data}\n\n`));
        }
    }
}

/**
 * Stream response using Gemini (fallback)
 */
async function streamWithGemini(
    systemInstruction: string,
    message: string,
    history: Array<{ role: "user" | "model"; parts: { text: string }[] }>,
    controller: ReadableStreamDefaultController<Uint8Array>,
    encoder: TextEncoder
) {
    const model = genAI.getGenerativeModel({
        model: "gemini-2.0-flash",
        systemInstruction: {
            role: "system",
            parts: [{ text: systemInstruction }],
        },
    });

    const chat = model.startChat({
        history: history.length > 0 ? history : [],
    });

    const result = await chat.sendMessageStream(message);

    for await (const chunk of result.stream) {
        const text = chunk.text();
        if (text) {
            const data = JSON.stringify({ type: "text", content: text });
            controller.enqueue(encoder.encode(`data: ${data}\n\n`));
        }
    }
}

/**
 * POST /api/chat
 *
 * RAG chat endpoint:
 * 1. Retrieve relevant document chunks from the session's namespace
 * 2. Build system instruction with context
 * 3. Stream response using Groq (primary) or Gemini (fallback)
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

        // Determine which provider to use
        const useGroq = isGroqConfigured();
        console.log(`[Chat] Using ${useGroq ? "Groq (Llama 3.1 70B)" : "Gemini Flash"} for response generation`);

        // Step 3: Stream the response
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
                            text: c.text,
                        })),
                    });
                    controller.enqueue(encoder.encode(`data: ${sourcesData}\n\n`));

                    // Send provider info
                    const providerData = JSON.stringify({
                        type: "provider",
                        provider: useGroq ? "groq" : "gemini",
                        model: useGroq ? DEFAULT_MODEL : "gemini-2.0-flash",
                    });
                    controller.enqueue(encoder.encode(`data: ${providerData}\n\n`));

                    // Try Groq first, fall back to Gemini
                    if (useGroq) {
                        try {
                            await streamWithGroq(systemInstruction, message, history, controller, encoder);
                        } catch (groqError) {
                            console.error("[Chat] Groq error, falling back to Gemini:", groqError);

                            // Notify client about fallback
                            const fallbackData = JSON.stringify({
                                type: "fallback",
                                message: "Switching to Gemini...",
                            });
                            controller.enqueue(encoder.encode(`data: ${fallbackData}\n\n`));

                            await streamWithGemini(systemInstruction, message, history, controller, encoder);
                        }
                    } else {
                        await streamWithGemini(systemInstruction, message, history, controller, encoder);
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
                    ? "API rate limit reached. Please wait a moment and try again."
                    : `Chat failed: ${errorMessage}`,
                error: (error as Error)?.toString(),
                code: isQuotaExceeded ? "QUOTA_EXCEEDED" : "UNKNOWN_ERROR",
            }),
            { status: isQuotaExceeded ? 429 : 500, headers: { "Content-Type": "application/json" } }
        );
    }
}
