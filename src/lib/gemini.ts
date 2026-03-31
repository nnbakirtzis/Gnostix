import { GoogleGenAI } from "@google/genai";

const MAX_TEXT_CHARS = 100_000;

export interface SummaryResult {
  title: string;
  summary: string;
  keyPoints: string[];
  actionItems: string[];
}

function getClient() {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY is not set");
  }
  return new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
}

export async function summarizeDocument(
  text: string,
  filename: string
): Promise<SummaryResult> {
  const client = getClient();

  const truncated = text.length > MAX_TEXT_CHARS;
  const inputText = truncated ? text.slice(0, MAX_TEXT_CHARS) : text;

  const prompt = `You are an executive document assistant for business professionals. Analyze the following document and return ONLY valid JSON (no markdown, no explanation).

Return this exact JSON structure:
{
  "title": "A concise, descriptive title for this document (under 80 chars)",
  "summary": "An executive summary in 2-3 paragraphs covering the main points, context, and significance",
  "keyPoints": ["Array of 5-10 key takeaways as clear, actionable bullet points"],
  "actionItems": ["Array of specific action items or next steps — empty array [] if none found"]
}

Document filename: ${filename}${truncated ? "\n(Note: document was truncated to first 100,000 characters)" : ""}

Document content:
${inputText}`;

  const response = await client.models.generateContent({
    model: "gemini-2.0-flash",
    contents: prompt,
    config: {
      responseMimeType: "application/json",
    },
  });

  const raw = response.text;
  if (!raw) throw new Error("Gemini returned empty response");

  const result = JSON.parse(raw) as SummaryResult;

  // Validate required fields
  if (!result.title || !result.summary || !Array.isArray(result.keyPoints)) {
    throw new Error("Gemini response missing required fields");
  }
  if (!Array.isArray(result.actionItems)) {
    result.actionItems = [];
  }

  return result;
}
