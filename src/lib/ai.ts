import { createOllama } from "ai-sdk-ollama";
import { createGoogleGenerativeAI } from "@ai-sdk/google";

/** Active backend from `AI_PROVIDER` (`ollama` | `gemini`). Exported for summarize routing. */
export const AI_PROVIDER = process.env.AI_PROVIDER ?? "ollama";

const ollama = createOllama({
  baseURL: process.env.OLLAMA_BASE_URL ?? "http://127.0.0.1:11434",
});

const google = createGoogleGenerativeAI({
  apiKey: process.env.GEMINI_API_KEY,
});

const OLLAMA_CHAT_MODEL = process.env.OLLAMA_MODEL ?? "gemma4:e2b";
const OLLAMA_EMBED_MODEL = process.env.OLLAMA_EMBED_MODEL ?? "nomic-embed-text";

/** Context window for Ollama chat (`OLLAMA_NUM_CTX`, default 8192). */
function parseOllamaNumCtx(): number {
  const fallback = 8192;
  const raw = process.env.OLLAMA_NUM_CTX;
  if (raw === undefined || raw === "") return fallback;
  const n = parseInt(raw, 10);
  if (!Number.isFinite(n) || n < 2048) return fallback;
  return n;
}

export const chatModel =
  AI_PROVIDER === "ollama"
    ? ollama.chat(OLLAMA_CHAT_MODEL, {
        options: { num_ctx: parseOllamaNumCtx() },
      })
    : google.chat("gemini-2.0-flash");

export const embeddingModel =
  AI_PROVIDER === "ollama"
    ? ollama.textEmbeddingModel(OLLAMA_EMBED_MODEL)
    : google.textEmbeddingModel("text-embedding-004");

export const EMBED_DIM = 768;
