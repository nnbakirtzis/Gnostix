import { embed } from "ai";
import { toSql } from "pgvector";
import { embeddingModel } from "./ai";
import { prisma } from "./prisma";

export type RetrievedChunk = {
  ordinal: number;
  text: string;
  score: number; // cosine similarity; -1 for neighbor chunks added for continuity
};

type RetrievalOptions = {
  k?: number;
  maxChunks?: number;
  includeNeighbors?: boolean;
};

/**
 * Retrieve the most relevant chunks for a query from a single document.
 * Uses pgvector's cosine distance (<=>) via a raw query, then optionally
 * expands the result set with each hit's ordinal-adjacent neighbors so
 * the LLM reads chunks in natural document flow.
 *
 * Returns chunks sorted by ordinal ascending (document order), NOT by
 * score — LLM comprehension improves noticeably when excerpts are read
 * in the same order they appear in the source.
 */
export async function retrieveRelevantChunks(
  documentId: string,
  query: string,
  opts: RetrievalOptions = {}
): Promise<RetrievedChunk[]> {
  const { k = 4, maxChunks = 8, includeNeighbors = true } = opts;

  if (!query.trim()) return [];

  const { embedding } = await embed({ model: embeddingModel, value: query });

  // `<=>` is cosine DISTANCE (0 = identical, 2 = opposite). Convert to
  // similarity (1 - distance) for a more intuitive score.
  const rows = await prisma.$queryRaw<
    { ordinal: number; text: string; distance: number }[]
  >`
    SELECT ordinal, text, (embedding <=> ${toSql(embedding)}::vector) AS distance
    FROM "DocumentChunk"
    WHERE "documentId" = ${documentId}
    ORDER BY distance ASC
    LIMIT ${k}
  `;

  if (rows.length === 0) return [];

  const hits: RetrievedChunk[] = rows.map((r) => ({
    ordinal: r.ordinal,
    text: r.text,
    score: 1 - Number(r.distance),
  }));

  if (!includeNeighbors) {
    return hits.slice(0, maxChunks).sort((a, b) => a.ordinal - b.ordinal);
  }

  // Expand ±1 neighbors around each hit, skipping any already in hits.
  const hitOrdinals = new Set(hits.map((h) => h.ordinal));
  const neighborOrdinals = new Set<number>();
  for (const h of hits) {
    for (const o of [h.ordinal - 1, h.ordinal + 1]) {
      if (o >= 0 && !hitOrdinals.has(o)) neighborOrdinals.add(o);
    }
  }

  if (neighborOrdinals.size > 0) {
    const neighbors = await prisma.documentChunk.findMany({
      where: { documentId, ordinal: { in: [...neighborOrdinals] } },
      select: { ordinal: true, text: true },
    });
    for (const n of neighbors) {
      hits.push({ ordinal: n.ordinal, text: n.text, score: -1 });
    }
  }

  return hits.slice(0, maxChunks).sort((a, b) => a.ordinal - b.ordinal);
}
