// Único punto de "alguien debería enterarse de esto".
//
// 1) Globo del icono (iOS 16.4+ en apps de pantalla de inicio) — siempre.
// 2) Push con OneSignal — se activa solo si VITE_ONESIGNAL_APP_ID está
//    configurado en la build. El envío lo hace una GitHub Action
//    (.github/workflows/notify.yml) con la REST key en un secret; aquí solo
//    se gestiona la suscripción del móvil.

const APP_ID = import.meta.env.VITE_ONESIGNAL_APP_ID

export function updateBadge(count) {
  if (!('setAppBadge' in navigator)) return
  if (count > 0) navigator.setAppBadge(count).catch(() => {})
  else navigator.clearAppBadge?.().catch(() => {})
}

export function pushConfigured() {
  return !!APP_ID
}

let sdkLoaded = false

function withOneSignal(fn) {
  if (!APP_ID) return
  window.OneSignalDeferred = window.OneSignalDeferred || []
  window.OneSignalDeferred.push(fn)
  if (!sdkLoaded) {
    sdkLoaded = true
    const s = document.createElement('script')
    s.src = 'https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.page.js'
    s.defer = true
    document.head.appendChild(s)
  }
}

// Se llama al arrancar con la identidad del móvil. El login con external_id
// permite que la Action envíe "al responder oscar" sin conocer tokens.
export function initPush(memberId) {
  withOneSignal(async (OneSignal) => {
    await OneSignal.init({
      appId: APP_ID,
      serviceWorkerPath: 'push/onesignal/OneSignalSDKWorker.js',
      serviceWorkerParam: { scope: `${import.meta.env.BASE_URL}push/onesignal/` },
    })
    if (memberId) await OneSignal.login(memberId)
  })
}

// Botón "Activar avisos": iOS exige que el permiso se pida tras un toque
// del usuario y solo funciona en la app añadida a la pantalla de inicio.
export function requestPushPermission(onResult) {
  withOneSignal(async (OneSignal) => {
    const granted = await OneSignal.Notifications.requestPermission()
    onResult?.(granted ?? OneSignal.Notifications.permission)
  })
}

export function getPushStatus(onResult) {
  if (!APP_ID) { onResult('unconfigured'); return }
  withOneSignal(async (OneSignal) => {
    const supported = OneSignal.Notifications.isPushSupported()
    if (!supported) { onResult('unsupported'); return }
    onResult(OneSignal.Notifications.permission ? 'enabled' : 'off')
  })
}
