/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        serif: ['"Cinzel"', 'serif'],
        sans: ['"Manrope"', 'sans-serif'],
        mono: ['"Fira Code"', 'monospace'],
      },
      colors: {
        // Extending colors to match the mythological theme
        styx: {
          900: '#0f172a', // Deep Abyss
          800: '#1e293b',
          600: '#0d9488', // River Teal
          100: '#f0fdfa', // Mist
        },
        obol: {
          500: '#d97706', // Gold Coin
          400: '#fbbf24',
        }
      },
      boxShadow: {
        'marble': '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
        'sharp': '4px 4px 0px 0px rgba(13, 148, 136, 0.2)',
      }
    },
  },
  plugins: [],
}