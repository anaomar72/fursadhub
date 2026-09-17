/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

/*
 * Chunking is deliberately NOT configured here.
 *
 * The router reaches each portal through a single dynamic import of that area's barrel
 * (`src/app/router/areas/*`), so the area boundaries are expressed in source and the default
 * chunker follows them. Two alternatives were measured and rejected: one chunk per page produced a
 * request chain slower than the unsplit bundle on a 40ms-RTT link, and a `manualChunks` grouping
 * made Vite emit a modulepreload hint per chunk, which downloaded all seven areas on the public
 * home page — the exact opposite of the intent.
 */
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./tests/setup.ts'],
    css: true,
  },
})
