import path from 'node:path'
import { fileURLToPath } from 'node:url'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

const rootDir = path.dirname(fileURLToPath(import.meta.url))

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  // GitHub Pages project site: https://g5studio.github.io/20261004-wedding/
  base: '/20261004-wedding/',
  resolve: {
    alias: {
      '@': path.resolve(rootDir, 'src'),
    },
  },
})
