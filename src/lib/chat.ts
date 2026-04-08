import { GoogleGenAI } from "@google/genai";
import { Ollama } from "ollama";
import type { ChatMessage } from "@/types";

const GEMINI_MAX_CHARS = 100_000;
const OLLAMA_MAX_CHARS = 90_000;

function buildSystemPrompt(
  title: string,
  summary: string | null,
  documentText: string
): string {
  return `You are a helpful assistant for analyzing documents. The user is viewing a document titled "${title}".${
    summary ? `\n\nHere is a brief summary of the document:\n${summary}` : ""
  }

Answer questions about this document based on its content below. Be concise and helpful.

--- DOCUMENT CONTENT ---
${documentText}
--- END DOCUMENT ---`;
}

async function* geminiChat(
  documentText: string,
  title: string,
  summary: string | null,
  messages: ChatMessage[]
): AsyncGenerator<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY is not set");

  const client = new GoogleGenAI({ apiKey });
  const truncated = documentText.slice(0, GEMINI_MAX_CHARS);
  const systemPrompt = buildSystemPrompt(title, summary, truncated);

  const contents = messages.map((m) => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: m.content }],
  }));

  const response = await client.models.generateContentStream({
    model: "gemini-2.0-flash",
    contents,
    config: {
      systemInstruction: systemPrompt,
    },
  });

  for await (const chunk of response) {
    const text = chunk.text;
    if (text) yield text;
  }
}

async function* ollamaChat(
  documentText: string,
  title: string,
  summary: string | null,
  messages: ChatMessage[]
): AsyncGenerator<string> {
  const ollama = new Ollama({
    host: process.env.OLLAMA_BASE_URL ?? "http://localhost:11434",
  });
  const model = process.env.OLLAMA_MODEL ?? "gemma4:e2b";
  const truncated = documentText.slice(0, OLLAMA_MAX_CHARS);
  const systemPrompt = buildSystemPrompt(title, summary, truncated);

  const ollamaMessages = [
    { role: "system" as const, content: systemPrompt },
    ...messages.map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    })),
  ];

  const response = await ollama.chat({
    model,
    stream: true,
    options: {
      num_ctx: +(process.env.OLLAMA_NUM_CTX ?? "8192"),
    },
    messages: ollamaMessages,
  });

  for await (const chunk of response) {
    const text = chunk.message.content;
    if (text) yield text;
  }
}

export function chatWithDocument(
  documentText: string,
  title: string,
  summary: string | null,
  messages: ChatMessage[]
): AsyncGenerator<string> {
  const provider = process.env.AI_PROVIDER ?? "gemini";
  return provider === "ollama"
    ? ollamaChat(documentText, title, summary, messages)
    : geminiChat(documentText, title, summary, messages);
}
