import type { PDFDocument } from "@/types";
import { extractText } from "unpdf";

/**
 * Parse a PDF file and extract text content using unpdf
 * This library is designed for Node.js and works well with Next.js
 */
export async function parsePDF(
    buffer: Buffer,
    filename: string
): Promise<PDFDocument> {
    // Convert Buffer to Uint8Array as required by unpdf
    const data = new Uint8Array(buffer);
    const { text, totalPages } = await extractText(data);

    return {
        filename,
        text: Array.isArray(text) ? text.join("\n") : text,
        uploadDate: new Date().toISOString(),
        pageCount: totalPages,
    };
}
