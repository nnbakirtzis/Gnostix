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
    `You are a helpful assistant for analyzing a document titled "${title}".` +
    (summary ? `\n\nDocument summary:\n${summary}` : "");

  if (retrievedChunks.length > 0) {
    const excerpts = retrievedChunks
      .map((c) => `[#${c.ordinal}] ${c.text}`)
      .join("\n\n");
    return `${header}

Below are the most relevant excerpts from the document for the current question.
Each excerpt is labeled with its position in the document (e.g. [#12]).
Answer based only on these excerpts and the summary. If the answer is not
contained in them, say so. When helpful, cite excerpt numbers in brackets.

--- RELEVANT EXCERPTS ---
${excerpts}
--- END EXCERPTS ---`;
  }

  // Fallback: pre-RAG documents (chunkCount=0) or embedding failure.
  const truncated = (fallbackText ?? "").slice(0, FALLBACK_MAX_CHARS);
  return `${header}

Answer questions about this document based on its content below. Be concise and helpful.

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
