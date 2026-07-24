// Ajustes del proyecto iOS que Capacitor no expone por configuración.
// Se ejecuta tras `cap sync ios` (ver script "ios:sync" en package.json).
//
// Qué hace, de forma idempotente (se puede correr mil veces y se auto-repara):
//   1. Crea MainViewController.swift, una subclase del controlador de
//      Capacitor que desactiva el "rebote" (bounce) del scroll del WKWebView.
//   2. Reescribe Main.storyboard ENTERO desde una plantilla mínima válida que
//      ya apunta a MainViewController. Se reescribe completo (en vez de
//      parchear con regex) para que nunca pueda quedar XML malformado.
//
// Si todavía no existe la carpeta ios/ (aún no has corrido `npx cap add ios`
// en un Mac), no falla: avisa y sale con código 0.
import { existsSync, mkdirSync, writeFileSync } from 'node:fs'
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

// 2. Main.storyboard (reescrito entero, apuntando a MainViewController) ------
// Storyboard mínimo: solo aloja el bridge view controller que carga el WebView.
// customModule="App" + customModuleProvider="target" => la clase vive en el
// target de la app (donde está MainViewController.swift).
const storyboardDir = join(iosAppDir, 'Base.lproj')
const storyboardPath = join(storyboardDir, 'Main.storyboard')
const storyboardSrc = `<?xml version="1.0" encoding="UTF-8"?>
<document type="com.apple.InterfaceBuilder3.CocoaTouch.Storyboard.XIB" version="3.0" toolsVersion="21507" targetRuntime="iOS.CocoaTouch" propertyAccessControl="none" useAutolayout="YES" useTraitCollections="YES" useSafeAreas="YES" colorMatched="YES" initialViewController="BYZ-38-t0r">
    <device id="retina6_1" orientation="portrait" appearance="light"/>
    <dependencies>
        <deployment identifier="iOS"/>
        <plugIn identifier="com.apple.InterfaceBuilder.IBCocoaTouchPlugin" version="21505"/>
        <capability name="Safe area layout guides" minToolsVersion="9.0"/>
        <capability name="documents saved in the Xcode 8 format" minToolsVersion="8.0"/>
    </dependencies>
    <scenes>
        <!--Main View Controller-->
        <scene sceneID="tne-QT-ifu">
            <objects>
                <viewController id="BYZ-38-t0r" customClass="MainViewController" customModule="App" customModuleProvider="target" sceneMemberID="viewController">
                    <view key="view" contentMode="scaleToFill" id="8bC-Xf-vdC">
                        <rect key="frame" x="0.0" y="0.0" width="414" height="896"/>
                        <autoresizingMask key="autoresizingMask" widthSizable="YES" heightSizable="YES"/>
                        <viewLayoutGuide key="safeArea" id="6Tk-OE-BBY"/>
                        <color key="backgroundColor" systemColor="systemBackgroundColor"/>
                    </view>
                </viewController>
                <placeholder placeholderIdentifier="IBFirstResponder" id="dkx-z0-nzr" sceneMemberID="firstResponder"/>
            </objects>
            <point key="canvasLocation" x="132" y="132"/>
        </scene>
    </scenes>
</document>
`
if (!existsSync(storyboardDir)) mkdirSync(storyboardDir, { recursive: true })
writeFileSync(storyboardPath, storyboardSrc)
console.log('[patch-ios] Main.storyboard reescrito (apunta a MainViewController).')

console.log('[patch-ios] Listo.')
