import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function GET() {
  const folders = await prisma.folder.findMany({
    include: { _count: { select: { documents: true } } },
    orderBy: { createdAt: "asc" },
  });
  return NextResponse.json(folders);
}

export async function POST(req: NextRequest) {
  const body = await req.json() as { name: string; color?: string };
  if (!body.name?.trim()) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }

  const folder = await prisma.folder.create({
    data: {
      name: body.name.trim(),
      color: body.color ?? "#8b5cf6",
    },
    include: { _count: { select: { documents: true } } },
  });

  return NextResponse.json(folder, { status: 201 });
}
