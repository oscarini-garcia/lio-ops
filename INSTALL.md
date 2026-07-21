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

## Avisos push (OneSignal)

Todo el código ya está montado; solo falta la cuenta. Hasta entonces la app
funciona igual, con el globo del icono (`setAppBadge`).

1. Cuenta gratuita en [onesignal.com](https://onesignal.com) → **New App** →
   plataforma **Web** → tipo *Typical Site / Custom Code*:
   - Site URL: `https://<usuario>.github.io` (el origen exacto de Pages).
2. En OneSignal → Settings → **Keys & IDs**, apunta el **App ID** y la
   **REST API Key**.
3. En GitHub:
   - Settings → Secrets and variables → Actions → **Variables** →
     `VITE_ONESIGNAL_APP_ID` = el App ID.
   - Misma pantalla → pestaña **Secrets** → `ONESIGNAL_API_KEY` = la REST
     API Key (esta es secreta, nunca como variable).
4. Relanza el deploy (push a `main` o «Re-run» del workflow) para que la app
   se construya con el App ID.
5. Cada persona, desde la app **añadida a la pantalla de inicio** (iOS 16.4+):
   Ajustes → Sincronización → **Activar 🔔** y aceptar el permiso.

Qué avisa (workflow `Avisos push`, cada 30 min):
- petición nueva → aviso a quien tiene que responder
- petición aceptada/rechazada → aviso a quien la pidió
- recordatorio a quien le toca, entre las 7:00 y las 10:00, si el paseo de
  hoy sigue sin registrarse (una vez al día)
