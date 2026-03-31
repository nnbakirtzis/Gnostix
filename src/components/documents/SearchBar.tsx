"use client";

import { useState, useEffect, useRef } from "react";
import { Search, X, Loader2 } from "lucide-react";
import Link from "next/link";
import { cn, formatRelative, truncate } from "@/lib/utils";
import type { Document } from "@/types";

interface SearchBarProps {
  className?: string;
}

export function SearchBar({ className }: SearchBarProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Document[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      setOpen(false);
      return;
    }

    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
        const data = await res.json() as Document[];
        setResults(data);
        setOpen(true);
      } finally {
        setLoading(false);
      }
    }, 350);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [query]);

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <div ref={wrapperRef} className={cn("relative", className)}>
      <div className="flex items-center gap-2 rounded-lg border border-[#2e2e2e] bg-[#1d1d1d] px-3 py-2 transition-colors focus-within:border-[#b38f6f]/60 focus-within:ring-1 focus-within:ring-[#b38f6f]/20">
        {loading ? (
          <Loader2 className="h-4 w-4 shrink-0 animate-spin text-[#6b5d4f]" />
        ) : (
          <Search className="h-4 w-4 shrink-0 text-[#6b5d4f]" />
        )}
        <input
          type="text"
          placeholder="Search documents…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => results.length > 0 && setOpen(true)}
          className="flex-1 bg-transparent text-sm text-[#ede9e4] placeholder:text-[#6b5d4f] focus:outline-none"
        />
        {query && (
          <button
            onClick={() => { setQuery(""); setResults([]); setOpen(false); }}
            className="text-[#6b5d4f] hover:text-[#9e8f7f] cursor-pointer"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {open && results.length > 0 && (
        <div className="absolute left-0 right-0 top-full z-50 mt-1.5 rounded-xl border border-[#2e2e2e] bg-[#1d1d1d] shadow-2xl overflow-hidden">
          <div className="max-h-72 overflow-y-auto">
            {results.map((doc) => (
              <Link
                key={doc.id}
                href={`/documents/${doc.id}`}
                onClick={() => { setOpen(false); setQuery(""); }}
                className="flex items-start gap-3 px-3 py-2.5 hover:bg-[#242424] transition-colors"
              >
                <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded bg-[rgba(179,143,111,0.12)] border border-[#b38f6f]/20 text-[9px] font-bold text-[#b38f6f]">
                  {doc.fileType.toUpperCase().slice(0, 3)}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm text-[#ede9e4]">{doc.title}</p>
                  {doc.summary && (
                    <p className="mt-0.5 truncate text-xs text-[#6b5d4f]">
                      {truncate(doc.summary, 80)}
                    </p>
                  )}
                </div>
                <span className="shrink-0 text-xs text-[#6b5d4f]">
                  {formatRelative(doc.updatedAt)}
                </span>
              </Link>
            ))}
          </div>
          <div className="border-t border-[#262626] px-3 py-2">
            <p className="text-xs text-[#6b5d4f]">
              {results.length} result{results.length !== 1 ? "s" : ""}
            </p>
          </div>
        </div>
      )}

      {open && query && results.length === 0 && !loading && (
        <div className="absolute left-0 right-0 top-full z-50 mt-1.5 rounded-xl border border-[#2e2e2e] bg-[#1d1d1d] px-3 py-3 shadow-2xl">
          <p className="text-sm text-[#6b5d4f]">No results for &ldquo;{query}&rdquo;</p>
        </div>
      )}
    </div>
  );
}
