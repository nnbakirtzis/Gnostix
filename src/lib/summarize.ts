import { summarizeDocument as geminiSummarize } from "./gemini";
import { summarizeDocument as ollamaSummarize } from "./ollama";

export { type SummaryResult } from "./gemini";

export function summarizeDocument(text: string, filename: string) {
  const provider = process.env.AI_PROVIDER ?? "gemini";
  return provider === "ollama"
    ? ollamaSummarize(text, filename)
    : geminiSummarize(text, filename);
}
