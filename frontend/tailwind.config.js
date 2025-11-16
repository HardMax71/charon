/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      // Font families matching modern.css
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'SF Mono', 'Monaco', 'Cascadia Code', 'Roboto Mono', 'Consolas', 'monospace'],
      },
      // Modern color palette - warm neutrals, no gradients
      colors: {
        background: '#fafaf9',
        surface: '#ffffff',
        primary: {
          DEFAULT: '#0f172a',
          hover: '#1e293b',
          light: '#334155',
        },
        text: {
          primary: '#1c1917',
          secondary: '#57534e',
          tertiary: '#78716c',
          inverse: '#fafaf9',
        },
        border: {
          light: '#e7e5e4',
          medium: '#d6d3d1',
          dark: '#a8a29e',
        },
        success: {
          DEFAULT: '#166534',
          bg: '#f0fdf4',
        },
        warning: {
          DEFAULT: '#92400e',
          bg: '#fffbeb',
        },
        error: {
          DEFAULT: '#991b1b',
          bg: '#fef2f2',
        },
        info: {
          DEFAULT: '#1e40af',
          bg: '#eff6ff',
        },
      },
      // Fluid spacing system
      spacing: {
        xs: '0.25rem',
        sm: '0.5rem',
        md: '0.75rem',
        base: '1rem',
        lg: '1.5rem',
        xl: '2rem',
        '2xl': '2.5rem',
        '3xl': '3rem',
        '4xl': '4rem',
        '5xl': '6rem',
        '6xl': '8rem',
      },
      // Border radius
      borderRadius: {
        sm: '0.375rem',
        md: '0.5rem',
        lg: '0.75rem',
        xl: '1rem',
        '2xl': '1.5rem',
        full: '9999px',
      },
      // Modern shadows - subtle
      boxShadow: {
        sm: '0 1px 2px 0 rgba(28, 25, 23, 0.05)',
        DEFAULT: '0 4px 6px -1px rgba(28, 25, 23, 0.08), 0 2px 4px -1px rgba(28, 25, 23, 0.04)',
        md: '0 4px 6px -1px rgba(28, 25, 23, 0.08), 0 2px 4px -1px rgba(28, 25, 23, 0.04)',
        lg: '0 10px 15px -3px rgba(28, 25, 23, 0.08), 0 4px 6px -2px rgba(28, 25, 23, 0.04)',
        xl: '0 20px 25px -5px rgba(28, 25, 23, 0.08), 0 10px 10px -5px rgba(28, 25, 23, 0.03)',
        none: '0 0 #0000',
      },
      // Typography scale - fluid sizing
      fontSize: {
        xs: ['clamp(0.75rem, 0.7rem + 0.25vw, 0.875rem)', { lineHeight: '1.5' }],
        sm: ['clamp(0.875rem, 0.8rem + 0.375vw, 1rem)', { lineHeight: '1.5' }],
        base: ['clamp(1rem, 0.95rem + 0.25vw, 1.125rem)', { lineHeight: '1.5' }],
        lg: ['clamp(1.125rem, 1rem + 0.625vw, 1.375rem)', { lineHeight: '1.375' }],
        xl: ['clamp(1.25rem, 1.1rem + 0.75vw, 1.625rem)', { lineHeight: '1.375' }],
        '2xl': ['clamp(1.5rem, 1.3rem + 1vw, 2rem)', { lineHeight: '1.2' }],
        '3xl': ['clamp(1.875rem, 1.5rem + 1.875vw, 2.75rem)', { lineHeight: '1.2' }],
        '4xl': ['clamp(2.25rem, 1.75rem + 2.5vw, 3.5rem)', { lineHeight: '1.2' }],
        '5xl': ['clamp(3rem, 2.25rem + 3.75vw, 4.5rem)', { lineHeight: '1' }],
      },
      // Letter spacing
      letterSpacing: {
        tighter: '-0.05em',
        tight: '-0.025em',
        normal: '0',
        wide: '0.025em',
        wider: '0.05em',
      },
    },
  },
  plugins: [],
}
