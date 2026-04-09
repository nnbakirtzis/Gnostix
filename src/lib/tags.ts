/** On-brand warm tones for auto-assigned tags and folder presets (readable on dark UI). */
export const TAG_COLORS = [
  "#b38f6f", // sand accent
  "#c9a882", // warm gold
  "#a67c52", // copper
  "#9e8f7f", // muted taupe (header text family)
  "#8b7355", // deep sand
  "#b89a7a", // dusty camel
  "#7d6b5f", // dark taupe
  "#a6896b", // rose-brown
];

/**
 * Deterministic color from tag name so the same label always maps to the same swatch.
 */
export function tagColor(name: string): string {
  const i = name.charCodeAt(0);
  return TAG_COLORS[Number.isFinite(i) ? i % TAG_COLORS.length : 0];
}

export function normalizeTag(raw: string): string {
  return raw.trim().toLowerCase();
}
