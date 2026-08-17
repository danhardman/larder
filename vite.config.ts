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
        background_color: '#ffffff',
        theme_color: '#ffffff',
        // Icons intentionally omitted until the design pass.
        icons: [],
      },
    }),
  ],
  test: {
    // The generator and shopping-list modules are pure — no DOM needed.
    environment: 'node',
  },
})
