import { defineConfig } from 'vite'
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
      includeAssets: ['favicon.svg', 'icons/icon-192.png', 'icons/icon-512.png'],
      manifest: {
        name: 'Onglerie — Stock & Clientes',
        short_name: 'Onglerie',
        description:
          "Gestion de stock et fichier client pour une activité de prothésie ongulaire",
        theme_color: '#d6336c',
        background_color: '#fdf2f8',
        display: 'standalone',
        start_url: '/',
        scope: '/',
        lang: 'fr',
        icons: [
          {
            src: 'icons/icon-192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: 'icons/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
          },
          {
            src: 'icons/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        // App-shell + data (Dexie/IndexedDB) is local-first, so we just need
        // to precache the built assets for the app to load fully offline.
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2}'],
      },
      devOptions: {
        enabled: true,
      },
    }),
  ],
})
