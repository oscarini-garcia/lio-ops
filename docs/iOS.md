# App iOS nativa (Capacitor + OTA)

Las Mañanas de Lio sigue siendo la misma PWA (React + Vite) que ves en GitHub
Pages. Esta guía explica cómo empaquetarla como **app iOS nativa** con
actualizaciones **Over-The-Air (OTA)**: los cambios de web/JS llegan solos, sin
pasar por Apple; solo vuelves al App Store cuando cambias algo nativo.

> **Basado en** el playbook `PLAYBOOK-webapp-a-ios-ota.md`, adaptado a este repo.

## Cómo funciona

```
Cambio de web/JS  → subes versión en app/package.json → merge a main
                  → workflow "OTA release" publica un GitHub Release
                  → la app se actualiza sola en el próximo arranque   (SIN Apple)

Cambio nativo     → build en Xcode → App Store / TestFlight            (CON Apple)
```

- **Cáscara nativa:** un WKWebView (Capacitor) que carga el `dist/` compilado.
- **OTA autohospedado:** `@capgo/capacitor-updater` lee el release marcado como
  `latest`, descarga `bundle.zip` y lo aplica en el siguiente arranque.
- La web y la app comparten el mismo código; el build cambia solo la `base`
  (`/` en nativo, `/lio-ops/` en Pages) y desactiva el service worker en nativo.

## Requisitos (una sola vez)

1. **Un Mac** con **Xcode** (iOS solo compila en macOS).
2. **Cuenta de Apple Developer** (99 USD/año) para instalarla de forma
   permanente y repartirla por **TestFlight**. Sin cuenta puedes probar en tu
   propio iPhone por cable durante 7 días.
3. Capacitor CLI: se instala solo con `npm install` (ya está en `package.json`).

## Puesta en marcha en el Mac

Desde la carpeta `app/`:

```sh
cd app
npm install
npx cap add ios          # crea la carpeta ios/ (proyecto Xcode) — SOLO la 1ª vez
npm run ios:sync         # build:native + cap sync + patch-ios (bounce off)
npm run ios:open         # abre Xcode
```

En Xcode, una sola vez:

- **Signing & Capabilities** → selecciona tu **Team** de Apple Developer.
- Comprueba que el **Bundle Identifier** es `com.oscarini.lioops`
  (definido en `app/capacitor.config.json`).
- Conecta tu iPhone y dale a **▶︎** para probarla de verdad.
- Cuando esté bien: **Product → Archive → Distribute → TestFlight** e invita a
  la familia por su email.

## El día a día (sin Mac)

1. Haces tus cambios de siempre en la web.
2. Subes `version` en `app/package.json` (p.ej. `0.1.0` → `0.1.1`).
3. Merge a `main`.
4. El workflow **OTA release** publica el release; cada móvil se actualiza solo
   al reabrir la app.

Solo vuelves al Mac/Xcode/App Store si cambias algo **nativo**: un plugin nuevo,
permisos, el icono o el nombre de la app.

## Piezas de este repo

| Archivo | Para qué |
|---|---|
| `app/capacitor.config.json` | appId, nombre, `webDir`, config del updater |
| `app/vite.config.js` | `base` y PWA condicionales (`CAP_BUILD=1` = nativo) |
| `app/src/lib/native.js` | puente: chequeo OTA al arrancar + hápticos |
| `app/scripts/patch-ios.mjs` | deja el storyboard válido y determinista (tras `cap sync`) |
| `.github/workflows/ota.yml` | empaqueta y publica el release OTA |

## Notas

- **Identidad:** en nativo no hay enlace `?member=`; la app usa su pantalla
  «¿quién eres?» la primera vez y recuerda la elección en el móvil. Nada que
  configurar.
- **Sync (JSONBin) y push (OneSignal):** siguen funcionando dentro del WebView.
  Si algún día una llamada da problemas de CORS, se cambia a `CapacitorHttp`.
- **La PWA no se toca:** `deploy.yml` sigue publicando en GitHub Pages igual que
  siempre. Quien no quiera la app nativa puede seguir con «Añadir a inicio».
- **Versión del updater:** `@capgo/capacitor-updater` está pineado a `^7.0.0`.
  Si al instalar en el Mac cambia el formato del `checksum`, el manifiesto ya lo
  trae como opcional (`native.js` lo omite si hiciera falta).
