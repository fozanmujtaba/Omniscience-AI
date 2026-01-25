import Groq from "groq-sdk";

// Initialize Groq client
const groq = new Groq({
    apiKey: process.env.GROQ_API_KEY,
});

// Available Groq models (sorted by capability)
export const GROQ_MODELS = {
    // Best quality - recommended for RAG
    LLAMA_70B: "llama-3.3-70b-versatile",
    // Faster, still great quality
    LLAMA_8B: "llama-3.1-8b-instant",
    // Good alternative
    MIXTRAL: "mixtral-8x7b-32768",
} as const;

// Default model for chat
export const DEFAULT_MODEL = GROQ_MODELS.LLAMA_70B;

export interface GroqChatMessage {
    role: "system" | "user" | "assistant";
    content: string;
}

export interface GroqStreamOptions {
    model?: string;
    messages: GroqChatMessage[];
    temperature?: number;
    maxTokens?: number;
}

/**
 * Stream a chat completion from Groq
 */
export async function streamGroqChat({
    model = DEFAULT_MODEL,
    messages,
    temperature = 0.7,
    maxTokens = 2048,
}: GroqStreamOptions) {
    const stream = await groq.chat.completions.create({
        model,
        messages,
        temperature,
        max_tokens: maxTokens,
        stream: true,
    });

    return stream;
}

/**
 * Non-streaming chat completion from Groq
 */
export async function groqChat({
    model = DEFAULT_MODEL,
    messages,
    temperature = 0.7,
    maxTokens = 2048,
}: GroqStreamOptions) {
    const completion = await groq.chat.completions.create({
        model,
        messages,
        temperature,
        max_tokens: maxTokens,
        stream: false,
    });

    return completion.choices[0]?.message?.content || "";
}

/**
 * Check if Groq is available (API key configured)
 */
export function isGroqConfigured(): boolean {
    return !!process.env.GROQ_API_KEY;
}

export { groq };
