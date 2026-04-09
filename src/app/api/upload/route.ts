import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { summarizeDocument, type SummaryStyle } from "@/lib/summarize";
import { chunkAndEmbedDocument } from "@/lib/indexing";
import { parseDocument, getFileType } from "@/lib/parsers";
import path from "node:path";
import fs from "node:fs/promises";
import crypto from "node:crypto";

export const runtime = "nodejs";

const MAX_SIZE_BYTES = 50 * 1024 * 1024; // 50MB

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const rawStyle = formData.get("style") as string | null;
    const validStyles: SummaryStyle[] = ["executive", "academic", "simple", "casual"];
    const style: SummaryStyle = validStyles.includes(rawStyle as SummaryStyle)
      ? (rawStyle as SummaryStyle)
      : "executive";

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const fileType = getFileType(file.name);
    if (!fileType) {
      return NextResponse.json(
        { error: "Unsupported file type. Please upload PDF, DOCX, TXT, or MD files." },
        { status: 400 }
      );
    }

    if (file.size > MAX_SIZE_BYTES) {
      return NextResponse.json(
        { error: "File too large. Maximum size is 50MB." },
        { status: 400 }
      );
    }

    // Read file into buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Save to disk
    const uniqueId = crypto.randomUUID().replace(/-/g, "").slice(0, 12);
    const safeFilename = file.name.replace(/[^a-zA-Z0-9.\-_]/g, "_");
    const storedFilename = `${uniqueId}-${safeFilename}`;
    const uploadsDir = path.join(process.cwd(), "uploads");
    await fs.mkdir(uploadsDir, { recursive: true });
    const filePath = path.join(uploadsDir, storedFilename);
    await fs.writeFile(filePath, buffer);

    // Create DB record
    const doc = await prisma.document.create({
      data: {
        title: file.name.replace(/\.[^.]+$/, ""),
        fileName: file.name,
        fileType,
        fileSize: file.size,
        filePath: `uploads/${storedFilename}`,
        status: "processing",
      },
    });

    // Extract text
    let extractedText: string;
    try {
      extractedText = await parseDocument(buffer, fileType);
    } catch (err) {
      await prisma.document.update({
        where: { id: doc.id },
        data: { status: "error" },
      });
      return NextResponse.json(
        { error: "Failed to extract text from document", id: doc.id },
        { status: 422 }
      );
    }

    // Summarize with AI provider
    let summary;
    try {
      summary = await summarizeDocument(extractedText, file.name, style);
    } catch (err) {
      console.error("[upload/ai]", err);
      await prisma.document.update({
        where: { id: doc.id },
        data: { status: "error" },
      });
      const message = err instanceof Error ? err.message : "Unknown error";
      const isQuota = message.includes("429") || message.includes("quota") || message.includes("RESOURCE_EXHAUSTED");
      const isOllamaDown = message.includes("ECONNREFUSED") || message.includes("fetch failed");
      return NextResponse.json(
        {
          error: isOllamaDown
            ? "Ollama is not running. Start it with: ollama serve"
            : isQuota
              ? "Gemini API quota exceeded. Try again later or enable billing at https://ai.dev"
              : `AI summarization failed: ${message}`,
          id: doc.id,
        },
        { status: 500 }
      );
    }

    // Update DB with results
    const updated = await prisma.document.update({
      where: { id: doc.id },
      data: {
        title: summary.title,
        summary: summary.summary,
        keyPoints: JSON.stringify(summary.keyPoints),
        actionItems: JSON.stringify(summary.actionItems),
        status: "done",
      },
      include: { folder: true, tags: true },
    });

    // Chunk + embed for RAG. Non-fatal: if this fails the document still
    // lands as "done" with chunkCount=0, and chat falls back to full-text.
    try {
      await chunkAndEmbedDocument(doc.id, extractedText);
    } catch (err) {
      console.error("[upload/index]", err);
    }

    return NextResponse.json(updated, { status: 201 });
  } catch (err) {
    console.error("[upload]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
