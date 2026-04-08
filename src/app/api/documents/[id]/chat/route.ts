import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { chatWithDocument } from "@/lib/chat";
import { parseDocument, getFileType } from "@/lib/parsers";
import type { ChatMessage } from "@/types";
import fs from "node:fs/promises";
import path from "node:path";

export const runtime = "nodejs";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const doc = await prisma.document.findUnique({ where: { id } });
  if (!doc) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { messages } = (await req.json()) as { messages: ChatMessage[] };
  if (!messages || messages.length === 0) {
    return NextResponse.json({ error: "No messages" }, { status: 400 });
  }

  // Parse document content from disk
  const fileType = getFileType(doc.fileName);
  if (!fileType) {
    return NextResponse.json({ error: "Unsupported file type" }, { status: 400 });
  }

  const filePath = path.isAbsolute(doc.filePath)
    ? doc.filePath
    : path.join(process.cwd(), doc.filePath);

  let documentText: string;
  try {
    const buffer = await fs.readFile(filePath);
    documentText = await parseDocument(buffer, fileType);
  } catch {
    return NextResponse.json({ error: "Could not read document file" }, { status: 500 });
  }

  const generator = chatWithDocument(
    documentText,
    doc.title,
    doc.summary,
    messages
  );

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      try {
        for await (const chunk of generator) {
          controller.enqueue(encoder.encode(chunk));
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : "Chat failed";
        controller.enqueue(encoder.encode(`\n\n[Error: ${message}]`));
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-cache",
    },
  });
}
