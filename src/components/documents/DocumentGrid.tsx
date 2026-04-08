"use client";

import { FileSearch } from "lucide-react";
import { DocumentCard } from "./DocumentCard";
import type { Document, Folder, Tag } from "@/types";

interface DocumentGridProps {
  docs: Document[];
  folders: Folder[];
  allTags: Tag[];
  loading: boolean;
  onToggleFavorite: (id: string, value: boolean) => void;
  onDelete: (id: string) => void;
  onMoveToFolder: (id: string, folderId: string | null) => void;
}

export function DocumentGrid({
  docs,
  folders,
  allTags,
  loading,
  onToggleFavorite,
  onDelete,
  onMoveToFolder,
}: DocumentGridProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {[...Array(6)].map((_, i) => (
          <div
            key={i}
            className="h-40 animate-pulse rounded-xl border border-[#262626] bg-[#1d1d1d]"
          />
        ))}
      </div>
    );
  }

  if (docs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-[rgba(179,143,111,0.08)] border border-[#262626]">
          <FileSearch className="h-8 w-8 text-[#6b5d4f]" />
        </div>
        <p className="text-sm font-medium text-[#9e8f7f]">No documents yet</p>
        <p className="mt-1 text-xs text-[#6b5d4f]">
          Upload your first document to get started
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {docs.map((doc) => (
        <DocumentCard
          key={doc.id}
          doc={doc}
          folders={folders}
          allTags={allTags}
          onToggleFavorite={onToggleFavorite}
          onDelete={onDelete}
          onMoveToFolder={onMoveToFolder}
        />
      ))}
    </div>
  );
}
