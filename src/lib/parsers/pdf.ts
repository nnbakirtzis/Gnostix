export async function parsePdf(buffer: Buffer): Promise<string> {
  // Dynamic require avoids the pdf-parse test file issue in Next.js
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const pdfParse = require("pdf-parse");
  const data = await pdfParse(buffer);
  return data.text as string;
}
