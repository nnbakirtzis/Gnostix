import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const folderId = searchParams.get("folderId");
  const favorites = searchParams.get("favorites") === "true";

  const docs = await prisma.document.findMany({
    where: {
      ...(folderId ? { folderId } : {}),
      ...(favorites ? { isFavorite: true } : {}),
    },
    include: { folder: true },
    orderBy: { updatedAt: "desc" },
  });

  return NextResponse.json(docs);
}
