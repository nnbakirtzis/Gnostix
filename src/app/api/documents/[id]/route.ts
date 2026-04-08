import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { tagColor, normalizeTag } from "@/lib/tags";
import fs from "node:fs/promises";
import path from "node:path";

export const runtime = "nodejs";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const doc = await prisma.document.findUnique({
    where: { id },
    include: { folder: true, tags: true },
  });
  if (!doc) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(doc);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json() as {
    isFavorite?: boolean;
    folderId?: string | null;
    title?: string;
    tagNames?: string[];
  };

  // Handle tag replacement separately (requires upserts + set)
  if (body.tagNames !== undefined) {
    const normalized = body.tagNames
      .map(normalizeTag)
      .filter((n) => n.length > 0 && n.length <= 50);

    const upserted = await Promise.all(
      normalized.map((name) =>
        prisma.tag.upsert({
          where: { name },
          update: {},
          create: { name, color: tagColor(name) },
        })
      )
    );

    await prisma.document.update({
      where: { id },
      data: { tags: { set: upserted.map((t) => ({ id: t.id })) } },
    });
  }

  const doc = await prisma.document.update({
    where: { id },
    data: {
      ...(body.isFavorite !== undefined ? { isFavorite: body.isFavorite } : {}),
      ...(body.folderId !== undefined ? { folderId: body.folderId } : {}),
      ...(body.title ? { title: body.title } : {}),
    },
    include: { folder: true, tags: true },
  });

  return NextResponse.json(doc);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const doc = await prisma.document.findUnique({ where: { id } });
  if (!doc) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Delete file from disk
  try {
    const uploadsDir = path.join(/*turbopackIgnore: true*/ process.cwd(), "uploads");
    const filename = path.basename(doc.filePath);
    const fullPath = path.join(uploadsDir, filename);
    await fs.unlink(fullPath);
  } catch {
    // File may already be gone — not fatal
  }

  await prisma.document.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
