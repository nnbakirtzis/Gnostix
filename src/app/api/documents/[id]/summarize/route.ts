import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { summarizeDocument, type SummaryStyle } from "@/lib/summarize";
import { parseDocument } from "@/lib/parsers";
import path from "node:path";
import fs from "node:fs/promises";

export const runtime = "nodejs";

const VALID_STYLES: SummaryStyle[] = ["executive", "academic", "simple", "casual"];

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const doc = await prisma.document.findUnique({ where: { id } });
  if (!doc) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json() as { style?: string };
  const style: SummaryStyle = VALID_STYLES.includes(body.style as SummaryStyle)
    ? (body.style as SummaryStyle)
    : "executive";

  // Read file from disk
  const filePath = path.join(process.cwd(), doc.filePath);
  let buffer: Buffer;
  try {
    buffer = await fs.readFile(filePath);
  } catch {
    return NextResponse.json({ error: "Source file not found on disk" }, { status: 404 });
  }

  // Re-parse text
  let text: string;
  try {
    text = await parseDocument(buffer, doc.fileType as "pdf" | "docx" | "txt" | "md");
  } catch {
    return NextResponse.json({ error: "Failed to extract text from document" }, { status: 422 });
  }

  // Re-summarize
  let summary;
  try {
    summary = await summarizeDocument(text, doc.fileName, style);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    const isOllamaDown = message.includes("ECONNREFUSED") || message.includes("fetch failed");
    const isQuota = message.includes("429") || message.includes("quota") || message.includes("RESOURCE_EXHAUSTED");
    return NextResponse.json(
      {
        error: isOllamaDown
          ? "Ollama is not running. Start it with: ollama serve"
          : isQuota
            ? "Gemini API quota exceeded. Try again later."
            : `AI summarization failed: ${message}`,
      },
      { status: 500 }
    );
  }

  const updated = await prisma.document.update({
    where: { id },
    data: {
      title: summary.title,
      summary: summary.summary,
      keyPoints: JSON.stringify(summary.keyPoints),
      actionItems: JSON.stringify(summary.actionItems),
    },
    include: { folder: true, tags: true },
  });

  return NextResponse.json(updated);
}
