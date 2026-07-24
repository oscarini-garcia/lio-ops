import { readFileSync } from 'node:fs'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url)))

// Dos destinos de build desde el mismo código:
//   - Web (GitHub Pages): se sirve en /lio-ops/ y es una PWA completa.
//   - Nativo (Capacitor/OTA): el WKWebView carga los ficheros desde la raíz
//     del bundle, así que base debe ser '/'. Además el service worker de la
//     PWA cachea de forma agresiva y pelea con el updater OTA, por lo que en
//     el build nativo se desactiva.
// Se activa con CAP_BUILD=1 (ver `npm run build:native`).
const isNative = process.env.CAP_BUILD === '1'

// En el WebView de Capacitor (esquema capacitor://localhost) el atributo
// `crossorigin` que Vite pone en los <script type="module"> y <link> dispara
// una comprobación CORS que bloquea la carga de JS/CSS → pantalla en negro.
// Este plugin lo elimina, pero SOLO en el build nativo; la web queda igual.
const stripCrossorigin = {
  name: 'strip-crossorigin',
  enforce: 'post',
  transformIndexHtml(html) {
    return html.replace(/\s+crossorigin(?:="[^"]*")?/g, '')
  }
}

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
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version)
  },
  plugins: [
    react(),
    ...(isNative ? [stripCrossorigin] : [pwa])
  ],
  test: {
    environment: 'node'
  }
})
