"use client";

import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import type { Tag } from "@/types";

interface TagBadgeProps {
  tag: Tag;
  onRemove?: () => void;
  asLink?: boolean;
}

export function TagBadge({ tag, onRemove, asLink }: TagBadgeProps) {
  const router = useRouter();

  function handleClick() {
    if (asLink) router.push(`/?tag=${encodeURIComponent(tag.name)}`);
  }

  return (
    <Badge
      color={tag.color}
      className={asLink ? "cursor-pointer" : undefined}
    >
      <span
        className="h-1.5 w-1.5 shrink-0 rounded-full"
        style={{ backgroundColor: tag.color }}
        onClick={handleClick}
      />
      <span onClick={handleClick}>{tag.name}</span>
      {onRemove && (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onRemove(); }}
          className="ml-0.5 rounded-full opacity-60 hover:opacity-100 transition-opacity leading-none"
          aria-label={`Remove tag ${tag.name}`}
        >
          ×
        </button>
      )}
    </Badge>
  );
}
