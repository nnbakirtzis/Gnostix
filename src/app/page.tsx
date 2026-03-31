"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Upload } from "lucide-react";
import { toast } from "sonner";
import { Sidebar } from "@/components/layout/Sidebar";
import { DocumentGrid } from "@/components/documents/DocumentGrid";
import { UploadModal } from "@/components/documents/UploadModal";
import { CreateFolderModal } from "@/components/folders/CreateFolderModal";
import { SearchBar } from "@/components/documents/SearchBar";
import { Button } from "@/components/ui/button";
import type { Document, Folder } from "@/types";

export default function DashboardPage() {
  return (
    <Suspense fallback={<div className="flex h-screen items-center justify-center bg-[#161616]" />}>
      <Dashboard />
    </Suspense>
  );
}

function Dashboard() {
  const searchParams = useSearchParams();
  const folderId = searchParams.get("folder");
  const favorites = searchParams.get("favorites") === "true";

  const [docs, setDocs] = useState<Document[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [loadingDocs, setLoadingDocs] = useState(true);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [createFolderOpen, setCreateFolderOpen] = useState(false);

  // Fetch folders
  const fetchFolders = useCallback(async () => {
    const res = await fetch("/api/folders");
    setFolders(await res.json());
  }, []);

  // Fetch documents based on active filter
  const fetchDocs = useCallback(async () => {
    setLoadingDocs(true);
    try {
      const params = new URLSearchParams();
      if (folderId) params.set("folderId", folderId);
      if (favorites) params.set("favorites", "true");
      const res = await fetch(`/api/documents?${params}`);
      setDocs(await res.json());
    } finally {
      setLoadingDocs(false);
    }
  }, [folderId, favorites]);

  useEffect(() => {
    fetchFolders();
  }, [fetchFolders]);

  useEffect(() => {
    fetchDocs();
  }, [fetchDocs]);

  async function handleToggleFavorite(id: string, value: boolean) {
    setDocs((prev) =>
      prev.map((d) => (d.id === id ? { ...d, isFavorite: value } : d))
    );
    await fetch(`/api/documents/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isFavorite: value }),
    });
    if (favorites && !value) {
      setDocs((prev) => prev.filter((d) => d.id !== id));
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this document? This cannot be undone.")) return;
    await fetch(`/api/documents/${id}`, { method: "DELETE" });
    setDocs((prev) => prev.filter((d) => d.id !== id));
    toast.success("Document deleted");
  }

  async function handleMoveToFolder(id: string, targetFolderId: string | null) {
    const res = await fetch(`/api/documents/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ folderId: targetFolderId }),
    });
    const updated = await res.json() as Document;
    setDocs((prev) => {
      const next = prev.map((d) => (d.id === id ? updated : d));
      if (folderId && updated.folderId !== folderId) {
        return next.filter((d) => d.id !== id);
      }
      return next;
    });
    toast.success(targetFolderId ? "Moved to folder" : "Removed from folder");
  }

  function handleUploaded(doc: Document) {
    setDocs((prev) => [doc, ...prev]);
    toast.success("Document uploaded and summarized!");
  }

  function handleFolderCreated(folder: Folder) {
    setFolders((prev) => [...prev, folder]);
    toast.success(`Folder "${folder.name}" created`);
  }

  const totalDocs = docs.length;
  const favCount = docs.filter((d) => d.isFavorite).length;

  const activeFolder = folders.find((f) => f.id === folderId);
  const pageTitle = favorites
    ? "Favorites"
    : activeFolder
    ? activeFolder.name
    : "All Documents";

  return (
    <div className="flex h-screen overflow-hidden bg-[#161616]">
      <Sidebar
        folders={folders}
        docCounts={{ total: totalDocs, favorites: favCount }}
        onCreateFolder={() => setCreateFolderOpen(true)}
      />

      <main className="flex flex-1 flex-col overflow-hidden">
        {/* Top bar */}
        <header className="flex shrink-0 items-center justify-between border-b border-[#262626] bg-[#161616] px-6 py-3.5">
          <h1
            className="text-base font-semibold text-[#ede9e4]"
            style={{ fontFamily: 'var(--font-heading)' }}
          >
            {pageTitle}
          </h1>
          <div className="flex items-center gap-3">
            <SearchBar className="w-72" />
            <Button onClick={() => setUploadOpen(true)}>
              <Upload className="h-4 w-4" />
              Upload
            </Button>
          </div>
        </header>

        {/* Document grid */}
        <div className="flex-1 overflow-y-auto p-6">
          <DocumentGrid
            docs={docs}
            folders={folders}
            loading={loadingDocs}
            onToggleFavorite={handleToggleFavorite}
            onDelete={handleDelete}
            onMoveToFolder={handleMoveToFolder}
          />
        </div>
      </main>

      <UploadModal
        open={uploadOpen}
        onClose={() => setUploadOpen(false)}
        onUploaded={handleUploaded}
      />
      <CreateFolderModal
        open={createFolderOpen}
        onClose={() => setCreateFolderOpen(false)}
        onCreated={handleFolderCreated}
      />
    </div>
  );
}
