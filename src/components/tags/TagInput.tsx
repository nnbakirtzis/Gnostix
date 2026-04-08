"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { TagBadge } from "./TagBadge";
import { normalizeTag } from "@/lib/tags";
import type { Tag } from "@/types";

interface TagInputProps {
  docId: string;
  initialTags: Tag[];
  allTags: Tag[];
  onTagsChange?: (tags: Tag[]) => void;
  onNewTagCreated?: () => void;
}

export function TagInput({ docId, initialTags, allTags, onTagsChange, onNewTagCreated }: TagInputProps) {
  const [tags, setTags] = useState<Tag[]>(initialTags);
  const [inputValue, setInputValue] = useState("");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleMouseDown(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleMouseDown);
    return () => document.removeEventListener("mousedown", handleMouseDown);
  }, []);

  const saveTags = useCallback((nextTags: Tag[]) => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      await fetch(`/api/documents/${docId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tagNames: nextTags.map((t) => t.name) }),
      });
    }, 300);
  }, [docId]);

  function applyTag(tag: Tag) {
    if (tags.some((t) => t.id === tag.id)) return;
    const next = [...tags, tag];
    setTags(next);
    onTagsChange?.(next);
    saveTags(next);
    setInputValue("");
    setDropdownOpen(false);
  }

  async function createAndApplyTag(name: string) {
    const normalized = normalizeTag(name);
    if (!normalized || normalized.length > 50) return;
    const res = await fetch("/api/tags", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: normalized }),
    });
    const tag = await res.json() as Tag;
    onNewTagCreated?.();
    applyTag(tag);
  }

  function removeTag(tagId: string) {
    const next = tags.filter((t) => t.id !== tagId);
    setTags(next);
    onTagsChange?.(next);
    saveTags(next);
  }

  const normalized = normalizeTag(inputValue);
  const suggestions = allTags.filter(
    (t) =>
      !tags.some((existing) => existing.id === t.id) &&
      t.name.includes(normalized)
  );
  const showCreate = normalized.length > 0 && normalized.length <= 50 &&
    !allTags.some((t) => t.name === normalized);

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace" && inputValue === "" && tags.length > 0) {
      removeTag(tags[tags.length - 1].id);
    }
    if (e.key === "Enter") {
      e.preventDefault();
      if (suggestions.length === 1 && !showCreate) {
        applyTag(suggestions[0]);
      } else if (normalized) {
        void createAndApplyTag(normalized);
      }
    }
    if (e.key === "Escape") {
      setDropdownOpen(false);
    }
  }

  return (
    <div ref={containerRef} className="relative">
      <div
        className="flex min-h-[36px] flex-wrap items-center gap-1.5 rounded-md border border-[#333] bg-[#1a1a1a] px-2.5 py-1.5 focus-within:border-[#b38f6f]/60 transition-colors cursor-text"
        onClick={() => (containerRef.current?.querySelector("input") as HTMLInputElement | null)?.focus()}
      >
        {tags.map((tag) => (
          <TagBadge key={tag.id} tag={tag} onRemove={() => removeTag(tag.id)} />
        ))}
        <input
          type="text"
          value={inputValue}
          onChange={(e) => { setInputValue(e.target.value); setDropdownOpen(true); }}
          onFocus={() => setDropdownOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder={tags.length === 0 ? "Add tags…" : ""}
          className="min-w-[80px] flex-1 bg-transparent text-sm text-[#ede9e4] outline-none placeholder:text-[#6b5d4f]"
          style={{ width: `${Math.max(80, inputValue.length * 8 + 16)}px` }}
        />
      </div>

      {dropdownOpen && (suggestions.length > 0 || showCreate) && (
        <div className="absolute left-0 top-full z-50 mt-1 w-full rounded-md border border-[#333] bg-[#1d1d1d] py-1 shadow-lg">
          {suggestions.map((tag) => (
            <button
              key={tag.id}
              type="button"
              onMouseDown={(e) => { e.preventDefault(); applyTag(tag); }}
              className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm text-[#ede9e4] hover:bg-[#262626] transition-colors"
            >
              <span
                className="h-2 w-2 shrink-0 rounded-full"
                style={{ backgroundColor: tag.color }}
              />
              {tag.name}
            </button>
          ))}
          {showCreate && (
            <button
              type="button"
              onMouseDown={(e) => { e.preventDefault(); void createAndApplyTag(normalized); }}
              className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm text-[#b38f6f] hover:bg-[#262626] transition-colors"
            >
              <span className="text-[#b38f6f]">+</span>
              Create &ldquo;{normalized}&rdquo;
            </button>
          )}
        </div>
      )}
    </div>
  );
}
