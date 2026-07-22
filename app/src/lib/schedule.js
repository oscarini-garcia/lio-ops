import { weekdayOf, daysBetween, addDays } from './dates.js'

// ¿A quién le toca según el plan? Precedencia:
//   1. override aprobado para esa fecha (solo lo escriben las peticiones aceptadas)
//   2. patrón del día de la semana (fijo o alterno)
//   3. nadie
export function assignedWalker(date, doc) {
  const override = doc.overrides?.[date]
  if (override?.memberId) return override.memberId

  const day = doc.schedule?.days?.[weekdayOf(date)]
  if (!day) return null

  if (day.type === 'fixed') return day.memberId ?? null

  if (day.type === 'alternate') {
    const ids = day.memberIds ?? []
    if (ids.length === 0) return null
    // El ancla es una fecha en la que toca ids[0]. Normalizamos el ancla a la
    // primera ocurrencia de este día de la semana en o después de ella, y
    // contamos semanas (funciona también hacia atrás).
    let anchor = day.anchorDate ?? date
    while (weekdayOf(anchor) !== weekdayOf(date)) anchor = addDays(anchor, 1)
    const weeks = Math.round(daysBetween(anchor, date) / 7)
    const idx = ((weeks % ids.length) + ids.length) % ids.length
    return ids[idx]
  }

  return null
}

// Quién tiene el mérito de una fecha pasada: el registro siempre manda.
export function creditedWalker(date, doc) {
  const w = doc.walks?.[date]
  if (w?.status === 'walked') return w.memberId
  return null
}

export function walkEntry(date, doc) {
  const w = doc.walks?.[date]
  if (!w || w.status === 'cleared') return null
  return w
}

// Próximas N fechas asignadas a un miembro (para vista previa del horario)
export function nextAssignments(fromDate, doc, count = 4, weekday = null) {
  const out = []
  let d = fromDate
  for (let i = 0; i < 120 && out.length < count; i++) {
    if (!weekday || weekdayOf(d) === weekday) {
      out.push({ date: d, memberId: assignedWalker(d, doc) })
    }
    d = addDays(d, 1)
  }
  return out
}
