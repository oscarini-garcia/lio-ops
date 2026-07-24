// Ajustes del proyecto iOS que Capacitor no expone por configuración.
// Se ejecuta tras `cap sync ios` (ver script "ios:sync" en package.json).
//
// Qué hace, de forma idempotente (se puede correr mil veces):
//   1. Crea MainViewController.swift, una subclase del controlador de
//      Capacitor que desactiva el "rebote" (bounce) del scroll del WKWebView,
//      para que la app se sienta nativa y no como una página web.
//   2. Apunta el Main.storyboard a esa clase en vez de a CAPBridgeViewController.
//
// Si todavía no existe la carpeta ios/ (aún no has corrido `npx cap add ios`
// en un Mac), no falla: avisa y sale con código 0.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const appDir = dirname(dirname(fileURLToPath(import.meta.url)))
const iosAppDir = join(appDir, 'ios', 'App', 'App')

if (!existsSync(iosAppDir)) {
  console.log(
    '[patch-ios] No existe ios/App/App todavía. Corre `npx cap add ios` en un Mac primero. Nada que parchear.'
  )
  process.exit(0)
}

// 1. MainViewController.swift ----------------------------------------------
const controllerPath = join(iosAppDir, 'MainViewController.swift')
const controllerSrc = `import UIKit
import Capacitor

// Subclase del controlador de Capacitor. Desactiva el rebote del scroll para
// que la app no se sienta como una página web dentro de Safari.
// Generado/actualizado por scripts/patch-ios.mjs — no editar a mano.
class MainViewController: CAPBridgeViewController {
    override func viewDidLoad() {
        super.viewDidLoad()
        webView?.scrollView.bounces = false
        webView?.scrollView.alwaysBounceVertical = false
        webView?.scrollView.alwaysBounceHorizontal = false
    }
}
`
writeFileSync(controllerPath, controllerSrc)
console.log('[patch-ios] MainViewController.swift escrito.')

// 2. Main.storyboard -> usar MainViewController -----------------------------
const storyboardPath = join(iosAppDir, 'Base.lproj', 'Main.storyboard')
if (existsSync(storyboardPath)) {
  let storyboard = readFileSync(storyboardPath, 'utf8')
  if (storyboard.includes('customClass="MainViewController"')) {
    console.log('[patch-ios] Main.storyboard ya apunta a MainViewController.')
  } else if (storyboard.includes('customClass="CAPBridgeViewController"')) {
    storyboard = storyboard.replace(
      /customClass="CAPBridgeViewController"[^>]*/,
      'customClass="MainViewController" customModule="App" customModuleProvider="target"'
    )
    writeFileSync(storyboardPath, storyboard)
    console.log('[patch-ios] Main.storyboard actualizado a MainViewController.')
  } else {
    console.warn(
      '[patch-ios] No se encontró la clase del view controller en Main.storyboard; revísalo a mano si el bounce sigue activo.'
    )
  }
} else {
  console.warn('[patch-ios] No se encontró Main.storyboard; ¿estructura de proyecto distinta?')
}

console.log('[patch-ios] Listo.')
