import { parsePdf } from "./pdf";
import { parseDocx } from "./docx";
import { parseTxt } from "./txt";

export type SupportedFileType = "pdf" | "docx" | "txt" | "md";

export function getFileType(filename: string): SupportedFileType | null {
  const ext = filename.split(".").pop()?.toLowerCase();
  switch (ext) {
    case "pdf":
      return "pdf";
    case "docx":
      return "docx";
    case "txt":
      return "txt";
    case "md":
      return "md";
    default:
      return null;
  }
}

export async function parseDocument(
  buffer: Buffer,
  fileType: SupportedFileType
): Promise<string> {
  switch (fileType) {
    case "pdf":
      return parsePdf(buffer);
    case "docx":
      return parseDocx(buffer);
    case "txt":
    case "md":
      return parseTxt(buffer);
  }
}
