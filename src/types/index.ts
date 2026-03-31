export interface Folder {
  id: string;
  name: string;
  color: string;
  createdAt: string;
  updatedAt: string;
  _count?: { documents: number };
}

export interface Document {
  id: string;
  title: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  filePath: string;
  status: "pending" | "processing" | "done" | "error";
  summary: string | null;
  keyPoints: string | null;   // JSON string
  actionItems: string | null; // JSON string
  folderId: string | null;
  folder: Folder | null;
  isFavorite: boolean;
  createdAt: string;
  updatedAt: string;
}

export function parseKeyPoints(doc: Document): string[] {
  if (!doc.keyPoints) return [];
  try {
    return JSON.parse(doc.keyPoints) as string[];
  } catch {
    return [];
  }
}

export function parseActionItems(doc: Document): string[] {
  if (!doc.actionItems) return [];
  try {
    return JSON.parse(doc.actionItems) as string[];
  } catch {
    return [];
  }
}
