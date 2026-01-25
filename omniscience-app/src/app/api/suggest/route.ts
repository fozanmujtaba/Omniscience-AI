import { NextRequest } from "next/server";
import { chatWithGroq } from "@/lib/groq";

/**
 * POST /api/suggest
 * 
 * Generates follow-up question suggestions based on the conversation
 */
export async function POST(request: NextRequest) {
    try {
        const { lastResponse, lastQuestion, context } = await request.json();

        if (!lastResponse) {
            return new Response(
                JSON.stringify({ success: false, message: "Last response is required" }),
                { status: 400, headers: { "Content-Type": "application/json" } }
            );
        }

        const prompt = `Based on this conversation about documents, suggest exactly 3 short follow-up questions the user might want to ask. Each question should be concise (under 10 words), relevant, and help explore the topic further.

User's last question: "${lastQuestion || 'N/A'}"

AI's last response: "${lastResponse.slice(0, 1000)}${lastResponse.length > 1000 ? '...' : ''}"

${context ? `Context: ${context}` : ''}

Respond with ONLY a JSON array of 3 strings, no other text. Example:
["What are the main benefits?", "Can you explain more about X?", "How does this compare to Y?"]`;

        const result = await chatWithGroq(prompt, []);

        // Parse the JSON response
        try {
            // Extract JSON array from response (handle potential markdown code blocks)
            let jsonStr = result.text;

            // Remove markdown code blocks if present
            if (jsonStr.includes("```")) {
                jsonStr = jsonStr.replace(/```json?\n?/g, "").replace(/```/g, "").trim();
            }

            const suggestions = JSON.parse(jsonStr);

            if (Array.isArray(suggestions) && suggestions.length > 0) {
                return new Response(
                    JSON.stringify({
                        success: true,
                        suggestions: suggestions.slice(0, 3), // Ensure max 3
                    }),
                    { status: 200, headers: { "Content-Type": "application/json" } }
                );
            }
        } catch (parseError) {
            console.error("[Suggest] Failed to parse suggestions:", parseError);
        }

        // Fallback suggestions if parsing fails
        return new Response(
            JSON.stringify({
                success: true,
                suggestions: [
                    "Can you elaborate on this?",
                    "What are the key takeaways?",
                    "Are there any related topics?",
                ],
            }),
            { status: 200, headers: { "Content-Type": "application/json" } }
        );
    } catch (error) {
        console.error("[Suggest] Error:", error);
        return new Response(
            JSON.stringify({
                success: false,
                message: error instanceof Error ? error.message : "Failed to generate suggestions",
            }),
            { status: 500, headers: { "Content-Type": "application/json" } }
        );
    }
}
