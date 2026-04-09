import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { DocumentDetail } from "@/components/documents/DocumentDetail";
import type { Document, Folder, Tag } from "@/types";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function DocumentPage({ params }: Props) {
  const { id } = await params;

  const [doc, folders, allTags] = await Promise.all([
    prisma.document.findUnique({
      where: { id },
      include: { folder: true, tags: true },
    }),
    prisma.folder.findMany({
      include: { _count: { select: { documents: true } } },
      orderBy: { createdAt: "asc" },
    }),
    prisma.tag.findMany({ orderBy: { name: "asc" } }),
  ]);

  if (!doc) notFound();

  return (
    <div className="min-h-screen bg-transparent">
      <DocumentDetail
        doc={doc as unknown as Document}
        folders={folders as unknown as Folder[]}
        allTags={allTags as unknown as Tag[]}
      />
    </div>
  );
}

export async function generateMetadata({ params }: Props) {
  const { id } = await params;
  const doc = await prisma.document.findUnique({ where: { id }, select: { title: true } });
  return {
    title: doc ? `${doc.title} — Gnostix` : "Document — Gnostix",
  };
}
