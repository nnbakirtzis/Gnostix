import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

// Simple in-memory TTL cache (per-process)
const cache = new Map<string, { data: unknown[]; expiresAt: number }>();
const CACHE_TTL = 30_000;

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.trim() ?? "";

  if (!q) return NextResponse.json([]);

  // Cache hit
  const cached = cache.get(q);
  if (cached && Date.now() < cached.expiresAt) {
    return NextResponse.json(cached.data);
  }

  let docs: unknown[];

  try {
    // Postgres FTS: get relevance-ranked document IDs using the
    // generated `search_tsv` tsvector column + GIN index.
    // Weights applied at column generation: title=A, summary=B, fileName=C.
    const ranked = await prisma.$queryRaw<{ id: string; rank: number }[]>`
      SELECT id, ts_rank_cd(search_tsv, plainto_tsquery('english', ${q})) AS rank
      FROM "Document"
      WHERE search_tsv @@ plainto_tsquery('english', ${q})
      ORDER BY rank DESC
      LIMIT 50
    `;

    if (ranked.length === 0) {
      cache.set(q, { data: [], expiresAt: Date.now() + CACHE_TTL });
      return NextResponse.json([]);
    }

    const ids = ranked.map((r) => r.id);
    const docsById = await prisma.document.findMany({
      where: { id: { in: ids } },
      include: { folder: true },
    });

    // Re-order to match rank order from the FTS query
    const docMap = new Map(docsById.map((d) => [d.id, d]));
    docs = ids.map((id) => docMap.get(id)).filter(Boolean);
  } catch (err) {
    console.error("[search]", err);
    // Fallback to ILIKE search if the FTS column isn't ready
    docs = await prisma.document.findMany({
      where: {
        OR: [
          { title: { contains: q, mode: "insensitive" } },
          { summary: { contains: q, mode: "insensitive" } },
          { fileName: { contains: q, mode: "insensitive" } },
        ],
      },
      include: { folder: true },
      orderBy: { updatedAt: "desc" },
      take: 50,
    });
  }

  cache.set(q, { data: docs, expiresAt: Date.now() + CACHE_TTL });
  return NextResponse.json(docs);
}
