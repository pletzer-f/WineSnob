import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import { fileURLToPath, URL } from 'node:url'
import { writeFileSync } from 'node:fs'

// Every build carries its identity, and every build publishes it: the app
// bakes BUILD_ID in and checks the canonical domain's version.json, so a
// client running an outdated copy (a pinned old deployment URL, a stuck
// cache) can TELL the user instead of silently serving a museum piece.
const buildId = (process.env.VERCEL_GIT_COMMIT_SHA || '').slice(0, 7) || 'dev'

// The WineSnob app consumes the design system directly from source (../src),
// so the library and the app stay in lockstep with design-sync. No build step
// for the DS is required — Vite transpiles its TSX on the fly.
const dsRoot = fileURLToPath(new URL('../src', import.meta.url))

export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      'winesnob-design-system/styles.css': `${dsRoot}/styles/winesnob.css`,
      'winesnob-design-system': `${dsRoot}/index.ts`,
    },
    // The design system lives at ../src and imports React. Dedupe forces those
    // imports to resolve to the app's single React copy, so the bundle works
    // even when only app/node_modules is installed (e.g. on Vercel).
    dedupe: ['react', 'react-dom'],
  },
  server: {
    // allow importing the design system that lives one level up
    fs: { allow: ['..'] },
  },
  define: {
    __BUILD_ID__: JSON.stringify(buildId),
  },
  plugins: [
    react(),
    {
      name: 'winesnob-version-file',
      closeBundle() {
        writeFileSync(fileURLToPath(new URL('./dist/version.json', import.meta.url)), JSON.stringify({ build: buildId }))
      },
    },
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
      // Clean update handling: a new deploy takes control immediately and old
      // precache is purged, so clients don't get stuck on a stale bundle.
      // version.json must NEVER be precached: the staleness check reads the
      // live canonical copy, not a cached one.
      workbox: {
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        skipWaiting: true,
        globIgnores: ['**/version.json'],
      },
      manifest: {
        name: 'WineSnob',
        short_name: 'WineSnob',
        description: 'A cellar that knows itself.',
        theme_color: '#6E2433',
        background_color: '#FAF8F2',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        icons: [
          { src: 'pwa-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: 'pwa-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: 'pwa-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
    }),
  ],
})
