import { convert } from "@opendataloader/pdf";
import { mkdtemp, writeFile, readFile, rm } from "fs/promises";
import path from "path";
import { tmpdir } from "os";

export async function parsePdf(buffer: Buffer): Promise<string> {
  const tmpDir = await mkdtemp(path.join(tmpdir(), "odl-"));
  try {
    const inputPath = path.join(tmpDir, "input.pdf");
    const outputDir = path.join(tmpDir, "output");

    await writeFile(inputPath, buffer);
    await convert([inputPath], { outputDir, format: "markdown" });

    const markdownPath = path.join(outputDir, "input.md");
    return await readFile(markdownPath, "utf-8");
  } finally {
    await rm(tmpDir, { recursive: true, force: true }).catch(() => {});
  }
}
