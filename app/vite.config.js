import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  base: '/lio-ops/',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      workbox: {
        clientsClaim: true,
        skipWaiting: true,
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/api\.jsonbin\.io\/.*/i,
            handler: 'NetworkOnly'
          }
        ]
      },
      manifest: {
        name: 'Las Mañanas de Lio',
        short_name: 'Lio',
        description: '¿A quién le toca sacar a Lio esta mañana?',
        lang: 'es',
        theme_color: '#f1f0ea',
        background_color: '#f1f0ea',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/lio-ops/',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' }
        ]
      }
    })
  ],
  test: {
    environment: 'node'
  }
})
