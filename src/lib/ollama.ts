import { Ollama } from "ollama";
import type { SummaryResult } from "./gemini";

const MAX_TEXT_CHARS = 24_000;

function getClient() {
  return new Ollama({
    host: process.env.OLLAMA_BASE_URL ?? "http://localhost:11434",
  });
}

function getModel() {
  return process.env.OLLAMA_MODEL ?? "llama3.2:11b";
}

export async function summarizeDocument(
  text: string,
  filename: string
): Promise<SummaryResult> {
  const ollama = getClient();
  const model = getModel();

  const truncated = text.length > MAX_TEXT_CHARS;
  const inputText = truncated ? text.slice(0, MAX_TEXT_CHARS) : text;

  const response = await ollama.chat({
    model,
    stream: false,
    format: {
      type: "object",
      properties: {
        title: { type: "string" },
        summary: { type: "string" },
        keyPoints: { type: "array", items: { type: "string" } },
        actionItems: { type: "array", items: { type: "string" } },
      },
      required: ["title", "summary", "keyPoints", "actionItems"],
    },
    options: {
      temperature: 0,
      num_ctx: +(process.env.OLLAMA_NUM_CTX ?? "8192"),
      num_predict: 1024,
      repeat_penalty: 1.1,
    },
    messages: [
      {
        role: "system",
        content:
          "You are an executive document summarizer. Extract structured information from documents. Be concise and factual. Do not add opinions or commentary beyond what the document contains.",
      },
      {
        role: "user",
        content: `Summarize this document.

Filename: ${filename}${truncated ? "\n(truncated to first 24,000 characters)" : ""}

- title: concise descriptive title (under 80 chars)
- summary: executive summary in 2-3 paragraphs
- keyPoints: 5-10 key takeaways as bullet points
- actionItems: specific next steps (empty array if none)

Document:
${inputText}`,
      },
    ],
  });

  const raw = response.message.content;
  if (!raw) throw new Error("Ollama returned empty response");

  // Strip markdown code fences if present (some models wrap JSON in ```json blocks)
  const cleaned = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();

  let result: SummaryResult;
  try {
    result = JSON.parse(cleaned) as SummaryResult;
  } catch {
    throw new Error(`Ollama returned invalid JSON: ${cleaned.slice(0, 200)}`);
  }

  if (!result.title || !result.summary || !Array.isArray(result.keyPoints)) {
    console.error("[ollama] unexpected structure:", JSON.stringify(result).slice(0, 300));
    throw new Error("Ollama response missing required fields");
  }
  if (!Array.isArray(result.actionItems)) {
    result.actionItems = [];
  }

  return result;
}
