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

  // Sanitize query: strip FTS5 special chars, add prefix wildcard for last term
  const sanitized = q.replace(/["*()\-]/g, " ").trim();
  const terms = sanitized.split(/\s+/).filter(Boolean);
  const ftsQuery = terms.length
    ? terms.slice(0, -1).join(" ") + (terms.length > 1 ? " " : "") + terms[terms.length - 1] + "*"
    : "";

  let docs: unknown[];

  try {
    // FTS5: get relevance-ranked document IDs
    // bm25 weights: id=0 (unindexed), title=10, summary=5, fileName=1
    const ranked = await prisma.$queryRaw<{ id: string }[]>`
      SELECT id FROM document_fts
      WHERE document_fts MATCH ${ftsQuery}
      ORDER BY bm25(document_fts, 0, 10, 5, 1)
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

    // Re-order to match FTS5 rank order
    const docMap = new Map(docsById.map((d) => [d.id, d]));
    docs = ids.map((id) => docMap.get(id)).filter(Boolean);
  } catch {
    // Fallback to LIKE search if FTS5 table isn't ready
    docs = await prisma.document.findMany({
      where: {
        OR: [
          { title: { contains: q } },
          { summary: { contains: q } },
          { fileName: { contains: q } },
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
