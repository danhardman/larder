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
      manifest: {
        name: 'Larder',
        short_name: 'Larder',
        description: 'Household meal planning and shopping lists',
        start_url: '/',
        display: 'standalone',
        background_color: '#f5ead8',
        theme_color: '#f5ead8',
        // Raster icons still to come; the SVG mark covers the browser tab.
        icons: [{ src: '/favicon.svg', sizes: 'any', type: 'image/svg+xml' }],
      },
    }),
  ],
  test: {
    // The generator and shopping-list modules are pure — no DOM needed.
    environment: 'node',
  },
})
