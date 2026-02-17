import { defineConfig } from 'vite'
import { resolve } from 'path'
import { cpSync } from 'fs'

export default defineConfig({
  root: '.',
  base: '/',
  publicDir: false,
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      input: resolve(__dirname, 'index.html')
    }
  },
  plugins: [
    {
      name: 'copy-static-assets',
      closeBundle() {
        cpSync('data', 'dist/data', { recursive: true })
      }
    }
  ],
  server: {
    port: 3001,
    open: true
  }
})
