import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const folderId = searchParams.get("folderId");
  const favorites = searchParams.get("favorites") === "true";
  const tag = searchParams.get("tag");

  const docs = await prisma.document.findMany({
    where: {
      ...(folderId ? { folderId } : {}),
      ...(favorites ? { isFavorite: true } : {}),
      ...(tag ? { tags: { some: { name: tag } } } : {}),
    },
    include: { folder: true, tags: true },
    orderBy: { updatedAt: "desc" },
  });

  return NextResponse.json(docs);
}
