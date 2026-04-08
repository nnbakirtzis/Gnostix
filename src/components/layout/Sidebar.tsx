"use client";

import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { FileText, Star, Plus, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { type Folder, type Tag } from "@/types";

interface SidebarProps {
  folders: Folder[];
  tags: Tag[];
  docCounts: { total: number; favorites: number };
  onCreateFolder: () => void;
}

export function Sidebar({ folders, tags, docCounts, onCreateFolder }: SidebarProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const activeFolderId = searchParams.get("folder");
  const isFavorites = searchParams.get("favorites") === "true";
  const activeTag = searchParams.get("tag");

  function navigate(params: Record<string, string | null>) {
    const sp = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) {
      if (v !== null) sp.set(k, v);
    }
    const qs = sp.toString();
    router.push(qs ? `/?${qs}` : "/");
  }

  return (
    <aside className="flex h-full w-60 flex-col border-r border-[#262626] bg-[#121212]">
      {/* Logo */}
      <div className="flex items-center gap-2.5 border-b border-[#262626] px-4 py-[18px]">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[rgba(179,143,111,0.15)] ring-1 ring-[#b38f6f]/30">
          <Sparkles className="h-3.5 w-3.5 text-[#b38f6f]" />
        </div>
        <span
          className="text-sm font-semibold tracking-tight text-[#ede9e4]"
          style={{ fontFamily: 'var(--font-heading)' }}
        >
          Gnostix
        </span>
      </div>

      <nav className="flex flex-1 flex-col gap-0.5 overflow-y-auto p-2">
        {/* All Documents */}
        <button
          onClick={() => navigate({})}
          className={cn(
            "flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-left text-sm transition-colors cursor-pointer",
            !activeFolderId && !isFavorites
              ? "border-l-2 border-[#b38f6f] bg-[rgba(179,143,111,0.08)] text-[#ede9e4] pl-[10px]"
              : "text-[#9e8f7f] hover:bg-[#1d1d1d] hover:text-[#ede9e4]"
          )}
        >
          <FileText className="h-4 w-4 shrink-0" />
          <span className="flex-1 truncate">All Documents</span>
          <span className="text-xs text-[#6b5d4f]">{docCounts.total}</span>
        </button>

        {/* Favorites */}
        <button
          onClick={() => navigate({ favorites: "true" })}
          className={cn(
            "flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-left text-sm transition-colors cursor-pointer",
            isFavorites
              ? "border-l-2 border-[#b38f6f] bg-[rgba(179,143,111,0.08)] text-[#ede9e4] pl-[10px]"
              : "text-[#9e8f7f] hover:bg-[#1d1d1d] hover:text-[#ede9e4]"
          )}
        >
          <Star className="h-4 w-4 shrink-0" />
          <span className="flex-1 truncate">Favorites</span>
          {docCounts.favorites > 0 && (
            <span className="text-xs text-[#6b5d4f]">{docCounts.favorites}</span>
          )}
        </button>

        {/* Folders section */}
        <div className="mt-4">
          <div className="flex items-center justify-between px-3 py-1">
            <span className="text-[10px] font-semibold uppercase tracking-widest text-[#6b5d4f]">
              Folders
            </span>
            <button
              onClick={onCreateFolder}
              className="rounded p-0.5 text-[#6b5d4f] hover:bg-[#1d1d1d] hover:text-[#b38f6f] transition-colors cursor-pointer"
              title="Create folder"
            >
              <Plus className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="mt-1 space-y-0.5">
            {folders.length === 0 && (
              <p className="px-3 py-2 text-xs text-[#6b5d4f]">
                No folders yet
              </p>
            )}
            {folders.map((folder) => (
              <button
                key={folder.id}
                onClick={() => navigate({ folder: folder.id })}
                className={cn(
                  "flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-left text-sm transition-colors cursor-pointer",
                  activeFolderId === folder.id
                    ? "border-l-2 border-[#b38f6f] bg-[rgba(179,143,111,0.08)] text-[#ede9e4] pl-[10px]"
                    : "text-[#9e8f7f] hover:bg-[#1d1d1d] hover:text-[#ede9e4]"
                )}
              >
                <span
                  className="h-2 w-2 shrink-0 rounded-full"
                  style={{ backgroundColor: folder.color }}
                />
                <span className="flex-1 truncate">{folder.name}</span>
                <span className="text-xs text-[#6b5d4f]">
                  {folder._count?.documents ?? 0}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Tags section */}
        <div className="mt-4">
          <div className="flex items-center px-3 py-1">
            <span className="text-[10px] font-semibold uppercase tracking-widest text-[#6b5d4f]">
              Tags
            </span>
          </div>
          <div className="mt-1 space-y-0.5">
            {tags.length === 0 && (
              <p className="px-3 py-2 text-xs text-[#6b5d4f]">No tags yet</p>
            )}
            {tags.map((tag) => (
              <button
                key={tag.id}
                onClick={() => navigate({ tag: tag.name })}
                className={cn(
                  "flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-left text-sm transition-colors cursor-pointer",
                  activeTag === tag.name
                    ? "border-l-2 border-[#b38f6f] bg-[rgba(179,143,111,0.08)] text-[#ede9e4] pl-[10px]"
                    : "text-[#9e8f7f] hover:bg-[#1d1d1d] hover:text-[#ede9e4]"
                )}
              >
                <span
                  className="h-2 w-2 shrink-0 rounded-full"
                  style={{ backgroundColor: tag.color }}
                />
                <span className="flex-1 truncate">{tag.name}</span>
                {tag._count && tag._count.documents > 0 && (
                  <span className="text-xs text-[#6b5d4f]">{tag._count.documents}</span>
                )}
              </button>
            ))}
          </div>
        </div>
      </nav>
    </aside>
  );
}
