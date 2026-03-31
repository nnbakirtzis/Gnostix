import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
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
    include: { folder: true },
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
  };

  const doc = await prisma.document.update({
    where: { id },
    data: {
      ...(body.isFavorite !== undefined ? { isFavorite: body.isFavorite } : {}),
      ...(body.folderId !== undefined ? { folderId: body.folderId } : {}),
      ...(body.title ? { title: body.title } : {}),
    },
    include: { folder: true },
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
