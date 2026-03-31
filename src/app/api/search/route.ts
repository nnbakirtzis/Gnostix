import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.trim() ?? "";

  if (!q) {
    return NextResponse.json([]);
  }

  const docs = await prisma.document.findMany({
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

  return NextResponse.json(docs);
}
