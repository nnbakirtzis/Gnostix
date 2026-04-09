import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { chatWithDocument } from "@/lib/chat";
import { retrieveRelevantChunks, type RetrievedChunk } from "@/lib/retrieval";
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

  // Use the last user message as the retrieval query.
  const lastUserMsg =
    [...messages].reverse().find((m) => m.role === "user")?.content ?? "";

  let retrieved: RetrievedChunk[] = [];
  if (doc.chunkCount > 0 && lastUserMsg) {
    try {
      retrieved = await retrieveRelevantChunks(doc.id, lastUserMsg, { k: 4 });
    } catch (err) {
      console.error("[chat/retrieval]", err);
    }
  }

  // Fallback for pre-RAG documents (chunkCount=0) or retrieval failure:
  // read + parse the file on demand, same as the pre-RAG behavior.
  let fallbackText: string | null = null;
  if (retrieved.length === 0) {
    const fileType = getFileType(doc.fileName);
    if (!fileType) {
      return NextResponse.json({ error: "Unsupported file type" }, { status: 400 });
    }
    const filePath = path.isAbsolute(doc.filePath)
      ? doc.filePath
      : path.join(process.cwd(), doc.filePath);
    try {
      const buffer = await fs.readFile(filePath);
      fallbackText = await parseDocument(buffer, fileType);
    } catch {
      return NextResponse.json({ error: "Could not read document file" }, { status: 500 });
    }
  }

  const generator = chatWithDocument({
    title: doc.title,
    summary: doc.summary,
    retrievedChunks: retrieved,
    fallbackText,
    messages,
  });

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
