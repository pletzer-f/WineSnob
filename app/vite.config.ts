import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import { fileURLToPath, URL } from 'node:url'

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
  },
  server: {
    // allow importing the design system that lives one level up
    fs: { allow: ['..'] },
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg'],
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
          { src: 'favicon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
          { src: 'favicon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'maskable' },
        ],
      },
    }),
  ],
})
