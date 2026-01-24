const { GoogleGenerativeAI } = require("@google/generative-ai");
require("dotenv").config({ path: ".env.local" });

async function listModels() {
    const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
    try {
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        // This is a hacky way to get the list because the SDK doesn't have a direct listModels yet in all versions
        // Actually, let's use the REST API via fetch to be sure.
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${process.env.GOOGLE_API_KEY}`);
        const data = await response.json();
        console.log(JSON.stringify(data, null, 2));
    } catch (error) {
        console.error(error);
    }
}

listModels();
