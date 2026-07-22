import { todayKey } from './dates.js'
import { assignedWalker, walkEntry } from './schedule.js'
import { generateId } from './ids.js'

// Tipos:
//   cover — el responder se queda las fechas del requester (cuenta para la deuda)
//   swap  — una fecha de ida (dates[0]) y una de vuelta (swapReturnDate); empate
//   retro — "ese día lo saqué yo": al aceptar escribe el paseo pasado
export function createRequest({ type, requesterId, responderId, dates, swapReturnDate = null, note = '' }) {
  const now = new Date().toISOString()
  return {
    id: generateId('r'),
    type,
    requesterId,
    responderId,
    dates: [...dates].sort(),
    swapReturnDate,
    note,
    state: 'pending',
    createdAt: now,
    resolvedAt: null,
    updatedAt: now,
  }
}

// Fechas de un cover/swap que ya no aplican al aceptar (ya paseadas u
// override previo). Se enseñan al responder antes de aceptar.
export function skippedDates(request, doc) {
  if (request.type === 'retro') return []
  return request.dates.filter(d => walkEntry(d, doc) || doc.overrides?.[d])
}

function resolve(request, state) {
  const now = new Date().toISOString()
  return { ...request, state, resolvedAt: now, updatedAt: now }
}

// Aceptar aplica los efectos EN EL MISMO doc que cambia el estado, para que
// aprobación y calendario nunca diverjan entre móviles.
export function acceptRequest(doc, requestId, actorId) {
  const request = doc.requests.find(r => r.id === requestId)
  if (!request || request.state !== 'pending') return doc
  if (request.responderId !== actorId) return doc

  const now = new Date().toISOString()
  const overrides = { ...doc.overrides }
  const walks = { ...doc.walks }

  if (request.type === 'cover') {
    for (const d of request.dates) {
      if (walkEntry(d, doc) || overrides[d]) continue // ya resuelto por otro lado
      overrides[d] = { memberId: request.responderId, requestId: request.id, updatedAt: now }
    }
  } else if (request.type === 'swap') {
    const give = request.dates[0]
    if (!walkEntry(give, doc)) {
      overrides[give] = { memberId: request.responderId, requestId: request.id, updatedAt: now }
    }
    if (request.swapReturnDate && !walkEntry(request.swapReturnDate, doc)) {
      overrides[request.swapReturnDate] = { memberId: request.requesterId, requestId: request.id, updatedAt: now }
    }
  } else if (request.type === 'retro') {
    for (const d of request.dates) {
      walks[d] = {
        status: 'walked',
        memberId: request.requesterId,
        walkedAt: null, // hora desconocida: fue días atrás
        loggedBy: actorId,
        requestId: request.id,
        updatedAt: now,
      }
    }
  }

  return {
    ...doc,
    overrides,
    walks,
    requests: doc.requests.map(r => r.id === requestId ? resolve(r, 'accepted') : r),
  }
}

export function declineRequest(doc, requestId, actorId) {
  const request = doc.requests.find(r => r.id === requestId)
  if (!request || request.state !== 'pending' || request.responderId !== actorId) return doc
  return { ...doc, requests: doc.requests.map(r => r.id === requestId ? resolve(r, 'declined') : r) }
}

export function cancelRequest(doc, requestId, actorId) {
  const request = doc.requests.find(r => r.id === requestId)
  if (!request || request.state !== 'pending' || request.requesterId !== actorId) return doc
  return { ...doc, requests: doc.requests.map(r => r.id === requestId ? resolve(r, 'cancelled') : r) }
}

// Caducidad perezosa (se ejecuta al cargar en cualquier móvil, sin cron):
//  - cover/swap: caduca cuando su última fecha ya pasó sin respuesta
//  - retro: caduca a los 14 días de crearse
export function sweepExpired(doc, today = todayKey()) {
  let changed = false
  const requests = doc.requests.map(r => {
    if (r.state !== 'pending') return r
    let expired = false
    if (r.type === 'retro') {
      const limit = new Date(new Date(r.createdAt).getTime() + 14 * 86400000).toISOString()
      expired = new Date().toISOString() > limit
    } else {
      const last = [...r.dates, r.swapReturnDate].filter(Boolean).sort().at(-1)
      expired = last < today
    }
    if (expired) { changed = true; return resolve(r, 'expired') }
    return r
  })
  return changed ? { ...doc, requests } : doc
}

// Quién debe confirmar una reclamación retro de `claimantId` para `date`:
// la persona a la que pertenecía ese día (si no es quien reclama).
export function retroResponder(date, claimantId, doc) {
  const assigned = assignedWalker(date, doc)
  if (assigned && assigned !== claimantId) return assigned
  return null // el que reclama era el asignado: debe elegir quién confirma
}

export function pendingForMe(doc, memberId) {
  return doc.requests.filter(r => r.state === 'pending' && r.responderId === memberId)
}

export function pendingFromMe(doc, memberId) {
  return doc.requests.filter(r => r.state === 'pending' && r.requesterId === memberId)
}
