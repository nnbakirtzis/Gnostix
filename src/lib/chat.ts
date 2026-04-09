import { streamText } from "ai";
import { chatModel } from "./ai";
import type { ChatMessage } from "@/types";
import type { RetrievedChunk } from "./retrieval";

// Only used for the legacy fallback path (pre-RAG documents with chunkCount=0).
const FALLBACK_MAX_CHARS = 90_000;

type ChatArgs = {
  title: string;
  summary: string | null;
  retrievedChunks: RetrievedChunk[];
  fallbackText: string | null;
  messages: ChatMessage[];
};

function buildSystemPrompt(args: Omit<ChatArgs, "messages">): string {
  const { title, summary, retrievedChunks, fallbackText } = args;
  const header =
    `You are a knowledgeable document analyst. Be direct, precise, and professional.\n\n` +
    `You are helping a user understand a document titled "${title}".` +
    (summary ? `\n\nDocument summary:\n${summary}` : "");

  const responseRules = `

Response guidelines:
- Calibrate length to the question: 1-3 sentences for simple lookups, a structured answer with brief explanation for complex questions.
- Use markdown bold or bullet lists only when it genuinely improves clarity.
- Use at most 1-2 emojis per response — only to flag warnings (⚠️), highlight key insights (💡), or introduce a summary (📋). Do not decorate casual sentences with emojis.
- If the answer is not in the provided content, say so plainly — do not speculate.`;

  if (retrievedChunks.length > 0) {
    const excerpts = retrievedChunks
      .map((c) => `[#${c.ordinal}] ${c.text}`)
      .join("\n\n");
    return `${header}${responseRules}

Below are the most relevant excerpts from the document for the current question.
Each excerpt is labeled with its position in the document (e.g. [#12]).
Answer based only on these excerpts and the summary. When helpful, cite excerpt numbers in brackets.

--- RELEVANT EXCERPTS ---
${excerpts}
--- END EXCERPTS ---`;
  }

  // Fallback: pre-RAG documents (chunkCount=0) or embedding failure.
  const truncated = (fallbackText ?? "").slice(0, FALLBACK_MAX_CHARS);
  return `${header}${responseRules}

--- DOCUMENT CONTENT ---
${truncated}
--- END DOCUMENT ---`;
}

/**
 * Stream a chat response for a document. Returns an async iterable of text
 * chunks so callers can pipe it directly into a ReadableStream.
 */
export function chatWithDocument(args: ChatArgs): AsyncIterable<string> {
  const result = streamText({
    model: chatModel,
    system: buildSystemPrompt(args),
    messages: args.messages.map((m) => ({
      role: m.role,
      content: m.content,
    })),
  });
  return result.textStream;
}
