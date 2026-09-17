import react from '@vitejs/plugin-react'
import { fileURLToPath, URL } from 'node:url'
import { readFileSync } from 'node:fs'
import { defineConfig } from 'vitest/config'

const { version } = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8')) as {
  version: string
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  define: { __APP_VERSION__: JSON.stringify(version) },
  /*
   * `/api/photos` is a Vercel function, and Vite does not run those. `npx vercel dev` does, so
   * the two run side by side and this hands it anything under /api.
   *
   * Side by side rather than everything under `vercel dev`, because vercel.json rewrites every
   * unmatched path to /index.html — which in development catches Vite's own module URLs and
   * asks it to parse index.html as JavaScript. And the page stays on 5173, which is the origin
   * the bucket's CORS policy names; served from anywhere else the upload is refused.
   */
  server: { proxy: { '/api': 'http://localhost:3000' } },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
    css: { modules: { classNameStrategy: 'non-scoped' } },
    clearMocks: true,
    coverage: {
      provider: 'v8',
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['src/main.tsx', 'src/test/**', 'src/**/*.d.ts', 'src/**/*.test.{ts,tsx}'],
      /*
       * Raised from 70 once CI actually started checking it. The suite has sat near 90 for a
       * while; a floor well under where you are is a floor that never catches anything, and the
       * point of one is to notice the day a screen arrives with no tests behind it.
       */
      thresholds: { branches: 78, functions: 85, lines: 88, statements: 86 },
    },
  },
})
