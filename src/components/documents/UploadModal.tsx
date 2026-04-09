"use client";

import { useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { Upload, FileText, X, AlertCircle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn, formatBytes } from "@/lib/utils";
import type { Document } from "@/types";
import type { SummaryStyle } from "@/lib/summarize";

const STYLES: { id: SummaryStyle; label: string; icon: string; description: string }[] = [
  { id: "executive", label: "Executive Brief", icon: "💼", description: "Concise & action-oriented" },
  { id: "academic",  label: "Academic",        icon: "🎓", description: "Formal & thorough" },
  { id: "simple",   label: "Plain Language",   icon: "💬", description: "Simple & clear" },
  { id: "casual",   label: "Casual",           icon: "☕", description: "Warm & conversational" },
];

const ACCEPTED_TYPES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain",
  "text/markdown",
];
const ACCEPTED_EXT = ".pdf,.docx,.txt,.md";
const MAX_SIZE = 50 * 1024 * 1024;

interface UploadModalProps {
  open: boolean;
  onClose: () => void;
  onUploaded: (doc: Document) => void;
}

export function UploadModal({ open, onClose, onUploaded }: UploadModalProps) {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [summaryStyle, setSummaryStyle] = useState<SummaryStyle>("executive");
  const inputRef = useRef<HTMLInputElement>(null);

  function validateFile(f: File): string | null {
    const ext = f.name.split(".").pop()?.toLowerCase();
    if (!["pdf", "docx", "txt", "md"].includes(ext ?? "")) {
      return "Unsupported file type. Please upload a PDF, DOCX, TXT, or MD file.";
    }
    if (f.size > MAX_SIZE) return "File exceeds 50MB limit.";
    return null;
  }

  function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    const f = files[0];
    const err = validateFile(f);
    if (err) {
      setError(err);
      setFile(null);
      return;
    }
    setFile(f);
    setError("");
  }

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);
      handleFiles(e.dataTransfer.files);
    },
    [] // eslint-disable-line
  );

  async function handleUpload() {
    if (!file) return;
    setUploading(true);
    setError("");
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("style", summaryStyle);
      const res = await fetch("/api/upload", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Upload failed");
      onUploaded(data as Document);
      setFile(null);
      onClose();
      router.push(`/documents/${(data as Document).id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  function handleClose() {
    if (uploading) return;
    setFile(null);
    setError("");
    setSummaryStyle("executive");
    onClose();
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Upload Document</DialogTitle>
          <DialogDescription>
            PDF, DOCX, TXT, or MD · Max 50 MB
          </DialogDescription>
        </DialogHeader>

        {/* Drop zone */}
        <div
          onDragEnter={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDragOver={(e) => e.preventDefault()}
          onDrop={onDrop}
          onClick={() => !uploading && inputRef.current?.click()}
          className={cn(
            "relative flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed p-8 text-center transition-colors",
            dragging
              ? "border-[#b38f6f] bg-[rgba(179,143,111,0.05)]"
              : file
              ? "border-[#2e2e2e] bg-[#242424]"
              : "border-[#2e2e2e] bg-[#1d1d1d] hover:border-[#b38f6f]/40 hover:bg-[#242424]"
          )}
        >
          <input
            ref={inputRef}
            type="file"
            accept={ACCEPTED_EXT}
            className="sr-only"
            onChange={(e) => handleFiles(e.target.files)}
            disabled={uploading}
          />

          {file ? (
            <>
              <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-[rgba(179,143,111,0.12)] border border-[#b38f6f]/20">
                <FileText className="h-6 w-6 text-[#b38f6f]" />
              </div>
              <p className="text-sm font-medium text-[#ede9e4] truncate max-w-xs">
                {file.name}
              </p>
              <p className="mt-1 text-xs text-[#6b5d4f]">{formatBytes(file.size)}</p>
              {!uploading && (
                <button
                  onClick={(e) => { e.stopPropagation(); setFile(null); setError(""); }}
                  className="absolute right-3 top-3 rounded p-1 text-[#6b5d4f] hover:text-[#9e8f7f] cursor-pointer"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </>
          ) : (
            <>
              <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-[#242424] border border-[#2e2e2e]">
                <Upload className="h-6 w-6 text-[#b38f6f]" />
              </div>
              <p className="text-sm font-medium text-[#9e8f7f]">
                Drag & drop or click to upload
              </p>
              <p className="mt-1 text-xs text-[#6b5d4f]">
                PDF, DOCX, TXT, MD up to 50 MB
              </p>
            </>
          )}
        </div>

        {/* Summary style picker */}
        <div>
          <p className="mb-2 text-xs font-medium text-[#9e8f7f]">Summary style</p>
          <div className="grid grid-cols-2 gap-2">
            {STYLES.map((s) => (
              <button
                key={s.id}
                type="button"
                disabled={uploading}
                onClick={() => setSummaryStyle(s.id)}
                className={cn(
                  "flex items-center gap-2.5 rounded-lg border px-3 py-2.5 text-left transition-colors",
                  summaryStyle === s.id
                    ? "border-[#b38f6f] bg-[rgba(179,143,111,0.1)]"
                    : "border-[#2e2e2e] bg-[#1d1d1d] hover:border-[#b38f6f]/40 hover:bg-[#242424]"
                )}
              >
                <span className="text-lg leading-none">{s.icon}</span>
                <div>
                  <p className={cn("text-xs font-medium", summaryStyle === s.id ? "text-[#c9a882]" : "text-[#9e8f7f]")}>
                    {s.label}
                  </p>
                  <p className="text-[10px] text-[#6b5d4f]">{s.description}</p>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Processing note */}
        {uploading && (
          <div className="flex items-center justify-center gap-2.5 rounded-lg border border-[#b38f6f]/20 bg-[rgba(179,143,111,0.05)] px-3 py-2.5">
            <span className="h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-[#b38f6f] border-t-transparent" />
            <div>
              <p className="text-xs font-medium text-[#c9a882]">
                Analyzing document with AI…
              </p>
              <p className="text-xs text-[#6b5d4f]">
                This may take 10-30 seconds
              </p>
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="flex items-start gap-2 rounded-lg border border-red-900 bg-red-900/20 px-3 py-2.5">
            <AlertCircle className="h-4 w-4 shrink-0 text-red-400 mt-0.5" />
            <p className="text-xs text-red-300">{error}</p>
          </div>
        )}

        <div className="flex justify-center gap-2 pt-1">
          <Button variant="ghost" onClick={handleClose} disabled={uploading}>
            Cancel
          </Button>
          <Button onClick={handleUpload} disabled={!file || uploading}>
            {uploading ? "Processing…" : "Upload & Summarize"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
