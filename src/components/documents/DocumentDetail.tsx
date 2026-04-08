"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Star,
  Download,
  Copy,
  Trash2,
  Check,
  CheckSquare,
  ListChecks,
  Sparkles,
  FolderInput,
  AlertTriangle,
  Tag as TagIcon,
  MessageSquare,
} from "lucide-react";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { TagInput } from "@/components/tags/TagInput";
import { TagBadge } from "@/components/tags/TagBadge";
import { ChatPanel } from "@/components/documents/ChatPanel";
import { cn, formatDate, formatBytes } from "@/lib/utils";
import { parseKeyPoints, parseActionItems } from "@/types";
import type { Document, Folder, Tag } from "@/types";

const FILE_TYPE_LABELS: Record<string, string> = {
  pdf: "PDF",
  docx: "Word Document",
  txt: "Plain Text",
  md: "Markdown",
};

interface DocumentDetailProps {
  doc: Document;
  folders: Folder[];
  allTags: Tag[];
  onNewTagCreated?: () => void;
}

export function DocumentDetail({ doc, folders, allTags, onNewTagCreated }: DocumentDetailProps) {
  const router = useRouter();
  const [isFavorite, setIsFavorite] = useState(doc.isFavorite);
  const [currentDoc, setCurrentDoc] = useState(doc);
  const [currentTags, setCurrentTags] = useState<Tag[]>(doc.tags);
  const [copied, setCopied] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);

  const keyPoints = parseKeyPoints(currentDoc);
  const actionItems = parseActionItems(currentDoc);

  async function toggleFavorite() {
    const next = !isFavorite;
    setIsFavorite(next);
    await fetch(`/api/documents/${doc.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isFavorite: next }),
    });
  }

  async function moveToFolder(folderId: string | null) {
    const res = await fetch(`/api/documents/${doc.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ folderId }),
    });
    const updated = await res.json() as Document;
    setCurrentDoc(updated);
  }

  async function handleDelete() {
    if (!confirm("Delete this document? This cannot be undone.")) return;
    setDeleting(true);
    await fetch(`/api/documents/${doc.id}`, { method: "DELETE" });
    router.push("/");
  }

  function buildMarkdown(): string {
    const lines: string[] = [
      `# ${currentDoc.title}`,
      "",
      `**File:** ${currentDoc.fileName} (${FILE_TYPE_LABELS[currentDoc.fileType] ?? currentDoc.fileType})`,
      `**Date:** ${formatDate(currentDoc.createdAt)}`,
      "",
      "## Summary",
      "",
      currentDoc.summary ?? "",
      "",
    ];
    if (keyPoints.length > 0) {
      lines.push("## Key Points", "");
      keyPoints.forEach((p) => lines.push(`- ${p}`));
      lines.push("");
    }
    if (actionItems.length > 0) {
      lines.push("## Action Items", "");
      actionItems.forEach((a) => lines.push(`- [ ] ${a}`));
      lines.push("");
    }
    return lines.join("\n");
  }

  async function copyMarkdown() {
    await navigator.clipboard.writeText(buildMarkdown());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function downloadMarkdown() {
    const content = buildMarkdown();
    const blob = new Blob([content], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${currentDoc.title.replace(/[^a-zA-Z0-9 ]/g, "")}.md`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      {/* Back + actions */}
      <div className="mb-6 flex items-center justify-between">
        <Link
          href="/"
          className="flex items-center gap-1.5 text-sm text-[#6b5d4f] hover:text-[#b38f6f] transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Link>

        <div className="flex items-center gap-2">
          <button
            onClick={toggleFavorite}
            className={cn(
              "rounded-lg p-2 transition-colors cursor-pointer",
              isFavorite
                ? "text-amber-400 hover:text-amber-300"
                : "text-[#6b5d4f] hover:text-amber-400 hover:bg-[#2e2e2e]"
            )}
            title={isFavorite ? "Remove from favorites" : "Add to favorites"}
          >
            <Star className="h-4 w-4" fill={isFavorite ? "currentColor" : "none"} />
          </button>

          {/* Move to folder */}
          {folders.length > 0 && (
            <DropdownMenu.Root>
              <DropdownMenu.Trigger asChild>
                <Button variant="outline" size="sm">
                  <FolderInput className="h-3.5 w-3.5" />
                  {currentDoc.folder ? currentDoc.folder.name : "Move to folder"}
                </Button>
              </DropdownMenu.Trigger>
              <DropdownMenu.Portal>
                <DropdownMenu.Content
                  className="z-50 min-w-[160px] rounded-lg border border-[#2e2e2e] bg-[#1d1d1d] p-1 shadow-xl"
                  sideOffset={4}
                  align="end"
                >
                  <DropdownMenu.Item
                    className="flex cursor-pointer items-center gap-2 rounded-md px-2.5 py-1.5 text-sm text-[#6b5d4f] hover:bg-[#2e2e2e] hover:text-[#ede9e4] outline-none"
                    onSelect={() => moveToFolder(null)}
                  >
                    No folder
                  </DropdownMenu.Item>
                  {folders.map((f) => (
                    <DropdownMenu.Item
                      key={f.id}
                      className="flex cursor-pointer items-center gap-2 rounded-md px-2.5 py-1.5 text-sm text-[#9e8f7f] hover:bg-[#2e2e2e] hover:text-[#ede9e4] outline-none"
                      onSelect={() => moveToFolder(f.id)}
                    >
                      <span
                        className="h-2 w-2 rounded-full"
                        style={{ backgroundColor: f.color }}
                      />
                      {f.name}
                    </DropdownMenu.Item>
                  ))}
                </DropdownMenu.Content>
              </DropdownMenu.Portal>
            </DropdownMenu.Root>
          )}

          {/* Export */}
          <DropdownMenu.Root>
            <DropdownMenu.Trigger asChild>
              <Button variant="outline" size="sm">
                <Download className="h-3.5 w-3.5" />
                Export
              </Button>
            </DropdownMenu.Trigger>
            <DropdownMenu.Portal>
              <DropdownMenu.Content
                className="z-50 min-w-[180px] rounded-lg border border-[#2e2e2e] bg-[#1d1d1d] p-1 shadow-xl"
                sideOffset={4}
                align="end"
              >
                <DropdownMenu.Item
                  className="flex cursor-pointer items-center gap-2 rounded-md px-2.5 py-1.5 text-sm text-[#9e8f7f] hover:bg-[#2e2e2e] hover:text-[#ede9e4] outline-none"
                  onSelect={copyMarkdown}
                >
                  {copied ? (
                    <Check className="h-3.5 w-3.5 text-green-400" />
                  ) : (
                    <Copy className="h-3.5 w-3.5" />
                  )}
                  {copied ? "Copied!" : "Copy as Markdown"}
                </DropdownMenu.Item>
                <DropdownMenu.Item
                  className="flex cursor-pointer items-center gap-2 rounded-md px-2.5 py-1.5 text-sm text-[#9e8f7f] hover:bg-[#2e2e2e] hover:text-[#ede9e4] outline-none"
                  onSelect={downloadMarkdown}
                >
                  <Download className="h-3.5 w-3.5" />
                  Download .md
                </DropdownMenu.Item>
              </DropdownMenu.Content>
            </DropdownMenu.Portal>
          </DropdownMenu.Root>

          <Button
            variant={chatOpen ? "default" : "outline"}
            size="sm"
            onClick={() => setChatOpen(!chatOpen)}
            title="Chat about this document"
          >
            <MessageSquare className="h-3.5 w-3.5" />
            Chat
          </Button>

          <Button
            variant="destructive"
            size="sm"
            onClick={handleDelete}
            disabled={deleting}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* Document header */}
      <div className="mb-8">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <span className="rounded-md bg-[rgba(179,143,111,0.12)] border border-[#b38f6f]/20 px-2 py-0.5 text-xs font-medium text-[#b38f6f]">
            {FILE_TYPE_LABELS[currentDoc.fileType] ?? currentDoc.fileType}
          </span>
          <span className="text-xs text-[#6b5d4f]">·</span>
          <span className="text-xs text-[#6b5d4f]">{formatBytes(currentDoc.fileSize)}</span>
          <span className="text-xs text-[#6b5d4f]">·</span>
          <span className="text-xs text-[#6b5d4f]">{formatDate(currentDoc.createdAt)}</span>
          {currentDoc.folder && (
            <>
              <span className="text-xs text-[#6b5d4f]">·</span>
              <Badge color={currentDoc.folder.color}>
                <span
                  className="h-1.5 w-1.5 rounded-full"
                  style={{ backgroundColor: currentDoc.folder.color }}
                />
                {currentDoc.folder.name}
              </Badge>
            </>
          )}
          {currentTags.map((tag) => (
            <TagBadge key={tag.id} tag={tag} asLink />
          ))}
        </div>
        <h1
          className="text-2xl font-bold tracking-tight text-[#ede9e4]"
          style={{ fontFamily: 'var(--font-heading)' }}
        >
          {currentDoc.title}
        </h1>
        <p className="mt-1 text-sm text-[#6b5d4f]">{currentDoc.fileName}</p>
      </div>

      {/* Tags */}
      <div className="mb-6">
        <div className="mb-2 flex items-center gap-2">
          <div className="flex h-6 w-6 items-center justify-center rounded-md bg-[rgba(179,143,111,0.08)]">
            <TagIcon className="h-3.5 w-3.5 text-[#b38f6f]" />
          </div>
          <h2
            className="text-sm font-semibold uppercase tracking-wider text-[#9e8f7f]"
            style={{ fontFamily: 'var(--font-heading)' }}
          >
            Tags
          </h2>
        </div>
        <TagInput
          docId={doc.id}
          initialTags={currentTags}
          allTags={allTags}
          onTagsChange={setCurrentTags}
          onNewTagCreated={onNewTagCreated}
        />
      </div>

      {/* Error state */}
      {currentDoc.status === "error" && (
        <div className="mb-6 flex items-start gap-3 rounded-xl border border-red-900 bg-red-900/20 p-4">
          <AlertTriangle className="h-5 w-5 shrink-0 text-red-400" />
          <div>
            <p className="text-sm font-medium text-red-300">Processing failed</p>
            <p className="mt-0.5 text-xs text-red-400/80">
              The document could not be analyzed. Check that your GEMINI_API_KEY is valid.
            </p>
          </div>
        </div>
      )}

      {/* Processing state */}
      {currentDoc.status === "processing" && (
        <div className="mb-6 flex items-center gap-3 rounded-xl border border-[#b38f6f]/20 bg-[rgba(179,143,111,0.05)] p-4">
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-[#b38f6f] border-t-transparent" />
          <p className="text-sm text-[#c9a882]">Analyzing document with AI…</p>
        </div>
      )}

      {currentDoc.summary && (
        <div className="space-y-6">
          {/* Summary */}
          <section>
            <div className="mb-3 flex items-center gap-2">
              <div className="flex h-6 w-6 items-center justify-center rounded-md bg-[rgba(179,143,111,0.12)]">
                <Sparkles className="h-3.5 w-3.5 text-[#b38f6f]" />
              </div>
              <h2
                className="text-sm font-semibold uppercase tracking-wider text-[#9e8f7f]"
                style={{ fontFamily: 'var(--font-heading)' }}
              >
                AI Summary
              </h2>
            </div>
            <div className="rounded-xl border border-[#262626] bg-[#1d1d1d] p-5">
              {currentDoc.summary.split("\n\n").map((para, i) => (
                <p
                  key={i}
                  className={cn(
                    "text-sm leading-relaxed text-[#9e8f7f]",
                    i > 0 && "mt-3"
                  )}
                >
                  {para}
                </p>
              ))}
            </div>
          </section>

          {/* Key Points */}
          {keyPoints.length > 0 && (
            <section>
              <div className="mb-3 flex items-center gap-2">
                <div className="flex h-6 w-6 items-center justify-center rounded-md bg-blue-600/15">
                  <ListChecks className="h-3.5 w-3.5 text-blue-400" />
                </div>
                <h2
                  className="text-sm font-semibold uppercase tracking-wider text-[#9e8f7f]"
                  style={{ fontFamily: 'var(--font-heading)' }}
                >
                  Key Points
                </h2>
              </div>
              <div className="rounded-xl border border-[#262626] bg-[#1d1d1d] p-5">
                <ul className="space-y-2.5">
                  {keyPoints.map((point, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <span className="mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-600/15 text-[10px] font-bold text-blue-400">
                        {i + 1}
                      </span>
                      <p className="text-sm leading-relaxed text-[#9e8f7f]">{point}</p>
                    </li>
                  ))}
                </ul>
              </div>
            </section>
          )}

          {/* Action Items */}
          {actionItems.length > 0 && (
            <section>
              <div className="mb-3 flex items-center gap-2">
                <div className="flex h-6 w-6 items-center justify-center rounded-md bg-emerald-600/15">
                  <CheckSquare className="h-3.5 w-3.5 text-emerald-400" />
                </div>
                <h2
                  className="text-sm font-semibold uppercase tracking-wider text-[#9e8f7f]"
                  style={{ fontFamily: 'var(--font-heading)' }}
                >
                  Action Items
                </h2>
              </div>
              <div className="rounded-xl border border-[#262626] bg-[#1d1d1d] p-5">
                <ul className="space-y-2.5">
                  {actionItems.map((item, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <div className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border border-emerald-700 bg-emerald-900/20">
                        <Check className="h-2.5 w-2.5 text-emerald-400" />
                      </div>
                      <p className="text-sm leading-relaxed text-[#9e8f7f]">{item}</p>
                    </li>
                  ))}
                </ul>
              </div>
            </section>
          )}
        </div>
      )}
      {chatOpen && (
        <ChatPanel docId={doc.id} onClose={() => setChatOpen(false)} />
      )}
    </div>
  );
}
