# Especificación — Peticiones de cambio con aprobación

Especificación funcional (implementación-agnóstica) de la capa que le falta a tu
app: **pedir un cambio sobre un evento y que la persona afectada lo apruebe o
rechace**. Extraída del dominio de «Las Mañanas de Lio».

Esto describe **qué** debe cumplir el sistema, no cómo. No prescribe lenguaje,
base de datos ni framework.

---

## 1. Alcance y supuestos del entorno

Tu app ya aporta:

- **Identidad**: usuarios autenticados. En esta spec, un usuario se referencia
  por su `userId`. El «actor» de cada operación es el usuario autenticado que la
  invoca.
- **Calendario**: eventos asignables. Cada unidad asignable se llama aquí
  **slot** y se identifica por un `slotId` opaco (el id de tu evento, o una clave
  compuesta `fecha|turno`). El sistema asume que un slot tiene, en cada momento,
  **un dueño** (`ownerId`) y puede estar **resuelto** (hecho/cerrado).

Esta spec **no** cubre: autenticación, almacenamiento, transporte de
notificaciones, ni la UI. Cubre el **modelo de dominio** de las peticiones.

---

## 2. Conceptos

- **Actor**: usuario autenticado que ejecuta una operación (`actorId`).
- **Slot**: evento asignable del calendario (`slotId`), con `ownerId` y estado
  resuelto/no resuelto, gestionados por tu app.
- **Petición (ChangeRequest)**: solicitud de un actor (**requester**) dirigida a
  otro (**responder**) para alterar la asignación de uno o más slots, sujeta a la
  aprobación del responder.
- **Efecto**: mutación que el sistema determina y que **tu app aplica** al
  calendario al aprobarse una petición (reasignar dueño / registrar realización).

---

## 3. Tipos de petición

| Tipo | Semántica | Efectos si se acepta |
|------|-----------|----------------------|
| **cover** | «cúbreme estos slots»: el responder pasa a ser dueño de cada slot indicado. | Por cada slot no resuelto: `reassign(slot → responder)`. |
| **swap** | «cambio mi slot por uno tuyo»: intercambio de dueños entre dos slots. | `reassign(slotOrigen → responder)` y `reassign(slotVuelta → requester)`, cada uno si no está resuelto. |
| **retro** | «este slot en realidad lo hice yo» (reclamación retroactiva). | `record(slot, by = requester)` — se registra que el requester realizó ese slot. |

Notas de semántica:

- **cover** implica una **deuda** conceptual (el responder «presta» una
  ocupación al requester por cada slot). Si tu app lleva balances, cuenta un
  cargo por cada slot efectivamente reasignado. **swap** es neutro (no genera
  deuda). **retro** no genera deuda.
- **retro** es la única que altera el **registro de realización** en vez de la
  **asignación futura**.

---

## 4. Estado de una petición

### 4.1 Estados

`pending` · `accepted` · `declined` · `cancelled` · `expired`.

`accepted`, `declined`, `cancelled` y `expired` son **terminales**.

### 4.2 Máquina de estados

```
                 accept  (responder)      → accepted   [+ efectos]
 pending ──────  decline (responder)      → declined
                 cancel  (requester)      → cancelled
                 expira  (tiempo)         → expired
```

- Solo se transiciona **desde `pending`**.
- Ningún estado terminal vuelve a `pending` ni a otro terminal.

### 4.3 Datos de una petición (a persistir)

| Campo | Tipo | Notas |
|-------|------|-------|
| `id` | string | Único y estable. |
| `type` | `cover` \| `swap` \| `retro` | |
| `requesterId` | userId | Quien pide. |
| `responderId` | userId | Quien debe aprobar. |
| `slots` | string[] | ≥ 1 slotId afectado. |
| `returnSlot` | string \| null | **Obligatorio en `swap`**; null en el resto. |
| `note` | string | Texto libre opcional. |
| `state` | ver §4.1 | Inicial: `pending`. |
| `createdAt` | timestamp | |
| `resolvedAt` | timestamp \| null | Se fija al pasar a terminal. |
| `expiresAt` | timestamp \| null | Momento de caducidad para cover/swap (ver §5.5). |

---

## 5. Operaciones (contrato)

Notación: cada operación indica **autorización**, **precondiciones** y
**postcondiciones**. Una llamada que viole autorización o precondición es un
**no-op** (no cambia nada y no falla de forma destructiva); tu capa puede además
señalar el rechazo.

### 5.1 Crear petición
- **Actor**: el `requester`.
- **Precondiciones**: `type` válido; `requesterId` y `responderId` presentes y
  distintos entre sí; `slots` no vacío; si `type = swap`, `returnSlot` presente.
- **Postcondiciones**: se crea una petición en estado `pending`, con `createdAt`
  fijado y `resolvedAt = null`.

### 5.2 Aceptar
- **Autorización**: solo el `responderId`.
- **Precondición**: la petición está `pending`.
- **Postcondiciones**:
  1. La petición pasa a `accepted` y se fija `resolvedAt`.
  2. Se producen los **efectos** del §3 según el tipo, **omitiendo** todo slot
     que ya esté **resuelto** en el calendario (idempotencia, §6).
  3. El cambio de estado y los efectos deben aplicarse de forma **atómica
     conjunta** (§7).

### 5.3 Rechazar
- **Autorización**: solo el `responderId`.
- **Precondición**: `pending`.
- **Postcondición**: pasa a `declined`, sin efectos sobre el calendario.

### 5.4 Cancelar
- **Autorización**: solo el `requesterId`.
- **Precondición**: `pending`.
- **Postcondición**: pasa a `cancelled`, sin efectos.

### 5.5 Caducar (barrido perezoso)
Puede ejecutarse al cargar, sin proceso programado.
- **Precondición por petición**: está `pending`.
- **Regla**:
  - `cover` / `swap`: caduca si `expiresAt` ya pasó.
  - `retro`: caduca si han transcurrido más de **N días** (por defecto **14**)
    desde `createdAt`.
- **Postcondición**: las que cumplan la regla pasan a `expired`.

---

## 6. Efectos y su aplicación

`acceptRequest` **determina** una lista de efectos; **tu app los aplica** al
calendario:

- `reassign(slotId, toUserId)` → establece `ownerId = toUserId` en ese evento.
- `record(slotId, byUserId)` → registra que `byUserId` realizó ese evento
  (marca de realización retroactiva).

El sistema necesita consultar tu calendario para dos cosas:

- **¿Slot resuelto?** — para omitir slots ya cerrados al aceptar (idempotencia).
- **Dueño actual de un slot** — para calcular el confirmador de un `retro` (§8).

---

## 7. Invariantes y garantías

1. **Autorización estricta**: solo el responder aprueba/rechaza; solo el
   requester cancela. Cualquier otro actor → no-op.
2. **Atomicidad aprobación↔efecto**: aceptar debe cambiar el estado **y** aplicar
   los efectos como una sola unidad. Nunca debe quedar `accepted` sin efectos ni
   efectos sin `accepted`.
3. **Idempotencia**: reintentar una aceptación (o aceptar con slots ya resueltos)
   no duplica reasignaciones; los slots resueltos se omiten.
4. **Irreversibilidad terminal**: un estado terminal nunca vuelve a `pending`.
5. **Un solo aprobador**: la persona afectada (`responderId`) es la única que
   puede autorizar el cambio que le afecta.

---

## 8. Reglas específicas de `retro`

- El **confirmador** (`responderId`) de una reclamación retro es el **dueño
  actual** del slot reclamado, **si** no coincide con el requester.
- Si el requester ya era el dueño del slot, el sistema **no** puede deducir un
  confirmador: el requester debe **elegir** a un tercero como confirmador.
- Al aceptarse, el efecto es `record(slot, by = requester)` (queda registrado que
  lo hizo el requester), no una reasignación de dueño.

---

## 9. Casos límite

- **Rango de slots (cover múltiple)**: una petición puede afectar a varios slots;
  al aceptar, cada uno genera su efecto de forma independiente y los resueltos se
  omiten. Es válido que se apliquen unos y se omitan otros.
- **swap con vuelta ya resuelta**: si `slots[0]` o `returnSlot` está resuelto, se
  omite ese lado; el otro lado sí se aplica.
- **Doble aceptación concurrente**: dos aceptaciones de la misma petición deben
  converger en un único `accepted` con efectos aplicados una sola vez (la
  atomicidad + idempotencia lo garantizan).
- **Petición vencida sin barrer**: una `pending` cuyo `expiresAt` ya pasó debe
  tratarse como no aplicable; el barrido la marca `expired`.

---

## 10. Eventos de dominio → notificaciones

El dominio define **cuándo** hay algo que comunicar; el canal (push, email,
in-app) es tuyo:

| Evento de dominio | A quién notificar | Mensaje sugerido |
|-------------------|-------------------|------------------|
| Petición creada | `responderId` | «X te pide un cambio / que le cubras» |
| Petición aceptada | `requesterId` | «Tu cambio fue aceptado» |
| Petición rechazada | `requesterId` | «Tu cambio fue rechazado» |
| (opcional) recordatorio | `responderId` | «Tienes N peticiones esperando tu respuesta» |

Contadores útiles para badges/bandeja:

- **Para mí**: peticiones `pending` con `responderId = yo` (exigen mi acción).
- **Enviadas por mí**: `pending` con `requesterId = yo` (a la espera).

---

## 11. Interfaz mínima esperada (contrato, no implementación)

Firmas de referencia que tu implementación debería exponer (nombres orientativos):

```
createChangeRequest(input)                         -> ChangeRequest        // §5.1
acceptRequest(requests, id, actorId, calendar)     -> { requests, effects } // §5.2, §6
declineRequest(requests, id, actorId)              -> requests             // §5.3
cancelRequest(requests, id, actorId)               -> requests             // §5.4
sweepExpired(requests, { now, retroDays })         -> requests             // §5.5
pendingForUser(requests, userId)                   -> ChangeRequest[]      // §10
pendingFromUser(requests, userId)                  -> ChangeRequest[]      // §10
retroConfirmer(slotOwnerId, claimantId)            -> userId | null        // §8

// Adaptador que tu app implementa sobre su calendario:
calendar.assignee(slotId)   -> userId | null
calendar.isResolved(slotId) -> boolean
```

Donde `Effect` es uno de: `{ reassign: slotId, to: userId }` ·
`{ record: slotId, by: userId }`.

---

## 12. Diferencias respecto al proyecto original (contexto)

En «Las Mañanas de Lio» esta lógica va acoplada a un almacenamiento local-first
con sincronización multi-dispositivo (merge por entidad, last-write-wins). **Tú
no necesitas esa capa**: con usuarios autenticados y un backend con escritura
serializada, basta persistir las peticiones y aplicar los efectos de forma
transaccional. La única regla de convergencia que conviene conservar si algún día
replicas sin servidor: **un estado terminal nunca debe degradarse a `pending`**.
