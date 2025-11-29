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
 */
export const STATUS_COLORS = {
  default: '#64748b',      // Slate-500 - neutral
  hot_critical: '#ef4444', // Red - critical issues
  hot_warning: '#f59e0b',  // Amber - warnings
  circular: '#f97316',     // Orange - circular deps
  high_coupling: '#eab308', // Yellow - high coupling
  added: '#10b981',        // Green - added nodes
  removed: '#ef4444',      // Red - removed nodes (with transparency)
  third_party: '#9ca3af',  // Gray-400 - external deps
} as const;

/**
 * Default node color (neutral gray)
 */
export const DEFAULT_NODE_COLOR = '#64748b';

/**
 * Third party dependency color
 */
export const THIRD_PARTY_COLOR = '#6B7280';

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
