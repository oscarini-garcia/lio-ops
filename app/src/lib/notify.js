// Único punto de "alguien debería enterarse de esto".
// v1: globo en el icono de la app (iOS 16.4+ en apps de pantalla de inicio).
// v2: aquí se enchufa OneSignal (suscripción + envío vía GitHub Action)
// sin tocar ningún otro módulo.
export function updateBadge(count) {
  if (!('setAppBadge' in navigator)) return
  if (count > 0) navigator.setAppBadge(count).catch(() => {})
  else navigator.clearAppBadge?.().catch(() => {})
}
