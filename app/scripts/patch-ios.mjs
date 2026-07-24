// Ajustes del proyecto iOS tras `cap sync ios` (ver script "ios:sync").
//
// Deja el storyboard en un estado válido y determinista: usa el controlador
// ESTÁNDAR de Capacitor (CAPBridgeViewController), que siempre está compilado
// en el framework. No usamos una subclase propia porque un .swift suelto no se
// añade automáticamente al target de Xcode, y el storyboard fallaría en
// ejecución con "Unknown class ... in Interface Builder file" (pantalla negra).
//
// El "rebote" del scroll queda con el comportamiento por defecto; es cosmético
// y se puede desactivar más adelante como mejora opcional (ver docs/iOS.md).
//
// Si todavía no existe la carpeta ios/ (aún no has corrido `npx cap add ios`),
// no falla: avisa y sale con código 0. Es idempotente y auto-reparable.
import { existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs'
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

// Borra un MainViewController.swift huérfano de versiones anteriores del script
// (existía en disco pero no estaba en el target => rompía el arranque).
const staleController = join(iosAppDir, 'MainViewController.swift')
if (existsSync(staleController)) {
  rmSync(staleController)
  console.log('[patch-ios] MainViewController.swift huérfano eliminado.')
}

// Storyboard mínimo con el controlador estándar de Capacitor.
// customModule="Capacitor" (clase del framework, no del target de la app).
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
        <!--Bridge View Controller-->
        <scene sceneID="tne-QT-ifu">
            <objects>
                <viewController id="BYZ-38-t0r" customClass="CAPBridgeViewController" customModule="Capacitor" sceneMemberID="viewController">
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
console.log('[patch-ios] Main.storyboard restaurado (CAPBridgeViewController estándar).')

console.log('[patch-ios] Listo.')
