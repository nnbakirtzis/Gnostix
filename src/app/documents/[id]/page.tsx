import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { DocumentDetail } from "@/components/documents/DocumentDetail";
import type { Document, Folder } from "@/types";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function DocumentPage({ params }: Props) {
  const { id } = await params;

  const [doc, folders] = await Promise.all([
    prisma.document.findUnique({
      where: { id },
      include: { folder: true },
    }),
    prisma.folder.findMany({
      include: { _count: { select: { documents: true } } },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  if (!doc) notFound();

  return (
    <div className="min-h-screen bg-[#161616]">
      <DocumentDetail
        doc={doc as unknown as Document}
        folders={folders as unknown as Folder[]}
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
