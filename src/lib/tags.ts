export const TAG_COLORS = [
  "#b38f6f", "#3b82f6", "#10b981", "#f59e0b",
  "#ef4444", "#ec4899", "#06b6d4", "#84cc16",
];

export function tagColor(name: string): string {
  return TAG_COLORS[name.charCodeAt(0) % TAG_COLORS.length];
}

export function normalizeTag(raw: string): string {
  return raw.trim().toLowerCase();
}
