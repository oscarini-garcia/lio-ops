# Las Mañanas de Lio — guía de integración

Cómo funciona la app por dentro y cómo reutilizarla o integrarla en otra
aplicación. Pensado para alguien que quiera **consumir el mismo documento
compartido**, **reutilizar la lógica pura** o **reimplementar el contrato**.

---

## 1. Qué es, en una frase

App familiar que responde una pregunta cada mañana: **¿a quién le toca sacar a
Lio (el perro)?** — y gestiona los cambios sobre ese plan (cubrir, intercambiar,
o el retroactivo «ese día lo saqué yo»), donde **cada cambio necesita la
aprobación de la persona afectada**.

Principios de diseño que condicionan la integración:

- **Local-first**: el estado completo vive en el cliente (`localStorage`) y se
  sincroniza en segundo plano.
- **Sin cuentas**: la identidad es un enlace personal (`?member=<id>`).
- **Un único documento JSON compartido** por familia, con **merge por entidad
  (last-write-wins por `updatedAt`)**: varios dispositivos convergen sin
  pisarse.
- **Lógica pura y sin estado** en `app/src/lib/` (horario, peticiones, stats,
  merge): son funciones `(doc, …) → valor` fáciles de reutilizar o portar.

Stack: PWA (Vite + React + Tailwind) en GitHub Pages + un bin de
[JSONBin](https://jsonbin.io) como backend. Opcionalmente empaquetada como app
iOS nativa (Capacitor) con actualizaciones OTA.

---

## 2. El contrato: el documento compartido

Todo el estado es **un solo objeto JSON** (`doc`). Es el punto de integración
más importante: si otra app lee/escribe este documento respetando las reglas de
merge, interopera con Lio. Definición canónica en
[`app/src/lib/storage.js`](../app/src/lib/storage.js).

```jsonc
{
  "v": 1,

  // Miembros de la familia. LWW por updatedAt.
  "members": [
    {
      "id": "oscar",                     // slug estable, es también su identidad
      "name": "Oscar",
      "color": "#cf8f3e",
      "avatar": { "type": "initials",    // 'initials' | 'emoji' | 'photo'
                  "value": "O" },         // inicial, emoji, o data-URI de foto
      "status": "Primero café ☕",        // texto libre, opcional
      "updatedAt": "2026-07-24T07:10:00.000Z"
    }
  ],

  // Tombstones de miembros borrados (para que un borrado no "reviva" al mergear)
  "deletedMemberIds": [ { "id": "old", "ts": "2026-07-01T00:00:00.000Z" } ],

  // El patrón semanal. LWW del objeto entero por updatedAt.
  "schedule": {
    "days": {
      "mon": { "type": "fixed", "memberId": "mariona" },
      "fri": { "type": "alternate",
               "memberIds": ["mariona", "amaya"],
               "anchorDate": "2026-07-24" },   // fecha en la que toca memberIds[0]
      // … mar, mié, jue, sáb, dom
    },
    "updatedAt": "2026-07-24T00:00:00.000Z"
  },

  // Registro real de cada mañana. Clave = fecha local 'YYYY-MM-DD'. LWW por fecha.
  "walks": {
    "2026-07-24": {
      "status": "walked",                // 'walked' | 'missed' | 'cleared'
      "memberId": "amaya",               // a quién se acredita el paseo
      "walkedAt": "2026-07-24T07:24:00.000Z", // ISO, o null si hora desconocida
      "loggedBy": "amaya",               // quién lo registró (identidad)
      "updatedAt": "2026-07-24T07:24:00.000Z"
    }
    // status 'missed'  → { status, markedBy, updatedAt }
    // status 'cleared' → { status, updatedAt }  (se trata como "sin registro")
  },

  // Overrides del plan para fechas concretas. SÓLO los escriben las peticiones
  // aceptadas (cover/swap). Clave = fecha. LWW por fecha.
  "overrides": {
    "2026-07-26": { "memberId": "ana", "requestId": "r_…", "updatedAt": "…" }
  },

  // Peticiones (el flujo de aprobación). Merge por id, ver §5.
  "requests": [
    {
      "id": "r_lt3k_a1b2",
      "type": "cover",                   // 'cover' | 'swap' | 'retro'
      "requesterId": "oscar",
      "responderId": "ana",              // quien debe aprobar
      "dates": ["2026-07-26"],           // fechas afectadas (ordenadas)
      "swapReturnDate": null,            // solo 'swap': la fecha de vuelta
      "note": "finde fuera",
      "state": "pending",                // pending|accepted|declined|cancelled|expired
      "createdAt": "…", "resolvedAt": null, "updatedAt": "…"
    }
  ],

  // Estado auxiliar compartido (p.ej. dedup del recordatorio matutino). LWW.
  "meta": { "updatedAt": "" }
}
```

Reglas transversales:

- **Todas las fechas** son claves locales `YYYY-MM-DD` (sin zona horaria). Ver
  [`app/src/lib/dates.js`](../app/src/lib/dates.js).
- **Toda entidad mergeable lleva `updatedAt`** (ISO-8601). Es la base del
  last-write-wins.
- El documento inicial mínimo aceptado por la app es `{"v": 1}` (se autorrellena
  en la primera sincronización con las semillas `SEED_MEMBERS`/`SEED_SCHEDULE`).

---

## 3. Identidad (sin cuentas)

No hay login. Cada miembro abre **su** enlace personal
`https://…/lio-ops/?member=<id>` y lo añade a la pantalla de inicio. Ese `<id>`
(= `members[].id`) se convierte en `currentMemberId` y es quien firma las
acciones (`loggedBy`, `markedBy`, `requesterId`). Ver
[`app/src/hooks/useMember.js`](../app/src/hooks/useMember.js).

Implicación para integrar: **no hay tokens por usuario**. La autoría es por
convención (el `id` del enlace). El control de acceso al documento lo da la clave
del bin (§6), compartida por toda la familia.

---

## 4. Cómo se decide «a quién le toca» (horario)

[`app/src/lib/schedule.js`](../app/src/lib/schedule.js) — funciones puras.

`assignedWalker(date, doc)` resuelve por **precedencia**:

1. **Override aprobado** para esa fecha (`overrides[date].memberId`).
2. **Patrón del día de la semana** (`schedule.days[weekday]`):
   - `fixed` → siempre `memberId`.
   - `alternate` → alterna `memberIds` por **semanas transcurridas desde
     `anchorDate`** (`anchorDate` marca cuándo toca `memberIds[0]`).
3. Si no hay nada → `null` (nadie asignado).

`creditedWalker(date, doc)` / `walkEntry(date, doc)` — el **registro real**
(`walks[date]`) siempre manda sobre el plan para fechas pasadas; `cleared` se
trata como ausencia.

---

## 5. Peticiones: el flujo de aprobación

[`app/src/lib/requests.js`](../app/src/lib/requests.js) — funciones puras que
reciben `doc` y devuelven un `doc` nuevo.

Tres tipos:

| Tipo    | Qué pide | Efecto al **aceptar** | Deuda |
|---------|----------|------------------------|-------|
| `cover` | «cúbreme estas fechas» | `overrides[date] = {memberId: responder}` por cada fecha | El responder «presta» una mañana al requester por fecha |
| `swap`  | «cambio mi día por el tuyo» | override de `dates[0]`→responder y de `swapReturnDate`→requester | Empate (no genera deuda) |
| `retro` | «ese día lo saqué yo» | `walks[date] = {status:'walked', memberId: requester}` | — |

Invariantes (garantías que debe respetar cualquier integración):

- **Solo el `responderId` puede aceptar/rechazar**; solo el `requesterId` puede
  cancelar. `acceptRequest`/`declineRequest`/`cancelRequest` lo verifican.
- **Aceptar aplica los efectos EN LA MISMA escritura** que cambia el estado a
  `accepted`, para que aprobación y calendario nunca diverjan entre móviles.
- Al aceptar se **omiten** fechas ya paseadas o ya con override (idempotencia).
- **`retro`**: quién lo confirma lo decide `retroResponder(date, claimant, doc)`
  = la persona a la que pertenecía ese día (si el que reclama no es el asignado,
  elige a quién confirma).
- **Caducidad perezosa** (`sweepExpired`, se ejecuta al cargar, sin cron):
  `cover`/`swap` caducan cuando su última fecha ya pasó; `retro` a los 14 días.

Estados: `pending → accepted | declined | cancelled | expired`.

---

## 6. Sincronización (el protocolo)

[`app/src/lib/sync.js`](../app/src/lib/sync.js) + [`app/src/hooks/useSync.js`](../app/src/hooks/useSync.js).

Backend = **un bin de JSONBin** por familia. Ciclo **pull → merge → push**:

```
syncCycle(localDoc):
  remote = GET  https://api.jsonbin.io/v3/b/<BIN_ID>     (X-Master-Key, X-Bin-Versioning:false)
  merged = mergeDocs(localDoc, remote)
  PUT   https://api.jsonbin.io/v3/b/<BIN_ID>  merged
  return merged
```

Se dispara: al montar, tras **cada mutación** (evento `lio-ops:sync` vía
`requestSync()`), al recuperar conexión (`online`), al volver a primer plano
(`visibilitychange`) y por un intervalo de **60 s** mientras la app está visible
(iOS congela la PWA en segundo plano).

**No hay bloqueo ni transacciones**: la convergencia la garantiza el merge por
entidad. Dos móviles escribiendo a la vez convergen en el siguiente ciclo.

### Reglas de merge — `mergeDocs(local, remote)` en [`storage.js`](../app/src/lib/storage.js)

| Colección | Estrategia |
|-----------|-----------|
| `members` | LWW por `updatedAt`, respetando tombstones (un miembro «revive» solo si su `updatedAt` > `ts` del tombstone) |
| `deletedMemberIds` | Unión, quedándose con el `ts` más reciente por `id` |
| `schedule`, `meta` | LWW del objeto **entero** por `updatedAt` |
| `walks`, `overrides` | LWW **por fecha** |
| `requests` | Por `id`: **un estado terminal siempre gana a `pending`** (nadie reabre una petición desde un móvil desincronizado); si ambos son terminales o ambos pending, LWW por `updatedAt` |

Estas reglas son el corazón de la interoperabilidad: **cualquier cliente que
escriba el documento debe fijar `updatedAt` en cada entidad que toque** y no
degradar un estado terminal de petición a `pending`.

---

## 7. La «API» interna (acciones)

La UI nunca muta el `doc` directamente: despacha acciones a un reducer
([`app/src/hooks/useStore.jsx`](../app/src/hooks/useStore.jsx)) que llama a la
lógica pura y persiste. Acciones de dominio (útiles como referencia de las
operaciones válidas):

- `LOG_WALK` `{date?, memberId?}` — registra paseo (por defecto hoy y el
  asignado).
- `MARK_MISSED` `{date?}` — marca «se quedó en casa».
- `CLEAR_TODAY` `{date?}` — deshace el registro (`status:'cleared'`).
- `CREATE_REQUEST` `{request}` · `ACCEPT_REQUEST` / `DECLINE_REQUEST` /
  `CANCEL_REQUEST` `{id}` · `SWEEP_EXPIRED`.
- `UPSERT_MEMBER` / `REMOVE_MEMBER` · `SET_SCHEDULE_DAY` `{weekday, pattern}`.
- `MERGE_REMOTE` `{doc}` · `SET_CURRENT_MEMBER` `{id}`.

Cada acción de dominio persiste en `localStorage` y la UI llama a `requestSync()`
para propagar.

---

## 8. Avisos (opcional)

- **Globo del icono** (`setAppBadge`, iOS 16.4+) con el nº de peticiones
  pendientes para ti — siempre disponible, sin backend.
- **Push con OneSignal** (opcional): la Action `.github/workflows/notify.yml`
  corre cada 30 min y avisa de petición nueva, aceptada/rechazada, y recordatorio
  matutino si el paseo de hoy sigue sin registrar. Ver
  [`app/src/lib/notify.js`](../app/src/lib/notify.js) e `INSTALL.md`.

---

## 9. App nativa y OTA (opcional)

La misma web se empaqueta como app iOS con Capacitor. Las actualizaciones de
web/JS llegan **Over-The-Air** vía GitHub Releases (no pasan por Apple):
`.github/workflows/ota.yml` publica un release `v<version>` con `latest.json`
cuando sube `app/package.json`. El puente está en
[`app/src/lib/native.js`](../app/src/lib/native.js). Detalle en
[`docs/iOS.md`](./iOS.md).

> Nota de versionado: la cáscara nativa de Capacitor es `1.0` por defecto y el
> comparador OTA usa semver, así que **la versión de la app debe ir por encima de
> `1.0`** para que el OTA se considere más nuevo que el binario de fábrica.

---

## 10. Cómo integrarlo en otra app

Cuatro caminos, de menos a más acoplamiento:

### A. Compartir el documento (interoperar por datos) — recomendado
Tu app lee/escribe **el mismo bin de JSONBin** siguiendo §2 y §6. Es la vía más
desacoplada: no compartes código, solo el contrato JSON + las reglas de merge.
Checklist mínimo:
- Fija `updatedAt` (ISO) en cada entidad que modifiques.
- Nunca degrades una petición terminal a `pending`.
- Escribe `overrides`/`walks` por fecha `YYYY-MM-DD` local.
- Respeta que **solo el responder aprueba** y que aceptar aplica el efecto en la
  misma escritura.

### B. Reutilizar la lógica pura
Copia/importa `app/src/lib/{dates,schedule,requests,stats,storage}.js`. No
dependen de React ni del DOM: son funciones `(doc, …) → valor`/`→ doc`. Ideal si
quieres el motor de horario/peticiones/stats en otro front o en un backend Node.

### C. Empotrar la PWA
Incrusta la app (iframe / WebView) apuntando a `?member=<id>`. Reutilizas la UI
completa; solo compartes la identidad por query-param.

### D. Reimplementar el contrato
Si necesitas otro backend o lenguaje, reimplementa §2 (esquema), §4 (asignación),
§5 (peticiones) y §6 (merge). Los tests de referencia están en
`app/src/lib/__tests__/` (`schedule`, `requests`, `storage`) — úsalos como
especificación ejecutable.

---

## 11. Configuración (variables)

En build (Vite, prefijo `VITE_` → embebidas en el bundle cliente):

| Variable | Uso |
|---|---|
| `VITE_JSONBIN_ID` | Bin ID del documento compartido |
| `VITE_JSONBIN_KEY` | Master Key de JSONBin (lectura/escritura) |
| `VITE_ONESIGNAL_APP_ID` | (opcional) push |

Secreto de servidor (solo en la Action de avisos): `ONESIGNAL_API_KEY`.

> **Seguridad**: al ser una PWA estática, `VITE_JSONBIN_KEY` queda **embebida en
> el bundle** y es legible por cualquiera con acceso a la app. Es un compromiso
> asumido para una app familiar de bajo riesgo (un bin, sin datos sensibles). Si
> integras esto en un contexto con más exposición, pon un proxy con la clave del
> lado servidor en vez de exponer la Master Key en el cliente.

---

## 12. Mapa de ficheros

```
app/src/lib/        lógica pura y sin estado (portátil):
  dates.js            claves de fecha y formateo ES
  schedule.js         assignedWalker / creditedWalker / walkEntry
  requests.js         create/accept/decline/cancel/sweep + retroResponder
  stats.js            racha, deuda, madrugador/a, favorito/a…
  storage.js          esquema del doc, semillas y mergeDocs (contrato de merge)
  sync.js             cliente JSONBin (pull → merge → push)
  ids.js  native.js  notify.js
app/src/hooks/      useStore (reducer), useMember (identidad), useSync (ciclo)
app/src/screens/    Hilo (cronología) · Bandeja · Datos · Familia
app/src/components/  mascota, avatares, hoja de acciones por día, shell
app/src/lib/__tests__/  spec ejecutable de schedule/requests/storage
```

---

### Resumen para quien integra

El sistema es **un documento JSON con merge por entidad (LWW por `updatedAt`)**
sincronizado con un bin compartido. La asignación de mañanas se deriva del
`schedule` + `overrides`; los cambios pasan por `requests` con aprobación del
afectado; el registro real vive en `walks`. Respeta esas cuatro colecciones y sus
reglas de merge (§6) y tu app convivirá con Lio sin pisarse.
