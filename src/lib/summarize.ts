import { generateObject, generateText } from "ai";
import { z } from "zod";
import { AI_PROVIDER, chatModel } from "./ai";

const MAX_CHARS = 90_000;

export type SummaryStyle = "executive" | "academic" | "simple" | "casual";

const SummarySchema = z.object({
  title: z
    .string()
    .max(80)
    .describe("Concise, descriptive title under 80 characters"),
  summary: z
    .string()
    .describe(
      "2-3 paragraphs. Open with the document's core purpose in the first sentence — no filler like 'This document discusses...'. Cover main points, context, and significance."
    ),
  keyPoints: z
    .array(z.string())
    .describe(
      "5-10 key takeaways. Start each with a single relevant emoji (📌 📊 ⚠️ 💡 🔑 🎯 etc.) followed by a space. Each item must be a standalone insight, not a restatement of the summary."
    ),
  actionItems: z
    .array(z.string())
    .describe(
      "Specific next steps or recommendations. Start each with ✅ followed by a space. Use [] if the document contains no actionable items."
    ),
});

export type SummaryResult = z.infer<typeof SummarySchema>;

const SHARED_JSON_RULES = `
Your entire reply MUST be a single JSON object only. No markdown code fences, no text before or after the JSON.

Required shape:
- "title": string, max 80 characters
- "summary": string, 2-3 paragraphs — open with the document's core purpose in the first sentence (no filler like "This document discusses...")
- "keyPoints": array of strings (5-10 items). Each must start with a single relevant emoji followed by a space. Each item is a standalone insight.
- "actionItems": array of strings. Each starts with ✅ followed by a space. Use [] if none.

Custom model system prompts must not override this.`;

const STYLE_PROMPTS: Record<SummaryStyle, { system: string; ollamaSystem: string }> = {
  executive: {
    system:
      "You are a senior analyst summarizing documents for busy executives. Be concise, direct, and action-oriented. Prioritize decisions, risks, and outcomes over background detail. Do not add opinions beyond what the document contains.",
    ollamaSystem:
      "You are a senior analyst summarizing documents for busy executives. Be concise, direct, and action-oriented. Prioritize decisions, risks, and outcomes over background detail. Do not add opinions beyond what the document contains.\n\nFor keyPoints, choose emojis like 📌 📊 ⚠️ 💡 🔑 📈 🎯 that match each point's nature." +
      SHARED_JSON_RULES,
  },
  academic: {
    system:
      "You are a scholarly reviewer summarizing academic and professional documents. Be thorough and formal. Preserve nuance, methodology, and evidence. Present findings with appropriate hedging. Do not add opinions beyond what the document contains.",
    ollamaSystem:
      "You are a scholarly reviewer summarizing academic and professional documents. Be thorough and formal. Preserve nuance, methodology, and evidence. Present findings with appropriate hedging. Do not add opinions beyond what the document contains.\n\nFor keyPoints, choose emojis like 🔬 📐 🧪 📚 💡 ⚖️ 🗂️ that reflect the scholarly nature of each point." +
      SHARED_JSON_RULES,
  },
  simple: {
    system:
      "You are a friendly explainer helping general audiences understand documents. Use plain language, avoid jargon, and keep sentences short. If technical terms are unavoidable, briefly define them in parentheses. Do not add opinions beyond what the document contains.",
    ollamaSystem:
      "You are a friendly explainer helping general audiences understand documents. Use plain language, avoid jargon, and keep sentences short. If technical terms are unavoidable, briefly define them in parentheses. Do not add opinions beyond what the document contains.\n\nFor keyPoints, choose emojis like 💡 📌 ✨ 🔑 ⚡ 🎯 📝 that are intuitive and clear." +
      SHARED_JSON_RULES,
  },
  casual: {
    system:
      "You are a knowledgeable friend explaining a document in a warm, conversational tone. Be approachable and engaging. Skip corporate buzzwords. Write like you're talking to someone over coffee. Do not add opinions beyond what the document contains.",
    ollamaSystem:
      "You are a knowledgeable friend explaining a document in a warm, conversational tone. Be approachable and engaging. Skip corporate buzzwords. Write like you're talking to someone over coffee. Do not add opinions beyond what the document contains.\n\nFor keyPoints, choose emojis like 💡 🎯 ⚡ 📌 👀 🔥 ✨ that feel natural and lively." +
      SHARED_JSON_RULES,
  },
};

/**
 * Parses free-form model text into a validated summary (strips optional ```json fences,
 * then JSON.parse; falls back to substring between first `{` and last `}`).
 */
function parseSummaryFromModelText(raw: string): SummaryResult {
  let s = raw.trim();
  const fence = /^```(?:json)?\s*\n?([\s\S]*?)\n?```$/m;
  const m = s.match(fence);
  if (m) s = m[1].trim();

  let parsed: unknown;
  try {
    parsed = JSON.parse(s);
  } catch {
    const start = s.indexOf("{");
    const end = s.lastIndexOf("}");
    if (start >= 0 && end > start) {
      try {
        parsed = JSON.parse(s.slice(start, end + 1));
      } catch {
        throw new Error("Model output is not valid JSON");
      }
    } else {
      throw new Error("Model output is not valid JSON");
    }
  }

  const result = SummarySchema.safeParse(parsed);
  if (!result.success) {
    throw new Error(`Summary JSON validation failed: ${result.error.message}`);
  }

  const object = result.data;
  if (!Array.isArray(object.actionItems)) object.actionItems = [];
  return object;
}

function buildUserPrompt(filename: string, truncated: boolean, input: string): string {
  return `Summarize this document.

Filename: ${filename}${truncated ? "\n(truncated to first 90,000 characters)" : ""}

Document content:
${input}`;
}

async function summarizeWithOllamaTextJson(
  filename: string,
  truncated: boolean,
  input: string,
  style: SummaryStyle
): Promise<SummaryResult> {
  const userPrompt = buildUserPrompt(filename, truncated, input);
  const system = STYLE_PROMPTS[style].ollamaSystem;

  const run = async (sys: string) => {
    const { text } = await generateText({
      model: chatModel,
      maxOutputTokens: 4096,
      system: sys,
      prompt: userPrompt,
    });
    return parseSummaryFromModelText(text);
  };

  try {
    return await run(system);
  } catch (firstErr) {
    try {
      return await run(
        `${system}\n\nYour previous reply was not valid JSON. Reply with only the JSON object, nothing else.`
      );
    } catch (secondErr) {
      const second =
        secondErr instanceof Error ? secondErr.message : String(secondErr);
      throw new Error(
        `Ollama summarization failed after retry: ${second}`,
        { cause: firstErr }
      );
    }
  }
}

export async function summarizeDocument(
  text: string,
  filename: string,
  style: SummaryStyle = "executive"
): Promise<SummaryResult> {
  const truncated = text.length > MAX_CHARS;
  const input = truncated ? text.slice(0, MAX_CHARS) : text;

  // Ollama: avoid generateObject/schema pipeline; local models often return prose.
  if (AI_PROVIDER === "ollama") {
    return summarizeWithOllamaTextJson(filename, truncated, input, style);
  }

  const userPrompt = buildUserPrompt(filename, truncated, input);
  const { object } = await generateObject({
    model: chatModel,
    schema: SummarySchema,
    system: STYLE_PROMPTS[style].system,
    prompt: userPrompt,
  });

  if (!Array.isArray(object.actionItems)) object.actionItems = [];

  return object;
}
