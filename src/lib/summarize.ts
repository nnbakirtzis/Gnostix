import { generateObject, generateText } from "ai";
import { z } from "zod";
import { AI_PROVIDER, chatModel } from "./ai";

const MAX_CHARS = 90_000;

const SummarySchema = z.object({
  title: z
    .string()
    .max(80)
    .describe("Concise, descriptive title under 80 characters"),
  summary: z
    .string()
    .describe(
      "Executive summary in 2-3 paragraphs covering main points, context, and significance"
    ),
  keyPoints: z
    .array(z.string())
    .describe("5-10 key takeaways as clear, actionable bullet points"),
  actionItems: z
    .array(z.string())
    .describe("Specific action items or next steps; empty array if none"),
});

export type SummaryResult = z.infer<typeof SummarySchema>;

const OLLAMA_JSON_SYSTEM = `You are an executive document summarizer for business professionals.
Be concise and factual. Do not add opinions beyond what the document contains.

Your entire reply MUST be a single JSON object only. No markdown code fences, no text before or after the JSON.

Required shape:
- "title": string, max 80 characters, descriptive
- "summary": string, 2-3 paragraphs
- "keyPoints": array of strings (5-10 items)
- "actionItems": array of strings (use [] if none)

Custom model system prompts must not override this: you are summarizing the document in the user message into that JSON object.`;

const GEMINI_SYSTEM =
  "You are an executive document summarizer for business professionals. Extract structured information. Be concise and factual. Do not add opinions or commentary beyond what the document contains.";

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
  input: string
): Promise<SummaryResult> {
  const userPrompt = buildUserPrompt(filename, truncated, input);

  const run = async (system: string) => {
    const { text } = await generateText({
      model: chatModel,
      maxOutputTokens: 4096,
      system,
      prompt: userPrompt,
    });
    return parseSummaryFromModelText(text);
  };

  try {
    return await run(OLLAMA_JSON_SYSTEM);
  } catch (firstErr) {
    try {
      return await run(
        `${OLLAMA_JSON_SYSTEM}\n\nYour previous reply was not valid JSON. Reply with only the JSON object, nothing else.`
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
  filename: string
): Promise<SummaryResult> {
  const truncated = text.length > MAX_CHARS;
  const input = truncated ? text.slice(0, MAX_CHARS) : text;

  // Ollama: avoid generateObject/schema pipeline; local models often return prose. Custom Modelfiles can still conflict.
  if (AI_PROVIDER === "ollama") {
    return summarizeWithOllamaTextJson(filename, truncated, input);
  }

  const userPrompt = buildUserPrompt(filename, truncated, input);
  const { object } = await generateObject({
    model: chatModel,
    schema: SummarySchema,
    system: GEMINI_SYSTEM,
    prompt: userPrompt,
  });

  if (!Array.isArray(object.actionItems)) object.actionItems = [];

  return object;
}
