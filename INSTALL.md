# Puesta en marcha

La app sigue el mismo esquema que Counter Ops: frontend estático en GitHub
Pages + un documento JSON compartido en JSONBin. Tres pasos de configuración,
todos de una sola vez.

## 1. Crear el bin de JSONBin

1. Cuenta gratuita en [jsonbin.io](https://jsonbin.io).
2. Crea un bin nuevo con este contenido inicial: `{"v": 1}` (la app lo rellena
   sola en la primera sincronización).
3. Apunta el **Bin ID** (en la URL del bin) y tu **Master Key**
   (API Keys → Master Key).

## 2. Configurar las variables en GitHub

En el repo: Settings → Secrets and variables → Actions → pestaña
**Variables** → New repository variable:

| Variable | Valor |
|---|---|
| `VITE_JSONBIN_ID` | el Bin ID |
| `VITE_JSONBIN_KEY` | la Master Key |

## 3. Activar GitHub Pages

Settings → Pages → Source: **GitHub Actions**.

Con eso, cada push a `main` prueba, construye y publica la app en
`https://<usuario>.github.io/lio-ops/`.

## Enlaces personales

En Ajustes → La familia, cada miembro tiene su enlace (`?member=oscar`) con
QR. Cada uno abre **su** enlace en Safari → Compartir → **Añadir a pantalla
de inicio**. Ese enlace es su identidad: sin cuentas ni contraseñas.

## Desarrollo local

```sh
cd app
cp .env.example .env   # rellena el bin ID y la key (escapa los $ con \$)
npm install
npm run dev            # http://localhost:5173/lio-ops/
npm test               # tests de horario, peticiones y merge
```

Sin `.env` la app funciona igualmente en modo "solo local" (sin sincronizar),
útil para probar.

## Push (v2, pendiente)

Los avisos push entrarán por `src/lib/notify.js` con OneSignal:
1. Cuenta gratuita en onesignal.com → app Web Push para la URL de Pages.
2. El App ID se añade al código; la REST API Key va a un secret
   (`ONESIGNAL_API_KEY`) que usará una GitHub Action para enviar avisos.
Mientras tanto, la app usa el globo del icono (`setAppBadge`).
