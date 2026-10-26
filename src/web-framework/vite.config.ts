import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { TanStackRouterVite } from '@tanstack/router-vite-plugin'
import path from 'node:path'

// Where the Go API listens, from .env, so the dev proxy and the server agree.
// loadEnv reads .env from the project root; APP_PORT is the same variable the Go
// binary reads, so changing it in one place moves both.
const env = loadEnv(process.env.NODE_ENV || 'development', process.cwd(), '')
const apiTarget = 'http://localhost:' + (env.APP_PORT || '8080')

export default defineConfig({
  plugins: [
    TanStackRouterVite(),
    react(),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      // The admin panel's own code. tsconfig knows this alias too; Vite resolves
      // imports itself and needs telling separately, which is why the first build
      // of the embedded panel failed on every @admin import.
      '@admin': path.resolve(__dirname, './src/admin-panel'),
      // The mirrored shared package. tsconfig has aliased this since single
      // shipped, and Vite did not: the SPA's own use of it is type-only, which
      // esbuild erases before Rollup ever tries to resolve it, so nothing failed
      // until the admin panel imported a Zod schema from it as a value.
      // "./brand" is a subpath the shared package's exports map points at
      // brand.config.ts. An alias onto the directory resolves it to a file that
      // does not exist, which is what the admin sidebar's logo import hit.
      '@repo/shared/brand': path.resolve(__dirname, './src/shared/brand.config.ts'),
      '@repo/shared': path.resolve(__dirname, './src/shared'),
      // The upload package lives at the project root, outside the SPA, and is
      // raw TypeScript: Vite compiles it as source rather than resolving a build.
      // The admin panel's api-client builds its uploader from it.
      '@repo/upload/web': path.resolve(__dirname, './packages/upload/src/web.ts'),
      '@repo/upload': path.resolve(__dirname, './packages/upload/src/index.ts'),
    },
  },
  server: {
    port: 5173,
    proxy: {
      // Everything the Go binary serves. In production it serves this SPA too,
      // so these are all same-origin paths; in dev the SPA is on :5173 and they
      // have to be forwarded, or the admin panel's GORM Studio, Pulse and
      // Sentinel links land on the Vite dev server and 404.
      //
      // The port is read from .env rather than written in, because APP_PORT is
      // a thing people change: a proxy pinned to 8080 while the API listens
      // elsewhere refuses every call with ECONNREFUSED, and the only visible
      // symptom is a login that does nothing.
      '/api': { target: apiTarget, changeOrigin: true },
      '/studio': { target: apiTarget, changeOrigin: true },
      '/pulse': { target: apiTarget, changeOrigin: true },
      '/sentinel': { target: apiTarget, changeOrigin: true },
      '/docs': { target: apiTarget, changeOrigin: true },
    },
  },
  build: {
    // Into the Go tree, which is the only place //go:embed can read from: the
    // directive sits in api/main.go and cannot reach above its own directory.
    outDir: './api/web',
    emptyOutDir: true,
  },
})
