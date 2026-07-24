import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// Dos destinos de build desde el mismo código:
//   - Web (GitHub Pages): se sirve en /lio-ops/ y es una PWA completa.
//   - Nativo (Capacitor/OTA): el WKWebView carga los ficheros desde la raíz
//     del bundle, así que base debe ser '/'. Además el service worker de la
//     PWA cachea de forma agresiva y pelea con el updater OTA, por lo que en
//     el build nativo se desactiva.
// Se activa con CAP_BUILD=1 (ver `npm run build:native`).
const isNative = process.env.CAP_BUILD === '1'

const pwa = VitePWA({
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

export default defineConfig({
  base: isNative ? '/' : '/lio-ops/',
  plugins: [
    react(),
    ...(isNative ? [] : [pwa])
  ],
  test: {
    environment: 'node'
  }
})
