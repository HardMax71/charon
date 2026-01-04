import { Language } from '@/types/graph';

/**
 * Language colors for outlines and badges
 * These are distinct colors that don't conflict with status colors
 * Avoiding red/green which are reserved for added/removed/errors
 */
export const LANGUAGE_COLORS: Record<Language, string> = {
  python: '#3572A5',     // Blue
  javascript: '#F0DB4F', // Yellow (brighter)
  typescript: '#007ACC', // VS Code blue (distinct from Python)
  go: '#00ADD8',         // Cyan
  java: '#ED8B00',       // Orange
  rust: '#CE422B',       // Rust red-orange
};

export const LANGUAGE_LABELS: Record<Language, string> = {
  python: 'Python',
  javascript: 'JavaScript',
  typescript: 'TypeScript',
  go: 'Go',
  java: 'Java',
  rust: 'Rust',
};

export const LANGUAGE_EXTENSIONS: Record<Language, string> = {
  python: '.py',
  javascript: '.js',
  typescript: '.ts',
  go: '.go',
  java: '.java',
  rust: '.rs',
};

/**
 * Status colors for node fill (semantic meaning)
 * These colors indicate the state/health of a node
 * Using brighter, more saturated colors for better visibility in 3D
 */
export const STATUS_COLORS = {
  default: '#94a3b8',      // Slate-400 - brighter neutral
  hot_critical: '#f87171', // Red-400 - brighter critical
  hot_warning: '#fbbf24',  // Amber-400 - brighter warnings
  circular: '#fb923c',     // Orange-400 - brighter circular deps
  high_coupling: '#facc15', // Yellow-400 - brighter high coupling
  added: '#34d399',        // Emerald-400 - brighter added nodes
  removed: '#f87171',      // Red-400 - brighter removed nodes
  third_party: '#d1d5db',  // Gray-300 - brighter external deps
} as const;

/**
 * Default node color (neutral gray)
 */
export const DEFAULT_NODE_COLOR = '#94a3b8';

/**
 * Third party dependency color
 */
export const THIRD_PARTY_COLOR = '#d1d5db';

/**
 * Get language color with fallback
 */
export const getLanguageColor = (language: Language | null | undefined): string => {
  if (!language) return DEFAULT_NODE_COLOR;
  return LANGUAGE_COLORS[language] || DEFAULT_NODE_COLOR;
};

/**
 * Get language extension with fallback
 */
export const getLanguageExtension = (language: Language | null | undefined): string => {
  if (!language) return '';
  return LANGUAGE_EXTENSIONS[language] || '';
};
