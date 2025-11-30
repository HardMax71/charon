import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { browserLogPlugin } from './vite-log-plugin'

export default defineConfig({
  plugins: [react(), browserLogPlugin()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    host: '0.0.0.0',
    watch: {
      usePolling: true,
    },
    proxy: {
      '/api': {
        target: 'http://backend:8000',
        changeOrigin: true,
      },
    },
  },
})
