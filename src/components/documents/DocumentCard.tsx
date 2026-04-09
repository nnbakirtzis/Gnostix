"use client";

import Link from "next/link";
import {
  Star,
  MoreVertical,
  Trash2,
  FolderInput,
} from "lucide-react";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { cn, formatRelative, formatBytes, truncate } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { TagBadge } from "@/components/tags/TagBadge";
import type { Document, Folder, Tag } from "@/types";

const FILE_TYPE_ICONS: Record<string, string> = {
  pdf: "PDF",
  docx: "DOC",
  txt: "TXT",
  md: "MD",
};

interface DocumentCardProps {
  doc: Document;
  folders: Folder[];
  allTags: Tag[];
  onToggleFavorite: (id: string, value: boolean) => void;
  onDelete: (id: string) => void;
  onMoveToFolder: (id: string, folderId: string | null) => void;
}

export function DocumentCard({
  doc,
  folders,
  onToggleFavorite,
  onDelete,
  onMoveToFolder,
}: DocumentCardProps) {
  const isProcessing = doc.status === "processing";
  const isError = doc.status === "error";

  return (
    <div className="group relative flex flex-col rounded-xl border border-[#262626] bg-[#1d1d1d] p-4 transition-all duration-200 hover:border-[#b38f6f]/40 hover:bg-[#222222] cursor-pointer">
      {/* Header */}
      <div className="mb-3 flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[rgba(179,143,111,0.12)] border border-[#b38f6f]/20 text-[10px] font-bold tracking-wider text-[#b38f6f]">
            {FILE_TYPE_ICONS[doc.fileType] ?? "FILE"}
          </span>
          <div className="min-w-0">
            <Link
              href={`/documents/${doc.id}`}
              className="block truncate text-sm font-medium text-[#ede9e4] hover:text-[#b38f6f] transition-colors"
            >
              {doc.title}
            </Link>
            <p className="text-xs text-[#6b5d4f]">
              {formatBytes(doc.fileSize)} · {formatRelative(doc.createdAt)}
            </p>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-1">
          <button
            onClick={() => onToggleFavorite(doc.id, !doc.isFavorite)}
            className={cn(
              "rounded p-1 transition-colors cursor-pointer",
              doc.isFavorite
                ? "text-amber-400 hover:text-amber-300"
                : "text-[#6b5d4f] hover:text-amber-400 opacity-0 group-hover:opacity-100"
            )}
          >
            <Star className="h-3.5 w-3.5" fill={doc.isFavorite ? "currentColor" : "none"} />
          </button>

          <DropdownMenu.Root>
            <DropdownMenu.Trigger asChild>
              <button className="rounded p-1 text-[#6b5d4f] hover:bg-[#2e2e2e] hover:text-[#9e8f7f] opacity-0 transition-colors group-hover:opacity-100 cursor-pointer">
                <MoreVertical className="h-3.5 w-3.5" />
              </button>
            </DropdownMenu.Trigger>
            <DropdownMenu.Portal>
              <DropdownMenu.Content
                className="z-50 min-w-[160px] rounded-lg border border-[#2e2e2e] bg-[#1d1d1d] p-1 shadow-xl"
                sideOffset={4}
                align="end"
              >
                {folders.length > 0 && (
                  <DropdownMenu.Sub>
                    <DropdownMenu.SubTrigger className="flex w-full cursor-pointer items-center gap-2 rounded-md px-2.5 py-1.5 text-sm text-[#9e8f7f] hover:bg-[#2e2e2e] hover:text-[#ede9e4] outline-none">
                      <FolderInput className="h-3.5 w-3.5" />
                      Move to folder
                    </DropdownMenu.SubTrigger>
                    <DropdownMenu.SubContent className="z-50 min-w-[140px] rounded-lg border border-[#2e2e2e] bg-[#1d1d1d] p-1 shadow-xl">
                      <DropdownMenu.Item
                        className="flex cursor-pointer items-center gap-2 rounded-md px-2.5 py-1.5 text-sm text-[#6b5d4f] hover:bg-[#2e2e2e] hover:text-[#ede9e4] outline-none"
                        onSelect={() => onMoveToFolder(doc.id, null)}
                      >
                        No folder
                      </DropdownMenu.Item>
                      {folders.map((f) => (
                        <DropdownMenu.Item
                          key={f.id}
                          className="flex cursor-pointer items-center gap-2 rounded-md px-2.5 py-1.5 text-sm text-[#9e8f7f] hover:bg-[#2e2e2e] hover:text-[#ede9e4] outline-none"
                          onSelect={() => onMoveToFolder(doc.id, f.id)}
                        >
                          <span
                            className="h-2 w-2 rounded-full"
                            style={{ backgroundColor: f.color }}
                          />
                          {f.name}
                        </DropdownMenu.Item>
                      ))}
                    </DropdownMenu.SubContent>
                  </DropdownMenu.Sub>
                )}
                <DropdownMenu.Item
                  className="flex w-full cursor-pointer items-center gap-2 rounded-md px-2.5 py-1.5 text-sm text-red-400 hover:bg-red-900/20 hover:text-red-300 outline-none"
                  onSelect={() => onDelete(doc.id)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Delete
                </DropdownMenu.Item>
              </DropdownMenu.Content>
            </DropdownMenu.Portal>
          </DropdownMenu.Root>
        </div>
      </div>

      {/* Folder badge */}
      {doc.folder && (
        <div className="mb-2">
          <Badge color={doc.folder.color}>
            <span
              className="h-1.5 w-1.5 rounded-full"
              style={{ backgroundColor: doc.folder.color }}
            />
            {doc.folder.name}
          </Badge>
        </div>
      )}

      {/* Tag badges (tags omitted e.g. from upload response until refetch) */}
      {(doc.tags ?? []).length > 0 && (
        <div className="mb-2 flex flex-wrap gap-1">
          {(doc.tags ?? []).map((tag) => (
            <TagBadge key={tag.id} tag={tag} asLink />
          ))}
        </div>
      )}

      {/* Status / content */}
      <Link href={`/documents/${doc.id}`} className="flex-1">
        {isProcessing && (
          <div className="flex items-center gap-2 text-xs text-[#9e8f7f]">
            <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-[#b38f6f] border-t-transparent" />
            Processing…
          </div>
        )}
        {isError && (
          <p className="text-xs text-red-400">Failed to process document.</p>
        )}
        {doc.summary && !isProcessing && !isError && (
          <p className="text-xs leading-relaxed text-[#9e8f7f] line-clamp-3">
            {truncate(doc.summary, 200)}
          </p>
        )}
      </Link>
    </div>
  );
}
