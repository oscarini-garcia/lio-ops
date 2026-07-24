// Puente con la cáscara nativa (Capacitor). En web todo esto es inofensivo:
// las funciones detectan que no hay plataforma nativa y hacen el equivalente
// web, así que el mismo bundle sirve para GitHub Pages y para la app iOS.
//
// Responsabilidades:
//   1. OTA autohospedado (nativo): al abrir la app comprueba el último GitHub
//      Release y, si hay versión nueva, la descarga y la deja lista para el
//      próximo arranque. El botón de Ajustes fuerza el chequeo y la aplica al
//      momento.
//   2. Actualización web (PWA): el mismo botón refresca el service worker,
//      limpia la caché y recarga para traer el último deploy de Pages.
//   3. Hápticos.
//
// El manifiesto OTA (latest.json) lo publica .github/workflows/ota.yml y
// siempre apunta al release marcado como «latest».
const OTA_MANIFEST_URL =
  'https://github.com/oscarini-garcia/lio-ops/releases/latest/download/latest.json'

// Versión inyectada en build desde package.json (ver vite.config.js).
export const APP_VERSION =
  typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : ''

let capacitorPromise = null
function loadCapacitor() {
  if (!capacitorPromise) capacitorPromise = import('@capacitor/core')
  return capacitorPromise
}

// ¿Estamos dentro de la app iOS/Android? En web devuelve false sin cargar nada
// pesado, y si por lo que sea la importación falla, también false.
export async function isNative() {
  try {
    const { Capacitor } = await loadCapacitor()
    return Capacitor.isNativePlatform()
  } catch {
    return false
  }
}

// Punto de entrada llamado una vez desde main.jsx.
export async function initNative() {
  if (!(await isNative())) return
  try {
    const { CapacitorUpdater } = await import('@capgo/capacitor-updater')
    // Confirma que el bundle actual arranca bien; sin esto el updater haría
    // rollback al bundle anterior tras unos segundos.
    await CapacitorUpdater.notifyAppReady()
    // Al arrancar, si hay actualización se aplica en el PRÓXIMO arranque
    // (nada de recargas a mitad de uso).
    await runOtaUpdate(CapacitorUpdater, { applyNow: false })
  } catch (err) {
    console.warn('[native] init falló', err)
  }
}

// Descarga y (opcionalmente) aplica la última versión OTA en nativo.
// applyNow=false => se aplica en el próximo arranque (`next`).
// applyNow=true  => se aplica ya, recargando el WebView (`set`).
async function runOtaUpdate(CapacitorUpdater, { applyNow }) {
  // Se lee el manifiesto con CapacitorHttp (petición HTTP nativa) en vez de
  // fetch: el WebView vive en el origen capacitor://localhost y un fetch a
  // github.com se bloquea por CORS. CapacitorHttp lo evita y sigue el redirect.
  const { CapacitorHttp } = await import('@capacitor/core')
  const res = await CapacitorHttp.get({
    url: OTA_MANIFEST_URL,
    headers: { 'Cache-Control': 'no-cache' }
  })
  if (res.status < 200 || res.status >= 300) return { updated: false } // aún no hay releases
  const manifest = typeof res.data === 'string' ? JSON.parse(res.data) : res.data
  if (!manifest?.version || !manifest?.url) return { updated: false }

  const current = await CapacitorUpdater.current()
  if (!isNewer(manifest.version, current?.bundle?.version)) {
    return { updated: false }
  }

  const bundle = await CapacitorUpdater.download({
    url: manifest.url,
    version: manifest.version,
    // checksum opcional: solo se pasa si el manifiesto lo trae, para no
    // romper la descarga si cambia el formato entre versiones del plugin.
    ...(manifest.checksum ? { checksum: manifest.checksum } : {})
  })

  if (applyNow) {
    await CapacitorUpdater.set(bundle) // recarga el WebView en la nueva versión
  } else {
    await CapacitorUpdater.next({ id: bundle.id }) // se aplica al reiniciar
  }
  return { updated: true, version: manifest.version }
}

// Versión que se está ejecutando ahora mismo (para mostrarla en Ajustes).
export async function currentVersion() {
  if (await isNative()) {
    try {
      const { CapacitorUpdater } = await import('@capgo/capacitor-updater')
      const cur = await CapacitorUpdater.current()
      const v = cur?.bundle?.version
      // 'builtin' = el bundle de fábrica, aún sin OTA aplicado.
      return v && v !== 'builtin' ? v : APP_VERSION
    } catch {
      return APP_VERSION
    }
  }
  return APP_VERSION
}

// Fuerza la actualización desde el botón de Ajustes.
// Devuelve { updated, message }. Cuando actualiza, la app se recarga sola, así
// que el mensaje "al día" solo se ve cuando ya no había nada nuevo.
export async function forceUpdate() {
  tapHaptic()
  if (await isNative()) {
    try {
      const { CapacitorUpdater } = await import('@capgo/capacitor-updater')
      const r = await runOtaUpdate(CapacitorUpdater, { applyNow: true })
      return r.updated
        ? { updated: true, message: 'Actualizando…' }
        : { updated: false, message: 'Ya estás en la última versión ✓' }
    } catch (err) {
      console.warn('[native] forceUpdate falló', err)
      return { updated: false, message: 'No se pudo comprobar 😢' }
    }
  }

  // Web / PWA: refresca el service worker, limpia caché y recarga.
  try {
    if ('serviceWorker' in navigator) {
      const regs = await navigator.serviceWorker.getRegistrations()
      await Promise.all(regs.map(r => r.update()))
    }
    if (typeof caches !== 'undefined') {
      const keys = await caches.keys()
      await Promise.all(keys.map(k => caches.delete(k)))
    }
  } catch (err) {
    console.warn('[native] refresco web falló', err)
  }
  window.location.reload()
  return { updated: true, message: 'Actualizando…' }
}

// Compara versiones tipo "0.1.2". El bundle de fábrica ("builtin") se trata
// como la más antigua, así que la primera OTA siempre entra.
function isNewer(candidate, current) {
  if (!current) return true
  const a = String(candidate).split('.').map(n => parseInt(n, 10) || 0)
  const b = String(current).split('.').map(n => parseInt(n, 10) || 0)
  for (let i = 0; i < 3; i++) {
    if ((a[i] || 0) > (b[i] || 0)) return true
    if ((a[i] || 0) < (b[i] || 0)) return false
  }
  return false
}

// Vibración corta de confirmación. No-op en web.
export async function tapHaptic() {
  if (!(await isNative())) return
  try {
    const { Haptics, ImpactStyle } = await import('@capacitor/haptics')
    await Haptics.impact({ style: ImpactStyle.Light })
  } catch {
    /* sin hápticos, sin drama */
  }
}
