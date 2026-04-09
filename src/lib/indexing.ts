import { embedMany } from "ai";
import { toSql } from "pgvector";
import { randomBytes } from "node:crypto";
import { embeddingModel, EMBED_DIM } from "./ai";
import { chunkText } from "./chunking";
import { prisma } from "./prisma";

// Opaque unique id for chunk rows. Prisma's cuid() default doesn't apply to
// raw inserts, so we generate our own. Any unique string is fine.
const chunkId = () => randomBytes(12).toString("base64url");

/**
 * Chunk a document's text, embed every chunk via Ollama (or Gemini, depending
 * on AI_PROVIDER), and write everything to DocumentChunk in one transaction.
 * Idempotent: deletes any existing chunks for this document before inserting.
 *
 * Non-fatal in the upload pipeline — callers should catch and log but not
 * fail the request if embedding fails, since chat has a full-text fallback.
 */
export async function chunkAndEmbedDocument(
  documentId: string,
  text: string
): Promise<{ chunkCount: number }> {
  const chunks = await chunkText(text);
  if (chunks.length === 0) return { chunkCount: 0 };

  const { embeddings } = await embedMany({
    model: embeddingModel,
    values: chunks.map((c) => c.text),
  });

  const embedModelName =
    process.env.OLLAMA_EMBED_MODEL ?? "nomic-embed-text";

  await prisma.$transaction(async (tx) => {
    await tx.documentChunk.deleteMany({ where: { documentId } });

    // Raw insert because Unsupported("vector(768)") can't be written via the
    // Prisma model API. One row at a time — at ≤500 chunks this is fine and
    // avoids the SQL string-length limit on multi-row inserts.
    for (let i = 0; i < chunks.length; i++) {
      const c = chunks[i];
      const vec = toSql(embeddings[i]);
      await tx.$executeRaw`
        INSERT INTO "DocumentChunk"
          (id, "documentId", ordinal, "charStart", "charEnd", text, "tokenCount",
           embedding, "embedModel", "embedDim", "createdAt")
        VALUES
          (${chunkId()}, ${documentId}, ${c.ordinal}, ${c.charStart}, ${c.charEnd},
           ${c.text}, ${c.tokenCount},
           ${vec}::vector,
           ${embedModelName},
           ${EMBED_DIM}, NOW())
      `;
    }

    await tx.document.update({
      where: { id: documentId },
      data: { chunkCount: chunks.length },
    });
  });

  return { chunkCount: chunks.length };
}
