import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { tagColor, normalizeTag } from "@/lib/tags";

export const runtime = "nodejs";

export async function GET() {
  const tags = await prisma.tag.findMany({
    include: { _count: { select: { documents: true } } },
    orderBy: [{ documents: { _count: "desc" } }, { name: "asc" }],
  });
  return NextResponse.json(tags);
}

export async function POST(req: NextRequest) {
  const body = await req.json() as { name?: string };
  const name = normalizeTag(body.name ?? "");

  if (!name || name.length > 50) {
    return NextResponse.json({ error: "Invalid tag name" }, { status: 400 });
  }

  const tag = await prisma.tag.upsert({
    where: { name },
    update: {},
    create: { name, color: tagColor(name) },
    include: { _count: { select: { documents: true } } },
  });

  return NextResponse.json(tag);
}
