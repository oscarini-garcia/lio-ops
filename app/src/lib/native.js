// Puente con la cáscara nativa (Capacitor). En web todo esto es inofensivo:
// las funciones detectan que no hay plataforma nativa y no hacen nada, así que
// el mismo bundle sirve para GitHub Pages y para la app iOS.
//
// Responsabilidades:
//   1. OTA autohospedado: al abrir la app comprueba el último GitHub Release,
//      y si hay una versión nueva la descarga y la deja lista para el próximo
//      arranque (sin recargar la sesión en curso).
//   2. Hápticos: pequeñas vibraciones para confirmar acciones.
//
// El manifiesto OTA (latest.json) lo publica .github/workflows/ota.yml y
// siempre apunta al release marcado como «latest».
const OTA_MANIFEST_URL =
  'https://github.com/oscarini-garcia/lio-ops/releases/latest/download/latest.json'

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
    await checkForOtaUpdate(CapacitorUpdater)
  } catch (err) {
    console.warn('[native] init falló', err)
  }
}

async function checkForOtaUpdate(CapacitorUpdater) {
  try {
    const res = await fetch(OTA_MANIFEST_URL, { cache: 'no-store' })
    if (!res.ok) return
    const manifest = await res.json() // { version, url, checksum? }
    if (!manifest?.version || !manifest?.url) return

    const current = await CapacitorUpdater.current()
    const currentVersion = current?.bundle?.version
    if (!isNewer(manifest.version, currentVersion)) return

    const bundle = await CapacitorUpdater.download({
      url: manifest.url,
      version: manifest.version,
      // checksum opcional: solo se pasa si el manifiesto lo trae, para no
      // romper la descarga si cambia el formato entre versiones del plugin.
      ...(manifest.checksum ? { checksum: manifest.checksum } : {})
    })
    // Aplicar en el PRÓXIMO arranque, no ahora: nada de recargas a mitad de uso.
    await CapacitorUpdater.next({ id: bundle.id })
  } catch (err) {
    console.warn('[native] chequeo OTA falló', err)
  }
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
