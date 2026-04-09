/**
 * One-shot reindexer: chunks + embeds any document that doesn't yet have
 * DocumentChunk rows (or all documents if --force is passed).
 *
 * Usage:
 *   npm run db:backfill         # only docs with chunkCount = 0
 *   npm run db:backfill -- --force   # re-index everything
 */
import fs from "node:fs/promises";
import path from "node:path";
import { prisma } from "@/lib/prisma";
import { parseDocument, getFileType } from "@/lib/parsers";
import { chunkAndEmbedDocument } from "@/lib/indexing";

const force = process.argv.includes("--force");

async function main() {
  const docs = await prisma.document.findMany({
    where: force ? {} : { chunkCount: 0, status: "done" },
    select: { id: true, fileName: true, filePath: true, title: true },
  });

  if (docs.length === 0) {
    console.log("Nothing to index.");
    return;
  }

  console.log(`Indexing ${docs.length} document(s)${force ? " (force)" : ""}…`);

  for (const doc of docs) {
    try {
      const fileType = getFileType(doc.fileName);
      if (!fileType) {
        console.warn(`skip ${doc.id}: unsupported file type (${doc.fileName})`);
        continue;
      }
      const abs = path.isAbsolute(doc.filePath)
        ? doc.filePath
        : path.join(process.cwd(), doc.filePath);
      const buf = await fs.readFile(abs);
      const text = await parseDocument(buf, fileType);
      const { chunkCount } = await chunkAndEmbedDocument(doc.id, text);
      console.log(`indexed ${doc.id} (${doc.title}): ${chunkCount} chunks`);
    } catch (err) {
      console.error(`failed ${doc.id}:`, err);
    }
  }

  await prisma.$disconnect();
}

main().catch(async (err) => {
  console.error(err);
  await prisma.$disconnect();
  process.exit(1);
});
