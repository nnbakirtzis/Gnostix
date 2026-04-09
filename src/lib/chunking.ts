import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";

export type Chunk = {
  ordinal: number;
  charStart: number;
  charEnd: number;
  text: string;
  tokenCount: number;
};

// ~800 tokens per chunk, ~100 tokens overlap (char/4 heuristic).
// Paragraph-first separators match executive-prose documents well.
const CHUNK_SIZE = 3200;
const CHUNK_OVERLAP = 400;

const splitter = new RecursiveCharacterTextSplitter({
  chunkSize: CHUNK_SIZE,
  chunkOverlap: CHUNK_OVERLAP,
  separators: ["\n\n", "\n", ". ", " ", ""],
});

export async function chunkText(text: string): Promise<Chunk[]> {
  if (!text.trim()) return [];

  const pieces = await splitter.splitText(text);

  // LangChain's splitter returns text only. Reconstruct offsets by advancing
  // a cursor through the source. Overlaps mean chunks may re-find earlier
  // text, so we always search from the *current* cursor forward.
  let cursor = 0;
  return pieces.map((piece, i) => {
    const found = text.indexOf(piece, cursor);
    const start = found === -1 ? cursor : found;
    const end = start + piece.length;
    // Advance cursor past the overlap region so the next search starts
    // after the non-overlapping part of this chunk.
    cursor = Math.max(cursor, end - CHUNK_OVERLAP);
    return {
      ordinal: i,
      charStart: start,
      charEnd: end,
      text: piece,
      tokenCount: Math.ceil(piece.length / 4),
    };
  });
}
