import Groq from "groq-sdk";

// Initialize Groq client
const groq = new Groq({
    apiKey: process.env.GROQ_API_KEY,
});

// Available Groq models (sorted by capability)
// Groq retired the Llama 3.x and Mixtral models; gpt-oss is its recommended replacement.
export const GROQ_MODELS = {
    // Best quality - recommended for RAG
    GPT_OSS_120B: "openai/gpt-oss-120b",
    // Faster, still great quality
    GPT_OSS_20B: "openai/gpt-oss-20b",
} as const;

// Default model for chat
export const DEFAULT_MODEL = GROQ_MODELS.GPT_OSS_120B;

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

/**
 * Simple chat helper for prompts (returns text directly)
 */
export async function chatWithGroq(
    prompt: string,
    history: GroqChatMessage[] = [],
    options: { model?: string; temperature?: number } = {}
): Promise<{ text: string }> {
    const messages: GroqChatMessage[] = [
        ...history,
        { role: "user", content: prompt },
    ];

    const text = await groqChat({
        model: options.model || DEFAULT_MODEL,
        messages,
        temperature: options.temperature ?? 0.7,
    });

    return { text };
}

export { groq };
