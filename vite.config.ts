import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      // The Apple icon is referenced from index.html, not the manifest, so it has
      // to be named here to get precached.
      includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
      manifest: {
        name: 'Larder',
        short_name: 'Larder',
        description: 'Household meal planning and shopping lists',
        start_url: '/',
        display: 'standalone',
        background_color: '#f5ead8',
        theme_color: '#f5ead8',
        // `scripts/icons.sh` rasterises these from favicon.svg. The maskable one is
        // separate because Android crops to a circle and would clip a full-bleed mark.
        icons: [
          { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: '/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
          { src: '/favicon.svg', sizes: 'any', type: 'image/svg+xml' },
        ],
      },
    }),
  ],
  test: {
    // The generator and shopping-list modules are pure — no DOM needed.
    environment: 'node',
    // `test/` holds the rules test, which needs the Firestore emulator running:
    // `pnpm test:rules`, not part of the default run.
    exclude: ['**/node_modules/**', 'test/**'],
  },
})
