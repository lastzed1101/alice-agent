/**
 * Theme definitions for Alice — 14 themes.
 * CSS classes in styles.css handle variable overrides.
 * This file provides metadata for the theme picker.
 */

export interface ThemeDefinition {
  id: string;
  name: string;
  /** Preview colors shown in the theme picker */
  preview: {
    primary: string;
    accent: string;
    bg: string;
  };
}

export const THEMES: ThemeDefinition[] = [
  {
    id: "electric-blue",
    name: "Electric Blue",
    preview: { primary: "#3B82F6", accent: "#60A5FA", bg: "#0B1220" },
  },
  {
    id: "ocean",
    name: "Ocean",
    preview: { primary: "#0EA5E9", accent: "#38BDF8", bg: "#07131F" },
  },
  {
    id: "aurora",
    name: "Aurora",
    preview: { primary: "#3B82F6", accent: "#06B6D4", bg: "#090F1D" },
  },
  {
    id: "midnight",
    name: "Midnight",
    preview: { primary: "#4F8DFD", accent: "#7CC6FE", bg: "#050A14" },
  },
  {
    id: "emerald",
    name: "Emerald",
    preview: { primary: "#10B981", accent: "#34D399", bg: "#0B1220" },
  },
  {
    id: "sunset",
    name: "Sunset",
    preview: { primary: "#F97316", accent: "#FB923C", bg: "#0F1018" },
  },
  {
    id: "ice",
    name: "Ice",
    preview: { primary: "#60A5FA", accent: "#93C5FD", bg: "#0A0F17" },
  },
  {
    id: "indigo",
    name: "Indigo",
    preview: { primary: "#6366F1", accent: "#818CF8", bg: "#0D1117" },
  },
  {
    id: "forest",
    name: "Forest",
    preview: { primary: "#22C55E", accent: "#4ADE80", bg: "#08130F" },
  },
  {
    id: "crimson",
    name: "Crimson",
    preview: { primary: "#EF4444", accent: "#F87171", bg: "#120A0C" },
  },
  {
    id: "graphite",
    name: "Graphite",
    preview: { primary: "#9CA3AF", accent: "#D1D5DB", bg: "#111111" },
  },
  {
    id: "cyberpunk",
    name: "Cyberpunk",
    preview: { primary: "#00E5FF", accent: "#7C3AED", bg: "#06080F" },
  },
  {
    id: "northern-lights",
    name: "N. Lights",
    preview: { primary: "#3B82F6", accent: "#8B5CF6", bg: "#08101D" },
  },
  {
    id: "ai-core",
    name: "AI Core",
    preview: { primary: "#3B82F6", accent: "#7C3AED", bg: "#0A0F1C" },
  },
];

/** Get theme by ID, fallback to electric-blue (default) */
export function getTheme(id: string): ThemeDefinition {
  return THEMES.find((t) => t.id === id) || THEMES[0];
}

/** Apply theme by toggling CSS class on <html>. CSS classes in styles.css handle the variable overrides. */
export function applyTheme(themeId: string): void {
  // Remove all theme classes first
  document.documentElement.classList.remove(
    ...THEMES.map((t) => `theme-${t.id}`),
  );

  // Apply theme class (except electric-blue which is the :root default)
  if (themeId !== "electric-blue") {
    document.documentElement.classList.add(`theme-${themeId}`);
  }
}
